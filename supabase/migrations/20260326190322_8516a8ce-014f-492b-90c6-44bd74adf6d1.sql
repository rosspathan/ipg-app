
-- PHANTOM LEDGER CORRECTIONS: Users with ledger entries but no wallet_balance row
-- These users had their funds but withdrew/transferred before the ledger era.
-- The wallet_balances (source of truth) shows zero, so ledger must be zeroed.

-- USDT: user d3c0d45f - 55.45 USDT phantom (backfilled trade credits, but user already withdrew)
INSERT INTO trading_balance_ledger (user_id, asset_symbol, delta_available, delta_locked, balance_available_after, balance_locked_after, entry_type, reference_type, notes, created_at)
VALUES
  ('d3c0d45f-a83f-48c3-8669-bc3af94e75b6', 'USDT', -55.45230520, 0, 0, 0, 'ADJUSTMENT', 'RECONCILIATION', 'Phantom ledger correction: user has backfilled trade credits but no wallet_balance row (funds already withdrawn pre-ledger)', now());

-- IPG phantom corrections (3 users with positive ledger, no wallet row)
INSERT INTO trading_balance_ledger (user_id, asset_symbol, delta_available, delta_locked, balance_available_after, balance_locked_after, entry_type, reference_type, notes, created_at)
VALUES
  ('77135c18-a8e3-4c9e-9762-c4599b47352f', 'IPG', -0.27512300, 0, 0, 0, 'ADJUSTMENT', 'RECONCILIATION', 'Phantom ledger correction: no wallet_balance row', now()),
  ('b540081e-990f-442d-8257-b52d0ca8b36a', 'IPG', -0.05818200, 0, 0, 0, 'ADJUSTMENT', 'RECONCILIATION', 'Phantom ledger correction: no wallet_balance row', now()),
  ('0ec40340-744d-4811-b386-f9486508c267', 'IPG', -0.00800000, 0, 0, 0, 'ADJUSTMENT', 'RECONCILIATION', 'Phantom ledger correction: no wallet_balance row', now()),
  ('d3c0d45f-a83f-48c3-8669-bc3af94e75b6', 'IPG', 0.05100000, 0, 0, 0, 'ADJUSTMENT', 'RECONCILIATION', 'Phantom ledger correction: negative ledger, no wallet_balance row', now());
