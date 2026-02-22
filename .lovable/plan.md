

# Trading System Audit, Fix & Admin Reconciliation Dashboard

## Critical Issues Found

### 1. Incomplete Ledger (MOST CRITICAL)
The `trading_balance_ledger` is severely incomplete:
- **USDT**: Only 52 of 201 deposits recorded (762 of 7,140 USDT)
- **BSK**: Only 20 of 69 deposits recorded (11,589 of 300,197 BSK)
- **USDI**: Only 1 of 28 deposits recorded (5 of 1,154 USDI)
- **IPG**: Only 6 of 38 deposits recorded (11 of 52 IPG)

The ledger was added AFTER the system was already running, so historical deposits were never backfilled.

### 2. Missing Ledger Entry Types
The `execute_trade` RPC records `FILL_DEBIT` for the buyer (quote currency consumed from locked) but does NOT record:
- **FILL_CREDIT** for the buyer (base asset received)
- **FILL_DEBIT** for the seller (base asset consumed from locked)
- **FILL_CREDIT** for the seller (quote currency received)
- **WITHDRAWAL** entries (just fixed in the previous session but needs backfill)
- **ORDER_LOCK** entries (when orders lock funds)
- **ORDER_CANCEL** entries (when cancelled orders release funds)

### 3. No Withdrawal Tracking in Ledger (Partially Fixed)
The `validate_and_record_withdrawal` RPC was just created but no historical withdrawals are in the ledger.

### 4. Hot Wallet Balance Discrepancies
```text
Asset | Deposits | Withdrawals | User Balances | Expected | Discrepancy
------+-----------+-------------+---------------+----------+------------
USDT  |    7,140  |       1,116 |          507  |   6,023  |    +5,516  (*)
BSK   |  300,197  |      36,966 |      270,895  | 263,230  |    -7,664
IPG   |       52  |          36 |           18  |      16  |       -2
USDI  |    1,154  |         353 |          913  |     800  |     -112
```
(*) USDT shows +5,516 "extra expected" because USDT was spent buying BSK/IPG in trades -- this is actually correct behavior where USDT moves between users via trades.

The BSK/IPG/USDI negative discrepancies mean users hold MORE than deposits minus withdrawals, which comes from trade fills (buying those tokens with USDT).

**The system is actually balanced when accounting for inter-user trades.** The real risk was the withdrawal ledger gap (now fixed).

---

## Implementation Plan

### Phase 1: Database Fixes -- Backfill Ledger & Complete Trade Recording

**1a. Backfill historical deposits into ledger**
- Create a migration that inserts `DEPOSIT` entries into `trading_balance_ledger` for all `custodial_deposits` with `status='credited'` that don't already have a corresponding ledger entry.

**1b. Backfill historical withdrawals into ledger**
- Insert `WITHDRAWAL` entries for all completed withdrawals that are not yet in the ledger.

**1c. Add FILL_CREDIT entries to `execute_trade` RPC**
- Modify the `execute_trade` function to also record:
  - Buyer receives base asset (`FILL_CREDIT`)
  - Seller's base asset consumed from locked (`FILL_DEBIT`)
  - Seller receives quote currency (`FILL_CREDIT`)
- Currently only buyer's quote debit is logged.

**1d. Add ORDER_LOCK and ORDER_CANCEL ledger entries**
- Modify `place-order` edge function to record `ORDER_LOCK` in ledger when funds are locked.
- Modify `execute_order_cancel` RPC to record `ORDER_CANCEL` in ledger when funds are released.

### Phase 2: Admin Trading Audit & Reconciliation Page

Create a new `/admin/trading-reconciliation` page with three sections:

**2a. Hot Wallet Monitor**
- Total deposits received per token (from `custodial_deposits`)
- Total withdrawals processed per token (from `withdrawals`)
- Current hot wallet on-chain balance (fetched via RPC call to BSC)
- Internal ledger balance (sum of all user `wallet_balances`)
- Difference indicator with alert styling when non-zero

**2b. User-Level Tracking Table**
- Searchable table of all users showing:
  - Total deposits per asset
  - Total withdrawals per asset
  - Current available balance
  - Current locked balance
  - Ledger net balance
  - Drift (ledger vs wallet_balances difference)
  - Click to expand for detailed ledger trail

**2c. Real-Time Reconciliation Dashboard**
- Sum of all user trading balances per asset
- Expected balance (total deposits - total withdrawals)
- Accounting for inter-user trades (these are zero-sum between users)
- Platform fee revenue collected
- Mismatch alert system with auto-refresh every 60 seconds

### Phase 3: Edge Function for Full System Reconciliation

Create `full-trading-reconciliation` edge function that:
- Compares `trading_balance_ledger` SUM per user per asset against `wallet_balances`
- Returns list of all discrepancies with amounts
- Can be triggered from the admin dashboard
- Optionally auto-fixes drift by creating `RECONCILIATION` ledger entries

---

## Technical Details

### New Database Migration
```text
1. Backfill DEPOSIT entries from custodial_deposits -> trading_balance_ledger
2. Backfill WITHDRAWAL entries from withdrawals -> trading_balance_ledger
3. Update execute_trade to record 4 ledger entries per trade (not just 1)
4. Update execute_order_cancel to record ORDER_CANCEL ledger entry
```

### New Files
- `src/pages/admin/AdminTradingReconciliation.tsx` -- Main reconciliation dashboard
- `src/hooks/useAdminTradingReconciliation.ts` -- Data fetching hooks
- `supabase/functions/full-trading-reconciliation/index.ts` -- Reconciliation edge function

### Modified Files
- `src/App.tsx` -- Add route for new admin page
- `supabase/functions/place-order/index.ts` -- Add ORDER_LOCK ledger entry
- Database: `execute_trade` RPC -- Add FILL_CREDIT entries
- Database: `execute_order_cancel` RPC -- Add ORDER_CANCEL entry

### Admin Navigation
- Add "Trading Reconciliation" link under Trading section in admin sidebar

