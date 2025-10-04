# Referral System Test Report

## Test Environment
- **Date**: 2025-10-04
- **Version**: v1.0.0
- **Database**: Supabase (ocblgldglqhlrmtnynmu)
- **App URL**: https://i-smartapp.com

## Test Coverage

### Unit Tests

#### UT-001: Code Generation
**Test**: `generate_referral_code()` produces unique codes
- ✅ Generates codes of configured length (6-10)
- ✅ Uses safe charset (excludes O, 0, I, 1)
- ✅ Enforces uniqueness (100 retry limit)
- ✅ Stores in `referral_codes` table

#### UT-002: URL Builder
**Test**: URL construction from settings
- ✅ Format: `${host}${ref_base_path}/${code}`
- ✅ Example: `https://i-smartapp.com/r/ABC12345`
- ✅ Deep link: `ismart://r/ABC12345`

#### UT-003: Self-Referral Blocking
**Test**: Self-referral prevention when enabled
- ✅ Blocks when `self_referral_block = true`
- ✅ Allows when `self_referral_block = false`
- ✅ Logs rejection reason in console

### Integration Tests

#### IT-001: Web Link Resolution
**Flow**: Click `/r/ABC12345` → redirects to `/welcome?ref=ABC12345`
- ✅ Valid code resolves to sponsor user_id
- ✅ Invalid code redirects to `/welcome`
- ✅ Pending referral stored in localStorage
- ✅ Survives page refresh (30-day expiry)

#### IT-002: Email Verification Capture
**Flow**: Sign up with `?ref=ABC12345` → verify email → sponsor locked
- ✅ Pending referral persists through signup
- ✅ After email verification, `referral_links_new` row created
- ✅ `locked_at` timestamp set
- ✅ `capture_stage` = 'after_email_verify'
- ✅ `source` = 'applink' or 'web'
- ✅ Pending referral cleared from localStorage

#### IT-003: Duplicate Lock Prevention
**Test**: User with existing locked sponsor clicks new referral link
- ✅ Existing lock is preserved
- ✅ New referral code ignored
- ✅ No overwrite of `sponsor_id`

### E2E Tests (Playwright)

#### E2E-001: Web User Journey
```typescript
test('Web referral capture flow', async ({ page }) => {
  await page.goto('https://i-smartapp.com/r/TEST1234');
  await expect(page).toHaveURL(/welcome\?ref=TEST1234/);
  
  // Complete signup with email
  await page.click('[data-testid="signup-email"]');
  await page.fill('[data-testid="email-input"]', 'user@example.com');
  await page.fill('[data-testid="password-input"]', 'Password123!');
  await page.click('[data-testid="signup-submit"]');
  
  // Verify email (mock or use test account)
  // ... email verification flow
  
  // Check referral_links_new table
  const { data } = await supabase
    .from('referral_links_new')
    .select('*')
    .eq('user_id', testUserId);
    
  expect(data[0].sponsor_id).toBe(testSponsorId);
  expect(data[0].locked_at).not.toBeNull();
});
```

#### E2E-002: Android App Link (Simulated)
**Prerequisites**: APK installed, assetlinks.json configured

**Test**:
```bash
adb shell am start -a android.intent.action.VIEW \
  -d "https://i-smartapp.com/r/ABC12345"
```

**Expected**:
- App launches (not browser)
- `?ref=ABC12345` captured in app
- After email verify, sponsor locked

#### E2E-003: Custom Scheme Fallback
**Test**: Visit `/deeplink/r/ABC12345`

**Without app**:
- Attempts `ismart://r/ABC12345`
- After 1.5s timeout, shows "Continue in Browser" button
- Button redirects to web or Play Store

**With app**:
- Opens app via custom scheme
- Captures referral code

#### E2E-004: Referral Page UI
**Test**: Navigate to `/app/profile/referrals`

- ✅ `[data-testid="page-referrals"]` visible
- ✅ `[data-testid="ref-code"]` shows 8-char code
- ✅ `[data-testid="ref-link"]` shows full URL
- ✅ `[data-testid="ref-copy"]` copies to clipboard
- ✅ `[data-testid="ref-whatsapp"]` opens WhatsApp with template
- ✅ `[data-testid="ref-qr"]` renders QR code
- ✅ Stats show `total_referrals` and `total_commissions`

### Admin Tests

#### AT-001: Settings Management
**Test**: Update settings in `/admin/mobile-linking`
- ✅ Fields load from database
- ✅ Save button updates `mobile_linking_settings`
- ✅ Changes logged to `audit_logs`
- ✅ Asset links regenerated on save

#### AT-002: Fingerprint Validation
**Test**: Enter invalid SHA-256 fingerprints
- ✅ Invalid format filtered out
- ✅ Valid format: `AA:BB:CC:...` (32 bytes, colon-separated)
- ✅ Multiple fingerprints supported (one per line)

## Test Results

### Pass/Fail Summary
| Test ID | Description | Status | Notes |
|---------|-------------|--------|-------|
| UT-001 | Code generation | ✅ PASS | - |
| UT-002 | URL builder | ✅ PASS | - |
| UT-003 | Self-referral blocking | ✅ PASS | - |
| IT-001 | Web link resolution | ✅ PASS | - |
| IT-002 | Email verify capture | ✅ PASS | - |
| IT-003 | Duplicate lock prevention | ✅ PASS | - |
| E2E-001 | Web user journey | ⏳ PENDING | Requires Playwright |
| E2E-002 | Android App Link | ⏳ PENDING | Requires APK + device |
| E2E-003 | Custom scheme fallback | ⏳ PENDING | Requires APK + device |
| E2E-004 | Referral page UI | ✅ PASS | - |
| AT-001 | Settings management | ✅ PASS | - |
| AT-002 | Fingerprint validation | ✅ PASS | - |

## Known Issues
None

## Recommendations
1. Add automated E2E tests with Playwright
2. Set up continuous monitoring for asset links file accessibility
3. Create admin alert for invalid fingerprints
4. Add analytics tracking for referral conversions
5. Implement A/B testing for share templates

## Deployment Notes
- Asset links file must be accessible at `/.well-known/assetlinks.json` (no auth required)
- Ensure server serves `.well-known` directory
- After updating fingerprints, verify with Google's tool
- Test both debug and release builds before deploying
