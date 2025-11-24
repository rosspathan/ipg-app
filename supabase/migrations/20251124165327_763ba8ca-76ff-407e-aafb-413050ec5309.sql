-- Fix atomic_badge_purchase to properly handle errors from record_bsk_transaction
-- The issue: PERFORM discards results and doesn't raise errors, causing silent failures

CREATE OR REPLACE FUNCTION public.atomic_badge_purchase(
  p_user_id UUID,
  p_badge_name TEXT,
  p_previous_badge TEXT,
  p_paid_amount_bsk NUMERIC,
  p_payment_ref TEXT,
  p_payment_method TEXT
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_debit_idempotency TEXT;
  v_credit_idempotency TEXT;
  v_new_withdrawable NUMERIC;
  v_new_holding NUMERIC;
  v_bonus_amount NUMERIC := 0;
  v_purchase_id UUID;
  v_rate_snapshot NUMERIC := 1.0;
  v_debit_result JSON;
  v_credit_result JSON;
BEGIN
  -- Generate idempotency keys
  v_debit_idempotency := 'badge_debit_' || p_user_id || '_' || p_badge_name || '_' || EXTRACT(EPOCH FROM NOW());
  v_credit_idempotency := 'badge_bonus_' || p_user_id || '_' || p_badge_name || '_' || EXTRACT(EPOCH FROM NOW());
  
  -- Get BSK rate from settings
  SELECT COALESCE(bsk_inr_rate, 1.0) INTO v_rate_snapshot
  FROM team_referral_settings
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- 1. Deduct BSK using record_bsk_transaction - CRITICAL: Capture result to detect errors
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
  
  -- Check if debit was successful
  IF (v_debit_result->>'success')::BOOLEAN IS NOT TRUE THEN
    RAISE EXCEPTION 'Badge purchase debit failed: %', v_debit_result->>'error';
  END IF;
  
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
  
  -- 3. Get bonus amount from badge_thresholds
  SELECT COALESCE(bonus_bsk_holding, 0) INTO v_bonus_amount
  FROM badge_thresholds
  WHERE badge_name = p_badge_name AND is_active = true;
  
  -- 4. Credit bonus if applicable
  IF v_bonus_amount > 0 THEN
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
        'amount_inr', v_bonus_amount * v_rate_snapshot,
        'rate_snapshot', v_rate_snapshot
      )
    );
    
    -- Check if bonus credit was successful
    IF (v_credit_result->>'success')::BOOLEAN IS NOT TRUE THEN
      RAISE EXCEPTION 'Badge bonus credit failed: %', v_credit_result->>'error';
    END IF;
  END IF;
  
  -- 5. Get updated balances
  SELECT withdrawable_balance, holding_balance INTO v_new_withdrawable, v_new_holding
  FROM user_bsk_balances
  WHERE user_id = p_user_id;
  
  RETURN json_build_object(
    'success', true,
    'purchaseId', v_purchase_id,
    'newWithdrawable', COALESCE(v_new_withdrawable, 0),
    'newHolding', COALESCE(v_new_holding, 0),
    'bonusCredited', v_bonus_amount
  );
END;
$$;