const fs = require("node:fs");
const path = require("node:path");
const { config } = require("./config");

const { DATA_DIR, DB_PATH, DATABASE_PROVIDER, DATABASE_URL, ROOT_DIR } = config;

let db;
let initialized = false;

function createStatementMap(prepare) {
  return {
    insertEntity: prepare(`
      INSERT INTO entity_records (id, app_id, entity, data, created_date, updated_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `),
    updateEntity: prepare(`
      UPDATE entity_records
      SET data = ?, updated_date = ?
      WHERE app_id = ? AND entity = ? AND id = ?
    `),
    deleteEntity: prepare(`
      DELETE FROM entity_records
      WHERE app_id = ? AND entity = ? AND id = ?
    `),
    getEntity: prepare(`
      SELECT * FROM entity_records
      WHERE app_id = ? AND entity = ? AND id = ?
    `),
    listEntity: prepare(`
      SELECT * FROM entity_records
      WHERE app_id = ? AND entity = ?
    `),
    insertFile: prepare(`
      INSERT INTO uploaded_files (id, filename, mime_type, size, disk_path, public_url, created_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `),
    insertEmail: prepare(`
      INSERT INTO email_logs (id, payload, created_date)
      VALUES (?, ?, ?)
    `),
    insertFunctionLog: prepare(`
      INSERT INTO function_logs (id, function_name, payload, result, created_date)
      VALUES (?, ?, ?, ?, ?)
    `),
    upsertSchema: prepare(`
      INSERT INTO entity_schemas (entity, schema_json, source_path, loaded_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(entity) DO UPDATE SET
        schema_json = excluded.schema_json,
        source_path = excluded.source_path,
        loaded_at = excluded.loaded_at
    `),
    countAuthAccounts: prepare(`
      SELECT COUNT(*) AS count FROM auth_accounts
    `),
    insertAuthAccount: prepare(`
      INSERT INTO auth_accounts (
        id, email, user_record_id, password_hash, status, email_verified_at,
        created_date, updated_date, last_login_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    getAuthAccountByEmail: prepare(`
      SELECT * FROM auth_accounts WHERE email = ?
    `),
    listAuthAccountsByEmailLike: prepare(`
      SELECT * FROM auth_accounts WHERE email LIKE ?
    `),
    getAuthAccountById: prepare(`
      SELECT * FROM auth_accounts WHERE id = ?
    `),
    updateAuthAccountLogin: prepare(`
      UPDATE auth_accounts
      SET user_record_id = ?, last_login_at = ?, updated_date = ?
      WHERE id = ?
    `),
    updateAuthAccountPassword: prepare(`
      UPDATE auth_accounts
      SET password_hash = ?, updated_date = ?
      WHERE id = ?
    `),
    insertAuthSession: prepare(`
      INSERT INTO auth_sessions (
        id, account_id, user_record_id, email, token_hash, created_date,
        expires_at, revoked_at, user_agent, ip_address
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    getAuthSessionByTokenHash: prepare(`
      SELECT * FROM auth_sessions
      WHERE token_hash = ?
    `),
    revokeAuthSession: prepare(`
      UPDATE auth_sessions
      SET revoked_at = ?
      WHERE token_hash = ? AND revoked_at IS NULL
    `),
    deleteAuthSessionsByAccountOrEmail: prepare(`
      DELETE FROM auth_sessions
      WHERE account_id = ? OR email = ?
    `),
    insertAuthAuditLog: prepare(`
      INSERT INTO auth_audit_logs (
        id, event_type, email, account_id, ip_address, user_agent, metadata, created_date
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `),
    deleteAuthAuditLogsByAccountOrEmail: prepare(`
      DELETE FROM auth_audit_logs
      WHERE account_id = ? OR email = ?
    `),
    deleteAuthAccount: prepare(`
      DELETE FROM auth_accounts
      WHERE id = ?
    `)
  };
}

function existsSafe(targetPath) {
  try {
    return fs.existsSync(targetPath);
  } catch {
    return false;
  }
}

function tableExists(sqliteDb, tableName) {
  return Boolean(sqliteDb.prepare(`
    SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?
  `).get(tableName));
}

function backupDatabaseFiles(label, dbFileExisted) {
  if (!dbFileExisted) return null;

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(DATA_DIR, "backups");
  fs.mkdirSync(backupDir, { recursive: true });

  const backupBase = path.join(backupDir, `${path.basename(DB_PATH)}.${label}.${timestamp}`);
  for (const sourcePath of [DB_PATH, `${DB_PATH}-wal`, `${DB_PATH}-shm`]) {
    if (fs.existsSync(sourcePath)) {
      const suffix = sourcePath.slice(DB_PATH.length);
      fs.copyFileSync(sourcePath, `${backupBase}${suffix}.bak`);
    }
  }

  return backupBase;
}

function initSqlite() {
  const { DatabaseSync } = require("node:sqlite");
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const dbFileExisted = fs.existsSync(DB_PATH);
  db = new DatabaseSync(DB_PATH);

  if (dbFileExisted && !tableExists(db, "auth_accounts")) {
    try {
      const backupBase = backupDatabaseFiles("pre-auth", dbFileExisted);
      if (backupBase) console.log(`Created pre-auth database backup: ${backupBase}`);
    } catch (error) {
      console.warn(`Failed to create pre-auth database backup: ${error.message}`);
    }
  }

  db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS entity_records (
    id TEXT PRIMARY KEY,
    app_id TEXT NOT NULL,
    entity TEXT NOT NULL,
    data TEXT NOT NULL,
    created_date TEXT NOT NULL,
    updated_date TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_entity_records_entity_created
    ON entity_records (app_id, entity, created_date DESC);

  CREATE TABLE IF NOT EXISTS uploaded_files (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    mime_type TEXT,
    size INTEGER NOT NULL,
    disk_path TEXT NOT NULL,
    public_url TEXT NOT NULL,
    created_date TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS email_logs (
    id TEXT PRIMARY KEY,
    payload TEXT NOT NULL,
    created_date TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS function_logs (
    id TEXT PRIMARY KEY,
    function_name TEXT NOT NULL,
    payload TEXT,
    result TEXT,
    created_date TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS entity_schemas (
    entity TEXT PRIMARY KEY,
    schema_json TEXT NOT NULL,
    source_path TEXT,
    loaded_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS auth_accounts (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    user_record_id TEXT,
    password_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    email_verified_at TEXT,
    created_date TEXT NOT NULL,
    updated_date TEXT NOT NULL,
    last_login_at TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_auth_accounts_status
    ON auth_accounts (status);

  CREATE TABLE IF NOT EXISTS auth_sessions (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    user_record_id TEXT,
    email TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    created_date TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    revoked_at TEXT,
    user_agent TEXT,
    ip_address TEXT,
    FOREIGN KEY(account_id) REFERENCES auth_accounts(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_auth_sessions_email
    ON auth_sessions (email);

  CREATE TABLE IF NOT EXISTS auth_audit_logs (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    email TEXT,
    account_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    metadata TEXT,
    created_date TEXT NOT NULL
  );
  `);

  initialized = true;
}

function replaceSqlitePlaceholders(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

function createPostgresStatement(sql) {
  const text = replaceSqlitePlaceholders(sql);
  return {
    async run(...params) {
      const result = await db.query(text, params);
      return { changes: result.rowCount || 0, rowCount: result.rowCount || 0 };
    },
    async get(...params) {
      const result = await db.query(text, params);
      return result.rows[0];
    },
    async all(...params) {
      const result = await db.query(text, params);
      return result.rows;
    }
  };
}

function initPostgresPool() {
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL is required when DATABASE_PROVIDER=postgres");
  }

  let pg;
  try {
    pg = require("pg");
  } catch (error) {
    if (error && error.code === "MODULE_NOT_FOUND") {
      throw new Error("Missing PostgreSQL driver. Run `npm install` from the project root before DATABASE_PROVIDER=postgres.");
    }
    throw error;
  }

  db = new pg.Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: false }
  });
}

async function initDatabase() {
  if (initialized) return;

  if (DATABASE_PROVIDER === "postgres") {
    const schemaPath = path.join(ROOT_DIR, "backend", "postgres", "schema.sql");
    const schemaSql = fs.readFileSync(schemaPath, "utf8");
    await db.query(schemaSql);
    initialized = true;
  }
}

if (DATABASE_PROVIDER === "sqlite") {
  initSqlite();
} else if (DATABASE_PROVIDER === "postgres") {
  initPostgresPool();
} else {
  throw new Error("DATABASE_PROVIDER must be sqlite or postgres");
}

const statements = createStatementMap((sql) =>
  DATABASE_PROVIDER === "sqlite" ? db.prepare(sql) : createPostgresStatement(sql)
);

function getDatabaseMode() {
  return DATABASE_PROVIDER;
}

function getDatabaseStatus() {
  if (DATABASE_PROVIDER === "postgres") {
    return {
      type: "postgres",
      provider: DATABASE_PROVIDER,
      configured: Boolean(DATABASE_URL),
      databaseUrlConfigured: Boolean(DATABASE_URL),
      sslEnabled: process.env.PGSSLMODE !== "disable"
    };
  }

  return {
    type: getDatabaseMode(),
    provider: DATABASE_PROVIDER,
    configured: Boolean(DB_PATH),
    directoryExists: existsSafe(path.dirname(DB_PATH)),
    fileExists: existsSafe(DB_PATH)
  };
}

async function closeDatabase() {
  if (DATABASE_PROVIDER === "postgres" && db) {
    await db.end();
  } else if (DATABASE_PROVIDER === "sqlite" && db) {
    db.close();
  }
}

module.exports = {
  db,
  closeDatabase,
  getDatabaseMode,
  getDatabaseStatus,
  initDatabase,
  statements
};
