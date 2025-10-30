-- Phase 1: Credit missing VIP badge bonus to yowoji9551@keevle.com
DO $$
DECLARE
  v_current_rate NUMERIC;
  v_current_balance NUMERIC;
BEGIN
  -- Get current BSK rate
  SELECT rate_inr_per_bsk INTO v_current_rate FROM bsk_rates ORDER BY created_at DESC LIMIT 1;
  
  -- Get user's current holding balance
  SELECT holding_balance INTO v_current_balance 
  FROM user_bsk_balances 
  WHERE user_id = '367832b9-3a8c-4bd6-aa5c-1ec8863b76ae';
  
  -- Update balance
  UPDATE user_bsk_balances
  SET 
    holding_balance = holding_balance + 10000,
    total_earned_holding = total_earned_holding + 10000,
    updated_at = NOW()
  WHERE user_id = '367832b9-3a8c-4bd6-aa5c-1ec8863b76ae';
  
  -- Create ledger entry for the badge bonus
  INSERT INTO bsk_holding_ledger (
    user_id,
    amount_bsk,
    amount_inr,
    rate_snapshot,
    balance_before,
    balance_after,
    tx_type,
    reference_id,
    notes,
    created_at
  )
  SELECT 
    '367832b9-3a8c-4bd6-aa5c-1ec8863b76ae',
    10000,
    10000 * v_current_rate,
    v_current_rate,
    v_current_balance,
    v_current_balance + 10000,
    'badge_bonus',
    bp.id,
    'VIP Badge holding balance bonus (10,000 BSK) - retroactive credit',
    NOW()
  FROM (
    SELECT id FROM badge_purchases 
    WHERE user_id = '367832b9-3a8c-4bd6-aa5c-1ec8863b76ae' 
      AND badge_name = 'VIP'
    ORDER BY created_at DESC 
    LIMIT 1
  ) bp;
END $$;

-- Phase 2: Fix atomic_badge_purchase function to credit badge bonuses
CREATE OR REPLACE FUNCTION public.atomic_badge_purchase(
  p_user_id UUID,
  p_badge_name TEXT,
  p_paid_amount_bsk NUMERIC,
  p_payment_ref TEXT,
  p_payment_method TEXT,
  p_previous_badge TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_withdrawable NUMERIC;
  v_user_holding NUMERIC;
  v_badge_price NUMERIC;
  v_bonus_holding_bsk NUMERIC := 0;
  v_purchase_id UUID;
  v_deducted_from_withdrawable NUMERIC := 0;
  v_deducted_from_holding NUMERIC := 0;
  v_balance_after_withdrawable NUMERIC;
  v_balance_after_holding NUMERIC;
  v_balance_before_withdrawable NUMERIC;
  v_balance_before_holding NUMERIC;
  v_current_rate NUMERIC;
  v_is_upgrade BOOLEAN := false;
BEGIN
  -- Get current BSK rate
  SELECT rate_inr_per_bsk INTO v_current_rate FROM bsk_rates ORDER BY created_at DESC LIMIT 1;
  IF v_current_rate IS NULL THEN
    v_current_rate := 1.0;
  END IF;

  -- Get current balances
  SELECT 
    COALESCE(withdrawable_balance, 0),
    COALESCE(holding_balance, 0)
  INTO v_user_withdrawable, v_user_holding
  FROM user_bsk_balances
  WHERE user_id = p_user_id;
  
  v_balance_before_withdrawable := v_user_withdrawable;
  v_balance_before_holding := v_user_holding;

  -- Get badge price and bonus
  SELECT price_bsk, COALESCE(bonus_bsk_holding, 0)
  INTO v_badge_price, v_bonus_holding_bsk
  FROM badge_thresholds
  WHERE badge_name = p_badge_name AND is_active = true;

  IF v_badge_price IS NULL THEN
    RAISE EXCEPTION 'Badge % not found or inactive', p_badge_name;
  END IF;

  -- Verify payment amount matches badge price
  IF p_paid_amount_bsk != v_badge_price THEN
    RAISE EXCEPTION 'Payment amount mismatch. Expected: %, Got: %', v_badge_price, p_paid_amount_bsk;
  END IF;

  -- Check sufficient balance (withdrawable + holding)
  IF (v_user_withdrawable + v_user_holding) < v_badge_price THEN
    RAISE EXCEPTION 'Insufficient BSK balance. Required: %, Available: %', 
      v_badge_price, (v_user_withdrawable + v_user_holding);
  END IF;

  -- Determine if this is an upgrade
  IF p_previous_badge IS NOT NULL AND p_previous_badge != 'None' THEN
    v_is_upgrade := true;
  END IF;

  -- Deduct from withdrawable first, then holding if needed
  IF v_user_withdrawable >= v_badge_price THEN
    v_deducted_from_withdrawable := v_badge_price;
    v_deducted_from_holding := 0;
  ELSE
    v_deducted_from_withdrawable := v_user_withdrawable;
    v_deducted_from_holding := v_badge_price - v_user_withdrawable;
  END IF;

  -- Update balances atomically
  UPDATE user_bsk_balances
  SET 
    withdrawable_balance = withdrawable_balance - v_deducted_from_withdrawable,
    holding_balance = holding_balance - v_deducted_from_holding,
    total_withdrawn = total_withdrawn + v_deducted_from_withdrawable,
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING withdrawable_balance, holding_balance
  INTO v_balance_after_withdrawable, v_balance_after_holding;

  -- Create badge purchase record
  INSERT INTO badge_purchases (
    user_id,
    badge_name,
    previous_badge,
    bsk_amount,
    inr_amount,
    bsk_rate_at_purchase,
    is_upgrade,
    payment_ref,
    payment_method,
    status
  ) VALUES (
    p_user_id,
    p_badge_name,
    p_previous_badge,
    p_paid_amount_bsk,
    p_paid_amount_bsk * v_current_rate,
    v_current_rate,
    v_is_upgrade,
    p_payment_ref,
    p_payment_method,
    'completed'
  ) RETURNING id INTO v_purchase_id;

  -- Create withdrawable ledger entry if deducted
  IF v_deducted_from_withdrawable > 0 THEN
    INSERT INTO bsk_withdrawable_ledger (
      user_id,
      amount_bsk,
      amount_inr,
      rate_snapshot,
      balance_before,
      balance_after,
      tx_type,
      reference_id,
      notes
    ) VALUES (
      p_user_id,
      -v_deducted_from_withdrawable,
      -v_deducted_from_withdrawable * v_current_rate,
      v_current_rate,
      v_balance_before_withdrawable,
      v_balance_after_withdrawable,
      'badge_purchase',
      v_purchase_id,
      format('Badge purchase: %s (paid %s BSK from withdrawable)', p_badge_name, v_deducted_from_withdrawable)
    );
  END IF;

  -- Create holding ledger entry if deducted
  IF v_deducted_from_holding > 0 THEN
    INSERT INTO bsk_holding_ledger (
      user_id,
      amount_bsk,
      amount_inr,
      rate_snapshot,
      balance_before,
      balance_after,
      tx_type,
      reference_id,
      notes
    ) VALUES (
      p_user_id,
      -v_deducted_from_holding,
      -v_deducted_from_holding * v_current_rate,
      v_current_rate,
      v_balance_before_holding,
      v_balance_after_holding,
      'badge_purchase',
      v_purchase_id,
      format('Badge purchase: %s (paid %s BSK from holding)', p_badge_name, v_deducted_from_holding)
    );
  END IF;

  -- Credit badge holding bonus if applicable
  IF v_bonus_holding_bsk > 0 THEN
    v_balance_before_holding := v_balance_after_holding;
    
    UPDATE user_bsk_balances
    SET 
      holding_balance = holding_balance + v_bonus_holding_bsk,
      total_earned_holding = total_earned_holding + v_bonus_holding_bsk,
      updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING holding_balance INTO v_balance_after_holding;

    -- Create ledger entry for bonus
    INSERT INTO bsk_holding_ledger (
      user_id,
      amount_bsk,
      amount_inr,
      rate_snapshot,
      balance_before,
      balance_after,
      tx_type,
      reference_id,
      notes
    ) VALUES (
      p_user_id,
      v_bonus_holding_bsk,
      v_bonus_holding_bsk * v_current_rate,
      v_current_rate,
      v_balance_before_holding,
      v_balance_after_holding,
      'badge_bonus',
      v_purchase_id,
      format('%s Badge holding balance bonus (%s BSK)', p_badge_name, v_bonus_holding_bsk)
    );
  END IF;

  -- Update user badge holdings
  INSERT INTO user_badge_holdings (user_id, current_badge, purchased_at)
  VALUES (p_user_id, p_badge_name, NOW())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    current_badge = p_badge_name,
    purchased_at = NOW(),
    updated_at = NOW();

  -- Return success with details
  RETURN json_build_object(
    'success', true,
    'purchase_id', v_purchase_id,
    'badge', p_badge_name,
    'paid_amount', p_paid_amount_bsk,
    'deducted_from_withdrawable', v_deducted_from_withdrawable,
    'deducted_from_holding', v_deducted_from_holding,
    'bonus_credited', v_bonus_holding_bsk,
    'new_withdrawable_balance', v_balance_after_withdrawable,
    'new_holding_balance', v_balance_after_holding
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Badge purchase failed: %', SQLERRM;
END;
$$;