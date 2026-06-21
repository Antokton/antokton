const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");

const ROOT_DIR = path.resolve(__dirname, "..");
const ANTOKTON_SCHEMA_DIR = path.join(ROOT_DIR, "antokton-export", "antokton-reference", "entities");
const LEGACY_SCHEMA_DIR = path.join(ROOT_DIR, "antokton-export", "base44", "entities");
const SCHEMA_DIR = fs.existsSync(ANTOKTON_SCHEMA_DIR) ? ANTOKTON_SCHEMA_DIR : LEGACY_SCHEMA_DIR;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, "uploads");
const REMOTE_ASSET_DIR = path.join(UPLOAD_DIR, "remote");
const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, "antokton.sqlite");
const APP_ID = process.env.APP_ID || "6991d40eddf82cc25ec834a7";
const LIVE_ORIGIN = (process.env.LIVE_ORIGIN || "https://antokton.com").replace(/\/+$/, "");
const BASE44_API_URL = (process.env.BASE44_API_URL || "https://app.base44.com").replace(/\/+$/, "");
const LIVE_AUTHORIZATION = process.env.LIVE_AUTHORIZATION || "";
const LIVE_COOKIE = process.env.LIVE_COOKIE || "";
const DEFAULT_LIMIT = Number(process.env.LIVE_IMPORT_LIMIT || 5000);
const MAX_REMOTE_ASSET_BYTES = Number(process.env.MAX_REMOTE_ASSET_BYTES || 75 * 1024 * 1024);

const FALLBACK_ENTITIES = [
  "AdminAction",
  "AntonktonProject",
  "Certification",
  "CharityProject",
  "ChatMessage",
  "CommentLike",
  "CommentReport",
  "CompanyProfile",
  "CompanyRating",
  "ContactMessage",
  "ContentModeration",
  "CountrySuggestion",
  "DetailedRating",
  "EducationPartner",
  "Event",
  "EventParticipant",
  "EventRegistration",
  "FeaturedJob",
  "ImportedPost",
  "ImportFailure",
  "Job",
  "JobApplication",
  "JobComment",
  "JobMatch",
  "JobReaction",
  "JobTemplate",
  "JobView",
  "MediaChannel",
  "MediaPost",
  "NavConfig",
  "Notification",
  "NotificationPreference",
  "Partner",
  "PremiumSubscription",
  "ProfessionSuggestion",
  "ProfileView",
  "Questionnaire",
  "Rating",
  "Report",
  "SavedSearch",
  "SiteConfig",
  "StaffMessage",
  "Status",
  "StatusComment",
  "User",
  "UserActivity",
  "UserReference"
];

function loadDefaultEntities() {
  try {
    const entities = fs.readdirSync(SCHEMA_DIR)
      .filter((file) => file.endsWith(".jsonc") || file.endsWith(".json"))
      .map((file) => path.basename(file, path.extname(file)))
      .sort();
    return entities.length ? entities : FALLBACK_ENTITIES;
  } catch {
    return FALLBACK_ENTITIES;
  }
}

function readCliAuthorization() {
  if (LIVE_AUTHORIZATION) return LIVE_AUTHORIZATION;

  const authPath = path.join(os.homedir(), ".base44", "auth", "auth.json");
  try {
    const auth = JSON.parse(fs.readFileSync(authPath, "utf8"));
    if (auth.accessToken) return `Bearer ${auth.accessToken}`;
  } catch {
    // Public imports still work without a Base44 CLI login.
  }

  return "";
}

const DEFAULT_ENTITIES = loadDefaultEntities();
let IMPORT_AUTHORIZATION = "";
let IMPORT_AUTH_SOURCE = "none/public";

async function resolveImportAuthorization() {
  if (LIVE_AUTHORIZATION) {
    IMPORT_AUTH_SOURCE = "env";
    return LIVE_AUTHORIZATION;
  }

  const cliAuthorization = readCliAuthorization();
  if (!cliAuthorization) return "";

  try {
    const response = await fetch(`${BASE44_API_URL}/api/apps/${APP_ID}/auth/token`, {
      headers: {
        "Accept": "application/json",
        "Authorization": cliAuthorization,
        "User-Agent": "Antokton local live importer"
      },
      signal: AbortSignal.timeout(30000)
    });
    const payload = await response.json().catch(() => ({}));
    if (response.ok && payload.token) {
      IMPORT_AUTH_SOURCE = "Base44 app-user";
      return `Bearer ${payload.token}`;
    }
  } catch {
    // Fall through to the CLI token. Public/project-level entities may still work.
  }

  IMPORT_AUTH_SOURCE = "Base44 CLI";
  return cliAuthorization;
}

const ASSET_EXTENSIONS = new Set([
  ".avif", ".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp",
  ".mp4", ".webm", ".mov", ".m4v",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"
]);
const ASSET_KEY_RE = /(^|[_-])(image|images|img|photo|avatar|logo|cover|background|thumbnail|media|attachment|file|report)([_-]|$)/i;
const EXTERNAL_ONLY_KEY_RE = /(^|[_-])(website|site|stream|registration|donation|meeting|source|facebook|instagram|linkedin|twitter|whatsapp|telegram|maps?)([_-]|$)/i;
const remoteAssetCache = new Map();

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(REMOTE_ASSET_DIR, { recursive: true });

const args = new Map();
for (const arg of process.argv.slice(2)) {
  const [key, value = "true"] = arg.replace(/^--/, "").split("=");
  args.set(key, value);
}

const dryRun = args.get("dry-run") === "true";
const limit = Number(args.get("limit") || DEFAULT_LIMIT);
const entities = (args.get("entities")
  ? args.get("entities").split(",")
  : DEFAULT_ENTITIES
).map((entity) => entity.trim()).filter(Boolean);

const db = new DatabaseSync(DB_PATH);
db.exec(`
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
`);

const upsertRecord = db.prepare(`
  INSERT INTO entity_records (id, app_id, entity, data, created_date, updated_date)
  VALUES (?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    app_id = excluded.app_id,
    entity = excluded.entity,
    data = excluded.data,
    updated_date = excluded.updated_date
`);

const insertFile = db.prepare(`
  INSERT OR IGNORE INTO uploaded_files (id, filename, mime_type, size, disk_path, public_url, created_date)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

function now() {
  return new Date().toISOString();
}

function hashText(text) {
  return crypto.createHash("sha1").update(String(text)).digest("hex").slice(0, 16);
}

function sanitizeFilenamePart(text) {
  return String(text || "asset")
    .replace(/%[0-9a-f]{2}/gi, "_")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 90) || "asset";
}

function extensionFromContentType(contentType) {
  const clean = String(contentType || "").split(";")[0].trim().toLowerCase();
  const map = {
    "image/avif": ".avif",
    "image/gif": ".gif",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/svg+xml": ".svg",
    "image/webp": ".webp",
    "video/mp4": ".mp4",
    "video/quicktime": ".mov",
    "video/webm": ".webm",
    "application/pdf": ".pdf",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/vnd.ms-excel": ".xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
    "application/vnd.ms-powerpoint": ".ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx"
  };
  return map[clean] || "";
}

function parseRemoteHttpUrl(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;
  try {
    return new URL(trimmed);
  } catch {
    return null;
  }
}

function shouldLocalizeAsset(value, keyPath) {
  const url = parseRemoteHttpUrl(value);
  if (!url) return false;

  const lastKey = String(keyPath[keyPath.length - 1] || "");
  const keyText = keyPath.join("_");
  const ext = path.extname(url.pathname).toLowerCase();

  if (ASSET_EXTENSIONS.has(ext)) return true;
  if (ASSET_KEY_RE.test(keyText) && !EXTERNAL_ONLY_KEY_RE.test(lastKey)) return true;

  return false;
}

function localAssetName(urlText, contentType) {
  const url = new URL(urlText);
  const originalBase = sanitizeFilenamePart(path.basename(url.pathname) || "asset");
  const originalExt = path.extname(originalBase).toLowerCase();
  const contentExt = extensionFromContentType(contentType);
  const ext = ASSET_EXTENSIONS.has(originalExt) ? originalExt : contentExt || ".bin";
  const base = sanitizeFilenamePart(path.basename(originalBase, originalExt));
  return `${hashText(urlText)}-${base}${ext}`;
}

async function cacheRemoteAsset(urlText) {
  if (remoteAssetCache.has(urlText)) return remoteAssetCache.get(urlText);

  const probeName = `${hashText(urlText)}-`;
  const existing = fs.readdirSync(REMOTE_ASSET_DIR).find((file) => file.startsWith(probeName));
  if (existing) {
    const publicUrl = `/uploads/remote/${existing}`;
    remoteAssetCache.set(urlText, publicUrl);
    return publicUrl;
  }

  const response = await fetch(urlText, {
    headers: { "User-Agent": "Antokton local live importer" },
    signal: AbortSignal.timeout(25000)
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength && contentLength > MAX_REMOTE_ASSET_BYTES) {
    throw new Error(`Remote asset is too large (${contentLength} bytes)`);
  }

  const contentType = response.headers.get("content-type") || "";
  const fileName = localAssetName(urlText, contentType);
  const diskPath = path.join(REMOTE_ASSET_DIR, fileName);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > MAX_REMOTE_ASSET_BYTES) {
    throw new Error(`Remote asset is too large (${buffer.length} bytes)`);
  }

  if (!dryRun) {
    fs.writeFileSync(diskPath, buffer);
    insertFile.run(
      crypto.randomUUID(),
      path.basename(new URL(urlText).pathname) || fileName,
      contentType,
      buffer.length,
      diskPath,
      `/uploads/remote/${fileName}`,
      now()
    );
  }

  const publicUrl = `/uploads/remote/${fileName}`;
  remoteAssetCache.set(urlText, publicUrl);
  return publicUrl;
}

async function localizeRemoteAssets(value, keyPath = []) {
  if (Array.isArray(value)) {
    const items = [];
    for (let index = 0; index < value.length; index += 1) {
      items.push(await localizeRemoteAssets(value[index], [...keyPath, String(index)]));
    }
    return items;
  }

  if (value && typeof value === "object") {
    const next = {};
    for (const [key, nested] of Object.entries(value)) {
      next[key] = await localizeRemoteAssets(nested, [...keyPath, key]);
    }
    return next;
  }

  if (!shouldLocalizeAsset(value, keyPath)) return value;

  try {
    return await cacheRemoteAsset(value);
  } catch (error) {
    console.warn(`  asset skipped: ${value} (${error.message})`);
    return value;
  }
}

function headers() {
  const out = {
    "Accept": "application/json",
    "User-Agent": "Antokton local live importer"
  };
  if (IMPORT_AUTHORIZATION) out.Authorization = IMPORT_AUTHORIZATION;
  if (LIVE_COOKIE) out.Cookie = LIVE_COOKIE;
  return out;
}

async function fetchEntity(entity) {
  const query = new URLSearchParams({
    limit: String(limit),
    sort: "-created_date"
  });
  const url = `${LIVE_ORIGIN}/api/apps/${APP_ID}/entities/${encodeURIComponent(entity)}?${query}`;
  const response = await fetch(url, {
    headers: headers(),
    signal: AbortSignal.timeout(30000)
  });

  const text = await response.text();
  if (!response.ok) {
    return {
      entity,
      status: response.status,
      imported: 0,
      skipped: true,
      message: text.slice(0, 200)
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return {
      entity,
      status: response.status,
      imported: 0,
      skipped: true,
      message: "Response was not JSON"
    };
  }

  const records = Array.isArray(parsed) ? parsed : Array.isArray(parsed.data) ? parsed.data : [];
  return { entity, status: response.status, records };
}

function stripMeta(record) {
  const {
    id,
    created_date,
    updated_date,
    created_at,
    updated_at,
    ...data
  } = record || {};
  return {
    id: id || crypto.randomUUID(),
    createdDate: created_date || created_at || now(),
    updatedDate: updated_date || updated_at || created_date || created_at || now(),
    data
  };
}

async function importEntity(entity) {
  const fetched = await fetchEntity(entity);
  if (fetched.skipped) return fetched;

  let imported = 0;
  for (const record of fetched.records) {
    const clean = stripMeta(record);
    const localized = await localizeRemoteAssets(clean.data, [entity]);
    if (!dryRun) {
      upsertRecord.run(
        clean.id,
        APP_ID,
        entity,
        JSON.stringify(localized),
        clean.createdDate,
        clean.updatedDate
      );
    }
    imported += 1;
  }

  return {
    entity,
    status: fetched.status,
    imported,
    skipped: false
  };
}

async function main() {
  IMPORT_AUTHORIZATION = await resolveImportAuthorization();

  console.log(`Live origin: ${LIVE_ORIGIN}`);
  console.log(`Database: ${DB_PATH}`);
  console.log(`Mode: ${dryRun ? "dry-run" : "apply"}`);
  console.log(`Entities: ${entities.length}`);
  console.log(`Auth: ${IMPORT_AUTH_SOURCE}`);

  const results = [];
  for (const entity of entities) {
    process.stdout.write(`${entity} ... `);
    try {
      const result = await importEntity(entity);
      results.push(result);
      if (result.skipped) {
        console.log(`skipped (${result.status}) ${result.message || ""}`);
      } else {
        console.log(`${result.imported} records`);
      }
    } catch (error) {
      const result = { entity, imported: 0, skipped: true, message: error.message };
      results.push(result);
      console.log(`failed: ${error.message}`);
    }
  }

  const importedTotal = results.reduce((sum, item) => sum + (item.imported || 0), 0);
  const skipped = results.filter((item) => item.skipped).map((item) => item.entity);
  console.log(JSON.stringify({
    importedTotal,
    entitiesImported: results.filter((item) => !item.skipped && item.imported > 0).length,
    entitiesSkipped: skipped.length,
    skipped
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
