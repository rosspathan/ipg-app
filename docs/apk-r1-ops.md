# APK R1 Operations Guide

## Overview
APK R1 implements safe-area viewport handling, app-lock with PIN/biometric, Android deep-linking for referrals, enhanced KYC mobile UX, and admin program controls.

## Key Features

### A) Safe Area & Viewport
- All screens padded for Android system bar + notch
- CSS tokens: `--safe-bottom`, `--safe-top`, `--bottom-nav-h`
- Utility classes: `.screen`, `.with-sticky-cta`, `.sticky-cta`, `.pb-safe`

### B) App-Lock
**localStorage Keys:**
- `ipg_pin_salt`, `ipg_pin_hash`, `ipg_pin_created_at`
- `ipg_bio_cred_id` (WebAuthn credential ID)
- `ipg_lock_state` ('locked' | 'unlocked')
- `ipg_lock_last_active` (timestamp)
- `ipg_lock_timeout_ms` (default: 120000 = 2 minutes)
- `ipg_onboarded` ('true' after OTP finalized)

**Security:**
- PIN: PBKDF2-SHA256, 200k iterations, salted
- Biometric: WebAuthn (platform authenticator)
- Route guard on all `/app/*` paths
- Visibility change triggers lock

**Flow After OTP:**
1. User completes email OTP verification
2. Redirect to `/lock/setup-pin`
3. After PIN set → `/lock/biometric-enroll`
4. After biometric (or skip) → `/app/home`
5. `ipg_onboarded=true` prevents returning to onboarding

### C) Referrals - Android Deep-Links

**Web Link Format:**
```
https://i-smartapp.com/r/<ref_code>
```

**Android Intent Format:**
```
intent://r/<ref_code>#Intent;scheme=https;package=com.ismart.exchange;S.browser_fallback_url=https%3A%2F%2Fi-smartapp.com%2Fdownload%3Fref%3D<ref_code>;end
```

**Package Name:** `com.ismart.exchange`

**assetlinks.json Template** (place at `https://i-smartapp.com/.well-known/assetlinks.json`):
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.ismart.exchange",
    "sha256_cert_fingerprints": [
      "YOUR_APP_SHA256_FINGERPRINT_HERE"
    ]
  }
}]
```

**To get SHA-256 fingerprint:**
```bash
keytool -list -v -keystore /path/to/your/keystore.jks
```

**Catcher Routes:**
- `/r/:code` - captures referral code
- `/download?ref=<code>` - download page with captured ref
- Stores in `sessionStorage.ipg_ref_code` + shows toast

**Setting APK URL:**
Update `apkUrl` constant in `/download` page:
```typescript
const apkUrl = "https://i-smartapp.com/downloads/latest.apk";
```

### D) KYC & Profile

**Admin Settings:** `/admin/kyc/settings`
- `min_age_years` (default: 18)
- `max_file_size_mb` (default: 10)
- `liveness_required` (boolean)
- `manual_review_required` (boolean)
- `selfie_match_threshold` (0.5-1.0)

**Mobile UX Features:**
- Modern DOB picker: bottom-sheet wheel (DD/MMM/YYYY)
- Live age calculation
- Auto-save draft every 1.5s to localStorage
- Session refresh on token expiry with retry
- Phone E.164 validation, auto-capitalize city
- File size validation (max 10MB per doc)

**localStorage Keys:**
- `kyc_draft_v1` (auto-saved form data)

### E) Programs/CMS

**Admin Control:** `/admin/programs`
Manage program toggles and parameters via `system_settings` table:

**Programs:**
1. **Spin Wheel** (`program_spin_enabled`)
   - `free_spins_daily`
   - `min_bet_bsk`

2. **Lucky Draw** (`program_lucky_draw_enabled`)
   - `pool_size`
   - `ticket_price_bsk`

3. **Referral Program** (`program_referrals_enabled`)
   - `direct_commission_percent`
   - `max_levels`

4. **Ad Mining** (`program_ad_mining_enabled`)
   - `reward_per_ad_bsk`
   - `max_ads_daily`

5. **Trading Insurance** (`program_insurance_enabled`)
   - `coverage_percent`
   - `max_claim_amount`

6. **KYC Verification** (`program_kyc_enabled`)
   - `min_age_years`
   - `manual_review`

**System Health:** `/admin/system/health`
- Database (RPC) connectivity
- Storage bucket access
- SMTP (email) function
- Auth service status
- KYC config validation
- System settings check

Green checkmarks when all OK.

## Console Markers

Track these in browser console for debugging:

- `SAFE_AREA_APPLIED` - CSS tokens loaded (Module A)
- `PIN_SET_OK` - PIN stored successfully
- `BIO_ENROLL_OK` - Biometric enrolled
- `LOCK_UNLOCK_OK` - Successfully unlocked
- `REF_CAPTURE_OK` - Referral code captured
- `KYC_SUBMIT_OK` - KYC submission successful
- `KYC_DRAFT_SAVED` - Draft auto-saved
- `KYC_DRAFT_RESTORED` - Draft restored on reload
- `PROGRAMS_READY` - Program settings saved

## Test IDs

**Module B (App-Lock):**
- `pin-1st` - First PIN input
- `pin-2nd` - Confirm PIN input
- `pin-save-btn` - Save PIN button
- `bio-enroll-btn` - Enroll biometric
- `bio-skip-btn` - Skip biometric
- `lock-bio-btn` - Unlock with biometric
- `lock-pin-input` - PIN input on lock screen
- `lock-unlock-btn` - Unlock button

**Module C (Referrals):**
- `ref-share-link` - Web referral link
- `ref-share-intent` - Android intent link

**Module D (KYC):**
- `kyc-dob-open` - Open DOB picker
- `kyc-dob` - Selected date display
- `kyc-dob-age` - Calculated age display
- `kyc-autosave-toast` - Auto-save toast ID

## Lock Timeout Configuration

Default: 2 minutes (120000ms)

To change lock timeout, update localStorage:
```javascript
localStorage.setItem('ipg_lock_timeout_ms', '300000'); // 5 minutes
```

Or programmatically in settings UI.

## Deployment Checklist

1. ✅ Build APK with Capacitor
2. ✅ Sign APK with release keystore
3. ✅ Upload APK to hosting (update URL in `/download`)
4. ✅ Generate SHA-256 fingerprint from keystore
5. ✅ Create `assetlinks.json` with fingerprint
6. ✅ Deploy `assetlinks.json` to `https://i-smartapp.com/.well-known/`
7. ✅ Verify Android App Links with [Google's tester](https://developers.google.com/digital-asset-links/tools/generator)
8. ✅ Test deep-link flow end-to-end
9. ✅ Configure lock timeout in admin settings
10. ✅ Enable/disable programs as needed

## Support

- **Lock Issues:** Check localStorage keys, verify PBKDF2 params
- **Deep-Link Issues:** Verify assetlinks.json, check SHA-256 fingerprint
- **KYC Issues:** Check admin settings, verify file size limits
- **Program Toggles:** Check `system_settings` table values

## Version

**APK R1** - Initial Release
- Date: 2025-01-12
- File Budget: 22/24 files used
- Modules: A (safe-area), B (app-lock), C (referrals), D (KYC), E (programs), F (QA)
