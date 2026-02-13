

# Trading Page Layout Optimization

## Problems Identified

1. Order book shows uneven rows (6 asks, 3 bids) with wasted space
2. Top section artificially capped at 60vh, creating dead zones below
3. "Position" collapsible bar wastes a row when collapsed and is rarely used
4. Bottom history section shows a massive empty void when no orders exist
5. Order book `maxRows` is hardcoded instead of dynamically filling space
6. Buy/Sell button has overly rounded corners inconsistent with the flat terminal design

## Solution

Restructure the layout into a properly balanced flex hierarchy where content fills the viewport intelligently.

### Layout Architecture

```text
+----------------------------------+
| Top Bar (fixed ~60px)            |
+----------------------------------+
| Chart (collapsible)              |
+----------------+-----------------+
| Order Form     | Order Book      |
| (auto height)  | (flex-grow,     |
|                |  fills space)   |
+----------------+-----------------+
| History Tabs - compact (fixed)   |
| Open | Orders | Trades | Funds   |
+----------------------------------+
```

### Changes

**1. Remove 60vh cap on top section**
- Remove `maxHeight: '60vh'` and instead let the order form + book section use `flex-1` to fill available space
- The order book will dynamically expand to use all vertical room

**2. Dynamic Order Book rows**
- Calculate `maxRows` based on container height instead of hardcoding 7
- Use a ref + ResizeObserver on the order book container to measure available height
- Each row is 17px; divide container height by 17 to get max rows per side

**3. Remove "Position" collapsible section**
- Move Position data into the history tabs as a 5th tab or remove entirely
- This eliminates a wasted row and simplifies the layout

**4. Compact empty state for history tabs**
- When no orders exist, show a single-line "No open orders" (32px height) instead of a centered block taking 200px+
- History tabs section becomes a fixed-height footer (~140px) that doesn't grow excessively

**5. Fix Buy/Sell button styling**
- Change from `rounded-full` to `rounded-md` (4px) for the CTA button
- Match the flat, professional terminal aesthetic

**6. Rebalance the flex layout**

The new structure:
- **Top bar**: `flex-shrink-0` (fixed)
- **Chart**: `flex-shrink-0` (collapsible)
- **Trade + Order Book**: `flex-1` (grows to fill)
- **History footer**: `flex-shrink-0`, fixed ~140px with internal scroll

This ensures the order book expands to show maximum depth levels and eliminates all dead dark zones.

## Technical Details

### Files to modify

**`src/pages/astra/TradingPairPage.tsx`**
- Remove `maxHeight: '60vh'` from top section, change to `flex-1`
- Move order form + book section to be the growing element
- Make history tabs a fixed-height footer section (~140px) with overflow scroll
- Remove the Position collapsible wrapper (keep PositionSummary as a tab or inline)
- Calculate dynamic `maxRows` for OrderBookPremium based on container measurement

**`src/components/trading/OrderBookPremium.tsx`**
- Accept dynamic `maxRows` prop (already supported)
- Ensure the component fills its parent height properly with flex layout

**`src/components/trading/OrderFormPro.tsx`**
- Fix Buy/Sell CTA button border radius from rounded-full to rounded-md
- Minor spacing tightening if needed

**`src/components/trading/TradingHistoryTabs.tsx`**
- Add compact empty state (single line instead of centered block)
- Ensure the component works well in a fixed-height container

