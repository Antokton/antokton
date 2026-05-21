param(
  [ValidateSet("Check", "Init", "Debug", "ReleaseAab")]
  [string]$Mode = "Check",
  [string]$ManifestUrl = "https://antokton.com/manifest.json",
  [string]$PackageName = "com.antokton.app"
)

$ErrorActionPreference = "Stop"

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
  Require-Command bubblewrap

  Write-Host "Prerequisites found."
  node --version
  npm --version
  java -version
  bubblewrap --version
}

Check-Prerequisites

if ($Mode -eq "Check") {
  Write-Host "Check complete. No Android build was started."
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
  Write-Host "Starting Bubblewrap build for local Android testing."
  Write-Host "Generated APK/AAB files are ignored by git and must not be committed."
  bubblewrap build
  exit 0
}

if ($Mode -eq "ReleaseAab") {
  Write-Host "Starting Bubblewrap release build."
  Write-Host "Upload only to Google Play internal testing. Do not commit artifacts."
  bubblewrap build
  if (Test-Path ".\app-release-bundle.aab") {
    Write-Host "Release AAB created: android\twa\app-release-bundle.aab"
  } else {
    Write-Host "Bubblewrap finished, but app-release-bundle.aab was not found. Check CLI output."
  }
}
