# backend/scripts/run-staging-migration.ps1
#
# Orchestrate a SAFE staging-only data migration:
#   1. Sanity-check the target URL (refuse anything that looks like production).
#   2. Pre-flight: row counts in SQLite and in staging Postgres.
#   3. Backup staging Postgres (pg_dump).
#   4. Dry-run migration.
#   5. Live migration with rollback log.
#   6. Re-run smoke test, integrity verifier, diagnostics.
#   7. Bundle all artifacts under .migration-artifacts/staging-<UTC-ts>/.
#
# What this script will NOT do:
#   - Touch production. The DATABASE_URL is inspected for the substring
#     "prod" and the script aborts if found.
#   - Change runtime flags (DATABASE_PROVIDER) anywhere.
#   - Push, deploy, or commit anything.
#
# Required env vars (set in your shell before invoking):
#   $env:DATABASE_URL = "postgres://...staging..."       # staging only
#   $env:STAGING_BASE_URL = "https://antokton-pg-staging.onrender.com"  # optional, defaults shown
#   $env:DB_PATH = "backend/data/antokton.sqlite"        # optional override
#
# Usage:
#   pwsh backend/scripts/run-staging-migration.ps1 [-DryRunOnly] [-SkipBackup]

[CmdletBinding()]
param(
  [switch]$DryRunOnly,
  [switch]$SkipBackup,
  [switch]$SkipSmoke,
  [string]$ArtifactsRoot = ".migration-artifacts"
)

$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $false

function Section($title) {
  Write-Host ""
  Write-Host ("=" * 70) -ForegroundColor Cyan
  Write-Host "  $title" -ForegroundColor Cyan
  Write-Host ("=" * 70) -ForegroundColor Cyan
}

function Fail($msg) {
  Write-Host "FATAL: $msg" -ForegroundColor Red
  exit 1
}

# ---------- 0. Locate repo root ----------
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $RepoRoot

# ---------- 1. Validate environment ----------
Section "Pre-flight"

if (-not $env:DATABASE_URL) {
  Fail "DATABASE_URL is not set in the environment. Set it to the STAGING connection string before running."
}

$pgUrl = $env:DATABASE_URL
# Redact password for any log line we print
$pgUrlRedacted = ($pgUrl -replace ":([^:@/]+)@", ":***@")

# Safety: refuse anything that looks like production.
$lowered = $pgUrl.ToLower()
if ($lowered -match "prod") {
  Fail "DATABASE_URL appears to contain 'prod'. Refusing to run against production. Got: $pgUrlRedacted"
}
if ($lowered -notmatch "staging" -and $lowered -notmatch "stg" -and $lowered -notmatch "test") {
  Write-Host "WARNING: DATABASE_URL does not contain 'staging'/'stg'/'test' in its hostname." -ForegroundColor Yellow
  Write-Host "  URL (redacted): $pgUrlRedacted"
  $reply = Read-Host "Is this the staging database? Type 'yes' to continue, anything else to abort"
  if ($reply -ne "yes") { Fail "Aborted by user." }
}

$sqlitePath = if ($env:DB_PATH) { $env:DB_PATH } else { "backend/data/antokton.sqlite" }
if (-not (Test-Path $sqlitePath)) {
  Fail "SQLite file not found at: $sqlitePath"
}

$base = if ($env:STAGING_BASE_URL) { $env:STAGING_BASE_URL } else { "https://antokton-pg-staging.onrender.com" }

# Tooling
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Fail "node is not in PATH" }
$pgDumpAvailable = [bool](Get-Command pg_dump -ErrorAction SilentlyContinue)
$psqlAvailable   = [bool](Get-Command psql    -ErrorAction SilentlyContinue)

# Artifacts dir
$Stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
$ArtDir = Join-Path $ArtifactsRoot "staging-$Stamp"
New-Item -ItemType Directory -Force -Path $ArtDir | Out-Null

Write-Host "  Repo root:        $RepoRoot"
Write-Host "  SQLite source:    $sqlitePath"
Write-Host "  Staging PG URL:   $pgUrlRedacted"
Write-Host "  Staging base URL: $base"
Write-Host "  Artifacts:        $ArtDir"
Write-Host "  pg_dump:          $(if ($pgDumpAvailable) {'available'} else {'MISSING (backup will be skipped)'})"
Write-Host "  psql:             $(if ($psqlAvailable)   {'available'} else {'MISSING (diagnostics will be skipped)'})"

# ---------- 2. Backup staging Postgres ----------
if (-not $SkipBackup -and $pgDumpAvailable) {
  Section "Backup staging Postgres"
  $BackupFile = Join-Path $ArtDir "staging-backup.dump"
  Write-Host "  Writing pg_dump to: $BackupFile"
  & pg_dump --format=custom --no-owner --no-privileges --file $BackupFile $pgUrl
  if ($LASTEXITCODE -ne 0) { Fail "pg_dump exited $LASTEXITCODE" }
  Write-Host "  Backup OK ($((Get-Item $BackupFile).Length) bytes)"
} else {
  Section "Backup staging Postgres -- SKIPPED"
  if ($SkipBackup) { Write-Host "  -SkipBackup flag set" } else { Write-Host "  pg_dump not in PATH" }
}

# ---------- 3. Dry-run migration ----------
Section "Dry-run migration"
$dryLog = Join-Path $ArtDir "01-dry-run.log"
& node "backend/migrate-sqlite-to-postgres.js" --dry-run 2>&1 | Tee-Object -FilePath $dryLog
if ($LASTEXITCODE -ne 0) { Fail "Dry-run failed (exit $LASTEXITCODE). See $dryLog" }

if ($DryRunOnly) {
  Write-Host ""
  Write-Host "  -DryRunOnly set; stopping here." -ForegroundColor Yellow
  exit 0
}

# ---------- 4. Live migration ----------
Section "Live migration"
$liveLog = Join-Path $ArtDir "02-migration.log"
& node "backend/migrate-sqlite-to-postgres.js" 2>&1 | Tee-Object -FilePath $liveLog
$migExit = $LASTEXITCODE
if ($migExit -ne 0) {
  Write-Host "WARNING: migration exited $migExit (some tables may not match)." -ForegroundColor Yellow
  Write-Host "Continuing to verification so you can see the deltas."
}

# Find the rollback log the migration script wrote
$rollback = Get-ChildItem -Path "backend/data" -Filter "migration-rollback-*.json" -ErrorAction SilentlyContinue |
            Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($rollback) {
  Copy-Item $rollback.FullName (Join-Path $ArtDir "03-rollback-log.json")
  Write-Host "  Rollback log captured: $($rollback.Name)"
}

# ---------- 5. Integrity verifier ----------
Section "Integrity verification"
$verifyLog = Join-Path $ArtDir "04-integrity.log"
& node "backend/scripts/verify-postgres-integrity.js" --verbose 2>&1 | Tee-Object -FilePath $verifyLog
$verifyExit = $LASTEXITCODE

# ---------- 6. Smoke test ----------
if (-not $SkipSmoke) {
  Section "Smoke test against staging"
  $smokeLog = Join-Path $ArtDir "05-smoke.log"
  & node "backend/scripts/smoke-test.js" $base 2>&1 | Tee-Object -FilePath $smokeLog
  $smokeExit = $LASTEXITCODE
} else {
  $smokeExit = 0
}

# ---------- 7. Diagnostics ----------
if ($psqlAvailable -and (Test-Path "backend/scripts/pg-diagnostics.sql")) {
  Section "Postgres diagnostics"
  $diagLog = Join-Path $ArtDir "06-diagnostics.log"
  & psql $pgUrl -v ON_ERROR_STOP=1 -f "backend/scripts/pg-diagnostics.sql" 2>&1 | Tee-Object -FilePath $diagLog
}

# ---------- 8. Summary ----------
Section "SUMMARY"
Write-Host "  Migration exit:  $migExit"
Write-Host "  Integrity exit:  $verifyExit"
Write-Host "  Smoke exit:      $smokeExit"
Write-Host "  Artifacts in:    $ArtDir"
Write-Host ""
Write-Host "  Next: review $ArtDir for any FAIL lines."
Write-Host "        DO NOT switch production until all three exits are 0 and"
Write-Host "        FINAL_POSTGRES_READINESS_REPORT.md section 8 is green."

if ($migExit -ne 0 -or $verifyExit -ne 0 -or $smokeExit -ne 0) {
  exit 1
}
exit 0
