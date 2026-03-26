
-- ═══════════════════════════════════════════════════════════════
-- 1. Update execute_withdrawal_request to write WITHDRAWAL_QUEUED ledger entry
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.execute_withdrawal_request(
  p_user_id UUID,
  p_asset_id UUID,
  p_amount NUMERIC,
  p_fee NUMERIC,
  p_to_address TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance RECORD;
  v_total_required NUMERIC;
  v_new_available NUMERIC;
  v_withdrawal_id UUID;
  v_asset_symbol TEXT;
BEGIN
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be positive');
  END IF;

  p_amount := ROUND(p_amount, 8);
  p_fee := ROUND(COALESCE(p_fee, 0), 8);
  v_total_required := p_amount + p_fee;

  SELECT symbol INTO v_asset_symbol FROM assets WHERE id = p_asset_id;
  IF v_asset_symbol IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Asset not found');
  END IF;

  SELECT id, available, locked
    INTO v_balance
    FROM wallet_balances
   WHERE user_id = p_user_id AND asset_id = p_asset_id
     FOR UPDATE;

  IF v_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No trading balance found');
  END IF;

  IF v_balance.available < v_total_required THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Insufficient balance. Available: %s, Required: %s (includes %s fee)',
                      ROUND(v_balance.available, 8), v_total_required, p_fee)
    );
  END IF;

  v_new_available := ROUND(v_balance.available - v_total_required, 8);
  UPDATE wallet_balances
     SET available = v_new_available,
         updated_at = now()
   WHERE id = v_balance.id;

  INSERT INTO custodial_withdrawals (user_id, asset_id, amount, to_address, fee_amount, status)
  VALUES (p_user_id, p_asset_id, p_amount, p_to_address, p_fee, 'pending')
  RETURNING id INTO v_withdrawal_id;

  INSERT INTO trading_balance_ledger (
    user_id, asset_symbol, delta_available, delta_locked,
    balance_available_after, balance_locked_after,
    entry_type, reference_type, reference_id, notes
  ) VALUES (
    p_user_id, v_asset_symbol, -(v_total_required), 0,
    v_new_available, v_balance.locked,
    'WITHDRAWAL_QUEUED', 'custodial_withdrawal', v_withdrawal_id::text,
    format('Withdrawal queued: %s %s to %s (fee: %s)', p_amount, v_asset_symbol, p_to_address, p_fee)
  );

  RETURN jsonb_build_object(
    'success', true,
    'withdrawal_id', v_withdrawal_id,
    'amount', p_amount,
    'fee', p_fee,
    'new_available', v_new_available
  );
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 2. Disable legacy process-pending-withdrawals cron (Job #2)
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN PERFORM cron.unschedule('process-pending-withdrawals'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
