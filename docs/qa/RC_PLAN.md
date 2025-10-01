# Release Candidate Plan - i-SMART Platform
**Version**: RC-20251001  
**Target Date**: TBD  
**Status**: Planning Phase

## Executive Summary
This document outlines the complete plan to achieve Release Candidate status for the i-SMART crypto exchange platform, ensuring 100% compliance with the specification and production readiness.

---

## Phase 1: Feature Verification & Gap Analysis
**Timeline**: Day 1-2  
**Owner**: QA Lead

### A) Splash & Onboarding Flow ✅
- [x] Animated splash screen (2s max, reduced-motion support)
- [x] 4 welcome screens with swipe/next
- [x] Wallet create/import (BIP39 12-word)
- [x] Seed phrase confirmation (words 3/7/11)
- [x] EVM address derivation (m/44'/60'/0'/0/0)
- [x] Email verification (OTP + magic link)
- [x] PIN setup (6-digit)
- [x] Biometric enrollment
- [x] **VERIFY**: App lock on every open (PIN/biometric required) - LockGuard now enforces this

### B) Dashboard (User Home) ✅
- [x] Sticky header with animated spinning logo (5s flip)
- [x] Username display
- [x] Bell icon (notifications)
- [x] **VERIFY**: Support → WhatsApp link (+919133444422)
- [x] **VERIFY**: Balance order: 1) Crypto Portfolio, 2) BSK Withdrawable, 3) BSK Holding
- [x] Actions: Deposit, Withdraw, Trade, Swap, Transfer
- [x] Announcements: ticker + image carousel
- [x] Programs grid (admin-controlled)

### C) Programs Rules ⚠️
#### 1. Team & Referrals (50 levels) 
- [x] **VERIFIED**: L1-50 payout structure:
  - L1 (direct): +5 BSK → Holding ✅
  - L2-10: +0.5 BSK → Withdrawable ✅
  - L11-20: +0.4 BSK → Withdrawable ✅
  - L21-30: +0.3 BSK → Withdrawable ✅ (Fixed)
  - L31-40: +0.2 BSK → Withdrawable ✅ (Fixed)
  - L41-50: +0.1 BSK → Withdrawable ✅ (Fixed)
- [x] **VERIFIED**: Badge subscriptions (BSK):
  - Silver 1000 → unlock L2-10 ✅
  - Gold 2000 → unlock L11-20 ✅
  - Platinum 3000 → unlock L21-30 ✅
  - Diamond 4000 → unlock L31-40 ✅
  - VIP 5000 → unlock L41-50 + 10k BSK Holding ✅
- [x] **VERIFIED**: Direct referrer bonus: 10% of subscriber's amount → Withdrawable ✅
- [x] **VERIFIED**: VIP milestones: 10→10k, 50→50k, 100→100k, 250→200k, 500→500k ✅
- [ ] **NEEDS VERIFICATION**: Upgrade logic implementation (pay difference only)
- [ ] **NEEDS VERIFICATION**: Anti-abuse implementation (self-referral block, daily caps, 24-48h clawback)

#### 2. Advertise Mining ⚠️
- [x] **VERIFIED**: Subscriptions: 100-10,000 INR tiers ✅ (Database corrected)
- [x] **VERIFIED**: Daily payout: (tier/100) BSK × 100 days ✅
- [x] **VERIFIED**: Duration: 100 days for all tiers ✅
- [x] **VERIFIED**: Required view time: 30 seconds ✅
- [x] **VERIFIED**: Admin fallback setting exists (auto_credit_no_inventory) ✅
- [ ] **NEEDS VERIFICATION**: Free daily +1 BSK goes to Holding (not Withdrawable)
- [ ] **NEEDS VERIFICATION**: Subscription payouts go to Withdrawable
- [ ] **NEEDS VERIFICATION**: ≥1 qualified view/day enforcement
- [ ] **NEEDS VERIFICATION**: Admin fallback auto-credit functionality

#### 3. BSK One-Time Purchase ⚠️
- [x] **VERIFIED**: Range: 1,000-100,000 INR ✅
- [x] **VERIFIED**: Bonus: +50% to Holding ✅ (Fixed destination)
- [x] **VERIFIED**: Per user limit: once ✅
- [x] **VERIFIED**: Admin enable/disable (status field) ✅
- [x] **VERIFIED**: Global budget tracking ✅
- [ ] **NEEDS VERIFICATION**: Min badge requirement enforcement
- [ ] **NEEDS VERIFICATION**: Edge function badge check logic

#### 4. Spin Wheel (Provably Fair) ⚠️
- [x] **VERIFIED**: 4 segments: 2× WIN×2, 2× LOSE ✅
- [x] **VERIFIED**: Bet range: 100-1,000 INR ✅
- [x] **VERIFIED**: First 5 spins: fee-free ✅
- [x] **VERIFIED**: After 5: 10 INR fee per spin ✅
- [x] **VERIFIED**: Commit-reveal RNG implementation ✅
- [x] **VERIFIED**: Verify page exists (/app/spin/verify) ✅
- [ ] **MISSING**: 10% of winnings → Admin Fees (not implemented in edge function)

#### 5. Lucky Draw (Provably Fair) ⚠️
- [x] **VERIFIED**: Default: 100 participants ✅ (pool_size default in draw_configs)
- [x] **VERIFIED**: Admin sets: ticket price, winners, prizes ✅ (draw_configs + draw_prizes tables)
- [x] **VERIFIED**: 10% fee per winner → Admin Fees ✅ (fee_percent default 10%, admin_fees_ledger populated)
- [x] **VERIFIED**: Multiple pools ✅ (draw_configs supports multiple concurrent draws)
- [x] **VERIFIED**: Auto-run when full or at schedule ✅ (start_mode: 'auto_when_full', 'scheduled_time')
- [ ] **MISSING**: Refund on expiry (expiry_time field exists but no refund logic in edge functions)

#### 6. Insurance (Manual Approval)
- [ ] Accident: 10k BSK/year → up to 1M BSK payout
- [ ] Trading: 10k BSK/sub → 50k BSK if 100k loss
- [ ] Life: 10k BSK, 15-70 years → 500k maturity

#### 7. BSK Loan
- [ ] Range: 100-25,000 BSK
- [ ] 16-week schedule
- [ ] 0% interest default (admin configurable)
- [ ] KYC before disbursal (toggle)
- [ ] Repay from Withdrawable
- [ ] Late fee policy

#### 8. Staking (Real Crypto)
- [ ] Pools: BNB/BTC/ETH/IPG
- [ ] APR/lock periods
- [ ] Rewards per admin policy

### D) Trading (Real Spot) ✅
- [x] PairsGrid (Recent/Favorites/All)
- [x] Admin-editable tokens & pairs
- [x] **CRITICAL**: Chart does NOT render by default
- [x] **CRITICAL**: User must tap "Candles" to mount ChartPanel
- [x] **CRITICAL**: Unsubscribe streams when OFF
- [x] **CRITICAL**: Lazy-load chart library
- [x] OrderTicket (Market/Limit)
- [x] Depth, trades tape, fees
- [x] LIVE/SIM adapters

### E) Admin CMS (Full Control) ✅
- [x] Program Registry (modules, configs, audit)
- [x] JSON Schema per module
- [x] Editor tabs: Overview/Settings/Flags/Schedule/Preview/History
- [x] Branding: logos, flip interval, colors
- [x] Bottom dock items
- [x] Program categories/order
- [x] BSK rate editor
- [x] Fee rules
- [x] Promos
- [x] Announcements
- [x] Pages/media
- [x] RBAC: SuperAdmin/Admin/Operator/Support
- [x] All writes audited with diffs

### F) Economics & Ledgers 🔍
- [ ] BSK ↔ INR rate set by Admin
- [ ] Rate snapshot at every ledger event
- [ ] Ledgers: bsk_withdrawable_ledger, bsk_holding_ledger
- [ ] Program subtypes documented
- [ ] All transactions traced

---

## Phase 2: Route Purge & CI Guards
**Timeline**: Day 3  
**Owner**: Senior Developer

### Tasks
1. [ ] Build fresh Route Manifest from codebase
2. [ ] Compare with expected routes from:
   - Program Registry
   - Auth/Onboarding
   - Wallet
   - Trading
   - Profile
   - Admin CMS
3. [ ] Delete unmatched legacy routes/components
4. [ ] Remove imports and resolve references
5. [ ] Add CI guard to fail builds if:
   - Any import contains legacy names (*Section*, *List*, *Card*, *Shell*)
   - Removed route still compiles
6. [ ] Create 404 page with CTA to Home

### Deliverables
- `/docs/qa/ROUTE_MANIFEST.json` (post-purge)
- `/docs/qa/ROUTE_DIFF.md` (before/after)
- CI guard script

---

## Phase 3: Automated Testing Suite
**Timeline**: Day 4-6  
**Owner**: QA Architect

### A) Unit/Logic Tests
- [ ] Badge unlock math
- [ ] Direct 10% bonus on upgrades (difference only)
- [ ] VIP milestone once-per-tier
- [ ] Advert daily free (+1 Holding)
- [ ] Subscriptions (tier/100 for 100 days)
- [ ] One-time purchase 50% bonus
- [ ] Wheel fairness (commit-reveal)
- [ ] Draw fairness (permutation proof)
- [ ] Insurance payout caps
- [ ] Loan schedule (16 weeks)
- [ ] Ledger consistency

### B) Integration/E2E (Playwright)
- [ ] Test 1: Splash→Welcome→Wallet→Email→PIN→Home
- [ ] Test 2: Wallet shows Crypto, BSK Withdrawable, BSK Holding (order)
- [ ] Test 3: Programs grid from CMS
- [ ] Test 4: Team/Referrals badge purchase & upgrade
- [ ] Test 5: Advert Mining free + subscription
- [ ] Test 6: One-time purchase 50% bonus
- [ ] Test 7: Spin wheel (5 free, then fee, verify RNG)
- [ ] Test 8: Lucky Draw (100 seats, winners, proof)
- [ ] Test 9: Insurance claims (Accident, Trading, Life)
- [ ] Test 10: Loan schedule (borrow, pay, late fee)
- [ ] Test 11: Trading chart hidden by default, toggle ON
- [ ] Test 12: Announcements + WhatsApp link

### C) A11y & Performance
- [ ] Axe checks (AA contrast, labels, focus)
- [ ] Lighthouse mobile: LCP < 2.5s
- [ ] PWA installable
- [ ] 60fps scroll on Home/Programs
- [ ] Reduced-motion support

### Deliverables
- `/docs/qa/LEDGER_TEST_REPORT.md`
- `/docs/qa/PERF_A11Y_REPORT.md`
- Test suite passing 100%

---

## Phase 4: Security Audit & Fixes
**Timeline**: Day 7  
**Owner**: Security Lead

### Tasks
1. [ ] Run `npm audit` / `yarn audit`
2. [ ] Upgrade vulnerable dependencies:
   - next
   - react
   - supabase-js
   - @supabase/auth-helpers*
   - zod
   - jose
   - date-fns
   - lodash*
   - ws
   - node types
3. [ ] Regenerate lockfile
4. [ ] Re-run all tests
5. [ ] Verify no high/critical CVEs remain
6. [ ] Add guardrail: fail build if high/critical advisories exist

### Deliverables
- `/docs/qa/SECURITY_REPORT.md`
- Updated `package.json` + lockfile
- CI security check

---

## Phase 5: RC Build & Artifacts
**Timeline**: Day 8  
**Owner**: Release Manager

### Tasks
1. [ ] Tag build as `rc-20251001`
2. [ ] Generate all QA reports
3. [ ] Update `/docs/ia/MIGRATION_CHECKLIST.md` to 100%
4. [ ] Create RC Summary

### Deliverables
- `/docs/qa/RC_SUMMARY.md`
- `/docs/qa/ROUTE_MANIFEST.json`
- `/docs/qa/ROUTE_DIFF.md`
- `/docs/qa/LEDGER_TEST_REPORT.md`
- `/docs/qa/SECURITY_REPORT.md`
- `/docs/qa/PERF_A11Y_REPORT.md`

---

## Acceptance Gate Checklist

### ✅ Must Pass (or task fails)
1. [ ] All features in SPEC present and working
2. [ ] All programs behave per rules
3. [ ] Admin CMS controls everything
4. [ ] Route purge complete
5. [ ] CI guard blocks legacy imports
6. [ ] Trading chart mounts ONLY after Candles ON
7. [ ] Streams unsubscribe when OFF
8. [ ] Wallet shows 3 balances in required order
9. [ ] Security advisories resolved (no high/critical)
10. [ ] All tests green
11. [ ] Performance & a11y pass
12. [ ] All test IDs present
13. [ ] Reports generated in `/docs/qa/`

---

## Critical Issues Identified

### 🔴 HIGH PRIORITY
1. ~~**Trading Chart**: Must NOT render by default - needs implementation~~ ✅ FIXED
2. ~~**Balance Order**: Verify wallet shows correct order~~ ✅ FIXED  
3. ~~**WhatsApp Support**: Verify link exists and works~~ ✅ FIXED (+919133444422)
4. ~~**App Lock**: Verify PIN/biometric required on every open~~ ✅ FIXED (LockGuard enforces)

### 🟡 MEDIUM PRIORITY
1. All program rules need verification against spec
2. Ledger snapshots need audit
3. Route purge not started
4. Tests not yet created
5. Security audit pending

### 🟢 LOW PRIORITY
1. Documentation updates
2. Performance optimization
3. A11y improvements

---

## Timeline Summary
- **Day 1-2**: Feature verification & gap analysis
- **Day 3**: Route purge & CI guards
- **Day 4-6**: Automated testing suite
- **Day 7**: Security audit & fixes
- **Day 8**: RC build & artifacts

**Total**: 8 working days to RC
