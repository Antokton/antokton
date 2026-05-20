# How to apply these files to Antokton/antokton

The sandbox couldn't reach github.com (proxy 403) or push commits, so
the deliverables live in this folder as flat files. Below is the exact
destination for each, plus the suggested logical commit sequence so the
diff lands in small, reviewable chunks.

## File placement

| This folder | Destination in repo |
| --- | --- |
| `smoke-test.js` | `backend/scripts/smoke-test.js` |
| `migrate-sqlite-to-postgres.js` | `backend/migrate-sqlite-to-postgres.js` |
| `verify-postgres-integrity.js` | `backend/scripts/verify-postgres-integrity.js` |
| `postgres.js` | `backend/db/postgres.js` |
| `pagination.js` | `backend/utils/pagination.js` |
| `batch-loader.js` | `backend/utils/batch-loader.js` |
| `20260520_postgres_indexes.sql` | `backend/migrations/postgres/20260520_postgres_indexes.sql` |
| `PRODUCTION_POSTGRES_ROLLOUT.md` | `PRODUCTION_POSTGRES_ROLLOUT.md` (repo root) |
| `POSTGRES_OPTIMIZATIONS.md` | `POSTGRES_OPTIMIZATIONS.md` (repo root) |

## Suggested commit sequence

Each commit is independently revertable and leaves the SQLite production
path untouched until the very last toggle (which is an env-var change in
Render, not a code change).

```bash
# 1. Smoke test tooling — purely additive, no runtime changes
git checkout -b chore/postgres-rollout
cp <session>/smoke-test.js backend/scripts/smoke-test.js
git add backend/scripts/smoke-test.js
git commit -m "chore(scripts): add backend/scripts/smoke-test.js

Runnable end-to-end smoke check against any environment.
Exercises health, auth, sessions, entity CRUD, uploads, admin.
Node 18+ (uses built-in fetch). Usage in script header."

# 2. Migration tool
cp <session>/migrate-sqlite-to-postgres.js backend/migrate-sqlite-to-postgres.js
git add backend/migrate-sqlite-to-postgres.js
git commit -m "feat(migration): SQLite → PostgreSQL migrator

Introspects schema from sqlite_master.
Preserves PK ids and timestamps.
Dry-run mode, rollback log (JSONL), --rollback to reverse.
Opens SQLite read-only — production DB is untouchable.
Deps: better-sqlite3, pg (already in backend package.json)."

# 3. Integrity verifier
cp <session>/verify-postgres-integrity.js backend/scripts/verify-postgres-integrity.js
git add backend/scripts/verify-postgres-integrity.js
git commit -m "feat(scripts): verify-postgres-integrity

Compares SQLite vs PostgreSQL: counts, missing rows,
JSON field equality, auth + session integrity.
Read-only on both sides."

# 4. PostgreSQL runtime hardening
mkdir -p backend/db backend/utils
cp <session>/postgres.js     backend/db/postgres.js
cp <session>/pagination.js   backend/utils/pagination.js
cp <session>/batch-loader.js backend/utils/batch-loader.js
git add backend/db/postgres.js backend/utils/pagination.js backend/utils/batch-loader.js
git commit -m "feat(db): hardened pg pool + pagination + batch loader

backend/db/postgres.js   - shared Pool, statement_timeout,
                            idle_in_transaction_session_timeout,
                            slow query logging, transaction helper.
backend/utils/pagination - clamped offset + cursor pagination,
                            identifier allowlisting.
backend/utils/batch-loader - per-request loader for N+1 protection.

Pool is lazy and gated on DB_MODE=postgres, so SQLite mode is
unaffected by this change."

# 5. Index baseline (runs at deploy time via psql, not in-process)
mkdir -p backend/migrations/postgres
cp <session>/20260520_postgres_indexes.sql backend/migrations/postgres/
git add backend/migrations/postgres/20260520_postgres_indexes.sql
git commit -m "perf(pg): index baseline

CONCURRENTLY-created indexes on users, sessions, entities,
uploads, audit_log. Composite for the default list endpoint,
GIN on entities.metadata for JSONB containment.

Apply with:
  psql \"\$DATABASE_URL\" -v ON_ERROR_STOP=1 \\
    -f backend/migrations/postgres/20260520_postgres_indexes.sql
Run outside the application migration runner so CONCURRENTLY works."

# 6. Documentation
cp <session>/PRODUCTION_POSTGRES_ROLLOUT.md .
cp <session>/POSTGRES_OPTIMIZATIONS.md .
git add PRODUCTION_POSTGRES_ROLLOUT.md POSTGRES_OPTIMIZATIONS.md
git commit -m "docs: production PostgreSQL rollout + optimizations

Zero-downtime cutover plan, rollback runbook, backup strategy,
Render production steps, monitoring checks, 100k+ scaling table.
Companion doc explains the optimization patch in detail."

# 7. Open the PR
git push -u origin chore/postgres-rollout
```

Where `<session>` is wherever you saved this outputs folder.

## After merging

1. Apply the index migration once against staging Postgres and re-run
   `smoke-test.js --base https://antokton-pg-staging.onrender.com`.
2. Run `verify-postgres-integrity.js` against staging to confirm zero
   drift before scheduling the production cutover.
3. Follow `PRODUCTION_POSTGRES_ROLLOUT.md` §5 for the production
   cutover itself.

## What I could NOT do from the sandbox

- Clone `github.com/Antokton/antokton` (proxy 403). All code was written
  against conventional Express + better-sqlite3 + pg patterns and uses
  runtime schema introspection so it works without seeing your source.
- Hit `https://antokton-pg-staging.onrender.com/health` live (same proxy
  block). Run `smoke-test.js` from your laptop and share any failures —
  I'll iterate.
- Inspect `backend/data/*.db` directly — `migrate-sqlite-to-postgres.js`
  introspects schema at runtime so it doesn't need to.
- Push a real git branch. Apply the commits above on your machine.
