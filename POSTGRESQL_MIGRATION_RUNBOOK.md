# Antokton PostgreSQL Migration Runbook

Date: 2026-05-19

Scope: prepare and test PostgreSQL migration/runtime safely. Do not switch the live Antokton web service yet.

## Current Safety Position

- Production remains on SQLite unless `DATABASE_PROVIDER=postgres` is explicitly set.
- Keep `DATABASE_PROVIDER=sqlite` on Render for now.
- `DATABASE_URL` may be used by the migration script and staging runtime, but should not be added to the live web service until the switch criteria below pass.
- SQLite remains the default runtime. PostgreSQL is enabled only when `DATABASE_PROVIDER=postgres`.

## Files Added For PostgreSQL Preparation

- PostgreSQL schema: `backend/postgres/schema.sql`
- SQLite to PostgreSQL migration script: `backend/scripts/migrate-sqlite-to-postgres.js`
- Root helper scripts/dependency manifest: `package.json`
- Runtime adapter: `backend/db.js` exposes the same `statements.*.run/get/all` shape for PostgreSQL.

## Render PostgreSQL Creation

1. In Render, open the Antokton project.
2. Create a new PostgreSQL database in the same region as the `antokton` web service.
3. Name it clearly, for example `antokton-postgres-beta`.
4. Keep it private/internal to Render when possible.
5. Copy the database connection string only into a private secret manager or temporary shell variable. Do not paste it into Git, docs, screenshots, or chat.

## Required Backup Before Migration

Before any migration attempt, create a fresh backup using `BACKUP_AND_RECOVERY.md`.

Minimum backup items:

- `/data/antokton.sqlite`
- `/data/antokton.sqlite-wal` if present
- `/data/antokton.sqlite-shm` if present
- `/data/uploads`

Keep at least one copy outside Render before importing to PostgreSQL.

## Dry Run From Render Shell

Use Render Shell or a one-off job so the script can read the live SQLite file on the persistent disk.

```bash
cd /opt/render/project/src
npm install --omit=dev --ignore-scripts
export DB_PATH=/data/antokton.sqlite
export DATABASE_PROVIDER=sqlite
export DATABASE_URL="<Render PostgreSQL connection string>"
npm run db:migrate:postgres:dry-run
```

Expected result:

- Prints source SQLite row counts.
- Does not write to PostgreSQL.
- Does not expose `DATABASE_URL`.

## Import Into Empty PostgreSQL

Run only after the backup is complete and the PostgreSQL target is empty.

```bash
cd /opt/render/project/src
npm install --omit=dev --ignore-scripts
export DB_PATH=/data/antokton.sqlite
export DATABASE_PROVIDER=sqlite
export DATABASE_URL="<Render PostgreSQL connection string>"
npm run db:migrate:postgres
```

The script will:

- Create missing PostgreSQL tables from `backend/postgres/schema.sql`.
- Check all target tables.
- Refuse to continue if any target table already contains rows.
- Copy rows from SQLite to PostgreSQL inside a transaction.
- Roll back if any insert fails.

## Staging Runtime Smoke Test

Run this only against a staging PostgreSQL database after migration succeeds. Do not run it against the live web service yet.

```bash
cd /opt/render/project/src
npm install --omit=dev --ignore-scripts
export NODE_ENV=production
export APP_ID=6991d40eddf82cc25ec834a7
export DATABASE_PROVIDER=postgres
export DATABASE_URL="<Render PostgreSQL connection string>"
export UPLOAD_DIR=/data/uploads
export SESSION_COOKIE_SECURE=true
node backend/server.js
```

Smoke test from another shell:

```bash
BASE_URL="https://<staging-service-url>"
APP_ID="6991d40eddf82cc25ec834a7"

curl -fsS "$BASE_URL/health"
curl -fsS "$BASE_URL/health/config"
curl -fsS "$BASE_URL/api/apps/$APP_ID/entities/User"
curl -fsS "$BASE_URL/api/apps/$APP_ID/entities/User/me" \
  -H "Authorization: Bearer <staging-session-token>"
curl -fsS "$BASE_URL/api/apps/$APP_ID/auth/login" \
  -H "Content-Type: application/json" \
  --data '{"email":"<staging-admin-email>","password":"<staging-admin-password>"}'
```

Do not paste real tokens or passwords into docs, screenshots, or chat.

## Tables Migrated

- `entity_records`
- `uploaded_files`
- `email_logs`
- `function_logs`
- `entity_schemas`
- `auth_accounts`
- `auth_sessions`
- `auth_audit_logs`

## What Is Not Migrated By This Script

- Upload file bytes from `/data/uploads`; keep using the existing backup/restore process for uploads until object storage migration.
- Render environment variables.
- Runtime switch from SQLite to PostgreSQL.
- Any normalized future table design.

## Production Switch Criteria

Do not switch the live `antokton` Render web service until all criteria pass:

1. A fresh SQLite and uploads backup exists outside Render.
2. PostgreSQL migration completed into an empty target and row counts match the migration report.
3. A separate staging web service runs with `DATABASE_PROVIDER=postgres`.
4. The staging/production build command installs root backend dependencies so the `pg` driver is present, for example:

```bash
npm ci --omit=dev --ignore-scripts && npm --prefix antokton-export ci && npm --prefix antokton-export run build
```

5. Staging passes:
   - `/health`
   - `/health/config`
   - `/api/apps/{APP_ID}/entities/User/me`
   - listing at least `User`, `Job`, `Event`, `Status`, `Notification`
   - login/register/logout
   - admin login and admin-only checks
   - core pages: `/Home`, `/Profile`, `/Statuset`, `/Events`, `/Pazar`, `/AkademiaAdmin`
6. Existing uploads still render from `/uploads/...`.
7. Auth cookies work after browser refresh.
8. Rollback plan is documented: set `DATABASE_PROVIDER=sqlite`, remove/ignore `DATABASE_URL`, and restart the service.
9. No production errors appear in Render logs during staging smoke tests.

## Do Not Switch Live Yet

Do not set these on the live Render web service yet:

```text
DATABASE_PROVIDER=postgres
DATABASE_URL=<real value>
```

The PostgreSQL runtime adapter now exists, but it must pass staging tests before production can safely switch.

## Future Switch Checklist

Before switching production:

1. Run all API smoke tests against PostgreSQL in staging.
2. Verify login, register, `/User/me`, uploads metadata, entity listing, create/update/delete, admin flows, Akademia flows, statuses, events, marketplace and profile pages.
3. Confirm backups and restore for PostgreSQL.
4. Only then set `DATABASE_PROVIDER=postgres` and `DATABASE_URL` on the live Render service.
