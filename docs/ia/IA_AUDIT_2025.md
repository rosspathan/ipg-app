# i-SMART Information Architecture Audit
**Generated**: 2025-01-15  
**Scope**: Complete route inventory + component analysis  
**Status**: Mobile-first hybrid (Legacy + Nova Admin + Astra User)

---

## Executive Summary
- **Total Routes**: 96 (58 user, 28 admin, 10 utility/auth)
- **Active Design Systems**: 3 (Legacy, Nova Admin, Astra User)
- **Architecture Pattern**: CMS-driven with Program Registry (database-backed)
- **Navigation**: Bottom dock (mobile-first), adaptive grids, card lanes

---

## 1. USER APP ROUTES

### 1.1 Onboarding & Auth (10 routes)
| Route | Component | Purpose | Design System | Has Dock? | Notes |
|-------|-----------|---------|---------------|-----------|-------|
| `/` | Navigate | Root redirect | - | No | → /onboarding |
| `/splash` | SplashScreen | Brand intro | Legacy | No | Logo animation |
| `/welcome` | WelcomeScreen | Welcome carousel | Legacy | No | Multi-step |
| `/welcome-[1-3]` | WelcomeScreen[1-3] | Feature highlights | Legacy | No | 3 screens |
| `/onboarding` | OnboardingFlow | Main onboarding | Legacy | No | Wizard pattern |
| `/onboarding/create-wallet` | CreateWalletScreen | New wallet setup | Legacy | No | Seed phrase gen |
| `/onboarding/import-wallet` | ImportWalletScreen | Import existing | Legacy | No | Seed phrase input |
| `/onboarding/security` | SecuritySetupScreen | PIN/biometric | Legacy | No | Multi-step |
| `/auth/login` | AuthLoginScreen | Email/password login | Legacy | No | AuthProviderUser |
| `/auth/register` | AuthRegisterScreen | Account creation | Legacy | No | Email verification |

### 1.2 App - Astra Design System (16 routes)
**Shell**: `AstraLayout` → Bottom dock (Home, Wallet, Programs, Trade, Profile)

| Route | Component | Purpose | Grid? | Card-Lane? | Dock? | testid |
|-------|-----------|---------|-------|------------|-------|--------|
| `/app/home` | HomePageRebuilt | Dashboard | ✅ | ✅ | ✅ | page-home |
| `/app/wallet` | WalletPageRebuilt | Balance view | ✅ | ✅ | ✅ | page-wallet |
| `/app/programs` | ProgramsPageRebuilt | Program grid | ✅ | ✅ | ✅ | page-programs |
| `/app/trade` | TradingScreenRebuilt | Live trading | ✅ | ❌ | ✅ | page-trading |
| `/app/profile` | ProfilePageRebuilt | User settings | ✅ | ✅ | ✅ | page-profile |
| `/app/programs/insurance` | InsurancePage | Insurance plans | ✅ | ✅ | ✅ | - |
| `/app/programs/spin` | SpinWheelPage | Spin wheel game | ✅ | ❌ | ✅ | - |
| `/app/programs/ads` | AdvertiseMiningPage | Ad mining | ✅ | ✅ | ✅ | - |
| `/app/programs/bsk-bonus` | BSKPromotionScreen | BSK promo | ❌ | ❌ | ✅ | **Legacy** |
| `/app/programs/subscriptions` | SubscriptionsScreen | Subscription list | ❌ | ❌ | ✅ | **Legacy** |
| `/app/programs/referrals` | ReferralsScreen | Referral dashboard | ❌ | ❌ | ✅ | **Legacy** |
| `/app/programs/staking` | StakingScreen | Staking pools | ❌ | ❌ | ✅ | **Legacy** |
| `/app/programs/staking/:id` | StakingDetailScreen | Pool detail | ❌ | ❌ | ✅ | **Legacy** |
| `/app/programs/achievements` | GamificationScreen | Gamification | ❌ | ❌ | ✅ | **Legacy** |
| `/app/design-review` | DesignReview | Design audit | ✅ | ✅ | ✅ | - |

**Key Components (Astra)**:
- `AppShellGlass` - Top bar + content wrapper (glass morphism)
- `CardLane` - Horizontal scroll lanes for KPIs/tiles
- `GridViewport` - Main grid container
- `ProgramTile` - Program card component
- `BalanceCluster` - Balance display widget
- `KPIChip` - Inline stats chips

### 1.3 App-Legacy (32 routes)
**Shell**: `UserLayout` → Classic layout (top nav + bottom bar)

| Route | Component | Purpose | Card-Lane? | Dock? | Notes |
|-------|-----------|---------|------------|-------|-------|
| `/app-legacy/home` | AppHomeScreen | Home dashboard | ❌ | ✅ | Classic cards |
| `/app-legacy/wallet` | WalletHomeScreen | Wallet main | ❌ | ✅ | Asset list |
| `/app-legacy/wallet/deposit` | DepositScreen | Crypto deposit | ❌ | ✅ | QR code |
| `/app-legacy/wallet/withdraw` | WithdrawScreen | Crypto withdraw | ❌ | ✅ | Address input |
| `/app-legacy/wallet/send` | SendScreen | P2P send | ❌ | ✅ | - |
| `/app-legacy/wallet/transfer` | TransferScreen | Internal transfer | ❌ | ✅ | - |
| `/app-legacy/wallet/history` | HistoryScreen | Transaction log | ❌ | ✅ | Table/list |
| `/app-legacy/markets` | MarketsScreen | Market list | ❌ | ✅ | Crypto pairs |
| `/app-legacy/markets/:pair` | MarketDetailScreen | Pair chart | ❌ | ✅ | TradingView |
| `/app-legacy/trade` | TradingScreenRebuilt | Trading UI | ❌ | ✅ | Order book |
| `/app-legacy/trade/:pair` | TradingScreenRebuilt | Pair trading | ❌ | ✅ | - |
| `/app-legacy/trade/receipt` | TradeReceiptScreen | Order receipt | ❌ | ✅ | - |
| `/app-legacy/trade/confirmation` | OrderConfirmationScreen | Trade confirm | ❌ | ✅ | - |
| `/app-legacy/swap` | SwapScreen | Token swap | ❌ | ✅ | - |
| `/app-legacy/programs` | ProgramsScreen | Program catalog | ❌ | ✅ | Grid cards |
| `/app-legacy/programs/spin` | ISmartSpinScreen | Spin wheel | ❌ | ✅ | Canvas wheel |
| `/app-legacy/programs/spin/history` | SpinHistoryScreen | Spin history | ❌ | ✅ | - |
| `/app-legacy/programs/bsk-bonus` | BSKPromotionScreen | BSK bonus | ❌ | ✅ | Promo banners |
| `/app-legacy/programs/ads` | AdvertisingMiningScreen | Ad mining | ❌ | ✅ | Video ads |
| `/app-legacy/programs/subscriptions` | SubscriptionsScreen | Subscription tiers | ❌ | ✅ | Pricing cards |
| `/app-legacy/programs/referrals` | ReferralsScreen | Referral program | ❌ | ✅ | Code + stats |
| `/app-legacy/programs/staking` | StakingScreen | Staking pools | ❌ | ✅ | Pool cards |
| `/app-legacy/programs/staking/:id` | StakingDetailScreen | Stake detail | ❌ | ✅ | APR + actions |
| `/app-legacy/programs/lucky` | NewLuckyDraw | Lucky draw | ❌ | ✅ | Draw UI |
| `/app-legacy/programs/insurance` | InsuranceScreen | Insurance | ❌ | ✅ | Plans + claims |
| `/app-legacy/programs/insurance/claim` | FileClaimScreen | File claim | ❌ | ✅ | Form |
| `/app-legacy/programs/achievements` | GamificationScreen | Achievements | ❌ | ✅ | Badge list |
| `/app-legacy/loans` | BSKLoansScreen | BSK loans | ❌ | ✅ | Loan options |
| `/app-legacy/bsk-vesting` | BSKVestingScreen | Vesting schedule | ❌ | ✅ | Timeline |
| `/app-legacy/deposit/inr` | INRDepositScreen | INR deposit | ❌ | ✅ | Bank details |
| `/app-legacy/withdraw/inr` | INRWithdrawScreen | INR withdraw | ❌ | ✅ | Bank + UPI |
| `/app-legacy/profile` | ProfileScreen | User profile | ❌ | ✅ | Tabs UI |
| `/app-legacy/support` | SupportScreen | Support tickets | ❌ | ✅ | Ticket list |
| `/app-legacy/support/t/:id` | SupportTicketScreen | Ticket detail | ❌ | ✅ | Thread view |
| `/app-legacy/notifications` | NotificationsScreen | Notifications | ❌ | ✅ | List + filters |

---

## 2. ADMIN CONSOLE ROUTES

### 2.1 Admin - Nova Design System (14 routes)
**Shell**: `AdminShellAdaptive` → Top header (logo + search + notifications) + Bottom dock (5 tabs)

| Route | Component | Purpose | Grid? | Card-Lane? | Dock? | testid |
|-------|-----------|---------|-------|------------|-------|--------|
| `/admin` | AdminDashboardNova | Main dashboard | ❌ | ✅ | ✅ | page-admin-home |
| `/admin/dashboard` | AdminDashboardNova | Dashboard (alias) | ❌ | ✅ | ✅ | page-admin-home |
| `/admin/users` | AdminUsersManagementNova | User management | ✅ | ✅ | ✅ | page-admin-users-management |
| `/admin/markets` | AdminMarketsNova | Markets admin | ✅ | ❌ | ✅ | page-admin-markets |
| `/admin/programs` | AdminProgramsNova | Program catalog | ❌ | ✅ | ✅ | programs-catalog |
| `/admin/programs/:moduleId` | AdminProgramEditorNova | Program editor | ❌ | ❌ | ✅ | program-editor |
| `/admin/subscriptions` | AdminSubscriptionsNova | Sub management | ❌ | ✅ | ✅ | page-admin-subscriptions |
| `/admin/staking` | AdminStakingNova | Staking admin | ❌ | ✅ | ✅ | page-admin-staking |
| `/admin/spin` | AdminSpinNova | Spin wheel admin | ❌ | ✅ | ✅ | page-admin-spin |
| `/admin/reports` | AdminReportsNova | Reports dashboard | ❌ | ✅ | ✅ | page-admin-reports |
| `/admin/settings` | AdminSettingsNova | Settings | ❌ | ❌ | ✅ | page-admin-settings |

**Nova Admin Components**:
- `AdminShellAdaptive` - Mobile-first shell (header + dock)
- `DockAdmin` - Bottom 5-tab navigation (Overview, Users, Programs, Markets, Reports)
- `CardLane` - Horizontal scroll KPI lanes
- `KPIStat` - Stat widget (value, delta, sparkline)
- `DataGridAdaptive` - Mobile-responsive data table
- `DetailSheet` - Slide-up detail/edit panel
- `FilterChips` - Quick filter chips
- `RecordCard` - List item card
- `SchemaForm` - JSON Schema-driven forms (for CMS)
- `AuditTrailViewer` - Audit log component

**Program Registry CMS Features**:
- Schema-driven config forms
- Version control + rollback
- Region/role flags
- Preview before publish
- Audit trail (who/when/what)

### 2.2 Admin-Legacy (20 routes)
**Shell**: `AdminLayout` → Desktop sidebar + top bar (old design)

| Route | Component | Purpose | Notes |
|-------|-----------|---------|-------|
| `/admin-legacy` | AdminDashboard | Legacy dashboard | **Migrate to Nova** |
| `/admin-legacy/users` | AdminUsers | User list | **Migrate to Nova** |
| `/admin-legacy/assets` | AdminAssets | Asset management | No Nova equiv |
| `/admin-legacy/markets` | AdminMarkets | Markets config | No Nova equiv |
| `/admin-legacy/funding` | AdminFunding | Funding ops | No Nova equiv |
| `/admin-legacy/funding/inr` | AdminINRFundingScreen | INR deposits | No Nova equiv |
| `/admin-legacy/subscriptions` | AdminSubscriptions | Sub admin | Migrated |
| `/admin-legacy/referrals` | AdminReferralProgram | Referral config | No Nova equiv |
| `/admin-legacy/team-referrals` | AdminTeamReferralsScreen | Team referrals | No Nova equiv |
| `/admin-legacy/staking` | AdminStaking | Staking admin | Migrated |
| `/admin-legacy/lucky` | AdminNewLuckyDraw | Lucky draw admin | No Nova equiv |
| `/admin-legacy/insurance` | AdminInsurance | Insurance admin | No Nova equiv |
| `/admin-legacy/ads` | AdminAdsScreen | Ad management | No Nova equiv |
| `/admin-legacy/fees` | AdminFees | Fee settings | No Nova equiv |
| `/admin-legacy/trading-fees` | AdminTradingFeesSimple | Trading fees | No Nova equiv |
| `/admin-legacy/trading-settings` | AdminTradingSettings | Trading config | No Nova equiv |
| `/admin-legacy/support` | AdminSupportScreen | Support center | No Nova equiv |
| `/admin-legacy/support/t/:id` | AdminSupportTicketScreen | Ticket detail | No Nova equiv |
| `/admin-legacy/notifications` | AdminNotificationsScreen | Notifications | No Nova equiv |
| `/admin-legacy/system` | AdminSystemScreen | System settings | Migrated |
| `/admin-legacy/market-feed` | AdminMarketFeedScreen | Market feed | No Nova equiv |

---

## 3. UTILITY & AUTH ROUTES (10 routes)
| Route | Component | Purpose | Notes |
|-------|-----------|---------|-------|
| `/admin/login` | AdminLoginScreen | Admin auth | Email + Web3 wallet |
| `/auth/lock` | AppLockScreen | Lock screen | PIN/biometric |
| `/email-verification` | EmailVerificationScreen | Email verify | OTP input |
| `/email-verified` | EmailVerifiedScreen | Verified success | - |
| `/reset-password` | ResetPasswordScreen | Password reset | - |
| `/recovery/verify` | RecoveryVerifyScreen | Recovery phrase | - |
| `/debug/catalog` | DebugCatalogScreen | Debug catalog | Dev only |
| `/debug/funding` | DebugFunding | Debug funding | Dev only |
| `/debug/admin-test` | AdminCredentialsTest | Credential test | Dev only |

---

## 4. DESIGN SYSTEM COMPARISON

| Feature | Legacy (User) | Astra (User) | Nova (Admin) |
|---------|---------------|--------------|--------------|
| **Shell Component** | UserLayout | AstraLayout | AdminShellAdaptive |
| **Navigation** | Top + Bottom Bar | Bottom Dock (5 tabs) | Bottom Dock (5 tabs) |
| **Grid System** | ❌ | ✅ GridViewport | ✅ DataGridAdaptive |
| **Card Pattern** | Basic Card | ProgramTile + CardLane | RecordCard + CardLane |
| **KPI Display** | Manual | KPIChip | KPIStat |
| **Forms** | Shadcn forms | Shadcn forms | SchemaForm (JSON Schema) |
| **Responsive** | Mixed | Mobile-first | Mobile-first |
| **Theming** | Basic purple | Purple+Holographic | Purple+Gradient |
| **Animations** | Minimal | Slide + Fade | Slide + Blur |

---

## 5. SHARED COMPONENTS (Cross-context)

These components appear in BOTH user and admin contexts:
- `TradingScreenRebuilt` - Used in /app/trade and legacy trading
- `SubscriptionsScreen` - Used in both user programs and admin
- `StakingScreen` - Shared between user and admin views
- `ReferralsScreen` - Shared component
- `BSKPromotionScreen` - Shared BSK promotion UI
- `GamificationScreen` - Achievements (user-only currently)

---

## 6. LEGACY IMPORTS REPORT

### 6.1 Pages Still Using Legacy Layout
✅ **Clean** - All Nova admin pages use `AdminShellAdaptive`  
✅ **Clean** - All Astra user pages use `AstraLayout`  
⚠️ **Warning** - `/app-legacy/*` routes still using `UserLayout` (32 routes)

### 6.2 Components Without CardLane (Should Have)
- `AdminMarketsNova` - Uses DataGridAdaptive (acceptable)
- `AdminProgramEditorNova` - Form-heavy (acceptable)
- `AdminSettingsNova` - Settings list (acceptable)

### 6.3 Legacy Components in Astra Routes
- `BSKPromotionScreen` - Still used in /app/programs/bsk-bonus
- `SubscriptionsScreen` - Still used in /app/programs/subscriptions
- `ReferralsScreen` - Still used in /app/programs/referrals
- `StakingScreen` - Still used in /app/programs/staking
- `GamificationScreen` - Still used in /app/programs/achievements

**Recommendation**: Rebuild these 5 screens with Astra design system for consistency.

---

## 7. NAVIGATION PATTERNS

### 7.1 User App Navigation (Astra)
```
Bottom Dock (5 tabs):
├── Home (/)
├── Wallet (/wallet)
├── Programs (/programs) ← Center "add" button
├── Trade (/trade)
└── Profile (/profile)

Programs Grid Navigation:
└── /programs
    ├── /programs/insurance
    ├── /programs/spin
    ├── /programs/ads
    ├── /programs/bsk-bonus
    ├── /programs/subscriptions
    ├── /programs/referrals
    ├── /programs/staking
    └── /programs/achievements
```

### 7.2 Admin Navigation (Nova)
```
Bottom Dock (5 tabs):
├── Overview (/) ← Dashboard
├── Users (/users)
├── Programs (/programs) ← Center "+" button (Quick Add)
├── Markets (/markets)
└── Reports (/reports)

Quick Add Menu:
├── New Program
├── List Token
├── Manage Users
├── Settings
└── Reports

Settings (accessible from /)
```

---

## 8. DATABASE-DRIVEN CMS ARCHITECTURE

### 8.1 Program Registry Tables
- `program_modules` - Program catalog (key, name, category, icon, route, status, regions, roles)
- `program_configs` - Versioned configs (module_id, version, config_json, schema_json, status, effective dates)
- `program_audit` - Change log (who, when, what, before/after diffs)

### 8.2 CMS Features
✅ **Schema-driven forms** - JSON Schema → React form (SchemaForm.tsx)  
✅ **Version control** - Multiple config versions per module  
✅ **Scheduling** - effective_from/effective_to timestamps  
✅ **Region/role flags** - enabled_regions[], enabled_roles[]  
✅ **Preview mode** - Test config before publish  
✅ **Rollback** - Restore any previous version  
✅ **Audit trail** - Complete change history

### 8.3 Admin Can Control
- Add/remove programs from user catalog
- Edit program settings via schema forms
- Enable/disable by region or user role
- Schedule program launches
- Preview changes before going live
- View full audit history

---

## 9. KEY FINDINGS

### 9.1 Strengths
✅ Mobile-first design (bottom docks, card lanes, responsive grids)  
✅ CMS architecture with Program Registry (database-backed)  
✅ Consistent Nova design system for admin  
✅ Astra design system bringing modern UX to user app  
✅ Schema-driven forms reduce admin dev time  
✅ Audit trail for compliance  
✅ Preview + rollback for safety  

### 9.2 Issues
⚠️ **Dual user systems** - `/app` (Astra) and `/app-legacy` causing confusion  
⚠️ **32 legacy routes** still active, need migration  
⚠️ **5 legacy components** mixed into Astra routes  
⚠️ **Admin-legacy** has 20 routes not migrated to Nova  
⚠️ **Shared components** (StakingScreen, etc.) need variant props for context  

### 9.3 Recommendations
1. **Complete Astra migration** - Rebuild 5 legacy screens (BSKPromotion, Subscriptions, Referrals, Staking, Gamification)
2. **Deprecate /app-legacy** - Add banner "Use new app at /app" + sunset date
3. **Complete Nova admin** - Migrate remaining 12 admin-legacy screens
4. **Componentize shared screens** - Add `variant="user"|"admin"` props to StakingScreen, etc.
5. **Documentation** - Create "How to add a program" guide for admins

---

## 10. COMPONENT INVENTORY

### 10.1 Nova Admin Components (11)
- `AdminShellAdaptive` - Main shell wrapper
- `DockAdmin` - Bottom navigation dock
- `CardLane` - Horizontal scroll lanes
- `KPIStat` - Metric widget with sparkline
- `DataGridAdaptive` - Mobile data table
- `DetailSheet` - Slide-up detail panel
- `FilterChips` - Filter chip bar
- `FilterSheet` - Full filter drawer
- `RecordCard` - List item card
- `SchemaForm` - JSON Schema → form
- `AuditTrailViewer` - Audit log viewer
- `BrandLogoBlink` - Animated logo (shared)

### 10.2 Astra User Components (12)
- `AstraLayout` - Main shell
- `AppShellGlass` - Glass morphism shell
- `CardLane` - Horizontal lanes
- `GridViewport` - Grid container
- `ProgramTile` - Program card
- `BalanceCluster` - Balance widget
- `KPIChip` - Inline KPI
- `ChartCard` - Chart widget
- `ActivityRow` - Activity list item
- `QuickSwitch` - Quick toggle
- `AnnouncementCarousel` - Announcement slider
- `Marquee` - Scrolling marquee

### 10.3 Shared Components (Shadcn + Custom)
- All Shadcn UI components (button, card, dialog, sheet, tabs, etc.)
- `TradingScreenRebuilt` - Trading interface
- `TradingViewWidget` - TradingView embed
- Various legacy screens still in use

---

## 11. TESTID COVERAGE

### Admin Nova Pages (9/11 have testids)
- ✅ `page-admin-home`
- ✅ `page-admin-users-management`
- ✅ `page-admin-markets`
- ✅ `programs-catalog`
- ✅ `program-editor`
- ✅ `page-admin-subscriptions`
- ✅ `page-admin-staking`
- ✅ `page-admin-spin`
- ✅ `page-admin-reports`
- ✅ `page-admin-settings`
- ❌ Missing: admin-users (older nova page)

### Astra User Pages (5/8 have testids)
- ✅ `page-home`
- ✅ `page-wallet`
- ✅ `page-programs`
- ✅ `page-trading`
- ✅ `page-profile`
- ❌ Missing: insurance, spin, ads pages

### Legacy Pages
- ❌ No testids (legacy code)

---

**End of IA Audit**
