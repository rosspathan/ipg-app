

## Trading System Enhancement Audit

After a thorough review of the entire trading pipeline (deposits, transfers, order placement, matching, settlement, withdrawals), here are the critical enhancements needed, organized by priority.

---

### 1. CRITICAL: Race Condition in Internal Balance Transfer

**Problem**: The `internal-balance-transfer` edge function does a `SELECT` then `UPDATE` on `wallet_balances` without any row-level lock (`FOR UPDATE`) or atomic RPC. Two concurrent requests could both read the same balance and double-spend.

**Fix**: Replace the read-then-write pattern with an atomic PL/pgSQL RPC (like `place_order_atomic` already does) that uses `SELECT ... FOR UPDATE` to lock the row before modifying it.

---

### 2. CRITICAL: Race Condition in Withdrawal Request

**Problem**: `request-custodial-withdrawal` also does a non-atomic `SELECT` then `UPDATE` on `wallet_balances`. A user could submit two withdrawal requests simultaneously and overdraw their balance.

**Fix**: Same approach -- wrap the balance check + deduction + record creation in a single atomic RPC with `FOR UPDATE` row locking.

---

### 3. HIGH: No Source Balance Verification for Wallet-to-Trading Transfer

**Problem**: When a user transfers funds "to_trading", the `internal-balance-transfer` function credits `wallet_balances` but never verifies or debits the user's source wallet balance (`onchain_balances` or any other table). This means a user could transfer unlimited funds into their trading account without actually having them.

**Fix**: Add a source balance check and debit against the appropriate source table (e.g., `onchain_balances` or a dedicated "wallet" ledger), or implement an atomic RPC that performs both sides of the transfer in one transaction.

---

### 4. HIGH: Matching Engine Runs Globally (Not Per-Pair)

**Problem**: The `match-orders` function fetches ALL pending orders across ALL symbols, then iterates. In a growing exchange, this becomes slow and could cause timeouts. One symbol's circuit breaker also blocks matching for all subsequent symbols.

**Fix**: Accept an optional `symbol` parameter so `place-order` can trigger pair-scoped matching. Fall back to global matching for cron-triggered runs.

---

### 5. MEDIUM: No Order Expiration / Cleanup

**Problem**: Limit orders sit in `pending` state indefinitely. There is no TTL, no GTC-with-expiry, and no scheduled cleanup of stale orders. Over time this bloats the order book and slows matching.

**Fix**: Add an `expires_at` column to orders (defaulting to 30 or 90 days) and a scheduled edge function that cancels expired orders and releases locked funds.

---

### 6. MEDIUM: No Notification System for Trade Fills

**Problem**: Users have no push/in-app notification when their limit order gets filled. They must manually check the trading page.

**Fix**: After a successful `execute_trade`, insert a notification into a `user_notifications` table (or trigger a Supabase Realtime broadcast) so the UI can show a toast or badge.

---

### 7. MEDIUM: Fee Transparency in UI

**Problem**: While fees are correctly calculated in the matching engine, the order form does not show the user a fee breakdown before they confirm. The "Funds Required" display should include the fee component explicitly.

**Fix**: Display "Subtotal + Fee = Total Required" in the order confirmation area.

---

### 8. LOW: Missing Withdrawal Address Whitelist

**Problem**: `request-custodial-withdrawal` allows any valid `0x` address. There's no address whitelist, no cooling-off period for new addresses, and no 2FA confirmation for withdrawals.

**Fix**: Add an `approved_addresses` table with a 24-hour activation delay for newly added addresses. Require PIN/2FA verification before submitting a withdrawal.

---

### 9. LOW: No Admin Dashboard for Fee Revenue

**Problem**: Fees are recorded in `trading_fees_collected` but there's no admin view to see total collected fees, fee revenue by pair, or daily fee trends.

**Fix**: Build an admin "Fee Revenue" dashboard card reading from `trading_fees_collected`.

---

### 10. LOW: Matching Engine Retry on Partial Failure

**Problem**: If `execute_trade` fails for one pair, the matching engine logs the error and `continue`s, but there's no retry mechanism or dead-letter queue for failed matches.

**Fix**: Record failed match attempts in a `failed_matches` table and retry them on the next matching cycle.

---

### Summary Table

| # | Issue | Severity | Type |
|---|-------|----------|------|
| 1 | Race condition in balance transfer | CRITICAL | Security |
| 2 | Race condition in withdrawal request | CRITICAL | Security |
| 3 | No source balance check for to_trading | HIGH | Integrity |
| 4 | Global matching instead of per-pair | HIGH | Performance |
| 5 | No order expiration | MEDIUM | Maintenance |
| 6 | No fill notifications | MEDIUM | UX |
| 7 | Fee transparency in UI | MEDIUM | UX |
| 8 | No withdrawal address whitelist | LOW | Security |
| 9 | No admin fee dashboard | LOW | Admin |
| 10 | No match retry mechanism | LOW | Reliability |

---

### Recommended Implementation Order

1. Fix race conditions (#1, #2) -- these are exploitable vulnerabilities
2. Add source balance verification (#3)
3. Per-pair matching (#4)
4. Order expiration (#5)
5. Fill notifications (#6) and fee transparency (#7)
6. Withdrawal security (#8), admin dashboard (#9), retry (#10)

