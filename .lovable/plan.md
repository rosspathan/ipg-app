
# Home Page UI — World-Class Web3 Enhancement Plan

## What We're Enhancing

The page at `/app/home` renders the `WalletPage` component (`src/pages/astra/WalletPage.tsx`). This is the main wallet view — the one visible in the uploaded screenshot. It contains 7 key sections that all need upgrading.

---

## Current State Analysis

### Problems Identified

**Visual Identity**
- Background has no depth — just a flat `bg-background` with no orbs or ambient layers on this page
- Cards use basic `bg-card/80 border border-border/50` with no glow, no inner rim light, no backdrop saturation
- No layered z-depth between sections

**Cards (all 7 sections)**
- On-Chain Balance card: No radial teal glow, thin border, flat — looks like a plain container
- Action Grid: Uses raw emoji characters (`↓ ↑ ⇄ 📋`) instead of Lucide icons, buttons have zero glass depth
- BSC Address block: No prominent label, no visual separator, monochrome and flat
- Asset list: Plain `rounded-xl bg-card/80` — no token badge colors, no row hover glow
- Trading Balances: Same flat card treatment, transfer button is minimal
- USDI Loan: Has some structure but no visual energy — no animated status dot, no gradient border
- Markets: Basic `rounded-xl bg-card/80` — pairs have no sparkline or mini chart indicator

**Typography & Hierarchy**
- Balance amount (`$13.67`) renders at `text-[28px]` with no gradient text treatment
- Section headings (`text-[14px] font-semibold text-foreground/75`) all look identical — no weight or scale differentiation
- Token chip for "BSC" / "BEP20" is very faint

**Dark Mode**
- No per-section ambient orb glow (e.g., teal orb behind the balance card)
- Borders are `border-border/50` — too subtle, no cyan rim accent
- Icons in the action grid have no colored glow ring

**Light Mode**
- Cards render `bg-card/80` which maps to a slightly blue-tinted white — decent, but lacks the glass elevation shadows defined in the token system
- Borders are too faint — cards merge into the background
- Action grid buttons have no colored tint per action type

**Micro-interactions**
- `active:scale-95` exists on one button only
- No press-down haptic-style feedback on asset rows
- Balance reveal has no animation when toggling hide/show
- No loading shimmer on the balance figure while data fetches

---

## Enhancement Strategy

### 1. On-Chain Balance Card — Hero Elevation

Transform from flat container to a premium hero card:

```text
BEFORE: p-5 rounded-xl bg-card/80 border border-accent/12
AFTER:  p-5 rounded-2xl glass-card border border-accent/20
        + radial teal glow orb behind the card (absolute, z=-1)
        + gradient border: border-image or box-shadow glow on hover
        + balance value: gradient text (white → cyan) using bg-clip-text
        + Available row: cyan icon + cyan value (already there, strengthen)
        + In Orders row: amber icon + amber value (same)
        + Bottom divider: gradient line (cyan → transparent → amber)
```

The radial glow implementation:
```tsx
<div className="absolute -inset-4 rounded-3xl opacity-30 pointer-events-none bg-[radial-gradient(ellipse_at_50%_0%,hsl(186_100%_50%/0.18),transparent_65%)]" />
```

### 2. Action Grid — Icon Upgrade + Glass Depth

Replace emoji characters with Lucide icons and add per-action color identity:

```text
BEFORE: flex flex-col items-center gap-2 py-4 rounded-xl bg-card/80 border border-border/50
        + raw emoji: ↓ ↑ ⇄ 📋

AFTER:  glass-card rounded-2xl py-4
        + icon container: 40px × 40px rounded-xl with per-action gradient bg
        + Deposit: ArrowDownCircle → bg-success/12, text-success, shadow-[0_0_12px_hsl(success/0.3)]
        + Withdraw: ArrowUpCircle → bg-danger/12, text-danger
        + Swap: ArrowRightLeft → bg-secondary/12, text-secondary
        + History: ClockIcon → bg-warning/12, text-warning
        + active:scale-[0.94] on each button
```

### 3. BSC Address Block — Premium Identity Strip

Transform the plain address section into a branded chain identity panel:

```text
BEFORE: Simple label + scrollable mono text + 3 icon buttons in a row

AFTER:  
  - Animated status dot (pulsing, warning color) next to "BINANCE SMART CHAIN" label
  - Address block: glass-card rounded-2xl with inner glow
  - Monospace text: slightly larger (13px), cyan-tinted in dark mode
  - Action buttons (Copy, QR, Eye): glass pill buttons with icon color on hover
  - BSCScan + On-chain View: elevated pill buttons with border glow
  - Divider between address section and assets: subtle gradient HR
```

### 4. On-Chain Assets — Rich Token Rows

Upgrade the flat list to premium token rows with network badge colors:

```text
BEFORE: flex items-center px-4 py-3 inside bg-card/80 border border-border/50

AFTER:  Each row:
  - Hover state: bg-accent/[0.03] with left-border accent flash (3px, cyan)
  - Asset logo: ring glow on hover (shadow-[0_0_12px_hsl(accent/0.25)])
  - Network badge: colored by network — BSC = amber/12 bg with amber text
  - Balance: right-aligned mono with symbol below in muted
  - Container: glass-card rounded-2xl instead of plain bg-card/80
  - Search input: glass-card styled with cyan focus ring
```

### 5. Trading Balances — Exchange-Grade Rows

Give the trading section a professional exchange aesthetic:

```text
BEFORE: bg-card/80 border border-border/50 with plain text rows

AFTER:
  - Section header: "Trading Balances" with a subtle green dot + "Live" badge
  - Container: glass-card rounded-2xl
  - Each asset row: icon + symbol left, available + locked right
  - Available value: text-success for positive amounts
  - Locked value: text-warning with lock icon inline
  - Transfer button: elevated with accent glow (bg-accent, not bg-accent/8)
  - Total USD: larger, gradient text treatment
```

### 6. USDI Loan Card — Animated Status + Gradient Border

Upgrade the loan card to feel live and important:

```text
BEFORE: w-full p-4 rounded-xl text-left bg-card/80 border border-accent/12

AFTER:
  - glass-card rounded-2xl with gradient border: 
    box-shadow: 0 0 0 1px hsl(accent / 0.25), inner glow
  - Lock icon container: animated pulse ring (CSS keyframe, slow 3s)
  - "Active" indicator: animated pulse dot (existing but needs glow)
  - Tag chips: styled with glass background
  - "Apply Now" arrow: animated on hover (translateX +2px)
  - A subtle top gradient overlay (accent→transparent, 20% opacity)
```

### 7. Markets Preview — Price Change Emphasis

Make the market list feel live and data-rich:

```text
BEFORE: rounded-xl bg-card/80 border border-border/50, simple rows

AFTER:
  - glass-card rounded-2xl container
  - Each pair row: hover state with left accent glow bar
  - Price: white-to-foreground, mono, larger (14px)
  - Change badge: increase border-radius to rounded-xl, add subtle inner glow
  - Positive: stronger success color + a micro up-arrow animation on hover
  - Volume: shown in smaller text, formatted as "$1.2K"
  - "View All" link: primary color with arrow, right-aligned
```

---

## Cross-Cutting Improvements

### Typography Hierarchy System

| Element | Current | After |
|---|---|---|
| Main balance | `text-[28px] font-bold text-foreground` | `text-[32px] font-extrabold bg-gradient text-transparent` |
| Section titles | `text-[14px] font-semibold text-foreground/75` | `text-[13px] font-bold uppercase tracking-widest text-muted-foreground` |
| Token values | `text-[13px] font-semibold text-foreground` | `text-[14px] font-bold tabular-nums text-foreground` |
| Sub-labels | `text-[11px] text-muted-foreground` | same, add `tracking-wide` |

### Micro-Interaction System

- **Balance toggle**: `transition-all duration-300` on the balance figure with a blur-out/in effect: `filter: blur(4px) → blur(0)` over 220ms
- **Button press**: `active:scale-[0.96] active:shadow-inner` on all tappable surfaces
- **Row hover**: `hover:bg-accent/[0.03]` + `hover:shadow-card` with a 150ms ease
- **Scroll-into-view**: each section gets `animate-fade-in` with staggered delays (0ms, 80ms, 160ms, 240ms...)

### Dark Mode Depth Layers

Add section-level ambient glows (not page-level, but per-card):

- Balance card: `bg-[radial-gradient(ellipse_at_50%_0%,hsl(186_100%_50%/0.12),transparent_70%)]` behind it
- Markets card: `bg-[radial-gradient(ellipse_at_100%_100%,hsl(245_80%_68%/0.08),transparent_70%)]`
- USDI Loan: `bg-[radial-gradient(ellipse_at_0%_100%,hsl(186_100%_50%/0.08),transparent_60%)]`

### Light Mode Elevation

Ensure all cards in light mode use the `glass-card` class (instead of `bg-card/80`) which already has the beautiful white glass shadow system defined in `index.css`. This single change dramatically improves light mode.

---

## Files to Modify

**Primary file:**
- `src/pages/astra/WalletPage.tsx` — All 7 sections redesigned

**Supporting (minor CSS additions if needed):**
- `src/index.css` — Add 2-3 new utility classes (`balance-hero-gradient`, `chain-badge-bsc`, `status-dot-live`) if not coverable with existing Tailwind utilities

---

## Implementation Sequence

1. On-Chain Balance Card (hero section — highest impact)
2. Action Grid (second-most visible — emoji to Lucide icons)
3. USDI Loan Card (mid-page anchor — needs gradient border + pulse)
4. On-Chain Assets list (longest section — row-level upgrades)
5. Trading Balances (exchange-grade treatment)
6. BSC Address block (branding upgrade)
7. Markets Preview (data emphasis upgrade)
8. Cross-cutting: typography, micro-interactions, section spacing

Each section is self-contained in the JSX of `WalletPage.tsx`, making this safe to implement incrementally without affecting other pages.
