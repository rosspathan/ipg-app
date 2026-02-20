
# Wallet Page UI — World-Class Web3 Enhancement Plan

## Route & File Confirmed

- **Current route**: `/app/wallet` → `src/pages/astra/HomePageRebuilt.tsx`
- The user is referring to the **HomePageRebuilt** component — the BSK balance hub with Tradable/Locked cards, USDI Loan, Markets, Programs grid, and Activity feed.

---

## Full Audit of Current State

### 1. Hero Balance Section (lines 86–148)
- **Good already**: Ambient orb glows exist (`radial-gradient` orbs), balance text uses `bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text`, hide/show toggle works.
- **Gaps**:
  - The balance gradient is `from-foreground via-foreground to-primary` — in light mode, `foreground` is navy and `primary` is blue, so the gradient is nearly flat and low-drama.
  - No `.balance-gradient-text` utility class used here (unlike WalletPage) — theme switching is not handled properly.
  - "Welcome back" label is plain `text-primary/80` with no letter-spacing or visual treatment.
  - Today's earnings dot has a glow (`shadow-[0_0_6px_...]`) which is good — but the text itself is plain.
  - Action buttons (`Add Funds`, `Send`, `Swap`) use `border-primary/15` which is very faint in light mode — almost invisible borders.
  - No per-action color identity (all three share `text-primary` icon color).

### 2. Tradable & Locked Cards (lines 151–197)
- **Good**: `glass-card`, `rounded-3xl`, hover elevation (`hover:shadow-elevated hover:-translate-y-0.5`).
- **Gaps**:
  - Both cards use identical `border-primary/15` — no color differentiation (Tradable should be success-tinted, Locked should be primary/warning-tinted).
  - Balance values `text-success` / `text-primary` are correct but font is `text-lg` — feels small for a balance display; should be `text-[22px]` or `text-[24px]`.
  - No ambient inner glow per card — flat interiors.
  - The `Withdraw` / `Transfer` buttons inside the Tradable card are small pill buttons (`h-8`) with minimal color distinction.
  - The `Schedule` button in Locked card is `bg-primary/8` which is nearly invisible in light mode.
  - No subtle gradient overlay inside the card to add depth.
  - No top rim highlight specific to each card's color identity.

### 3. History Button (lines 199–209)
- Plain `glass-card` button — functions well but looks like a filler element. Could be integrated better.

### 4. USDI Loan Card (lines 214–217)
- Currently delegates to `<USDILoanCard />` component (`src/components/wallet/USDILoanCard.tsx`). 
- The component uses `bg-gradient-to-br from-primary/15 via-card/90 to-accent/10` with `border-primary/30` — decent but could be elevated with a top rim light, a stronger glow system, and more structured tag chips.
- The pulse animation on the lock icon container already exists (slow 3s).
- In light mode, `from-primary/15` may be too subtle (light primary is `hsl(220 100% 50%)` = blue, so `/15` is very faint).

### 5. Markets Section (lines 219–273)
- Uses `rounded-3xl glass-card border-border/40` — good structure.
- **Gaps**:
  - Section header `text-[14px] font-semibold text-foreground/75` — too dim, needs the section label treatment.
  - No "Live" badge next to Markets header.
  - Market row hover: `hover:bg-primary/[0.03]` — very subtle, almost imperceptible.
  - Change badge: missing inner border (`border` class) — just `bg-success/10` with no border outline.
  - Volume is not shown at all — missed data point.
  - `View All` link: plain `text-accent` with no icon.
  - No section-level ambient glow behind the card.

### 6. Quick Actions Strip (lines 275–297)
- Glass pill buttons with `border-primary/15` — works but all look identical.
- Icons are `text-primary` uniformly — no individual color identity.
- No colored icon container background.

### 7. Programs Grid (lines 299–336)
- `glass-card` with `border-primary/15 rounded-3xl` — structure is good.
- **Gaps**:
  - Icon container: `bg-primary/8 shadow-sm` — very faint, no color per program category.
  - "Tap to start" subtitle is too generic — could be smarter (e.g., "Earn rewards", "Play to win").
  - No per-card ambient gradient or inner glow.
  - Cards feel undifferentiated from each other.

### 8. Activity Feed (lines 338–376)
- Green dot with shadow glow exists — good.
- `text-[12px]` for title and `text-[10px]` for subtitle — slightly tight.
- No icon per activity type — just a dot.
- Amount is `text-success` always — should differentiate debit vs credit.

---

## Enhancement Strategy

### Section 1 — Hero Balance Card

**Changes:**
- Replace the inline gradient with `.balance-gradient-text` class to get proper theme-awareness (white→cyan in dark, navy→blue in light).
- Upgrade "Welcome back" to a `SectionLabel`-style treatment: `text-[11px] font-bold uppercase tracking-widest text-primary/70`.
- Wrap the balance figure in a `relative` container so we can add a subtle glow orb directly below the numbers.
- Add a horizontal gradient divider below the balance (`from-transparent via-primary/20 to-transparent`).
- Action buttons: apply per-action color identity:
  - Add Funds → `text-success`, `bg-success/10`, `border-success/20`
  - Send → `text-primary`, `bg-primary/10`, `border-primary/20`
  - Swap → `text-warning`, `bg-warning/10`, `border-warning/20`
- Increase action button height from `h-[46px]` to `h-[50px]` for more presence.
- Add `active:scale-[0.97]` haptic feedback on all action buttons.
- Today's earnings line: wrap the amount in a subtle `bg-success/8 px-2 py-0.5 rounded-full` pill.

### Section 2 — Tradable & Locked Cards

**Changes:**
- Tradable card: Change border to `border-success/20`, add inner top rim `inset-0` gradient overlay `from-success/[0.04] to-transparent`, add glow: `shadow-[0_4px_24px_hsl(154_67%_52%/0.08)]`.
- Locked card: Change border to `border-primary/20`, add inner top rim gradient `from-primary/[0.04] to-transparent`, add glow: `shadow-[0_4px_24px_hsl(186_100%_50%/0.08)]`.
- Balance values: Increase from `text-lg` to `text-[24px] font-extrabold`.
- Apply `.balance-gradient-text` to Tradable's value (success→green gradient variant).
- Apply `.balance-gradient-text` to Locked's value (primary→indigo gradient variant).
- Withdraw button: Strengthen to `bg-success/15 border-success/30 text-success`.
- Transfer button: `bg-muted/60 border-border text-foreground/70`.
- Schedule button: `bg-primary/12 border-primary/25 text-primary`.
- Both cards get `overflow-hidden` and an absolute gradient overlay for depth.

### Section 3 — History Button

**Change:** Give it a left-side icon colored badge, change to `border-border/40` with more explicit hover state. Already functional — minor polish only.

### Section 4 — USDI Loan Card

The `USDILoanCard.tsx` component will be enhanced:
- Top rim light gradient (cyan → indigo → transparent).
- Lock icon container: add a glow ring `shadow-[0_0_16px_hsl(186_100%_50%/0.25)]`.
- Tags ("200% Collateral", etc.): give each a distinct accent `bg-accent/10 border-accent/20 text-accent` for the financial badges.
- The card gradient `from-primary/15` → enhance to `from-primary/20` in the component.
- "Apply Now" text: increase to `font-bold`, add `ChevronRight` animation `group-hover:translate-x-1`.
- Add a subtle bottom gradient fade for depth.

### Section 5 — Markets Section

**Changes:**
- Header: Replace `text-[14px] font-semibold text-foreground/75` with `SectionLabel` + "Live" pulse badge (matching WalletPage style).
- Container: Add `border-border/30` (stronger than current `border-border/40`).
- Show volume under each pair symbol: `text-[10px] font-mono text-muted-foreground`.
- Change badge: add `border border-success/25` or `border-danger/25` to the percent badge.
- `View All` → `View All <ChevronRight>` with `text-primary` color.
- Row hover: strengthen to `hover:bg-primary/[0.05]`.
- Add section-level ambient glow behind the container:
  ```tsx
  <div className="absolute -inset-2 rounded-3xl pointer-events-none opacity-20 bg-[radial-gradient(ellipse_at_100%_100%,hsl(245_80%_68%/0.15),transparent_70%)]" />
  ```

### Section 6 — Quick Actions Strip

**Changes:**
- Assign per-action color identities:
  - Team: `text-success bg-success/10`
  - Staking: `text-warning bg-warning/10`  
  - Trading: `text-primary bg-primary/10`
- Each pill gets a small icon container (24×24) with the colored background behind the icon.
- Add `active:scale-[0.96]` to all pills.

### Section 7 — Programs Grid

**Changes:**
- Give each program card its own color based on program category using the program data.
- Default icon container upgrade: from `bg-primary/8` to `bg-gradient-to-br from-primary/15 to-primary/5` with `border border-primary/15`.
- The "Tap to start" subtitle can be more contextual — use the program description if available, otherwise keep short.
- Add hover glow: `hover:shadow-[0_0_20px_hsl(var(--primary)/0.12)]`.
- Per-card: add `overflow-hidden` and a corner accent:
  ```tsx
  <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-primary/8 to-transparent rounded-bl-full" />
  ```

### Section 8 — Activity Feed

**Changes:**
- The dot glow is already there — expand to a small icon tile (24×24) with `bg-success/10 rounded-xl` containing the gift icon.
- Amount: credit → `text-success`, debit → `text-danger`.
- Add `text-[13px]` for title (up from `text-[12px]`) and keep `text-[10px]` for sub.
- Add `border-success/15` for credit rows, `border-border/30` for neutral.

---

## Cross-Cutting Improvements

### New CSS Utilities to Add to `src/index.css`

```css
/* Per-card accent gradient overlays for Tradable/Locked */
.card-glow-success {
  box-shadow: 0 4px 24px hsl(154 67% 52% / 0.10), var(--shadow-card);
}
.card-glow-primary {
  box-shadow: 0 4px 24px hsl(186 100% 50% / 0.10), var(--shadow-card);
}
```

### Typography Hierarchy Corrections

| Element | Current | After |
|---|---|---|
| "Welcome back" | `text-[13px] font-semibold text-primary/80 uppercase` | `text-[11px] font-bold uppercase tracking-widest text-primary/70` |
| Balance value | `text-[36px] font-extrabold` inline gradient | `text-[36px] font-extrabold` + `.balance-gradient-text` class |
| Tradable / Locked values | `text-lg font-extrabold` | `text-[24px] font-extrabold tabular-nums font-mono` |
| Section titles (Markets, Programs) | `text-[14px] font-bold text-foreground/80` | `SectionLabel` component (`text-[11px] font-bold uppercase tracking-widest text-muted-foreground`) |
| Activity title | `text-[12px] font-bold` | `text-[13px] font-bold` |

### Micro-Interactions Added

- All interactive cards: `active:scale-[0.97]` (up from `active:scale-[0.98]`)
- Programs grid cards: `active:scale-[0.96]`
- Quick action pills: `active:scale-[0.96]`
- Balance hide/show: the main value already has `blur-sm` toggle — ensure transition is `transition-all duration-300`
- Action buttons in hero: `hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97]`

---

## Files to Modify

1. **`src/pages/astra/HomePageRebuilt.tsx`** — Primary file (all 8 sections)
2. **`src/components/wallet/USDILoanCard.tsx`** — Loan card enhancement
3. **`src/index.css`** — Add `card-glow-success` and `card-glow-primary` utilities

---

## Implementation Sequence

1. Hero section: balance gradient fix + action button color identities
2. Tradable & Locked cards: size upgrade + color-differentiated borders + inner glows
3. Markets section: section label + Live badge + volume data + stronger badges
4. Programs grid: corner accents + icon container upgrade
5. Quick Actions strip: per-action colors
6. USDI Loan Card: rim light + glow ring + stronger tag styling
7. Activity feed: icon tiles + credit/debit color differentiation
8. CSS utilities: `card-glow-success`, `card-glow-primary`
