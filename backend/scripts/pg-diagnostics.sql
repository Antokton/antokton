-- backend/scripts/pg-diagnostics.sql
--
-- Read-only diagnostic probes for the staging PostgreSQL database.
-- Run via:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/scripts/pg-diagnostics.sql
--
-- Designed to be safe on production too (no writes, no locks beyond what
-- a SELECT acquires). Output goes to stdout — pipe into a file to keep it.

\timing on
\set QUIET on
\pset null '<null>'

\echo '================================================================'
\echo ' Antokton PostgreSQL diagnostics'
\echo '================================================================'

-- ---------- 1. Version & basic facts ----------
\echo
\echo '--- Server version & uptime ---'
SELECT version();
SELECT
  pg_postmaster_start_time() AS started_at,
  now() - pg_postmaster_start_time() AS uptime,
  current_setting('max_connections') AS max_connections,
  current_setting('shared_buffers') AS shared_buffers,
  current_setting('work_mem') AS work_mem,
  current_setting('effective_cache_size') AS effective_cache_size;

-- ---------- 2. Database size ----------
\echo
\echo '--- Database size ---'
SELECT
  current_database() AS db,
  pg_size_pretty(pg_database_size(current_database())) AS size;

-- ---------- 3. Connection / pool state ----------
\echo
\echo '--- Connections by state ---'
SELECT
  state,
  COUNT(*)            AS conns,
  COUNT(*) FILTER (WHERE wait_event_type = 'Lock')   AS waiting_on_lock,
  MAX(now() - state_change)                          AS longest_in_state
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY state
ORDER BY conns DESC;

\echo
\echo '--- Connections by application_name ---'
SELECT
  COALESCE(application_name, '<none>') AS application,
  COUNT(*)                              AS conns,
  COUNT(*) FILTER (WHERE state = 'active')           AS active,
  COUNT(*) FILTER (WHERE state = 'idle')             AS idle,
  COUNT(*) FILTER (WHERE state = 'idle in transaction') AS idle_in_txn
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY application_name
ORDER BY conns DESC;

\echo
\echo '--- Long-running queries (>30s) ---'
SELECT
  pid, usename, application_name, state,
  now() - xact_start  AS xact_age,
  now() - query_start AS query_age,
  LEFT(query, 200)    AS query
FROM pg_stat_activity
WHERE datname = current_database()
  AND state <> 'idle'
  AND now() - query_start > interval '30 seconds'
ORDER BY query_age DESC NULLS LAST
LIMIT 20;

\echo
\echo '--- Idle in transaction (>60s) ---'
SELECT
  pid, usename, application_name,
  now() - state_change AS idle_age,
  LEFT(query, 200)     AS last_query
FROM pg_stat_activity
WHERE datname = current_database()
  AND state = 'idle in transaction'
  AND now() - state_change > interval '60 seconds'
ORDER BY idle_age DESC
LIMIT 20;

-- ---------- 4. Slow queries (pg_stat_statements if available) ----------
\echo
\echo '--- Top 20 by total time (requires pg_stat_statements) ---'
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements') THEN
    RAISE NOTICE 'pg_stat_statements is installed';
  ELSE
    RAISE NOTICE 'pg_stat_statements NOT installed -- run: CREATE EXTENSION pg_stat_statements;';
  END IF;
END $$;

-- Will error harmlessly if extension is missing; that's fine.
SELECT
  ROUND(total_exec_time::numeric, 1)        AS total_ms,
  calls,
  ROUND(mean_exec_time::numeric, 2)         AS mean_ms,
  ROUND((100 * total_exec_time / NULLIF(SUM(total_exec_time) OVER (), 0))::numeric, 1)
                                            AS pct_total,
  LEFT(query, 200)                          AS query
FROM pg_stat_statements
WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
ORDER BY total_exec_time DESC
LIMIT 20
;

-- ---------- 5. Cache hit ratio ----------
\echo
\echo '--- Cache hit ratio (>=99% is healthy) ---'
SELECT
  ROUND(SUM(heap_blks_hit)::numeric * 100 / NULLIF(SUM(heap_blks_hit + heap_blks_read), 0), 2) AS table_cache_pct,
  ROUND(SUM(idx_blks_hit)::numeric  * 100 / NULLIF(SUM(idx_blks_hit  + idx_blks_read),  0), 2) AS index_cache_pct
FROM pg_statio_user_tables;

-- ---------- 6. Table sizes ----------
\echo
\echo '--- Top 20 tables by total size ---'
SELECT
  schemaname || '.' || relname             AS table,
  pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
  pg_size_pretty(pg_relation_size(relid))       AS heap_size,
  pg_size_pretty(pg_indexes_size(relid))        AS indexes_size,
  n_live_tup                                AS live_rows,
  n_dead_tup                                AS dead_rows,
  ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 1) AS dead_pct
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 20;

-- ---------- 7. Index usage ----------
\echo
\echo '--- Indexes: never-used (skip during first hour of traffic) ---'
SELECT
  schemaname || '.' || relname AS table,
  indexrelname                 AS index,
  pg_size_pretty(pg_relation_size(indexrelid)) AS size,
  idx_scan                     AS scans
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 30;

\echo
\echo '--- Tables likely to need an index (high seq_scan, low idx_scan) ---'
SELECT
  schemaname || '.' || relname AS table,
  seq_scan,
  idx_scan,
  ROUND(100.0 * seq_scan / NULLIF(seq_scan + idx_scan, 0), 1) AS seq_pct,
  n_live_tup AS rows
FROM pg_stat_user_tables
WHERE n_live_tup > 1000
ORDER BY seq_scan DESC
LIMIT 20;

-- ---------- 8. Lock contention ----------
\echo
\echo '--- Blocked queries waiting on locks ---'
SELECT
  blocked_locks.pid     AS blocked_pid,
  blocked_activity.usename AS blocked_user,
  LEFT(blocked_activity.query, 120) AS blocked_query,
  blocking_locks.pid    AS blocking_pid,
  blocking_activity.usename AS blocking_user,
  LEFT(blocking_activity.query, 120) AS blocking_query,
  now() - blocked_activity.query_start AS blocked_age
FROM pg_locks blocked_locks
JOIN pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_locks blocking_locks
  ON blocking_locks.locktype = blocked_locks.locktype
 AND blocking_locks.database  IS NOT DISTINCT FROM blocked_locks.database
 AND blocking_locks.relation  IS NOT DISTINCT FROM blocked_locks.relation
 AND blocking_locks.page      IS NOT DISTINCT FROM blocked_locks.page
 AND blocking_locks.tuple     IS NOT DISTINCT FROM blocked_locks.tuple
 AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
 AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
 AND blocking_locks.classid   IS NOT DISTINCT FROM blocked_locks.classid
 AND blocking_locks.objid     IS NOT DISTINCT FROM blocked_locks.objid
 AND blocking_locks.objsubid  IS NOT DISTINCT FROM blocked_locks.objsubid
 AND blocking_locks.pid       <> blocked_locks.pid
JOIN pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted
LIMIT 20;

-- ---------- 9. Replication lag (if any standby attached) ----------
\echo
\echo '--- Replication lag ---'
SELECT
  application_name,
  client_addr,
  state,
  sync_state,
  pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS lag_bytes,
  write_lag, flush_lag, replay_lag
FROM pg_stat_replication;

-- ---------- 10. Autovacuum activity ----------
\echo
\echo '--- Recent autovacuum activity ---'
SELECT
  schemaname || '.' || relname AS table,
  last_vacuum, last_autovacuum,
  last_analyze, last_autoanalyze,
  vacuum_count, autovacuum_count
FROM pg_stat_user_tables
ORDER BY GREATEST(
  COALESCE(last_autovacuum, '1970-01-01'),
  COALESCE(last_vacuum, '1970-01-01')
) DESC
LIMIT 20;

\echo
\echo '--- diagnostics complete ---'
