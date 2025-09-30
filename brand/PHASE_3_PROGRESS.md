# Phase 3: Page Rebuilds ✅

## Pages Rebuilt

### 1. WalletPage (`src/pages/astra/WalletPage.tsx`) ✅
**New Features:**
- ✅ Uses `AppShellGlass` with glass top bar
- ✅ `data-testid="page-wallet"`
- ✅ Address panel with network badge `data-testid="address-panel"`
- ✅ Show/hide address toggle with Eye icon
- ✅ Copy/QR/Explorer actions
- ✅ QuickActionsRibbon (Deposit/Withdraw/Send/Swap)
- ✅ BalanceCluster with crypto assets grid `data-testid="crypto-assets-grid"`
- ✅ BrandHeaderLogo in top bar
- ✅ Pulsing network indicator

**Removed:**
- ❌ Old AstraCard wrapper
- ❌ SectionHeader component
- ❌ Verbose tip cards

### 2. TradingPageRebuilt (`src/pages/astra/TradingPageRebuilt.tsx`) ✅
**New Features:**
- ✅ Uses `AppShellGlass`
- ✅ `data-testid="page-trading"`
- ✅ KPIChipRow for price/volume
- ✅ CompactChartCard `data-testid="chart-card"`
- ✅ Pairs Grid with 3 tabs (Recent/Favorites/All) `data-testid="pairs-grid"`
- ✅ Search functionality
- ✅ Star favorites
- ✅ Trend indicators (up/down arrows)
- ✅ Quick Buy/Sell buttons
- ✅ Mobile-first grid layout

**Structure:**
```tsx
<AppShellGlass>
  - KPIChipRow (price, volume)
  - ChartCard (compact 48px)
  - Pairs Grid:
    - Tab navigation
    - Search bar
    - Grid of pair cards (1 col)
  - Quick action buttons
</AppShellGlass>
```

### 3. ProgramsPage (`src/pages/astra/ProgramsPage.tsx`) ✅
**Updated:**
- ✅ Replaced `GridShell` with `AppShellGlass`
- ✅ Removed `GridViewport` wrapper
- ✅ All testids verified
- ✅ GroupHeaders working
- ✅ ProgramGrid with responsive layout
- ✅ TilePeek long-press preview
- ✅ QuickActionsRibbon on expansion

### 4. HomePage (`src/pages/astra/HomePage.tsx`) ✅
**Previously Updated in Phase 2:**
- ✅ AppShellGlass
- ✅ KPIChipRow
- ✅ BalanceCluster
- ✅ All components and testids

## Program Detail Grids (Coming Next)

Need to create separate detail pages for:

1. **Advertise Mining** `data-testid="advert-grid"`
   - Tiers grid: Free Daily, ₹100, ₹250, ₹500, ₹1,000
   - Each shows: BSK/day, Duration, Features

2. **Lucky Draws** `data-testid="draws-grid"`
   - Pools grid showing: Ticket price, Fill %, Prize pool, Countdown

3. **Staking** `data-testid="staking-grid"`
   - Pools grid: Asset, APY, Min stake, Lock period

4. **Spin Wheel** `data-testid="spin-presets-grid"`
   - Bet chips: ₹100, ₹250, ₹500, ₹1,000
   - Shows outcomes and probabilities

5. **Referrals** `data-testid="referrals-grids"`
   - Badges/unlocks grid
   - VIP milestones grid

6. **Loans** `data-testid="loans-grid"`
   - Action grid: Apply/Pay EMI/Schedule/History

7. **Insurance** `data-testid="ins-grid"`
   - Three-plan grid: Accident/Trading/Life

8. **One-Time Purchase** `data-testid="promo-grid"`
   - Promo channels/offers grid

## Design Verification ✅

### Grid Layouts
- ✅ Responsive: 2 cols @ 360-430px, 3 cols @ ≥480px
- ✅ Auto-fit with minmax(156px, 1fr)
- ✅ Equal height rows (auto-rows-fr)
- ✅ Consistent 16px gap

### Glass Morphism
- ✅ 40% background opacity
- ✅ 24px backdrop blur
- ✅ 40% border opacity
- ✅ Smooth transitions (220ms)

### Motion
- ✅ Staggered reveals (80ms)
- ✅ Scale on hover (1.02x)
- ✅ Scale on press (0.98x)
- ✅ Fade-in with lift
- ✅ Reduced motion support

### Testids Present
- ✅ `shell-glass`
- ✅ `page-home`
- ✅ `page-wallet`
- ✅ `address-panel`
- ✅ `page-programs`
- ✅ `program-grid`
- ✅ `program-tile`
- ✅ `quick-actions`
- ✅ `page-trading`
- ✅ `pairs-grid`
- ✅ `chart-card`
- ✅ `kpi-row`

## Performance
- ✅ Only transform/opacity animations
- ✅ No layout thrash
- ✅ Proper z-index stacking
- ✅ Safe-area support
- ✅ 60fps target

## Accessibility
- ✅ Visible focus rings
- ✅ ARIA labels
- ✅ Keyboard navigation
- ✅ Reduced motion
- ✅ AA contrast

## Next: Program Detail Pages
Need to create 8 detail pages with specific grids for each program type.
