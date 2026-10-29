$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
try {
  if (!(Test-Path "credentials.json")) { throw "Eski proje klasorundeki credentials.json dosyasini ve credentials klasorunu bu klasore kopyalayin. Bunlari internette paylasmayin." }
  $kotakCredentials = Get-Content "credentials.json" -Raw | ConvertFrom-Json
  $kotakKeyPath = $kotakCredentials.android.keystore.keystorePath
  if (!$kotakKeyPath -or !(Test-Path $kotakKeyPath)) { throw "credentials.json icindeki keystorePath bulunamadi. Eski imzalama anahtarinizi ayni konuma kopyalayin." }
  if (!$env:ANDROID_HOME) { $env:ANDROID_HOME = "D:\Andorid\AndroidSDK" }
  if (!(Test-Path "$env:ANDROID_HOME\platform-tools\adb.exe")) { throw "Android SDK bulunamadi. ANDROID_HOME yolunu kontrol edin." }
  $env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
  Write-Host "[1/4] Paketler kuruluyor..."
  & npm.cmd ci --include=dev
  if ($LASTEXITCODE -ne 0) { throw "Paket kurulumu basarisiz." }
  & npm.cmd run check
  if ($LASTEXITCODE -ne 0) { throw "TypeScript kontrolu basarisiz." }
  Write-Host "[2/4] Android projesi hazirlaniyor..."
  & npx.cmd expo prebuild --platform android --no-install
  if ($LASTEXITCODE -ne 0) { throw "Android proje olusturma basarisiz." }
  $kotakSigning = @'
import groovy.json.JsonSlurper

def kotakCredentialsFile = rootProject.file("../credentials.json")
def kotakCredentials = new JsonSlurper().parse(kotakCredentialsFile)
def kotakKey = kotakCredentials.android.keystore
def kotakKeyFile = new File(kotakKey.keystorePath.toString())
if (!kotakKeyFile.isAbsolute()) kotakKeyFile = new File(rootProject.projectDir.parentFile, kotakKey.keystorePath.toString())
if (!kotakKeyFile.isFile()) throw new GradleException("Kotak signing keystore missing")
android {
    signingConfigs {
        kotakLocal {
            storeFile kotakKeyFile
            storePassword kotakKey.keystorePassword.toString()
            keyAlias kotakKey.keyAlias.toString()
            keyPassword (kotakKey.keyPassword ?: kotakKey.keystorePassword).toString()
        }
    }
    buildTypes { release { signingConfig signingConfigs.kotakLocal } }
}
'@
  [System.IO.File]::WriteAllText((Join-Path $PSScriptRoot 'android\app\kotak-signing.gradle'), $kotakSigning)
  $kotakGradlePath = Join-Path $PSScriptRoot 'android\app\build.gradle'
  $kotakGradle = [System.IO.File]::ReadAllText($kotakGradlePath)
  if (!$kotakGradle.Contains('apply from: "./kotak-signing.gradle"')) {
    [System.IO.File]::AppendAllText($kotakGradlePath, "`r`n" + 'apply from: "./kotak-signing.gradle"' + "`r`n")
  }
  Write-Host "[3/4] APK bilgisayarinizda derleniyor..."
  Set-Location (Join-Path $PSScriptRoot 'android')
  & .\gradlew.bat :app:assembleRelease --no-daemon --max-workers=2
  if ($LASTEXITCODE -ne 0) { throw "Gradle derlemesi basarisiz." }
  Set-Location $PSScriptRoot
  $kotakApk = Join-Path $PSScriptRoot 'android\app\build\outputs\apk\release\app-release.apk'
  if (!(Test-Path $kotakApk)) { throw "Derleme APK uretmedi." }
  Copy-Item $kotakApk (Join-Path $PSScriptRoot 'KotakTV-1.0.15.apk') -Force
  Write-Host "[4/4] Hazir: $PSScriptRoot\KotakTV-1.0.15.apk"
  Start-Process explorer.exe -ArgumentList ('/select,"' + (Join-Path $PSScriptRoot 'KotakTV-1.0.15.apk') + '"')
} catch {
  Write-Host ("HATA: " + $_.Exception.Message) -ForegroundColor Red
  exit 1
}
