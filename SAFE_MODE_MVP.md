# Safe Mode MVP - Complete Implementation Guide

## Overview
This document describes the **Safe Mode MVP** implementation - a stable, animation-free version of the i-SMART Exchange app optimized for APK deployment on Android devices.

## Key Changes

### 1. Global Settings
- **Data Version**: `data-version="core-mvp"` in index.html
- **No Animations**: All Tailwind animations disabled
- **Safe Area Layout**: Proper safe-area-inset handling for Android nav/notches
- **Single Dark Theme**: Minimal color palette, no gradients or heavy effects

### 2. Onboarding & Wallet (Module A)

#### Splash Screen
- Static logo + app name (2 seconds or until ready)
- Console marker: `MVP_READY`
- File: `src/pages/SplashScreenMVP.tsx`

#### Wallet Creation Flow
1. **Create Wallet** button (test-id: `onb-create`)
   - Generates 12/24-word BIP39 mnemonic
   - Derives BEP20 address for BSC network
   - Shows QR code + copy/download options
   - Console marker: `WALLET_OK - Created`
   - Redirects to `/auth` after confirmation

2. **Import Wallet** button (test-id: `onb-import`)
   - Paste 12/24-word recovery phrase
   - Validates mnemonic with bip39
   - Derives same BEP20 address
   - Console marker: `WALLET_OK - Imported`
   - Redirects to `/auth` after success

**Key Points:**
- Mnemonic stored **locally only** (never sent to server)
- Public EVM address stored in profile after login
- All crypto operations happen client-side

### 3. Email OTP Login (Module B)

#### Authentication Flow
- File: `src/pages/AuthEmailOTP.tsx`
- Single screen with two steps:
  1. Enter email → Send 6-digit code (test-id: `otp-send`)
  2. Enter OTP → Verify & login (test-id: `otp-verify`)

#### Backend Integration
```typescript
// Send OTP
await supabase.auth.signInWithOtp({
  email,
  options: { shouldCreateUser: true }
});
```

#### After Verification
1. Create/upsert profile with `username = email local-part`
2. If wallet exists from onboarding, store address in profile
3. Console markers: `OTP_SENT`, `OTP_OK`
4. Navigate to `/app/home`

### 4. KYC (Module C)

#### 3-Tab Structure
1. **Basic Info** (test-id: `kyc-dob-open`)
   - Name, DOB (wheel picker), nationality, phone, city, postal code
   - Auto-save draft functionality
   - Inline validation

2. **Identity Documents**
   - ID type selection (Aadhaar, Passport, Driver's License)
   - Upload: ID front, ID back, selfie
   - Max file size: 10MB

3. **Enhanced** (future)
   - Proof of address upload

#### Submission
- Single **Submit** button (test-id: `kyc-submit`)
- Console marker: `KYC_SUBMIT_OK`
- Status: pending → Admin review

#### Admin Features
- **KYC Inbox**: List all submissions
- **Case Details**: Open, view documents, Approve/Reject/Need Info
- **Settings**: `min_age_years`, allowed file types, max file size

### 5. Programs (Module D)

#### User View
- Simple grid of program cards
- Each card shows: Icon, Title, Description
- Disabled programs show "Unavailable"
- Console marker: `PROGRAMS_READY`

#### Admin Control
- **Admin → Programs**: Enable/disable each program
- **Settings**: Fee percentages, limits, parameters
- Changes reflected immediately in user view

### 6. Referral System (Module E)

#### Share Options (File: `src/pages/ReferralShareMVP.tsx`)
1. **Web Link** (test-id: `ref-share-link`)
   ```
   https://i-smartapp.com/r/<code>
   ```
   - Copy button provided
   - Works in any browser

2. **Android Intent Link** (test-id: `ref-share-intent`)
   ```
   intent://r/<code>#Intent;scheme=https;package=com.ismart.exchange;S.browser_fallback_url=https%3A%2F%2Fi-smartapp.com%2Fdownload%3Fref%3D<code>;end
   ```
   - Copy button provided
   - Opens app directly OR downloads if not installed

#### Capture Logic
- Routes: `/r/:code` and `?ref=` parameter
- Stores in `sessionStorage` and `localStorage`
- Console marker: `REF_CAPTURE_OK`
- Toast: "Referral applied"
- Redirects to `/onboarding` or `/auth`

#### Download Page (`/download`)
- Shows referral code if captured
- **Download APK** button
- **Open in App** button (uses intent link)
- Fallback URL to download page

### 7. Admin Basics (Module F)

#### Admin Panel
- **Users Management**: View all users, profiles, KYC status
- **KYC Review**: Approve/reject submissions
- **Programs Control**: Enable/disable, set parameters
- **System Settings**: SMTP config, APK download URL
- **Health Page**: SMTP/Auth/Storage status (green/red indicators)

#### Health Checks
```
✓ SMTP Connection
✓ Supabase Auth
✓ Storage Buckets
✗ Failed Service (with details)
```

## Test IDs & Console Markers

### Test IDs
```typescript
// Onboarding
'onb-create'      // Create wallet button
'onb-import'      // Import wallet button
'wallet-confirm'  // Confirm phrase button

// OTP
'otp-email'       // Email input field
'otp-send'        // Send OTP button
'otp-verify'      // Verify OTP button

// KYC
'kyc-dob-open'    // DOB picker open button
'kyc-submit'      // Submit KYC button

// Referral
'ref-share-link'    // Share web link button
'ref-share-intent'  // Share intent link button
```

### Console Markers
```typescript
'MVP_READY'          // App initialized
'WALLET_OK'          // Wallet created/imported
'OTP_SENT'           // OTP code sent
'OTP_OK'             // OTP verified, logged in
'KYC_SUBMIT_OK'      // KYC submitted
'REF_CAPTURE_OK'     // Referral captured
'PROGRAMS_READY'     // Programs loaded
```

## APK Build Instructions

1. **Export to Github**
   ```bash
   git pull
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Build Web Assets**
   ```bash
   npm run build
   ```

4. **Sync Capacitor**
   ```bash
   npx cap sync android
   ```

5. **Open Android Studio**
   ```bash
   npx cap open android
   ```

6. **Build Release APK**
   - Build → Generate Signed Bundle/APK
   - Select APK
   - Choose keystore (or create new)
   - Build variant: release
   - Output: `android/app/build/outputs/apk/release/app-release.apk`

## Testing Checklist

### 1. Installation
- [ ] APK installs without errors
- [ ] App opens to splash screen
- [ ] Splash shows for 2 seconds then redirects

### 2. Wallet Creation
- [ ] Create wallet generates 12 words
- [ ] Can copy phrase
- [ ] Can download phrase
- [ ] Shows BEP20 address with QR code
- [ ] Address starts with "0x"

### 3. Wallet Import
- [ ] Can paste 12-word phrase
- [ ] Invalid phrase shows error
- [ ] Valid phrase derives correct address
- [ ] Same mnemonic = same address

### 4. Email OTP Login
- [ ] Email input works
- [ ] "Send Code" sends OTP to email
- [ ] Can enter 6-digit code
- [ ] Verification succeeds
- [ ] Profile created with username
- [ ] Wallet address saved to profile

### 5. KYC
- [ ] All fields editable
- [ ] DOB picker works (wheel style)
- [ ] Can upload ID front/back/selfie
- [ ] Submit button works
- [ ] Status shows "Under Review"
- [ ] Admin can approve/reject

### 6. Referral Links
- [ ] Web link works: `https://i-smartapp.com/r/<code>`
- [ ] Opens app on Android with code captured
- [ ] Browser fallback works if app not installed
- [ ] Intent link works: copy → paste → opens app
- [ ] Download page shows captured ref code

### 7. Programs
- [ ] Programs grid loads
- [ ] Enabled programs are clickable
- [ ] Disabled programs show "Unavailable"
- [ ] Admin toggle affects user view immediately

### 8. UI/UX
- [ ] No animations or transitions
- [ ] No overlap with Android nav bar
- [ ] Safe area respected on all screens
- [ ] All text readable (no white on white)
- [ ] Bottom nav always visible
- [ ] Scrolling smooth, no lag

## Known Limitations

1. **No Fancy UI**: Deliberately simple, flat design
2. **No Animations**: All transitions disabled for performance
3. **Single Theme**: Dark only, no light mode toggle
4. **Mobile Only**: Optimized for phone screens
5. **APK Distribution**: Not on Google Play (manual install required)

## Troubleshooting

### Wallet Not Showing
- Check console for `WALLET_OK` marker
- Verify mnemonic is valid BIP39
- Check Web3 context for wallet object

### OTP Not Received
- Check SMTP settings in Admin → System
- Verify email is correct (no typos)
- Check spam folder

### Referral Not Captured
- Check console for `REF_CAPTURE_OK` marker
- Verify sessionStorage has `ipg_ref_code`
- Test with `adb logcat` for Android logs

### KYC Upload Fails
- Check file size (max 10MB)
- Verify storage bucket exists
- Check RLS policies allow insert

## Success Metrics

✅ APK installs and opens without crashes
✅ Wallet creation/import produces valid BEP20 address
✅ Email OTP login creates profile with username
✅ KYC submission works, admin can review
✅ Referral links work in browser and APK
✅ Programs load and admin controls work
✅ No visual glitches, no overlap issues
✅ All console markers present
✅ All test IDs accessible

## Final Checklist

- [ ] `data-version="core-mvp"` in index.html
- [ ] All animations disabled in tailwind.config.ts
- [ ] Safe-area utilities used on all screens
- [ ] Console markers added to all key flows
- [ ] Test IDs added to all interactive elements
- [ ] Referral intent links tested on Android
- [ ] APK download URL configured in admin
- [ ] SMTP settings configured for OTP
- [ ] Health page shows all systems green
- [ ] Admin can manage users, KYC, programs

---

**Version**: Safe Mode MVP v1.0
**Last Updated**: 2025-10-13
**Status**: Ready for Testing
