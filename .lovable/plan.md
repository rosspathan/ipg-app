
# Swap Module Overhaul: Connect to Real Market Prices and Atomic Execution

## Current State (Problems)

1. **Pricing is completely fake**: The swap uses `useFX.convert()` which has hardcoded static rates (BTC=$45,000, ETH=$2,500, IPG=$0.05). Meanwhile, your `market_prices` table has real live prices (IPG/USDT=$600, BSK/USDT=$0.045) updated by the trading engine and price fetcher. The swap module ignores all of this.

2. **Execution is non-atomic**: The `execute-swap` edge function does sequential `UPDATE` calls to `wallet_balances`. If any step fails mid-way, balances become inconsistent with no rollback.

3. **Fees are UI-only**: The 0.1%/0.15% fees are calculated in the frontend but the backend (`execute-swap`) never deducts them -- it just uses `estimated_rate * from_amount` directly.

4. **MAX button is hardcoded to 1000** instead of fetching the user's actual balance.

5. **No balance validation on frontend**: Users can attempt swaps without knowing their balance.

6. **Broken rollback**: The error handler in `execute-swap` tries to call `req.json()` a second time (which fails since the body stream is already consumed).

7. **`swaps` table uses text columns** (`from_asset`, `to_asset`) instead of referencing asset IDs, disconnected from the `wallet_balances` system which uses `asset_id`.

## Answer to Your Question

> "Does the trading side traded pair on market price automatically execute here in swap?"

**No.** Currently the swap and trading engine are completely separate systems:
- **Trading engine**: Uses `execute_trade` RPC, atomic matching, real `market_prices`, updates `wallet_balances` via `trading_balance_ledger`
- **Swap module**: Uses hardcoded `useFX` rates, writes to a separate `swaps` table, updates `wallet_balances` directly with non-atomic queries

They share the same `wallet_balances` table but use different price sources and different execution paths.

## Proposed Architecture

The swap should become a **thin convenience layer on top of your existing market infrastructure**, not a separate execution engine.

```text
+------------------+       +-------------------+       +------------------+
|   Swap UI        | --->  | execute-swap-v2   | --->  | market_prices    |
|  (SwapScreen)    |       | (Edge Function)   |       | (real prices)    |
|                  |       |                   |       +------------------+
| - Real prices    |       | - Validate quote  |
| - Real balances  |       | - Check slippage  |       +------------------+
| - Fee preview    |       | - Atomic RPC call  | --->  | record_bsk_      |
| - Quote expiry   |       | - Deduct fees     |       | transaction RPC  |
+------------------+       +-------------------+       +------------------+
```

## Implementation Plan

### Phase 1: Real Pricing on Frontend

**File: `src/pages/SwapScreen.tsx`**
- Replace `useFX().convert()` with prices from `market_prices` table
- Create a new hook `useSwapQuote(fromAsset, toAsset, amount)` that:
  - Queries `market_prices` for the pair (e.g., `IPGUSDT`, `BSKUSDT`)
  - For non-direct pairs, calculates 2-hop rate via USDT (e.g., IPG -> USDT -> BTC)
  - Returns: rate, estimated output, fees, price impact, quote timestamp
  - Auto-refreshes every 10 seconds
- Show real user balance for the selected `fromAsset` (replace hardcoded MAX=1000)
- Add quote expiry indicator (15-second countdown)

### Phase 2: Atomic Backend Execution

**File: `supabase/functions/execute-swap/index.ts`** (rewrite)
- Accept: `from_asset`, `to_asset`, `from_amount`, `expected_rate`, `slippage_percent`, `min_receive`
- Server-side price validation:
  - Fetch current rate from `market_prices`
  - Compare with `expected_rate`; reject if drift exceeds slippage tolerance
- Use existing `record_bsk_transaction` RPC for atomic debit/credit (same pattern as `execute-atomic-trade`)
- Deduct platform fee (0.1% direct, 0.15% 2-hop) server-side before crediting
- Record fee in `trading_fees_collected` table (so it shows in your new Fee Collections admin page)
- Update the `swaps` table with actual execution details
- Fix the broken rollback (store `swap_id` before try/catch)

### Phase 3: Frontend Enhancements

**File: `src/pages/SwapScreen.tsx`** (UI upgrades)
- Show user's actual balance next to "From" asset selector
- Price impact indicator (warning at >1%, block at >5%)
- "Minimum Received" clearly displayed
- Fee breakdown: Platform fee + Network fee
- Quote countdown timer (15s refresh)
- Confirmation modal before execution (review step)
- Route visualization: `IPG -> USDT -> BTC` shown as steps
- Disable swap button if balance insufficient

### Phase 4: New Hook - `useSwapQuote`

**New file: `src/hooks/useSwapQuote.ts`**
- Fetches real prices from `market_prices` table
- Calculates direct rate or 2-hop rate via USDT
- Returns: `{ rate, estimatedOutput, platformFee, minReceive, priceImpact, quoteTimestamp, isExpired, route }`
- 10-second refetch interval
- Compares rate against catalog `pairsList` to determine route availability

### Phase 5: Balance Integration

- Fetch user's `wallet_balances` for the selected from-asset
- Wire MAX button to actual available balance
- Show balance warning if amount exceeds available

## Technical Details

### Price Resolution Logic (server-side)
```text
1. Check market_prices for direct pair (e.g., "IPG/USDT")
2. If not found, check reverse pair and invert
3. If neither exists, try 2-hop via USDT:
   a. Get fromAsset/USDT price
   b. Get toAsset/USDT price
   c. Rate = (fromAsset/USDT) / (toAsset/USDT)
4. If no route found, return "Route Unavailable"
```

### Fee Structure (enforced server-side)
- Direct swap: 0.1% platform fee
- 2-hop swap: 0.15% platform fee
- Fees deducted from output amount
- Recorded in `trading_fees_collected` for admin visibility

### Safety Controls
- Server-side slippage check (reject if price moved beyond tolerance)
- Quote expiry: rate valid for 15 seconds
- Idempotency key per swap to prevent double execution
- Advisory lock per user (same pattern as `execute-atomic-trade`)

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/hooks/useSwapQuote.ts` | Create - real-time price quote hook |
| `src/pages/SwapScreen.tsx` | Rewrite - real prices, balances, confirmation flow |
| `supabase/functions/execute-swap/index.ts` | Rewrite - atomic execution with server-side validation |

## What This Achieves

- Swap prices match what users see on the trading page (same `market_prices` source)
- Execution is atomic -- no partial balance states
- Fees are enforced server-side and visible in admin Fee Collections
- Users see their real balance and get protected by slippage controls
- The swap becomes a user-friendly wrapper around your existing market infrastructure
