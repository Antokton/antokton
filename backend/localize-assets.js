const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");

const ROOT_DIR = path.resolve(__dirname, "..");
const EXPORT_DIR = path.join(ROOT_DIR, "antokton-export");
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "data", "antokton.sqlite");
const ASSET_DIR = path.join(EXPORT_DIR, "public", "local-assets", "content");
const PUBLIC_PREFIX = "/local-assets/content";
const APP_ID = process.env.APP_ID || "6991d40eddf82cc25ec834a7";

const mode = process.argv.includes("--apply") ? "apply" : "dry-run";

const IMAGE_EXTENSIONS = new Set([".avif", ".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp"]);
const KNOWN_ASSET_EXTENSIONS = new Set([
  ...IMAGE_EXTENSIONS,
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt"
]);

const ASSET_KEY_RE = /(^|[_-])(image|images|img|photo|avatar|logo|cover|background|thumbnail|media|attachment|file)([_-]|$)/i;
const EXTERNAL_ONLY_KEY_RE = /(^|[_-])(website|site|stream|registration|donation|meeting|source|facebook|instagram|linkedin|twitter|whatsapp|telegram|maps?)([_-]|$)/i;

function sha(text) {
  return crypto.createHash("sha1").update(text).digest("hex").slice(0, 12);
}

function sanitizeName(name) {
  return (name || "asset")
    .replace(/%[0-9a-f]{2}/gi, "_")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "asset";
}

function extensionFromContentType(contentType) {
  const clean = String(contentType || "").split(";")[0].trim().toLowerCase();
  const map = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/svg+xml": ".svg",
    "image/avif": ".avif",
    "application/pdf": ".pdf",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/vnd.ms-excel": ".xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx"
  };
  return map[clean] || "";
}

function parseExternalUrl(value) {
  if (typeof value !== "string") return null;
  if (!/^https?:\/\//i.test(value.trim())) return null;
  try {
    return new URL(value.trim());
  } catch {
    return null;
  }
}

function isAssetCandidate(value, keyPath) {
  const url = parseExternalUrl(value);
  if (!url) return false;

  const lastKey = String(keyPath[keyPath.length - 1] || "");
  const keyText = keyPath.join("_");
  const ext = path.extname(url.pathname).toLowerCase();

  if (KNOWN_ASSET_EXTENSIONS.has(ext)) return true;
  if (ASSET_KEY_RE.test(keyText) && !EXTERNAL_ONLY_KEY_RE.test(lastKey)) return true;

  return false;
}

function localNameForUrl(urlText, contentType) {
  const url = new URL(urlText);
  const originalBase = sanitizeName(path.basename(url.pathname) || "asset");
  const originalExt = path.extname(originalBase).toLowerCase();
  const contentExt = extensionFromContentType(contentType);
  const ext = KNOWN_ASSET_EXTENSIONS.has(originalExt) ? originalExt : contentExt || ".bin";
  const baseWithoutExt = sanitizeName(path.basename(originalBase, originalExt));
  return `${sha(urlText)}-${baseWithoutExt}${ext}`;
}

async function downloadAsset(urlText, cache) {
  if (cache.has(urlText)) return cache.get(urlText);

  const response = await fetch(urlText, {
    headers: {
      "User-Agent": "Antokton local asset migrator"
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";
  const fileName = localNameForUrl(urlText, contentType);
  const diskPath = path.join(ASSET_DIR, fileName);
  const publicPath = `${PUBLIC_PREFIX}/${fileName}`;

  fs.mkdirSync(ASSET_DIR, { recursive: true });
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(diskPath, buffer);

  cache.set(urlText, publicPath);
  return publicPath;
}

async function replaceAssets(value, keyPath, cache, stats) {
  if (Array.isArray(value)) {
    let changed = false;
    const next = [];
    for (let i = 0; i < value.length; i += 1) {
      const replaced = await replaceAssets(value[i], [...keyPath, String(i)], cache, stats);
      next.push(replaced.value);
      changed ||= replaced.changed;
    }
    return { value: next, changed };
  }

  if (value && typeof value === "object") {
    let changed = false;
    const next = {};
    for (const [key, nested] of Object.entries(value)) {
      const replaced = await replaceAssets(nested, [...keyPath, key], cache, stats);
      next[key] = replaced.value;
      changed ||= replaced.changed;
    }
    return { value: next, changed };
  }

  if (!isAssetCandidate(value, keyPath)) {
    return { value, changed: false };
  }

  stats.candidates += 1;
  stats.urls.add(value);

  if (mode !== "apply") {
    return { value, changed: false };
  }

  try {
    const localPath = await downloadAsset(value, cache);
    stats.downloaded += 1;
    stats.replacements.push({ from: value, to: localPath, keyPath: keyPath.join(".") });
    return { value: localPath, changed: true };
  } catch (error) {
    stats.failed.push({ url: value, keyPath: keyPath.join("."), error: error.message });
    return { value, changed: false };
  }
}

async function main() {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`Database not found: ${DB_PATH}`);
  }

  const db = new DatabaseSync(DB_PATH);
  const rows = db.prepare("SELECT id, entity, data FROM entity_records WHERE app_id = ?").all(APP_ID);
  const update = db.prepare("UPDATE entity_records SET data = ?, updated_date = ? WHERE id = ?");
  const cache = new Map();
  const stats = {
    mode,
    rows: rows.length,
    candidates: 0,
    downloaded: 0,
    updatedRows: 0,
    urls: new Set(),
    replacements: [],
    failed: []
  };

  for (const row of rows) {
    let data;
    try {
      data = JSON.parse(row.data);
    } catch {
      continue;
    }

    const replaced = await replaceAssets(data, [row.entity], cache, stats);
    if (mode === "apply" && replaced.changed) {
      update.run(JSON.stringify(replaced.value), new Date().toISOString(), row.id);
      stats.updatedRows += 1;
    }
  }

  db.close();

  const output = {
    mode: stats.mode,
    scannedRows: stats.rows,
    assetFieldsFound: stats.candidates,
    uniqueUrlsFound: stats.urls.size,
    downloaded: stats.downloaded,
    updatedRows: stats.updatedRows,
    localAssetDir: ASSET_DIR,
    replacements: stats.replacements,
    failed: stats.failed
  };

  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
