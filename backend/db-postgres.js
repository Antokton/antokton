const { Pool } = require("pg");
const { config } = require("./config");

const pool = new Pool({
  connectionString: config.DATABASE_URL,
  ssl: config.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
});

pool.on("error", (err) => {
  console.error("PostgreSQL pool error:", err.message);
});

// Schema uses TEXT for all values so row data is always strings,
// exactly matching the SQLite column layout that server.js expects.
const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS entity_records (
  id TEXT PRIMARY KEY,
  app_id TEXT NOT NULL,
  entity TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT '{}',
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
  FOREIGN KEY (account_id) REFERENCES auth_accounts(id) ON DELETE CASCADE
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
`;

async function initializeAsync() {
  const client = await pool.connect();
  try {
    await client.query(SCHEMA_SQL);
    console.log("PostgreSQL schema verified/initialized");
  } finally {
    client.release();
  }
}

async function q(sql, params = []) {
  return pool.query(sql, params);
}

// Normalize a row coming from PostgreSQL so that:
// - JSONB columns (returned as objects) are stringified back to JSON strings
// - TIMESTAMPTZ columns (returned as Date objects) become ISO strings
// This ensures full compatibility with server.js code that calls JSON.parse(row.data).
function normalizeVal(val) {
  if (val instanceof Date) return val.toISOString();
  if (val !== null && val !== undefined && typeof val === "object") return JSON.stringify(val);
  return val;
}

function normalizeRow(row) {
  if (!row) return null;
  const out = {};
  for (const [k, v] of Object.entries(row)) out[k] = normalizeVal(v);
  return out;
}

function firstRow(result) {
  return normalizeRow(result.rows[0] || null);
}

function allRows(result) {
  return result.rows.map(normalizeRow);
}

function changes(result) {
  return { changes: result.rowCount || 0 };
}

const statements = {
  insertEntity: {
    async run(id, appId, entity, data, createdDate, updatedDate) {
      await q(
        `INSERT INTO entity_records (id, app_id, entity, data, created_date, updated_date)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [id, appId, entity, data, createdDate, updatedDate]
      );
      return { changes: 1 };
    }
  },
  updateEntity: {
    async run(data, updatedDate, appId, entity, id) {
      const result = await q(
        `UPDATE entity_records SET data=$1, updated_date=$2
         WHERE app_id=$3 AND entity=$4 AND id=$5`,
        [data, updatedDate, appId, entity, id]
      );
      return changes(result);
    }
  },
  deleteEntity: {
    async run(appId, entity, id) {
      const result = await q(
        `DELETE FROM entity_records WHERE app_id=$1 AND entity=$2 AND id=$3`,
        [appId, entity, id]
      );
      return changes(result);
    }
  },
  getEntity: {
    async get(appId, entity, id) {
      const result = await q(
        `SELECT * FROM entity_records WHERE app_id=$1 AND entity=$2 AND id=$3`,
        [appId, entity, id]
      );
      return firstRow(result);
    }
  },
  listEntity: {
    async all(appId, entity) {
      const result = await q(
        `SELECT * FROM entity_records WHERE app_id=$1 AND entity=$2`,
        [appId, entity]
      );
      return allRows(result);
    }
  },
  insertFile: {
    async run(id, filename, mimeType, size, diskPath, publicUrl, createdDate) {
      await q(
        `INSERT INTO uploaded_files (id, filename, mime_type, size, disk_path, public_url, created_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [id, filename, mimeType, size, diskPath, publicUrl, createdDate]
      );
      return { changes: 1 };
    }
  },
  insertEmail: {
    async run(id, payload, createdDate) {
      await q(
        `INSERT INTO email_logs (id, payload, created_date) VALUES ($1,$2,$3)`,
        [id, payload, createdDate]
      );
      return { changes: 1 };
    }
  },
  insertFunctionLog: {
    async run(id, functionName, payload, result, createdDate) {
      await q(
        `INSERT INTO function_logs (id, function_name, payload, result, created_date)
         VALUES ($1,$2,$3,$4,$5)`,
        [id, functionName, payload, result, createdDate]
      );
      return { changes: 1 };
    }
  },
  upsertSchema: {
    async run(entity, schemaJson, sourcePath, loadedAt) {
      await q(
        `INSERT INTO entity_schemas (entity, schema_json, source_path, loaded_at)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT(entity) DO UPDATE
           SET schema_json=$2, source_path=$3, loaded_at=$4`,
        [entity, schemaJson, sourcePath, loadedAt]
      );
      return { changes: 1 };
    }
  },
  countAuthAccounts: {
    async get() {
      const result = await q(`SELECT COUNT(*)::int AS count FROM auth_accounts`);
      return firstRow(result);
    }
  },
  insertAuthAccount: {
    async run(id, email, userRecordId, passwordHash, status, emailVerifiedAt, createdDate, updatedDate, lastLoginAt) {
      await q(
        `INSERT INTO auth_accounts
           (id, email, user_record_id, password_hash, status, email_verified_at,
            created_date, updated_date, last_login_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [id, email, userRecordId, passwordHash, status, emailVerifiedAt,
          createdDate, updatedDate, lastLoginAt]
      );
      return { changes: 1 };
    }
  },
  getAuthAccountByEmail: {
    async get(email) {
      const result = await q(
        `SELECT * FROM auth_accounts WHERE email=$1`,
        [email]
      );
      return firstRow(result);
    }
  },
  listAuthAccountsByEmailLike: {
    async all(pattern) {
      const result = await q(
        `SELECT * FROM auth_accounts WHERE email LIKE $1`,
        [pattern]
      );
      return allRows(result);
    }
  },
  getAuthAccountById: {
    async get(id) {
      const result = await q(
        `SELECT * FROM auth_accounts WHERE id=$1`,
        [id]
      );
      return firstRow(result);
    }
  },
  updateAuthAccountLogin: {
    async run(userRecordId, lastLoginAt, updatedDate, id) {
      const result = await q(
        `UPDATE auth_accounts
         SET user_record_id=$1, last_login_at=$2, updated_date=$3
         WHERE id=$4`,
        [userRecordId, lastLoginAt, updatedDate, id]
      );
      return changes(result);
    }
  },
  updateAuthAccountPassword: {
    async run(passwordHash, updatedDate, id) {
      const result = await q(
        `UPDATE auth_accounts SET password_hash=$1, updated_date=$2 WHERE id=$3`,
        [passwordHash, updatedDate, id]
      );
      return changes(result);
    }
  },
  insertAuthSession: {
    async run(id, accountId, userRecordId, email, tokenHash, createdDate, expiresAt, revokedAt, userAgent, ipAddress) {
      await q(
        `INSERT INTO auth_sessions
           (id, account_id, user_record_id, email, token_hash,
            created_date, expires_at, revoked_at, user_agent, ip_address)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [id, accountId, userRecordId, email, tokenHash,
          createdDate, expiresAt, revokedAt, userAgent, ipAddress]
      );
      return { changes: 1 };
    }
  },
  getAuthSessionByTokenHash: {
    async get(tokenHash) {
      const result = await q(
        `SELECT * FROM auth_sessions WHERE token_hash=$1`,
        [tokenHash]
      );
      return firstRow(result);
    }
  },
  revokeAuthSession: {
    async run(revokedAt, tokenHash) {
      const result = await q(
        `UPDATE auth_sessions SET revoked_at=$1
         WHERE token_hash=$2 AND revoked_at IS NULL`,
        [revokedAt, tokenHash]
      );
      return changes(result);
    }
  },
  deleteAuthSessionsByAccountOrEmail: {
    async run(accountId, email) {
      const result = await q(
        `DELETE FROM auth_sessions WHERE account_id=$1 OR email=$2`,
        [accountId, email]
      );
      return changes(result);
    }
  },
  insertAuthAuditLog: {
    async run(id, eventType, email, accountId, ipAddress, userAgent, metadata, createdDate) {
      await q(
        `INSERT INTO auth_audit_logs
           (id, event_type, email, account_id, ip_address, user_agent, metadata, created_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [id, eventType, email, accountId, ipAddress, userAgent, metadata, createdDate]
      );
      return { changes: 1 };
    }
  },
  deleteAuthAuditLogsByAccountOrEmail: {
    async run(accountId, email) {
      const result = await q(
        `DELETE FROM auth_audit_logs WHERE account_id=$1 OR email=$2`,
        [accountId, email]
      );
      return changes(result);
    }
  },
  deleteAuthAccount: {
    async run(id) {
      const result = await q(
        `DELETE FROM auth_accounts WHERE id=$1`,
        [id]
      );
      return changes(result);
    }
  },
  insertPostView: {
    async run(id, postId, viewerUserId, viewerSessionHash, createdAt, userAgent) {
      await q(
        `INSERT INTO post_views
           (id, post_id, viewer_user_id, viewer_session_hash, created_at, user_agent)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [id, postId, viewerUserId, viewerSessionHash, createdAt, userAgent]
      );
      return { changes: 1 };
    }
  },
  listPostViewsByPost: {
    async all(postId) {
      const result = await q(
        `SELECT * FROM post_views WHERE post_id=$1 ORDER BY created_at DESC`,
        [postId]
      );
      return allRows(result);
    }
  }
};

function getDatabaseMode() {
  return "postgres";
}

function getDatabaseStatus() {
  const url = config.DATABASE_URL || "";
  return {
    type: "postgres",
    configured: Boolean(url),
    url: url ? url.replace(/:([^:@]+)@/, ":***@") : null
  };
}

module.exports = {
  getDatabaseMode,
  getDatabaseStatus,
  initializeAsync,
  statements
};
