#!/usr/bin/env node
"use strict";

/**
 * Migrate all data from SQLite to PostgreSQL.
 *
 * Usage:
 *   node backend/migrate-sqlite-to-postgres.js [--dry-run] [--no-rollback-log]
 *
 * Required env vars:
 *   DATABASE_URL   — target PostgreSQL connection string
 *   DB_PATH        — source SQLite file path (default: backend/data/antokton.sqlite)
 *
 * Options:
 *   --dry-run          Print counts and plan without writing to PostgreSQL
 *   --no-rollback-log  Skip writing rollback log (not recommended)
 *
 * The rollback log is written to: backend/data/migration-rollback-<timestamp>.json
 * It contains every row inserted so a rollback script can DELETE them.
 */

const path = require("node:path");
const fs = require("node:fs");
const { DatabaseSync } = require("node:sqlite");
const { Pool } = require("pg");

// ── Config ──────────────────────────────────────────────────────────────────
const DRY_RUN = process.argv.includes("--dry-run");
const SKIP_ROLLBACK_LOG = process.argv.includes("--no-rollback-log");

const DB_PATH = process.env.DB_PATH ||
  path.join(__dirname, "data", "antokton.sqlite");
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL env var is required");
  process.exit(1);
}
if (!fs.existsSync(DB_PATH)) {
  console.error(`ERROR: SQLite file not found: ${DB_PATH}`);
  process.exit(1);
}

const ROLLBACK_LOG_PATH = path.join(
  __dirname, "data",
  `migration-rollback-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
);

// ── Tables and their ordered columns ────────────────────────────────────────
const TABLES = [
  {
    name: "entity_records",
    columns: ["id", "app_id", "entity", "data", "created_date", "updated_date"],
    pk: "id",
  },
  {
    name: "uploaded_files",
    columns: ["id", "filename", "mime_type", "size", "disk_path", "public_url", "created_date"],
    pk: "id",
  },
  {
    name: "email_logs",
    columns: ["id", "payload", "created_date"],
    pk: "id",
  },
  {
    name: "function_logs",
    columns: ["id", "function_name", "payload", "result", "created_date"],
    pk: "id",
  },
  {
    name: "entity_schemas",
    columns: ["entity", "schema_json", "source_path", "loaded_at"],
    pk: "entity",
  },
  {
    name: "auth_accounts",
    columns: [
      "id", "email", "user_record_id", "password_hash", "status",
      "email_verified_at", "created_date", "updated_date", "last_login_at",
    ],
    pk: "id",
  },
  {
    name: "auth_sessions",
    columns: [
      "id", "account_id", "user_record_id", "email", "token_hash",
      "created_date", "expires_at", "revoked_at", "user_agent", "ip_address",
    ],
    pk: "id",
  },
  {
    name: "auth_audit_logs",
    columns: [
      "id", "event_type", "email", "account_id", "ip_address",
      "user_agent", "metadata", "created_date",
    ],
    pk: "id",
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function buildInsertSQL(table, columns) {
  const cols = columns.map(c => `"${c}"`).join(", ");
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
  return `INSERT INTO ${table} (${cols}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
}

function rowToValues(row, columns) {
  return columns.map(col => {
    const v = row[col];
    return v === undefined ? null : v;
  });
}

async function countPg(pool, table) {
  const res = await pool.query(`SELECT COUNT(*)::int AS n FROM ${table}`);
  return Number(res.rows[0]?.n || 0);
}

function countSqlite(sqlite, table) {
  try {
    return Number(sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get()?.n || 0);
  } catch {
    return 0;
  }
}

function tableExistsSqlite(sqlite, table) {
  return Boolean(
    sqlite.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(table)
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("═".repeat(70));
  console.log("  Antokton SQLite → PostgreSQL Migration");
  console.log("═".repeat(70));
  console.log(`  Mode:      ${DRY_RUN ? "DRY RUN (no writes)" : "LIVE"}`);
  console.log(`  Source:    ${DB_PATH}`);
  console.log(`  Target:    ${DATABASE_URL.replace(/:([^:@]+)@/, ":***@")}`);
  console.log(`  Rollback:  ${SKIP_ROLLBACK_LOG ? "disabled" : ROLLBACK_LOG_PATH}`);
  console.log("");

  const sqlite = new DatabaseSync(DB_PATH);
  const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

  // Test PG connection
  try {
    await pool.query("SELECT 1");
    console.log("  PostgreSQL connection: OK");
  } catch (err) {
    console.error(`  PostgreSQL connection FAILED: ${err.message}`);
    process.exit(1);
  }

  // ── ROW COUNTS BEFORE ──────────────────────────────────────────────────────
  console.log("\n── Row counts (before migration) ──────────────────────────────");
  console.log(`${"Table".padEnd(30)} ${"SQLite".padStart(10)} ${"PG now".padStart(10)}`);
  console.log("─".repeat(55));

  const preCounts = {};
  for (const t of TABLES) {
    const sqliteCount = tableExistsSqlite(sqlite, t.name) ? countSqlite(sqlite, t.name) : 0;
    const pgCount = await countPg(pool, t.name);
    preCounts[t.name] = { sqlite: sqliteCount, pg: pgCount };
    console.log(`${t.name.padEnd(30)} ${String(sqliteCount).padStart(10)} ${String(pgCount).padStart(10)}`);
  }

  if (DRY_RUN) {
    console.log("\n  [DRY RUN] No data will be written. Exiting.");
    await pool.end();
    return;
  }

  // ── MIGRATION ─────────────────────────────────────────────────────────────
  console.log("\n── Migrating tables ───────────────────────────────────────────");

  const rollbackLog = {};
  let totalInserted = 0;
  let totalSkipped = 0;

  for (const t of TABLES) {
    if (!tableExistsSqlite(sqlite, t.name)) {
      console.log(`  ${t.name.padEnd(30)} — not in SQLite, skip`);
      continue;
    }

    const rows = sqlite.prepare(`SELECT * FROM ${t.name}`).all();
    if (rows.length === 0) {
      console.log(`  ${t.name.padEnd(30)} — 0 rows, skip`);
      continue;
    }

    const sql = buildInsertSQL(t.name, t.columns);
    const client = await pool.connect();
    rollbackLog[t.name] = [];
    let inserted = 0;
    let skipped = 0;

    try {
      await client.query("BEGIN");
      for (const row of rows) {
        const values = rowToValues(row, t.columns);
        const result = await client.query(sql, values);
        if (result.rowCount > 0) {
          inserted++;
          rollbackLog[t.name].push(row[t.pk]);
        } else {
          skipped++;
        }
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`  ERROR migrating ${t.name}: ${err.message}`);
      client.release();
      await pool.end();
      process.exit(1);
    }
    client.release();

    totalInserted += inserted;
    totalSkipped += skipped;
    console.log(`  ${t.name.padEnd(30)} — inserted: ${inserted}, skipped (already existed): ${skipped}`);
  }

  // ── ROLLBACK LOG ──────────────────────────────────────────────────────────
  if (!SKIP_ROLLBACK_LOG) {
    fs.mkdirSync(path.dirname(ROLLBACK_LOG_PATH), { recursive: true });
    fs.writeFileSync(
      ROLLBACK_LOG_PATH,
      JSON.stringify({ migratedAt: new Date().toISOString(), tables: rollbackLog }, null, 2)
    );
    console.log(`\n  Rollback log written: ${ROLLBACK_LOG_PATH}`);
  }

  // ── ROW COUNTS AFTER ──────────────────────────────────────────────────────
  console.log("\n── Row counts (after migration) ───────────────────────────────");
  console.log(`${"Table".padEnd(30)} ${"SQLite".padStart(10)} ${"PG after".padStart(10)} ${"Δ".padStart(8)}`);
  console.log("─".repeat(63));

  let allMatch = true;
  for (const t of TABLES) {
    const sqliteCount = preCounts[t.name].sqlite;
    const pgCount = await countPg(pool, t.name);
    const delta = pgCount - preCounts[t.name].pg;
    const match = pgCount >= sqliteCount;
    if (!match) allMatch = false;
    const marker = match ? "✓" : "✗";
    console.log(`  ${marker} ${t.name.padEnd(28)} ${String(sqliteCount).padStart(10)} ${String(pgCount).padStart(10)} ${String(delta > 0 ? "+" + delta : delta).padStart(8)}`);
  }

  console.log("\n── Summary ────────────────────────────────────────────────────");
  console.log(`  Total inserted: ${totalInserted}`);
  console.log(`  Total skipped:  ${totalSkipped}`);
  console.log(`  Status: ${allMatch ? "SUCCESS — all SQLite rows are now in PostgreSQL" : "WARNING — some tables have fewer PG rows than SQLite"}`);
  console.log("═".repeat(70));

  await pool.end();
  process.exit(allMatch ? 0 : 1);
}

main().catch(err => {
  console.error("Migration crashed:", err.message, err.stack);
  process.exit(2);
});
