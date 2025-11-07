-- Fix admin_adjust_user_balance to use holding_balance instead of locked_balance
CREATE OR REPLACE FUNCTION public.admin_adjust_user_balance(
  p_target_user_id UUID,
  p_balance_type TEXT,
  p_operation TEXT,
  p_amount NUMERIC,
  p_reason TEXT,
  p_subtype TEXT DEFAULT 'withdrawable'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_calling_user_id UUID;
  v_is_admin BOOLEAN;
  v_before NUMERIC;
  v_after NUMERIC;
  v_result JSON;
BEGIN
  -- Get calling user
  v_calling_user_id := auth.uid();
  IF v_calling_user_id IS NULL THEN
    RETURN json_build_object('ok', false, 'message', 'Not authenticated');
  END IF;

  -- Check admin role
  SELECT EXISTS(
    SELECT 1 FROM user_roles 
    WHERE user_id = v_calling_user_id AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN json_build_object('ok', false, 'message', 'Admin role required');
  END IF;

  -- Validate inputs
  IF p_balance_type NOT IN ('bsk', 'inr') THEN
    RETURN json_build_object('ok', false, 'message', 'Invalid balance type. Must be "bsk" or "inr"');
  END IF;

  IF p_operation NOT IN ('add', 'deduct') THEN
    RETURN json_build_object('ok', false, 'message', 'Invalid operation. Must be "add" or "deduct"');
  END IF;

  IF p_amount <= 0 THEN
    RETURN json_build_object('ok', false, 'message', 'Amount must be positive');
  END IF;

  -- BSK balance handling
  IF p_balance_type = 'bsk' THEN
    IF p_subtype NOT IN ('withdrawable', 'holding', 'lifetime_earnings', 'referral_earnings') THEN
      RETURN json_build_object('ok', false, 'message', 'Invalid BSK subtype');
    END IF;

    -- Get current balance
    IF p_subtype = 'withdrawable' THEN
      SELECT COALESCE(withdrawable_balance, 0) INTO v_before 
      FROM user_bsk_balances WHERE user_id = p_target_user_id;
    ELSIF p_subtype = 'holding' THEN
      SELECT COALESCE(holding_balance, 0) INTO v_before 
      FROM user_bsk_balances WHERE user_id = p_target_user_id;
    ELSIF p_subtype = 'lifetime_earnings' THEN
      SELECT COALESCE(lifetime_earnings, 0) INTO v_before 
      FROM user_bsk_balances WHERE user_id = p_target_user_id;
    ELSIF p_subtype = 'referral_earnings' THEN
      SELECT COALESCE(referral_earnings, 0) INTO v_before 
      FROM user_bsk_balances WHERE user_id = p_target_user_id;
    END IF;

    v_before := COALESCE(v_before, 0);

    -- Validate sufficient balance before deducting
    IF p_operation = 'deduct' THEN
      IF v_before < p_amount THEN
        RETURN json_build_object(
          'ok', false, 
          'message', 'Insufficient BSK balance (' || p_subtype || '). Available: ' || v_before || ', Requested: ' || p_amount
        );
      END IF;
      v_after := v_before - p_amount;
    ELSE
      v_after := v_before + p_amount;
    END IF;

    -- Update balance
    IF p_subtype = 'withdrawable' THEN
      INSERT INTO user_bsk_balances (user_id, withdrawable_balance, holding_balance, lifetime_earnings, referral_earnings)
      VALUES (p_target_user_id, v_after, 0, 0, 0)
      ON CONFLICT (user_id) DO UPDATE SET withdrawable_balance = v_after, updated_at = now();
    ELSIF p_subtype = 'holding' THEN
      INSERT INTO user_bsk_balances (user_id, withdrawable_balance, holding_balance, lifetime_earnings, referral_earnings)
      VALUES (p_target_user_id, 0, v_after, 0, 0)
      ON CONFLICT (user_id) DO UPDATE SET holding_balance = v_after, updated_at = now();
    ELSIF p_subtype = 'lifetime_earnings' THEN
      INSERT INTO user_bsk_balances (user_id, withdrawable_balance, holding_balance, lifetime_earnings, referral_earnings)
      VALUES (p_target_user_id, 0, 0, v_after, 0)
      ON CONFLICT (user_id) DO UPDATE SET lifetime_earnings = v_after, updated_at = now();
    ELSIF p_subtype = 'referral_earnings' THEN
      INSERT INTO user_bsk_balances (user_id, withdrawable_balance, holding_balance, lifetime_earnings, referral_earnings)
      VALUES (p_target_user_id, 0, 0, 0, v_after)
      ON CONFLICT (user_id) DO UPDATE SET referral_earnings = v_after, updated_at = now();
    END IF;

  -- INR balance handling
  ELSIF p_balance_type = 'inr' THEN
    -- Get current balance
    SELECT COALESCE(balance, 0) INTO v_before 
    FROM user_inr_balances WHERE user_id = p_target_user_id FOR UPDATE;

    v_before := COALESCE(v_before, 0);

    -- Validate sufficient balance before deducting
    IF p_operation = 'deduct' THEN
      IF v_before < p_amount THEN
        RETURN json_build_object(
          'ok', false,
          'message', 'Insufficient INR balance. Available: ₹' || v_before || ', Requested: ₹' || p_amount
        );
      END IF;
      v_after := v_before - p_amount;
    ELSE
      v_after := v_before + p_amount;
    END IF;

    -- Update balance
    INSERT INTO user_inr_balances (user_id, balance)
    VALUES (p_target_user_id, v_after)
    ON CONFLICT (user_id) DO UPDATE SET balance = v_after, updated_at = now();
  END IF;

  -- Log the adjustment
  INSERT INTO admin_balance_adjustments (
    admin_user_id, target_user_id, balance_type, operation, amount, reason, before_balance, after_balance
  ) VALUES (
    v_calling_user_id, p_target_user_id, p_balance_type, p_operation, p_amount, p_reason, v_before, v_after
  );

  RETURN json_build_object(
    'ok', true,
    'message', 'Balance adjusted successfully',
    'before', v_before,
    'after', v_after
  );
END;
$$;