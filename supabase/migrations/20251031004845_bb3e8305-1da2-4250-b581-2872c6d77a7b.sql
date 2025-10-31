-- Fix atomic_badge_purchase to maintain balance consistency
CREATE OR REPLACE FUNCTION public.atomic_badge_purchase(
  p_user_id uuid,
  p_badge_name text,
  p_previous_badge text DEFAULT NULL,
  p_paid_amount_bsk numeric DEFAULT 0,
  p_payment_ref text DEFAULT NULL,
  p_payment_method text DEFAULT 'BSK'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_badge text;
  v_target_threshold numeric;
  v_bonus_bsk_holding numeric := 0;
  v_withdrawable numeric := 0;
  v_holding numeric := 0;
  v_deduct_from_withdrawable numeric := 0;
  v_deduct_from_holding numeric := 0;
  v_new_withdrawable numeric;
  v_new_holding numeric;
  v_new_total numeric;
  v_purchase_id uuid;
BEGIN
  SELECT current_badge INTO v_current_badge
  FROM user_badge_holdings
  WHERE user_id = p_user_id;

  IF v_current_badge IS NOT NULL AND v_current_badge = p_badge_name THEN
    RAISE EXCEPTION 'DUPLICATE_BADGE: User already owns badge %', p_badge_name;
  END IF;

  SELECT bsk_threshold, bonus_bsk_holding INTO v_target_threshold, v_bonus_bsk_holding
  FROM badge_thresholds
  WHERE badge_name = p_badge_name;

  IF v_target_threshold IS NULL THEN
    RAISE EXCEPTION 'BADGE_NOT_FOUND: Badge % not found in thresholds', p_badge_name;
  END IF;

  SELECT withdrawable_balance, holding_balance INTO v_withdrawable, v_holding
  FROM user_bsk_balances
  WHERE user_id = p_user_id
  FOR UPDATE;

  v_withdrawable := COALESCE(v_withdrawable, 0);
  v_holding := COALESCE(v_holding, 0);

  IF (v_withdrawable + v_holding) < p_paid_amount_bsk THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE: Required %, Available %', p_paid_amount_bsk, (v_withdrawable + v_holding);
  END IF;

  IF v_withdrawable >= p_paid_amount_bsk THEN
    v_deduct_from_withdrawable := p_paid_amount_bsk;
    v_deduct_from_holding := 0;
  ELSE
    v_deduct_from_withdrawable := v_withdrawable;
    v_deduct_from_holding := p_paid_amount_bsk - v_withdrawable;
  END IF;

  v_new_withdrawable := v_withdrawable - v_deduct_from_withdrawable;
  v_new_holding := v_holding - v_deduct_from_holding + COALESCE(v_bonus_bsk_holding, 0);
  v_new_total := v_new_withdrawable + v_new_holding; -- maintain check_balance_consistency

  UPDATE user_bsk_balances
  SET 
    withdrawable_balance = v_new_withdrawable,
    holding_balance = v_new_holding,
    total_balance = v_new_total,
    updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO user_badge_holdings (user_id, current_badge, price_bsk, purchased_at)
  VALUES (p_user_id, p_badge_name, p_paid_amount_bsk, now())
  ON CONFLICT (user_id)
  DO UPDATE SET
    current_badge = EXCLUDED.current_badge,
    price_bsk = EXCLUDED.price_bsk,
    purchased_at = EXCLUDED.purchased_at;

  INSERT INTO badge_purchases (user_id, badge_name, previous_badge, paid_amount_bsk, payment_ref, payment_method, status)
  VALUES (p_user_id, p_badge_name, v_current_badge, p_paid_amount_bsk, p_payment_ref, p_payment_method, 'completed')
  RETURNING id INTO v_purchase_id;

  INSERT INTO bsk_transactions (user_id, transaction_type, amount, balance_after, description)
  VALUES (
    p_user_id,
    'badge_purchase',
    -p_paid_amount_bsk,
    v_new_total,
    format('Purchased %s badge', p_badge_name)
  );

  RETURN jsonb_build_object(
    'success', true,
    'purchaseId', v_purchase_id,
    'badgeName', p_badge_name,
    'previousBadge', v_current_badge,
    'paidAmount', p_paid_amount_bsk,
    'bonusReceived', v_bonus_bsk_holding,
    'newWithdrawable', v_new_withdrawable,
    'newHolding', v_new_holding,
    'deductedFromWithdrawable', v_deduct_from_withdrawable,
    'deductedFromHolding', v_deduct_from_holding
  );
END;
$$;