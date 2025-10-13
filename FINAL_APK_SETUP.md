# 🚀 Final APK Setup & Deployment Guide

## ✅ All Fixes Applied

### 1. **Scrolling & Overlap Issues** ✓
- Fixed bottom navigation overlapping content
- Added dynamic safe-area spacers to `DockNav.tsx` and `CurvedBottomNav.tsx`
- Content now properly scrolls with adequate padding

### 2. **Profile Redirect Issue** ✓
- Removed aggressive redirect to `/onboarding` in `ProfileHub.tsx`
- Updated `UnlockGate.tsx` to skip security checks for profile routes
- Users can now view profile without unwanted redirects

### 3. **Referral Links in APK** ✓
- Fixed deep link handler to accept both `i-smartapp.com` and `www.i-smartapp.com`
- Updated `public/.well-known/assetlinks.json` with correct SHA-256 fingerprints
- Android App Links now properly open the app instead of browser
- WhatsApp sharing stays in-app using native sharing

---

## 📋 Complete Build Instructions

### Step 1: Pull Latest Code
```bash
cd your-project-directory
git pull origin main
npm install
```

### Step 2: Build Web Assets
```bash
npm run build
```

### Step 3: Sync to Android
```bash
npx cap sync android
```

### Step 4: Open in Android Studio
```bash
npx cap open android
```

### Step 5: Build Release APK
In Android Studio:
1. **Build** → **Generate Signed Bundle/APK**
2. Select **APK**
3. Choose your keystore (or create new one)
4. Select **release** build variant
5. Click **Finish**

APK will be in: `android/app/release/app-release.apk`

---

## 🌐 Domain Setup (Critical for App Links)

### 1. Deploy assetlinks.json to Your Website
The file `public/.well-known/assetlinks.json` MUST be accessible at:
```
https://i-smartapp.com/.well-known/assetlinks.json
```

**Verify it's live:**
```bash
curl https://i-smartapp.com/.well-known/assetlinks.json
```

Expected response:
```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.ismart.exchange",
      "sha256_cert_fingerprints": [
        "8A:E8:4F:D8:D9:86:9B:BC:29:F8:D1:51:D1:8C:0B:86:51:A9:20:6F:1E:BB:EC:8D:B1:B2:AE:DF:B5:59:FA:2D",
        "46:5D:F9:50:6A:8D:C2:6F:42:B2:A1:A1:3B:DF:7C:B2:49:BA:F3:FD:43:16:4B:96:5B:CA:34:20:ED:80:5A:4A"
      ]
    }
  }
]
```

### 2. Validate Android App Links
Use Google's validation tool:
https://developers.google.com/digital-asset-links/tools/generator

Enter:
- **Site domain**: `i-smartapp.com`
- **Package name**: `com.ismart.exchange`
- **Fingerprint**: Your release keystore SHA-256

---

## 🧪 Complete Testing Checklist

### A. Install & Launch
- [ ] Install APK on Android device
- [ ] App launches without crashes
- [ ] Splash screen displays correctly
- [ ] Safe area padding works (no notch overlap)

### B. Authentication Flow
- [ ] User can register new account
- [ ] Email verification works
- [ ] User can login
- [ ] Biometric/PIN lock works
- [ ] App lock activates on background/foreground

### C. Navigation & UI
- [ ] Bottom navigation displays correctly
- [ ] All tabs accessible and functional
- [ ] Content scrolls without overlapping bottom nav
- [ ] Profile page loads without redirects
- [ ] No white-on-white or black-on-black text issues

### D. Referral Links (Critical)
- [ ] **Test 1: Native Share from App**
  - Open app → Referrals page → Click Share
  - Native Android share dialog opens
  - Select WhatsApp
  - Link format: `https://i-smartapp.com/r/ABC123`
  - Message stays in WhatsApp (doesn't open browser)

- [ ] **Test 2: App Link Opening**
  - Send referral link to another device: `https://i-smartapp.com/r/ABC123`
  - Click link in WhatsApp/SMS
  - **Expected**: App opens directly (if installed)
  - **If not installed**: Browser opens with download option

- [ ] **Test 3: ADB Testing (Developer)**
  ```bash
  adb shell am start -a android.intent.action.VIEW \
    -d "https://i-smartapp.com/r/ABC123"
  ```
  - App should open directly to registration with code applied

- [ ] **Test 4: Copy Link**
  - Copy referral link from app
  - Paste in WhatsApp
  - Send to friend
  - Friend clicks → App opens (if installed)

### E. Wallet & Transactions
- [ ] Wallet displays correct balance
- [ ] Deposit flow works
- [ ] Withdrawal flow works
- [ ] Transaction history loads

### F. Performance
- [ ] App loads quickly (< 3 seconds)
- [ ] No janky scrolling or animations
- [ ] Images load properly
- [ ] No memory leaks (use profiler)

---

## 🔧 Troubleshooting

### Issue: Referral link opens browser instead of app
**Cause**: Android App Links not verified yet

**Solutions**:
1. **Wait 24-48 hours** for Google to verify your domain
2. **Use fallback**: Share `https://i-smartapp.com/deeplink/r/ABC123` instead
3. **Check assetlinks.json**: Must be accessible without auth
4. **Verify SHA-256**: Must match your release keystore exactly

**How to get your release keystore SHA-256**:
```bash
keytool -list -v -keystore your-release.jks -alias your-alias | grep SHA256
```

### Issue: Share button opens browser
**Cause**: Old APK version or incorrect import

**Solution**: 
- Ensure latest code: `git pull && npm install && npm run build && npx cap sync android`
- Rebuild APK completely
- Uninstall old APK before installing new one

### Issue: Profile redirects to onboarding
**Cause**: Old cached APK or not synced

**Solution**:
- Clear app data: Settings → Apps → I-SMART → Storage → Clear Data
- Reinstall APK
- Run `npx cap sync android` before building

### Issue: Bottom nav overlaps content
**Cause**: Old build or missing sync

**Solution**:
- Full rebuild: `npm run build && npx cap sync android`
- Force close app and reopen
- Check that `DockNav.tsx` and `CurvedBottomNav.tsx` have spacer code

---

## 📦 Final Deployment Steps

### 1. Build Production APK
```bash
git pull origin main
npm install
npm run build
npx cap sync android
npx cap open android
# In Android Studio: Build → Generate Signed Bundle/APK → release
```

### 2. Upload to Hosting
Upload `app-release.apk` to your server (e.g., S3, Firebase Hosting, etc.)

Update the download link at:
- `/download` page
- Any marketing materials
- Social media posts

### 3. Verify Domain Setup
```bash
# Check assetlinks.json is live
curl https://i-smartapp.com/.well-known/assetlinks.json

# Validate with Google
# Visit: https://developers.google.com/digital-asset-links/tools/generator
```

### 4. Test End-to-End
- Install APK on clean device
- Register new user with referral link
- Verify referral captured correctly in database
- Test all core features

### 5. Monitor
- Check Supabase analytics for errors
- Monitor user feedback
- Watch for crash reports

---

## 📊 Success Metrics

After deployment, monitor:
- **Install Rate**: % of users who install after clicking link
- **Referral Conversion**: % of referrals that complete registration
- **App Link Success**: % of links that open app vs browser
- **User Retention**: % of users returning after 7 days

---

## 🎯 Final Checklist Before Release

- [ ] All code pulled and synced
- [ ] Web assets built (`npm run build`)
- [ ] Android synced (`npx cap sync android`)
- [ ] Release APK signed with production keystore
- [ ] assetlinks.json deployed and accessible
- [ ] App Links validated with Google tool
- [ ] All features tested on physical device
- [ ] Referral links tested end-to-end
- [ ] Profile page accessible without redirects
- [ ] Bottom nav doesn't overlap content
- [ ] APK uploaded to hosting
- [ ] Download page updated with new APK URL
- [ ] Team notified of new release

---

## 📞 Support

If issues persist after following this guide:
1. Check console logs: Chrome DevTools → Remote Devices
2. Review Supabase logs for backend errors
3. Test on multiple Android devices/versions
4. Verify keystore SHA-256 matches assetlinks.json exactly

---

**Version**: Final Release
**Date**: 2025-10-13
**Package**: com.ismart.exchange
**All Fixes Applied**: ✅ Scrolling, ✅ Profile Redirect, ✅ Referral Links
