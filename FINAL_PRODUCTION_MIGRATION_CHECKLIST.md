# Final Production Migration Checklist

This checklist prepares Antokton for a controlled SQLite to PostgreSQL production cutover. It does not authorize a production deploy by itself.

## Branch And Merge Plan

Current baseline:

- `main` at `5ea346d`: PostgreSQL validation tooling merged, SQLite production still default.
- `feature/pre-production-hardening` at `8a52bb0`: active hardening branch and only current merge candidate.

Do not merge these stale or experimental branches:

- `origin/feature/postgres-validation-tools`: already merged through PR #9; remote branch is stale.
- `origin/feature/postgres-runtime`: old runtime work already represented in `main`; diff would remove validation tooling.
- `origin/codex/postgres-staging-runtime`: alternate staging runtime; high conflict risk and deletes current tools.
- `origin/feature/postgres-staging`: old staging/auth/frontend work; high conflict risk and unrelated frontend/auth changes.

Safe merge order:

1. Finish staging migration rehearsal from `feature/pre-production-hardening`.
2. Confirm `fails: 0` from integrity verification.
3. Confirm diagnostics are green.
4. Confirm smoke test `17/17` after integrity.
5. Merge `feature/pre-production-hardening` only after production deploy timing is approved.
6. Delete or close stale migration/runtime branches after confirming no unmerged required commits remain.

Conflict risks:

- `backend/db.js`, `backend/db-postgres.js`, `backend/db-sqlite.js`, and `backend/server.js` have conflicting history in old runtime branches.
- `origin/feature/postgres-staging` includes frontend/auth changes that are not part of cutover stability.
- Merging stale branches could remove migration and validation scripts already accepted into `main`.

Validation after each merge:

```powershell
git status --short --branch
node --check backend\config.js backend\server.js backend\db.js backend\db-sqlite.js backend\db-postgres.js
node --check backend\migrate-sqlite-to-postgres.js backend\scripts\verify-postgres-integrity.js backend\scripts\staging-validation.js backend\scripts\pg-diagnostics.js backend\scripts\smoke-test.js
node -e "const { validateStartupEnvironment } = require('./backend/config'); validateStartupEnvironment(); console.log('startup-ok')"
node -e "delete process.env.DATABASE_URL; delete process.env.DATABASE_PROVIDER; const db = require('./backend/db'); Promise.resolve(db.getDatabaseStatus()).then(s => console.log(JSON.stringify({mode: db.getDatabaseMode(), status: s})))"
```

## Staging Migration Gate

Set the staging database URL only in the local shell. Do not write it into files.

```powershell
$env:STAGING_DATABASE_URL="postgresql://..."
```

Dry run:

```powershell
node backend\scripts\staging-validation.js --base https://antokton-pg-staging.onrender.com --pg $env:STAGING_DATABASE_URL --sqlite backend\data\antokton.sqlite --migration dry-run
```

Live staging migration:

```powershell
node backend\scripts\staging-validation.js --base https://antokton-pg-staging.onrender.com --pg $env:STAGING_DATABASE_URL --sqlite backend\data\antokton.sqlite --migration live --truncate-migration --confirm-migration
```

Required outcome:

- Health reports `dbMode=postgres`.
- Migration exits `0`.
- Integrity exits `0`.
- Integrity summary reports `fails: 0`.
- Smoke test reports `17/17 passed`.
- Diagnostics report no long-running queries, blocked queries, or idle-in-transaction sessions.

## Production Environment Requirements

Before cutover, Render production must have:

- `NODE_ENV=production`
- `DATABASE_PROVIDER=postgres`
- `DATABASE_URL=<production PostgreSQL URL>`
- `ALLOW_DEV_AUTH=false`
- `SESSION_COOKIE_SECURE=true`
- `CORS_ALLOWED_ORIGINS=https://antokton.com`
- `APP_ID=6991d40eddf82cc25ec834a7`
- `AUTH_BOOTSTRAP_ADMIN_EMAIL` and `AUTH_BOOTSTRAP_ADMIN_PASSWORD` only for the controlled bootstrap window, then removed.
- Existing upload settings preserved unless object storage migration has been separately approved.

Do not change production environment until the GO decision is recorded.

## Production Cutover Steps

1. Announce maintenance window.
2. Freeze schema and feature changes.
3. Capture final SQLite snapshot and checksum.
4. Capture current production environment snapshot without exposing secret values.
5. Create or verify production PostgreSQL backup.
6. Run migration dry-run against production snapshot and target.
7. Run live production migration with rollback log.
8. Run integrity verification before smoke.
9. Run PostgreSQL diagnostics.
10. Switch production environment to PostgreSQL only after all gates pass.
11. Deploy or restart production in the approved window.
12. Run `/health`, smoke, diagnostics, and auth checks.
13. Keep SQLite snapshot immutable for rollback.

## Immediate Hold Points

Stop and declare NO-GO if any of these happen:

- Staging integrity does not reach `fails: 0`.
- Migration requires schema changes.
- Production SQLite snapshot cannot be captured.
- PostgreSQL backup restore drill fails.
- Render production env differs from this checklist.
- Authentication, uploads, or entity CRUD fail after migration.
