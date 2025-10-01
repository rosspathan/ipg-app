# i-SMART Migration Plan
**Generated**: 2025-01-15  
**Goal**: Complete transition to Astra (User) + Nova (Admin)

---

## Phase 1: Complete Astra User App (Priority: HIGH)

### 1.1 Rebuild Legacy Screens in Astra (5 screens)
**ETA**: 2-3 weeks

| Screen | Current | Target | Complexity | Dependencies |
|--------|---------|--------|------------|--------------|
| BSKPromotionScreen | Legacy | Astra | Medium | Program Registry |
| SubscriptionsScreen | Legacy | Astra | Medium | Subscription API |
| ReferralsScreen | Legacy | Astra | High | Referral system |
| StakingScreen | Legacy | Astra | High | Staking contracts |
| GamificationScreen | Legacy | Astra | Medium | Achievement system |

**Design Pattern**: Use `ProgramTile` + `CardLane` + `GridViewport`  
**Components Needed**:
- `SubscriptionTile` (new)
- `StakingPoolCard` (new)
- `AchievementBadge` (new)
- `ReferralStatsCard` (new)

### 1.2 Deprecate /app-legacy Routes
**ETA**: 1 week (after 1.1 complete)

1. Add deprecation banner to all `/app-legacy/*` routes
2. Set sunset date (e.g., 60 days)
3. Add "Try New App" button → `/app` equivalent
4. Update all internal links to point to `/app/*`
5. Add redirect after sunset date

**Banner Message**:
```
⚠️ This version is deprecated. Try the new app at /app/[page] 
for better performance and features. This version will be 
removed on [DATE].
```

---

## Phase 2: Complete Nova Admin Console (Priority: MEDIUM)

### 2.1 Migrate Admin-Legacy Screens (12 screens)
**ETA**: 3-4 weeks

#### High Priority (Core Operations)
| Screen | Nova Equivalent | Notes |
|--------|-----------------|-------|
| AdminAssets | Create AdminAssetsNova | Token/asset management |
| AdminMarkets | Enhance AdminMarketsNova | Add pair management |
| AdminFunding | Create AdminFundingNova | Crypto deposits/withdrawals |
| AdminFees | Integrate into AdminSettingsNova | Fee management |
| AdminReferralProgram | Create AdminReferralsNova | Referral config |

#### Medium Priority (Features)
| Screen | Nova Equivalent | Notes |
|--------|-----------------|-------|
| AdminAdsScreen | Create AdminAdsNova | Ad inventory |
| AdminInsurance | Create AdminInsuranceNova | Insurance plans |
| AdminNewLuckyDraw | Create AdminLuckyDrawNova | Draw management |
| AdminTeamReferralsScreen | Merge into AdminReferralsNova | Team structure |

#### Low Priority (Support/System)
| Screen | Nova Equivalent | Notes |
|--------|-----------------|-------|
| AdminSupportScreen | Create AdminSupportNova | Support tickets |
| AdminNotificationsScreen | Create AdminNotificationsNova | Push notifications |
| AdminMarketFeedScreen | Integrate into AdminMarketsNova | Market data feeds |

### 2.2 Enhance Nova Components
**ETA**: 1 week

Add missing Nova components:
- `TokenManager` - Add/edit tokens with logo upload
- `PairManager` - Create/manage trading pairs
- `FeeRuleBuilder` - Visual fee rule creator
- `BulkActionBar` - Bulk operations for DataGrid
- `AdvancedFilters` - Complex filter builder

---

## Phase 3: Program Registry CMS Enhancements (Priority: LOW)

### 3.1 Add Missing Features
**ETA**: 2 weeks

- **Multi-environment configs** - Dev, staging, prod
- **A/B testing** - Split test configs
- **Analytics integration** - Track program performance
- **Template library** - Pre-built program templates
- **Import/export** - JSON export/import configs
- **Access control** - Role-based permissions for editing

### 3.2 Documentation
**ETA**: 1 week

Create admin guides:
- "How to Add a New Program"
- "How to Schedule a Feature Launch"
- "How to Use Region/Role Flags"
- "Understanding Version Control"
- "Reading Audit Trails"

---

## Phase 4: Componentization & DRY (Priority: LOW)

### 4.1 Extract Shared Components
**ETA**: 1 week

Create context-aware variants:

```tsx
// Example: Staking screen with variant
<StakingScreen 
  variant="user"  // or "admin"
  mode="view"     // or "edit"
/>
```

Affected components:
- `TradingScreenRebuilt` - Already shared
- `SubscriptionsScreen` - Add admin variant
- `StakingScreen` - Add admin variant
- `ReferralsScreen` - Add admin variant

### 4.2 Consolidate Design Tokens
**ETA**: 3 days

- Merge `tokens.ts` and `nova-admin-tokens.ts`
- Single source of truth for colors, spacing, typography
- Generate theme variants (light/dark, user/admin)

---

## Phase 5: Testing & Quality Assurance

### 5.1 Add testids to All Pages
**Missing testids** (13 pages):
- Astra: Insurance, Spin, Ads pages
- Admin-legacy: All 20 screens

Pattern:
```tsx
data-testid="page-[section]-[name]"
// Examples:
// page-programs-insurance
// page-admin-assets
```

### 5.2 E2E Testing
Create test suites:
- User onboarding flow
- Program navigation (Astra)
- CMS operations (Nova admin)
- Trading flow
- Deposit/withdraw flow

---

## Timeline Summary

| Phase | Duration | Start | End | Status |
|-------|----------|-------|-----|--------|
| Phase 1: Astra Completion | 3-4 weeks | Week 1 | Week 4 | 🔴 Not Started |
| Phase 2: Nova Completion | 4-5 weeks | Week 5 | Week 9 | 🔴 Not Started |
| Phase 3: CMS Enhancements | 3 weeks | Week 10 | Week 12 | 🔴 Not Started |
| Phase 4: Componentization | 1.5 weeks | Week 13 | Week 14 | 🔴 Not Started |
| Phase 5: QA & Testing | 2 weeks | Week 15 | Week 16 | 🔴 Not Started |

**Total Estimated Duration**: 16 weeks (~4 months)

---

## Success Metrics

### User Metrics
- [ ] All user routes use Astra design system
- [ ] /app-legacy routes deprecated and removed
- [ ] Mobile load time < 2s (Lighthouse score > 90)
- [ ] Bottom dock navigation on 100% of routes
- [ ] All programs managed via CMS

### Admin Metrics
- [ ] All admin routes use Nova design system
- [ ] /admin-legacy routes removed
- [ ] Schema-driven forms for all configs
- [ ] Audit trail coverage 100%
- [ ] CMS documentation complete

### Code Quality
- [ ] Zero duplicate design tokens
- [ ] All pages have testids
- [ ] E2E test coverage > 80%
- [ ] Component reuse > 60%
- [ ] TypeScript strict mode enabled

---

## Risk Mitigation

### High Risk
**Risk**: Breaking existing user workflows during Astra migration  
**Mitigation**: 
- Run both /app and /app-legacy in parallel
- Gradual rollout with feature flags
- Monitor error rates + user feedback
- Easy rollback mechanism

### Medium Risk
**Risk**: Data loss during CMS migration  
**Mitigation**:
- Database snapshots before changes
- Test on staging environment first
- Audit trail tracks all changes
- Rollback functionality tested

### Low Risk
**Risk**: Admin learning curve for CMS  
**Mitigation**:
- Comprehensive documentation
- Video tutorials
- Staging environment for practice
- In-app tooltips and help

---

**End of Migration Plan**
