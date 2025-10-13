# Android Debug Keystore SHA-256 Helper

Run one of these from the project root on Windows:

1) Batch (double-click):
- scripts\\windows\\get-android-sha256.bat

2) PowerShell (right click -> Run with PowerShell):
- scripts\\windows\\get-android-sha256.ps1

Both will print the line starting with `SHA-256:` and copy it to your clipboard.

If you get a missing keystore error, run `gradlew assembleDebug` once in the `android/` folder, then retry.
