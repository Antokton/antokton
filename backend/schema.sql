PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- Base44 entities are schemaless from the frontend point of view.
-- This table stores every Antokton entity as JSON while preserving
-- id, created_date and updated_date for sorting and API compatibility.
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

-- Uploaded files from Core.UploadFile.
CREATE TABLE IF NOT EXISTS uploaded_files (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  mime_type TEXT,
  size INTEGER NOT NULL,
  disk_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  created_date TEXT NOT NULL
);

-- Core.SendEmail is logged here until SMTP/provider config is added.
CREATE TABLE IF NOT EXISTS email_logs (
  id TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  created_date TEXT NOT NULL
);

-- Function calls are logged so missing custom functions can be filled in safely.
CREATE TABLE IF NOT EXISTS function_logs (
  id TEXT PRIMARY KEY,
  function_name TEXT NOT NULL,
  payload TEXT,
  result TEXT,
  created_date TEXT NOT NULL
);

-- Exported JSONC schemas from antokton-export/antokton-reference/entities.
CREATE TABLE IF NOT EXISTS entity_schemas (
  entity TEXT PRIMARY KEY,
  schema_json TEXT NOT NULL,
  source_path TEXT,
  loaded_at TEXT NOT NULL
);

-- Production beta authentication accounts.
-- Passwords are stored as scrypt hashes; plaintext passwords are never stored.
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

-- Opaque bearer sessions. Only token hashes are stored server-side.
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
