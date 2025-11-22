-- Document decision: Skip historical admin adjustment backfill
-- The admin_adjust_user_balance function has been fixed to use unified_bsk_ledger
-- Historical adjustments from admin_balance_adjustments are NOT backfilled due to:
-- 1. Some adjustments reference deleted users (foreign key violations)
-- 2. Some adjustments would create negative balances (check constraint violations)
-- 
-- Going forward, all admin BSK operations will correctly flow through the ledger
-- and will NOT be reverted by periodic syncs. The bug is fixed.

DO $$
BEGIN
  RAISE NOTICE 'Admin adjustment backfill skipped to avoid data inconsistencies';
  RAISE NOTICE 'All future admin operations will use unified_bsk_ledger correctly';
END $$;