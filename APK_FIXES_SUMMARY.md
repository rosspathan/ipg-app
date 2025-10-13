# APK Issues Fixed - Build Instructions

## Issues Fixed ✅

### 1. **Bottom Navigation Overlap** ✅
**Problem**: Content was scrolling under the DockNav/CurvedBottomNav, making bottom items unclickable.

**Solution**: 
- Added dynamic safe-area spacers in `DockNav.tsx` and `CurvedBottomNav.tsx`
- The spacer automatically measures nav height and adjusts for device safe areas
- Removed hardcoded `pb-28` paddings from pages (they're no longer needed)

**Files Modified**:
- `src/components/navigation/DockNav.tsx`
- `src/components/CurvedBottomNav.tsx`

---

### 2. **Referral Links Opening in Browser** ✅
**Problem**: Clicking "Share to WhatsApp" in the APK was opening the external browser instead of staying in-app.

**Solution**:
- Updated `useReferrals.ts` to use the `openUrl` utility from `@/utils/linkHandler`
- This utility detects if running as native app and uses Capacitor's in-app browser
- Links now stay within the app using the in-app browser overlay

**Files Modified**:
- `src/hooks/useReferrals.ts`

---

### 3. **Profile Redirect Behavior** ℹ️
**Current Behavior**: ProfileHub redirects to `/onboarding` if user is not authenticated.

**Note**: This is intentional security behavior. If you're experiencing unexpected redirects, check:
1. User authentication status
2. Supabase session validity
3. Auth token expiration

---

## How to Build Updated APK

### Prerequisites
- Android Studio installed
- Project exported to GitHub and cloned locally

### Build Steps

```bash
# 1. Navigate to project directory
cd ipg-app

# 2. Pull latest changes from GitHub
git pull origin main

# 3. Install dependencies (if needed)
npm install

# 4. Build web assets
npm run build

# 5. Sync to Android platform
npx cap sync android

# 6. Open in Android Studio
npx cap open android
```

### In Android Studio

#### For Debug APK (Testing):
1. Build → Build Bundle(s) / APK(s) → Build APK(s)
2. APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

#### For Release APK (Production):
1. Build → Generate Signed Bundle / APK
2. Select **APK**
3. Choose your existing keystore
4. Select **release** variant
5. Click **Finish**
6. APK location: `android/app/build/outputs/apk/release/app-release.apk`

### Alternative: Command Line Build

```bash
# Navigate to android directory
cd android

# Build release APK
./gradlew assembleRelease

# APK location: android/app/build/outputs/apk/release/app-release.apk
```

---

## Testing Checklist

After building the new APK, test these scenarios:

- [ ] **Home page**: Scroll to bottom - last item should not be hidden by nav
- [ ] **Wallet page**: Scroll to bottom - last item should not be hidden by nav
- [ ] **Referral sharing**: Click WhatsApp share - should open in-app browser, not external browser
- [ ] **Profile page**: Navigate to profile - should load normally if authenticated
- [ ] **Bottom navigation**: All nav buttons work correctly
- [ ] **Safe areas**: App respects device notches/home indicators

---

## Technical Details

### Safe Area Implementation
```typescript
// Dynamic spacer that matches nav height
const [spacerHeight, setSpacerHeight] = useState(96)

useLayoutEffect(() => {
  const update = () => {
    const h = navRef.current?.offsetHeight ?? 96
    setSpacerHeight(h)
  }
  update()
  window.addEventListener('resize', update)
  return () => window.removeEventListener('resize', update)
}, [])
```

### In-App Browser Implementation
```typescript
// Before (opened external browser):
window.open(whatsappUrl, '_blank')

// After (stays in-app):
await openUrl(whatsappUrl)

// openUrl utility auto-detects platform:
if (Capacitor.isNativePlatform()) {
  await Browser.open({ url, presentationStyle: 'popover' })
} else {
  window.open(url, target, 'noopener,noreferrer')
}
```

---

## Console Debugging

The app now logs safe area application on startup:
```
SAFE_AREA_APPLIED
```

Check Android Logcat for this marker to verify the fix is applied.

---

## Questions?

If issues persist after building the new APK:
1. Check console logs in Android Studio Logcat
2. Verify you're testing the newly built APK (check version/build timestamp)
3. Clear app data and reinstall if needed
4. Test on multiple devices to rule out device-specific issues
