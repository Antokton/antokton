# Production Cutover GO/NO-GO Report

Date: 2026-05-20

Assessment: PRODUCTION CUTOVER COMPLETE.

Reason: staging SQLite to PostgreSQL migration rehearsal completed successfully with `fails: 0`, PostgreSQL diagnostics passed, smoke tests passed, and the rollback drill was validated. The controlled production cutover was then executed on 2026-05-21 with a final Render SQLite snapshot, production PostgreSQL dry-run, live migration, integrity verification, PostgreSQL diagnostics, Render env switch, manual deploy, and production smoke validation.

## Production Cutover Execution

Date: 2026-05-21

Final status: production is running on PostgreSQL.

Final `/health` result:

```json
{"ok":true,"appId":"6991d40eddf82cc25ec834a7","db":"postgres","dbMode":"postgres","schemas":60}
```

Final production SQLite backup:

- Backup directory: `/data/backups/prod-cutover-20260521T105929Z`
- SQLite snapshot: `/data/backups/prod-cutover-20260521T105929Z/antokton.sqlite`
- `antokton.sqlite`: `14e338bb364333bc9cd457109668d7c1519c9381f02593d53dd6922a9d466c3d`
- `antokton.sqlite-wal`: `bb53e4bbcde67d37c2e70f776a99ad7ebb7cb465126e45cf4d637be7e62609ba`
- `antokton.sqlite-shm`: `6215952135cccda820585c528c077f7514cece8ea7d522a561aa4c8be1be472f`
- `uploads.tar.gz`: `a3d02f271ef9c5c0c5729703d43f5b470b9ebf9e84bdcf5fbbcd5d6d77adfedd`

Production migration gates:

- Pre-cutover production `/health`: passed with `dbMode=sqlite`, `schemas=60`.
- Render build command updated to install backend dependencies before frontend build.
- Production dry-run: passed with `DRY_RUN_EXIT=0`.
- Live production migration: passed with `LIVE_MIGRATION_EXIT=0`.
- Integrity verifier: passed with `FAIL: 0`, `WARN: 2`.
- Required production counts after migration:
  - `auth_accounts`: 3
  - `auth_audit_logs`: 40
  - `auth_sessions`: 31
  - `entity_records`: 212
  - `uploaded_files`: 12
  - `function_logs`: 2
  - `entity_schemas`: 60
- PostgreSQL diagnostics before switch: passed with `DIAGNOSTICS_EXIT=0`.
- Render production env switch: applied with `DATABASE_PROVIDER=postgres`, `NODE_ENV=production`, `ALLOW_DEV_AUTH=false`, secure session cookies, and exact production CORS origin.
- Controlled manual deploy: passed; Render logs showed `Using PostgreSQL database`.
- Post-switch diagnostics: passed with `POST_SWITCH_DIAGNOSTICS_EXIT=0`.
- Production smoke test: passed `17/17`.
- Rollback: not required.

Post-cutover monitoring requirements:

- Keep the final SQLite backup and rollback log on the Render disk until the post-cutover monitoring window closes.
- Monitor `/health`, auth, entity CRUD, uploads, Render logs, PostgreSQL diagnostics, and error volume for 24 hours.
- Do not delete the SQLite disk data or backup artifacts during the monitoring window.

## Branch Audit

| Branch | Classification | Action |
| --- | --- | --- |
| `main` | Production baseline | Keep stable. Do not change production env yet. |
| `feature/pre-production-hardening` | Hardening branch | Active merge candidate after controlled production timing is approved. |
| `feature/postgres-validation-tools` | Migration tooling branch | Already merged through PR #9; no further merge needed. |
| `origin/feature/postgres-runtime` | Stale runtime branch | Do not merge; already represented in main and conflicts with current tools. |
| `origin/codex/postgres-staging-runtime` | Experimental runtime branch | Do not merge; large divergence and deletes current validation files. |
| `origin/feature/postgres-staging` | Unfinished experimental branch | Do not merge; contains unrelated frontend/auth changes and high conflict risk. |

## Completed Verifications

- SQLite fallback verified with `DATABASE_PROVIDER` and `DATABASE_URL` unset.
- Default startup environment validation passes.
- Production-like PostgreSQL env validation passes with:
  - `NODE_ENV=production`
  - `ALLOW_DEV_AUTH=false`
  - `DATABASE_PROVIDER=postgres`
  - `DATABASE_URL` set to a PostgreSQL-shaped URL
  - exact CORS origin
- Secret scan found no committed real database URLs or secret values; matches were placeholders or code validation strings.
- Staging runtime was previously verified with `/health` reporting `dbMode=postgres`.
- Staging smoke has previously passed `17/17`.
- Staging dry-run completed cleanly for the migration step.
- Live staging rehearsal completed successfully with rollback log.
- Integrity verifier reported `FAIL: 0`, `WARN: 2`.
- Required table counts matched after migration:
  - `entity_records`: 174
  - `uploaded_files`: 10
  - `function_logs`: 2
  - `entity_schemas`: 60
- PostgreSQL diagnostics passed:
  - no long-running queries over 30 seconds
  - no idle-in-transaction sessions over 60 seconds
  - no blocked queries
  - table cache hit ratio: 100.00%
  - index cache hit ratio: 99.24%
- Smoke test passed `17/17` after integrity verification.
- Rollback drill completed from `validation-runs/20260520T214018Z/migration-rollback.jsonl` and deleted 246 migrated rows as planned.
- Staging was re-migrated after rollback; final validation run `validation-runs/20260520T214200Z` passed all gates.

## Completed Cutover Gates

- [x] Provide `STAGING_DATABASE_URL` in the process without committing or printing it.
- [x] Run staging migration dry-run.
- [x] Run live staging migration with rollback log.
- [x] Run integrity verifier immediately after migration.
- [x] Achieve `fails: 0`.
- [x] Run PostgreSQL diagnostics after migration.
- [x] Run smoke after integrity.
- [x] Validate rollback drill.
- [x] Re-migrate staging after rollback.
- [x] Record final technical GO decision.

## Production Hold Points

- [ ] Approve production maintenance window.
- [ ] Capture final production SQLite snapshot and checksum.
- [ ] Confirm Render production backup/restore path.
- [ ] Apply production environment changes only during the approved window.
- [ ] Run production post-cutover monitoring for 24 hours.

## Exact Commands

Staging dry-run:

```powershell
$env:STAGING_DATABASE_URL="<from Render staging External Database URL>"
node backend\scripts\staging-validation.js --base https://antokton-pg-staging.onrender.com --pg $env:STAGING_DATABASE_URL --sqlite backend\data\antokton.sqlite --migration dry-run
```

Staging live rehearsal:

```powershell
node backend\scripts\staging-validation.js --base https://antokton-pg-staging.onrender.com --pg $env:STAGING_DATABASE_URL --sqlite backend\data\antokton.sqlite --migration live --truncate-migration --confirm-migration
```

Diagnostics only:

```powershell
node backend\scripts\pg-diagnostics.js --pg $env:STAGING_DATABASE_URL
```

SQLite fallback:

```powershell
Remove-Item Env:\DATABASE_URL -ErrorAction SilentlyContinue
Remove-Item Env:\DATABASE_PROVIDER -ErrorAction SilentlyContinue
node -e "const db = require('./backend/db'); Promise.resolve(db.getDatabaseStatus()).then(s => console.log(JSON.stringify({mode: db.getDatabaseMode(), status: s})))"
```

Secret scan:

```powershell
rg -n --hidden --glob '!node_modules/**' --glob '!backend/node_modules/**' --glob '!.git/**' --glob '!validation-runs/**' --glob '!backend/data/**' --glob '!backend/uploads/**' 'postgres://|postgresql://|AUTH_SECRET=.+|JWT_SECRET=.+|STRIPE_SECRET_KEY=.+|SUPABASE_SERVICE_ROLE_KEY=.+|S3_SECRET_ACCESS_KEY=.+' .
```

Rollback drill:

```powershell
node backend\migrate-sqlite-to-postgres.js --pg $env:STAGING_DATABASE_URL --rollback validation-runs\20260520T214018Z\migration-rollback.jsonl --confirm
```

## GO Criteria

Production cutover technical readiness is GO because:

- Staging integrity reports `fails: 0`.
- Rollback verification has passed.
- PostgreSQL diagnostics passed.
- Smoke passed after integrity.
- Production env requirements are reviewed and documented.

Production execution still requires:

- Maintenance window approval.
- Final production SQLite snapshot and checksum.
- Render production env changes during the approved window only.
- Controlled deploy/restart and 24h monitoring.

## NO-GO Criteria

Keep production cutover blocked if:

- Staging DB URL is unavailable.
- Integrity fails.
- Staging migration needs schema changes.
- Smoke fails.
- Diagnostics show lock contention or persistent idle-in-transaction sessions.
- Backup restore drill is incomplete.
