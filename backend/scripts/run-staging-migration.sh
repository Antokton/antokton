#!/usr/bin/env bash
# backend/scripts/run-staging-migration.sh
#
# Bash twin of run-staging-migration.ps1. Run from the repo root.
#
# Usage:
#   export DATABASE_URL="postgres://...staging..."
#   ./backend/scripts/run-staging-migration.sh [--dry-run-only] [--skip-backup] [--skip-smoke]

set -uo pipefail

DRY_RUN_ONLY=0
SKIP_BACKUP=0
SKIP_SMOKE=0
ARTIFACTS_ROOT=".migration-artifacts"
BASE_URL="${STAGING_BASE_URL:-https://antokton-pg-staging.onrender.com}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run-only) DRY_RUN_ONLY=1; shift ;;
    --skip-backup)  SKIP_BACKUP=1;  shift ;;
    --skip-smoke)   SKIP_SMOKE=1;   shift ;;
    --artifacts)    ARTIFACTS_ROOT="$2"; shift 2 ;;
    -h|--help) sed -n '2,15p' "$0"; exit 0 ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
done

section() { echo; echo "====================================================================="; echo "  $1"; echo "====================================================================="; }
die()     { echo "FATAL: $1" >&2; exit 1; }

cd "$(dirname "$0")/../.." || die "cannot cd to repo root"

# ---------- pre-flight ----------
section "Pre-flight"

[[ -n "${DATABASE_URL:-}" ]] || die "DATABASE_URL is not set. Export the STAGING URL first."

PG_URL="$DATABASE_URL"
PG_URL_REDACTED="$(echo "$PG_URL" | sed -E 's#:([^:@/]+)@#:***@#')"

case "${PG_URL,,}" in
  *prod*) die "DATABASE_URL contains 'prod'. Refusing. Got: $PG_URL_REDACTED" ;;
esac

if ! echo "${PG_URL,,}" | grep -qE 'staging|stg|test'; then
  echo "WARNING: DATABASE_URL does not contain 'staging'/'stg'/'test' in its hostname."
  echo "  URL (redacted): $PG_URL_REDACTED"
  read -r -p "Is this the staging database? Type 'yes' to continue: " ans
  [[ "$ans" == "yes" ]] || die "Aborted by user."
fi

SQLITE_PATH="${DB_PATH:-backend/data/antokton.sqlite}"
[[ -f "$SQLITE_PATH" ]] || die "SQLite file not found at $SQLITE_PATH"

command -v node    >/dev/null 2>&1 || die "node not in PATH"
PG_DUMP_OK=0; command -v pg_dump >/dev/null 2>&1 && PG_DUMP_OK=1
PSQL_OK=0;    command -v psql    >/dev/null 2>&1 && PSQL_OK=1

STAMP=$(date -u +%Y%m%dT%H%M%SZ)
ART_DIR="$ARTIFACTS_ROOT/staging-$STAMP"
mkdir -p "$ART_DIR"

echo "  SQLite source:    $SQLITE_PATH"
echo "  Staging PG URL:   $PG_URL_REDACTED"
echo "  Staging base URL: $BASE_URL"
echo "  Artifacts:        $ART_DIR"
echo "  pg_dump:          $([[ $PG_DUMP_OK -eq 1 ]] && echo available || echo MISSING)"
echo "  psql:             $([[ $PSQL_OK    -eq 1 ]] && echo available || echo MISSING)"

# ---------- backup ----------
if [[ $SKIP_BACKUP -eq 0 && $PG_DUMP_OK -eq 1 ]]; then
  section "Backup staging Postgres"
  BACKUP="$ART_DIR/staging-backup.dump"
  echo "  Writing pg_dump to: $BACKUP"
  if pg_dump --format=custom --no-owner --no-privileges --file "$BACKUP" "$PG_URL"; then
    echo "  Backup OK ($(stat -c %s "$BACKUP" 2>/dev/null || stat -f %z "$BACKUP") bytes)"
  else
    die "pg_dump failed"
  fi
else
  section "Backup -- SKIPPED"
fi

# ---------- dry run ----------
section "Dry-run migration"
node backend/migrate-sqlite-to-postgres.js --dry-run 2>&1 | tee "$ART_DIR/01-dry-run.log"
DRY_EXIT=${PIPESTATUS[0]}
[[ $DRY_EXIT -eq 0 ]] || die "Dry-run failed (exit $DRY_EXIT). See $ART_DIR/01-dry-run.log"

if [[ $DRY_RUN_ONLY -eq 1 ]]; then
  echo; echo "  --dry-run-only set; stopping here."
  exit 0
fi

# ---------- live migration ----------
section "Live migration"
node backend/migrate-sqlite-to-postgres.js 2>&1 | tee "$ART_DIR/02-migration.log"
MIG_EXIT=${PIPESTATUS[0]}
if [[ $MIG_EXIT -ne 0 ]]; then
  echo "WARNING: migration exited $MIG_EXIT"
fi

# Capture rollback log written by the migration script
RB=$(ls -t backend/data/migration-rollback-*.json 2>/dev/null | head -1)
[[ -n "$RB" ]] && cp "$RB" "$ART_DIR/03-rollback-log.json" && echo "  Rollback log captured: $(basename "$RB")"

# ---------- integrity ----------
section "Integrity verification"
node backend/scripts/verify-postgres-integrity.js --verbose 2>&1 | tee "$ART_DIR/04-integrity.log"
VERIFY_EXIT=${PIPESTATUS[0]}

# ---------- smoke test ----------
SMOKE_EXIT=0
if [[ $SKIP_SMOKE -eq 0 ]]; then
  section "Smoke test against staging"
  node backend/scripts/smoke-test.js "$BASE_URL" 2>&1 | tee "$ART_DIR/05-smoke.log"
  SMOKE_EXIT=${PIPESTATUS[0]}
fi

# ---------- diagnostics ----------
if [[ $PSQL_OK -eq 1 && -f backend/scripts/pg-diagnostics.sql ]]; then
  section "Postgres diagnostics"
  psql "$PG_URL" -v ON_ERROR_STOP=1 -f backend/scripts/pg-diagnostics.sql 2>&1 | tee "$ART_DIR/06-diagnostics.log" || true
fi

# ---------- summary ----------
section "SUMMARY"
echo "  Migration exit:  $MIG_EXIT"
echo "  Integrity exit:  $VERIFY_EXIT"
echo "  Smoke exit:      $SMOKE_EXIT"
echo "  Artifacts in:    $ART_DIR"
echo
echo "  Next: review $ART_DIR for any FAIL lines."
echo "        DO NOT switch production until all three exits are 0."

if [[ $MIG_EXIT -ne 0 || $VERIFY_EXIT -ne 0 || $SMOKE_EXIT -ne 0 ]]; then
  exit 1
fi
exit 0
