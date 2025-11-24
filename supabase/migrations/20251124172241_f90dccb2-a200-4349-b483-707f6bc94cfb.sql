-- Drop existing function to allow return type change from JSON to JSONB
DROP FUNCTION IF EXISTS public.atomic_badge_purchase(UUID, TEXT, TEXT, NUMERIC, TEXT, TEXT);

-- Fix atomic_badge_purchase with correct JSONB types and comprehensive logging
-- Root cause: record_bsk_transaction returns JSONB but we were using JSON type
-- This caused type casting errors: "invalid input syntax for type json"

CREATE OR REPLACE FUNCTION public.atomic_badge_purchase(
  p_user_id UUID,
  p_badge_name TEXT,
  p_previous_badge TEXT,
  p_paid_amount_bsk NUMERIC,
  p_payment_ref TEXT,
  p_payment_method TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_debit_idempotency TEXT;
  v_credit_idempotency TEXT;
  v_new_withdrawable NUMERIC;
  v_new_holding NUMERIC;
  v_current_withdrawable NUMERIC;
  v_bonus_amount NUMERIC := 0;
  v_purchase_id UUID;
  v_rate_snapshot NUMERIC := 1.0;
  v_debit_result JSONB;  -- ✅ Fixed: Use JSONB not JSON
  v_credit_result JSONB; -- ✅ Fixed: Use JSONB not JSON
BEGIN
  RAISE NOTICE '[Badge Purchase] Starting purchase for user=% badge=% amount=%', p_user_id, p_badge_name, p_paid_amount_bsk;
  
  -- Validate badge exists
  IF NOT EXISTS (SELECT 1 FROM badge_thresholds WHERE badge_name = p_badge_name AND is_active = true) THEN
    RAISE EXCEPTION 'Badge % does not exist or is inactive', p_badge_name;
  END IF;
  
  -- Check user has sufficient balance
  SELECT COALESCE(withdrawable_balance, 0) INTO v_current_withdrawable
  FROM user_bsk_balances
  WHERE user_id = p_user_id;
  
  RAISE NOTICE '[Badge Purchase] Current withdrawable balance: %', v_current_withdrawable;
  
  IF v_current_withdrawable < p_paid_amount_bsk THEN
    RAISE EXCEPTION 'Insufficient balance: has % BSK, needs % BSK', v_current_withdrawable, p_paid_amount_bsk;
  END IF;
  
  -- Generate idempotency keys
  v_debit_idempotency := 'badge_debit_' || p_user_id || '_' || p_badge_name || '_' || EXTRACT(EPOCH FROM NOW());
  v_credit_idempotency := 'badge_bonus_' || p_user_id || '_' || p_badge_name || '_' || EXTRACT(EPOCH FROM NOW());
  
  -- Get BSK rate from settings
  SELECT COALESCE(bsk_inr_rate, 1.0) INTO v_rate_snapshot
  FROM team_referral_settings
  ORDER BY created_at DESC
  LIMIT 1;
  
  RAISE NOTICE '[Badge Purchase] Using BSK rate: %', v_rate_snapshot;
  
  -- 1. Deduct BSK using record_bsk_transaction
  RAISE NOTICE '[Badge Purchase] Calling record_bsk_transaction for DEBIT...';
  
  BEGIN
    v_debit_result := record_bsk_transaction(
      p_user_id,
      v_debit_idempotency,
      'debit',
      CASE WHEN p_previous_badge IS NOT NULL THEN 'badge_upgrade' ELSE 'badge_purchase' END,
      'withdrawable',
      p_paid_amount_bsk,
      NULL, -- no related_user_id for purchase
      jsonb_build_object(
        'badge_name', p_badge_name,
        'previous_badge', p_previous_badge,
        'payment_ref', p_payment_ref,
        'payment_method', p_payment_method,
        'amount_inr', p_paid_amount_bsk * v_rate_snapshot,
        'rate_snapshot', v_rate_snapshot
      )
    );
    
    RAISE NOTICE '[Badge Purchase] Debit result: %', v_debit_result;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION '[Badge Purchase] Debit failed with exception: % %', SQLERRM, SQLSTATE;
  END;
  
  -- Check if debit was successful
  IF (v_debit_result->>'success')::BOOLEAN IS NOT TRUE THEN
    RAISE EXCEPTION '[Badge Purchase] Debit failed: %', v_debit_result->>'error';
  END IF;
  
  RAISE NOTICE '[Badge Purchase] Debit successful, balance_after=%', v_debit_result->>'balance_after';
  
  -- 2. Assign badge
  INSERT INTO user_badge_holdings (
    user_id, current_badge, previous_badge, price_bsk, purchased_at
  ) VALUES (
    p_user_id, p_badge_name, p_previous_badge, p_paid_amount_bsk, NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    current_badge = EXCLUDED.current_badge,
    previous_badge = EXCLUDED.previous_badge,
    price_bsk = EXCLUDED.price_bsk,
    purchased_at = EXCLUDED.purchased_at
  RETURNING id INTO v_purchase_id;
  
  RAISE NOTICE '[Badge Purchase] Badge assigned, purchase_id=%', v_purchase_id;
  
  -- 3. Get bonus amount from badge_thresholds
  SELECT COALESCE(bonus_bsk_holding, 0) INTO v_bonus_amount
  FROM badge_thresholds
  WHERE badge_name = p_badge_name AND is_active = true;
  
  RAISE NOTICE '[Badge Purchase] Bonus amount for %: % BSK', p_badge_name, v_bonus_amount;
  
  -- 4. Credit bonus if applicable
  IF v_bonus_amount > 0 THEN
    RAISE NOTICE '[Badge Purchase] Calling record_bsk_transaction for CREDIT (bonus)...';
    
    BEGIN
      v_credit_result := record_bsk_transaction(
        p_user_id,
        v_credit_idempotency,
        'credit',
        'badge_bonus',
        'holding',
        v_bonus_amount,
        NULL,
        jsonb_build_object(
          'badge_name', p_badge_name,
          'bonus_type', 'holding_balance',
          'purchase_id', v_purchase_id,
          'amount_inr', v_bonus_amount * v_rate_snapshot,
          'rate_snapshot', v_rate_snapshot
        )
      );
      
      RAISE NOTICE '[Badge Purchase] Credit result: %', v_credit_result;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE EXCEPTION '[Badge Purchase] Bonus credit failed with exception: % %', SQLERRM, SQLSTATE;
    END;
    
    -- Check if bonus credit was successful
    IF (v_credit_result->>'success')::BOOLEAN IS NOT TRUE THEN
      RAISE EXCEPTION '[Badge Purchase] Bonus credit failed: %', v_credit_result->>'error';
    END IF;
    
    RAISE NOTICE '[Badge Purchase] Bonus credited successfully';
  END IF;
  
  -- 5. Get updated balances
  SELECT COALESCE(withdrawable_balance, 0), COALESCE(holding_balance, 0) 
  INTO v_new_withdrawable, v_new_holding
  FROM user_bsk_balances
  WHERE user_id = p_user_id;
  
  RAISE NOTICE '[Badge Purchase] Final balances - withdrawable=%, holding=%', v_new_withdrawable, v_new_holding;
  RAISE NOTICE '[Badge Purchase] Transaction completed successfully!';
  
  RETURN jsonb_build_object(
    'success', true,
    'purchaseId', v_purchase_id,
    'newWithdrawable', v_new_withdrawable,
    'newHolding', v_new_holding,
    'bonusCredited', v_bonus_amount,
    'debitLedgerId', v_debit_result->>'ledger_id',
    'creditLedgerId', CASE WHEN v_bonus_amount > 0 THEN v_credit_result->>'ledger_id' ELSE NULL END
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '[Badge Purchase] Transaction failed: % %', SQLERRM, SQLSTATE;
    RAISE EXCEPTION '[Badge Purchase] Transaction failed: % %', SQLERRM, SQLSTATE;
END;
$$;