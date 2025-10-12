# Production APK Build Guide

This guide will help you build a production-ready APK for the I-SMART Exchange app.

## Prerequisites

Before building your APK, you need to install these tools on your computer:

1. **Node.js** (v18 or higher)
   - Download from: https://nodejs.org/
   - This allows you to run JavaScript commands on your computer
   - To check if installed: Open terminal/command prompt and type `node --version`

2. **Android Studio**
   - Download from: https://developer.android.com/studio
   - This is the official tool for building Android apps
   - During installation, make sure to install "Android SDK" and "Android SDK Platform"

3. **Java Development Kit (JDK)** (JDK 17 or higher)
   - Usually installed automatically with Android Studio
   - To check: Type `java --version` in terminal/command prompt

## Step 1: Export Your Project to GitHub

Since you're working in Lovable, you need to get your code to your computer:

1. Click the "Export to GitHub" button in Lovable
2. Create a new repository or select an existing one
3. Wait for the export to complete

## Step 2: Download Project to Your Computer

Now download the code from GitHub to your computer:

```bash
# Open Terminal (Mac/Linux) or Command Prompt (Windows)
# Navigate to where you want to save the project, for example:
cd Desktop

# Clone (download) your repository
# Replace <your-github-username> and <your-repo-name> with your actual GitHub details
git clone https://github.com/<your-github-username>/<your-repo-name>.git

# Enter the project folder
cd <your-repo-name>
```

**Example:**
If your GitHub username is "john" and repository is "i-smart-app":
```bash
git clone https://github.com/john/i-smart-app.git
cd i-smart-app
```

## Step 3: Install Dependencies

Dependencies are the libraries and tools your app needs to run:

```bash
# This command reads package.json and downloads everything your app needs
npm install
```

⏳ This may take 2-5 minutes. You'll see a progress indicator.

## Step 4: Add Android Platform

Now we add Android-specific files to your project:

```bash
# This creates an "android" folder with all Android app files
npx cap add android
```

✅ After this completes, you'll see a new `android` folder in your project.

## Step 5: Configure for Production

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

**What this does:** The `server.url` in the config tells the app to load from a website instead of local files. For production, we want the app to use its own built-in files.

## Step 6: Build the App

Now we create the production-ready web files:

```bash
# Build the production bundle (creates optimized files in "dist" folder)
npm run build
```

⏳ This takes 30-60 seconds. It creates optimized, compressed files for your app.

```bash
# Sync with Android (copies web files to Android project)
npx cap sync android
```

✅ This copies your built files into the `android` folder.

```bash
# Open Android Studio (the Android development tool)
npx cap open android
```

🚀 Android Studio will now open with your project loaded.

**First time opening?** Android Studio may take 5-10 minutes to:
- Download Android SDK components
- Index your project files
- Set up the build system

☕ Take a break while it sets up!

## Step 7: Generate Signing Key (First Time Only)

**What is a signing key?**
A signing key is like a unique signature that proves the app is really from you. Google Play Store requires this to verify app updates are from the original developer.

You need a signing key to create a release APK:

**Open a new terminal/command prompt window:**

```bash
# Navigate to the android folder inside your project
cd android

# Generate the keystore file
keytool -genkey -v -keystore ismart-release-key.keystore -alias ismart-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

**You'll be asked several questions:**

1. **"Enter keystore password:"**
   - Create a strong password (example: MyApp2024!)
   - Type it (you won't see it) and press Enter
   - Type it again to confirm
   - **WRITE THIS DOWN SOMEWHERE SAFE!**

2. **"Enter key password for <ismart-key-alias>:"**
   - Create another password (can be same as keystore password)
   - **WRITE THIS DOWN TOO!**

3. **Personal Information:**
   - What is your first and last name? → Your name or company name
   - What is the name of your organizational unit? → Your department (or just press Enter)
   - What is the name of your organization? → Your company name
   - What is the name of your City or Locality? → Your city
   - What is the name of your State or Province? → Your state
   - What is the two-letter country code? → Your country (US, IN, UK, etc.)

4. **Confirmation:**
   - Type `yes` and press Enter

✅ **Done!** You'll see `ismart-release-key.keystore` file created in the `android` folder.

⚠️ **CRITICAL - BACKUP YOUR KEYSTORE:**
- Copy `ismart-release-key.keystore` to a USB drive or cloud storage
- Save your passwords in a password manager
- If you lose this, you can NEVER update your app on Play Store!
- You'll have to publish as a completely new app

## Step 8: Configure Signing in Android Studio

Now we tell Android Studio to use your keystore when building the app:

1. **In Android Studio, find the Project files on the left side**
2. **Navigate to:** `app` → `build.gradle` (the one inside `app` folder, not the other one!)
3. **Click to open it**
4. **Find the `android {` section** (should be near the top)
5. **Add this code INSIDE the `android {` section:**

```gradle
android {
    ...
    
    // Add this new section:
    signingConfigs {
        release {
            storeFile file('../ismart-release-key.keystore')
            storePassword 'YOUR_KEYSTORE_PASSWORD'  // Replace with your actual password!
            keyAlias 'ismart-key-alias'
            keyPassword 'YOUR_KEY_PASSWORD'  // Replace with your actual password!
        }
    }
    
    // Find the existing buildTypes section and modify it:
    buildTypes {
        release {
            signingConfig signingConfigs.release  // Add this line
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

**Important replacements:**
- Replace `YOUR_KEYSTORE_PASSWORD` with the keystore password you created
- Replace `YOUR_KEY_PASSWORD` with the key password you created

**Example:**
```gradle
storePassword 'MyApp2024!'
keyPassword 'MyApp2024!'
```

6. **Press Ctrl+S (Windows/Linux) or Cmd+S (Mac) to save**
7. **Click "Sync Now"** if a yellow bar appears at the top

⚠️ **Security Note:** In production, you should NOT store passwords directly in files. But for learning, this is okay.

## Step 9: Build Release APK

Now the exciting part - creating your actual APK file!

### Option A: Using Android Studio (Recommended for Beginners)

1. **In Android Studio menu bar, click:** `Build` → `Generate Signed Bundle / APK`

2. **A dialog appears. Select:** `APK` (not Bundle)
   - Click `Next`

3. **Keystore path screen:**
   - Click `Choose existing...`
   - Navigate to your project's `android` folder
   - Select `ismart-release-key.keystore`
   - Click `OK`

4. **Enter your passwords:**
   - Key store password: (the keystore password you created)
   - Key alias: Should already show `ismart-key-alias`
   - Key password: (the key password you created)
   - Check "Remember passwords" (optional, for convenience)
   - Click `Next`

5. **Build variant screen:**
   - Destination folder: Leave as default (or choose where you want the APK)
   - Build Variants: Select `release`
   - Signature Versions: Check both V1 and V2
   - Click `Finish`

⏳ **Building...** This takes 2-5 minutes. You'll see progress at the bottom of Android Studio.

✅ **Success!** When done, you'll see a notification in the bottom-right corner:
- Click `locate` to find your APK file

**Your APK location:**
```
android/app/build/outputs/apk/release/app-release.apk
```

### Option B: Using Command Line (Advanced)

If you prefer terminal/command prompt:

```bash
# Make sure you're in the android folder
cd android

# For Windows
gradlew assembleRelease

# For Mac/Linux
./gradlew assembleRelease
```

⏳ Takes 2-5 minutes. When done, APK is at: `app/build/outputs/apk/release/app-release.apk`

## Step 10: Test the Release APK

Before sharing your app, test it on a real device:

### Method 1: Transfer APK to Your Phone

1. **Connect your phone to computer with USB cable**
2. **On your phone:** Enable "File Transfer" or "MTP" mode when USB connected
3. **Copy the APK file:** Drag `app-release.apk` to your phone's Downloads folder
4. **On your phone:** Open file manager, find Downloads folder
5. **Tap the APK file**
6. **If prompted:** Enable "Install from Unknown Sources" or "Install Unknown Apps"
7. **Tap Install**

### Method 2: Using ADB (If you have Android debugging enabled)

```bash
# Make sure phone is connected and USB debugging is enabled
# Install directly to phone
adb install android/app/build/outputs/apk/release/app-release.apk
```

### Method 3: Using Emulator

1. **Start an emulator in Android Studio:** Click the phone icon in toolbar
2. **Drag and drop** `app-release.apk` onto the emulator screen
3. **App installs automatically**

### What to Test:

✅ App opens without crashing
✅ All screens work correctly  
✅ Deep links work (referral codes)
✅ App lock and biometric work
✅ Can upload KYC documents
✅ All features from your app work as expected

## Step 11: Version Management

**Every time you create a new version** of your app (for updates), you need to increase the version numbers:

1. **Open:** `android/app/build.gradle`
2. **Find the `defaultConfig` section**
3. **Update these numbers:**

```gradle
android {
    defaultConfig {
        versionCode 1      // Increment for each release: 1, 2, 3, 4...
        versionName "1.0.0" // User-facing version: 1.0.0, 1.0.1, 1.1.0, 2.0.0...
    }
}
```

**Version naming guide:**
- `versionCode`: Must increase by 1 each time (Google Play requirement)
  - First release: 1
  - Second release: 2
  - Third release: 3
  
- `versionName`: What users see in Play Store
  - `1.0.0` = First release
  - `1.0.1` = Bug fix
  - `1.1.0` = Small new features
  - `2.0.0` = Major new features

**Example progression:**
```
Release 1: versionCode 1, versionName "1.0.0"
Release 2: versionCode 2, versionName "1.0.1" (bug fixes)
Release 3: versionCode 3, versionName "1.1.0" (new features)
Release 4: versionCode 4, versionName "2.0.0" (major update)
```

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
