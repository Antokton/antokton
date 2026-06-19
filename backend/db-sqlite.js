const { config } = require("./config");

console.log(`Using SQLite database: ${config.DB_PATH}`);

const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const { DATA_DIR, DB_PATH } = config;

fs.mkdirSync(DATA_DIR, { recursive: true });

const dbFileExisted = fs.existsSync(DB_PATH);
const db = new DatabaseSync(DB_PATH);

function tableExists(tableName) {
  return Boolean(db.prepare(`
    SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?
  `).get(tableName));
}

function backupDatabaseFiles(label) {
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

if (dbFileExisted && !tableExists("auth_accounts")) {
  try {
    const backupBase = backupDatabaseFiles("pre-auth");
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

CREATE TABLE IF NOT EXISTS post_views (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  viewer_user_id TEXT,
  viewer_session_hash TEXT,
  created_at TEXT NOT NULL,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_post_views_post_created
  ON post_views (post_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_post_views_post_user_created
  ON post_views (post_id, viewer_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_post_views_post_session_created
  ON post_views (post_id, viewer_session_hash, created_at DESC);

CREATE TABLE IF NOT EXISTS imported_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  provider_key TEXT NOT NULL,
  base_url TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  country_filter TEXT,
  category_filter TEXT,
  source_group TEXT,
  parser_type TEXT,
  parser_config TEXT,
  trust_level TEXT,
  is_editable_by_admin INTEGER NOT NULL DEFAULT 1,
  last_checked_at TEXT,
  last_success_at TEXT,
  failure_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS imported_items (
  id TEXT PRIMARY KEY,
  source_id TEXT,
  external_id TEXT,
  source_url TEXT,
  source_name TEXT,
  source_public_visible INTEGER NOT NULL DEFAULT 0,
  imported_public_badge_visible INTEGER NOT NULL DEFAULT 0,
  item_type TEXT,
  original_title TEXT,
  original_description TEXT,
  original_language TEXT,
  original_company TEXT,
  original_contact TEXT,
  original_location TEXT,
  original_country TEXT,
  original_city TEXT,
  original_salary TEXT,
  shqip_title TEXT,
  shqip_summary TEXT,
  category TEXT,
  profession TEXT,
  country TEXT,
  city TEXT,
  contract_type TEXT,
  salary_min REAL,
  salary_max REAL,
  currency TEXT,
  contact_methods TEXT,
  contact_language_required INTEGER NOT NULL DEFAULT 0,
  contact_languages TEXT,
  relevance_score REAL,
  relevance_level TEXT,
  relevance_reason TEXT,
  risk_score REAL,
  risk_reason TEXT,
  ethical_score REAL,
  ethical_reason TEXT,
  source_identity_type TEXT,
  source_identity_name TEXT,
  source_identity_url TEXT,
  source_identity_confidence REAL,
  is_albanian_source INTEGER NOT NULL DEFAULT 0,
  albanian_source_reason TEXT,
  status TEXT,
  approved_by TEXT,
  approved_at TEXT,
  published_post_id TEXT,
  imported_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS import_logs (
  id TEXT PRIMARY KEY,
  provider_key TEXT,
  source_id TEXT,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  fetched_count INTEGER NOT NULL DEFAULT 0,
  created_count INTEGER NOT NULL DEFAULT 0,
  duplicate_count INTEGER NOT NULL DEFAULT 0,
  rejected_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  status TEXT,
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS import_assistant_settings (
  id TEXT PRIMARY KEY,
  auto_import_enabled INTEGER NOT NULL DEFAULT 1,
  import_frequency_hours INTEGER NOT NULL DEFAULT 6,
  max_items_per_run INTEGER NOT NULL DEFAULT 100,
  auto_publish_enabled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`);

const statements = {
  insertEntity: db.prepare(`
    INSERT INTO entity_records (id, app_id, entity, data, created_date, updated_date)
    VALUES (?, ?, ?, ?, ?, ?)
  `),
  updateEntity: db.prepare(`
    UPDATE entity_records
    SET data = ?, updated_date = ?
    WHERE app_id = ? AND entity = ? AND id = ?
  `),
  deleteEntity: db.prepare(`
    DELETE FROM entity_records
    WHERE app_id = ? AND entity = ? AND id = ?
  `),
  getEntity: db.prepare(`
    SELECT * FROM entity_records
    WHERE app_id = ? AND entity = ? AND id = ?
  `),
  listEntity: db.prepare(`
    SELECT * FROM entity_records
    WHERE app_id = ? AND entity = ?
  `),
  insertFile: db.prepare(`
    INSERT INTO uploaded_files (id, filename, mime_type, size, disk_path, public_url, created_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `),
  insertEmail: db.prepare(`
    INSERT INTO email_logs (id, payload, created_date)
    VALUES (?, ?, ?)
  `),
  insertFunctionLog: db.prepare(`
    INSERT INTO function_logs (id, function_name, payload, result, created_date)
    VALUES (?, ?, ?, ?, ?)
  `),
  upsertSchema: db.prepare(`
    INSERT INTO entity_schemas (entity, schema_json, source_path, loaded_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(entity) DO UPDATE SET
      schema_json = excluded.schema_json,
      source_path = excluded.source_path,
      loaded_at = excluded.loaded_at
  `),
  countAuthAccounts: db.prepare(`
    SELECT COUNT(*) AS count FROM auth_accounts
  `),
  insertAuthAccount: db.prepare(`
    INSERT INTO auth_accounts (
      id, email, user_record_id, password_hash, status, email_verified_at,
      created_date, updated_date, last_login_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  getAuthAccountByEmail: db.prepare(`
    SELECT * FROM auth_accounts WHERE email = ?
  `),
  listAuthAccountsByEmailLike: db.prepare(`
    SELECT * FROM auth_accounts WHERE email LIKE ?
  `),
  getAuthAccountById: db.prepare(`
    SELECT * FROM auth_accounts WHERE id = ?
  `),
  updateAuthAccountLogin: db.prepare(`
    UPDATE auth_accounts
    SET user_record_id = ?, last_login_at = ?, updated_date = ?
    WHERE id = ?
  `),
  updateAuthAccountPassword: db.prepare(`
    UPDATE auth_accounts
    SET password_hash = ?, updated_date = ?
    WHERE id = ?
  `),
  insertAuthSession: db.prepare(`
    INSERT INTO auth_sessions (
      id, account_id, user_record_id, email, token_hash, created_date,
      expires_at, revoked_at, user_agent, ip_address
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  getAuthSessionByTokenHash: db.prepare(`
    SELECT * FROM auth_sessions
    WHERE token_hash = ?
  `),
  revokeAuthSession: db.prepare(`
    UPDATE auth_sessions
    SET revoked_at = ?
    WHERE token_hash = ? AND revoked_at IS NULL
  `),
  deleteAuthSessionsByAccountOrEmail: db.prepare(`
    DELETE FROM auth_sessions
    WHERE account_id = ? OR email = ?
  `),
  insertAuthAuditLog: db.prepare(`
    INSERT INTO auth_audit_logs (
      id, event_type, email, account_id, ip_address, user_agent, metadata, created_date
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `),
  deleteAuthAuditLogsByAccountOrEmail: db.prepare(`
    DELETE FROM auth_audit_logs
    WHERE account_id = ? OR email = ?
  `),
  deleteAuthAccount: db.prepare(`
    DELETE FROM auth_accounts
    WHERE id = ?
  `),
  insertPostView: db.prepare(`
    INSERT INTO post_views (
      id, post_id, viewer_user_id, viewer_session_hash, created_at, user_agent
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `),
  listPostViewsByPost: db.prepare(`
    SELECT * FROM post_views WHERE post_id = ? ORDER BY created_at DESC
  `)
};

function existsSafe(targetPath) {
  try {
    return fs.existsSync(targetPath);
  } catch {
    return false;
  }
}

function getDatabaseMode() {
  return "sqlite";
}

function getDatabaseStatus() {
  return {
    type: getDatabaseMode(),
    configured: Boolean(DB_PATH),
    directoryExists: existsSafe(path.dirname(DB_PATH)),
    fileExists: existsSafe(DB_PATH)
  };
}

module.exports = {
  db,
  getDatabaseMode,
  getDatabaseStatus,
  statements
};

