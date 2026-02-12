

## Comparison: Your Friend's Exchange vs. IPG I-Smart Trading Page

After analyzing the reference screenshot (appears to be Delta Exchange) and your current trading UI, here are the gaps and a plan to bring your interface to a comparable professional level.

---

### Features Missing from Your Trading Page

#### High Priority (Core Trading UX)

1. **Side-by-side Order Book + Form layout on mobile**
   - Reference shows order book (left) and order form (right) visible simultaneously
   - Your current layout stacks them vertically, requiring scrolling
   - Plan: Implement a 2-column grid layout even on mobile (compact sizes)

2. **"Best Bid" / "Best Ask" quick-fill button inside Price input**
   - Reference has a green "Best Bid" button directly inside the price field
   - Tapping it auto-fills the current best bid/ask price
   - Plan: Add a pill button inside the PriceStepperInput component

3. **Funds Required display**
   - Shows exact total funds needed including fees before placing order
   - e.g., "Funds req. ~10096450636058"
   - Plan: Add a "Funds Required" line in the order summary section

4. **Take Profit / Stop Loss (TP/SL) bracket orders**
   - Reference has "Bracket Order" section with "+ Add TP/SL" button
   - Allows setting exit targets when placing an entry order
   - Plan: Add a collapsible TP/SL section below the order form (UI only initially, backend integration later)

5. **Time-in-Force selector (GTC dropdown)**
   - Options: GTC (Good Till Cancel), IOC (Immediate or Cancel), FOK (Fill or Kill)
   - Plan: Add a small dropdown next to order type or below the submit button

6. **Reduce Only / Post Only (Maker) checkboxes**
   - Advanced order flags for professional traders
   - Plan: Add checkbox row below the submit button

#### Medium Priority (UX Polish)

7. **Favorite/Star pair button**
   - Star icon next to pair name to bookmark favorites
   - Plan: Add star toggle in the pair header bar, persist to local storage or database

8. **Price Alert bell icon**
   - Quick button to set a price alert for the current pair
   - Plan: Add bell icon in the top pair bar (right side)

9. **Fee % toggle button**
   - Quick toggle to view/change fee tier
   - Plan: Add a small "% Fees" pill button near the submit area

10. **Open Interest (OI) stat**
    - Additional market data point in the stats bar
    - Note: This is primarily for derivatives/futures. For spot trading, could show "Market Cap" or "Circulating Supply" instead

#### Lower Priority (Nice-to-have)

11. **Promotional fee banner**
    - "Save up to 50% on fees..." banner at bottom
    - Plan: Add a small promotional card below the order form

12. **Lot-based quantity with unit dropdown**
    - Quantity input showing "Lot" units with conversion
    - Plan: Add unit toggle (Token / Lot / USD) to the amount input

---

### Technical Implementation Plan

#### Step 1: Two-Column Mobile Layout
- Modify `TradingPairPage.tsx` to use `grid grid-cols-2` for the order form and order book sections
- Order book on the left, order form on the right (matching reference)
- Both sections scroll independently within fixed heights
- Compact text sizes (11-12px) to fit both panels

#### Step 2: Best Bid/Ask Quick-Fill
- Update `PriceStepperInput` to accept an optional `quickAction` prop
- Render a "Best Bid" (green) or "Best Ask" (red) pill button inside the input
- Pass `bestBid`/`bestAsk` values from the parent and auto-fill on click

#### Step 3: Funds Required + Available Margin
- Add computed "Funds Required" line in `OrderFormPro.tsx` (already have `requiredAmount` calculated)
- Display it prominently between the total and submit button

#### Step 4: TP/SL Bracket Order UI
- Add a collapsible section in `OrderFormPro.tsx` with:
  - Toggle: "Bracket Order"
  - TP (Take Profit) price input
  - SL (Stop Loss) price input
- Initially UI-only; backend support can follow

#### Step 5: Time-in-Force + Advanced Options
- Add a row below submit button with:
  - GTC dropdown (GTC / IOC / FOK)
  - "Reduce Only" checkbox
  - "Maker" checkbox
- These can be UI-only toggles initially

#### Step 6: Favorite Star + Price Alert
- Add star icon (toggle) next to pair name in header
- Add bell icon for price alerts in the top bar
- Store favorites in localStorage or user preferences table

#### Step 7: Fee Display Toggle
- Add "% Fees" button that shows/hides the fee breakdown
- Already have fee calculation logic; just need the toggle UI

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/astra/TradingPairPage.tsx` | 2-column layout, star/bell icons in header |
| `src/components/trading/OrderFormPro.tsx` | Best Bid button, TP/SL section, GTC dropdown, advanced checkboxes, funds required display |
| `src/components/trading/PriceStepperInput.tsx` | Quick-fill action button prop |
| `src/components/trading/OrderBookPremium.tsx` | Compact sizing for side-by-side layout |

### What NOT to Add (Futures-Specific Features)
- Leverage selector (20x) — only relevant for margin/futures trading
- Funding rate/countdown — perpetual futures specific
- Main/Cross margin toggle — margin trading specific
- Open Interest — derivatives metric (could substitute with spot-relevant data)

These features are specific to derivatives exchanges. Since IPG I-Smart appears to be a spot exchange, adding them would be misleading.

