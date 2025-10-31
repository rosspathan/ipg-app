-- Guard legacy bsk_transactions insert inside atomic_badge_purchase to prevent failures when the table doesn't exist
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
  v_bonus_bsk_holding numeric := 0;
  v_withdrawable numeric := 0;
  v_holding numeric := 0;
  v_total_earned_holding numeric := 0;
  v_deduct_from_withdrawable numeric := 0;
  v_deduct_from_holding numeric := 0;
  v_new_withdrawable numeric;
  v_new_holding numeric;
  v_new_total_earned_holding numeric;
  v_purchase_id uuid;
  v_current_rate numeric := 1.0;
  v_is_upgrade boolean := false;
BEGIN
  -- Ensure user has a balance row
  INSERT INTO user_bsk_balances (user_id, withdrawable_balance, holding_balance, total_earned_withdrawable, total_earned_holding)
  VALUES (p_user_id, 0, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Get user's current badge
  SELECT current_badge INTO v_current_badge
  FROM user_badge_holdings
  WHERE user_id = p_user_id;

  IF v_current_badge IS NOT NULL AND v_current_badge = p_badge_name THEN
    RAISE EXCEPTION 'DUPLICATE_BADGE: User already owns badge %', p_badge_name;
  END IF;

  IF v_current_badge IS NOT NULL AND v_current_badge <> 'None' THEN
    v_is_upgrade := true;
  END IF;

  -- Get bonus for this badge (holding bonus)
  SELECT COALESCE(bonus_bsk_holding, 0)
  INTO v_bonus_bsk_holding
  FROM badge_thresholds
  WHERE badge_name = p_badge_name;

  -- Fetch most recent BSK rate (fallback 1.0)
  SELECT rate_inr_per_bsk
  INTO v_current_rate
  FROM bsk_rates
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_current_rate IS NULL THEN
    v_current_rate := 1.0;
  END IF;

  -- Lock and fetch balances for atomic calc
  SELECT 
    COALESCE(withdrawable_balance, 0),
    COALESCE(holding_balance, 0),
    COALESCE(total_earned_holding, 0)
  INTO v_withdrawable, v_holding, v_total_earned_holding
  FROM user_bsk_balances
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- Sufficient funds check
  IF (v_withdrawable + v_holding) < p_paid_amount_bsk THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE: Required %, Available %', p_paid_amount_bsk, (v_withdrawable + v_holding);
  END IF;

  -- Deduction plan: withdrawable first, then holding
  IF v_withdrawable >= p_paid_amount_bsk THEN
    v_deduct_from_withdrawable := p_paid_amount_bsk;
    v_deduct_from_holding := 0;
  ELSE
    v_deduct_from_withdrawable := v_withdrawable;
    v_deduct_from_holding := p_paid_amount_bsk - v_withdrawable;
  END IF;

  -- Apply deductions and bonus
  v_new_withdrawable := v_withdrawable - v_deduct_from_withdrawable;
  v_new_holding := v_holding - v_deduct_from_holding + COALESCE(v_bonus_bsk_holding, 0);
  v_new_total_earned_holding := v_total_earned_holding + COALESCE(v_bonus_bsk_holding, 0);

  UPDATE user_bsk_balances
  SET 
    withdrawable_balance = v_new_withdrawable,
    holding_balance = v_new_holding,
    total_earned_holding = v_new_total_earned_holding,
    updated_at = now()
  WHERE user_id = p_user_id;

  -- Upsert badge holding with paid price
  INSERT INTO user_badge_holdings (user_id, current_badge, price_bsk, purchased_at)
  VALUES (p_user_id, p_badge_name, p_paid_amount_bsk, now())
  ON CONFLICT (user_id)
  DO UPDATE SET
    current_badge = EXCLUDED.current_badge,
    price_bsk = EXCLUDED.price_bsk,
    purchased_at = EXCLUDED.purchased_at,
    updated_at = now();

  -- Record purchase using correct columns on badge_purchases
  INSERT INTO badge_purchases (
    user_id, badge_name, previous_badge,
    bsk_amount, inr_amount, bsk_rate_at_purchase, is_upgrade,
    payment_ref, payment_method, status
  ) VALUES (
    p_user_id, p_badge_name, v_current_badge,
    p_paid_amount_bsk, p_paid_amount_bsk * v_current_rate, v_current_rate, v_is_upgrade,
    p_payment_ref, p_payment_method, 'completed'
  ) RETURNING id INTO v_purchase_id;

  -- Legacy transaction table write (guarded)
  IF to_regclass('public.bsk_transactions') IS NOT NULL THEN
    INSERT INTO bsk_transactions (user_id, transaction_type, amount, balance_after, description)
    VALUES (
      p_user_id,
      'badge_purchase',
      -p_paid_amount_bsk,
      v_new_withdrawable + v_new_holding,
      format('Purchased %s badge', p_badge_name)
    );
  END IF;

  -- Bonus ledger entry if bonus was awarded
  IF v_bonus_bsk_holding > 0 THEN
    INSERT INTO bonus_ledger (user_id, type, amount_bsk, meta_json)
    VALUES (
      p_user_id, 'badge_bonus', v_bonus_bsk_holding,
      jsonb_build_object('badge_name', p_badge_name, 'purchase_id', v_purchase_id)
    );
  END IF;

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

GRANT EXECUTE ON FUNCTION public.atomic_badge_purchase TO authenticated, service_role;