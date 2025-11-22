-- Fix admin_adjust_user_balance to use unified_bsk_ledger via record_bsk_transaction
-- This ensures all admin operations are properly tracked and don't get reverted by sync

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
  v_tx_type TEXT;
  v_tx_subtype TEXT;
  v_transaction_id UUID;
  v_idempotency_key TEXT;
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

  -- BSK handling: Use record_bsk_transaction for proper ledger tracking
  IF p_balance_type = 'bsk' THEN
    IF p_subtype NOT IN ('withdrawable', 'holding') THEN
      RETURN json_build_object('ok', false, 'message', 'Invalid BSK subtype. Use "withdrawable" or "holding"');
    END IF;

    -- Calculate before balance from ledger
    SELECT COALESCE(SUM(
      CASE 
        WHEN tx_type = 'credit' THEN amount_bsk
        WHEN tx_type = 'debit' THEN -amount_bsk
      END
    ), 0) INTO v_before
    FROM unified_bsk_ledger
    WHERE user_id = p_target_user_id AND balance_type = p_subtype;

    -- Map operation to tx_type
    IF p_operation = 'add' THEN
      v_tx_type := 'credit';
      v_tx_subtype := 'admin_credit';
      v_after := v_before + p_amount;
    ELSE
      v_tx_type := 'debit';
      v_tx_subtype := 'admin_debit';
      
      -- Check sufficient balance for deductions
      IF v_before < p_amount THEN
        RETURN json_build_object(
          'ok', false, 
          'message', 'Insufficient BSK balance. Available: ' || v_before || ', Requested: ' || p_amount
        );
      END IF;
      
      v_after := v_before - p_amount;
    END IF;

    -- Generate unique idempotency key
    v_idempotency_key := 'admin_adj:' || v_calling_user_id || ':' || p_target_user_id || ':' || extract(epoch from now()) || ':' || gen_random_uuid();

    -- Record transaction in ledger
    BEGIN
      v_transaction_id := record_bsk_transaction(
        p_user_id := p_target_user_id,
        p_idempotency_key := v_idempotency_key,
        p_tx_type := v_tx_type,
        p_tx_subtype := v_tx_subtype,
        p_balance_type := p_subtype,
        p_amount_bsk := p_amount,
        p_notes := p_reason,
        p_meta_json := jsonb_build_object(
          'admin_user_id', v_calling_user_id,
          'operation', p_operation,
          'reason', p_reason
        )
      );
    EXCEPTION
      WHEN OTHERS THEN
        RETURN json_build_object('ok', false, 'message', 'Failed to record transaction: ' || SQLERRM);
    END;

    -- Refresh materialized view and sync to user_bsk_balances
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_bsk_balances;
    
    INSERT INTO user_bsk_balances (
      user_id, withdrawable_balance, holding_balance,
      total_earned_withdrawable, total_earned_holding, updated_at
    )
    SELECT 
      user_id, withdrawable_balance, holding_balance,
      total_earned_withdrawable, total_earned_holding, now()
    FROM mv_user_bsk_balances
    WHERE user_id = p_target_user_id
    ON CONFLICT (user_id) DO UPDATE SET
      withdrawable_balance = EXCLUDED.withdrawable_balance,
      holding_balance = EXCLUDED.holding_balance,
      total_earned_withdrawable = EXCLUDED.total_earned_withdrawable,
      total_earned_holding = EXCLUDED.total_earned_holding,
      updated_at = now();

  -- INR handling: Keep existing direct update logic
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

  -- Log the adjustment for audit trail
  INSERT INTO admin_balance_adjustments (
    admin_user_id, target_user_id, balance_type, operation, amount, reason, before_balance, after_balance
  ) VALUES (
    v_calling_user_id, p_target_user_id, p_balance_type, p_operation, p_amount, p_reason, v_before, v_after
  );

  RETURN json_build_object('ok', true, 'message', 'Balance adjusted successfully', 'before', v_before, 'after', v_after);
END;
$$;

COMMENT ON FUNCTION public.admin_adjust_user_balance IS 'Admin-only RPC to adjust user BSK (via ledger) or INR balances atomically with full audit trail. BSK operations use record_bsk_transaction to prevent data drift.';