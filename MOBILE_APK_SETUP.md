# 📱 Mobile APK Setup Guide - I-SMART Exchange

## ✅ Fixed Issues

### 1. Safe Area / Overlapping with System Buttons ✓
**Status:** FIXED

**What was done:**
- Updated `viewport` meta tag with `viewport-fit=cover`
- Added proper safe area insets to bottom navigation
- Configured Capacitor for iOS and Android safe areas
- Updated `capacitor.config.ts` with proper settings

**To apply:**
```bash
# After pulling from GitHub
npx cap sync
```

---

### 2. Deep Linking / Referral Links ✓
**Status:** FIXED

**What was done:**
- Created `AndroidManifest.xml` with deep link configurations
- Added support for both `https://i-smartapp.com/r/:code` and `ismart://referral/:code`
- Created `useDeepLinking` hook to handle deep links in the app
- Integrated deep linking into App.tsx

**Supported Deep Links:**
1. `https://i-smartapp.com/r/{sponsorId}` - Web referral links
2. `ismart://referral/{sponsorId}` - Custom app scheme
3. `ismart://...` - Other app-specific links

**Testing:**
```bash
# Test deep link on Android
adb shell am start -W -a android.intent.action.VIEW -d "https://i-smartapp.com/r/SPONSOR_ID" com.ismart.exchange

# Or test custom scheme
adb shell am start -W -a android.intent.action.VIEW -d "ismart://referral/SPONSOR_ID" com.ismart.exchange
```

---

### 3. Biometrics Authentication ✓
**Status:** WORKING (Already implemented)

**What exists:**
- Using `@aparajita/capacitor-biometric-auth` package (already installed)
- Full biometric authentication in `useAuthLock.ts` hook
- Supports both iOS Face ID/Touch ID and Android fingerprint
- Proper error handling and fallback to PIN

**No additional changes needed** - This should work in the APK once you build it!

---

### 4. Email Functionality ⚠️
**Status:** NEEDS CONFIGURATION

**What exists:**
- Edge function `send-verification-email` is ready
- Beautiful email templates for onboarding and verification
- Resend integration configured

**What you need to do:**

1. **Get Resend API Key:**
   - Go to [https://resend.com](https://resend.com)
   - Sign up/login
   - Create API key at [https://resend.com/api-keys](https://resend.com/api-keys)

2. **Add API key as secret:**
   - Go to Supabase Dashboard
   - Navigate to: Project Settings → Edge Functions → Secrets
   - Add secret:
     - Name: `RESEND_API_KEY`
     - Value: `re_...` (your API key)

3. **Configure sender email (Optional):**
   - Add `SMTP_FROM` secret: Your verified email (e.g., `info@i-smartapp.com`)
   - Add `SMTP_NAME` secret: Your sender name (e.g., `IPG I-SMART EXCHANGE`)
   - **Note:** You must verify the domain at [https://resend.com/domains](https://resend.com/domains)

**Default sender if not configured:**
- `IPG I-SMART EXCHANGE <info@i-smartapp.com>`

---

### 5. Admin Database Reset ✓
**Status:** IMPLEMENTED

**What was done:**
- Created `admin-reset-database` edge function
- Created admin UI at `/admin/nova/database-reset`
- Can reset:
  - ✅ All non-admin users
  - ✅ All balances (BSK, wallet)
  - ✅ Transaction history

**How to use:**
1. Login as admin
2. Navigate to `/admin/nova/database-reset`
3. Select what to reset
4. Type confirmation: `RESET_DATABASE_CONFIRM`
5. Click "Reset Database"

---

## 🚀 Next Steps - Building Your APK

### 1. Export to GitHub
```bash
# Click "Export to GitHub" button in Lovable
# Then clone your repo locally
git clone https://github.com/yourusername/your-repo.git
cd your-repo
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Build the Project
```bash
npm run build
```

### 4. Sync Capacitor
```bash
npx cap sync android
```

### 5. Open in Android Studio
```bash
npx cap open android
```

### 6. Build APK
In Android Studio:
1. Go to **Build** → **Generate App Bundles or APKs** → **Build APK(s)**
2. Wait for build to complete
3. Find APK at: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 📋 Checklist Before Building

- [ ] Configure Resend API key for emails
- [ ] Verify domain at Resend (if using custom domain)
- [ ] Test deep links after APK installation
- [ ] Test biometrics on physical device
- [ ] Verify safe area on different Android devices
- [ ] Test referral links (both web and custom scheme)

---

## 🐛 Troubleshooting

### Deep Links Not Working
1. Check `AndroidManifest.xml` is properly synced
2. Verify app is installed via APK (not debug mode)
3. Test with `adb` commands above

### Biometrics Not Working
1. Ensure device has biometric hardware
2. Check device has at least one fingerprint/face enrolled
3. Verify permissions in `AndroidManifest.xml`

### Emails Not Sending
1. Check RESEND_API_KEY secret is set
2. Verify domain at Resend dashboard
3. Check edge function logs in Supabase

### Safe Area Issues
1. Make sure to run `npx cap sync` after git pull
2. Test on devices with different notch/button configurations
3. Check `capacitor.config.ts` is properly configured

---

## 📚 Additional Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Resend Documentation](https://resend.com/docs)
- [Android Deep Links Guide](https://developer.android.com/training/app-links)
- [Biometric Auth Plugin](https://github.com/aparajita/capacitor-biometric-auth)

---

## 🎯 Testing Checklist

After building APK, test these features:

### Core Features
- [ ] App launches successfully
- [ ] Login/signup works
- [ ] PIN setup works
- [ ] Biometric unlock works
- [ ] Navigation works (no white screens)

### Deep Links
- [ ] Web referral link opens app
- [ ] Custom scheme opens app
- [ ] Referral code is captured correctly
- [ ] New users are linked to sponsor

### Safe Area
- [ ] Bottom navigation doesn't overlap system buttons
- [ ] Header doesn't overlap status bar/notch
- [ ] All screens have proper padding

### Email
- [ ] Verification emails arrive
- [ ] Email templates display correctly
- [ ] Links in emails work

---

## 💡 Pro Tips

1. **Always test on physical device** - Emulators may not support biometrics
2. **Test deep links from SMS/Email** - This is how users will experience them
3. **Check different Android versions** - Test on Android 10, 11, 12, 13+
4. **Monitor Supabase logs** - Use edge function logs to debug issues
5. **Use production build** - Debug builds may behave differently

---

## 🆘 Need Help?

If you encounter issues:
1. Check the browser/app console logs
2. Check Supabase edge function logs
3. Review Android logcat: `adb logcat | grep I-SMART`
4. Check the error messages in the app

---

**Last Updated:** 2025-10-11
**Version:** 1.0.0
