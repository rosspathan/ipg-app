CREATE OR REPLACE FUNCTION public.refund_failed_withdrawal(p_withdrawal_id uuid, p_reason text DEFAULT 'On-chain transfer failed'::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_wd record;
  v_balance record;
  v_new_available numeric;
BEGIN
  SELECT w.*, a.symbol AS asset_symbol, a.id AS asset_id_resolved
  INTO v_wd
  FROM public.withdrawals w
  JOIN public.assets a ON a.id = w.asset_id
  WHERE w.id = p_withdrawal_id
  FOR UPDATE OF w;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'withdrawal_not_found');
  END IF;

  IF v_wd.status NOT IN ('processing', 'pending', 'approved') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_status', 'current_status', v_wd.status);
  END IF;

  SELECT * INTO v_balance
  FROM public.wallet_balances
  WHERE user_id = v_wd.user_id
    AND asset_id = v_wd.asset_id_resolved
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'balance_row_not_found');
  END IF;

  UPDATE public.wallet_balances
  SET available = available + v_wd.net_amount,
      updated_at = now()
  WHERE id = v_balance.id
  RETURNING available INTO v_new_available;

  UPDATE public.withdrawals
  SET status = 'failed',
      rejected_reason = p_reason,
      updated_at = now()
  WHERE id = p_withdrawal_id;

  INSERT INTO public.trading_balance_ledger (
    user_id, asset_symbol, delta_available, delta_locked,
    balance_available_after, balance_locked_after,
    entry_type, reference_type, reference_id, notes, created_at
  ) VALUES (
    v_wd.user_id, v_wd.asset_symbol, v_wd.net_amount, 0,
    v_new_available, v_balance.locked,
    'REFUND', 'withdrawal_refund', p_withdrawal_id,
    'Refund: ' || p_reason, now()
  );

  INSERT INTO public.security_audit_log (event_type, user_id, event_data)
  VALUES (
    'WITHDRAWAL_REFUND',
    v_wd.user_id,
    jsonb_build_object(
      'withdrawal_id', p_withdrawal_id,
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
$function$;