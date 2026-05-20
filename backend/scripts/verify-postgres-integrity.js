#!/usr/bin/env node
"use strict";

/**
 * Verify data integrity between SQLite and PostgreSQL after migration.
 *
 * Usage:
 *   node backend/scripts/verify-postgres-integrity.js [--verbose]
 *
 * Required env vars:
 *   DATABASE_URL   — PostgreSQL connection string
 *   DB_PATH        — SQLite file path (default: backend/data/antokton.sqlite)
 */

const path = require("node:path");
const fs = require("node:fs");
const { DatabaseSync } = require("node:sqlite");
const { Pool } = require("pg");

const VERBOSE = process.argv.includes("--verbose");

const DB_PATH = process.env.DB_PATH ||
  path.join(__dirname, "..", "data", "antokton.sqlite");
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL env var is required");
  process.exit(1);
}
if (!fs.existsSync(DB_PATH)) {
  console.error(`ERROR: SQLite file not found: ${DB_PATH}`);
  process.exit(1);
}

// ── Tables to verify ─────────────────────────────────────────────────────────
const TABLES = [
  { name: "entity_records",   pk: "id",     jsonFields: ["data"] },
  { name: "uploaded_files",   pk: "id",     jsonFields: [] },
  { name: "email_logs",       pk: "id",     jsonFields: ["payload"] },
  { name: "function_logs",    pk: "id",     jsonFields: ["payload", "result"] },
  { name: "entity_schemas",   pk: "entity", jsonFields: ["schema_json"] },
  { name: "auth_accounts",    pk: "id",     jsonFields: [] },
  { name: "auth_sessions",    pk: "id",     jsonFields: [] },
  { name: "auth_audit_logs",  pk: "id",     jsonFields: ["metadata"] },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function isValidJson(str) {
  if (str === null || str === undefined || str === "") return true;
  try { JSON.parse(str); return true; } catch { return false; }
}

function tableExistsSqlite(sqlite, table) {
  return Boolean(
    sqlite.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(table)
  );
}

async function getAllPgRows(pool, table, pk) {
  const res = await pool.query(`SELECT * FROM ${table} ORDER BY ${pk}`);
  return res.rows;
}

function getAllSqliteRows(sqlite, table, pk) {
  return sqlite.prepare(`SELECT * FROM ${table} ORDER BY ${pk}`).all();
}

// ── Checks ────────────────────────────────────────────────────────────────────
let totalIssues = 0;
const allIssues = [];

function issue(category, msg) {
  totalIssues++;
  allIssues.push(`[${category}] ${msg}`);
  console.log(`    ✗ ${msg}`);
}

function pass(msg) {
  if (VERBOSE) console.log(`    ✓ ${msg}`);
}

async function checkTable(sqlite, pool, t) {
  console.log(`\n  Table: ${t.name}`);

  if (!tableExistsSqlite(sqlite, t.name)) {
    console.log(`    — not present in SQLite, skipping`);
    return;
  }

  const sqliteRows = getAllSqliteRows(sqlite, t.name, t.pk);
  const pgRows = await getAllPgRows(pool, t.name, t.pk);

  const sqliteCount = sqliteRows.length;
  const pgCount = pgRows.length;

  console.log(`    SQLite: ${sqliteCount} rows | PG: ${pgCount} rows`);

  // ── Count check ────────────────────────────────────────────────────────────
  if (pgCount < sqliteCount) {
    issue(t.name, `PG has fewer rows than SQLite (${pgCount} < ${sqliteCount})`);
  } else {
    pass(`row count OK (PG=${pgCount} >= SQLite=${sqliteCount})`);
  }

  // ── Missing rows check ────────────────────────────────────────────────────
  const pgPkSet = new Set(pgRows.map(r => String(r[t.pk])));
  const missingPks = sqliteRows
    .map(r => String(r[t.pk]))
    .filter(pk => !pgPkSet.has(pk));

  if (missingPks.length > 0) {
    issue(t.name, `${missingPks.length} rows in SQLite are MISSING from PG: ${missingPks.slice(0, 5).join(", ")}${missingPks.length > 5 ? "..." : ""}`);
  } else {
    pass(`all ${sqliteCount} SQLite PKs present in PG`);
  }

  // ── JSON field integrity ──────────────────────────────────────────────────
  if (t.jsonFields.length > 0) {
    const pgMap = new Map(pgRows.map(r => [String(r[t.pk]), r]));
    let badJson = 0;
    let badMatch = 0;

    for (const sRow of sqliteRows) {
      const pk = String(sRow[t.pk]);
      const pgRow = pgMap.get(pk);
      if (!pgRow) continue;

      for (const field of t.jsonFields) {
        const sqliteVal = sRow[field];
        const pgVal = pgRow[field];

        // JSON validity
        if (!isValidJson(pgVal)) {
          badJson++;
          if (VERBOSE) issue(t.name, `PK=${pk} field=${field}: invalid JSON in PG`);
        }

        // Content match — normalize both to parsed objects for comparison
        if (sqliteVal !== null && pgVal !== null) {
          try {
            const sqliteParsed = typeof sqliteVal === "string" ? JSON.parse(sqliteVal) : sqliteVal;
            const pgParsed = typeof pgVal === "string" ? JSON.parse(pgVal) : pgVal;
            const sqliteStr = JSON.stringify(sqliteParsed);
            const pgStr = JSON.stringify(pgParsed);
            if (sqliteStr !== pgStr) {
              badMatch++;
              if (VERBOSE) issue(t.name, `PK=${pk} field=${field}: content mismatch`);
            }
          } catch { /* unparseable — covered by validity check */ }
        }
      }
    }

    if (badJson > 0) issue(t.name, `${badJson} rows have invalid JSON in PG`);
    else pass(`all JSON fields valid in PG`);

    if (badMatch > 0) issue(t.name, `${badMatch} rows have JSON content mismatch between SQLite and PG`);
    else pass(`all JSON field contents match`);
  }

  // ── Timestamp format check ────────────────────────────────────────────────
  const tsFields = Object.keys(pgRows[0] || {}).filter(k =>
    k.endsWith("_date") || k.endsWith("_at")
  );
  let badTs = 0;
  for (const row of pgRows) {
    for (const f of tsFields) {
      const v = row[f];
      if (v === null) continue;
      const str = v instanceof Date ? v.toISOString() : String(v);
      if (!/^\d{4}-\d{2}-\d{2}T/.test(str)) {
        badTs++;
        if (VERBOSE) issue(t.name, `PK=${String(row[t.pk])} field=${f}: unexpected timestamp format: ${str}`);
      }
    }
  }
  if (badTs > 0) issue(t.name, `${badTs} timestamp fields have unexpected format`);
  else if (tsFields.length > 0) pass(`all timestamp fields have ISO format`);
}

// ── Auth / Session integrity ──────────────────────────────────────────────────
async function checkAuthIntegrity(pool) {
  console.log("\n  Auth integrity checks");

  // Every session must have a valid account
  const orphanSessions = await pool.query(`
    SELECT s.id FROM auth_sessions s
    LEFT JOIN auth_accounts a ON a.id = s.account_id
    WHERE a.id IS NULL
  `);
  if (orphanSessions.rows.length > 0) {
    issue("auth_sessions", `${orphanSessions.rows.length} sessions reference non-existent accounts`);
  } else {
    pass("all sessions reference valid accounts");
  }

  // No duplicate token hashes
  const dupTokens = await pool.query(`
    SELECT token_hash, COUNT(*) AS n FROM auth_sessions
    GROUP BY token_hash HAVING COUNT(*) > 1
  `);
  if (dupTokens.rows.length > 0) {
    issue("auth_sessions", `${dupTokens.rows.length} duplicate token_hash values`);
  } else {
    pass("no duplicate token hashes");
  }

  // No duplicate emails in auth_accounts
  const dupEmails = await pool.query(`
    SELECT email, COUNT(*) AS n FROM auth_accounts
    GROUP BY email HAVING COUNT(*) > 1
  `);
  if (dupEmails.rows.length > 0) {
    issue("auth_accounts", `${dupEmails.rows.length} duplicate emails: ${dupEmails.rows.map(r => r.email).join(", ")}`);
  } else {
    pass("no duplicate account emails");
  }

  // All accounts have non-empty password_hash
  const noHash = await pool.query(`
    SELECT COUNT(*) AS n FROM auth_accounts WHERE password_hash IS NULL OR password_hash = ''
  `);
  if (Number(noHash.rows[0]?.n) > 0) {
    issue("auth_accounts", `${noHash.rows[0].n} accounts missing password_hash`);
  } else {
    pass("all accounts have password_hash");
  }

  // Sessions expiry sanity (no already-expired active sessions created in the future)
  const futureCreated = await pool.query(`
    SELECT COUNT(*) AS n FROM auth_sessions
    WHERE created_date > NOW()::text
  `);
  if (Number(futureCreated.rows[0]?.n) > 0) {
    issue("auth_sessions", `${futureCreated.rows[0].n} sessions have future created_date`);
  } else {
    pass("no sessions with future created_date");
  }
}

// ── Entity data spot checks ───────────────────────────────────────────────────
async function checkEntitySpotChecks(pool) {
  console.log("\n  Entity data spot checks");

  // All entity_records.data must be valid JSON
  const badData = await pool.query(`
    SELECT id FROM entity_records
    WHERE data IS NULL OR data = '' OR data = 'null'
    LIMIT 10
  `);
  if (badData.rows.length > 0) {
    issue("entity_records", `${badData.rows.length}+ rows with null/empty data field`);
  } else {
    pass("all entity_records have non-null data");
  }

  // Distinct entities present
  const entities = await pool.query(`
    SELECT entity, COUNT(*) AS n FROM entity_records GROUP BY entity ORDER BY n DESC LIMIT 20
  `);
  if (VERBOSE && entities.rows.length > 0) {
    console.log(`    Entity types in PG (${entities.rows.length}):`);
    entities.rows.forEach(r => console.log(`      ${r.entity.padEnd(40)} ${r.n} rows`));
  } else {
    pass(`${entities.rows.length} distinct entity types in PG`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("═".repeat(70));
  console.log("  Antokton PostgreSQL Integrity Verification");
  console.log("═".repeat(70));
  console.log(`  SQLite:     ${DB_PATH}`);
  console.log(`  PostgreSQL: ${DATABASE_URL.replace(/:([^:@]+)@/, ":***@")}`);
  console.log(`  Verbose:    ${VERBOSE}`);

  const sqlite = new DatabaseSync(DB_PATH);
  const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

  try {
    await pool.query("SELECT 1");
    console.log("  PG connection: OK\n");
  } catch (err) {
    console.error(`  PG connection FAILED: ${err.message}`);
    process.exit(1);
  }

  console.log("── Per-table checks ────────────────────────────────────────────");
  for (const t of TABLES) {
    await checkTable(sqlite, pool, t);
  }

  console.log("\n── Cross-table checks ──────────────────────────────────────────");
  await checkAuthIntegrity(pool);
  await checkEntitySpotChecks(pool);

  console.log("\n── Summary ─────────────────────────────────────────────────────");
  if (totalIssues === 0) {
    console.log("  ✓ All checks passed — PostgreSQL data integrity verified");
  } else {
    console.log(`  ✗ ${totalIssues} issue(s) found:`);
    allIssues.forEach(i => console.log(`    - ${i}`));
  }
  console.log("═".repeat(70));

  await pool.end();
  process.exit(totalIssues === 0 ? 0 : 1);
}

main().catch(err => {
  console.error("Verification crashed:", err.message, err.stack);
  process.exit(2);
});
