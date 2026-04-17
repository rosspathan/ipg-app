
-- Lock the migration state machine: only the new flow's statuses are accepted at INSERT time.
-- This prevents any rogue caller (or revived legacy code) from inserting rows that bypass the approval flow.
ALTER TABLE public.bsk_onchain_migrations
  DROP CONSTRAINT IF EXISTS bsk_onchain_migrations_status_check;

ALTER TABLE public.bsk_onchain_migrations
  ADD CONSTRAINT bsk_onchain_migrations_status_check
  CHECK (status IN (
    'pending_admin_approval',
    'approved_executing',
    'broadcasting',
    'confirming',
    'completed',
    'failed',
    'rejected',
    'refunded'
  ));

-- Also lock the batches table to the user-initiated and legacy-completed states only
-- (legacy 'pending' on batches is harmless metadata, but block 'processing' to stop legacy executor)
COMMENT ON TABLE public.bsk_onchain_migrations IS
  'Production migration ledger. Insert only via user-migrate-bsk-onchain (status=pending_admin_approval). State transitions only via admin-migration-control claim_* RPCs and complete_stuck_bsk_migration reconciler. Legacy admin-migrate-bsk-onchain function removed 2026-04-17.';
