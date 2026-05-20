# Production Cutover GO/NO-GO Report

Date: 2026-05-20

Assessment: GO for controlled production cutover technical readiness.

Reason: staging SQLite to PostgreSQL migration rehearsal completed successfully with `fails: 0`, PostgreSQL diagnostics passed, smoke tests passed, and the rollback drill was validated. This does not authorize a production deploy or production database switch by itself; it means the technical cutover gate is no longer blocked.

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
