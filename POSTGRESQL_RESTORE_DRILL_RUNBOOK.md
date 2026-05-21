# PostgreSQL Restore Drill Runbook

Date: 2026-05-21

Status: required before broad public beta.

Scope: verify that production PostgreSQL backups can be restored into a throwaway database and validated without touching production runtime.

Strict limits:

- Do not restore into production.
- Do not change Render production env vars.
- Do not switch runtime database provider.
- Do not print or commit database URLs.
- Use throwaway restore database only.

## Required Inputs

- Production PostgreSQL backup source from Render.
- Throwaway PostgreSQL restore database.
- Restore database URL stored only in the current shell as `RESTORE_DATABASE_URL`.
- Current production base URL: `https://antokton.com`.

## Gate 1 - Production Baseline

```powershell
Invoke-RestMethod https://antokton.com/health
node backend\scripts\smoke-test.js --base https://antokton.com
```

GO if:

- `/health` returns `ok=true`.
- `dbMode=postgres`.
- `schemas=60`.
- Smoke passes `17/17`.

NO-GO if any baseline check fails.

## Gate 2 - Create Or Select Backup

In Render:

- Open the production PostgreSQL service.
- Confirm it is the intended production database.
- Confirm backup retention is enabled.
- Select the latest successful backup or create a manual snapshot if available.

Record in a private operations note:

- Backup timestamp.
- Backup source service.
- Restore target service.
- Operator name.

Do not commit this private note if it contains service URLs or credentials.

## Gate 3 - Restore Into Throwaway Database

Use Render's provider-native restore flow where available.

Alternative logical restore flow:

```powershell
$env:RESTORE_DATABASE_URL="<throwaway restore database url>"
psql "$env:RESTORE_DATABASE_URL" -f path\to\sanitized-dump.sql
```

GO if restore completes without errors.

NO-GO if restore reports schema, permission, encoding, or connection failures.

## Gate 4 - Validate Restored Database

Run the restore validator first. It is read-only and does not print the database URL:

```powershell
node backend\scripts\verify-postgres-restore.js --pg $env:RESTORE_DATABASE_URL --expect-schemas 60 --json
```

Required:

- `ok: true`
- `entity_schemas: 60`
- Required runtime tables exist.
- Blocked queries: `0`
- Idle-in-transaction sessions: `0`
- Long-running queries: `0`

Run integrity against the restored database URL:

```powershell
node backend\scripts\verify-postgres-integrity.js --pg $env:RESTORE_DATABASE_URL
```

Run diagnostics:

```powershell
psql "$env:RESTORE_DATABASE_URL" -f backend\scripts\pg-diagnostics.sql
```

Required results:

- Restore validator `ok: true`.
- Integrity `fails: 0`.
- No blocked queries.
- No idle-in-transaction sessions.
- No unexpected long-running queries.
- Expected core tables and schema count present.

## Gate 5 - Document Drill Result

Record:

- Date and time.
- Backup timestamp.
- Restore target.
- Restore validator result.
- Integrity result.
- Diagnostics result.
- Any errors and follow-up actions.

Public repo note may say:

- Restore drill passed or failed.
- Date.
- Non-secret counts.
- Follow-up tasks.

Never include full database URLs, passwords, or Render internal credentials.

## Pass Criteria

The restore drill passes only if:

- Backup can be restored into throwaway PostgreSQL.
- Restore validator returns `ok: true`.
- Integrity returns `fails: 0`.
- Diagnostics are clean.
- Production remains unchanged and healthy.

