
-- ============================================================================
-- 1) Atomic refund RPC (ledger-first) for FAILED custodial withdrawals
-- ============================================================================
CREATE OR REPLACE FUNCTION public.refund_custodial_withdrawal(
  p_withdrawal_id uuid,
  p_reason text DEFAULT 'On-chain transfer failed'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_wd RECORD;
  v_asset RECORD;
  v_balance RECORD;
  v_refund_amount NUMERIC;
  v_new_available NUMERIC;
BEGIN
  -- Lock the withdrawal row
  SELECT * INTO v_wd FROM custodial_withdrawals
  WHERE id = p_withdrawal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'withdrawal_not_found');
  END IF;

  -- Idempotency: if already refunded, no-op
  IF EXISTS (
    SELECT 1 FROM trading_balance_ledger
    WHERE reference_id = p_withdrawal_id
      AND entry_type = 'REFUND'
      AND user_id = v_wd.user_id
  ) THEN
    RETURN jsonb_build_object('success', true, 'status', 'already_refunded');
  END IF;

  SELECT id, symbol INTO v_asset FROM assets WHERE id = v_wd.asset_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'asset_not_found');
  END IF;

  v_refund_amount := ROUND(v_wd.amount + COALESCE(v_wd.fee_amount, 0), 8);

  -- Lock balance row (or create if missing)
  SELECT id, available, locked INTO v_balance
  FROM wallet_balances
  WHERE user_id = v_wd.user_id AND asset_id = v_wd.asset_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO wallet_balances (user_id, asset_id, available, locked)
    VALUES (v_wd.user_id, v_wd.asset_id, v_refund_amount, 0)
    RETURNING id, available, locked INTO v_balance;
    v_new_available := v_refund_amount;
  ELSE
    v_new_available := ROUND(v_balance.available + v_refund_amount, 8);
    UPDATE wallet_balances
    SET available = v_new_available, updated_at = now()
    WHERE id = v_balance.id;
  END IF;

  -- Mark withdrawal failed
  UPDATE custodial_withdrawals
  SET status = 'failed',
      error_message = p_reason,
      updated_at = now()
  WHERE id = p_withdrawal_id;

  -- Ledger-first audit row
  INSERT INTO trading_balance_ledger (
    user_id, asset_symbol, delta_available, delta_locked,
    balance_available_after, balance_locked_after,
    entry_type, reference_type, reference_id, notes, created_at
  ) VALUES (
    v_wd.user_id, v_asset.symbol, v_refund_amount, 0,
    v_new_available, COALESCE(v_balance.locked, 0),
    'REFUND', 'custodial_withdrawal', p_withdrawal_id,
    format('Refund for failed withdrawal: %s', p_reason),
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'refunded', v_refund_amount,
    'symbol', v_asset.symbol,
    'new_available', v_new_available
  );
END;
$$;

-- ============================================================================
-- 2) Atomic settle RPC (ledger-first) for COMPLETED custodial withdrawals
--    No balance change (already debited at queue) — just finalises the audit
-- ============================================================================
CREATE OR REPLACE FUNCTION public.settle_custodial_withdrawal(
  p_withdrawal_id uuid,
  p_tx_hash text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_wd RECORD;
  v_asset RECORD;
  v_balance RECORD;
  v_settle_amount NUMERIC;
BEGIN
  SELECT * INTO v_wd FROM custodial_withdrawals
  WHERE id = p_withdrawal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'withdrawal_not_found');
  END IF;

  -- Idempotency: skip if already settled in ledger
  IF EXISTS (
    SELECT 1 FROM trading_balance_ledger
    WHERE reference_id = p_withdrawal_id
      AND entry_type = 'WITHDRAWAL'
      AND user_id = v_wd.user_id
  ) THEN
    -- ensure tx_hash is set even if ledger already exists
    UPDATE custodial_withdrawals
    SET tx_hash = COALESCE(tx_hash, p_tx_hash),
        status = 'completed',
        completed_at = COALESCE(completed_at, now()),
        updated_at = now()
    WHERE id = p_withdrawal_id;
    RETURN jsonb_build_object('success', true, 'status', 'already_settled');
  END IF;

  SELECT id, symbol INTO v_asset FROM assets WHERE id = v_wd.asset_id;

  v_settle_amount := ROUND(v_wd.amount + COALESCE(v_wd.fee_amount, 0), 8);

  -- Read current balance for the audit snapshot (no mutation)
  SELECT id, available, locked INTO v_balance
  FROM wallet_balances
  WHERE user_id = v_wd.user_id AND asset_id = v_wd.asset_id;

  UPDATE custodial_withdrawals
  SET status = 'completed',
      tx_hash = p_tx_hash,
      completed_at = now(),
      updated_at = now()
  WHERE id = p_withdrawal_id;

  -- Settle ledger row: delta=0 because queue already debited
  INSERT INTO trading_balance_ledger (
    user_id, asset_symbol, delta_available, delta_locked,
    balance_available_after, balance_locked_after,
    entry_type, reference_type, reference_id, notes, created_at
  ) VALUES (
    v_wd.user_id, v_asset.symbol, 0, 0,
    COALESCE(v_balance.available, 0), COALESCE(v_balance.locked, 0),
    'WITHDRAWAL', 'custodial_withdrawal', p_withdrawal_id,
    format('Withdrawal settled on-chain: tx %s, amount %s %s', p_tx_hash, v_settle_amount, v_asset.symbol),
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'settled', v_settle_amount,
    'symbol', v_asset.symbol,
    'tx_hash', p_tx_hash
  );
END;
$$;

-- ============================================================================
-- 3) Backfill missing ledger rows for historical custodial withdrawals
-- ============================================================================
DO $$
DECLARE
  v_wd RECORD;
  v_asset RECORD;
  v_balance RECORD;
  v_amount NUMERIC;
  v_count INT := 0;
BEGIN
  FOR v_wd IN
    SELECT cw.* FROM custodial_withdrawals cw
    WHERE cw.status IN ('completed','failed')
      AND NOT EXISTS (
        SELECT 1 FROM trading_balance_ledger l
        WHERE l.reference_id = cw.id
          AND l.user_id = cw.user_id
          AND l.entry_type IN ('WITHDRAWAL','REFUND')
      )
    ORDER BY cw.created_at ASC
  LOOP
    SELECT id, symbol INTO v_asset FROM assets WHERE id = v_wd.asset_id;
    IF NOT FOUND THEN CONTINUE; END IF;

    SELECT available, locked INTO v_balance FROM wallet_balances
    WHERE user_id = v_wd.user_id AND asset_id = v_wd.asset_id;

    v_amount := ROUND(v_wd.amount + COALESCE(v_wd.fee_amount, 0), 8);

    IF v_wd.status = 'completed' THEN
      INSERT INTO trading_balance_ledger (
        user_id, asset_symbol, delta_available, delta_locked,
        balance_available_after, balance_locked_after,
        entry_type, reference_type, reference_id, notes, created_at
      ) VALUES (
        v_wd.user_id, v_asset.symbol, 0, 0,
        COALESCE(v_balance.available, 0), COALESCE(v_balance.locked, 0),
        'WITHDRAWAL', 'custodial_withdrawal', v_wd.id,
        format('[BACKFILL] Settled on-chain: tx %s, amount %s %s', COALESCE(v_wd.tx_hash, 'unknown'), v_amount, v_asset.symbol),
        COALESCE(v_wd.completed_at, v_wd.updated_at, v_wd.created_at)
      );
    ELSIF v_wd.status = 'failed' THEN
      INSERT INTO trading_balance_ledger (
        user_id, asset_symbol, delta_available, delta_locked,
        balance_available_after, balance_locked_after,
        entry_type, reference_type, reference_id, notes, created_at
      ) VALUES (
        v_wd.user_id, v_asset.symbol, v_amount, 0,
        COALESCE(v_balance.available, 0), COALESCE(v_balance.locked, 0),
        'REFUND', 'custodial_withdrawal', v_wd.id,
        format('[BACKFILL] Refund for failed withdrawal: %s', COALESCE(v_wd.error_message, 'unknown error')),
        COALESCE(v_wd.updated_at, v_wd.created_at)
      );
    END IF;
    v_count := v_count + 1;
  END LOOP;
  RAISE NOTICE 'Backfilled % ledger rows', v_count;
END $$;
