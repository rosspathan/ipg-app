# i-SMART Migration Checklist
**Generated**: 2025-01-15  
**Total Tasks**: 42 (6 hotfix + 18 user + 14 admin + 4 cleanup)

---

## 🚨 HOTFIX BATCH (Week 1)
**Priority**: CRITICAL  
**Goal**: Remove legacy components from /app/programs/* routes  
**Duration**: 2 weeks

- [ ] **HOTFIX-1**: BSK Promotion → BSKPromotionPageAstra (3d)
- [ ] **HOTFIX-2**: Subscriptions → SubscriptionsPageAstra (3d)
- [ ] **HOTFIX-3**: Referrals → ReferralsPageAstra (4d)
- [ ] **HOTFIX-4**: Staking → StakingPageAstra (4d)
- [ ] **HOTFIX-5**: Staking Detail → StakingDetailPageAstra (3d) *depends on HOTFIX-4*
- [ ] **HOTFIX-6**: Achievements → AchievementsPageAstra (3d)

**Acceptance Criteria**:
- [ ] All /app/programs/* routes use Astra design system
- [ ] No legacy component imports in Astra routes
- [ ] GridViewport + CardLane pattern consistent
- [ ] Bottom dock present on all pages
- [ ] Mobile responsive (360-430px tested)

---

## 📱 USER BATCH 1 (Week 3-4)
**Priority**: HIGH  
**Focus**: Wallet operations  
**Duration**: 2 weeks

- [ ] **U1-1**: /app-legacy/home → Redirect to /app/home (1d)
- [ ] **U1-2**: /app-legacy/wallet → Redirect to /app/wallet (1d)
- [ ] **U1-3**: Deposit → DepositPageAstra (3d)
- [ ] **U1-4**: Withdraw → WithdrawPageAstra (3d)
- [ ] **U1-5**: Send → SendPageAstra (2d)
- [ ] **U1-6**: Transfer → TransferPageAstra (2d)
- [ ] **U1-7**: Swap → SwapPageAstra (3d)
- [ ] **U1-8**: History → HistoryPageAstra (3d)

**Acceptance Criteria**:
- [ ] All wallet operations in Astra design system
- [ ] QR code generation works
- [ ] Address validation functional
- [ ] Fee estimation accurate
- [ ] Transaction history with filters

---

## 📱 USER BATCH 2 (Week 5-6)
**Priority**: MEDIUM  
**Focus**: Markets & Programs  
**Duration**: 2 weeks

- [ ] **U2-1**: Markets → MarketsPageAstra (3d)
- [ ] **U2-2**: Market Detail → MarketDetailPageAstra (3d) *depends on U2-1*
- [ ] **U2-3**: /app-legacy/programs → Redirect to /app/programs (1d)
- [ ] **U2-4**: /app-legacy/programs/spin → Redirect to /app/programs/spin (1d)
- [ ] **U2-5**: /app-legacy/programs/insurance → Redirect (1d)
- [ ] **U2-6**: BSK Loans → BSKLoansPageAstra (3d)
- [ ] **U2-7**: BSK Vesting → BSKVestingPageAstra (3d)
- [ ] **U2-8**: /app-legacy/profile → Redirect to /app/profile (1d)
- [ ] **U2-9**: Support → SupportPageAstra (3d)
- [ ] **U2-10**: Notifications → NotificationsPageAstra (2d)

**Acceptance Criteria**:
- [ ] All markets show live prices
- [ ] TradingView widget integrated
- [ ] Support ticket flow works
- [ ] All redirects tested

---

## 🔧 ADMIN BATCH 1 (Week 7-9)
**Priority**: HIGH  
**Focus**: Core operations  
**Duration**: 3 weeks

- [ ] **A1-1**: /admin-legacy → Redirect to /admin (1d)
- [ ] **A1-2**: /admin-legacy/users → Redirect to /admin/users (1d)
- [ ] **A1-3**: Assets → AdminAssetsNova with TokenManager (4d)
- [ ] **A1-4**: Enhance Markets page with PairManager (2d) *depends on A1-3*
- [ ] **A1-5**: Funding → AdminFundingNova (5d)
- [ ] **A1-6**: /admin-legacy/subscriptions → Redirect (1d)
- [ ] **A1-7**: Referrals → AdminReferralsNova (4d)
- [ ] **A1-8**: /admin-legacy/staking → Redirect (1d)

**Acceptance Criteria**:
- [ ] Token CRUD with logo upload
- [ ] Pair management functional
- [ ] Crypto/INR funding ops
- [ ] Referral config via SchemaForm
- [ ] Audit trail on all changes

---

## 🔧 ADMIN BATCH 2 (Week 10-12)
**Priority**: MEDIUM  
**Focus**: Features & Support  
**Duration**: 3 weeks

- [ ] **A2-1**: Lucky Draw → AdminLuckyDrawNova (4d)
- [ ] **A2-2**: Insurance → AdminInsuranceNova (5d)
- [ ] **A2-3**: Ads → AdminAdsNova (3d)
- [ ] **A2-4**: Integrate Fees into /admin/settings (2d)
- [ ] **A2-5**: Support → AdminSupportNova (3d)
- [ ] **A2-6**: Notifications → AdminNotificationsNova (3d)
- [ ] **A2-7**: /admin-legacy/system → Redirect (1d)
- [ ] **A2-8**: Integrate Market Feed into Markets (2d) *depends on A1-4*
- [ ] **A2-9**: Purchase Bonus → AdminPurchaseBonusNova (3d)
- [ ] **A2-10**: Integrate INR Deposits into Funding (1d) *depends on A1-5*

**Acceptance Criteria**:
- [ ] Lucky draw config via CMS
- [ ] Insurance claims workflow
- [ ] Ad campaign management
- [ ] Fee rules editable
- [ ] All legacy admin routes gone

---

## 🧹 CLEANUP PHASE (Week 13-14)
**Priority**: LOW  
**Focus**: Code health  
**Duration**: 2 weeks

- [ ] **CLEANUP-1**: Delete all legacy component files (2d)
- [ ] **CLEANUP-2**: Consolidate design tokens (1d)
- [ ] **CLEANUP-3**: Add testids to remaining pages (1d)
- [ ] **CLEANUP-4**: Bundle size optimization (2d)

**Acceptance Criteria**:
- [ ] Zero legacy imports
- [ ] Single design token file
- [ ] All pages have testids
- [ ] Bundle size < 500KB (gzip)
- [ ] Lighthouse score > 90

---

## 📊 PROGRESS TRACKING

### By Area
- [ ] **Hotfix**: 0/6 (0%)
- [ ] **User Routes**: 0/18 (0%)
- [ ] **Admin Routes**: 0/14 (0%)
- [ ] **Cleanup**: 0/4 (0%)

### By Priority
- [ ] **CRITICAL**: 0/6 (0%)
- [ ] **HIGH**: 0/12 (0%)
- [ ] **MEDIUM**: 0/16 (0%)
- [ ] **LOW**: 0/8 (0%)

### Overall
**Total**: 0/42 (0%)

---

## 🎯 MILESTONES

### Milestone 1: Astra User App Complete (Week 6)
- [ ] All hotfixes merged
- [ ] All /app-legacy routes redirect or migrated
- [ ] 100% Astra design system coverage
- [ ] Deprecation banner removed

### Milestone 2: Nova Admin Complete (Week 12)
- [ ] All /admin-legacy routes redirect or migrated
- [ ] 100% Nova design system coverage
- [ ] CMS-driven configuration
- [ ] Audit trail complete

### Milestone 3: Code Cleanup Complete (Week 14)
- [ ] All legacy code removed
- [ ] Design tokens consolidated
- [ ] Performance optimized
- [ ] Documentation updated

---

## 📝 NOTES

### Testing Checklist (Per Task)
- [ ] Mobile responsive (360px, 390px, 430px)
- [ ] Dark/light mode
- [ ] Empty states
- [ ] Error states
- [ ] Loading states
- [ ] Navigation works
- [ ] Back button works
- [ ] Data persists

### PR Requirements
- [ ] Component testids added
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Route registered in config
- [ ] Navigation links updated
- [ ] Legacy route redirects (if applicable)
- [ ] Screenshots in PR description

### Deployment Checklist
- [ ] Database migrations run
- [ ] Environment variables set
- [ ] Feature flags configured
- [ ] Analytics events tracked
- [ ] Error monitoring enabled
- [ ] Rollback plan documented

---

**End of Migration Checklist**
