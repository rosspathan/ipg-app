

# Update Swap Platform Fee to 0.5%

## What Changes

The platform fee for swaps is currently set to 0.1% (direct) and 0.15% (2-hop routes). This update changes both to a flat **0.5%** across all swap types, consistent with the trading and staking fee structure.

## Files to Modify

### 1. Frontend Hook: `src/hooks/useSwapQuote.ts`
- Line 246: Change default `platformFeePercent` from `0.15`/`0.1` to `0.5`
- Line 257: Change `feePercent` calculation from `0.15`/`0.1` to a flat `0.5`

### 2. Backend Edge Function: `supabase/functions/execute-swap/index.ts`
- Line 167: Change `feePercent` from `0.0015`/`0.001` to `0.005` (0.5%)

### 3. UI Display: `src/pages/SwapScreen.tsx`
- Line 343: Remove or update the "slightly higher fee applies" note for 2-hop routes, since the fee is now uniform at 0.5%

## Result
- All swaps (direct and 2-hop) will charge a flat 0.5% platform fee
- Fee is enforced server-side and displayed accurately in the UI
- Consistent with the 0.5% fee used in trading and staking

