# Stabilization Report

Date: 2026-05-21

Scope: post-merge stabilization after PostgreSQL hardening and cutover readiness tooling were merged into `main`.

Status: stable after production PostgreSQL cutover; first 24h post-cutover monitoring remains active.

## Current Baseline

- Branch audited: `main`
- Head: `17a7a9d docs: add production PostgreSQL cutover runbook`
- Production deploy: executed during controlled PostgreSQL cutover
- Production database switch: complete
- Current production health check: `ok: true`, `dbMode: postgres`, `schemas: 60`
- Render Auto-Deploy: reported OFF before merge

## Verification Results

Passed:

- Runtime syntax:
  ```powershell
  node --check backend\config.js backend\server.js backend\db.js backend\db-sqlite.js backend\db-postgres.js backend\migrate-sqlite-to-postgres.js backend\scripts\verify-postgres-integrity.js backend\scripts\staging-validation.js backend\scripts\pg-diagnostics.js backend\scripts\smoke-test.js
  ```
- Startup validation:
  ```powershell
  node -e "const { validateStartupEnvironment } = require('./backend/config'); validateStartupEnvironment(); console.log('startup-ok')"
  ```
- SQLite fallback:
  ```powershell
  Remove-Item Env:\DATABASE_URL -ErrorAction SilentlyContinue
  Remove-Item Env:\DATABASE_PROVIDER -ErrorAction SilentlyContinue
  node -e "const db = require('./backend/db'); Promise.resolve(db.getDatabaseStatus()).then(s => console.log(JSON.stringify({mode: db.getDatabaseMode(), status: s})))"
  ```
- Staging tooling help/smoke integrity:
  ```powershell
  node backend\scripts\staging-validation.js --help
  node backend\scripts\pg-diagnostics.js --help
  node backend\migrate-sqlite-to-postgres.js --help
  ```

Observed:

- Local development config defaults to SQLite.
- `safeConfigStatus()` reports dev auth active locally, which is expected outside production.
- Production-like PostgreSQL validation was previously verified with `NODE_ENV=production`, `DATABASE_PROVIDER=postgres`, `ALLOW_DEV_AUTH=false`, secure cookies, and fixed CORS origin.

## Main Branch Contents

Expected post-merge additions are present:

- PostgreSQL migration and validation tooling.
- Cross-platform staging validation runner.
- Node PostgreSQL diagnostics runner.
- Security headers, request timeout, general rate limiting, upload size guard, CORS config, structured request error logging.
- Production cutover, rollback, backup, monitoring, and schema-freeze docs.

No frontend files were changed by the hardening merge.

## Branch Cleanup Recommendations

Safe to delete after confirming no open PRs depend on them:

- `feature/pre-production-hardening`: merged into `main`.
- `origin/feature/pre-production-hardening`: merged into `main`.
- `feature/postgres-validation-tools`: already merged through PR #9 and superseded by `main`.
- `origin/feature/postgres-validation-tools`: already merged through PR #9 and superseded by `main`.

Do not merge; close/archive instead:

- `origin/feature/postgres-runtime`: stale runtime branch. Its diff would remove current validation and cutover tooling.
- `origin/codex/postgres-staging-runtime`: experimental alternate runtime. Its diff diverges heavily and deletes current tooling.
- `origin/feature/postgres-staging`: old staging/frontend/auth work. It contains unrelated changes and conflicts with current runtime/docs.

Recommended cleanup commands, only after PR review:

```powershell
git branch -d feature/pre-production-hardening
git branch -d feature/postgres-validation-tools
git push origin --delete feature/pre-production-hardening
git push origin --delete feature/postgres-validation-tools
```

Leave stale experimental remote branches untouched until their owners confirm they are abandoned:

```text
origin/feature/postgres-runtime
origin/codex/postgres-staging-runtime
origin/feature/postgres-staging
```

## Obsolete Or Duplicated Tooling

Review, do not delete yet:

- `backend/smoke-test.js` and `backend/scripts/smoke-test.js`: two smoke-test entry points exist. Prefer `backend/scripts/smoke-test.js` for staging and cutover validation; decide whether the root backend wrapper is still needed.
- `backend/scripts/pg-diagnostics.sql` and `backend/scripts/pg-diagnostics.js`: both are useful. Keep SQL for psql-capable hosts and Node version for Render TLS/Windows reliability.
- `PRODUCTION_POSTGRES_ROLLOUT.md` overlaps with the newer `PRODUCTION_POSTGRES_CUTOVER_RUNBOOK.md`. Mark the older rollout doc as historical after the first cutover rehearsal using the new runbook.
- `FINAL_POSTGRES_READINESS_REPORT.md` is now historical because live staging gates have passed and `PRODUCTION_CUTOVER_GO_NO_GO_REPORT.md` is current.
- Local ignored reference files `antokton.html`, `antokton-index.css`, and `antokton-index.js` remain outside git and should stay ignored.

## Operational Readiness Recommendations

Monitoring:

- Add uptime checks for `/health` every 1 minute.
- Add post-cutover checks that assert expected `dbMode`.
- Add SSL/domain expiration monitoring for production domains.
- Add synthetic auth and upload smoke checks against staging and, carefully, production.

Alerts:

- Alert on two consecutive `/health` failures.
- Alert on `dbMode` mismatch during cutover.
- Alert on PostgreSQL blocked queries, long-running queries over 30 seconds, and idle-in-transaction sessions over 60 seconds.
- Alert on elevated 5xx rate for more than 10 minutes.

Backups:

- Automate daily SQLite snapshots while production remains SQLite.
- Keep immutable SQLite snapshots during PostgreSQL transition.
- After PostgreSQL cutover, keep provider-native backups plus weekly logical dumps during the first month.
- Document a restore drill cadence: monthly in beta, before every major data migration.

Logging retention:

- Retain application logs at least 14 days during beta.
- Retain cutover and migration artifacts at least 90 days.
- Keep auth audit logs long enough for moderation and abuse investigations.
- Do not store full database URLs, auth tokens, cookies, or passwords in logs.

## Stabilization Findings

- The merged hardening branch is stable from local syntax and fallback checks.
- Production is now running on PostgreSQL.
- PostgreSQL cutover completed successfully and rollback was not required.
- The next stabilization risk is beta operations: post-cutover monitoring, alerting, moderation workflow, legal copy quality, contact triage, frontend dependency security, and backup automation.

## Recommended Next Milestone

Milestone: Public Beta Readiness Sprint 1.

Objective: close public beta blockers without changing database schema or broad-launching public beta before the post-cutover monitoring window closes.

Exit criteria:

- Monitoring and alerting configured.
- Privacy/Terms/Contact copy reviewed and encoding corrected.
- Moderation and abuse response process documented and assigned.
- Backup automation scheduled and restore drill recorded.
- Public beta launch checklist approved.
