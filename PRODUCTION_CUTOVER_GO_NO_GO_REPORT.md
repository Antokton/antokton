# Production Cutover GO/NO-GO Report

Date: 2026-05-20

Assessment: NO-GO for production cutover today.

Reason: production stability work is in good shape, but the staging SQLite to PostgreSQL migration rehearsal has not yet completed with `fails: 0` because `STAGING_DATABASE_URL` has not been available in the execution environment.

## Branch Audit

| Branch | Classification | Action |
| --- | --- | --- |
| `main` | Production baseline | Keep stable. Do not change production env yet. |
| `feature/pre-production-hardening` | Hardening branch | Active merge candidate after staging integrity reaches `fails: 0`. |
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

## Remaining Required Gates

- [ ] Provide `STAGING_DATABASE_URL` in the shell.
- [ ] Run staging migration dry-run.
- [ ] Run live staging migration with rollback log.
- [ ] Run integrity verifier immediately after migration.
- [ ] Achieve `fails: 0`.
- [ ] Run PostgreSQL diagnostics after migration.
- [ ] Run smoke after integrity.
- [ ] Complete backup restore drill.
- [ ] Record final GO decision.

## Exact Commands

Staging dry-run:

```powershell
$env:STAGING_DATABASE_URL="postgresql://..."
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

## GO Criteria

Production cutover can become GO only when:

- Staging integrity reports `fails: 0`.
- Rollback verification has passed.
- Backup restore drill has passed.
- Production env requirements are reviewed and ready.
- Maintenance window is approved.
- Render production deploy timing is controlled.

## NO-GO Criteria

Keep production cutover blocked if:

- Staging DB URL is unavailable.
- Integrity fails.
- Staging migration needs schema changes.
- Smoke fails.
- Diagnostics show lock contention or persistent idle-in-transaction sessions.
- Backup restore drill is incomplete.
