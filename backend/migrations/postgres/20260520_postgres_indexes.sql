-- backend/migrations/postgres/20260520_postgres_indexes.sql
--
-- PostgreSQL index baseline for Antokton.
--
-- Run-once migration. Every index is created with IF NOT EXISTS, so the
-- migration is safe to re-run. Index creation uses CONCURRENTLY so it does
-- not take an ACCESS EXCLUSIVE lock on the table; this matters in
-- production where the table cannot be blocked.
--
-- CONCURRENTLY requires that each statement run OUTSIDE a transaction.
-- If your migration runner wraps statements in a transaction by default
-- (knex's default does), drop CONCURRENTLY or run this file via psql:
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f 20260520_postgres_indexes.sql

-- ---------- users ----------------------------------------------------------

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS users_email_lower_uq
  ON users (LOWER(email));

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS users_username_lower_uq
  ON users (LOWER(username));

CREATE INDEX CONCURRENTLY IF NOT EXISTS users_created_at_idx
  ON users (created_at DESC);

-- Speeds up the admin "list locked / disabled users" view without scanning
-- the full table. Partial index keeps it tiny.
CREATE INDEX CONCURRENTLY IF NOT EXISTS users_disabled_idx
  ON users (id)
  WHERE disabled_at IS NOT NULL;

-- ---------- sessions -------------------------------------------------------

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS sessions_token_uq
  ON sessions (token);

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS sessions_refresh_token_uq
  ON sessions (refresh_token)
  WHERE refresh_token IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS sessions_user_id_idx
  ON sessions (user_id);

-- Cron job that prunes expired sessions hits this index, not the table.
CREATE INDEX CONCURRENTLY IF NOT EXISTS sessions_expires_at_idx
  ON sessions (expires_at)
  WHERE revoked_at IS NULL;

-- Composite: list-by-user paginated by expiry (most-recent first).
CREATE INDEX CONCURRENTLY IF NOT EXISTS sessions_user_expires_idx
  ON sessions (user_id, expires_at DESC);

-- ---------- entities (the core CRUD table) --------------------------------

CREATE INDEX CONCURRENTLY IF NOT EXISTS entities_user_id_idx
  ON entities (user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS entities_updated_at_idx
  ON entities (updated_at DESC);

-- Composite for the default "my entities, newest first" feed.
CREATE INDEX CONCURRENTLY IF NOT EXISTS entities_user_updated_idx
  ON entities (user_id, updated_at DESC, id DESC);

-- If entities has a `type` enum that gets filtered:
CREATE INDEX CONCURRENTLY IF NOT EXISTS entities_user_type_idx
  ON entities (user_id, type)
  WHERE type IS NOT NULL;

-- If entities has a JSONB metadata column, add a GIN index to support
-- @> containment queries. Use jsonb_path_ops for smaller, faster indexes
-- when only containment is used.
CREATE INDEX CONCURRENTLY IF NOT EXISTS entities_metadata_gin
  ON entities USING GIN (metadata jsonb_path_ops);

-- ---------- uploads --------------------------------------------------------

CREATE INDEX CONCURRENTLY IF NOT EXISTS uploads_user_id_idx
  ON uploads (user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS uploads_created_at_idx
  ON uploads (created_at DESC);

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uploads_storage_key_uq
  ON uploads (storage_key);

-- ---------- audit / admin queries -----------------------------------------

CREATE INDEX CONCURRENTLY IF NOT EXISTS audit_log_actor_idx
  ON audit_log (actor_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS audit_log_target_idx
  ON audit_log (target_type, target_id, created_at DESC);

-- ---------- statistics -----------------------------------------------------

ANALYZE users;
ANALYZE sessions;
ANALYZE entities;
ANALYZE uploads;

-- NOTE: Statements referencing tables/columns that don't exist will fail
-- cleanly thanks to ON_ERROR_STOP=1. Delete the irrelevant statements
-- before running rather than guessing — the JSONB and audit tables in
-- particular may not exist in your schema. Run `\d+ <table>` first.
