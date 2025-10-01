# Legacy Component Report
**Date**: 2025-01-15  
**Status**: 🔴 Critical - Legacy imports found in new design system

---

## 🚨 CRITICAL ISSUES

### Issue #1: Legacy Screens Mixed Into Astra Routes
**Impact**: Design inconsistency, user confusion, maintenance burden

#### Affected Routes (5)
```
/app/programs/bsk-bonus         → BSKPromotionScreen (Legacy)
/app/programs/subscriptions     → SubscriptionsScreen (Legacy)  
/app/programs/referrals         → ReferralsScreen (Legacy)
/app/programs/staking           → StakingScreen (Legacy)
/app/programs/achievements      → GamificationScreen (Legacy)
```

**Problem**:
- Users navigate from Astra grid → Legacy screen
- No CardLane, no GridViewport, no consistent styling
- Bottom dock present but content style breaks
- Mobile-first principles violated

**Solution**:
Rebuild each screen with Astra components:
```tsx
// Current (WRONG)
<Route path="programs/staking" element={<StakingScreen />} />

// Target (CORRECT)
<Route path="programs/staking" element={<StakingPageAstra />} />
// - Uses GridViewport
// - Uses CardLane for pools
// - Uses ProgramTile for staking options
// - Consistent with Programs grid
```

---

### Issue #2: Dual User App Systems
**Impact**: 64 user routes split across 2 systems

| System | Routes | Design | Status |
|--------|--------|--------|--------|
| Astra | 16 | ✅ Modern | Current |
| Legacy | 32 | ⚠️ Old | Deprecated |

**Migration Required**: 32 routes  
**Estimated Effort**: 4-6 weeks  
**Priority**: HIGH

---

### Issue #3: Admin Dual Systems
**Impact**: 34 admin routes split across 2 systems

| System | Routes | Design | Status |
|--------|--------|--------|--------|
| Nova | 14 | ✅ Modern | Current |
| Legacy | 20 | ⚠️ Old | Active |

**Migration Required**: 20 routes  
**Estimated Effort**: 6-8 weeks  
**Priority**: MEDIUM

**Note**: Some legacy admin screens have no Nova equivalent yet:
- Assets management
- Funding (crypto deposits/withdrawals)
- Fee management (needs dedicated page)
- Lucky draw admin
- Insurance admin
- Ads management
- Support center

---

## 📊 COMPONENT USAGE ANALYSIS

### Legacy Components Still in Use

#### User Screens (13)
1. `BSKPromotionScreen` - 2 instances (app + app-legacy)
2. `SubscriptionsScreen` - 2 instances (app + app-legacy)
3. `ReferralsScreen` - 2 instances (app + app-legacy)
4. `StakingScreen` - 2 instances (app + app-legacy)
5. `StakingDetailScreen` - 2 instances (app + app-legacy)
6. `GamificationScreen` - 2 instances (app + app-legacy)
7. `AppHomeScreen` - 1 instance (app-legacy only)
8. `WalletHomeScreen` - 1 instance (app-legacy only)
9. `DepositScreen` - 1 instance (app-legacy only)
10. `WithdrawScreen` - 1 instance (app-legacy only)
11. `MarketsScreen` - 1 instance (app-legacy only)
12. `ProgramsScreen` - 1 instance (app-legacy only)
13. `ISmartSpinScreen` - 1 instance (app-legacy only)

#### Admin Screens (20)
All in `/admin-legacy/*` namespace - see CSV for full list

### Astra Components (Clean ✅)
- `HomePageRebuilt` - Pure Astra
- `WalletPageRebuilt` - Pure Astra
- `ProgramsPageRebuilt` - Pure Astra (except 5 sub-programs)
- `TradingPageRebuilt` - Pure Astra
- `ProfilePageRebuilt` - Pure Astra
- `InsurancePage` - Pure Astra
- `SpinWheelPage` - Pure Astra
- `AdvertiseMiningPage` - Pure Astra

### Nova Admin Components (Clean ✅)
All Nova admin pages use correct components:
- CardLane ✅
- KPIStat ✅
- DataGridAdaptive ✅
- DetailSheet ✅
- No legacy imports ✅

---

## 🛠️ REMEDIATION CHECKLIST

### Immediate Actions (Week 1-2)
- [ ] Create `StakingPageAstra` using `GridViewport` + `CardLane`
- [ ] Create `SubscriptionsPageAstra` with tier cards
- [ ] Create `ReferralsPageAstra` with stats grid
- [ ] Create `BSKPromotionPageAstra` with promo banners
- [ ] Create `AchievementsPageAstra` with badge grid
- [ ] Update routes to use new Astra screens
- [ ] Add deprecation banner to `/app-legacy/*`

### Short-term Actions (Week 3-6)
- [ ] Complete remaining `/app-legacy` screen rebuilds
- [ ] Add automated redirects from legacy to new routes
- [ ] Update all documentation with new routes
- [ ] Create admin-facing migration guide

### Mid-term Actions (Week 7-12)
- [ ] Migrate 12 high-priority admin-legacy screens to Nova
- [ ] Build missing Nova admin pages (Assets, Funding, Ads, etc.)
- [ ] Create admin training materials
- [ ] Set sunset date for `/admin-legacy/*`

### Long-term Actions (Week 13-16)
- [ ] Remove all legacy code
- [ ] Clean up unused components
- [ ] Consolidate design tokens
- [ ] Final QA pass
- [ ] Performance audit

---

## 📐 DESIGN SYSTEM AUDIT

### Current State
```
User App:
├── Astra Design System (16 routes) ← PRIMARY
├── Legacy Design (32 routes)       ← DEPRECATED
└── Mixed (5 routes)                ← 🔴 FIX IMMEDIATELY

Admin Console:
├── Nova Design System (14 routes)  ← PRIMARY
└── Legacy Design (20 routes)       ← ACTIVE (no equiv yet)
```

### Target State (Week 16)
```
User App:
└── Astra Design System (100% routes) ← ONLY SYSTEM

Admin Console:
└── Nova Design System (100% routes)  ← ONLY SYSTEM
```

---

## ⚠️ BREAKING CHANGES

### User-Facing
1. **URL Changes**: `/app-legacy/*` → `/app/*`
   - Deep links may break
   - Email links need updating
   - Bookmarks need migration notice

2. **UI Changes**: Different navigation patterns
   - Users need onboarding for new UI
   - In-app tour recommended
   - Help docs need updating

### Admin-Facing
1. **URL Changes**: `/admin-legacy/*` → `/admin/*`
   - Internal tools need updating
   - Admin bookmarks affected

2. **Workflow Changes**: CMS-driven configuration
   - Training required
   - Permission model changes
   - New audit trail format

---

## 📈 SUCCESS CRITERIA

### Code Health
- [ ] Zero legacy imports in Astra routes
- [ ] Zero legacy imports in Nova routes
- [ ] Single design token file
- [ ] Component reuse > 70%
- [ ] Bundle size < 500KB (gzip)

### User Experience
- [ ] Consistent navigation across all routes
- [ ] All pages mobile-optimized (360-430px)
- [ ] Bottom dock on 100% of user routes
- [ ] Load time < 2s on 3G

### Admin Experience
- [ ] All configs editable via CMS
- [ ] Zero code deploys for content changes
- [ ] Audit trail on all changes
- [ ] Rollback tested and documented

---

## 🔍 MONITORING PLAN

### Week 1-4 (Astra Rollout)
Monitor:
- Error rate on new routes
- User bounce rate
- Session duration
- Feature usage (old vs new)

### Week 5-8 (Legacy Deprecation)
Monitor:
- Traffic on legacy routes
- Support tickets about UI changes
- User feedback sentiment
- Performance metrics

### Week 9-16 (Admin Migration)
Monitor:
- Admin task completion time
- CMS usage patterns
- Error rate on config changes
- Support tickets from admins

---

**End of Legacy Component Report**
