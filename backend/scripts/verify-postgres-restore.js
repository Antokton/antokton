#!/usr/bin/env node

/**
 * Read-only PostgreSQL restore validation.
 *
 * Intended for throwaway restore databases after a provider-native restore or
 * logical pg_restore. It never prints the database URL and does not modify data.
 */

const { Client } = require("pg");

const REQUIRED_TABLES = [
  "entity_records",
  "uploaded_files",
  "function_logs",
  "entity_schemas",
  "auth_accounts",
  "auth_sessions",
  "auth_audit_logs"
];

function parseArgs(argv) {
  const args = {
    pg: process.env.RESTORE_DATABASE_URL || process.env.DATABASE_URL || "",
    expectSchemas: Number(process.env.ANTOKTON_EXPECT_SCHEMAS || 60),
    maxBlocked: Number(process.env.ANTOKTON_MAX_BLOCKED_QUERIES || 0),
    maxIdleInTransaction: Number(process.env.ANTOKTON_MAX_IDLE_IN_TX || 0),
    longQuerySeconds: Number(process.env.ANTOKTON_LONG_QUERY_SECONDS || 60),
    json: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--pg" && next) {
      args.pg = next;
      i += 1;
    } else if (arg === "--expect-schemas" && next) {
      args.expectSchemas = Number(next);
      i += 1;
    } else if (arg === "--max-blocked" && next) {
      args.maxBlocked = Number(next);
      i += 1;
    } else if (arg === "--max-idle-in-transaction" && next) {
      args.maxIdleInTransaction = Number(next);
      i += 1;
    } else if (arg === "--long-query-seconds" && next) {
      args.longQuerySeconds = Number(next);
      i += 1;
    } else if (arg === "--json") {
      args.json = true;
    }
  }

  if (!Number.isFinite(args.expectSchemas)) args.expectSchemas = 60;
  if (!Number.isFinite(args.maxBlocked)) args.maxBlocked = 0;
  if (!Number.isFinite(args.maxIdleInTransaction)) args.maxIdleInTransaction = 0;
  if (!Number.isFinite(args.longQuerySeconds)) args.longQuerySeconds = 60;
  return args;
}

function sslFor(connectionString) {
  if (/render\.com/i.test(connectionString) || /sslmode=require/i.test(connectionString)) {
    return { rejectUnauthorized: false };
  }
  return process.env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: false };
}

async function scalar(client, text, params = []) {
  const result = await client.query(text, params);
  return result.rows[0] ? Object.values(result.rows[0])[0] : null;
}

async function tableCounts(client) {
  const counts = {};
  for (const table of REQUIRED_TABLES) {
    const exists = await scalar(
      client,
      "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1)",
      [table]
    );
    if (!exists) {
      counts[table] = null;
      continue;
    }
    counts[table] = Number(await scalar(client, `SELECT COUNT(*)::int FROM ${table}`));
  }
  return counts;
}

async function diagnostics(client, longQuerySeconds) {
  const blocked = Number(await scalar(client, `
    SELECT COUNT(*)::int
    FROM pg_locks blocked_locks
    JOIN pg_stat_activity blocked_activity
      ON blocked_activity.pid = blocked_locks.pid
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
     AND blocking_locks.pid != blocked_locks.pid
    WHERE NOT blocked_locks.granted
      AND blocking_locks.granted
      AND blocked_activity.datname = current_database()
  `));

  const idleInTransaction = Number(await scalar(client, `
    SELECT COUNT(*)::int
    FROM pg_stat_activity
    WHERE datname = current_database()
      AND state = 'idle in transaction'
  `));

  const longRunning = Number(await scalar(client, `
    SELECT COUNT(*)::int
    FROM pg_stat_activity
    WHERE datname = current_database()
      AND state <> 'idle'
      AND now() - query_start > ($1::int * interval '1 second')
      AND pid <> pg_backend_pid()
  `, [longQuerySeconds]));

  return { blocked, idleInTransaction, longRunning };
}

function buildFailures(summary, args) {
  const failures = [];
  for (const table of REQUIRED_TABLES) {
    if (summary.counts[table] === null) failures.push(`missing table: ${table}`);
  }
  if (summary.counts.entity_schemas !== args.expectSchemas) {
    failures.push(`expected entity_schemas=${args.expectSchemas}, got ${summary.counts.entity_schemas}`);
  }
  if (summary.diagnostics.blocked > args.maxBlocked) {
    failures.push(`blocked queries=${summary.diagnostics.blocked}, max=${args.maxBlocked}`);
  }
  if (summary.diagnostics.idleInTransaction > args.maxIdleInTransaction) {
    failures.push(`idle-in-transaction=${summary.diagnostics.idleInTransaction}, max=${args.maxIdleInTransaction}`);
  }
  if (summary.diagnostics.longRunning > 0) {
    failures.push(`long-running queries=${summary.diagnostics.longRunning}`);
  }
  return failures;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.pg) {
    console.error("RESTORE_DATABASE_URL, DATABASE_URL, or --pg is required");
    process.exit(2);
  }

  const client = new Client({
    connectionString: args.pg,
    ssl: sslFor(args.pg),
    application_name: "antokton-restore-validator"
  });

  const started = Date.now();
  try {
    await client.connect();
    const [database, serverVersion, counts, diag] = await Promise.all([
      scalar(client, "SELECT current_database()"),
      scalar(client, "SHOW server_version"),
      tableCounts(client),
      diagnostics(client, args.longQuerySeconds)
    ]);

    const summary = {
      ok: true,
      checkedAt: new Date().toISOString(),
      elapsedMs: Date.now() - started,
      database,
      serverVersion,
      counts,
      diagnostics: diag,
      failures: []
    };
    summary.failures = buildFailures(summary, args);
    summary.ok = summary.failures.length === 0;

    console.log(JSON.stringify(summary, null, args.json ? 2 : 0));
    process.exit(summary.ok ? 0 : 1);
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    checkedAt: new Date().toISOString(),
    error: error.message
  }));
  process.exit(2);
});
