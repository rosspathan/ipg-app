

## Enhance Order Book: Eliminate Dead Space and Add Professional Polish

### Problem
The order book has only a few orders (4 asks, 2 bids) but sits in a tall flex container. The current spacer approach (fixed 13px empty divs) does not fill the actual flex-1 container height, leaving large dark voids above asks and below bids. This looks empty and unprofessional.

### Solution: Three-Part Enhancement

**File: `src/components/trading/OrderBookPremium.tsx`**

#### 1. Remove Spacer Rows -- Let Flex Layout Handle Alignment Naturally

Delete the spacer div logic entirely (lines 155-159 and 211-215). The flex containers with `justify-end` (asks) and `justify-start` (bids) already anchor rows correctly toward the mid-price bar. Empty space above asks and below bids is simply dark background, which is the correct professional look (same as Binance/Bybit with sparse data).

#### 2. Add Subtle Horizontal Grid Lines in Empty Zones

Instead of dead black space, render faint dashed grid lines (using a CSS repeating background pattern) on the asks and bids containers. This gives the empty areas a "ready for data" look -- like an empty spreadsheet grid -- making the order book feel structured even with sparse data.

- Pattern: `repeating-linear-gradient` producing a 1px line of `#1F2937` opacity 20% every 13px
- This creates faint horizontal rules that align with where rows would appear
- Zero DOM overhead (pure CSS)

#### 3. Add "Waiting for Orders" Micro-Hint When Data Is Very Sparse

When fewer than 3 rows exist on either side, show a small ghost text like "-- --" placeholder rows (common on professional exchanges) to indicate depth levels are available but empty. These render at 50% opacity in the grid line slots nearest the mid-price bar.

### Technical Details

Changes in `OrderBookPremium.tsx`:

**Remove spacer divs (lines 155-159, 211-215)**
- Delete both `Array.from({ length: effectiveRows - displayX.length })` blocks

**Add repeating grid background to flex containers (lines 154, 197)**
- On the asks container div, add an inline style:
  `backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 12px, rgba(31,41,55,0.15) 12px, rgba(31,41,55,0.15) 13px)'`
- Same on the bids container div

**Add placeholder "--" rows when data count less than 3**
- After asks data rows, if `displayAsks.length < 3`, render `(3 - displayAsks.length)` ghost rows with `opacity-30` showing "-- --" in price/amount columns
- Before bids data rows, same logic for bids
- These ghost rows use the same 13px height and grid layout as real rows

### What Stays Unchanged
- TradingPairPage layout (65%/35% split, flex stretch)
- Trade form -- no changes
- Order book data fetching, aggregation, real-time hooks
- Row component internals, depth bars, mid-price bar, pressure bar
- All existing interactive behavior (price click, hover)

