-- Fix atomic_badge_purchase function to use correct column name from badge_thresholds
CREATE OR REPLACE FUNCTION public.atomic_badge_purchase(
  p_user_id UUID,
  p_badge_name TEXT,
  p_paid_amount_bsk NUMERIC,
  p_previous_badge TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_withdrawable_balance NUMERIC;
  v_holding_balance NUMERIC;
  v_badge_price NUMERIC;
  v_bonus_holding_bsk NUMERIC;
  v_deduct_withdrawable NUMERIC := 0;
  v_deduct_holding NUMERIC := 0;
  result JSONB;
BEGIN
  -- Get user's current BSK balances
  SELECT 
    COALESCE(withdrawable_balance, 0),
    COALESCE(holding_balance, 0)
  INTO v_withdrawable_balance, v_holding_balance
  FROM user_bsk_balances
  WHERE user_id = p_user_id;
  
  -- If no balance record exists, create one with zero balances
  IF NOT FOUND THEN
    INSERT INTO user_bsk_balances (user_id, withdrawable_balance, holding_balance)
    VALUES (p_user_id, 0, 0);
    v_withdrawable_balance := 0;
    v_holding_balance := 0;
  END IF;
  
  -- Get badge threshold price and bonus (using bsk_threshold, not price_bsk)
  SELECT bsk_threshold, COALESCE(bonus_bsk_holding, 0)
  INTO v_badge_price, v_bonus_holding_bsk
  FROM badge_thresholds
  WHERE badge_name = p_badge_name AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Badge not found or inactive');
  END IF;
  
  -- Verify user has enough balance (total of withdrawable + holding)
  IF (v_withdrawable_balance + v_holding_balance) < p_paid_amount_bsk THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'INSUFFICIENT_BALANCE',
      'required', p_paid_amount_bsk,
      'available_withdrawable', v_withdrawable_balance,
      'available_holding', v_holding_balance,
      'total_available', v_withdrawable_balance + v_holding_balance
    );
  END IF;
  
  -- Check for duplicate badge purchase
  IF EXISTS (
    SELECT 1 FROM user_badge_holdings 
    WHERE user_id = p_user_id AND current_badge = p_badge_name
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'DUPLICATE_BADGE');
  END IF;
  
  -- Calculate deductions (withdrawable first, then holding)
  IF v_withdrawable_balance >= p_paid_amount_bsk THEN
    v_deduct_withdrawable := p_paid_amount_bsk;
    v_deduct_holding := 0;
  ELSE
    v_deduct_withdrawable := v_withdrawable_balance;
    v_deduct_holding := p_paid_amount_bsk - v_withdrawable_balance;
  END IF;
  
  -- Deduct from user's BSK balances atomically
  UPDATE user_bsk_balances
  SET 
    withdrawable_balance = withdrawable_balance - v_deduct_withdrawable,
    holding_balance = holding_balance - v_deduct_holding,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Insert badge purchase record with the amount user actually paid
  INSERT INTO user_badge_holdings (
    user_id,
    current_badge,
    previous_badge,
    price_bsk,
    purchased_at
  ) VALUES (
    p_user_id,
    p_badge_name,
    p_previous_badge,
    p_paid_amount_bsk,
    NOW()
  );
  
  -- Credit VIP bonus to holding balance if applicable
  IF v_bonus_holding_bsk > 0 THEN
    UPDATE user_bsk_balances
    SET 
      holding_balance = holding_balance + v_bonus_holding_bsk,
      total_earned_holding = total_earned_holding + v_bonus_holding_bsk,
      updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Log bonus in ledger
    INSERT INTO bonus_ledger (user_id, type, amount_bsk, meta_json)
    VALUES (
      p_user_id,
      'badge_purchase_bonus',
      v_bonus_holding_bsk,
      jsonb_build_object(
        'badge_name', p_badge_name,
        'bonus_type', 'vip_purchase_bonus',
        'paid_amount_bsk', p_paid_amount_bsk
      )
    );
  END IF;
  
  -- Log the purchase in bonus_ledger
  INSERT INTO bonus_ledger (user_id, type, amount_bsk, meta_json)
  VALUES (
    p_user_id,
    'badge_purchase',
    -p_paid_amount_bsk,
    jsonb_build_object(
      'badge_name', p_badge_name,
      'previous_badge', p_previous_badge,
      'deducted_withdrawable', v_deduct_withdrawable,
      'deducted_holding', v_deduct_holding
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'badge_name', p_badge_name,
    'previous_badge', p_previous_badge,
    'paid_amount_bsk', p_paid_amount_bsk,
    'bonus_holding_bsk', v_bonus_holding_bsk,
    'deducted_withdrawable', v_deduct_withdrawable,
    'deducted_holding', v_deduct_holding
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'detail', SQLSTATE
    );
END;
$$;