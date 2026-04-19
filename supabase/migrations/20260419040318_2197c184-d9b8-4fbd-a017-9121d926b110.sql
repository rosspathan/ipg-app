
-- ═══════════════════════════════════════════════════════════════
-- 1. Patch credit_custodial_deposit to ALSO update internal_balance_transfers
--    (the table the user's Transfer History reads from)
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.credit_custodial_deposit(p_deposit_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_dep public.custodial_deposits%ROWTYPE;
  v_symbol text;
  v_balance public.wallet_balances%ROWTYPE;
  v_new_available numeric;
  v_new_locked numeric;
  v_ibt_updated int := 0;
BEGIN
  -- Lock the deposit row to prevent double-credit under concurrency
  SELECT * INTO v_dep FROM public.custodial_deposits WHERE id = p_deposit_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'deposit_not_found');
  END IF;

  IF v_dep.status = 'credited' THEN
    -- Even when already credited, ensure the user-facing transfer row is in sync
    UPDATE public.internal_balance_transfers
    SET status = 'success',
        status_detail = 'Credited to trading balance',
        linked_deposit_id = v_dep.id,
        updated_at = now()
    WHERE tx_hash = v_dep.tx_hash
      AND user_id = v_dep.user_id
      AND direction = 'to_trading'
      AND status <> 'success';
    GET DIAGNOSTICS v_ibt_updated = ROW_COUNT;
    RETURN jsonb_build_object('success', true, 'status', 'already_credited', 'ibt_synced', v_ibt_updated);
  END IF;

  SELECT symbol INTO v_symbol FROM public.assets WHERE id = v_dep.asset_id;
  IF v_symbol IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'asset_not_found');
  END IF;

  -- Lock (or create) the wallet balance row
  SELECT * INTO v_balance FROM public.wallet_balances
  WHERE user_id = v_dep.user_id AND asset_id = v_dep.asset_id FOR UPDATE;

  IF FOUND THEN
    UPDATE public.wallet_balances
    SET available = available + v_dep.amount, updated_at = now()
    WHERE id = v_balance.id
    RETURNING available, locked INTO v_new_available, v_new_locked;
  ELSE
    INSERT INTO public.wallet_balances (user_id, asset_id, available, locked, created_at, updated_at)
    VALUES (v_dep.user_id, v_dep.asset_id, v_dep.amount, 0, now(), now())
    RETURNING available, locked INTO v_new_available, v_new_locked;
  END IF;

  -- Idempotent ledger entry
  INSERT INTO public.trading_balance_ledger (
    user_id, asset_symbol, delta_available, delta_locked,
    balance_available_after, balance_locked_after,
    entry_type, reference_type, reference_id, notes, created_at
  ) VALUES (
    v_dep.user_id, v_symbol, v_dep.amount, 0,
    v_new_available, v_new_locked,
    'DEPOSIT', 'custodial_deposit', v_dep.id,
    'Auto-credited from on-chain deposit', now()
  ) ON CONFLICT (reference_type, reference_id, entry_type, user_id) WHERE reference_id IS NOT NULL DO NOTHING;

  -- Mark deposit credited
  UPDATE public.custodial_deposits
  SET status = 'credited', credited_at = COALESCE(credited_at, now()), updated_at = now()
  WHERE id = v_dep.id;

  -- Best-effort: link to legacy trading_balance_transfers (existing logic)
  WITH candidate AS (
    SELECT id FROM public.trading_balance_transfers
    WHERE user_id = v_dep.user_id AND asset_id = v_dep.asset_id
      AND status = 'awaiting_deposit' AND tx_hash IS NULL AND amount = v_dep.amount
    ORDER BY created_at ASC LIMIT 1
  )
  UPDATE public.trading_balance_transfers t
  SET status = 'completed', tx_hash = v_dep.tx_hash, from_address = v_dep.from_address,
      completed_at = now(), updated_at = now()
  FROM candidate WHERE t.id = candidate.id;

  -- ★ NEW: sync the user-facing Transfer History row by tx_hash
  UPDATE public.internal_balance_transfers
  SET status = 'success',
      status_detail = 'Credited to trading balance',
      linked_deposit_id = v_dep.id,
      balance_after = v_new_available,
      updated_at = now()
  WHERE tx_hash = v_dep.tx_hash
    AND user_id = v_dep.user_id
    AND direction = 'to_trading'
    AND status <> 'success';
  GET DIAGNOSTICS v_ibt_updated = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true, 'status', 'credited',
    'user_id', v_dep.user_id, 'asset_symbol', v_symbol, 'amount', v_dep.amount,
    'balance_available_after', v_new_available, 'balance_locked_after', v_new_locked,
    'ibt_synced', v_ibt_updated
  );
END;
$function$;

-- ═══════════════════════════════════════════════════════════════
-- 2. Reconciler RPC: find every confirmed-but-uncredited deposit
--    and credit it. Idempotent.
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.reconcile_stuck_custodial_deposits(p_limit int DEFAULT 100)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_dep_id uuid;
  v_result jsonb;
  v_total_scanned int := 0;
  v_total_credited int := 0;
  v_total_already int := 0;
  v_total_failed int := 0;
  v_failures jsonb := '[]'::jsonb;
BEGIN
  FOR v_dep_id IN
    SELECT id FROM public.custodial_deposits
    WHERE status = 'confirmed' AND credited_at IS NULL
    ORDER BY created_at ASC
    LIMIT p_limit
  LOOP
    v_total_scanned := v_total_scanned + 1;
    BEGIN
      v_result := public.credit_custodial_deposit(v_dep_id);
      IF (v_result->>'success')::boolean THEN
        IF v_result->>'status' = 'credited' THEN
          v_total_credited := v_total_credited + 1;
        ELSIF v_result->>'status' = 'already_credited' THEN
          v_total_already := v_total_already + 1;
        END IF;
      ELSE
        v_total_failed := v_total_failed + 1;
        v_failures := v_failures || jsonb_build_object(
          'deposit_id', v_dep_id, 'error', v_result->>'error');
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_total_failed := v_total_failed + 1;
      v_failures := v_failures || jsonb_build_object(
        'deposit_id', v_dep_id, 'error', SQLERRM);
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'scanned', v_total_scanned,
    'credited', v_total_credited,
    'already_credited', v_total_already,
    'failed', v_total_failed,
    'failures', v_failures,
    'ran_at', now()
  );
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 3. ALSO sync internal_balance_transfers for any deposits already credited
--    (one-time backfill of historical drift)
-- ═══════════════════════════════════════════════════════════════
UPDATE public.internal_balance_transfers ibt
SET status = 'success',
    status_detail = 'Credited to trading balance',
    linked_deposit_id = cd.id,
    updated_at = now()
FROM public.custodial_deposits cd
WHERE ibt.tx_hash = cd.tx_hash
  AND ibt.user_id = cd.user_id
  AND ibt.direction = 'to_trading'
  AND ibt.status = 'pending'
  AND cd.status = 'credited';

-- ═══════════════════════════════════════════════════════════════
-- 4. Index for fast stuck-deposit lookups
-- ═══════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_custodial_deposits_stuck
ON public.custodial_deposits (created_at)
WHERE status = 'confirmed' AND credited_at IS NULL;

-- ═══════════════════════════════════════════════════════════════
-- 5. Run the reconciler immediately to credit the 9 known stuck deposits
-- ═══════════════════════════════════════════════════════════════
SELECT public.reconcile_stuck_custodial_deposits(200);
