-- Replace admin_adjust_user_balance to match actual user_bsk_balances schema
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
  v_increment NUMERIC;
BEGIN
  -- Auth check
  v_calling_user_id := auth.uid();
  IF v_calling_user_id IS NULL THEN
    RETURN json_build_object('ok', false, 'message', 'Not authenticated');
  END IF;

  -- Role check
  SELECT EXISTS(
    SELECT 1 FROM user_roles WHERE user_id = v_calling_user_id AND role = 'admin'
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

  -- BSK handling
  IF p_balance_type = 'bsk' THEN
    IF p_subtype NOT IN ('withdrawable', 'holding') THEN
      RETURN json_build_object('ok', false, 'message', 'Invalid BSK subtype. Use "withdrawable" or "holding"');
    END IF;

    -- Read current balance
    IF p_subtype = 'withdrawable' THEN
      SELECT COALESCE(withdrawable_balance, 0) INTO v_before
      FROM user_bsk_balances WHERE user_id = p_target_user_id
      FOR UPDATE;
    ELSE
      SELECT COALESCE(holding_balance, 0) INTO v_before
      FROM user_bsk_balances WHERE user_id = p_target_user_id
      FOR UPDATE;
    END IF;

    v_before := COALESCE(v_before, 0);
    IF p_operation = 'deduct' THEN
      IF v_before < p_amount THEN
        RETURN json_build_object('ok', false, 'message', 'Insufficient BSK balance. Available: '||v_before||', Requested: '||p_amount);
      END IF;
      v_after := v_before - p_amount;
      v_increment := 0; -- do not change total_earned* on deductions
    ELSE
      v_after := v_before + p_amount;
      v_increment := p_amount; -- increase total_earned* on credits
    END IF;

    -- Upsert with correct columns
    IF p_subtype = 'withdrawable' THEN
      INSERT INTO user_bsk_balances (user_id, withdrawable_balance, holding_balance, total_earned_withdrawable, total_earned_holding)
      VALUES (p_target_user_id, v_after, 0, v_increment, 0)
      ON CONFLICT (user_id) DO UPDATE SET
        withdrawable_balance = EXCLUDED.withdrawable_balance,
        total_earned_withdrawable = user_bsk_balances.total_earned_withdrawable + v_increment,
        updated_at = now();
    ELSE
      INSERT INTO user_bsk_balances (user_id, withdrawable_balance, holding_balance, total_earned_withdrawable, total_earned_holding)
      VALUES (p_target_user_id, 0, v_after, 0, v_increment)
      ON CONFLICT (user_id) DO UPDATE SET
        holding_balance = EXCLUDED.holding_balance,
        total_earned_holding = user_bsk_balances.total_earned_holding + v_increment,
        updated_at = now();
    END IF;

  -- INR handling
  ELSIF p_balance_type = 'inr' THEN
    SELECT COALESCE(balance, 0) INTO v_before
    FROM user_inr_balances WHERE user_id = p_target_user_id FOR UPDATE;

    v_before := COALESCE(v_before, 0);
    IF p_operation = 'deduct' THEN
      IF v_before < p_amount THEN
        RETURN json_build_object('ok', false, 'message', 'Insufficient INR balance. Available: '||v_before||', Requested: '||p_amount);
      END IF;
      v_after := v_before - p_amount;
    ELSE
      v_after := v_before + p_amount;
    END IF;

    INSERT INTO user_inr_balances (user_id, balance)
    VALUES (p_target_user_id, v_after)
    ON CONFLICT (user_id) DO UPDATE SET balance = EXCLUDED.balance, updated_at = now();
  END IF;

  -- Audit log (admin action)
  INSERT INTO admin_balance_adjustments (
    admin_user_id, target_user_id, balance_type, operation, amount, reason, before_balance, after_balance
  ) VALUES (
    v_calling_user_id, p_target_user_id, p_balance_type, p_operation, p_amount, p_reason, v_before, v_after
  );

  RETURN json_build_object('ok', true, 'message', 'Balance adjusted successfully', 'before', v_before, 'after', v_after);
END;
$$;