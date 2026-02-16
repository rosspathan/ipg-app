

## Fix Order Book: Remove Scrollbars and Fill All Available Space

### Problem
The order book currently has two issues visible in the screenshot:
1. **Unwanted scrollbars** appear on the asks and bids sections (from the previous change adding `overflow-y-auto`)
2. **Large empty gaps** remain above the asks and below the bids -- the dynamic row count is still too conservative

### Root Cause
- The `overflow-y-auto` added in the last edit creates visible scrollbars even when content doesn't overflow
- The overhead constant (52px) is still too generous, and with only a few orders available, the flex containers show empty space instead of stretching the rows to fill

### Solution (single file change)

**File: `src/components/trading/OrderBookPremium.tsx`**

1. **Remove `overflow-y-auto` from both asks and bids containers** -- revert to `overflow-hidden`. The dynamic row calculation already limits rows to fit, so scrolling is unnecessary and the scrollbar wastes space.

2. **Reduce reserved overhead from 52px to 44px** -- the actual measured heights are: header ~14px, mid-price bar 20px, pressure bar 12px = 46px. Using 44px squeezes out 1 more row per side.

3. **Reduce row height from 14px to 13px** -- this gains another 1-2 rows per side at the current container height while keeping 11px text readable.

4. **When fewer data rows exist than space allows, pad with empty placeholder rows** so the asks section pushes down to the mid-price bar and the bids section extends to the pressure bar, eliminating all visible gaps.

### Technical Details

Changes in `OrderBookPremium.tsx`:

- Line 54: Change `h-[14px]` to `h-[13px]` on the Row component
- Line 103: Change overhead from `52` to `44`, divisor from `14` to `13`
- Line 154: Change `overflow-y-auto` back to `overflow-hidden` on asks container
- Line 192: Change `overflow-y-auto` back to `overflow-hidden` on bids container
- Add empty spacer rows (transparent, non-interactive) when `displayAsks.length < effectiveRows` or `displayBids.length < effectiveRows` to fill remaining space, ensuring no visible gaps

### What stays unchanged
- TradingPairPage layout (65%/35% split, flex stretch)
- Trade form -- no changes
- Order book data logic, aggregation, real-time hooks
- All margins and padding on the page

