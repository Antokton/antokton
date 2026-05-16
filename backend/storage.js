const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { config } = require("./config");

const { UPLOAD_DIR, REMOTE_ASSET_DIR } = config;

fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(REMOTE_ASSET_DIR, { recursive: true });

const ASSET_EXTENSIONS = new Set([
  ".avif", ".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp",
  ".mp4", ".webm", ".mov", ".m4v",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"
]);
const ASSET_KEY_RE = /(^|[_-])(image|images|img|photo|avatar|logo|cover|background|thumbnail|media|attachment|file)([_-]|$)/i;
const EXTERNAL_ONLY_KEY_RE = /(^|[_-])(website|site|stream|registration|donation|meeting|source|facebook|instagram|linkedin|twitter|whatsapp|telegram|maps?)([_-]|$)/i;
const remoteAssetCache = new Map();

function existsSafe(targetPath) {
  try {
    return fs.existsSync(targetPath);
  } catch {
    return false;
  }
}

function getStorageMode() {
  return "local";
}

function getStorageStatus() {
  return {
    storageMode: getStorageMode(),
    uploadDirExists: existsSafe(UPLOAD_DIR),
    remoteAssetDirExists: existsSafe(REMOTE_ASSET_DIR)
  };
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

function mimeTypeForPath(filePath) {
  const map = {
    ".avif": "image/avif",
    ".css": "text/css; charset=utf-8",
    ".gif": "image/gif",
    ".html": "text/html; charset=utf-8",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".m4v": "video/x-m4v",
    ".mov": "video/quicktime",
    ".mp4": "video/mp4",
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".webm": "video/webm",
    ".webp": "image/webp"
  };
  return map[path.extname(filePath).toLowerCase()] || "application/octet-stream";
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

function getRemoteAssetPublicUrl(fileName) {
  return `/uploads/remote/${fileName}`;
}

function rememberRemoteAsset(urlText, publicUrl) {
  remoteAssetCache.set(urlText, publicUrl);
}

function getUploadPublicUrl(fileName) {
  return `/uploads/${fileName}`;
}

function getUploadFilePath(relativePath) {
  const relativeUploadPath = decodeURIComponent(relativePath).replace(/\\/g, "/");
  if (!relativeUploadPath || relativeUploadPath.split("/").some((part) => part === "..")) {
    return null;
  }

  return path.join(UPLOAD_DIR, ...relativeUploadPath.split("/"));
}

function saveUploadedFile(file) {
  const id = crypto.randomUUID();
  const filename = `${id}_${file.filename.replace(/[^\w.-]/g, "_")}`;
  const diskPath = path.join(UPLOAD_DIR, filename);
  fs.writeFileSync(diskPath, file.content);

  const publicUrl = getUploadPublicUrl(filename);
  return {
    id,
    originalFilename: file.filename,
    contentType: file.contentType,
    size: file.content.length,
    diskPath,
    publicUrl
  };
}

async function cacheRemoteAssetFile(urlText, maxBytes) {
  if (remoteAssetCache.has(urlText)) {
    return { publicUrl: remoteAssetCache.get(urlText), fileRecord: null };
  }

  const probeName = `${hashText(urlText)}-`;
  const existing = fs.readdirSync(REMOTE_ASSET_DIR).find((file) => file.startsWith(probeName));
  if (existing) {
    const publicUrl = getRemoteAssetPublicUrl(existing);
    remoteAssetCache.set(urlText, publicUrl);
    return { publicUrl, fileRecord: null };
  }

  const response = await fetch(urlText, {
    headers: { "User-Agent": "Antokton local asset cache" },
    signal: AbortSignal.timeout(20000)
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength && contentLength > maxBytes) {
    throw new Error(`Remote asset is too large (${contentLength} bytes)`);
  }

  const contentType = response.headers.get("content-type") || "";
  const fileName = localAssetName(urlText, contentType);
  const diskPath = path.join(REMOTE_ASSET_DIR, fileName);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > maxBytes) {
    throw new Error(`Remote asset is too large (${buffer.length} bytes)`);
  }

  fs.writeFileSync(diskPath, buffer);
  const publicUrl = getRemoteAssetPublicUrl(fileName);
  return {
    publicUrl,
    fileRecord: {
      id: crypto.randomUUID(),
      filename: path.basename(new URL(urlText).pathname) || fileName,
      mimeType: contentType,
      size: buffer.length,
      diskPath,
      publicUrl
    }
  };
}

module.exports = {
  cacheRemoteAssetFile,
  getRemoteAssetPublicUrl,
  getStorageMode,
  getStorageStatus,
  getUploadFilePath,
  getUploadPublicUrl,
  mimeTypeForPath,
  rememberRemoteAsset,
  saveUploadedFile,
  shouldLocalizeAsset
};
