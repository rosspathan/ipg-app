# Android Deep Linking Setup for I-SMART Exchange

This guide shows you how to configure deep linking in your Android app so referral links work properly.

## Step 1: Configure AndroidManifest.xml

After running `npx cap open android`, navigate to:
```
android/app/src/main/AndroidManifest.xml
```

Add the following intent filters inside the `<activity>` tag (the one with `android:name=".MainActivity"`):

```xml
<activity
    android:name=".MainActivity"
    ... existing attributes ...>
    
    <!-- Existing intent filter -->
    <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
    </intent-filter>

    <!-- Deep Link: Custom scheme for referral links -->
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="ismart" 
              android:host="referral" />
    </intent-filter>

    <!-- App Links: HTTPS deep links for referral -->
    <intent-filter android:autoVerify="true">
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data 
            android:scheme="https"
            android:host="i-smartapp.com"
            android:pathPrefix="/r" />
    </intent-filter>

    <!-- Alternative HTTPS domain (if you have one) -->
    <intent-filter android:autoVerify="true">
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data 
            android:scheme="https"
            android:host="www.i-smartapp.com"
            android:pathPrefix="/r" />
    </intent-filter>

</activity>
```

## Step 2: How the Deep Links Work

After this setup, your app will handle these link formats:

1. **Custom Scheme**: `ismart://referral/USER_ID`
   - Example: `ismart://referral/abc123`
   
2. **HTTPS App Links**: `https://i-smartapp.com/r/USER_ID`
   - Example: `https://i-smartapp.com/r/abc123`

3. **WWW variant**: `https://www.i-smartapp.com/r/USER_ID`
   - Example: `https://www.i-smartapp.com/r/abc123`

When users click these links:
- If the app is installed → Opens directly in the app
- If the app is not installed → Opens in browser (can show "Download App" page)

## Step 3: Testing Deep Links

### Using ADB (Android Debug Bridge):

```bash
# Test custom scheme
adb shell am start -W -a android.intent.action.VIEW -d "ismart://referral/TEST123" com.ismart.exchange

# Test HTTPS link
adb shell am start -W -a android.intent.action.VIEW -d "https://i-smartapp.com/r/TEST123" com.ismart.exchange
```

### Manual Testing:
1. Install the APK on your device
2. Send yourself a referral link via SMS, WhatsApp, or email
3. Click the link - it should open in your app

## Step 4: Verify App Links (Optional but Recommended)

For HTTPS links to work without the app chooser dialog, you need to verify domain ownership:

1. Create a file at `https://i-smartapp.com/.well-known/assetlinks.json`
2. Content should be:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.ismart.exchange",
      "sha256_cert_fingerprints": [
        "YOUR_APP_SIGNING_CERTIFICATE_SHA256_FINGERPRINT"
      ]
    }
  }
]
```

3. Get your SHA256 fingerprint using:
```bash
keytool -list -v -keystore your-keystore.jks -alias your-alias
```

## Additional Configuration for In-App Browsing

The app is already configured to handle navigation internally. All links will open within the app instead of external browsers.

## Troubleshooting

- **Links not opening app**: Check that `android:autoVerify="true"` is set and domain verification is complete
- **App chooser appears**: Domain verification may not be complete, or multiple apps claim the same domain
- **404 in app**: Ensure routes match in your React Router configuration (`/r/:code`)

## Building the APK

1. Run `npm run build` to build the web assets
2. Run `npx cap sync android` to sync to Android
3. Open Android Studio: `npx cap open android`
4. Build > Generate Signed Bundle/APK
5. Choose APK and follow the signing steps
