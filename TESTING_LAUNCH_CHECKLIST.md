# Testing & Launch Checklist - IPG Exchange

## ✅ Step 1: Export & Setup (5 minutes)

1. **Export to GitHub**
   - Click "Export to Github" button in Lovable (top right)
   - Authorize Lovable GitHub App if first time
   - Repository will be created automatically

2. **Clone Locally**
   ```bash
   git clone <your-repo-url>
   cd <repo-name>
   ```

3. **Install Dependencies**
   ```bash
   npm install
   npm install -D @playwright/test
   npx playwright install chromium
   ```

## ✅ Step 2: Run Automated Tests (10-15 minutes)

```bash
# Run all tests
npx playwright test

# Or run specific test suites
npx playwright test tests/trading-basic.spec.ts
npx playwright test tests/trading-matching.spec.ts
npx playwright test tests/trading-settlement.spec.ts
npx playwright test tests/programs-referral.spec.ts
npx playwright test tests/programs-ad-mining.spec.ts
```

### Expected Test Coverage:
- ✅ Trading: Order placement, cancellation, matching, settlement
- ✅ Programs: Referral system, ad mining rewards
- ✅ Security: Balance locking, transaction atomicity

### If Tests Fail:
1. Copy the error output
2. Share with me in chat
3. I'll fix the bugs immediately

## ✅ Step 3: Build Android APK (30-60 minutes)

**Prerequisites:**
- Android Studio installed
- Java JDK 11 or higher

**Commands:**
```bash
# Add Android platform
npx cap add android

# Update dependencies
npx cap update android

# Build web assets
npm run build

# Sync to Android
npx cap sync android

# Open in Android Studio
npx cap open android
```

**In Android Studio:**
1. Wait for Gradle sync to complete
2. Build > Generate Signed Bundle / APK
3. Select APK
4. Create/select keystore
5. Build release APK

**Output:** `android/app/build/outputs/apk/release/app-release.apk`

## ✅ Step 4: Test APK on Device (30 minutes)

**Install on Phone:**
```bash
# Via USB debugging
adb install android/app/build/outputs/apk/release/app-release.apk

# Or transfer APK to phone and install manually
```

**Test These User Journeys:**
1. ✅ Sign up → Verify email → Login
2. ✅ Complete profile → Upload avatar
3. ✅ Deposit INR → Check balance
4. ✅ Place market order → Verify execution
5. ✅ Place limit order → Cancel order
6. ✅ Check referral code → Share link
7. ✅ Watch ad → Claim BSK reward
8. ✅ Spin wheel → Win reward
9. ✅ View portfolio → Check balances
10. ✅ Withdraw funds → Test limits

## ✅ Step 5: Deploy Web App (5 minutes)

**In Lovable:**
1. Click "Publish" button (top right)
2. Your app goes live at: `yourapp.lovable.app`
3. Test the live URL on mobile browser
4. Verify all features work in production

## ✅ Step 6: Security Review (30 minutes)

**Check these items from SECURITY_AUDIT.md:**

### Critical (Must Fix Before Public Launch):
- [ ] Balance race conditions (concurrent orders)
- [ ] Order replay attacks (duplicate order IDs)
- [ ] Price manipulation (validate market prices)
- [ ] Fee evasion (server-side fee calculation)

### High Priority:
- [ ] Rate limiting on order placement
- [ ] CAPTCHA on sensitive actions
- [ ] IP-based fraud detection
- [ ] Withdrawal limits validation

### Medium Priority:
- [ ] 2FA for admin accounts
- [ ] Audit logs for critical actions
- [ ] Session timeout configuration
- [ ] CORS policy review

## ✅ Step 7: Production Launch (Ongoing)

**Pre-Launch:**
- [ ] All tests passing
- [ ] APK tested on 3+ devices
- [ ] Web app deployed and tested
- [ ] Critical security items fixed

**Launch Day:**
- [ ] Monitor Supabase logs for errors
- [ ] Check database for anomalies
- [ ] Watch user signups and first trades
- [ ] Have rollback plan ready

**Post-Launch:**
- [ ] Collect user feedback
- [ ] Monitor performance metrics
- [ ] Fix critical bugs within 24h
- [ ] Plan feature updates

---

## 🚨 Quick Commands Reference

```bash
# Testing
npx playwright test                          # Run all tests
npx playwright test --ui                     # Interactive mode
npx playwright test --debug                  # Debug mode

# Android Build
npx cap sync android                         # Sync after code changes
npx cap run android                          # Run on emulator/device
cd android && ./gradlew clean                # Clean build cache

# Deployment
git push                                     # Auto-deploys to Lovable
```

---

## 📊 Progress Tracker

- [ ] Step 1: Export & Setup
- [ ] Step 2: Run Tests
- [ ] Step 3: Build APK
- [ ] Step 4: Test on Device
- [ ] Step 5: Deploy Web
- [ ] Step 6: Security Review
- [ ] Step 7: Production Launch

---

## 🆘 Need Help?

**Tests Failing?** Share error output with me
**APK Build Issues?** Check `APK_BUILD_GUIDE.md`
**Security Questions?** Review `SECURITY_AUDIT.md`
**General Issues?** Come back to chat

**Current Status:** Ready for Step 1 - Export to GitHub! 🚀
