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
