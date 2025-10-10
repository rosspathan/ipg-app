# Complete APK Build Guide for I-SMART Exchange

This comprehensive guide will walk you through building a fully functional Android APK with:
- ✅ Referral links working in-app
- ✅ Deep linking configured
- ✅ All external links opening in in-app browser
- ✅ Custom branding (no Lovable logo)
- ✅ Proper PIN and biometric authentication

---

## 📋 Prerequisites

Before starting, ensure you have:
- Node.js and npm installed
- Android Studio installed
- Git installed
- A signing keystore (for production APK)

---

## 🚀 Step 1: Export and Clone Your Project

1. **Export to GitHub**:
   - Click "Export to GitHub" button in Lovable
   - Choose a repository name

2. **Clone Locally**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
   cd YOUR_REPO
   ```

---

## 📦 Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages including Capacitor.

---

## 🔧 Step 3: Add Android Platform

```bash
npx cap add android
```

This creates the `android/` folder with the native Android project.

---

## 🎨 Step 4: Add App Logo

### Option A: Manual Replacement
1. Navigate to `android/app/src/main/res/`
2. Replace icon files in these folders:
   - `mipmap-hdpi/` (72x72px)
   - `mipmap-mdpi/` (48x48px)
   - `mipmap-xhdpi/` (96x96px)
   - `mipmap-xxhdpi/` (144x144px)
   - `mipmap-xxxhdpi/` (192x192px)

### Option B: Use Android Asset Studio
1. Visit [Android Asset Studio](https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html)
2. Upload your I-SMART logo
3. Download the generated files
4. Replace files in `android/app/src/main/res/`

---

## 🔗 Step 5: Configure Deep Linking for Referrals

1. Open `android/app/src/main/AndroidManifest.xml`
2. Find the `<activity android:name=".MainActivity">` tag
3. Add these intent filters **inside** the activity tag:

```xml
<activity
    android:name=".MainActivity"
    android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
    android:label="@string/title_activity_main"
    android:theme="@style/AppTheme.NoActionBarLaunch"
    android:launchMode="singleTask"
    android:exported="true">
    
    <!-- Existing launcher intent -->
    <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
    </intent-filter>

    <!-- Custom Scheme: ismart://referral/USER_ID -->
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data 
            android:scheme="ismart" 
            android:host="referral" />
    </intent-filter>

    <!-- HTTPS App Links: https://i-smartapp.com/r/USER_ID -->
    <intent-filter android:autoVerify="true">
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data 
            android:scheme="https"
            android:host="i-smartapp.com"
            android:pathPrefix="/r" />
    </intent-filter>

</activity>
```

---

## 🏗️ Step 6: Build the Web Assets

```bash
npm run build
```

This creates the `dist/` folder with optimized web assets.

---

## 🔄 Step 7: Sync to Android

```bash
npx cap sync android
```

This copies the web assets to the Android project.

---

## 🛠️ Step 8: Open in Android Studio

```bash
npx cap open android
```

Android Studio will open with your project.

---

## 🔐 Step 9: Generate Signed APK

### First Time Setup (Create Keystore):

```bash
keytool -genkey -v -keystore my-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias my-key-alias
```

**Important**: Save the keystore file and passwords securely!

### In Android Studio:

1. **Build > Generate Signed Bundle / APK**
2. Choose **APK**
3. Click **Next**
4. Select your keystore file (or create new)
5. Enter keystore password and key alias
6. Choose build variant: **release**
7. Click **Finish**

Your APK will be at:
```
android/app/release/app-release.apk
```

---

## ✅ Step 10: Test the APK

### Install on Device:

```bash
adb install android/app/release/app-release.apk
```

### Test Referral Links:

```bash
# Test custom scheme
adb shell am start -W -a android.intent.action.VIEW -d "ismart://referral/TEST_USER_ID" com.ismart.exchange

# Test HTTPS link
adb shell am start -W -a android.intent.action.VIEW -d "https://i-smartapp.com/r/TEST_USER_ID" com.ismart.exchange
```

### Manual Testing:
1. Send yourself a referral link via WhatsApp or SMS
2. Click the link on your device
3. App should open directly with the referral

---

## 🎯 What's Already Configured

Your app now has:

### ✅ In-App Features:
- **PIN Authentication**: 6-digit PIN with secure hashing
- **Biometric Authentication**: Fingerprint/Face unlock
- **In-App Browsing**: All external links open in-app browser
- **Deep Linking**: Referral links open directly in app
- **WhatsApp Support**: Opens WhatsApp in-app
- **Announcements**: External links handled properly

### ✅ App Configuration:
- **App ID**: `com.ismart.exchange`
- **App Name**: `I-SMART Exchange`
- **Deep Link Schemes**: 
  - `ismart://referral/USER_ID`
  - `https://i-smartapp.com/r/USER_ID`

---

## 🐛 Troubleshooting

### Issue: Referral links don't open app

**Solution**:
1. Verify AndroidManifest.xml has correct intent filters
2. Reinstall the APK after changes
3. Check that `android:exported="true"` is set on MainActivity

### Issue: Links open in external browser

**Solution**:
- Check that `@capacitor/browser` is installed
- Verify `linkHandler.ts` is being used
- Check console logs for errors

### Issue: App won't install

**Solution**:
1. Uninstall existing version first
2. Enable "Install from Unknown Sources" in device settings
3. Check APK signature is valid

### Issue: PIN/Biometric not working

**Solution**:
- Clear app data and cache
- Check device has biometric hardware
- Verify device has secure lock screen enabled

---

## 🔄 Making Updates

After any code changes:

```bash
# 1. Build web assets
npm run build

# 2. Sync to Android
npx cap sync android

# 3. Rebuild APK in Android Studio
# Build > Generate Signed Bundle / APK
```

---

## 📱 Distribution

### Google Play Store:
1. Create a Google Play Developer account
2. Build an **AAB** (Android App Bundle) instead of APK
3. Upload to Play Console
4. Complete store listing

### Direct Distribution:
- Share the APK file directly
- Users must enable "Install from Unknown Sources"

---

## 🔒 Security Notes

1. **Keep Keystore Safe**: Loss means you can't update your app
2. **Backup Passwords**: Store keystore passwords securely
3. **Version Control**: Don't commit keystore to Git
4. **Test Thoroughly**: Test all features before releasing

---

## 📞 Support

If you encounter issues:
1. Check console logs in Android Studio
2. Use `adb logcat` for runtime logs
3. Verify all dependencies are installed
4. Ensure Android SDK is up to date

---

## ✨ Features Summary

Your I-SMART Exchange app includes:
- 🔐 Secure PIN & Biometric authentication
- 🔗 Deep linking for referrals
- 📱 In-app browser for external links
- 💰 Crypto wallet integration
- 🎁 Referral program
- 📊 Staking & mining features
- 💬 In-app WhatsApp support
- 🎨 Custom branding (no Lovable logo)

---

## 🎉 You're Done!

Your APK is ready to distribute with all features working within the app.
