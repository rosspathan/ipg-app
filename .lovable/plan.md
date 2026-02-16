

## Enhance Order Book to Fill All Available Space

### Problem
The order book has visible empty space because the dynamic row calculation reserves too much overhead and doesn't fully utilize the available height. The asks and bids sections don't stretch to fill the entire panel.

### Solution
Two targeted changes to `OrderBookPremium.tsx` to eliminate empty space:

### Technical Details

**1. Reduce reserved overhead in dynamic calculation (line 103)**
- Current: reserves `62px` for header + mid-price + pressure bar + padding
- Actual measured: header ~16px + mid-price ~20px + pressure ~16px = ~52px
- Change to `52px` to reclaim ~10px (roughly 1 extra row per side)

**2. Make asks section use all remaining top space**
- The asks section already uses `flex-1` + `justify-end` which is correct
- The bids section also uses `flex-1` + `justify-start` which is correct
- But if there are fewer rows than space allows, the flex containers still leave gaps
- Add `overflow-y: auto` to both sections so they can scroll if data exceeds space, and ensure the flex container truly fills

**3. Reduce row height from 15px to 14px for denser display**
- This gains roughly 1-2 more visible rows per side
- Keeps text at 11px which remains readable

**4. Shrink pressure bar padding**
- Remove vertical padding from the pressure bar section (line 209)
- Make it more compact: reduce to a simple 12px-high bar

### Files to modify
- `src/components/trading/OrderBookPremium.tsx` — adjust overhead constant, row height, and pressure bar compactness

### What stays unchanged
- No changes to `TradingPairPage.tsx` layout
- No changes to the trade form
- The flex stretch architecture remains intact

