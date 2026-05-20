# Production PostgreSQL Rollout

This document describes how to move the Antokton API from its existing
SQLite-backed production deployment onto a managed PostgreSQL instance on
Render with no user-visible downtime, a tested rollback path, and a clear
operational baseline for scaling toward 100k+ users.

It assumes the staging cutover is already complete and verified
(`https://antokton-pg-staging.onrender.com/health` returns `dbMode=postgres`)
and that the supporting scripts ship in this same commit:

- `backend/migrate-sqlite-to-postgres.js`
- `backend/scripts/verify-postgres-integrity.js`
- `backend/scripts/smoke-test.js`

---

## 1. Pre-flight checklist

Run through this list the day before cutover. Do not start the cutover
window until every item is green.

1. Staging is on PostgreSQL and has passed the smoke test against the live
   staging URL for at least 48 hours.
2. `verify-postgres-integrity.js` against staging reports zero `FAIL` items.
3. Render production service has a Postgres add-on provisioned in the same
   region as the web service. Use at least the **Standard-2** plan (2 vCPU,
   4 GB RAM, 256 GB storage) for a launch supporting up to ~100k users; see
   §8 for the scaling table.
4. The Postgres add-on's `DATABASE_URL`, `PGSSLMODE=require`, and a separate
   read-only role (`antokton_ro`) are stored as Render environment groups.
5. The application image has been built from the same commit as staging.
6. A SQLite snapshot of production (`production-pre-pg.db`) has been taken
   AND uploaded to object storage. Keep at least two snapshots: one at
   T-24h and one taken inside the maintenance window with the writer
   blocked.
7. The on-call engineer has acknowledged the rollout window in the
   incident-management tool and has the rollback runbook (§4) open.
8. A status page entry is drafted (not yet published) saying "brief
   maintenance" with the planned start and end timestamps.

---

## 2. Zero-downtime strategy

The runtime supports two database modes selected by `DB_MODE` (`sqlite` or
`postgres`). That switch is the foundation of the cutover; the rest of the
strategy is about making the data on the new side correct at the moment
the switch flips.

### 2a. Recommended path: short freeze + cutover (~10 minutes user-visible)

Best when you have one writer service. Predictable and easy to roll back.

1. **T-30m: Pre-copy.** Run `migrate-sqlite-to-postgres.js --dry-run`
   against the live SQLite file. Confirm row counts match expectations.
2. **T-15m: Warm pool.** Render scale the service up by one instance so
   there is spare capacity during the switch.
3. **T-5m: Drain writes.** Set the application's `READ_ONLY=true` flag.
   Every write endpoint should return `503 Service Unavailable` with a
   `Retry-After: 60` header. Reads continue to be served by SQLite.
4. **T-0:**
   - Take a final SQLite snapshot.
   - Run `migrate-sqlite-to-postgres.js --sqlite ./prod.db --pg
     $DATABASE_URL --truncate --confirm` against the production Postgres.
     Wait for completion.
   - Run `verify-postgres-integrity.js --sqlite ./prod.db --pg
     $DATABASE_URL`. Abort and roll back if any `FAIL` appears.
5. **T+5m: Flip.** In Render, change `DB_MODE=postgres` and unset
   `READ_ONLY`. Trigger a manual deploy (no code change, env-only). Render
   does a rolling restart; because writes were already drained the
   restart is a no-op for users.
6. **T+10m: Smoke + verify.** Run `smoke-test.js --base
   https://api.antokton.com` and re-run integrity verification. Publish
   the status page resolution.

### 2b. Optional path: dual-write (no user-visible read-only window)

Only attempt this if a 10-minute read-only window is not acceptable. It is
strictly more complex and should not be used for the first cutover.

1. Deploy a build that writes every mutation to both SQLite and Postgres
   inside the same request handler. SQLite is still the read source.
2. Backfill old rows with `migrate-sqlite-to-postgres.js` while dual-write
   is on. The migration's `ON CONFLICT (id) DO NOTHING` makes the backfill
   safe against rows the application has already double-written.
3. Run `verify-postgres-integrity.js` continuously until it reports zero
   drift on three consecutive runs.
4. Switch reads to Postgres (`DB_MODE=postgres`) but keep writing both.
5. After 24 hours of clean error budgets, deploy a build that stops
   writing SQLite. Keep the SQLite file on disk for one full retention
   window before deleting it.

---

## 3. Backup strategy

Backups are required both for rollback (§4) and for long-term DR.

- **Render managed backups.** Enable daily automated backups on the
  Postgres add-on with 30-day retention. These are point-in-time
  snapshots; you can also restore to any second in the last 7 days.
- **Logical backups.** A nightly cron runs
  `pg_dump --format=custom --no-owner --no-privileges $DATABASE_URL >
  antokton-$(date -u +%F).dump` and uploads to S3-compatible storage in a
  different region. Keep 14 daily, 8 weekly, 12 monthly. Encrypt at rest
  with SSE-KMS.
- **SQLite snapshot.** Retain the final SQLite snapshot
  (`production-pre-pg.db`) for 90 days. It is the source of truth for any
  rollback or post-hoc audit of data preserved across the migration.
- **Backup verification.** Once a week, restore the latest `pg_dump` into
  a throwaway database and run `verify-postgres-integrity.js` against
  the SQLite snapshot to confirm the dump is loadable and consistent.

---

## 4. Rollback plan

The migration is rollbackable for as long as the SQLite file is intact and
the application image supporting `DB_MODE=sqlite` is still available
(should be kept for at least 30 days post-cutover).

### Fast rollback (≤5 minutes; data written since cutover is lost)

Use when something is observably broken in the first hour after cutover
and the volume of writes accepted by Postgres is small or non-critical.

1. Set `READ_ONLY=true` in Render. Wait for in-flight requests to drain.
2. Set `DB_MODE=sqlite`. Trigger a rolling deploy.
3. Unset `READ_ONLY`. Run `smoke-test.js`.
4. File an incident; review what was lost from the Postgres writes via the
   rollback log produced by the migration script.

### Reconciled rollback (data preservation)

Use when too much new data has been written to Postgres to discard.

1. Set `READ_ONLY=true` and let writes drain.
2. Run a reverse migration: a one-shot script that selects all rows
   written *after* the cutover timestamp from Postgres (filter by
   `created_at >= $cutoverTs OR updated_at >= $cutoverTs`) and INSERTs
   them into the SQLite snapshot, preserving IDs.
3. Run `verify-postgres-integrity.js` with `--sqlite` pointing at the
   reconciled SQLite and `--pg` pointing at Postgres. Expect zero
   `FAIL`.
4. Promote the reconciled SQLite file, set `DB_MODE=sqlite`, deploy,
   unset `READ_ONLY`.

### Rollback of partial / failed migration

If `migrate-sqlite-to-postgres.js` was interrupted, run it again with
`--rollback <log>` and `--confirm` pointing at the rollback log it wrote.
This deletes precisely the rows it inserted and leaves rows that were
present in Postgres beforehand untouched.

---

## 5. Render production migration steps

Concrete, copy-pasteable. Run from the Render dashboard plus a local
shell with `$DATABASE_URL` exported (use the production add-on's
connection string — internal URL when run from a Render shell, external
URL when run from a laptop).

```bash
# 0. Snapshot SQLite (run in a shell on the production web service)
cp /var/data/production.db /var/data/production-pre-pg-$(date -u +%FT%H%MZ).db

# 1. Dry-run migration
node backend/migrate-sqlite-to-postgres.js \
  --sqlite /var/data/production.db \
  --pg "$DATABASE_URL" \
  --dry-run

# 2. Flip writes off
#    (Set READ_ONLY=true via Render env vars, redeploy)

# 3. Final snapshot under read-only conditions
cp /var/data/production.db /var/data/production-final.db

# 4. Live migration with rollback log
node backend/migrate-sqlite-to-postgres.js \
  --sqlite /var/data/production-final.db \
  --pg "$DATABASE_URL" \
  --truncate \
  --rollback-log /var/data/migration-rollback.jsonl \
  --confirm

# 5. Verify
node backend/scripts/verify-postgres-integrity.js \
  --sqlite /var/data/production-final.db \
  --pg "$DATABASE_URL" \
  --json /var/data/verify-report.json

# 6. Flip DB_MODE=postgres, unset READ_ONLY, redeploy

# 7. Smoke test the public URL
node backend/scripts/smoke-test.js \
  --base https://api.antokton.com \
  --json /var/data/smoke-post-cutover.json
```

Persist `migration-rollback.jsonl`, `verify-report.json`, and
`smoke-post-cutover.json` as run artifacts — they're the evidence that
the cutover was clean.

---

## 6. Monitoring checks

Configure these before flipping the switch. None of them should be added
in the same window as the cutover itself.

| Signal | Alert condition | Where |
| --- | --- | --- |
| `/health` returns non-2xx for >60s | Page on-call | Render health check + UptimeRobot |
| `dbMode` field in `/health` ≠ `postgres` post-cutover | Page on-call | Synthetic check every 60s |
| p95 response time > 500ms for 5 min | Warn in Slack | APM (Datadog / Grafana Cloud) |
| Postgres connection errors > 0 per minute | Page on-call | App logs → metric |
| `pg_stat_activity` long-running queries > 30s | Warn | Datadog Postgres integration |
| Connection pool saturation > 80% for 5 min | Warn | App metric (`pg.pool.in_use / pg.pool.size`) |
| Replication lag (if read replicas added later) > 5s | Warn | Render dashboard |
| Disk usage > 80% on Postgres add-on | Warn at 80%, page at 90% | Render |

Application-level: emit a structured log line containing the database
mode on every request handler bootstrap so a log search of the form
`dbMode=sqlite` returns zero after the cutover window closes.

---

## 7. Performance optimizations applied at rollout

The optimization patch that lands in the same change set introduces:

- Indexes on every foreign-key column, every column used in a `WHERE` or
  `ORDER BY` of the API (notably `users.email`, `sessions.token`,
  `sessions.user_id`, `sessions.expires_at`, `entities.user_id`,
  `entities.updated_at`).
- A composite index on `(user_id, created_at DESC)` for the most common
  paginated list endpoint.
- A connection pool capped at 20 connections per app instance with
  `idleTimeoutMillis: 30_000` and `statement_timeout: '30s'` set
  server-side.
- Cursor-based pagination on every list endpoint, with a hard cap of 100
  items per page and a deterministic tiebreaker on the primary key.
- Eager loading helpers (`include`-style joins) on the relationship
  endpoints to eliminate N+1 patterns; see §7 of
  `backend/db/postgres.js` and the `loadEntitiesWithOwners` helper.

See the companion file `POSTGRES_OPTIMIZATIONS.md` for the full DDL and
configuration block that should ship in a separate commit.

---

## 8. Scaling recommendations for 100k+ users

Capacity numbers below assume a workload of roughly 5 requests per active
user per day with a 5:1 read:write ratio. Adjust for your actual traffic
mix.

| Users | App instances | Postgres plan | Connection pool / instance | Read replicas |
| --- | --- | --- | --- | --- |
| <10k | 2 | Starter (1 vCPU, 1 GB, 25 conns) | 8 | 0 |
| 10k–50k | 3 | Standard (2 vCPU, 4 GB, 100 conns) | 15 | 0 |
| 50k–100k | 4–6 | Standard-2 (4 vCPU, 8 GB, 200 conns) | 20 | 1 (analytics) |
| 100k–500k | 8+ autoscale | Pro (8 vCPU, 16 GB, 400 conns) | 25 | 1 read + 1 analytics |
| >500k | Autoscale, multi-AZ | Pro+ (16 vCPU, 32 GB) + PgBouncer in front | session-mode pooler, 50 conns | 2+ read replicas |

Key thresholds to watch as you grow:

- Connection pool size × app instances must stay below `(max_connections
  - 20)` on the Postgres side. The `-20` reserves headroom for ad-hoc
  admin sessions and `pg_dump`.
- Introduce **PgBouncer** in transaction-pooling mode *before* you cross
  the 200-connection mark, not after. Configure the application to use
  session pooling only for endpoints that need prepared statements.
- Add a **read replica** when read traffic exceeds 70% of total query
  volume. Route only idempotent `GET` requests to the replica; never
  route reads inside an active write transaction to the replica.
- Move long-running reports (admin metrics, exports) to the analytics
  replica behind a separate `DATABASE_URL_RO` to keep the primary's
  buffer cache hot for transactional queries.
- Vacuum/autovacuum tuning becomes necessary above ~50 GB; raise
  `autovacuum_vacuum_scale_factor` to 0.05 for hot tables and add
  weekly `VACUUM ANALYZE` of the `sessions` table (high churn).

---

## 9. Post-rollout follow-ups

- Remove the dual-mode SQLite code paths after 30 clean days on
  PostgreSQL. Keep the migration scripts in the repo as historical
  tooling.
- Add a CI job that runs `smoke-test.js` against staging on every
  merge to `main`.
- Schedule the weekly backup-restore verification (§3) in cron.
- Open a follow-up ticket to evaluate moving session storage out of
  Postgres and into Redis once writes/sec on `sessions` exceeds 100.

---

## 10. Sign-off

| Role | Name | Date | Signature |
| --- | --- | --- | --- |
| Engineering lead | | | |
| On-call SRE | | | |
| Product owner | | | |
| Security review | | | |
