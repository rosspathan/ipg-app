-- ============================================
-- PHASE 1: COMPREHENSIVE TRADING SYSTEM FIXES
-- ============================================

-- 1. Add unique constraint on market_prices.symbol for proper upsert
CREATE UNIQUE INDEX IF NOT EXISTS market_prices_symbol_unique ON public.market_prices (symbol);

-- 2. Add balance validation constraints (ignore if exists)
DO $$ BEGIN
  ALTER TABLE public.wallet_balances 
  ADD CONSTRAINT wallet_balances_available_non_negative CHECK (available >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.wallet_balances 
  ADD CONSTRAINT wallet_balances_locked_non_negative CHECK (locked >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Drop existing functions that need return type changes
DROP FUNCTION IF EXISTS public.reconcile_locked_balance(UUID, TEXT);
DROP FUNCTION IF EXISTS public.execute_order_cancel(UUID, UUID);
DROP FUNCTION IF EXISTS public.check_balance_integrity(UUID);
DROP FUNCTION IF EXISTS public.force_fix_user_balances(UUID);

-- 4. Create atomic execute_order_cancel function
CREATE OR REPLACE FUNCTION public.execute_order_cancel(
  p_user_id UUID,
  p_order_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_asset_id UUID;
  v_lock_amount NUMERIC;
  v_base_symbol TEXT;
  v_quote_symbol TEXT;
BEGIN
  -- Get order with row lock
  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id AND user_id = p_user_id
  FOR UPDATE;

  IF v_order IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Order not found or does not belong to user'
    );
  END IF;

  -- Check if order can be cancelled
  IF v_order.status IN ('filled', 'cancelled') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Order already ' || v_order.status || ' - cannot cancel'
    );
  END IF;

  -- Parse symbol to get base and quote assets
  v_base_symbol := split_part(v_order.symbol, '/', 1);
  v_quote_symbol := split_part(v_order.symbol, '/', 2);

  -- Calculate remaining lock amount
  IF v_order.side = 'buy' THEN
    SELECT id INTO v_asset_id FROM assets WHERE symbol = v_quote_symbol LIMIT 1;
    v_lock_amount := ROUND(COALESCE(v_order.remaining_amount, v_order.amount - COALESCE(v_order.filled_amount, 0)) * COALESCE(v_order.price, 0) * 1.005, 8);
  ELSE
    SELECT id INTO v_asset_id FROM assets WHERE symbol = v_base_symbol LIMIT 1;
    v_lock_amount := ROUND(COALESCE(v_order.remaining_amount, v_order.amount - COALESCE(v_order.filled_amount, 0)), 8);
  END IF;

  IF v_asset_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Asset not found for symbol'
    );
  END IF;

  -- Update order status atomically
  UPDATE orders
  SET 
    status = 'cancelled',
    updated_at = NOW()
  WHERE id = p_order_id;

  -- Unlock the balance - use LEAST to avoid negative available
  UPDATE wallet_balances
  SET 
    available = available + LEAST(v_lock_amount, locked),
    locked = GREATEST(locked - v_lock_amount, 0),
    updated_at = NOW()
  WHERE user_id = p_user_id AND asset_id = v_asset_id;

  -- Log the cancellation
  INSERT INTO trading_audit_log (user_id, order_id, event_type, payload)
  VALUES (
    p_user_id,
    p_order_id,
    'ORDER_CANCELLED_ATOMIC',
    jsonb_build_object(
      'symbol', v_order.symbol,
      'side', v_order.side,
      'unlock_amount', v_lock_amount,
      'unlock_asset_id', v_asset_id,
      'remaining_amount', v_order.remaining_amount,
      'order_type', v_order.order_type
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'unlocked_amount', v_lock_amount,
    'unlocked_asset', CASE WHEN v_order.side = 'buy' THEN v_quote_symbol ELSE v_base_symbol END
  );
END;
$$;

-- 5. Create reconcile_locked_balance function (returns JSONB now)
CREATE OR REPLACE FUNCTION public.reconcile_locked_balance(
  p_user_id UUID,
  p_asset_symbol TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_asset_id UUID;
  v_current_locked NUMERIC;
  v_expected_locked NUMERIC := 0;
  v_discrepancy NUMERIC;
BEGIN
  -- Get asset ID
  SELECT id INTO v_asset_id FROM assets WHERE symbol = p_asset_symbol LIMIT 1;
  
  IF v_asset_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Asset not found');
  END IF;

  -- Get current locked balance with row lock
  SELECT locked INTO v_current_locked
  FROM wallet_balances
  WHERE user_id = p_user_id AND asset_id = v_asset_id
  FOR UPDATE;

  IF v_current_locked IS NULL THEN
    RETURN jsonb_build_object('success', true, 'message', 'No balance record');
  END IF;

  -- Calculate expected locked from open orders
  -- BUY orders lock the QUOTE asset
  SELECT COALESCE(SUM(
    ROUND(remaining_amount * COALESCE(price, 0) * 1.005, 8)
  ), 0) INTO v_expected_locked
  FROM orders
  WHERE user_id = p_user_id
    AND side = 'buy'
    AND status IN ('pending', 'partially_filled')
    AND split_part(symbol, '/', 2) = p_asset_symbol;

  -- SELL orders lock the BASE asset  
  SELECT v_expected_locked + COALESCE(SUM(ROUND(remaining_amount, 8)), 0) INTO v_expected_locked
  FROM orders
  WHERE user_id = p_user_id
    AND side = 'sell'
    AND status IN ('pending', 'partially_filled')
    AND split_part(symbol, '/', 1) = p_asset_symbol;

  v_discrepancy := ROUND(v_current_locked - v_expected_locked, 8);

  IF ABS(v_discrepancy) > 0.00000001 THEN
    UPDATE wallet_balances
    SET 
      locked = v_expected_locked,
      available = available + v_discrepancy,
      updated_at = NOW()
    WHERE user_id = p_user_id AND asset_id = v_asset_id;

    INSERT INTO trading_audit_log (user_id, event_type, payload)
    VALUES (
      p_user_id,
      'BALANCE_RECONCILED',
      jsonb_build_object(
        'asset', p_asset_symbol,
        'previous_locked', v_current_locked,
        'new_locked', v_expected_locked,
        'discrepancy', v_discrepancy
      )
    );

    RETURN jsonb_build_object(
      'success', true,
      'reconciled', true,
      'discrepancy', v_discrepancy,
      'previous_locked', v_current_locked,
      'new_locked', v_expected_locked
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'reconciled', false,
    'message', 'No discrepancy found'
  );
END;
$$;

-- 6. Create balance integrity check function
CREATE OR REPLACE FUNCTION public.check_balance_integrity(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_issues JSONB := '[]'::jsonb;
  v_balance RECORD;
  v_expected_locked NUMERIC;
  v_asset_symbol TEXT;
BEGIN
  FOR v_balance IN 
    SELECT wb.*, a.symbol
    FROM wallet_balances wb
    JOIN assets a ON a.id = wb.asset_id
    WHERE wb.user_id = p_user_id
  LOOP
    v_asset_symbol := v_balance.symbol;
    
    IF v_balance.available < 0 THEN
      v_issues := v_issues || jsonb_build_object(
        'asset', v_asset_symbol,
        'issue', 'NEGATIVE_AVAILABLE',
        'value', v_balance.available
      );
    END IF;

    IF v_balance.locked < 0 THEN
      v_issues := v_issues || jsonb_build_object(
        'asset', v_asset_symbol,
        'issue', 'NEGATIVE_LOCKED',
        'value', v_balance.locked
      );
    END IF;

    v_expected_locked := 0;
    
    SELECT COALESCE(SUM(ROUND(remaining_amount * COALESCE(price, 0) * 1.005, 8)), 0) INTO v_expected_locked
    FROM orders
    WHERE user_id = p_user_id
      AND side = 'buy'
      AND status IN ('pending', 'partially_filled')
      AND split_part(symbol, '/', 2) = v_asset_symbol;

    SELECT v_expected_locked + COALESCE(SUM(ROUND(remaining_amount, 8)), 0) INTO v_expected_locked
    FROM orders
    WHERE user_id = p_user_id
      AND side = 'sell'
      AND status IN ('pending', 'partially_filled')
      AND split_part(symbol, '/', 1) = v_asset_symbol;

    IF ABS(v_balance.locked - v_expected_locked) > 0.00000001 THEN
      v_issues := v_issues || jsonb_build_object(
        'asset', v_asset_symbol,
        'issue', 'LOCKED_MISMATCH',
        'current_locked', v_balance.locked,
        'expected_locked', v_expected_locked,
        'discrepancy', v_balance.locked - v_expected_locked
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'user_id', p_user_id,
    'has_issues', jsonb_array_length(v_issues) > 0,
    'issue_count', jsonb_array_length(v_issues),
    'issues', v_issues
  );
END;
$$;

-- 7. Create force fix all balances function
CREATE OR REPLACE FUNCTION public.force_fix_user_balances(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fixed_count INTEGER := 0;
  v_balance RECORD;
  v_result JSONB;
BEGIN
  FOR v_balance IN 
    SELECT wb.*, a.symbol
    FROM wallet_balances wb
    JOIN assets a ON a.id = wb.asset_id
    WHERE wb.user_id = p_user_id
  LOOP
    SELECT reconcile_locked_balance(p_user_id, v_balance.symbol) INTO v_result;
    IF (v_result->>'reconciled')::boolean = true THEN
      v_fixed_count := v_fixed_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'fixed_count', v_fixed_count
  );
END;
$$;

-- 8. Fix update_last_traded_price to use symbol for upsert
CREATE OR REPLACE FUNCTION public.update_last_traded_price(
  p_symbol TEXT,
  p_price NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO market_prices (id, market_id, symbol, current_price, last_updated, created_at, updated_at, price_change_24h, price_change_percentage_24h, high_24h, low_24h, volume_24h)
  VALUES (
    gen_random_uuid(),
    gen_random_uuid(),
    p_symbol,
    p_price,
    NOW(),
    NOW(),
    NOW(),
    0,
    0,
    p_price,
    p_price,
    0
  )
  ON CONFLICT (symbol) DO UPDATE
  SET 
    current_price = EXCLUDED.current_price,
    last_updated = NOW(),
    updated_at = NOW(),
    high_24h = GREATEST(market_prices.high_24h, EXCLUDED.current_price),
    low_24h = LEAST(market_prices.low_24h, EXCLUDED.current_price);
END;
$$;

-- 9. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.execute_order_cancel TO authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_locked_balance TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_balance_integrity TO authenticated;
GRANT EXECUTE ON FUNCTION public.force_fix_user_balances TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_last_traded_price TO authenticated;