@echo off
setlocal
cd /d "%~dp0"
set "KOTAK_APK=%~1"
if not defined KOTAK_APK set "KOTAK_APK=%~dp0KotakTV.apk"
if not exist "%KOTAK_APK%" (
  echo Yeni APK dosyasini bu CMD dosyasinin uzerine surukleyip birakin.
  echo Alternatif: APK'yi bu klasore KotakTV.apk adiyla koyun.
  pause
  exit /b 1
)
if not exist "%ANDROID_HOME%\platform-tools\adb.exe" (
  echo ANDROID_HOME ayarindaki Android SDK yolu bulunamadi.
  pause
  exit /b 1
)
echo Acik Android emulatorune yukleniyor...
"%ANDROID_HOME%\platform-tools\adb.exe" -e install -r "%KOTAK_APK%"
if errorlevel 1 (
  echo Kurulum tamamlanamadi. Emulatorun acik oldugunu kontrol edin.
  pause
  exit /b 1
)
"%ANDROID_HOME%\platform-tools\adb.exe" -e shell am start -n "com.kotaktv.app/.MainActivity"
pause
