#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const { config } = require("../config");

const TABLES = [
  {
    name: "entity_records",
    columns: ["id", "app_id", "entity", "data", "created_date", "updated_date"]
  },
  {
    name: "uploaded_files",
    columns: ["id", "filename", "mime_type", "size", "disk_path", "public_url", "created_date"]
  },
  {
    name: "email_logs",
    columns: ["id", "payload", "created_date"]
  },
  {
    name: "function_logs",
    columns: ["id", "function_name", "payload", "result", "created_date"]
  },
  {
    name: "entity_schemas",
    columns: ["entity", "schema_json", "source_path", "loaded_at"]
  },
  {
    name: "auth_accounts",
    columns: [
      "id",
      "email",
      "user_record_id",
      "password_hash",
      "status",
      "email_verified_at",
      "created_date",
      "updated_date",
      "last_login_at"
    ]
  },
  {
    name: "auth_sessions",
    columns: [
      "id",
      "account_id",
      "user_record_id",
      "email",
      "token_hash",
      "created_date",
      "expires_at",
      "revoked_at",
      "user_agent",
      "ip_address"
    ]
  },
  {
    name: "auth_audit_logs",
    columns: ["id", "event_type", "email", "account_id", "ip_address", "user_agent", "metadata", "created_date"]
  }
];

function hasFlag(name) {
  return process.argv.includes(name);
}

function printUsage() {
  console.log(`
Usage:
  DATABASE_URL=postgres://... node backend/scripts/migrate-sqlite-to-postgres.js

Options:
  --dry-run       Print source SQLite row counts without writing to PostgreSQL.

Safety:
  - The target PostgreSQL tables must be empty before import.
  - The script creates missing PostgreSQL tables from backend/postgres/schema.sql.
  - The script refuses to overwrite existing PostgreSQL data.
  - Back up SQLite and uploads before running against production beta data.
`.trim());
}

function getSqliteCounts(sqlite) {
  const counts = {};
  for (const table of TABLES) {
    counts[table.name] = sqlite.prepare(`SELECT COUNT(*) AS count FROM ${table.name}`).get().count;
  }
  return counts;
}

function placeholders(count) {
  return Array.from({ length: count }, (_, index) => `$${index + 1}`).join(", ");
}

async function loadPgClient() {
  let pg;
  try {
    pg = require("pg");
  } catch (error) {
    if (error && error.code === "MODULE_NOT_FOUND") {
      throw new Error("Missing PostgreSQL driver. Run `npm install` from the project root before migration.");
    }
    throw error;
  }

  const client = new pg.Client({
    connectionString: config.DATABASE_URL,
    ssl: process.env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: false }
  });
  await client.connect();
  return client;
}

async function ensureTargetIsEmpty(client) {
  const nonEmpty = [];
  for (const table of TABLES) {
    const result = await client.query(`SELECT COUNT(*)::bigint AS count FROM ${table.name}`);
    const count = Number(result.rows[0].count || 0);
    if (count > 0) nonEmpty.push(`${table.name}=${count}`);
  }

  if (nonEmpty.length) {
    throw new Error(`Target PostgreSQL is not empty; refusing to overwrite: ${nonEmpty.join(", ")}`);
  }
}

async function copyTable(sqlite, client, table) {
  const rows = sqlite.prepare(`SELECT ${table.columns.join(", ")} FROM ${table.name}`).all();
  if (!rows.length) return 0;

  const columnList = table.columns.join(", ");
  const insertSql = `
    INSERT INTO ${table.name} (${columnList})
    VALUES (${placeholders(table.columns.length)})
  `;

  for (const row of rows) {
    const values = table.columns.map((column) => row[column]);
    await client.query(insertSql, values);
  }

  return rows.length;
}

async function main() {
  if (hasFlag("--help") || hasFlag("-h")) {
    printUsage();
    return;
  }

  if (!fs.existsSync(config.DB_PATH)) {
    throw new Error(`SQLite database not found at DB_PATH: ${config.DB_PATH}`);
  }

  const sqlite = new DatabaseSync(config.DB_PATH, { readOnly: true });
  const sourceCounts = getSqliteCounts(sqlite);

  if (hasFlag("--dry-run")) {
    console.log(JSON.stringify({ dryRun: true, source: { dbPath: config.DB_PATH, counts: sourceCounts } }, null, 2));
    sqlite.close();
    return;
  }

  if (!config.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for PostgreSQL migration.");
  }

  const schemaPath = path.join(config.ROOT_DIR, "backend", "postgres", "schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf8");
  const client = await loadPgClient();

  try {
    await client.query(schemaSql);
    await client.query("BEGIN");
    await ensureTargetIsEmpty(client);

    const imported = {};
    for (const table of TABLES) {
      imported[table.name] = await copyTable(sqlite, client, table);
    }

    await client.query("COMMIT");
    console.log(JSON.stringify({ migrated: true, sourceCounts, imported }, null, 2));
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Ignore rollback failures so the original migration error is preserved.
    }
    throw error;
  } finally {
    sqlite.close();
    await client.end();
  }
}

main().catch((error) => {
  console.error(`PostgreSQL migration failed: ${error.message}`);
  process.exitCode = 1;
});
