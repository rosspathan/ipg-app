# Production APK Build Guide

This guide will help you build a production-ready APK for the I-SMART Exchange app.

## Prerequisites

1. **Git Repository**: Export your project to GitHub
2. **Node.js**: Install Node.js (v18 or higher)
3. **Android Studio**: Install Android Studio with Android SDK
4. **Java Development Kit (JDK)**: JDK 17 or higher

## Step 1: Clone and Setup

```bash
# Clone your repository
git clone <your-github-repo-url>
cd <your-project-folder>

# Install dependencies
npm install

# Add Android platform (if not already added)
npx cap add android
```

## Step 2: Configure for Production

Update `capacitor.config.ts` to remove the `server` section for production builds:

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ismart.exchange',
  appName: 'I-SMART',
  webDir: 'dist',
  // Remove or comment out the server section for production
  // server: {
  //   url: 'https://i-smartapp.com/?app=android&v=20251012',
  //   cleartext: true
  // },
  appUrlScheme: 'ismart',
  android: {
    allowMixedContent: true,
  },
  plugins: {
    cordova: {
      preferences: {
        "GradlePluginGoogleServicesEnabled": "true",
        "GradlePluginGoogleServicesVersion": "4.3.15"
      }
    },
    SplashScreen: {
      launchShowDuration: 0
    }
  },
};

export default config;
```

## Step 3: Build the App

```bash
# Build the production bundle
npm run build

# Sync with Android
npx cap sync android

# Open Android Studio
npx cap open android
```

## Step 4: Generate Signing Key (First Time Only)

You need a signing key to create a release APK:

```bash
# Navigate to your project root
cd android

# Generate keystore (replace values with your information)
keytool -genkey -v -keystore ismart-release-key.keystore -alias ismart-key-alias -keyalg RSA -keysize 2048 -validity 10000

# You'll be asked for:
# - Keystore password (remember this!)
# - Key password (remember this!)
# - Your name and organization details
```

⚠️ **IMPORTANT**: Backup your keystore file securely! You'll need it for all future updates.

## Step 5: Configure Signing in Android Studio

1. Open `android/app/build.gradle`
2. Add signing configuration:

```gradle
android {
    ...
    signingConfigs {
        release {
            storeFile file('../ismart-release-key.keystore')
            storePassword 'YOUR_KEYSTORE_PASSWORD'
            keyAlias 'ismart-key-alias'
            keyPassword 'YOUR_KEY_PASSWORD'
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

## Step 6: Build Release APK

### Option A: Using Android Studio

1. In Android Studio, go to **Build** → **Generate Signed Bundle / APK**
2. Select **APK**
3. Choose your keystore file
4. Enter your passwords
5. Select **release** build variant
6. Click **Finish**

The APK will be generated at: `android/app/build/outputs/apk/release/app-release.apk`

### Option B: Using Command Line

```bash
cd android

# For Windows
gradlew assembleRelease

# For Mac/Linux
./gradlew assembleRelease
```

## Step 7: Test the Release APK

```bash
# Install on connected device
adb install android/app/build/outputs/apk/release/app-release.apk

# Or drag and drop the APK to an emulator
```

## Step 8: Version Management

Update version before each release in `android/app/build.gradle`:

```gradle
android {
    defaultConfig {
        versionCode 1      // Increment for each release (1, 2, 3...)
        versionName \"1.0.0\" // User-facing version (1.0.0, 1.0.1, etc.)
    }
}
```

## Production Checklist

Before releasing:

- [ ] Remove all console.log statements (optional)
- [ ] Test on multiple devices
- [ ] Verify deep links work (ismart://r/{code})
- [ ] Test app-lock and biometric authentication
- [ ] Verify referral codes are captured correctly
- [ ] Test KYC file uploads with size limits
- [ ] Check all admin features work
- [ ] Verify safe area insets on notched devices
- [ ] Test all payment flows
- [ ] Backup your keystore file securely

## Building for Google Play Store

For Play Store release, you need an **Android App Bundle (AAB)** instead of APK:

```bash
cd android

# Windows
gradlew bundleRelease

# Mac/Linux
./gradlew bundleRelease
```

The AAB will be at: `android/app/build/outputs/bundle/release/app-release.aab`

## Troubleshooting

### Build Fails
- Run `npx cap sync android` again
- Clean build: `cd android && ./gradlew clean`
- Invalidate Android Studio cache: File → Invalidate Caches

### APK Size Too Large
- Enable ProGuard (already configured above)
- Remove unused resources
- Use Android App Bundle for Play Store

### App Crashes on Startup
- Check `capacitor.config.ts` doesn't have `server.url` for production
- Verify all native plugins are properly synced
- Check logcat: `adb logcat | grep -i ismart`

## Support

For more help:
- [Capacitor Android Documentation](https://capacitorjs.com/docs/android)
- [Android Studio Guide](https://developer.android.com/studio/build)
- Check `docs/apk-r1-ops.md` for operational details
