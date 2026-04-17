-- ============================================================
-- BSK ONCHAIN MIGRATION — HARDENING (forensic audit fixes)
-- ============================================================

-- 1) Atomic-claim function for admin approval.
--    Returns true exactly once for any migration_id; subsequent
--    or concurrent calls return false. Eliminates double-approval race.
CREATE OR REPLACE FUNCTION public.claim_bsk_migration_for_approval(
  p_migration_id uuid,
  p_admin_id uuid,
  p_admin_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.bsk_onchain_migrations;
BEGIN
  -- Conditional UPDATE: only succeeds if status is still pending_admin_approval.
  -- Postgres takes a row-level lock for UPDATE, so concurrent claims serialize.
  UPDATE public.bsk_onchain_migrations
     SET status = 'approved_executing',
         approved_by = p_admin_id,
         approved_at = now(),
         admin_approval_note = NULLIF(BTRIM(p_admin_note), '')
   WHERE id = p_migration_id
     AND status = 'pending_admin_approval'
   RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    -- Either not found or already claimed by another admin/tab.
    RETURN jsonb_build_object('claimed', false);
  END IF;

  RETURN jsonb_build_object(
    'claimed', true,
    'migration', to_jsonb(v_row)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_bsk_migration_for_approval(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_bsk_migration_for_approval(uuid, uuid, text) TO service_role;

-- 2) Atomic-claim function for admin rejection (same race protection).
CREATE OR REPLACE FUNCTION public.claim_bsk_migration_for_rejection(
  p_migration_id uuid,
  p_admin_id uuid,
  p_rejection_reason text,
  p_admin_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.bsk_onchain_migrations;
BEGIN
  IF p_rejection_reason IS NULL OR BTRIM(p_rejection_reason) = '' THEN
    RAISE EXCEPTION 'Rejection reason is mandatory';
  END IF;

  UPDATE public.bsk_onchain_migrations
     SET status = 'rejected',
         rejected_by = p_admin_id,
         rejected_at = now(),
         rejection_reason = BTRIM(p_rejection_reason),
         admin_approval_note = NULLIF(BTRIM(p_admin_note), ''),
         admin_notes = 'Rejected by admin: ' || BTRIM(p_rejection_reason)
   WHERE id = p_migration_id
     AND status = 'pending_admin_approval'
   RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RETURN jsonb_build_object('claimed', false);
  END IF;

  RETURN jsonb_build_object(
    'claimed', true,
    'migration', to_jsonb(v_row)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_bsk_migration_for_rejection(uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_bsk_migration_for_rejection(uuid, uuid, text, text) TO service_role;

-- 3) Reconcile a stuck migration (status confirming/broadcasting) when the
--    on-chain transaction is already mined. Edge function will call this
--    after verifying tx_hash on BscScan.
CREATE OR REPLACE FUNCTION public.complete_stuck_bsk_migration(
  p_migration_id uuid,
  p_block_number bigint,
  p_gas_used bigint,
  p_actual_gas_cost_bnb numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.bsk_onchain_migrations;
  v_net numeric;
BEGIN
  UPDATE public.bsk_onchain_migrations
     SET status = 'completed',
         block_number = p_block_number,
         gas_used = p_gas_used,
         actual_gas_cost_bnb = p_actual_gas_cost_bnb,
         confirmations = COALESCE(confirmations, 0) + 1,
         net_amount_migrated = COALESCE(net_amount_migrated, 0)
                               + CASE WHEN COALESCE(net_amount_migrated, 0) = 0
                                      THEN amount_requested - COALESCE(gas_deduction_bsk,0) - COALESCE(migration_fee_bsk,0)
                                      ELSE 0 END,
         confirmed_at = COALESCE(confirmed_at, now()),
         completed_at = COALESCE(completed_at, now()),
         error_message = NULL,
         failed_at = NULL
   WHERE id = p_migration_id
     AND status IN ('confirming', 'broadcasting', 'approved_executing')
     AND tx_hash IS NOT NULL
     AND debited_at IS NOT NULL
   RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RETURN jsonb_build_object('reconciled', false, 'reason', 'not_in_reconcilable_state');
  END IF;

  RETURN jsonb_build_object('reconciled', true, 'migration_id', v_row.id);
END;
$$;

REVOKE ALL ON FUNCTION public.complete_stuck_bsk_migration(uuid, bigint, bigint, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_stuck_bsk_migration(uuid, bigint, bigint, numeric) TO service_role;

-- 4) Manual reconciliation of the historical stuck migration
--    (id b342ebf6-4642-4a13-bf15-ee050e0a5b81 — verified on-chain in block 79247937,
--     status 0x1, gas_used 52218, debited at 2026-02-04, tx_hash
--     0xe70ba5e725c212bc8a6ec17350f387cb59d1c9d3292f7dfe68b3255690083fb2).
SELECT public.complete_stuck_bsk_migration(
  'b342ebf6-4642-4a13-bf15-ee050e0a5b81'::uuid,
  79247937::bigint,
  52218::bigint,
  0.00015666::numeric
);

-- Also close its parent batch
UPDATE public.bsk_onchain_migration_batches b
   SET status = 'completed',
       completed_at = COALESCE(b.completed_at, now()),
       successful_users = 1,
       processed_users = 1
 WHERE b.id = (SELECT batch_id FROM public.bsk_onchain_migrations
               WHERE id = 'b342ebf6-4642-4a13-bf15-ee050e0a5b81');

-- 5) Helper view: stuck migrations the admin/cron should reconcile.
CREATE OR REPLACE VIEW public.bsk_migrations_stuck_view AS
SELECT id, user_id, wallet_address, amount_requested, net_amount_migrated,
       status, tx_hash, debited_at, broadcasted_at, created_at,
       EXTRACT(epoch FROM (now() - created_at))/60 AS minutes_old
  FROM public.bsk_onchain_migrations
 WHERE status IN ('approved_executing', 'broadcasting', 'confirming')
   AND created_at < now() - interval '10 minutes';

GRANT SELECT ON public.bsk_migrations_stuck_view TO authenticated;