

# Eliminating Historical Drift: Opening Balance Backfill Plan

## Current State (Facts from Database)

- **Ledger start date**: December 17, 2025 (first entry: WITHDRAWAL)
- **Total entries**: 5,556 across 104 users
- **Entry types tracked**: WITHDRAWAL, FILL_CREDIT, FILL_DEBIT, FEE_CREDIT, DEPOSIT, ORDER_LOCK, ORDER_CANCEL, RECONCILIATION
- **Opening balance entries**: **None exist** -- no OPENING_BALANCE, BACKFILL, or SNAPSHOT entries were ever created
- **First trade**: January 5, 2026
- **First deposit**: January 10, 2026

## Root Cause of All Drift

The `trading_balance_ledger` was introduced mid-lifecycle without snapshotting existing balances. Additionally, BSK balances are credited from multiple off-chain sources (`unified_bsk_ledger`: admin credits, badge bonuses, loan disbursals, referral bonuses, onchain migrations) that **never write to `trading_balance_ledger`**. This means `SUM(ledger deltas)` will never equal `actual balance` without intervention.

**Example -- Top drift user (banalasathish143143, BSK):**
- Trading ledger sum: -9,139 BSK (net seller)
- Actual balance: 15,386 BSK
- Drift: +24,526 BSK
- Explanation: +32,000 admin_credit, +25,000 loan_disbursal, +5,000 badge_bonus via `unified_bsk_ledger` (none recorded in trading ledger)

## The Fix: Two-Phase Approach

### Phase 1: One-Time Opening Balance Snapshot (Database Migration)

Create a SQL migration that:

1. For every user-asset pair in `wallet_balances`, calculates the **gap** between actual balance and existing ledger sum
2. Inserts an `OPENING_BALANCE` entry into `trading_balance_ledger` with:
   - `entry_type = 'OPENING_BALANCE'`
   - `delta_available = (actual_available - ledger_sum_available)`
   - `delta_locked = (actual_locked - ledger_sum_locked)`
   - `reference_type = 'SYSTEM_BACKFILL'`
   - `notes = 'Historical balance snapshot at ledger introduction'`
   - `created_at` backdated to `2025-12-17` (ledger start)

This makes `SUM(all ledger deltas) = current balance` for every user, eliminating all drift instantly.

**SQL approach:**
```sql
INSERT INTO trading_balance_ledger (user_id, asset_symbol, entry_type, delta_available, delta_locked, reference_type, reference_id, notes, created_at)
SELECT
  wb.user_id,
  a.symbol,
  'OPENING_BALANCE',
  (wb.available - COALESCE(ls.sum_avail, 0)),
  (wb.locked - COALESCE(ls.sum_locked, 0)),
  'SYSTEM_BACKFILL',
  gen_random_uuid()::text,
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
```

### Phase 2: Bridge BSK Off-Chain Credits to Trading Ledger

Create a trigger or edge function so that future `unified_bsk_ledger` entries (admin credits, badge bonuses, referral rewards, loan disbursals) also write a corresponding `EXTERNAL_CREDIT` or `EXTERNAL_DEBIT` entry to `trading_balance_ledger`. This prevents new drift from accumulating.

### Phase 3: Update Reconciliation UI

- Show `OPENING_BALANCE` entries distinctly in the audit trail (tagged as "Historical Snapshot")
- After backfill, drift column should show 0.00 for all users
- Add a "Ledger Coverage" indicator: percentage of balance explained by ledger entries
- Add warning if any new drift appears post-backfill (indicates a missing integration)

## Files to Modify

| File | Change |
|------|--------|
| New SQL migration | Insert OPENING_BALANCE entries for all user-asset pairs |
| New SQL migration | Add trigger on `unified_bsk_ledger` to mirror entries to `trading_balance_ledger` |
| `src/hooks/useAdminReconciliationReport.ts` | Recognize OPENING_BALANCE entry type in aggregation |
| `src/pages/admin/AdminTradingReconciliation.tsx` | Display OPENING_BALANCE entries distinctly; show post-backfill drift as critical alerts |

## Expected Outcome

- All existing drift drops to exactly 0.00
- Future BSK credits from off-chain systems are automatically tracked
- Any new drift appearing post-backfill is a genuine bug indicator, not historical noise
- Full audit trail preserved -- the snapshot entries are clearly labeled and timestamped

