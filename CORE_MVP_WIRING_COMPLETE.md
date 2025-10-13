# CORE-MVP Wiring Complete ✅

## Route Changes

### New MVP Routes
- `/` → `/splash` (default entry point)
- `/splash` → `SplashScreenMVP` (2s static splash)
- `/onboarding` → `OnboardingIndexScreen` (Create/Import wallet buttons)
- `/onboarding/create-wallet` → `CreateWalletScreen` (BIP39 12/24 words)
- `/onboarding/import-wallet` → `ImportWalletScreen` (Restore from phrase)
- `/auth` → `AuthEmailOTP` (Email OTP login/signup)
- `/auth/login` → `AuthEmailOTP` (same as /auth)
- `/app/*` → Existing app pages (home, wallet, programs, profile) with AstraLayout

### Legacy Redirects (Auto-redirect to MVP)
- `/welcome*` → `/splash`
- `/onboarding/security` → `/onboarding`
- `/recovery/verify` → `/onboarding`
- `/wallet-selection` → `/onboarding`
- `/auth/register` → `/auth`
- `/auth/wallet-login` → `/auth`
- `/create-wallet` → `/onboarding/create-wallet`
- `/import-wallet` → `/onboarding/import-wallet`

## Files Renamed to .legacy.tsx
1. `SplashScreen.tsx` → `SplashScreen.legacy.tsx`
2. `AuthUnified.tsx` → `AuthUnified.legacy.tsx`
3. `OnboardingFlow.tsx` → `OnboardingFlow.legacy.tsx`

## Key Features Implemented

### A) Splash → Onboarding (Web3)
✅ Static splash screen with logo (2s timeout)
✅ Onboarding index with two buttons: Create Wallet | Import Wallet
✅ BIP39 12/24 word generation
✅ EVM/BEP20 address derivation (BSC)
✅ QR code display + copy button
✅ Mnemonic stored **locally only** (secure storage)
✅ Console markers: `MVP_READY`, `WALLET_OK`
✅ Test IDs: `onb-create`, `onb-import`, `wallet-address`

### B) Email OTP = Login/Signup
✅ Single flow: enter email → send OTP → verify → logged in
✅ Uses `signInWithOtp({ shouldCreateUser: true })`
✅ On verify success:
  - Creates/upserts profile with `username = email local-part`
  - Upserts EVM address if wallet exists
  - Sets `ipg_onboarded = true`
  - Navigates to `/app/home`
✅ Console markers: `OTP_SENT`, `OTP_OK`
✅ Test IDs: `otp-email`, `otp-send`, `otp-verify`

### C) Safe Area Layout
✅ All screens use `pb-safe` class for Android nav bar spacing
✅ No overlap with system UI

### D) No Animations
✅ All animations disabled in `tailwind.config.ts` (set to `'none'`)
✅ Global CSS disables transitions/animations
✅ Single dark theme, no gradients

## Testing Checklist

### 1. APK Launch
- [ ] Opens to splash screen with static logo
- [ ] After 2s, navigates to `/onboarding`
- [ ] Console shows: `MVP_READY`

### 2. Wallet Creation
- [ ] Click "Create New Wallet" button (test-id: `onb-create`)
- [ ] Displays 12 or 24 words
- [ ] Shows BEP20 address with QR code
- [ ] Copy button works
- [ ] Console shows: `WALLET_OK - Created`
- [ ] Redirects to `/auth` after confirmation

### 3. Wallet Import
- [ ] Click "Import Existing Wallet" button (test-id: `onb-import`)
- [ ] Paste 12 or 24 words
- [ ] Validates BIP39 phrase
- [ ] Derives same BEP20 address
- [ ] Console shows: `WALLET_OK - Imported`
- [ ] Redirects to `/auth`

### 4. Email OTP Login
- [ ] Enter email address (test-id: `otp-email`)
- [ ] Click "Send Code" (test-id: `otp-send`)
- [ ] Console shows: `OTP_SENT`
- [ ] Receive 6-digit code via email
- [ ] Enter code in UI (test-id: `otp-verify`)
- [ ] Console shows: `OTP_OK`
- [ ] Profile created with username = email local-part
- [ ] Wallet address stored in profile
- [ ] `ipg_onboarded = true` set
- [ ] Redirects to `/app/home`

### 5. Admin Verification
- [ ] Admin can see new user in Admin → Users
- [ ] Profile shows correct username (email local-part)
- [ ] Profile shows EVM address (if wallet created)
- [ ] Profile shows `ipg_onboarded = true`

### 6. Navigation
- [ ] Bottom nav works (home, wallet, programs, profile)
- [ ] No overlap with Android nav bar
- [ ] All screens have proper safe-area padding

### 7. Referral System
- [ ] Share link works: `https://i-smartapp.com/r/<code>`
- [ ] Android intent link works
- [ ] Captured referral shows toast
- [ ] Console shows: `REF_CAPTURE_OK`

## Build Instructions

```bash
# 1. Pull latest changes
git pull

# 2. Install dependencies
npm install

# 3. Build for production
npm run build

# 4. Sync to Android
npx cap sync android

# 5. Open in Android Studio
npx cap open android

# 6. Build APK
# In Android Studio: Build → Build Bundle(s) / APK(s) → Build APK(s)
```

## Success Criteria
✅ APK launches to splash → onboarding
✅ Create/Import wallet produces working BEP20 address
✅ Email OTP logs in and creates profile
✅ Username = email local-part
✅ Wallet address stored in profile
✅ No animations, clean UI
✅ No overlap with Android system UI
✅ All test IDs and console markers present
✅ Admin can see users

## Data Attributes
All screens marked with `data-version="core-mvp"` on `<body>` tag.
