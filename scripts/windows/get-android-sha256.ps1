# PowerShell script to extract Android debug keystore SHA-256 and copy to clipboard
$ErrorActionPreference = 'Stop'

# Candidate keytool locations (Android Studio bundled JBR first)
$candidates = @(
  "C:\\Program Files\\Android\\Android Studio\\jbr\\bin\\keytool.exe",
  "C:\\Program Files (x86)\\Android\\Android Studio\\jbr\\bin\\keytool.exe"
)
if ($env:JAVA_HOME) { $candidates += Join-Path $env:JAVA_HOME 'bin\\keytool.exe' }

$keytool = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $keytool) {
  try { $keytool = (Get-Command keytool -ErrorAction Stop).Source } catch {}
}
if (-not $keytool) { throw "keytool not found. Install Android Studio or set JAVA_HOME." }

$keystore = Join-Path $env:USERPROFILE '.android\\debug.keystore'
if (-not (Test-Path $keystore)) {
  Write-Warning "Debug keystore not found at $keystore. Build once (gradlew assembleDebug) to generate it."
}

Write-Host "Using keytool: $keytool" -ForegroundColor Cyan

function Get-Sha256Line($alias) {
  & $keytool -list -v -alias $alias -keystore $keystore -storepass android -keypass android 2>$null |
    Select-String 'SHA-256' | Select-Object -First 1
}

$line = Get-Sha256Line 'androiddebugkey'
if (-not $line) { $line = Get-Sha256Line 'AndroidDebugKey' }
if (-not $line) { throw "Could not extract SHA-256. Wrong alias or missing keystore." }

$sha = $line.ToString()
$sha | Set-Clipboard
Write-Host $sha -ForegroundColor Green
Write-Host "Copied to clipboard." -ForegroundColor Green
