# APK R1 - QA Testing Guide

## Overview
This document provides testing instructions and expected behaviors for APK R1 modules.

## Test Environment Setup
1. Clear browser localStorage before testing
2. Use Chrome DevTools mobile emulation (iPhone 14 Pro or Pixel 7)
3. Check console for markers after each action

## Module A: Safe Area & Viewport

### Test: Viewport Configuration
**Steps:**
1. Open app in mobile view
2. Open DevTools → Elements → Inspect `<html>` tag
3. Check `<head>` for viewport meta tags

**Expected:**
- ✅ `viewport` meta has `viewport-fit=cover`
- ✅ `theme-color` is `#0b0b14`

**Console Marker:** `SAFE_AREA_APPLIED`

### Test: Safe Area Utilities
**Steps:**
1. Inspect any screen with sticky footer/CTA
2. Check computed styles for bottom padding

**Expected:**
- ✅ Elements have `padding-bottom: calc(var(--safe-bottom) + Xpx)`
- ✅ Sticky elements positioned with `bottom: calc(var(--safe-bottom) + Xpx)`

---

## Module B: App-Lock (PIN → Biometrics)

### Test: PIN Setup Flow
**Steps:**
1. Complete onboarding up to OTP verification
2. Enter OTP code
3. Observe redirect to `/lock/setup-pin`

**Expected:**
- ✅ Redirects to PIN setup (not onboarding)
- ✅ Two PIN input fields visible (testid: `pin-1st`, `pin-2nd`)
- ✅ Save button disabled until PINs match

**Console Marker:** `PIN_SET_OK` (after saving)

**localStorage Check:**
```javascript
console.log(localStorage.getItem('ipg_pin_hash')); // Should exist
console.log(localStorage.getItem('ipg_pin_salt')); // Should exist
console.log(localStorage.getItem('ipg_onboarded')); // Should be 'true'
```

### Test: Biometric Enrollment
**Steps:**
1. After PIN setup, observe redirect to `/lock/biometric-enroll`
2. Click "Enroll Biometric" (testid: `bio-enroll-btn`)
3. Follow browser prompt (or click "Skip" if unsupported)

**Expected:**
- ✅ WebAuthn prompt appears (if supported)
- ✅ "Not supported" message if WebView doesn't support WebAuthn
- ✅ Skip button works (testid: `bio-skip-btn`)
- ✅ After enroll/skip → redirects to `/app/home`

**Console Marker:** `BIO_ENROLL_OK` (if enrolled)

**localStorage Check:**
```javascript
console.log(localStorage.getItem('ipg_bio_cred_id')); // Exists if enrolled
```

### Test: Lock Screen & Unlock
**Steps:**
1. While on `/app/*` route, switch to another tab
2. Wait 2+ minutes (or set shorter timeout in localStorage)
3. Return to tab

**Expected:**
- ✅ Redirects to `/lock`
- ✅ Biometric button shown first (testid: `lock-bio-btn`) if enrolled
- ✅ PIN input shown (testid: `lock-pin-input`)
- ✅ Unlock button (testid: `lock-unlock-btn`)
- ✅ Dev ribbon "APP-LOCK v1" visible

**Console Marker:** `LOCK_UNLOCK_OK` (after successful unlock)

### Test: Lock Timeout Configuration
**Steps:**
```javascript
// Set 30-second timeout for testing
localStorage.setItem('ipg_lock_timeout_ms', '30000');
```

**Expected:**
- ✅ App locks after 30 seconds of inactivity

---

## Module C: Referrals - Deep Links

### Test: Web Link Capture
**Steps:**
1. Open: `https://i-smartapp.com/r/TEST123`
2. Observe redirect to `/onboarding`

**Expected:**
- ✅ Toast: "Referral applied"
- ✅ sessionStorage: `ipg_ref_code = 'TEST123'`
- ✅ localStorage: `ismart_pending_ref` contains `{ code: 'TEST123', ... }`

**Console Marker:** `REF_CAPTURE_OK`

### Test: Query Param Capture
**Steps:**
1. Open: `/onboarding?ref=TEST456`

**Expected:**
- ✅ Same behavior as web link
- ✅ sessionStorage: `ipg_ref_code = 'TEST456'`

### Test: Download Page
**Steps:**
1. Navigate to `/download?ref=TEST789`

**Expected:**
- ✅ Shows "Referral Code Applied: TEST789"
- ✅ Download APK button
- ✅ Open App button (intent link)
- ✅ Intent link in copyable format (testid: `ref-share-intent`)
- ✅ Dev ribbon "APK R1" visible

### Test: Share Links
**Steps:**
1. Go to `/app/referrals`
2. Check referral link (testid: `ref-share-link`)
3. Check intent link (testid: `ref-share-intent`)

**Expected:**
- ✅ Web link format: `https://i-smartapp.com/r/<code>`
- ✅ Intent format starts with: `intent://r/<code>#Intent`

---

## Module D: KYC & Profile

### Test: Modern DOB Picker
**Steps:**
1. Go to KYC form
2. Click DOB field (testid: `kyc-dob-open`)
3. Observe bottom sheet with wheel pickers

**Expected:**
- ✅ Three wheels: Day / Month / Year
- ✅ Live age display (testid: `kyc-dob-age`)
- ✅ Age updates as you scroll
- ✅ Confirm disabled if age < 18 (or admin setting)
- ✅ Selected date shown (testid: `kyc-dob`)

### Test: Form Validation
**Steps:**
1. Enter name with 1 character → observe inline error
2. Enter phone without country code → observe error
3. All fields validated in real-time

**Expected:**
- ✅ Name: 2-60 chars
- ✅ Phone: E.164 format (e.g., +91 1234567890)
- ✅ City: auto-capitalizes
- ✅ Postal: required
- ✅ File size: max 10MB per doc

### Test: Autosave
**Steps:**
1. Start filling KYC form
2. Wait 2 seconds after typing
3. Observe toast notification

**Expected:**
- ✅ Toast (id: `kyc-autosave-toast`): "Saved - Draft saved automatically"
- ✅ Refresh page → form data restored

**Console Markers:**
- `KYC_DRAFT_SAVED` (after 1.5s debounce)
- `KYC_DRAFT_RESTORED` (on page load if draft exists)
- `KYC_SUBMIT_OK` (after successful submission)

### Test: Session Refresh
**Steps:**
1. Open DevTools → Application → Storage → Clear auth tokens
2. Try to submit KYC form

**Expected:**
- ✅ Session automatically refreshes
- ✅ Submission retried once
- ✅ Success or appropriate error message

### Test: Admin KYC Settings
**Steps:**
1. Navigate to `/admin/kyc/settings`
2. Change min age to 21
3. Save settings

**Expected:**
- ✅ Settings persisted to database
- ✅ User DOB picker now enforces 21+ age

---

## Module E: Programs/CMS

### Test: Admin Programs Control
**Steps:**
1. Go to `/admin/programs`
2. Toggle "Spin Wheel" off
3. Save settings
4. Navigate to `/app/spin` as user

**Expected:**
- ✅ Program toggles save successfully
- ✅ User sees "Temporarily unavailable" message
- ✅ Console marker: `PROGRAMS_READY`

### Test: System Health
**Steps:**
1. Navigate to `/admin/system/health`
2. Observe health checks

**Expected:**
- ✅ Database (RPC): Green checkmark
- ✅ Storage: Green checkmark
- ✅ SMTP (Email): Green or yellow warning
- ✅ Auth Service: Green checkmark
- ✅ KYC Config: Green checkmark
- ✅ System Settings: Green checkmark
- ✅ Overall status: "All Systems Operational" if all green

---

## Module F: QA Hooks

### Test: Data Version Attribute
**Steps:**
1. Open DevTools → Elements
2. Inspect `<body>` tag

**Expected:**
- ✅ `data-version="apk-r1"` attribute present

### Test: Dev Ribbons
**Location:** Lock screens (`/lock`, `/lock/setup-pin`, `/lock/biometric-enroll`)
**Expected:** Yellow ribbon with "APP-LOCK v1"

**Location:** Download page (`/download`)
**Expected:** Yellow ribbon with "APK R1"

### Test: Console Markers Summary
Open console and check for these markers throughout testing:

- ✅ `SAFE_AREA_APPLIED`
- ✅ `PIN_SET_OK`
- ✅ `BIO_ENROLL_OK`
- ✅ `LOCK_UNLOCK_OK`
- ✅ `REF_CAPTURE_OK`
- ✅ `KYC_SUBMIT_OK`
- ✅ `KYC_DRAFT_SAVED`
- ✅ `KYC_DRAFT_RESTORED`
- ✅ `PROGRAMS_READY`

---

## Regression Tests

### Test: Onboarding Flow
**Steps:**
1. Clear all data
2. Start from `/onboarding`
3. Complete full flow: Email → OTP → PIN → Biometric → Home

**Expected:**
- ✅ No redirects back to onboarding after `ipg_onboarded=true`
- ✅ All steps completed in order
- ✅ Safe area padding applied on all screens

### Test: Mobile Navigation
**Steps:**
1. Navigate through all main app sections
2. Check bottom nav, sticky CTAs

**Expected:**
- ✅ No overlapping with system UI
- ✅ Sticky elements respect safe-area
- ✅ Bottom nav always accessible

---

## Known Limitations

1. **Biometric Enrollment:** May not work in all WebView implementations
2. **Deep Links:** Require proper assetlinks.json deployment for Android
3. **Lock Timeout:** Default 2 minutes, may need adjustment per use case

---

## Bug Reporting Template

**Title:** [Module] - Brief description

**Steps to Reproduce:**
1. ...
2. ...

**Expected Behavior:**
...

**Actual Behavior:**
...

**Console Markers:** (paste relevant console output)

**localStorage Dump:** (run in console)
```javascript
console.log(JSON.stringify(localStorage, null, 2));
```

**Screenshots:** (attach if relevant)

---

## Sign-Off Checklist

- [ ] All Module A tests pass
- [ ] All Module B tests pass
- [ ] All Module C tests pass
- [ ] All Module D tests pass
- [ ] All Module E tests pass
- [ ] All Module F tests pass
- [ ] Regression tests pass
- [ ] Console markers verified
- [ ] No critical bugs found

**Tested By:** _________________
**Date:** _________________
**Version:** APK R1
