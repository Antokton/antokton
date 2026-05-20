#!/usr/bin/env bash
# backend/scripts/staging-validation.sh
#
# One-command staging validation runner.
#
# Runs (in order, stopping on first failure unless --keep-going):
#   1. /health probe         (curl)
#   2. /health/db probe      (curl, optional)
#   3. smoke-test.js         (auth, CRUD, uploads, sessions, admin)
#   4. verify-postgres-integrity.js  (counts + missing + JSON + auth + sessions)
#   5. pg-diagnostics.sql    (pool state, slow queries, index usage)
#
# All output is tee'd to ./validation-runs/<UTC-timestamp>/ for later review.
#
# Usage:
#   ./backend/scripts/staging-validation.sh \
#     --base https://antokton-pg-staging.onrender.com \
#     --pg "$STAGING_DATABASE_URL" \
#     --sqlite ./backend/data/production.db \
#     [--admin-token "$ADMIN_TOKEN"] \
#     [--keep-going] \
#     [--skip smoke,integrity,diag]
#
# Exit codes:
#   0  every check passed
#   1  one or more checks failed
#   2  usage / environment problem

set -uo pipefail

BASE=""
PG_URL=""
SQLITE_PATH=""
ADMIN_TOKEN=""
KEEP_GOING=0
SKIP=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base) BASE="$2"; shift 2 ;;
    --pg) PG_URL="$2"; shift 2 ;;
    --sqlite) SQLITE_PATH="$2"; shift 2 ;;
    --admin-token) ADMIN_TOKEN="$2"; shift 2 ;;
    --keep-going) KEEP_GOING=1; shift ;;
    --skip) SKIP="$2"; shift 2 ;;
    -h|--help)
      sed -n '2,30p' "$0"; exit 0 ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
done

if [[ -z "$BASE" ]]; then
  echo "ERROR: --base <url> is required" >&2; exit 2
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
RUN_TS="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_DIR="$REPO_ROOT/validation-runs/$RUN_TS"
mkdir -p "$OUT_DIR"

echo "================================================================"
echo " Antokton staging validation"
echo "================================================================"
echo " Run ID:   $RUN_TS"
echo " Base URL: $BASE"
echo " PG:       ${PG_URL:+<set>}${PG_URL:-<unset>}"
echo " SQLite:   ${SQLITE_PATH:-<unset>}"
echo " Output:   $OUT_DIR"
echo "----------------------------------------------------------------"

FAILED=0
SKIP_CSV=",$SKIP,"

step() {
  local name="$1"; shift
  local logfile="$OUT_DIR/$name.log"
  echo
  echo ">>> STEP: $name"
  echo "    log:  $logfile"
  if [[ "$SKIP_CSV" == *",$name,"* ]]; then
    echo "    SKIPPED (--skip)"
    return 0
  fi
  if "$@" 2>&1 | tee "$logfile"; then
    echo "    OK: $name"
    return 0
  else
    local rc=${PIPESTATUS[0]}
    echo "    FAIL: $name (exit $rc)"
    FAILED=$((FAILED + 1))
    if [[ $KEEP_GOING -eq 0 ]]; then
      echo "    aborting (run with --keep-going to continue past failures)"
      finish
      exit 1
    fi
  fi
}

finish() {
  echo
  echo "================================================================"
  if [[ $FAILED -eq 0 ]]; then
    echo " RESULT: all checks passed"
  else
    echo " RESULT: $FAILED step(s) failed -- see $OUT_DIR for details"
  fi
  echo "================================================================"
}

# Step 1: bare health
step health curl -sS --fail --max-time 15 "$BASE/health"

# Step 2: db health (optional endpoint)
step health-db bash -c "curl -sS --max-time 15 -o /tmp/healthdb.out -w '%{http_code}\n' '$BASE/health/db' | tee /dev/stderr | grep -qE '^(200|404)$' && cat /tmp/healthdb.out"

# Step 3: smoke test
SMOKE_ARGS=(--base "$BASE" --json "$OUT_DIR/smoke-results.json")
if [[ -n "$ADMIN_TOKEN" ]]; then
  SMOKE_ARGS+=(--admin-token "$ADMIN_TOKEN")
fi
step smoke node "$SCRIPT_DIR/smoke-test.js" "${SMOKE_ARGS[@]}"

# Step 4: integrity verifier (needs both SQLite and PG)
if [[ -n "$PG_URL" && -n "$SQLITE_PATH" ]]; then
  step integrity node "$SCRIPT_DIR/verify-postgres-integrity.js" \
    --sqlite "$SQLITE_PATH" \
    --pg "$PG_URL" \
    --sample 500 \
    --json "$OUT_DIR/integrity-report.json"
else
  echo ">>> STEP: integrity"
  echo "    SKIPPED (need both --pg and --sqlite)"
fi

# Step 5: pg diagnostics
if [[ -n "$PG_URL" ]]; then
  DIAG_SQL="$REPO_ROOT/backend/scripts/pg-diagnostics.sql"
  if command -v psql >/dev/null 2>&1 && [[ -f "$DIAG_SQL" ]]; then
    step diag psql "$PG_URL" -v ON_ERROR_STOP=1 -f "$DIAG_SQL"
  else
    echo ">>> STEP: diag"
    echo "    SKIPPED (need psql in PATH and $DIAG_SQL)"
  fi
else
  echo ">>> STEP: diag"
  echo "    SKIPPED (need --pg)"
fi

finish
exit $FAILED
