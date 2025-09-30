# IPG I-SMART Brand System

## Phase 1: Brand & Logo System ✅

### Brand Assets Created

#### 1. Logo Mark (`brand/export/logo_mark.svg`)
- Circular coin design with IPG monogram
- Circuit pattern texture
- Primary color: #8853FF (hsl(248, 67%, 64%))
- Accent color: #00E5FF (hsl(186, 100%, 50%))
- **Usage**: App icons, favicons, standalone logo

#### 2. Wordmark (`brand/export/wordmark.svg`)
- "I-SMART" text with gradient
- Clean, modern typography
- **Usage**: Headers, marketing materials

#### 3. Horizontal Lockup (`brand/export/lockup_horizontal.svg`)
- Logo mark + wordmark combined
- Optimized for horizontal layouts
- **Usage**: Website headers, email signatures

### Animated Logo Components

#### 1. BrandSplash (`src/components/brand/BrandSplash.tsx`)
**Purpose**: First-time app load animation  
**Duration**: ~1.9s (800ms reduced motion)  
**Sequence**:
1. Radial glow fade-in (0-0.4s)
2. Logo coin 3D flip + scale-in (0.2-1.0s)
3. Wordmark mask-reveal left-to-right (0.8-1.6s)
4. Star spark pop + settle (1.0-1.6s)

**Features**:
- `data-testid="logo-splash"`
- Reduced motion: 200ms static reveal
- Skip after 1.5s with "Tap to skip" indicator
- Breathing glow effect during display

#### 2. BrandHeaderLogo (`src/components/brand/BrandHeaderLogo.tsx`)
**Purpose**: Interactive logo in app header  
**Size Variants**: small (24px), medium (32px), large (40px)  
**States**:
- **Idle**: 6s breathing glow (4-8% opacity sine wave)
- **Refresh**: 180° spin + cyan glow
- **Success**: Green ring pulse + 1.12x scale
- **Error**: Red rim + subtle shake

**Features**:
- `data-testid="logo-header"`
- Click opens "About IPG I-SMART" modal
- Hover: 1.05x scale
- Press: 0.95x scale
- Accessible focus ring

#### 3. BrandLoader (`src/components/brand/BrandLoader.tsx`)
**Purpose**: Loading indicator  
**Size Variants**: small (24px), medium (40px), large (64px)  
**Features**:
- `data-testid="logo-loader"`
- Rotating gradient ring (2.5s)
- Pulsing logo center (2s glow cycle)
- Label with fade animation
- Reduced motion: Horizontal progress bar

#### 4. BrandStamp (`src/components/brand/BrandStamp.tsx`)
**Purpose**: Result stamps for gamification  
**Types**: 
- **WIN**: Coin flip + confetti (1.5s, green)
- **LOSE**: Soft desaturate (0.9s, red)
- **CLAIMED**: Checkmark morph (1.2s, cyan)
- **PAID**: Checkmark morph (1.2s, green)

**Features**:
- `data-testid="logo-stamp"`
- Win confetti: 8 particles, staggered animation
- Reduced motion: No confetti, static animations

### Motion Principles

**Timings**:
- Micro-interactions: 120ms
- Standard transitions: 220ms
- Hero moments: 320ms+
- Easing: `cubic-bezier(0.22, 1, 0.36, 1)` (entrance)

**Performance Targets**:
- 60fps on mid-tier devices
- Only transform/opacity animations
- No layout thrash
- Total brand payload: ~350KB

### Accessibility

✅ AA contrast ratios  
✅ Visible focus rings  
✅ Keyboard navigation  
✅ `prefers-reduced-motion` respected  
✅ ARIA labels on interactive elements  

### Metadata Integration

**Favicons**:
- `/favicon.svg` - Vector logo
- `/icon-192.png` - PWA icon 192x192
- `/icon-512.png` - PWA icon 512x512
- `/apple-touch-icon.png` - iOS icon 180x180

**Open Graph**:
- Enhanced OG tags with image dimensions
- Site name and improved descriptions
- Twitter card support

**PWA Manifest**:
- Theme color: #8853FF
- Multiple icon sizes
- Mobile-optimized

### Design Tokens (Astra DS v2)

```css
--primary: hsl(248, 67%, 64%);      /* #8853FF */
--accent: hsl(186, 100%, 50%);       /* #00E5FF */
--success: hsl(154, 67%, 52%);       /* #2BD67B */
--warning: hsl(35, 85%, 60%);        /* #F7A53B */
--danger: hsl(0, 70%, 68%);          /* #FF5C5C */
```

### Next Steps: Phase 2

- [ ] Design system tokens update
- [ ] 12 new UI components (KPIChip, ProgramGrid, etc.)
- [ ] Grid layouts and responsive breakpoints
- [ ] Accessibility enhancements
