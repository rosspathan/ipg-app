-- Phase 1: Insert OPENING_BALANCE entries for all user-asset pairs
-- balance_available_after = current available, balance_locked_after = current locked
-- because this snapshot represents the state at ledger introduction

INSERT INTO trading_balance_ledger (user_id, asset_symbol, entry_type, delta_available, delta_locked, balance_available_after, balance_locked_after, reference_type, reference_id, notes, created_at)
SELECT
  wb.user_id,
  a.symbol,
  'OPENING_BALANCE',
  (wb.available - COALESCE(ls.sum_avail, 0)),
  (wb.locked - COALESCE(ls.sum_locked, 0)),
  wb.available,
  wb.locked,
  'SYSTEM_BACKFILL',
  gen_random_uuid(),
  'Historical balance snapshot - backfill to eliminate drift',
  '2025-12-17T00:00:00Z'
FROM wallet_balances wb
JOIN assets a ON a.id = wb.asset_id
LEFT JOIN (
  SELECT user_id, asset_symbol,
    SUM(delta_available) as sum_avail,
    SUM(delta_locked) as sum_locked
  FROM trading_balance_ledger
  GROUP BY user_id, asset_symbol
) ls ON ls.user_id = wb.user_id AND ls.asset_symbol = a.symbol
WHERE (wb.available + wb.locked) > 0.00001
  OR COALESCE(ls.sum_avail, 0) + COALESCE(ls.sum_locked, 0) != 0;