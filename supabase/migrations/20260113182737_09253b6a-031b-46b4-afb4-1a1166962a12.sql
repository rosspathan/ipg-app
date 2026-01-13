
-- =============================================================
-- FIX ORDER LIFECYCLE: Locked Balance Management
-- =============================================================

-- 1. Fix reconcile_locked_balance to include partially_filled orders
CREATE OR REPLACE FUNCTION public.reconcile_locked_balance(p_user_id uuid, p_asset_symbol text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_asset_id UUID;
  v_correct_locked NUMERIC;
  v_current_locked NUMERIC;
  v_current_available NUMERIC;
  v_total NUMERIC;
BEGIN
  -- Get asset ID
  SELECT id INTO v_asset_id FROM assets WHERE symbol = p_asset_symbol;
  
  IF v_asset_id IS NULL THEN
    RAISE EXCEPTION 'Asset % not found', p_asset_symbol;
  END IF;
  
  -- Get current balance state
  SELECT available, locked, total INTO v_current_available, v_current_locked, v_total 
  FROM wallet_balances 
  WHERE user_id = p_user_id AND asset_id = v_asset_id;
  
  IF v_total IS NULL THEN
    RAISE EXCEPTION 'No wallet balance found for user % and asset %', p_user_id, p_asset_symbol;
  END IF;
  
  -- Calculate correct locked amount from ALL open orders (pending AND partially_filled)
  SELECT COALESCE(SUM(
    CASE 
      WHEN side = 'sell' AND split_part(symbol, '/', 1) = p_asset_symbol 
        THEN COALESCE(remaining_amount, amount - COALESCE(filled_amount, 0))
      WHEN side = 'buy' AND split_part(symbol, '/', 2) = p_asset_symbol 
        THEN COALESCE(remaining_amount, amount - COALESCE(filled_amount, 0)) * COALESCE(price, 0) * 1.005
      ELSE 0
    END
  ), 0) INTO v_correct_locked
  FROM orders
  WHERE user_id = p_user_id 
    AND status IN ('pending', 'partially_filled');
  
  v_correct_locked := ROUND(v_correct_locked, 8);
  
  -- Only update if there's a discrepancy
  IF ABS(v_correct_locked - v_current_locked) > 0.00000001 THEN
    -- Log the reconciliation
    INSERT INTO trading_audit_log (user_id, event_type, payload)
    VALUES (
      p_user_id,
      'balance_reconciliation',
      jsonb_build_object(
        'asset', p_asset_symbol,
        'old_locked', v_current_locked,
        'new_locked', v_correct_locked,
        'old_available', v_current_available,
        'new_available', v_total - v_correct_locked,
        'discrepancy', v_current_locked - v_correct_locked
      )
    );
    
    -- Update wallet_balances
    UPDATE wallet_balances
    SET locked = v_correct_locked,
        available = v_total - v_correct_locked,
        updated_at = NOW()
    WHERE user_id = p_user_id AND asset_id = v_asset_id;
  END IF;
END;
$function$;

-- 2. Fix unlock_balance_for_order (symbol version) to be more tolerant
CREATE OR REPLACE FUNCTION public.unlock_balance_for_order(p_user_id uuid, p_asset_symbol text, p_amount numeric)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_asset_id UUID;
  v_current_locked NUMERIC;
  v_unlock_amount NUMERIC;
BEGIN
  SELECT id INTO v_asset_id FROM public.assets WHERE symbol = p_asset_symbol;
  
  IF v_asset_id IS NULL THEN
    RAISE EXCEPTION 'Asset not found: %', p_asset_symbol;
  END IF;
  
  SELECT locked INTO v_current_locked 
  FROM public.wallet_balances
  WHERE user_id = p_user_id AND asset_id = v_asset_id;
  
  IF v_current_locked IS NULL THEN
    RETURN FALSE;
  END IF;
  
  v_unlock_amount := ROUND(p_amount, 8);
  
  -- If trying to unlock more than locked, unlock what's available (with tolerance)
  IF v_unlock_amount > v_current_locked THEN
    IF v_unlock_amount - v_current_locked < 0.01 THEN
      v_unlock_amount := v_current_locked;
    ELSE
      RETURN FALSE;
    END IF;
  END IF;
  
  UPDATE public.wallet_balances
  SET 
    available = ROUND(available + v_unlock_amount, 8),
    locked = GREATEST(ROUND(locked - v_unlock_amount, 8), 0),
    updated_at = now()
  WHERE user_id = p_user_id AND asset_id = v_asset_id;
  
  RETURN FOUND;
END;
$function$;

-- 3. Fix unlock_balance_for_order (asset_id version)
CREATE OR REPLACE FUNCTION public.unlock_balance_for_order(p_user_id uuid, p_asset_id uuid, p_amount numeric)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_current_locked NUMERIC;
  v_unlock_amount NUMERIC;
BEGIN
  SELECT locked INTO v_current_locked 
  FROM wallet_balances 
  WHERE user_id = p_user_id AND asset_id = p_asset_id;
  
  IF v_current_locked IS NULL THEN
    RETURN FALSE;
  END IF;
  
  v_unlock_amount := ROUND(p_amount, 8);
  
  IF v_unlock_amount > v_current_locked THEN
    IF v_unlock_amount - v_current_locked < 0.01 THEN
      v_unlock_amount := v_current_locked;
    ELSE
      RETURN FALSE;
    END IF;
  END IF;
  
  UPDATE wallet_balances
  SET 
    locked = GREATEST(ROUND(locked - v_unlock_amount, 8), 0),
    available = ROUND(available + v_unlock_amount, 8),
    updated_at = now()
  WHERE user_id = p_user_id AND asset_id = p_asset_id;
  
  RETURN TRUE;
END;
$function$;

-- 4. Create force_reconcile_all_balances for a user
CREATE OR REPLACE FUNCTION public.force_reconcile_all_balances(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_asset RECORD;
  v_results jsonb := '[]'::jsonb;
  v_correct_locked NUMERIC;
  v_current_locked NUMERIC;
  v_current_available NUMERIC;
  v_total NUMERIC;
BEGIN
  FOR v_asset IN 
    SELECT wb.asset_id, a.symbol 
    FROM wallet_balances wb
    JOIN assets a ON a.id = wb.asset_id
    WHERE wb.user_id = p_user_id AND wb.locked > 0
  LOOP
    SELECT available, locked, total 
    INTO v_current_available, v_current_locked, v_total
    FROM wallet_balances 
    WHERE user_id = p_user_id AND asset_id = v_asset.asset_id;
    
    SELECT COALESCE(SUM(
      CASE 
        WHEN side = 'sell' AND split_part(symbol, '/', 1) = v_asset.symbol 
          THEN COALESCE(remaining_amount, amount - COALESCE(filled_amount, 0))
        WHEN side = 'buy' AND split_part(symbol, '/', 2) = v_asset.symbol 
          THEN COALESCE(remaining_amount, amount - COALESCE(filled_amount, 0)) * COALESCE(price, 0) * 1.005
        ELSE 0
      END
    ), 0) INTO v_correct_locked
    FROM orders
    WHERE user_id = p_user_id 
      AND status IN ('pending', 'partially_filled');
    
    v_correct_locked := ROUND(v_correct_locked, 8);
    
    IF ABS(v_correct_locked - v_current_locked) > 0.00000001 THEN
      INSERT INTO trading_audit_log (user_id, event_type, payload)
      VALUES (
        p_user_id,
        'force_reconcile_all',
        jsonb_build_object(
          'asset', v_asset.symbol,
          'old_locked', v_current_locked,
          'new_locked', v_correct_locked,
          'discrepancy', v_current_locked - v_correct_locked
        )
      );
      
      UPDATE wallet_balances
      SET locked = v_correct_locked,
          available = v_total - v_correct_locked,
          updated_at = NOW()
      WHERE user_id = p_user_id AND asset_id = v_asset.asset_id;
      
      v_results := v_results || jsonb_build_object(
        'asset', v_asset.symbol,
        'old_locked', v_current_locked,
        'new_locked', v_correct_locked,
        'released', v_current_locked - v_correct_locked
      );
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'reconciled_assets', v_results
  );
END;
$function$;

-- 5. One-time cleanup: Reconcile ALL users with locked balance discrepancies
DO $$
DECLARE
  v_user RECORD;
  v_asset RECORD;
  v_correct_locked NUMERIC;
  v_current_locked NUMERIC;
  v_total NUMERIC;
  v_fixed_count INT := 0;
BEGIN
  FOR v_user IN 
    SELECT DISTINCT user_id FROM wallet_balances WHERE locked > 0
  LOOP
    FOR v_asset IN 
      SELECT wb.asset_id, a.symbol, wb.locked, wb.total
      FROM wallet_balances wb
      JOIN assets a ON a.id = wb.asset_id
      WHERE wb.user_id = v_user.user_id AND wb.locked > 0
    LOOP
      v_current_locked := v_asset.locked;
      v_total := v_asset.total;
      
      SELECT COALESCE(SUM(
        CASE 
          WHEN side = 'sell' AND split_part(symbol, '/', 1) = v_asset.symbol 
            THEN COALESCE(remaining_amount, amount - COALESCE(filled_amount, 0))
          WHEN side = 'buy' AND split_part(symbol, '/', 2) = v_asset.symbol 
            THEN COALESCE(remaining_amount, amount - COALESCE(filled_amount, 0)) * COALESCE(price, 0) * 1.005
          ELSE 0
        END
      ), 0) INTO v_correct_locked
      FROM orders
      WHERE user_id = v_user.user_id 
        AND status IN ('pending', 'partially_filled');
      
      v_correct_locked := ROUND(v_correct_locked, 8);
      
      IF ABS(v_correct_locked - v_current_locked) > 0.00000001 THEN
        INSERT INTO trading_audit_log (user_id, event_type, payload)
        VALUES (
          v_user.user_id,
          'migration_balance_cleanup',
          jsonb_build_object(
            'asset', v_asset.symbol,
            'old_locked', v_current_locked,
            'new_locked', v_correct_locked,
            'released', v_current_locked - v_correct_locked
          )
        );
        
        UPDATE wallet_balances
        SET locked = v_correct_locked,
            available = v_total - v_correct_locked,
            updated_at = NOW()
        WHERE user_id = v_user.user_id AND asset_id = v_asset.asset_id;
        
        v_fixed_count := v_fixed_count + 1;
      END IF;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Migration complete: Fixed % balance discrepancies', v_fixed_count;
END;
$$;
