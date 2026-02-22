

# Complete Trading System Audit Report

## Executive Summary

The trading system has a **solid atomic core** (order placement, matching, trade execution all use single-transaction RPCs), but suffers from **incomplete audit trail** (the ledger is missing ~75% of historical entries) and **3 specific bugs** that need fixing. There are no negative balances, no duplicate deposits, and no duplicate trades in the system.

---

## 1. DEPOSIT FLOW

### What works:
- `credit_custodial_deposit` RPC is atomic: uses `FOR UPDATE` row lock on the deposit, checks `status = 'credited'` to prevent double-credit, and records a ledger entry with `ON CONFLICT DO NOTHING` on `(reference_type, reference_id)` for idempotency.
- No duplicate deposits found in the database (verified: zero rows with duplicate `tx_hash`).

### Issues found:
- **CRITICAL**: 257 of 345 credited deposits (75%) are missing ledger entries. The `credit_custodial_deposit` RPC was added after the system launched, so historical deposits were never backfilled. This means `validate_and_record_withdrawal` (which checks `SUM(delta_available)` from the ledger) will incorrectly block legitimate withdrawals for users whose deposits predate the ledger.

| Asset | Total Deposits | In Ledger | Missing |
|-------|---------------|-----------|---------|
| USDT  | 208           | 59        | 149     |
| BSK   | 70            | 21        | 49      |
| IPG   | 39            | 7         | 32      |
| USDI  | 28            | 1         | 27      |

### Verdict: Deposit mechanism is correct but ledger is incomplete. Backfill required.

---

## 2. ORDER PLACEMENT

### What works:
- `place_order_atomic` RPC is a single transaction: checks balance with `FOR UPDATE` lock, deducts `available`, adds to `locked`, and inserts the order -- all atomically.
- Buy orders lock `quantity * price * (1 + fee_rate)` in quote currency.
- Sell orders lock exactly the base amount.
- Market buy orders use best ask price with 10% slippage buffer.
- Rate limiting (5 orders/minute), min/max order size, per-pair circuit breaker, and self-trade prevention are all implemented.
- Idempotency key support prevents duplicate order submissions.

### Issues found:
- **MINOR**: No `ORDER_LOCK` entry is written to `trading_balance_ledger` when funds are locked. This means the ledger only tracks deposits and fill debits, making it harder to audit the locked-to-available transitions.

### Verdict: Order placement is atomic and correct. Missing ledger entry is a tracking gap, not a financial risk.

---

## 3. MATCHING ENGINE

### What works:
- `execute_trade` RPC is fully atomic: locks both orders with `FOR UPDATE`, validates statuses, caps fill quantity to actual remaining, proportionally adjusts fees, updates both buyer and seller balances, creates trade record, updates market prices -- all in one transaction.
- Self-trade prevention at both the edge function and matching engine level.
- No duplicate trades found (verified: zero rows where same buy+sell order pair matched twice).
- BigNumber precision with 8 decimal places throughout the matching engine.
- Circuit breaker with configurable deviation threshold.
- Maker/taker fee differentiation based on order placement time.

### Issues found:
- **MODERATE**: `execute_trade` only writes ONE ledger entry (`FILL_DEBIT` for buyer's quote currency). It does NOT record:
  - `FILL_CREDIT` for buyer receiving base asset
  - `FILL_DEBIT` for seller's base asset consumed from locked
  - `FILL_CREDIT` for seller receiving quote currency
  - `FEE` entries for platform fee collection
  This means the ledger dramatically undercounts trade activity.

### Verdict: Trade execution is atomic and mathematically correct. Balance updates are sound. Ledger recording is incomplete (1 of 4 required entries per trade).

---

## 4. CANCELLATION LOGIC

### What works:
- `execute_order_cancel` RPC is atomic: locks the order with `FOR UPDATE`, validates status, updates to `cancelled`, unlocks balance, and writes audit log -- all in one transaction.
- Uses `GREATEST(0, locked - unlock_amount)` to prevent negative locked balances.

### Issues found:
- **BUG**: 3 cancelled orders for user `da546ee5` still have `locked_amount > 0` in the `orders` table (7f63, dff1, 8793). The cancel RPC sets `locked_amount = 0`, so these were likely cancelled through an older code path before the atomic RPC was deployed. The balance was likely unlocked correctly (user's locked balance is 290 BSK which corresponds to active orders), but the order records are stale.
- **MINOR**: No `ORDER_CANCEL` entry in `trading_balance_ledger`.

### Verdict: Current cancellation logic is atomic and correct. Legacy stale data exists but doesn't affect live balances.

---

## 5. WITHDRAWAL SYSTEM

### What works (after recent fix):
- `validate_and_record_withdrawal` RPC now atomically: checks `wallet_balances.available`, checks `SUM(delta_available)` from ledger, deducts balance, and records a `WITHDRAWAL` ledger entry.
- `refund_failed_withdrawal` RPC handles rollback for failed blockchain transactions.
- Circuit breakers: 15-min cooldown, 3/hour, 10/day, $5K daily per user, $50K global, anomaly detection.
- Hot wallet balance is checked on-chain before sending (ERC20 `balanceOf` check).
- Account status and `withdrawal_locked` flag checked.
- KYC required for withdrawals over $1,000.
- Address validation (BSC format).

### Issues found:
- **CRITICAL**: Zero historical withdrawals are in the ledger (0 of 91 total). This means `validate_and_record_withdrawal` will calculate incorrect `ledger_net` for users who previously withdrew. Combined with missing deposit entries, the ledger validation is unreliable.
- **BUG**: The `validate_and_record_withdrawal` RPC checks `v_ledger_net < v_total_debit` but `v_ledger_net` is the sum of ALL `delta_available` entries. For users with historical deposits not in the ledger, this sum will be too LOW, causing legitimate withdrawals to be blocked. For users who previously withdrew without ledger entries, the sum will be too HIGH (because the withdrawal deductions are missing), potentially allowing over-withdrawal.

### Verdict: The withdrawal protection mechanism is architecturally correct but cannot function properly until the ledger is backfilled. The hot wallet balance check provides a secondary safety net against actual fund loss.

---

## 6. RECONCILIATION

### Current state:
- `useBalanceReconciliation` hook detects "ghost locks" (locked balance without corresponding orders).
- `GhostLockWarning` component alerts users and provides admin fix.
- `fix_ghost_locks` RPC and `reconcile_locked_balance` RPC exist for manual correction.

### Issues found:
- **No real-time system-wide reconciliation** exists. There is no automated process that compares total user balances against hot wallet on-chain balance.
- **Significant drift detected** in reconciliation query. Users like `a265be3b` (vbirsu0) have 1,454 BSK with only 30 BSK from trades and 0 from deposits. These balances came from `internal_balance_transfers` (BSK holdings to trading transfers) which total 11,680 BSK across 22 transfers -- these are NOT in `custodial_deposits` and therefore not in the reconciliation calculation.

### Verdict: No automated system-wide reconciliation. Manual reconciliation is incomplete because `internal_balance_transfers` are not factored in.

---

## 7. SECURITY & EDGE CASES

### Race Conditions:
- **Protected**: All critical operations use `FOR UPDATE` row locks (order placement, trade execution, cancellation, deposit crediting, withdrawal validation).
- **Protected**: Optimistic locking on auto-process-withdrawals (`WHERE status = 'pending'`).
- **Protected**: Advisory locks in `execute-atomic-trade` for user-level concurrency control.

### API Retry Duplication:
- **Protected**: Idempotency keys on order placement.
- **Protected**: `ON CONFLICT DO NOTHING` on deposit ledger entries.
- **Gap**: No idempotency key on withdrawal requests (mitigated by 15-min cooldown).

### Rounding/Precision:
- **Protected**: `ROUND(x, 8)` throughout `execute_trade` and `place_order_atomic`.
- **Protected**: BigNumber with `DECIMAL_PLACES: 8` and `ROUND_DOWN` in matching engine.
- **Gap**: `validate_and_record_withdrawal` does not round amounts before comparison.

### Negative Balances:
- **Verified**: Zero negative balances exist in `wallet_balances` (confirmed via query).
- **Protected**: `GREATEST(0, locked - amount)` prevents negative locked.
- **Gap**: No database constraint preventing `available` from going negative (relies on application logic).

---

## Summary of Findings

### System is CORRECT in:
1. Atomic order placement (single-transaction RPC)
2. Atomic trade execution (both sides settled atomically)
3. Atomic cancellation (unlock + status update)
4. Deposit idempotency (no duplicates)
5. Self-trade prevention
6. Rate limiting and circuit breakers
7. Hot wallet balance verification before withdrawal
8. BigNumber precision in matching engine
9. No negative balances, no duplicate trades

### System REQUIRES fixes in:

| Priority | Issue | Risk |
|----------|-------|------|
| P0 | Backfill 257 missing DEPOSIT ledger entries | Withdrawal validation broken |
| P0 | Backfill 91 missing WITHDRAWAL ledger entries | Ledger sum inaccurate |
| P1 | Add FILL_CREDIT/FILL_DEBIT for all 4 trade legs | Incomplete audit trail |
| P1 | Add internal_balance_transfer entries to ledger | Reconciliation gap |
| P2 | Add ORDER_LOCK / ORDER_CANCEL ledger entries | Tracking completeness |
| P2 | Add CHECK constraint: `available >= 0` on wallet_balances | Defense in depth |
| P2 | Build system-wide reconciliation dashboard | Admin visibility |
| P3 | Add idempotency to withdrawal requests | Edge case protection |
| P3 | Clean up 3 stale cancelled orders with locked_amount > 0 | Data hygiene |

### To Reach Binance-Level Standards, additionally need:
- Automated system-wide reconciliation running every minute
- Real-time hot wallet balance monitoring with alerts
- Withdrawal address whitelisting with 24h cooling (partially implemented)
- Multi-signature approval for large withdrawals
- Database-level `CHECK (available >= 0)` constraint
- Complete ledger coverage for ALL balance mutations
- Admin dashboard showing per-user ledger trail and drift

---

## Implementation Plan

### Phase 1: Database Migration (Critical)
- Backfill all 257 missing DEPOSIT entries from `custodial_deposits`
- Backfill all 91 missing WITHDRAWAL entries from `withdrawals`
- Backfill internal_balance_transfer entries as DEPOSIT type
- Update `execute_trade` RPC to record all 4 ledger entries per trade
- Update `execute_order_cancel` RPC to record ORDER_CANCEL ledger entry
- Update `place_order_atomic` RPC to record ORDER_LOCK ledger entry
- Add `CHECK (available >= 0)` constraint on wallet_balances
- Clean up 3 stale cancelled order records

### Phase 2: Admin Reconciliation Dashboard
- Create `/admin/trading-reconciliation` page with:
  - Hot wallet monitor (deposits vs withdrawals vs on-chain balance)
  - User-level tracking table (deposits, withdrawals, trades, balance, drift)
  - Real-time reconciliation dashboard with mismatch alerts
- Create `useAdminTradingReconciliation` hook
- Add admin navigation link

### Phase 3: Reconciliation Edge Function
- Create `full-trading-reconciliation` edge function
- Compare ledger sums vs wallet_balances per user per asset
- Return discrepancies with optional auto-fix
- Schedulable for periodic automated checks

