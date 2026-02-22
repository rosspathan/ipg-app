
-- Atomic refund for failed withdrawals
-- Uses FOR UPDATE locking to prevent race conditions
CREATE OR REPLACE FUNCTION public.refund_failed_withdrawal(
  p_withdrawal_id uuid,
  p_reason text DEFAULT 'On-chain transfer failed'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wd record;
  v_asset_symbol text;
  v_balance record;
  v_new_available numeric;
BEGIN
  -- Lock the withdrawal row
  SELECT w.*, a.symbol AS asset_symbol, a.id AS asset_id_resolved
  INTO v_wd
  FROM public.withdrawals w
  JOIN public.assets a ON a.id = w.asset_id
  WHERE w.id = p_withdrawal_id
  FOR UPDATE OF w;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'withdrawal_not_found');
  END IF;

  -- Only refund if not already failed/completed
  IF v_wd.status NOT IN ('processing', 'pending', 'approved') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_status', 'current_status', v_wd.status);
  END IF;

  -- Lock the user's wallet balance row
  SELECT * INTO v_balance
  FROM public.wallet_balances
  WHERE user_id = v_wd.user_id
    AND asset_id = v_wd.asset_id_resolved
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'balance_row_not_found');
  END IF;

  -- Re-credit the net_amount back to available
  UPDATE public.wallet_balances
  SET available = available + v_wd.net_amount,
      updated_at = now()
  WHERE id = v_balance.id
  RETURNING available INTO v_new_available;

  -- Mark withdrawal as failed
  UPDATE public.withdrawals
  SET status = 'failed',
      rejected_reason = p_reason,
      updated_at = now()
  WHERE id = p_withdrawal_id;

  -- Create refund ledger entry
  INSERT INTO public.trading_balance_ledger (
    user_id,
    asset_symbol,
    delta_available,
    delta_locked,
    balance_available_after,
    balance_locked_after,
    entry_type,
    reference_type,
    reference_id,
    notes,
    created_at
  ) VALUES (
    v_wd.user_id,
    v_wd.asset_symbol,
    v_wd.net_amount,
    0,
    v_new_available,
    v_balance.locked,
    'REFUND',
    'withdrawal_refund',
    p_withdrawal_id::text,
    'Refund: ' || p_reason,
    now()
  );

  -- Log to security audit
  INSERT INTO public.security_audit_log (event_type, severity, details)
  VALUES (
    'WITHDRAWAL_REFUND',
    'warning',
    jsonb_build_object(
      'withdrawal_id', p_withdrawal_id,
      'user_id', v_wd.user_id,
      'amount', v_wd.net_amount,
      'symbol', v_wd.asset_symbol,
      'reason', p_reason
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'refunded_amount', v_wd.net_amount,
    'symbol', v_wd.asset_symbol,
    'new_available', v_new_available
  );
END;
$$;
