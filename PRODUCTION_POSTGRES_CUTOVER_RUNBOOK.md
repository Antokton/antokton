# Production PostgreSQL Cutover Execution Runbook

Status: ready to execute, not executed.

Date prepared: 2026-05-20

Scope: controlled Antokton production cutover from SQLite to PostgreSQL. This runbook does not execute production changes, does not authorize an immediate deploy, and does not change schema, frontend, or runtime code.

## Required Inputs

Set these only in the operator shell or Render dashboard. Never write real values into git, docs, logs, or tickets.

```powershell
$env:PRODUCTION_BASE_URL="<production web URL>"
$env:PRODUCTION_DATABASE_URL="<Render production PostgreSQL External Database URL>"
$env:PRODUCTION_SQLITE_PATH="<absolute path to final production SQLite snapshot>"
$env:CUTOVER_RUN_ID=(Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
$env:CUTOVER_DIR=(Join-Path (Resolve-Path ".") "cutover-artifacts\$env:CUTOVER_RUN_ID")
New-Item -ItemType Directory -Force -Path $env:CUTOVER_DIR | Out-Null
```

Expected current production SQLite path, if running on the production service host:

```powershell
$env:LIVE_SQLITE_PATH="backend\data\antokton.sqlite"
```

If Render production stores SQLite on a mounted disk, use the real mounted `DB_PATH` from Render production env instead of the local default.

## T-48h: Freeze And Ownership

GO/NO-GO gate:

- GO only if staging remains green and the schema freeze is active.
- NO-GO if any schema, frontend persistence, or runtime DB code change is requested.

Actions:

1. Confirm `feature/pre-production-hardening` is the only active merge candidate.
2. Confirm stale branches are not part of the cutover:
   - `origin/feature/postgres-validation-tools`
   - `origin/feature/postgres-runtime`
   - `origin/codex/postgres-staging-runtime`
   - `origin/feature/postgres-staging`
3. Assign roles:
   - cutover operator
   - Render dashboard operator
   - verifier
   - rollback owner
4. Keep database schema freeze active.

Commands:

```powershell
git fetch --all --prune
git status --short --branch
git branch -a -vv
node --check backend\config.js backend\server.js backend\db.js backend\db-sqlite.js backend\db-postgres.js
node --check backend\migrate-sqlite-to-postgres.js backend\scripts\verify-postgres-integrity.js backend\scripts\pg-diagnostics.js backend\scripts\smoke-test.js
```

Secret scan:

```powershell
rg -n --hidden --glob '!node_modules/**' --glob '!backend/node_modules/**' --glob '!.git/**' --glob '!validation-runs/**' --glob '!backend/data/**' --glob '!backend/uploads/**' 'postgres://|postgresql://|AUTH_SECRET=.+|JWT_SECRET=.+|STRIPE_SECRET_KEY=.+|SUPABASE_SERVICE_ROLE_KEY=.+|S3_SECRET_ACCESS_KEY=.+' .
```

## T-24h: Backup And Restore Readiness

GO/NO-GO gate:

- GO only if backup restore path is proven.
- NO-GO if the final SQLite source cannot be copied and checksummed.

Create artifact directory:

```powershell
New-Item -ItemType Directory -Force -Path $env:CUTOVER_DIR | Out-Null
```

Final SQLite snapshot and checksum:

```powershell
$snapshot = Join-Path $env:CUTOVER_DIR "production-sqlite-$env:CUTOVER_RUN_ID.sqlite"
Copy-Item -LiteralPath $env:PRODUCTION_SQLITE_PATH -Destination $snapshot -Force
Get-FileHash -Algorithm SHA256 -LiteralPath $snapshot | Tee-Object -FilePath (Join-Path $env:CUTOVER_DIR "production-sqlite-$env:CUTOVER_RUN_ID.sha256")
$env:PRODUCTION_SQLITE_SNAPSHOT=$snapshot
```

If copying on Render production service shell, copy the mounted SQLite database and its WAL/SHM files before downloading them to the operator machine:

```bash
RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p /tmp/antokton-cutover-"$RUN_ID"
cp "$DB_PATH" /tmp/antokton-cutover-"$RUN_ID"/production.sqlite
test -f "$DB_PATH-wal" && cp "$DB_PATH-wal" /tmp/antokton-cutover-"$RUN_ID"/production.sqlite-wal || true
test -f "$DB_PATH-shm" && cp "$DB_PATH-shm" /tmp/antokton-cutover-"$RUN_ID"/production.sqlite-shm || true
sha256sum /tmp/antokton-cutover-"$RUN_ID"/production.sqlite > /tmp/antokton-cutover-"$RUN_ID"/production.sqlite.sha256
```

Production PostgreSQL pre-migration logical dump:

```powershell
pg_dump --format=custom --no-owner --no-privileges $env:PRODUCTION_DATABASE_URL --file (Join-Path $env:CUTOVER_DIR "production-pg-pre-$env:CUTOVER_RUN_ID.dump")
```

Restore drill to a throwaway PostgreSQL database:

```powershell
createdb antokton_restore_drill_$env:CUTOVER_RUN_ID
pg_restore --clean --if-exists --no-owner --no-privileges --dbname antokton_restore_drill_$env:CUTOVER_RUN_ID (Join-Path $env:CUTOVER_DIR "production-pg-pre-$env:CUTOVER_RUN_ID.dump")
```

## T-2h: Final Preflight

GO/NO-GO gate:

- GO only if production is still on SQLite and staging final gates remain passed.
- NO-GO if production env already contains unapproved `DATABASE_PROVIDER=postgres` or a production `DATABASE_URL` switch.

Validate SQLite fallback locally:

```powershell
Remove-Item Env:\DATABASE_URL -ErrorAction SilentlyContinue
Remove-Item Env:\DATABASE_PROVIDER -ErrorAction SilentlyContinue
node -e "const db = require('./backend/db'); Promise.resolve(db.getDatabaseStatus()).then(s => console.log(JSON.stringify({mode: db.getDatabaseMode(), status: s})))"
```

Validate production-shaped PostgreSQL env without connecting to production:

```powershell
$env:NODE_ENV="production"
$env:ALLOW_DEV_AUTH="false"
$env:DATABASE_PROVIDER="postgres"
$env:DATABASE_URL="postgresql://user:pass@example.com:5432/antokton"
$env:CORS_ALLOWED_ORIGINS="https://antokton.com"
node -e "const { safeConfigStatus, validateStartupEnvironment } = require('./backend/config'); validateStartupEnvironment(); console.log(JSON.stringify(safeConfigStatus(), null, 2))"
Remove-Item Env:\NODE_ENV, Env:\ALLOW_DEV_AUTH, Env:\DATABASE_PROVIDER, Env:\DATABASE_URL, Env:\CORS_ALLOWED_ORIGINS -ErrorAction SilentlyContinue
```

Review the Render production service manually:

- Production service is still using SQLite.
- `DATABASE_PROVIDER` is absent or `sqlite`.
- Production `DATABASE_URL` is not yet active for the web service.
- Existing `DB_PATH`, `DATA_DIR`, `UPLOAD_DIR`, and mounted disk settings are unchanged.
- No frontend deploy is queued for this cutover.

## T-30m: Production Migration Dry-Run

GO/NO-GO gate:

- GO only if dry-run exits `0`, reports no conflicts, and requires no schema change.
- NO-GO if dry-run reports conflicts, errors, missing destination tables, or mismatched JSON.

Command:

```powershell
node backend\migrate-sqlite-to-postgres.js --sqlite $env:PRODUCTION_SQLITE_SNAPSHOT --pg $env:PRODUCTION_DATABASE_URL --dry-run --rollback-log (Join-Path $env:CUTOVER_DIR "production-migration-dry-run-rollback.jsonl")
```

Read-only integrity pre-check against current production PostgreSQL target, if it already contains data:

```powershell
node backend\scripts\verify-postgres-integrity.js --sqlite $env:PRODUCTION_SQLITE_SNAPSHOT --pg $env:PRODUCTION_DATABASE_URL --sample 500 --json (Join-Path $env:CUTOVER_DIR "production-integrity-pre.json")
```

Dry-run pass criteria:

- SQLite source opens read-only.
- PostgreSQL connects with SSL.
- `conflicts=0`.
- `errored=0`.
- No schema changes requested.

## T-0: Live Production Migration And Render Switch

This is the first irreversible window. Stop here unless the maintenance window is approved.

GO/NO-GO gate before live migration:

- GO only if final SQLite snapshot/checksum exists and dry-run passed.
- NO-GO if the SQLite snapshot is missing, checksum is missing, or production writes cannot be paused/controlled.

Live production migration:

```powershell
node backend\migrate-sqlite-to-postgres.js --sqlite $env:PRODUCTION_SQLITE_SNAPSHOT --pg $env:PRODUCTION_DATABASE_URL --truncate --confirm --rollback-log (Join-Path $env:CUTOVER_DIR "production-migration-rollback.jsonl")
```

Immediate integrity verification:

```powershell
node backend\scripts\verify-postgres-integrity.js --sqlite $env:PRODUCTION_SQLITE_SNAPSHOT --pg $env:PRODUCTION_DATABASE_URL --sample 1000 --json (Join-Path $env:CUTOVER_DIR "production-integrity-post.json")
```

Immediate diagnostics:

```powershell
node backend\scripts\pg-diagnostics.js --pg $env:PRODUCTION_DATABASE_URL --json (Join-Path $env:CUTOVER_DIR "production-pg-diagnostics-post.json")
```

GO/NO-GO gate before Render production env switch:

- GO only if integrity exits `0` and diagnostics show no long-running queries, no blocked queries, and no idle-in-transaction sessions.
- NO-GO if integrity fails or diagnostics show lock contention.

Manual Render production steps:

1. Open Render production web service, not staging.
2. Confirm service name and production URL.
3. Set or update only these env vars:
   - `NODE_ENV=production`
   - `DATABASE_PROVIDER=postgres`
   - `DATABASE_URL=<Render production PostgreSQL External Database URL>`
   - `ALLOW_DEV_AUTH=false`
   - `SESSION_COOKIE_SECURE=true`
   - `CORS_ALLOWED_ORIGINS=https://antokton.com`
   - `APP_ID=6991d40eddf82cc25ec834a7`
4. Preserve existing values for:
   - `DB_PATH`
   - `DATA_DIR`
   - `UPLOAD_DIR`
   - upload disk or mounted disk configuration
   - Stripe, email, auth, and storage secrets
5. Do not change:
   - frontend build settings
   - domains
   - GitHub integration
   - staging service
   - database schema
   - object storage settings
6. Use manual deploy/restart only inside the approved maintenance window.

Post-switch production health:

```powershell
Invoke-RestMethod -Uri "$env:PRODUCTION_BASE_URL/health" -TimeoutSec 120 | ConvertTo-Json -Compress
```

Production smoke test:

```powershell
node backend\scripts\smoke-test.js --base $env:PRODUCTION_BASE_URL --json (Join-Path $env:CUTOVER_DIR "production-smoke-post.json")
```

## T+15m: Stabilization Check

GO/NO-GO gate:

- GO only if health, smoke, and diagnostics remain green.
- Rollback if health fails twice, auth fails, uploads fail, entity CRUD fails, or PostgreSQL has blocked queries.

Commands:

```powershell
Invoke-RestMethod -Uri "$env:PRODUCTION_BASE_URL/health" -TimeoutSec 60 | ConvertTo-Json -Compress
node backend\scripts\pg-diagnostics.js --pg $env:PRODUCTION_DATABASE_URL --json (Join-Path $env:CUTOVER_DIR "production-pg-diagnostics-tplus15.json")
node backend\scripts\smoke-test.js --base $env:PRODUCTION_BASE_URL --json (Join-Path $env:CUTOVER_DIR "production-smoke-tplus15.json")
```

## T+1h: First Hour Review

GO/NO-GO gate:

- Continue only if error logs are stable and PostgreSQL remains healthy.
- Rollback if error rate stays elevated for more than 10 minutes or login/upload failures persist.

Commands:

```powershell
node backend\scripts\pg-diagnostics.js --pg $env:PRODUCTION_DATABASE_URL --json (Join-Path $env:CUTOVER_DIR "production-pg-diagnostics-tplus1h.json")
node backend\scripts\smoke-test.js --base $env:PRODUCTION_BASE_URL --json (Join-Path $env:CUTOVER_DIR "production-smoke-tplus1h.json")
```

Manual Render checks:

- Review production logs for startup env validation errors.
- Review PostgreSQL pool errors.
- Review request timeout and rate limit errors.
- Confirm no unexpected deploy was triggered.

## T+24h: Completion Review

GO/NO-GO gate:

- Complete cutover only if no rollback triggers occurred for 24 hours.
- Keep SQLite snapshot retained even after success.

Commands:

```powershell
node backend\scripts\pg-diagnostics.js --pg $env:PRODUCTION_DATABASE_URL --json (Join-Path $env:CUTOVER_DIR "production-pg-diagnostics-tplus24h.json")
node backend\scripts\smoke-test.js --base $env:PRODUCTION_BASE_URL --json (Join-Path $env:CUTOVER_DIR "production-smoke-tplus24h.json")
```

Closeout:

- Confirm provider-native PostgreSQL backups are active.
- Store final SQLite snapshot and checksum for at least 90 days.
- Store migration rollback log outside git.
- Record production cutover outcome.
- Keep schema freeze until the 24h report is accepted.

## Rollback Trigger Conditions

Rollback immediately if any of these occur:

- `/health` fails twice in a row.
- `/health` reports the wrong `dbMode`.
- Auth register/login fails.
- Existing user login fails.
- `User/me` fails.
- Entity create/read/list/update/delete fails.
- Upload or asset fetch fails.
- PostgreSQL diagnostics show blocked queries.
- Idle-in-transaction sessions persist beyond 60 seconds.
- Error rate remains elevated for more than 10 minutes.
- Production data integrity check fails.

## Rollback Execution

GO/NO-GO gate:

- Execute rollback only if a rollback trigger is confirmed by the rollback owner.
- Do not delete the failed PostgreSQL database.

Runtime rollback through Render:

1. In Render production web service env vars:
   - set `DATABASE_PROVIDER=sqlite`
   - remove or disable `DATABASE_URL` for the web service
   - preserve `DB_PATH`, `DATA_DIR`, `UPLOAD_DIR`, mounted disk, and all auth/upload secrets
2. Restart or redeploy production service.
3. Verify SQLite mode:

```powershell
Invoke-RestMethod -Uri "$env:PRODUCTION_BASE_URL/health" -TimeoutSec 120 | ConvertTo-Json -Compress
node backend\scripts\smoke-test.js --base $env:PRODUCTION_BASE_URL --json (Join-Path $env:CUTOVER_DIR "production-smoke-rollback.json")
```

Data rollback of PostgreSQL inserted rows, if required:

```powershell
node backend\migrate-sqlite-to-postgres.js --pg $env:PRODUCTION_DATABASE_URL --rollback (Join-Path $env:CUTOVER_DIR "production-migration-rollback.jsonl") --confirm
```

Post-rollback diagnostics:

```powershell
node backend\scripts\pg-diagnostics.js --pg $env:PRODUCTION_DATABASE_URL --json (Join-Path $env:CUTOVER_DIR "production-pg-diagnostics-rollback.json")
```

## What Not To Change

- Do not change frontend code or build settings.
- Do not change schema or migrations.
- Do not change staging resources during production cutover.
- Do not delete SQLite data.
- Do not delete PostgreSQL data after a failed cutover.
- Do not rotate unrelated secrets during the window.
- Do not install old Vercel/GitHub integrations.
- Do not merge stale runtime branches.

## Final Status

Ready to execute: yes.

Executed: no.

Production deploy performed: no.

Production DB switched: no.
