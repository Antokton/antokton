# Database Schema Freeze

Status: active until PostgreSQL production cutover is complete and the 24h monitoring window is green.

## Scope

Frozen files and behavior:

- `backend/db.js`
- `backend/db-sqlite.js`
- `backend/db-postgres.js`
- `backend/schema.sql`
- `backend/migrations/postgres/*`
- `backend/migrate-sqlite-to-postgres.js`
- `backend/scripts/verify-postgres-integrity.js`
- Entity schema changes under `antokton-export/**/entities`

## Allowed During Freeze

- Read-only diagnostics.
- Documentation updates for cutover, rollback, and monitoring.
- Validation script fixes that do not change table shape or production runtime behavior.
- Emergency fixes required to keep SQLite production healthy.

## Not Allowed During Freeze

- New tables, columns, indexes, triggers, or constraints.
- Data model redesign.
- Frontend feature work that requires new backend persistence.
- Production database provider switch.
- Render production environment changes without a recorded GO decision.

## Exit Criteria

- Staging migration rehearsal completed with rollback log.
- Integrity verifier reports `fails: 0` on staging immediately after migration.
- PostgreSQL diagnostics show no long-running queries, blocked queries, or idle-in-transaction sessions.
- Smoke test passes after integrity verification.
- Backup restore drill completed.
- Production cutover GO decision recorded.
