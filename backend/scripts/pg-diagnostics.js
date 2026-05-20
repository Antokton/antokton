#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Read-only PostgreSQL diagnostics for staging validation.
 *
 * This is intentionally Node-based so Render SSL connections work on Windows
 * machines where the local psql client may be too old for the server TLS policy.
 */

'use strict';

let Client;
try { ({ Client } = require('pg')); } catch { /* handled below */ }

function parseArgs(argv) {
  const args = {
    pg: process.env.DATABASE_URL || process.env.STAGING_DATABASE_URL || null,
    json: null,
    timeoutMs: 30000,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => argv[++i];
    switch (arg) {
      case '--pg':
        args.pg = next();
        break;
      case '--json':
        args.json = next();
        break;
      case '--timeout':
        args.timeoutMs = Number(next());
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      default:
        console.error(`Unknown argument: ${arg}`);
        printHelp();
        process.exit(2);
    }
  }

  return args;
}

function printHelp() {
  console.log('Usage: node pg-diagnostics.js --pg "$STAGING_DATABASE_URL" [--json report.json]');
}

function requireDeps(args) {
  if (!Client) {
    console.error('Missing dependency: pg. Install with `npm install pg`.');
    process.exit(2);
  }
  if (!args.pg) {
    console.error('--pg or STAGING_DATABASE_URL/DATABASE_URL is required');
    process.exit(2);
  }
  if (!Number.isFinite(args.timeoutMs) || args.timeoutMs <= 0) {
    console.error('--timeout must be a positive number of milliseconds');
    process.exit(2);
  }
}

function pgClient(connectionString, timeoutMs) {
  const config = {
    connectionString,
    connectionTimeoutMillis: timeoutMs,
    query_timeout: timeoutMs,
    statement_timeout: timeoutMs,
  };
  if (/render\.com/i.test(connectionString) || /sslmode=require/i.test(connectionString)) {
    config.ssl = { rejectUnauthorized: false };
  }
  return new Client(config);
}

async function scalar(client, sql, params) {
  const result = await client.query(sql, params);
  return result.rows[0] || {};
}

async function rows(client, sql, params) {
  const result = await client.query(sql, params);
  return result.rows;
}

function printSection(title, value) {
  console.log(`\n--- ${title} ---`);
  if (Array.isArray(value)) {
    console.table(value);
  } else {
    console.log(value);
  }
}

async function runDiagnostics(args) {
  requireDeps(args);

  const client = pgClient(args.pg, args.timeoutMs);
  await client.connect();

  try {
    const report = {
      generatedAt: new Date().toISOString(),
      server: await scalar(client, `
        SELECT
          version() AS version,
          pg_postmaster_start_time() AS started_at,
          now() - pg_postmaster_start_time() AS uptime,
          current_setting('max_connections') AS max_connections,
          current_setting('shared_buffers') AS shared_buffers,
          current_setting('work_mem') AS work_mem,
          current_setting('effective_cache_size') AS effective_cache_size
      `),
      database: await scalar(client, `
        SELECT
          current_database() AS name,
          pg_size_pretty(pg_database_size(current_database())) AS size
      `),
      connectionsByState: await rows(client, `
        SELECT
          COALESCE(state, '<null>') AS state,
          COUNT(*)::int AS conns,
          COUNT(*) FILTER (WHERE wait_event_type = 'Lock')::int AS waiting_on_lock,
          MAX(now() - state_change)::text AS longest_in_state
        FROM pg_stat_activity
        WHERE datname = current_database()
        GROUP BY state
        ORDER BY conns DESC
      `),
      connectionsByApplication: await rows(client, `
        SELECT
          COALESCE(application_name, '<none>') AS application,
          COUNT(*)::int AS conns,
          COUNT(*) FILTER (WHERE state = 'active')::int AS active,
          COUNT(*) FILTER (WHERE state = 'idle')::int AS idle,
          COUNT(*) FILTER (WHERE state = 'idle in transaction')::int AS idle_in_txn
        FROM pg_stat_activity
        WHERE datname = current_database()
        GROUP BY application_name
        ORDER BY conns DESC
      `),
      longRunningQueries: await rows(client, `
        SELECT
          pid,
          usename,
          application_name,
          state,
          (now() - xact_start)::text AS xact_age,
          (now() - query_start)::text AS query_age,
          LEFT(query, 200) AS query
        FROM pg_stat_activity
        WHERE datname = current_database()
          AND state <> 'idle'
          AND now() - query_start > interval '30 seconds'
        ORDER BY query_age DESC NULLS LAST
        LIMIT 20
      `),
      idleInTransaction: await rows(client, `
        SELECT
          pid,
          usename,
          application_name,
          (now() - state_change)::text AS idle_age,
          LEFT(query, 200) AS last_query
        FROM pg_stat_activity
        WHERE datname = current_database()
          AND state = 'idle in transaction'
          AND now() - state_change > interval '60 seconds'
        ORDER BY idle_age DESC
        LIMIT 20
      `),
      cacheHitRatio: await scalar(client, `
        SELECT
          ROUND(SUM(heap_blks_hit)::numeric * 100 / NULLIF(SUM(heap_blks_hit + heap_blks_read), 0), 2) AS table_cache_pct,
          ROUND(SUM(idx_blks_hit)::numeric * 100 / NULLIF(SUM(idx_blks_hit + idx_blks_read), 0), 2) AS index_cache_pct
        FROM pg_statio_user_tables
      `),
      largestTables: await rows(client, `
        SELECT
          schemaname || '.' || relname AS table,
          pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
          pg_size_pretty(pg_relation_size(relid)) AS heap_size,
          pg_size_pretty(pg_indexes_size(relid)) AS indexes_size,
          n_live_tup::int AS live_rows,
          n_dead_tup::int AS dead_rows,
          ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 1) AS dead_pct
        FROM pg_stat_user_tables
        ORDER BY pg_total_relation_size(relid) DESC
        LIMIT 20
      `),
      unusedIndexes: await rows(client, `
        SELECT
          schemaname || '.' || relname AS table,
          indexrelname AS index,
          pg_size_pretty(pg_relation_size(indexrelid)) AS size,
          idx_scan::int AS scans
        FROM pg_stat_user_indexes
        WHERE idx_scan = 0
          AND indexrelname NOT LIKE '%_pkey'
        ORDER BY pg_relation_size(indexrelid) DESC
        LIMIT 30
      `),
      blockedQueries: await rows(client, `
        SELECT
          blocked_locks.pid AS blocked_pid,
          blocked_activity.usename AS blocked_user,
          LEFT(blocked_activity.query, 120) AS blocked_query,
          blocking_locks.pid AS blocking_pid,
          blocking_activity.usename AS blocking_user,
          LEFT(blocking_activity.query, 120) AS blocking_query,
          (now() - blocked_activity.query_start)::text AS blocked_age
        FROM pg_locks blocked_locks
        JOIN pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
        JOIN pg_locks blocking_locks
          ON blocking_locks.locktype = blocked_locks.locktype
         AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
         AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
         AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
         AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
         AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
         AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
         AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
         AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
         AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
         AND blocking_locks.pid <> blocked_locks.pid
        JOIN pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
        WHERE NOT blocked_locks.granted
        LIMIT 20
      `),
      replicationLag: await rows(client, `
        SELECT
          application_name,
          client_addr,
          state,
          sync_state,
          pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn)::text AS lag_bytes,
          write_lag,
          flush_lag,
          replay_lag
        FROM pg_stat_replication
      `),
    };

    const extension = await scalar(client, `
      SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements') AS installed
    `);
    report.pgStatStatements = { installed: extension.installed === true };

    if (report.pgStatStatements.installed) {
      report.slowQueries = await rows(client, `
        SELECT
          ROUND(total_exec_time::numeric, 1) AS total_ms,
          calls::int,
          ROUND(mean_exec_time::numeric, 2) AS mean_ms,
          ROUND((100 * total_exec_time / NULLIF(SUM(total_exec_time) OVER (), 0))::numeric, 1) AS pct_total,
          LEFT(query, 200) AS query
        FROM pg_stat_statements
        WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
        ORDER BY total_exec_time DESC
        LIMIT 20
      `);
    } else {
      report.slowQueries = [];
    }

    console.log('================================================================');
    console.log(' Antokton PostgreSQL diagnostics');
    console.log('================================================================');
    printSection('Server', report.server);
    printSection('Database', report.database);
    printSection('Connections by state', report.connectionsByState);
    printSection('Connections by application', report.connectionsByApplication);
    printSection('Long-running queries >30s', report.longRunningQueries);
    printSection('Idle in transaction >60s', report.idleInTransaction);
    printSection('pg_stat_statements', report.pgStatStatements);
    printSection('Top slow queries', report.slowQueries);
    printSection('Cache hit ratio', report.cacheHitRatio);
    printSection('Largest tables', report.largestTables);
    printSection('Unused indexes', report.unusedIndexes);
    printSection('Blocked queries', report.blockedQueries);
    printSection('Replication lag', report.replicationLag);

    if (args.json) {
      require('fs').writeFileSync(args.json, JSON.stringify(report, null, 2));
      console.log(`\nWrote JSON report to ${args.json}`);
    }

    return report.longRunningQueries.length || report.idleInTransaction.length || report.blockedQueries.length ? 1 : 0;
  } finally {
    await client.end();
  }
}

runDiagnostics(parseArgs(process.argv))
  .then(code => process.exit(code))
  .catch(err => {
    console.error(err.stack || err.message);
    process.exit(1);
  });
