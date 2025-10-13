@echo off
setlocal

:: Try Android Studio embedded JDK first
set "KEYTOOL=%ProgramFiles%\Android\Android Studio\jbr\bin\keytool.exe"
if exist "%KEYTOOL%" goto run

set "KEYTOOL=%ProgramFiles(x86)%\Android\Android Studio\jbr\bin\keytool.exe"
if exist "%KEYTOOL%" goto run

:: Fallback to JAVA_HOME if set
if defined JAVA_HOME (
  set "KEYTOOL=%JAVA_HOME%\bin\keytool.exe"
  if exist "%KEYTOOL%" goto run
)

echo [ERROR] Could not find keytool. Install Android Studio or set JAVA_HOME and re-run.
pause
exit /b 1

:run
echo Using keytool: "%KEYTOOL%"
echo.
set "KEYSTORE=%USERPROFILE%\.android\debug.keystore"

:: Try common alias names and capture only the SHA-256 line
for /f "tokens=*" %%A in ('"%KEYTOOL%" -list -v -alias androiddebugkey -keystore "%KEYSTORE%" -storepass android -keypass android ^| findstr /C:"SHA-256"') do set "SHA=%%A"

if not defined SHA (
  for /f "tokens=*" %%A in ('"%KEYTOOL%" -list -v -alias AndroidDebugKey -keystore "%KEYSTORE%" -storepass android -keypass android ^| findstr /C:"SHA-256"') do set "SHA=%%A"
)

if not defined SHA (
  echo [ERROR] Could not read SHA-256. If the keystore is missing, run "gradlew assembleDebug" once to generate it.
  pause
  exit /b 1
)

echo %SHA%
echo %SHA% | clip
echo.
echo [OK] SHA-256 copied to clipboard.
pause
exit /b 0
