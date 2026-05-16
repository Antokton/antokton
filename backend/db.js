const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const { config } = require("./config");

const { DATA_DIR, DB_PATH } = config;

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);

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
