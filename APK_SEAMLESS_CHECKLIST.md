# APK Seamless Experience Checklist

## ✅ Recently Fixed Issues

### 1. Profile Redirect Issue ✅
**Problem**: Profile page was redirecting to onboarding even for logged-in users.
**Solution**: 
- Removed aggressive redirect logic from ProfileHub
- Updated UnlockGate to skip security checks for profile routes
- Profile now accessible without unnecessary redirects

### 2. Bottom Navigation Overlap ✅
**Problem**: Content scrolling under navigation bar.
**Solution**: Dynamic safe-area spacers in DockNav and CurvedBottomNav

### 3. Referral Links in APK ✅
**Problem**: WhatsApp share links opening external browser.
**Solution**: Using Capacitor in-app browser via `openUrl` utility

---

## 🔧 Common APK Issues to Check

### Authentication & Session
- [ ] **Session persistence** - Users stay logged in after closing app
- [ ] **Biometric login** - Face/fingerprint authentication works
- [ ] **Lock screen** - PIN entry works correctly
- [ ] **Auto-logout** - Session timeout configured properly

### Navigation & UX
- [ ] **Bottom nav visibility** - All nav items clickable on all devices
- [ ] **Back button** - Android back button behavior correct
- [ ] **Deep links** - Referral links open in app, not browser
- [ ] **Page transitions** - Smooth navigation between screens
- [ ] **Safe areas** - Respects notches/camera cutouts on all devices

### Performance
- [ ] **App startup** - Fast initial load (< 3 seconds)
- [ ] **Image loading** - Lazy loading implemented
- [ ] **Network requests** - Proper error handling and retries
- [ ] **Memory usage** - No memory leaks on long sessions

### Features
- [ ] **Camera/Gallery** - Photo uploads work
- [ ] **Share functionality** - Native share works for all sharing
- [ ] **Push notifications** - If implemented, notifications work
- [ ] **File downloads** - PDFs/images download correctly
- [ ] **Copy to clipboard** - Wallet addresses copy properly

### UI/Responsiveness
- [ ] **Touch targets** - All buttons minimum 44x44px
- [ ] **Text readability** - Font sizes appropriate for mobile
- [ ] **Forms** - Input fields work with device keyboard
- [ ] **Scrolling** - Smooth scrolling on all pages
- [ ] **Dark mode** - If enabled, works correctly

---

## 🚀 Build Commands for Seamless APK

### Quick Rebuild (After git pull)
```bash
cd ipg-app
git pull origin main
npm install
npm run build
npx cap sync android
npx cap open android
```

### Full Clean Build
```bash
cd ipg-app
git pull origin main
rm -rf node_modules package-lock.json
npm install
npm run build
npx cap sync android
cd android
./gradlew clean
cd ..
npx cap open android
```

### Command Line Release Build
```bash
cd ipg-app/android
./gradlew assembleRelease
# APK: android/app/build/outputs/apk/release/app-release.apk
```

---

## 📱 Testing on Physical Device

### Enable USB Debugging
1. Settings → About Phone → Tap "Build Number" 7 times
2. Settings → Developer Options → Enable "USB Debugging"
3. Connect phone via USB
4. Authorize debugging on phone

### Install APK Directly
```bash
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

### View Logs
```bash
adb logcat | grep -i "ipg"
```

---

## 🐛 Debugging APK Issues

### Check Console Logs
```bash
# View all logs
adb logcat

# Filter by app
adb logcat | grep -i "chromium"

# Clear logs then run app
adb logcat -c && adb logcat
```

### Chrome Remote Debugging
1. Open Chrome on computer
2. Navigate to `chrome://inspect`
3. Connect phone via USB
4. Select your app from list
5. Click "Inspect" to see console

### Common Issues

**Issue**: White screen on launch
- Check `capacitor.config.ts` for correct server URL
- Verify `npm run build` completed successfully
- Check Android logs for errors

**Issue**: Features work in browser but not APK
- Verify Capacitor plugins installed (`npx cap sync`)
- Check permissions in `AndroidManifest.xml`
- Test if feature requires native capabilities

**Issue**: Old version of app loads
- Uninstall old app completely
- Clear app data: Settings → Apps → IPG → Storage → Clear Data
- Reinstall new APK

---

## 🎯 What Makes an APK "Seamless"?

1. **No unexpected redirects** - Users stay on intended page
2. **Fast performance** - Quick startup and navigation
3. **Native feel** - Uses device features (camera, share, biometrics)
4. **Reliable** - Works offline when possible, handles errors gracefully
5. **Consistent** - Same experience across different Android devices
6. **Polished UI** - No overlapping content, proper safe areas
7. **Smooth UX** - Intuitive navigation, clear feedback on actions

---

## 📋 Current Status

- ✅ Profile redirect fixed
- ✅ Bottom nav overlap fixed
- ✅ Referral links stay in-app
- ⏳ Other issues: **Please specify what else needs fixing**

---

## 🤝 Need More Help?

To help you better, please specify:
1. **Which specific features** aren't working in the APK
2. **What behavior** you're seeing vs what you expect
3. **Which screens** have issues
4. **Error messages** if any (from Chrome inspect or adb logcat)

The more specific you are, the faster we can fix it!
