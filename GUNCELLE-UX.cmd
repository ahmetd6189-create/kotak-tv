@echo off
setlocal
cd /d "%~dp0"
title Kotak TV - UX Guncellemesi 1.0.15
if not exist "App.tsx" (
  echo HATA: Bu dosya KotakTV proje klasorunde calistirilmalidir.
  pause
  exit /b 1
)
echo [1/2] Proje paketleri kuruluyor...
call npm.cmd ci --include=dev
if errorlevel 1 (
  echo Kurulum tamamlanamadi. Bu pencerenin hata ciktisini paylasin.
  pause
  exit /b 1
)
echo [2/2] Yeni arayuz icin Android APK hazirlaniyor...
set "EAS_NO_VCS=1"
set "EAS_PROJECT_ROOT=%CD%"
call npx.cmd eas-cli@latest build --platform android --profile production --no-wait
if errorlevel 1 (
  echo Derleme baslatilamadi. Bu pencerenin hata ciktisini paylasin.
) else (
  echo Derleme baslatildi. Yukaridaki Expo baglantisindan tamamlanmasini takip edin.
    echo Bitince APK indirin ve APK-YUKLE.cmd uzerine surukleyin.
)
pause

