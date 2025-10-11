# 📱 Referral Link Testing Guide for APK

## ✅ What's Been Updated

The app now uses **native sharing** for referral links inside the APK. When users tap the "Share" button, it will open the Android native share dialog allowing them to share via WhatsApp, Telegram, SMS, Email, etc.

### Updated Components:
1. **Referral Program Page** (`/app/profile/referrals`)
   - ✅ Share button uses Capacitor Share plugin
   - ✅ Deep links work: `https://i-smartapp.com/r/{code}`
   
2. **Badge ID Card Sharing**
   - ✅ Native share for badge ID with referral link
   
## 🔄 How to Update Your APK

Since you've already built the APK once, follow these steps to rebuild with the new referral sharing feature:

### 1. Pull Latest Code
```bash
cd your-project-folder
git pull origin main
```

### 2. Install New Dependencies
```bash
npm install
```

### 3. Build Web Assets
```bash
npm run build
```

### 4. Sync to Android
```bash
npx cap sync android
```

### 5. Update Version Numbers
Open `android/app/build.gradle` and increment:
```gradle
versionCode 2          // Was 1, now 2
versionName "1.1.0"    // Was 1.0.0, now 1.1.0
```

### 6. Build Signed APK
1. Open Android Studio
2. Build → Generate Signed Bundle/APK → APK
3. Use your **existing keystore** (same one from before)
4. Select "release" build variant
5. Sign and generate APK

### 7. Install Update
- Transfer APK to your phone
- Tap to install
- Android will recognize it as an update (not a new install)
- Your data will be preserved ✅

## 🧪 Testing Referral Links in APK

### Test 1: Share Button
1. Open the app
2. Go to **Profile → Referral Program**
3. Tap the **"Share"** button
4. ✅ **Expected**: Native Android share dialog opens
5. Select WhatsApp/Telegram/etc
6. ✅ **Expected**: Link appears like: `https://i-smartapp.com/r/ABC123`

### Test 2: Copy Button
1. Tap the **"Copy Link"** button
2. ✅ **Expected**: Toast shows "Referral link copied!"
3. Paste in any app
4. ✅ **Expected**: Link is: `https://i-smartapp.com/r/{your-code}`

### Test 3: Deep Link Opening (Requires AndroidManifest.xml setup)
**Note**: This requires the Android manifest configuration from `APK_BUILD_GUIDE.md`

1. Send your referral link to yourself via SMS/WhatsApp
2. On a device with the app installed, tap the link
3. ✅ **Expected**: Android asks "Open with I-SMART Exchange app?"
4. Select the app
5. ✅ **Expected**: App opens to registration with referral code applied

### Test 4: Badge ID Sharing
1. Go to **Profile → Badge ID**
2. Tap the **Share** button
3. ✅ **Expected**: Native share dialog with referral link included

## 🔧 Troubleshooting

### Share Button Opens Browser Instead
- **Cause**: Deep linking not configured
- **Fix**: Follow `ANDROID_DEEP_LINKING_SETUP.md` to configure `AndroidManifest.xml`

### Share Dialog Doesn't Appear
- **Cause**: Not installed as native app
- **Fix**: Install the APK (not running in browser)

### Link Not Working
1. Check the link format: Should be `https://i-smartapp.com/r/{code}`
2. Make sure user has completed onboarding to get a referral code
3. Check Profile page shows referral link correctly

## 📋 Checklist

Before distributing the update to users:

- [ ] Pulled latest code
- [ ] Installed dependencies (`npm install`)
- [ ] Built web assets (`npm run build`)
- [ ] Synced to Android (`npx cap sync android`)
- [ ] Incremented version in `build.gradle`
- [ ] Built signed APK with existing keystore
- [ ] Tested share button on device
- [ ] Tested copy button on device
- [ ] Verified link format is correct
- [ ] (Optional) Configured deep linking in AndroidManifest.xml
- [ ] Tested app update (installs over old version)

## 🚀 What Users Will Experience

When users install this update:

1. **No re-download needed**: Update installs over existing app
2. **Data preserved**: Login session, settings, balances all kept
3. **New feature**: Share button now opens native Android share dialog
4. **Better experience**: Easy sharing to WhatsApp, Telegram, etc.

## 📱 Native Share Benefits

✅ **Share to any app**: WhatsApp, Telegram, SMS, Email, etc.  
✅ **Native UI**: Familiar Android share dialog  
✅ **No browser needed**: Direct sharing from app  
✅ **Better conversion**: Easier for users to share = more referrals  

## 🔗 Related Files

- `src/pages/astra/ReferralsPage.tsx` - Main referral page
- `src/components/badge-id/BadgeIdCardSheet.tsx` - Badge sharing
- `APK_BUILD_GUIDE.md` - Complete APK build instructions
- `ANDROID_DEEP_LINKING_SETUP.md` - Deep linking configuration

## 💡 Tips

1. **Test on real device**: Emulator may not have share targets installed
2. **Share with yourself**: Send link to your own WhatsApp to test
3. **Check link format**: Always starts with `https://i-smartapp.com/r/`
4. **Version tracking**: Keep track of version numbers for updates
