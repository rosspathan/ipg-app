# Android App Links Validation

## Asset Links File Location
`/.well-known/assetlinks.json`

## Format
```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.ismart.exchange",
      "sha256_cert_fingerprints": [
        "AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99"
      ]
    }
  }
]
```

## Validation Steps

### 1. File Accessibility
```bash
curl https://i-smartapp.com/.well-known/assetlinks.json
```

Expected: HTTP 200 with valid JSON

### 2. Format Validation
- Valid JSON array
- Contains at least one object
- Each object has `relation` and `target`
- SHA-256 fingerprints are colon-separated hex (64 chars + 31 colons)

### 3. Google's Validation Tool
Visit: https://developers.google.com/digital-asset-links/tools/generator

Enter:
- Site: `https://i-smartapp.com`
- Package name: `com.ismart.exchange`
- Fingerprint: (from your keystore)

### 4. Android Studio Testing
```bash
adb shell am start -a android.intent.action.VIEW -d "https://i-smartapp.com/r/TEST1234"
```

Expected behavior:
- If app installed: Opens app directly
- If app not installed: Opens browser

## Common Issues

### Issue: App doesn't open on link click
**Causes**:
1. SHA-256 fingerprint mismatch
2. Package name mismatch
3. Asset links file not accessible (404, CORS, etc.)
4. App not installed

**Solutions**:
1. Verify fingerprints: `keytool -list -v -alias <alias> -keystore <keystore>.jks`
2. Check package name in `capacitor.config.ts` matches admin settings
3. Test curl command above
4. Install app from APK or Play Store

### Issue: Works in debug but not production
**Cause**: Different signing keys for debug vs release

**Solution**:
1. Add both debug and release fingerprints in admin panel
2. Google Play uses its own signing key - get it from Play Console:
   - Play Console → Setup → App signing
   - Copy "SHA-256 certificate fingerprint"
   - Add to admin panel under release fingerprints

### Issue: 404 on assetlinks.json
**Cause**: Server not serving `.well-known` directory or file not generated

**Solution**:
1. Verify file exists in `/public/.well-known/assetlinks.json`
2. Check server config allows `.well-known` directory
3. Re-save settings in admin panel to regenerate file

## Fingerprint Reference

### Development (Upload Key)
```bash
keytool -list -v \
  -alias upload \
  -keystore upload-keystore.jks \
  | grep 'SHA-256'
```

### Google Play (App Signing Key)
Get from: Play Console → Setup → App signing → SHA-256 certificate fingerprint

### Debug (Android Studio Default)
```bash
keytool -list -v \
  -alias androiddebugkey \
  -keystore ~/.android/debug.keystore \
  -storepass android \
  -keypass android \
  | grep 'SHA-256'
```

## Testing Matrix

| Environment | Package | Fingerprint Source | Test Method |
|-------------|---------|-------------------|-------------|
| Dev (USB) | debug | Android Studio default | `adb shell am start -a...` |
| QA (APK) | release | Upload key | Install APK, click link |
| Prod (Play Store) | release | Google Play signing | Install from Play, click link |

## Checklist
- [ ] Asset links file accessible via HTTPS
- [ ] Valid JSON format
- [ ] Package name matches capacitor config
- [ ] SHA-256 fingerprints valid (colon-separated hex)
- [ ] Release fingerprints include Google Play signing key
- [ ] Debug fingerprints include Android Studio default (if testing locally)
- [ ] Tested with Google's validation tool
- [ ] Tested on device with app installed
- [ ] Tested on device without app installed
- [ ] Works in both debug and release builds
