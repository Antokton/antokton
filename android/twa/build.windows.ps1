param(
  [ValidateSet("Check", "Fingerprint", "AssetLinks", "Init", "Debug", "ReleaseAab")]
  [string]$Mode = "Check",
  [string]$ManifestUrl = "https://antokton.com/manifest.json",
  [string]$PackageName = "com.antokton.app",
  [string]$SigningKeyPath = "C:\AntoktonAndroidKeys\antokton-upload-key.jks",
  [string]$SigningPasswordNote = "C:\AntoktonAndroidKeys\antokton-upload-key-password.txt",
  [string]$SigningKeyAlias = "antokton"
)

$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot

function Require-Command {
  param([string]$Name)
  $command = Get-Command $Name -ErrorAction SilentlyContinue
  if (-not $command) {
    throw "$Name is required but was not found on PATH."
  }
}

function Check-Prerequisites {
  Require-Command node
  Require-Command npm
  Require-Command java
  Require-Command keytool
  Require-Command bubblewrap

  Write-Host "Prerequisites found."
  node --version
  npm --version
  java -version
  bubblewrap --version
}

function Get-SigningPassword {
  if ($env:BUBBLEWRAP_KEYSTORE_PASSWORD -and $env:BUBBLEWRAP_KEY_PASSWORD) {
    return @{
      Keystore = $env:BUBBLEWRAP_KEYSTORE_PASSWORD
      Key = $env:BUBBLEWRAP_KEY_PASSWORD
    }
  }

  if (-not (Test-Path -LiteralPath $SigningPasswordNote)) {
    throw "Signing password note not found. Set BUBBLEWRAP_KEYSTORE_PASSWORD and BUBBLEWRAP_KEY_PASSWORD, or create $SigningPasswordNote outside git."
  }

  $password = (Get-Content -LiteralPath $SigningPasswordNote | Where-Object { $_ -like "Password:*" } | Select-Object -First 1) -replace "^Password:\s*", ""
  if (-not $password) {
    throw "Signing password note exists but does not contain a Password line."
  }

  return @{
    Keystore = $password
    Key = $password
  }
}

function Require-SigningKey {
  if (-not (Test-Path -LiteralPath $SigningKeyPath)) {
    throw "Signing key not found at $SigningKeyPath. Generate it outside the repo before building."
  }
}

function Get-SigningFingerprint {
  Require-SigningKey
  $passwords = Get-SigningPassword
  $output = keytool -list -v -keystore $SigningKeyPath -alias $SigningKeyAlias -storepass $passwords.Keystore -keypass $passwords.Key
  $match = $output | Select-String -Pattern "SHA256:"
  if (-not $match) {
    throw "Could not read SHA-256 fingerprint from signing key."
  }
  return (($match.ToString() -replace ".*SHA256:\s*", "").Trim())
}

function Sync-BubblewrapProject {
  bubblewrap update --skipVersionUpgrade --manifest .\twa-manifest.json
  if ($LASTEXITCODE -ne 0) {
    throw "Bubblewrap update failed with exit code $LASTEXITCODE."
  }
}

Check-Prerequisites

if ($Mode -eq "Check") {
  Write-Host "Check complete. No Android build was started."
  exit 0
}

if ($Mode -eq "Fingerprint") {
  $fingerprint = Get-SigningFingerprint
  Write-Host "SHA-256 fingerprint: $fingerprint"
  exit 0
}

if ($Mode -eq "AssetLinks") {
  bubblewrap fingerprint generateAssetLinks --manifest .\twa-manifest.json --output assetlinks.generated.json
  if ($LASTEXITCODE -ne 0) {
    throw "Bubblewrap assetlinks generation failed with exit code $LASTEXITCODE."
  }
  Write-Host "Generated android\twa\assetlinks.generated.json"
  Write-Host "Copy it to antokton-export\public\.well-known\assetlinks.json only after confirming the fingerprint."
  exit 0
}

if ($Mode -eq "Init") {
  Write-Host "Starting Bubblewrap init for $ManifestUrl"
  Write-Host "Use package name: $PackageName"
  Write-Host "Do not place signing keys inside this repository."
  bubblewrap init --manifest $ManifestUrl --directory .
  exit 0
}

if ($Mode -eq "Debug") {
  Require-SigningKey
  $passwords = Get-SigningPassword
  $env:BUBBLEWRAP_KEYSTORE_PASSWORD = $passwords.Keystore
  $env:BUBBLEWRAP_KEY_PASSWORD = $passwords.Key
  Write-Host "Starting Bubblewrap build for local Android testing."
  Write-Host "Generated APK/AAB files are ignored by git and must not be committed."
  Sync-BubblewrapProject
  bubblewrap build --manifest .\twa-manifest.json --signingKeyPath "$SigningKeyPath" --signingKeyAlias "$SigningKeyAlias"
  if ($LASTEXITCODE -ne 0) {
    throw "Bubblewrap build failed with exit code $LASTEXITCODE."
  }
  exit 0
}

if ($Mode -eq "ReleaseAab") {
  Require-SigningKey
  $passwords = Get-SigningPassword
  $env:BUBBLEWRAP_KEYSTORE_PASSWORD = $passwords.Keystore
  $env:BUBBLEWRAP_KEY_PASSWORD = $passwords.Key
  Write-Host "Starting Bubblewrap release build."
  Write-Host "Upload only to Google Play internal testing. Do not commit artifacts."
  Sync-BubblewrapProject
  bubblewrap build --manifest .\twa-manifest.json --signingKeyPath "$SigningKeyPath" --signingKeyAlias "$SigningKeyAlias"
  if ($LASTEXITCODE -ne 0) {
    throw "Bubblewrap build failed with exit code $LASTEXITCODE."
  }
  if (Test-Path ".\app-release-bundle.aab") {
    Write-Host "Release AAB created: android\twa\app-release-bundle.aab"
  } else {
    Write-Host "Bubblewrap finished, but app-release-bundle.aab was not found. Check CLI output."
  }
}
