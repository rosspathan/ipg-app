# Mobile Linking Configuration

## Overview
This document describes the mobile referral linking configuration for IPG I-SMART app, supporting both Android App Links and custom scheme fallbacks.

## Configuration Location
Admin Panel: `/admin/mobile-linking`
Database Table: `public.mobile_linking_settings`

## Universal Link Structure
- **Format**: `{host}{ref_base_path}/{code}`
- **Example**: `https://i-smartapp.com/r/ABC12345`

## Android App Links
Android App Links allow the app to open automatically when a universal link is clicked, if the app is installed.

### Configuration Requirements
1. **Release Package Name**: e.g., `com.ismart.exchange`
2. **SHA-256 Fingerprints**: One or more certificate fingerprints
3. **Asset Links File**: Generated at `/.well-known/assetlinks.json`

### Obtaining SHA-256 Fingerprints
```bash
keytool -list -v -alias <alias> -keystore <keystore>.jks | grep 'SHA-256'
```

You need fingerprints for:
- **Upload Key**: Used during development and manual builds
- **App Signing Key**: Used by Google Play for signed releases

### Asset Links Validation
Test the asset links file:
```bash
curl https://i-smartapp.com/.well-known/assetlinks.json
```

Verify with Google's tool:
https://developers.google.com/digital-asset-links/tools/generator

## Custom Scheme Fallback
- **Format**: `{custom_scheme}://r/{code}`
- **Example**: `ismart://r/ABC12345`
- **Usage**: Endpoint at `/deeplink/r/:code` attempts custom scheme, then falls back to Play Store or web

## Capture & Lock Stages

### Capture Stage (when referral is first recorded)
- `on_first_open`: Capture on first app open after link click
- `after_email_verify`: Capture after user verifies email (DEFAULT)
- `after_wallet_create`: Capture after user creates/imports wallet

### Lock Policy (when sponsor becomes permanent)
- `email_verified`: Lock after email verification (DEFAULT)
- `first_touch_wins`: Lock immediately on first touch
- `wallet_created`: Lock after wallet creation

### Behavioral Rules
- `self_referral_block`: Prevents users from referring themselves (DEFAULT: true)
- `allow_sponsor_change_before_lock`: Allows changing sponsor before lock stage (DEFAULT: false)

## Code Generation
- **Length**: 6-10 characters (DEFAULT: 8)
- **Charset**: A-H, J-N, P-Z, 2-9 (excludes O, 0, I, 1 for clarity)
- **Uniqueness**: Validated against existing codes
- **Function**: `public.generate_referral_code(code_length)`

## Share Templates
WhatsApp template uses placeholder:
```
Join me on IPG I-SMART! Use my link: {{link}} 🚀
```

The `{{link}}` placeholder is replaced with the full referral URL.

## Security
- All settings managed by admin only
- Changes are logged to `audit_logs` table
- RLS policies enforce user-level access control
- Referral codes stored in separate table with user relationship

## Testing Checklist
- [ ] Asset links file generated and accessible
- [ ] Android App Link opens app when installed
- [ ] Web fallback works when app not installed
- [ ] Custom scheme fallback functions correctly
- [ ] Referral capture occurs at configured stage
- [ ] Sponsor lock prevents retroactive changes
- [ ] Self-referral blocking works
- [ ] WhatsApp share uses correct template
- [ ] QR code generates correct URL
- [ ] Admin changes apply without redeploy
