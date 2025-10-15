# Quick APK Build Guide - IPG Exchange

## Prerequisites

1. **Transfer project to GitHub**
   - Click "Export to Github" button in Lovable
   - Git pull the project to your local machine

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install Android Studio** (for Android APK)
   - Download from: https://developer.android.com/studio
   - Install Android SDK and build tools

## Build Process

### 1. Add Android Platform
```bash
npx cap add android
```

### 2. Update Native Dependencies
```bash
npx cap update android
```

### 3. Build the Web App
```bash
npm run build
```

### 4. Sync to Native Platform
```bash
npx cap sync android
```

### 5. Open in Android Studio
```bash
npx cap open android
```

### 6. Configure Signing (for Release APK)

In Android Studio:
1. Go to `Build > Generate Signed Bundle / APK`
2. Select `APK`
3. Create or select a keystore file
4. Fill in key details and passwords
5. Select `release` build variant
6. Click `Finish`

### 7. Build Release APK

**Option A: Via Android Studio**
- `Build > Build Bundle(s) / APK(s) > Build APK(s)`
- APK will be in `android/app/build/outputs/apk/release/`

**Option B: Via Command Line**
```bash
cd android
./gradlew assembleRelease
```

## Testing on Device/Emulator

### Run on Emulator
```bash
npx cap run android
```

### Run on Physical Device
1. Enable USB debugging on your Android device
2. Connect via USB
3. Run: `npx cap run android -l external`

## Production Deployment

Before building production APK:

1. **Update `capacitor.config.ts`**
   - Comment out the `server` section to use local build
   - Verify `appId` and `appName`

2. **Configure Production URLs**
   - Update Supabase URLs in `src/integrations/supabase/client.ts`
   - Ensure all API endpoints point to production

3. **Update Version**
   - Edit `android/app/build.gradle`
   - Increment `versionCode` and `versionName`

4. **Build Production APK**
   ```bash
   npm run build
   npx cap sync android
   npx cap open android
   # Then Build > Generate Signed Bundle
   ```

## Web Deployment (Parallel)

The web version can be deployed simultaneously:

1. **Via Lovable Publish Button**
   - Click "Publish" in top right
   - Your app will be live at: `yourapp.lovable.app`

2. **Custom Domain** (requires paid plan)
   - Go to Project > Settings > Domains
   - Add your custom domain
   - Configure DNS as instructed

## Important Notes

- **Hot Reload**: The current config enables live hot-reload from Lovable sandbox for development
- **Production**: Comment out `server` section in `capacitor.config.ts` for production builds
- **Updates**: Run `npx cap sync` after pulling any code changes from GitHub
- **Icons**: Place app icons in `android/app/src/main/res/` directories
- **Splash Screen**: Customize in `android/app/src/main/res/drawable/splash.png`

## Troubleshooting

**Build Errors:**
- Clear cache: `cd android && ./gradlew clean`
- Rebuild: `./gradlew build`

**Sync Issues:**
- Delete `android` folder
- Re-add platform: `npx cap add android`

**Device Not Detected:**
- Verify USB debugging is enabled
- Check device is authorized via `adb devices`

## Next Steps

After successful build:
1. Test all features on physical device
2. Test trading flows end-to-end
3. Verify all programs work correctly
4. Submit to Google Play Store (requires developer account)

---

For detailed guide with deep linking setup, see: `Complete APK Build Guide for I-SMART Exchange` in the original file above.

For more help: https://capacitorjs.com/docs/android
