

## Bug Fix: "Cannot access 'urlSymbol' before initialization"

### Root Cause

In `TradingPairPage.tsx`, the `isFavorite` state initializer (line 68-71) references `urlSymbol`, but `urlSymbol` is declared two lines later (line 73). JavaScript's temporal dead zone prevents accessing a `const`/`let` variable before its declaration.

```
Line 68:  const [isFavorite, setIsFavorite] = useState(() => {
Line 70:    return favs.includes(urlSymbol);  // ERROR: used here
Line 71:  });
Line 73:  const urlSymbol = params.symbol || "";  // declared here
```

### Fix

Move the `urlSymbol` and `symbol` declarations (lines 73-74) above the `isFavorite` useState (line 68). This is a simple reordering of two lines — no logic changes needed.

### Technical Details

**File:** `src/pages/astra/TradingPairPage.tsx`

**Change:** Move lines 73-74 to before line 68, so the variable order becomes:

```
const urlSymbol = params.symbol || "";
const symbol = urlSymbol.replace('-', '/');

const [isFavorite, setIsFavorite] = useState(() => {
  const favs = JSON.parse(localStorage.getItem('favorite-pairs') || '[]');
  return favs.includes(urlSymbol);
});
```

This single reorder fixes the crash and restores the trading page.

