# 🚨 HOTFIX PRIORITY LIST
**Date**: 2025-01-15  
**Status**: CRITICAL  
**Impact**: 5 legacy screens breaking Astra UX

---

## PROBLEM STATEMENT

**Current State**: Users navigate from modern Astra grid (`/app/programs`) into legacy screens that:
- ❌ Don't use `GridViewport` or `CardLane`
- ❌ Break visual consistency
- ❌ Violate mobile-first principles
- ❌ Show wrong navigation patterns
- ❌ Confuse users with design shift

**Routes Affected**:
```
/app/programs/bsk-bonus         → BSKPromotionScreen (Legacy)
/app/programs/subscriptions     → SubscriptionsScreen (Legacy)
/app/programs/referrals         → ReferralsScreen (Legacy)
/app/programs/staking           → StakingScreen (Legacy)
/app/programs/staking/:id       → StakingDetailScreen (Legacy)
/app/programs/achievements      → GamificationScreen (Legacy)
```

**User Journey Break**:
```
User Flow:
1. /app/programs (Astra grid, beautiful) ✅
2. Click "Staking" tile
3. → /app/programs/staking (Legacy, breaks design) ❌
4. User confused - "Is this a different app?"
```

---

## HOTFIX TASKS

### HOTFIX-1: BSK Promotion
**Route**: `/app/programs/bsk-bonus`  
**Legacy**: `BSKPromotionScreen`  
**New**: `BSKPromotionPageAstra`  
**Est**: 3 days  
**Priority**: 🔴 CRITICAL

**Components to Create**:
- `BSKPromotionPageAstra` (page wrapper with GridViewport)
- `BSKPromotionBanner` (promo card in CardLane)
- `BSKPromotionHistory` (user's promotion claims)

**Design Pattern**:
```tsx
<GridViewport>
  <CardLane title="Active Promotions">
    <BSKPromotionBanner campaign={activeCampaign} />
  </CardLane>
  <CardLane title="Your Claims">
    <BSKPromotionHistory claims={userClaims} />
  </CardLane>
</GridViewport>
```

**Testids**: `page-programs-bsk-bonus`, `promotion-banner`, `promotion-history`

**Files to Create**:
- `src/pages/astra/BSKPromotionPage.tsx`
- `src/components/astra/BSKPromotionBanner.tsx`
- `src/components/astra/BSKPromotionHistory.tsx`

**Files to Update**:
- `src/config/routes.ts` (update route to new component)

---

### HOTFIX-2: Subscriptions
**Route**: `/app/programs/subscriptions`  
**Legacy**: `SubscriptionsScreen`  
**New**: `SubscriptionsPageAstra`  
**Est**: 3 days  
**Priority**: 🔴 CRITICAL

**Components to Create**:
- `SubscriptionsPageAstra` (page wrapper)
- `SubscriptionTile` (tier card with pricing)
- `SubscriptionBenefits` (benefits list)

**Design Pattern**:
```tsx
<GridViewport>
  <CardLane title="Subscription Tiers" layout="masonry">
    {tiers.map(tier => (
      <SubscriptionTile key={tier.id} tier={tier} />
    ))}
  </CardLane>
  <CardLane title="Your Subscription">
    <CurrentSubscriptionCard />
  </CardLane>
</GridViewport>
```

**Testids**: `page-programs-subscriptions`, `subscription-tier`, `current-subscription`

**Files to Create**:
- `src/pages/astra/SubscriptionsPage.tsx`
- `src/components/astra/SubscriptionTile.tsx`

---

### HOTFIX-3: Referrals
**Route**: `/app/programs/referrals`  
**Legacy**: `ReferralsScreen`  
**New**: `ReferralsPageAstra`  
**Est**: 4 days  
**Priority**: 🔴 CRITICAL

**Components to Create**:
- `ReferralsPageAstra` (page wrapper)
- `ReferralStatsCard` (earnings, count, etc.)
- `ReferralLinkCard` (copy link UI)
- `ReferralListCard` (referee list)

**Design Pattern**:
```tsx
<GridViewport>
  <KPIChipRow>
    <KPIChip label="Total Earnings" value={earnings} />
    <KPIChip label="Referrals" value={count} />
  </KPIChipRow>
  <CardLane title="Your Referral Link">
    <ReferralLinkCard link={referralLink} />
  </CardLane>
  <CardLane title="Your Referrals">
    <ReferralListCard referrals={referrals} />
  </CardLane>
</GridViewport>
```

**Testids**: `page-programs-referrals`, `referral-stats`, `referral-link`

**Files to Create**:
- `src/pages/astra/ReferralsPage.tsx`
- `src/components/astra/ReferralStatsCard.tsx`
- `src/components/astra/ReferralLinkCard.tsx`

---

### HOTFIX-4: Staking
**Route**: `/app/programs/staking`  
**Legacy**: `StakingScreen`  
**New**: `StakingPageAstra`  
**Est**: 4 days  
**Priority**: 🔴 CRITICAL

**Components to Create**:
- `StakingPageAstra` (page wrapper)
- `StakingPoolCard` (pool info, APY, stake button)
- `UserStakingCard` (user's active stakes)

**Design Pattern**:
```tsx
<GridViewport>
  <CardLane title="Staking Pools" layout="masonry">
    {pools.map(pool => (
      <StakingPoolCard 
        key={pool.id} 
        pool={pool}
        onClick={() => navigate(`/app/programs/staking/${pool.id}`)}
      />
    ))}
  </CardLane>
  <CardLane title="Your Stakes">
    <UserStakingCard stakes={userStakes} />
  </CardLane>
</GridViewport>
```

**Testids**: `page-programs-staking`, `staking-pool`, `user-stakes`

**Files to Create**:
- `src/pages/astra/StakingPage.tsx`
- `src/components/astra/StakingPoolCard.tsx`

---

### HOTFIX-5: Staking Detail
**Route**: `/app/programs/staking/:id`  
**Legacy**: `StakingDetailScreen`  
**New**: `StakingDetailPageAstra`  
**Est**: 3 days  
**Priority**: 🔴 CRITICAL  
**Depends**: HOTFIX-4

**Components to Create**:
- `StakingDetailPageAstra` (page wrapper)
- `StakeForm` (amount input, duration picker)
- `StakingRewardsCard` (rewards breakdown)

**Design Pattern**:
```tsx
<GridViewport>
  <CardLane title={pool.name}>
    <StakingPoolCard pool={pool} detailed />
  </CardLane>
  <CardLane title="Stake Now">
    <StakeForm poolId={poolId} />
  </CardLane>
  <CardLane title="Your Rewards">
    <StakingRewardsCard rewards={rewards} />
  </CardLane>
</GridViewport>
```

**Testids**: `page-programs-staking-detail`, `stake-form`, `rewards-card`

**Files to Create**:
- `src/pages/astra/StakingDetailPage.tsx`
- `src/components/astra/StakeForm.tsx`

---

### HOTFIX-6: Achievements
**Route**: `/app/programs/achievements`  
**Legacy**: `GamificationScreen`, `AchievementSystem`  
**New**: `AchievementsPageAstra`  
**Est**: 3 days  
**Priority**: 🔴 CRITICAL

**Components to Create**:
- `AchievementsPageAstra` (page wrapper)
- `AchievementBadge` (badge tile with unlock status)
- `DailyRewardsCard` (daily login rewards)

**Design Pattern**:
```tsx
<GridViewport>
  <KPIChipRow>
    <KPIChip label="Level" value={level} />
    <KPIChip label="XP" value={xp} />
    <KPIChip label="Achievements" value={unlockedCount} />
  </KPIChipRow>
  <CardLane title="Daily Rewards">
    <DailyRewardsCard streak={streak} />
  </CardLane>
  <CardLane title="Achievements" layout="masonry">
    {achievements.map(ach => (
      <AchievementBadge key={ach.id} achievement={ach} />
    ))}
  </CardLane>
</GridViewport>
```

**Testids**: `page-programs-achievements`, `achievement-badge`, `daily-rewards`

**Files to Create**:
- `src/pages/astra/AchievementsPage.tsx`
- `src/components/astra/AchievementBadge.tsx`

---

## IMPLEMENTATION ORDER

**Week 1** (5 days):
1. Day 1-2: HOTFIX-2 (Subscriptions) - Simplest
2. Day 3-4: HOTFIX-1 (BSK Promotion)
3. Day 5: HOTFIX-6 (Achievements)

**Week 2** (5 days):
1. Day 1-3: HOTFIX-4 (Staking)
2. Day 4-5: HOTFIX-5 (Staking Detail) - depends on HOTFIX-4
3. Day 6-7: HOTFIX-3 (Referrals) - Most complex

---

## ACCEPTANCE CRITERIA (ALL HOTFIXES)

### Design Consistency
- [ ] Uses `GridViewport` wrapper
- [ ] Uses `CardLane` for sections
- [ ] Uses `KPIChipRow` for stats (where applicable)
- [ ] Bottom dock navigation present
- [ ] Matches Astra color scheme
- [ ] Smooth transitions

### Mobile Responsive
- [ ] Tested at 360px width
- [ ] Tested at 390px width
- [ ] Tested at 430px width
- [ ] No horizontal scroll
- [ ] Touch targets ≥ 44px

### Functionality
- [ ] All data fetching works
- [ ] All actions work (stake, claim, copy link, etc.)
- [ ] Loading states shown
- [ ] Error states handled
- [ ] Empty states designed
- [ ] Toasts for success/error

### Code Quality
- [ ] TypeScript strict mode passes
- [ ] No console errors
- [ ] Components have testids
- [ ] Accessibility (ARIA labels)
- [ ] Performance (lazy loading where needed)

---

## ROLLOUT STRATEGY

### Phase 1: Staged Rollout
1. Deploy HOTFIX-2 first (least complex)
2. Monitor for 1 day
3. If stable, deploy HOTFIX-1 and HOTFIX-6
4. Monitor for 1 day
5. Deploy HOTFIX-4 and HOTFIX-5
6. Monitor for 1 day
7. Deploy HOTFIX-3 last

### Phase 2: User Communication
- [ ] In-app announcement: "New and improved program pages!"
- [ ] Highlight in changelog
- [ ] Social media posts (if applicable)

### Phase 3: Legacy Cleanup
**ONLY AFTER all hotfixes are stable**:
- [ ] Remove legacy component files
- [ ] Remove legacy routes from config
- [ ] Update all internal links
- [ ] Delete unused imports

---

## RISK MITIGATION

### High Risk
**Risk**: User data loss during migration  
**Mitigation**: 
- All new pages use same API endpoints
- No database changes required
- Existing data flows unchanged

### Medium Risk
**Risk**: Breaking staking/referral functionality  
**Mitigation**:
- Keep legacy routes as `/app-legacy/programs/*` for rollback
- Feature flag for gradual rollout
- Monitor error rates

### Low Risk
**Risk**: Design inconsistency  
**Mitigation**:
- Design review before each PR
- Screenshot comparisons
- Design system tokens enforced

---

## SUCCESS METRICS

### User Experience
- [ ] Bounce rate on program pages < 5%
- [ ] Session duration increases > 10%
- [ ] Navigation path clarity (no back-forth between legacy/new)

### Technical
- [ ] Zero legacy imports in `/app/programs/*` routes
- [ ] Page load time < 2s
- [ ] Mobile Lighthouse score > 90

### Business
- [ ] Staking participation increases (no drop-off)
- [ ] Referral link shares increase
- [ ] Subscription conversions stable or increase

---

**End of Hotfix Priority List**
