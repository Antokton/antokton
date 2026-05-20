const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { URL } = require("node:url");
const { config, safeConfigStatus, validateStartupEnvironment } = require("./config");
const { getDatabaseMode, getDatabaseStatus, initializeAsync, statements } = require("./db");
const {
  cacheRemoteAssetFile,
  getStorageStatus,
  getUploadFilePath,
  mimeTypeForPath,
  rememberRemoteAsset,
  saveUploadedFile,
  shouldLocalizeAsset
} = require("./storage");
const {
  assertEmail,
  assertPassword,
  authenticatePassword,
  cleanupKnownTestAuthAccounts,
  createPasswordAccount,
  createSession,
  getAuthAccountByEmail,
  getAuthStatus,
  getDevUserEmail,
  getRequestUserEmail,
  isDevAuthActive,
  normalizeEmail,
  revokeRequestSession,
  setPasswordForAccount
} = require("./auth");
const { logRequestError, requestId } = require("./errorLogger");
const { consumeAuthRateLimit, consumeGeneralRateLimit } = require("./rateLimit");

const {
  ROOT_DIR,
  EXPORT_DIR,
  SCHEMA_DIR,
  DB_PATH,
  PORT,
  REQUEST_TIMEOUT_MS,
  APP_ID,
  MAX_REMOTE_ASSET_BYTES,
  STRIPE_PUBLISHABLE_KEY,
  STRIPE_FALLBACK_URL,
  AUTH_TOKEN_TTL_HOURS,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_SECURE,
  AUTH_BOOTSTRAP_ADMIN_EMAIL,
  AUTH_BOOTSTRAP_ADMIN_PASSWORD
} = config;
const DEV_USER_EMAIL = getDevUserEmail();

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Cross-Origin-Opener-Policy": "same-origin"
};

if (config.NODE_ENV === "production") {
  SECURITY_HEADERS["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
}

function stripJsonComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function loadEntitySchemas() {
  if (!fs.existsSync(SCHEMA_DIR)) return {};

  const schemas = {};
  for (const file of fs.readdirSync(SCHEMA_DIR)) {
    if (!file.endsWith(".jsonc") && !file.endsWith(".json")) continue;
    const filePath = path.join(SCHEMA_DIR, file);
    try {
      const schema = JSON.parse(stripJsonComments(fs.readFileSync(filePath, "utf8")));
      const entity = schema.name || path.basename(file, path.extname(file));
      schemas[entity] = { ...schema, source_path: filePath };
    } catch (error) {
      console.warn(`Failed to load schema ${filePath}: ${error.message}`);
    }
  }

  return schemas;
}

const entitySchemas = loadEntitySchemas();

async function persistEntitySchemas() {
  const timestamp = now();
  for (const [entity, schema] of Object.entries(entitySchemas)) {
    const { source_path, ...cleanSchema } = schema;
    await statements.upsertSchema.run(entity, JSON.stringify(cleanSchema), source_path, timestamp);
  }
}

function defaultForSchema(schema) {
  if (!schema || typeof schema !== "object") return undefined;
  if (Object.prototype.hasOwnProperty.call(schema, "default")) return schema.default;

  switch (schema.type) {
    case "array":
      return [];
    case "boolean":
      return false;
    case "integer":
    case "number":
      return 0;
    case "object":
      return {};
    default:
      return undefined;
  }
}

function applySchemaDefaults(entity, data) {
  const schema = entitySchemas[entity];
  if (!schema?.properties) return data;

  const next = { ...data };
  for (const [field, fieldSchema] of Object.entries(schema.properties)) {
    if (next[field] === undefined) {
      const value = defaultForSchema(fieldSchema);
      if (value !== undefined) next[field] = Array.isArray(value) ? [...value] : value;
    }
  }

  return next;
}

function coerceSchemaTypes(entity, data) {
  const schema = entitySchemas[entity];
  if (!schema?.properties) return data;

  const next = { ...data };
  for (const [field, fieldSchema] of Object.entries(schema.properties)) {
    if (next[field] === undefined || next[field] === null) continue;
    if (fieldSchema.type === "number" && typeof next[field] === "string" && next[field].trim() !== "") {
      const number = Number(next[field]);
      if (!Number.isNaN(number)) next[field] = number;
    }
    if (fieldSchema.type === "boolean" && typeof next[field] === "string") {
      if (next[field].toLowerCase() === "true") next[field] = true;
      if (next[field].toLowerCase() === "false") next[field] = false;
    }
  }

  return next;
}

function now() {
  return new Date().toISOString();
}

function send(res, status, body, headers = {}) {
  const baseHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-App-Id, Base44-Functions-Version",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    ...SECURITY_HEADERS,
    ...headers
  };

  if (body === undefined || body === null) {
    res.writeHead(status, baseHeaders);
    res.end();
    return;
  }

  if (Buffer.isBuffer(body)) {
    res.writeHead(status, {
      "Content-Type": "application/octet-stream",
      "Content-Length": body.length,
      ...baseHeaders
    });
    res.end(body);
    return;
  }

  if (typeof body === "string") {
    res.writeHead(status, {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Length": Buffer.byteLength(body),
      ...baseHeaders
    });
    res.end(body);
    return;
  }

  const json = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(json),
    ...baseHeaders
  });
  res.end(json);
}

function sendError(res, status, message, extra = {}, headers = {}) {
  send(res, status, { message, detail: message, ...extra }, headers);
}

function sendRateLimitError(res, rateLimit) {
  return sendError(
    res,
    429,
    "Too many attempts. Please try again later.",
    { retry_after_seconds: rateLimit.retryAfterSeconds },
    { "Retry-After": String(rateLimit.retryAfterSeconds) }
  );
}

function applyRequestTimeout(req, res) {
  req.setTimeout(REQUEST_TIMEOUT_MS, () => {
    const error = new Error("Request timed out");
    error.status = 408;
    logRequestError(error, req);
    if (!res.headersSent) sendError(res, 408, "Request timed out");
    req.destroy();
  });
}

function isGenerallyRateLimitedPath(pathname) {
  return pathname.startsWith("/api/") || pathname === "/health/config";
}

function redirect(res, location) {
  res.writeHead(302, {
    Location: location,
    ...SECURITY_HEADERS
  });
  res.end();
}

function serializeCookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push("Path=/");
  parts.push("SameSite=Lax");
  parts.push("HttpOnly");
  if (options.maxAgeSeconds !== undefined) parts.push(`Max-Age=${options.maxAgeSeconds}`);
  if (options.secure) parts.push("Secure");
  return parts.join("; ");
}

function authCookieHeader(accessToken) {
  return serializeCookie(SESSION_COOKIE_NAME, accessToken, {
    maxAgeSeconds: AUTH_TOKEN_TTL_HOURS * 60 * 60,
    secure: SESSION_COOKIE_SECURE
  });
}

function clearAuthCookieHeader() {
  return serializeCookie(SESSION_COOKIE_NAME, "", {
    maxAgeSeconds: 0,
    secure: SESSION_COOKIE_SECURE
  });
}

function recordFromRow(row) {
  if (!row) return null;
  const data = JSON.parse(row.data || "{}");
  return {
    id: row.id,
    created_date: row.created_date,
    updated_date: row.updated_date,
    ...data
  };
}

function stripMeta(data = {}) {
  const { id, created_date, updated_date, ...clean } = data;
  return clean;
}

async function cacheRemoteAsset(urlText) {
  const cached = await cacheRemoteAssetFile(urlText, MAX_REMOTE_ASSET_BYTES);
  if (cached.fileRecord) {
    await statements.insertFile.run(
      cached.fileRecord.id,
      cached.fileRecord.filename,
      cached.fileRecord.mimeType,
      cached.fileRecord.size,
      cached.fileRecord.diskPath,
      cached.fileRecord.publicUrl,
      now()
    );
    rememberRemoteAsset(urlText, cached.fileRecord.publicUrl);
  }
  return cached.publicUrl;
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
    console.warn(`Failed to cache remote asset ${value}: ${error.message}`);
    return value;
  }
}

async function findUserByEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;
  return (await statements.listEntity.all(APP_ID, "User"))
    .map(recordFromRow)
    .find((user) => normalizeEmail(user.email) === normalizedEmail) || null;
}

function isPrivilegedUser(user) {
  const role = String(user?.role || "").toLowerCase();
  const category = String(user?.member_category || "").toLowerCase();
  return ["admin", "moderator", "inspector"].includes(role) || ["admin", "moderator", "staff"].includes(category);
}

async function requesterHasRole(req, roles = []) {
  const user = await findUserByEmail(await getRequestUserEmail(req));
  const allowed = new Set(roles.map((role) => String(role).toLowerCase()));
  return allowed.has(String(user?.role || "").toLowerCase()) ||
    allowed.has(String(user?.member_category || "").toLowerCase());
}

function publicUserFields(body = {}) {
  const allowed = [
    "full_name",
    "first_name",
    "surname",
    "phone",
    "city",
    "country",
    "desired_profession",
    "current_profession",
    "user_type"
  ];
  const clean = {};
  for (const field of allowed) {
    if (body[field] !== undefined) clean[field] = body[field];
  }
  return clean;
}

function sanitizeSelfUserPatch(body = {}) {
  const trustedFields = [
    "email",
    "role",
    "member_category",
    "_app_role",
    "collaborator_role",
    "is_active",
    "status",
    "password",
    "password_hash"
  ];
  const clean = { ...body };
  for (const field of trustedFields) delete clean[field];
  return clean;
}

async function ensureUser(email = DEV_USER_EMAIL, overrides = {}) {
  const normalizedEmail = normalizeEmail(email);
  const existing = await findUserByEmail(normalizedEmail);

  if (existing) return existing;

  const isDevDefaultUser = isDevAuthActive() && normalizedEmail === normalizeEmail(DEV_USER_EMAIL);
  const created = {
    email: normalizedEmail,
    full_name: overrides.full_name || (isDevDefaultUser ? "Antokton Admin" : normalizedEmail),
    first_name: overrides.first_name || (isDevDefaultUser ? "Antokton" : ""),
    surname: overrides.surname || (isDevDefaultUser ? "Admin" : ""),
    role: overrides.role || (isDevDefaultUser ? "admin" : "user"),
    member_category: overrides.member_category || (isDevDefaultUser ? "staff" : "standard"),
    is_active: true,
    ...overrides
  };

  return createRecord("User", created, normalizedEmail);
}

async function createRecord(entity, data, userEmail) {
  const timestamp = now();
  const id = data.id || crypto.randomUUID();
  const clean = stripMeta(coerceSchemaTypes(entity, applySchemaDefaults(entity, {
    ...data,
    created_by: data.created_by || data.email || userEmail || undefined
  })));
  await statements.insertEntity.run(id, APP_ID, entity, JSON.stringify(clean), timestamp, timestamp);
  return recordFromRow(await statements.getEntity.get(APP_ID, entity, id));
}

async function updateRecord(entity, id, patch) {
  const row = (await statements.getEntity.get(APP_ID, entity, id)) || (await findRecordRowByNaturalId(entity, id));
  if (!row) return null;
  const existing = recordFromRow(row);
  const next = stripMeta(coerceSchemaTypes(entity, applySchemaDefaults(entity, { ...existing, ...patch })));
  await statements.updateEntity.run(JSON.stringify(next), now(), APP_ID, entity, row.id);
  return recordFromRow(await statements.getEntity.get(APP_ID, entity, row.id));
}

async function deleteRecord(entity, id) {
  const row = (await statements.getEntity.get(APP_ID, entity, id)) || (await findRecordRowByNaturalId(entity, id));
  if (!row) return false;
  await statements.deleteEntity.run(APP_ID, entity, row.id);
  return true;
}

async function findRecordRowByNaturalId(entity, naturalId) {
  if (!naturalId) return null;
  const records = await statements.listEntity.all(APP_ID, entity);
  return records.find((row) => {
    const record = recordFromRow(row);
    return record.email === naturalId || record.key === naturalId || record.slug === naturalId;
  }) || null;
}

function compareValues(a, b) {
  if (a === b) return 0;
  if (a === undefined || a === null) return -1;
  if (b === undefined || b === null) return 1;
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  const da = Date.parse(a);
  const db = Date.parse(b);
  if (!Number.isNaN(da) && !Number.isNaN(db)) return da - db;
  return String(a).localeCompare(String(b));
}

function matchesCondition(value, condition) {
  if (condition && typeof condition === "object" && !Array.isArray(condition)) {
    if ("$ne" in condition && value === condition.$ne) return false;
    if ("$in" in condition) return Array.isArray(condition.$in) && condition.$in.includes(value);
    if ("$nin" in condition) return Array.isArray(condition.$nin) && !condition.$nin.includes(value);
    if ("$gt" in condition && !(value > condition.$gt)) return false;
    if ("$gte" in condition && !(value >= condition.$gte)) return false;
    if ("$lt" in condition && !(value < condition.$lt)) return false;
    if ("$lte" in condition && !(value <= condition.$lte)) return false;
    if ("$contains" in condition) {
      if (Array.isArray(value)) return value.includes(condition.$contains);
      return String(value || "").includes(String(condition.$contains));
    }
    return Object.entries(condition).every(([key, nested]) => matchesCondition(value?.[key], nested));
  }

  if (Array.isArray(condition)) {
    if (Array.isArray(value)) return value.some((item) => condition.includes(item));
    return condition.includes(value);
  }

  return value === condition;
}

function filterRecords(records, query) {
  if (!query || typeof query !== "object") return records;
  return records.filter((record) =>
    Object.entries(query).every(([field, condition]) => matchesCondition(record[field], condition))
  );
}

function sortRecords(records, sort) {
  if (!sort) return records;
  const keys = String(sort)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (!keys.length) return records;

  return [...records].sort((a, b) => {
    for (const key of keys) {
      const desc = key.startsWith("-");
      const field = desc ? key.slice(1) : key;
      const result = compareValues(a[field], b[field]);
      if (result !== 0) return desc ? -result : result;
    }
    return 0;
  });
}

function selectFields(record, fields) {
  if (!fields) return record;
  const wanted = String(fields)
    .split(",")
    .map((field) => field.trim())
    .filter(Boolean);
  if (!wanted.length) return record;

  const selected = { id: record.id };
  for (const field of wanted) selected[field] = record[field];
  return selected;
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function readJson(req) {
  const buffer = await readBody(req);
  if (!buffer.length) return {};
  const text = buffer.toString("utf8");
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function parseMultipart(buffer, contentType) {
  const boundaryMatch = /boundary=([^;]+)/i.exec(contentType || "");
  if (!boundaryMatch) return {};

  const boundary = `--${boundaryMatch[1].replace(/^"|"$/g, "")}`;
  const raw = buffer.toString("binary");
  const parts = raw.split(boundary).slice(1, -1);
  const fields = {};

  for (let part of parts) {
    part = part.replace(/^\r\n/, "").replace(/\r\n$/, "");
    const headerEnd = part.indexOf("\r\n\r\n");
    if (headerEnd === -1) continue;

    const headerText = part.slice(0, headerEnd);
    const contentText = part.slice(headerEnd + 4);
    const nameMatch = /name="([^"]+)"/i.exec(headerText);
    if (!nameMatch) continue;

    const filenameMatch = /filename="([^"]*)"/i.exec(headerText);
    const typeMatch = /content-type:\s*([^\r\n]+)/i.exec(headerText);
    const name = nameMatch[1];
    const content = Buffer.from(contentText, "binary");

    if (filenameMatch) {
      fields[name] = {
        filename: path.basename(filenameMatch[1] || "upload.bin"),
        contentType: typeMatch ? typeMatch[1].trim() : "application/octet-stream",
        content
      };
    } else {
      fields[name] = content.toString("utf8");
    }
  }

  return fields;
}

async function readPayload(req) {
  const contentType = req.headers["content-type"] || "";
  const buffer = await readBody(req);

  if (contentType.includes("multipart/form-data")) {
    return parseMultipart(buffer, contentType);
  }

  if (!buffer.length) return {};

  try {
    return JSON.parse(buffer.toString("utf8"));
  } catch {
    return {};
  }
}

async function listEntity(entity, url) {
  let records = (await statements.listEntity.all(APP_ID, entity)).map(recordFromRow);
  const q = url.searchParams.get("q");
  if (q) {
    try {
      records = filterRecords(records, JSON.parse(q));
    } catch {
      records = [];
    }
  }

  records = sortRecords(records, url.searchParams.get("sort"));

  const skip = Number(url.searchParams.get("skip") || 0);
  const limit = Number(url.searchParams.get("limit") || 0);
  if (skip > 0) records = records.slice(skip);
  if (limit > 0) records = records.slice(0, limit);

  const fields = url.searchParams.get("fields");
  return fields ? records.map((record) => selectFields(record, fields)) : records;
}

async function requesterCanAuditImports(req) {
  const email = await getRequestUserEmail(req);
  const user = await findUserByEmail(email);
  return ["admin", "moderator"].includes(String(user?.role || "").toLowerCase());
}

async function redactImportedStatus(record, canAudit) {
  if (!record || !(record.imported_community_request || record.import_type === "community_request")) return record;
  if (canAudit) return record;

  const redacted = { ...record };
  delete redacted.import_source_url;
  delete redacted.import_original_author_name;
  delete redacted.import_original_text;
  delete redacted.import_private_image_url;
  delete redacted.import_profile_photo_url;
  delete redacted.importer_email;
  delete redacted.import_privacy_choices;

  if (!redacted.import_show_source_link) {
    delete redacted.link_url;
    delete redacted.link_title;
  }

  if (redacted.import_show_images === false) {
    delete redacted.image_url;
  }

  return redacted;
}

async function redactEntityForRequest(entity, payload, req) {
  if (entity !== "Status") return payload;
  const canAudit = await requesterCanAuditImports(req);
  if (Array.isArray(payload)) {
    const out = [];
    for (const record of payload) out.push(await redactImportedStatus(record, canAudit));
    return out;
  }
  return redactImportedStatus(payload, canAudit);
}

function buildEmptySchemaResult(schema) {
  const props = schema?.properties || {};
  const result = {};
  for (const [key, fieldConfig] of Object.entries(props)) {
    switch (fieldConfig.type) {
      case "boolean":
        result[key] = false;
        break;
      case "number":
      case "integer":
        result[key] = 0;
        break;
      case "array":
        result[key] = [];
        break;
      case "object":
        result[key] = {};
        break;
      default:
        result[key] = "";
    }
  }
  return result;
}

function localEntityUrl() {
  return new URL("http://local");
}

async function allRecords(entity) {
  return listEntity(entity, localEntityUrl());
}

function words(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2);
}

function overlapScore(a, b) {
  const left = new Set(words(a));
  const right = new Set(words(b));
  if (!left.size || !right.size) return 0;
  let score = 0;
  for (const word of left) {
    if (right.has(word)) score += 1;
  }
  return score;
}

function pickTopCounts(items) {
  const counts = {};
  for (const item of items.filter(Boolean)) counts[item] = (counts[item] || 0) + 1;
  return Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] || null;
}

function basicSearch(records, queryText, fields) {
  const needle = String(queryText || "").trim().toLowerCase();
  if (!needle) return records;
  return records.filter((record) =>
    fields.some((field) => String(record[field] || "").toLowerCase().includes(needle))
  );
}

async function scrapeBasicListing(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 AntoktonBot/1.0",
      Accept: "text/html,application/xhtml+xml"
    },
    signal: AbortSignal.timeout(12000)
  });
  const html = await response.text();
  const title =
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i.exec(html)?.[1] ||
    /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ||
    "";
  const description =
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)/i.exec(html)?.[1] ||
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i.exec(html)?.[1] ||
    "";
  const imageUrls = [...html.matchAll(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/gi)]
    .map((match) => match[1])
    .filter(Boolean);
  const phone = /href=["']tel:(\+?[\d\s().-]{7,})["']/i.exec(html)?.[1]?.replace(/[^\d+]/g, "") || "";

  return {
    title: title.replace(/\s+/g, " ").trim(),
    description: description.replace(/\s+/g, " ").trim(),
    image_urls: [...new Set(imageUrls)],
    phone_number: phone,
    source_url: url,
    show_source_url: true
  };
}

function minimalPdf(title) {
  const safeTitle = String(title || "Antokton").replace(/[^\x20-\x7E]/g, "");
  return Buffer.from(`%PDF-1.1
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 55 >>
stream
BT /F1 18 Tf 72 720 Td (${safeTitle}) Tj ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000209 00000 n
trailer
<< /Root 1 0 R /Size 5 >>
startxref
314
%%EOF`);
}

async function handleCoreIntegration(req, res, operation) {
  const payload = await readPayload(req);

  if (operation === "UploadFile") {
    const file = payload.file;
    if (!file || !file.content) {
      return sendError(res, 400, "Missing file field");
    }

    const saved = saveUploadedFile(file);
    await statements.insertFile.run(
      saved.id,
      saved.originalFilename,
      saved.contentType,
      saved.size,
      saved.diskPath,
      saved.publicUrl,
      now()
    );

    return send(res, 200, { file_url: saved.publicUrl, url: saved.publicUrl });
  }

  if (operation === "SendEmail") {
    await statements.insertEmail.run(crypto.randomUUID(), JSON.stringify(payload), now());
    return send(res, 200, { success: true, queued: true });
  }

  if (operation === "InvokeLLM") {
    if (payload.response_json_schema) {
      return send(res, 200, buildEmptySchemaResult(payload.response_json_schema));
    }
    return send(res, 200, { text: "" });
  }

  return send(res, 200, { success: false, message: `Core integration ${operation} is not configured yet.` });
}

async function logFunction(functionName, payload, result) {
  await statements.insertFunctionLog.run(
    crypto.randomUUID(),
    functionName,
    JSON.stringify(payload || {}),
    JSON.stringify(Buffer.isBuffer(result) ? { binary: true, size: result.length } : result || {}),
    now()
  );
}

async function handleFunction(req, res, functionName) {
  const payload = await readPayload(req);
  const userEmail = await getRequestUserEmail(req);
  const user = userEmail ? await ensureUser(userEmail) : null;
  let result;

  switch (functionName) {
    case "savePage": {
      const pageId = payload.pageId || "page";
      const data = await localizeRemoteAssets(payload.data || {}, ["SiteConfig", pageId]);
      const existing = (await listEntity("SiteConfig", new URL("http://local"))).find((item) => item.key === `static_page_${pageId}`);
      if (existing) await updateRecord("SiteConfig", existing.id, { value: JSON.stringify(data) });
      else await createRecord("SiteConfig", { key: `static_page_${pageId}`, value: JSON.stringify(data), group: "static_pages" });
      result = { success: true };
      break;
    }
    case "importJobPost":
    case "importMarketplacePost": {
      if (!payload.url) {
        result = { success: false, error: "URL is required", data: null };
        break;
      }
      try {
        const scraped = await scrapeBasicListing(payload.url);
        const localizedScraped = await localizeRemoteAssets(scraped, [functionName]);
        result = {
          success: true,
          data: {
            ...localizedScraped,
            category: payload.category || (functionName === "importMarketplacePost" ? "pazar" : "pune"),
            job_type: payload.job_type || "ofroj",
            status: "pending"
          }
        };
      } catch (error) {
        result = { success: false, error: error.message || "Import failed", data: null };
      }
      break;
    }
    case "advancedRecruiterSearch": {
      const users = (await allRecords("User")).filter((candidate) => candidate.email !== user.email);
      const queryText = [payload.skills, payload.keywords, payload.profession, payload.location].filter(Boolean).join(" ");
      const candidates = basicSearch(users, queryText, ["skills", "job_title", "bio", "location", "first_name", "surname"])
        .map((candidate) => ({
          ...candidate,
          match_score: overlapScore(queryText, [
            candidate.skills,
            candidate.job_title,
            candidate.bio,
            candidate.location
          ].join(" "))
        }))
        .filter((candidate) => candidate.match_score > 0 || !queryText)
        .sort((a, b) => b.match_score - a.match_score)
        .slice(0, 25);
      result = { candidates, summary: `${candidates.length} candidates found`, query: payload };
      break;
    }
    case "summarizeCV":
      result = {
        summary: payload.cvUrl ? "CV u pranua. Lidhe një provider AI/PDF parser për analizë të plotë." : "",
        skills: [],
        experience: "",
        cvUrl: payload.cvUrl || ""
      };
      break;
    case "aiJobMatching": {
      const users = (await allRecords("User")).filter((candidate) => candidate.user_type !== "employer");
      const jobs = (await allRecords("Job")).filter((job) => ["approved", "aktiv"].includes(job.status));
      const existing = await allRecords("JobMatch");
      let created = 0;

      for (const candidate of users) {
        const profileText = [candidate.skills, candidate.job_title, candidate.bio, candidate.location].join(" ");
        for (const job of jobs) {
          if (existing.some((match) => match.user_email === candidate.email && match.job_id === job.id)) continue;
          const jobText = [job.title, job.description, job.profession, job.required_skills, job.city, job.country].join(" ");
          const score = overlapScore(profileText, jobText);
          if (score <= 0) continue;
          await createRecord("JobMatch", {
            user_email: candidate.email,
            job_id: job.id,
            job_title: job.title,
            match_score: Math.min(100, score * 10),
            reasons: ["Aftësi/profil i ngjashëm me njoftimin"],
            is_dismissed: false
          }, userEmail);
          created += 1;
        }
      }

      result = { success: true, created };
      break;
    }
    case "generateProfileSuggestions": {
      const type = payload.suggestion_type || payload.type || "bio";
      const jobTitle = payload.job_title || payload.jobTitle || user.job_title || "profesionist";
      const skills = payload.skills || user.skills || "";
      const templates = {
        bio: `Jam ${jobTitle} me fokus në ${skills || "punë cilësore dhe bashkëpunim"}. Kërkoj mundësi ku mund të kontribuoj me përgjegjësi, komunikim të qartë dhe rezultate të matshme.`,
        skills: skills || "Komunikim, organizim, zgjidhje problemesh, punë ekipore",
        work_experience: `Përshkruaj rolin, përgjegjësitë kryesore dhe rezultatet konkrete që ke arritur si ${jobTitle}.`,
        job_description: `Përshkrim për ${jobTitle}: përgjegjësi të qarta, kërkesa profesionale, përfitime dhe mënyra e aplikimit.`
      };
      result = { success: true, suggestion: templates[type] || templates.bio };
      break;
    }
    case "generateAIDescription":
      result = {
        success: true,
        description: "Përshkrim profesional i shkurtër. Shto OpenAI/AI provider për gjenerim të personalizuar.",
        text: "Përshkrim profesional i shkurtër. Shto OpenAI/AI provider për gjenerim të personalizuar."
      };
      break;
    case "rankApplications": {
      const applications = (await allRecords("JobApplication")).filter((application) => application.job_id === payload.jobId);
      const job = (await allRecords("Job")).find((item) => item.id === payload.jobId) || {};
      result = applications
        .map((application) => ({
          ...application,
          score: overlapScore(job.required_skills || job.description || job.title, `${application.cover_letter || ""} ${application.applicant_name || ""}`) * 10,
          reason: "Renditje bazuar në përputhje tekstuale me njoftimin"
        }))
        .sort((a, b) => b.score - a.score);
      break;
    }
    case "analyzeQuestionnaireResponses": {
      const responses = (await allRecords("QuestionnaireResponse")).filter((response) => response.questionnaire_id === payload.questionnaireId);
      result = {
        summary: `${responses.length} përgjigje të mbledhura.`,
        recommendations: responses.length ? ["Shiko përgjigjet me më shumë detaje para vendimit final."] : [],
        scores: responses.map((response) => ({ id: response.id, score: 0 }))
      };
      break;
    }
    case "getRecommendations":
    case "getJobRecommendations":
    case "getRecruiterRecommendations": {
      const activities = (await allRecords("UserActivity")).filter((activity) => activity.user_email === user.email);
      const topCategory = pickTopCounts(activities.map((activity) => activity.search_filters?.category || activity.category));
      const topCountry = pickTopCounts(activities.map((activity) => activity.search_filters?.country || activity.country));
      const jobs = (await allRecords("Job"))
        .filter((job) => ["approved", "aktiv"].includes(job.status))
        .filter((job) => !topCategory || job.category === topCategory)
        .filter((job) => !topCountry || job.country === topCountry)
        .slice(0, 10);
      const users = (await allRecords("User")).filter((candidate) => candidate.email !== user.email).slice(0, 5);
      const events = (await allRecords("Event")).filter((event) => ["approved", "aktiv"].includes(event.status || "approved")).slice(0, 5);
      result = {
        jobs,
        users,
        events,
        projects: (await allRecords("AntonktonProject")).slice(0, 6),
        recommendedJobs: jobs,
        recommendedProfiles: users,
        recommendedEvents: events,
        insights: { topCategory, topCountry, totalActivities: activities.length }
      };
      break;
    }
    case "analyzeUserBehavior": {
      const email = payload.user_email || user.email;
      const activities = (await allRecords("UserActivity")).filter((activity) => activity.user_email === email);
      const grouped = {};
      for (const activity of activities) grouped[activity.activity_type || "other"] = (grouped[activity.activity_type || "other"] || 0) + 1;
      result = { analysis: `Aktivitete totale: ${activities.length}`, grouped };
      break;
    }
    case "createPremiumCheckout":
    case "createCheckout":
    case "createSubscriptionCheckout":
    case "createFeaturedCheckout": {
      const subscription = await createRecord("PremiumSubscription", {
        user_email: payload.userEmail || user.email,
        plan_type: payload.planType || payload.plan_type || "monthly",
        status: "pending",
        checkout_type: functionName
      }, userEmail);
      result = { url: STRIPE_FALLBACK_URL || `/Subscriptions?checkout_id=${subscription.id}` };
      break;
    }
    case "publishToFacebook":
      result = { success: false, message: "Facebook publishing is not configured." };
      break;
    case "notifyApprovalEmail":
      result = { success: true };
      break;
    case "generateCV":
    case "downloadEnhancedProfile": {
      result = minimalPdf(functionName === "generateCV" ? "Antokton CV" : "Antokton Profile");
      await logFunction(functionName, payload, result);
      return send(res, 200, result, { "Content-Type": "application/pdf" });
    }
    case "trackActivity":
      result = await createRecord("UserActivity", { user_email: user?.email || null, ...payload }, userEmail);
      break;
    case "getStripeConfig":
      result = { publishableKey: STRIPE_PUBLISHABLE_KEY || "" };
      break;
    case "moderateContent":
      result = { approved: true, status: "approved", reasons: [] };
      break;
    case "suggestSearchTerms":
      result = { terms: words(payload.query || "").slice(0, 8) };
      break;
    default:
      result = { success: false, message: `Function ${functionName} is not implemented yet.` };
  }

  await logFunction(functionName, payload, result);
  return send(res, 200, result);
}

async function handleEntity(req, res, url, segments) {
  const entity = decodeURIComponent(segments[4] || "");
  const tail = segments.slice(5).map(decodeURIComponent);
  const userEmail = await getRequestUserEmail(req);

  if (entity === "User" && tail[0] === "me") {
    if (!userEmail) return sendError(res, 401, "Authentication required");
    if (req.method === "GET") return send(res, 200, await ensureUser(userEmail));
    if (req.method === "PUT") {
      const body = await readJson(req);
      const user = await ensureUser(userEmail);
      const patch = config.NODE_ENV === "production" ? sanitizeSelfUserPatch(body) : body;
      const localized = await localizeRemoteAssets(patch, ["User"]);
      return send(res, 200, await updateRecord("User", user.id, localized));
    }
  }

  if (entity === "User" && req.method !== "GET" && config.NODE_ENV === "production" && !(await requesterHasRole(req, ["admin"]))) {
    return sendError(res, 403, "Admin role required");
  }

  if (!entity) return sendError(res, 400, "Missing entity name");

  if (req.method === "GET" && tail.length === 0) {
    return send(res, 200, await redactEntityForRequest(entity, await listEntity(entity, url), req));
  }

  if (req.method === "GET" && tail[0]) {
    const record = recordFromRow(
      (await statements.getEntity.get(APP_ID, entity, tail[0])) || (await findRecordRowByNaturalId(entity, tail[0]))
    );
    return record
      ? send(res, 200, await redactEntityForRequest(entity, record, req))
      : sendError(res, 404, "Record not found");
  }

  if (req.method === "POST" && tail[0] === "bulk") {
    const body = await readJson(req);
    const items = Array.isArray(body) ? body : [];
    const localizedItems = [];
    for (const item of items) localizedItems.push(await localizeRemoteAssets(item, [entity]));
    const results = [];
    for (const item of localizedItems) results.push(await createRecord(entity, item, userEmail));
    return send(res, 200, results);
  }

  if (req.method === "PUT" && tail[0] === "bulk") {
    const body = await readJson(req);
    const items = Array.isArray(body) ? body : [];
    const updated = [];
    for (const item of items.filter((candidate) => candidate.id)) {
      const localized = await localizeRemoteAssets(item, [entity]);
      const record = await updateRecord(entity, item.id, localized);
      if (record) updated.push(record);
    }
    return send(res, 200, updated);
  }

  if (req.method === "PATCH" && tail[0] === "update-many") {
    const body = await readJson(req);
    const records = filterRecords(await listEntity(entity, new URL("http://local")), body.query || {});
    const localized = await localizeRemoteAssets(body.data || {}, [entity]);
    const updated = [];
    for (const record of records) {
      const r = await updateRecord(entity, record.id, localized);
      if (r) updated.push(r);
    }
    return send(res, 200, { updated: updated.length, records: updated });
  }

  if (req.method === "POST" && tail[0] === "import") {
    return send(res, 200, { success: false, message: "CSV import is not implemented yet." });
  }

  if (req.method === "POST" && tail.length === 0) {
    const body = await readJson(req);
    const localized = await localizeRemoteAssets(body, [entity]);
    return send(res, 200, await createRecord(entity, localized, userEmail));
  }

  if (req.method === "PUT" && tail[0]) {
    const body = await readJson(req);
    const localized = await localizeRemoteAssets(body, [entity]);
    const updated = await updateRecord(entity, tail[0], localized);
    return updated ? send(res, 200, updated) : sendError(res, 404, "Record not found");
  }

  if (req.method === "DELETE" && tail[0]) {
    const ok = await deleteRecord(entity, tail[0]);
    return ok ? send(res, 200, { success: true }) : sendError(res, 404, "Record not found");
  }

  if (req.method === "DELETE" && tail.length === 0) {
    const body = await readJson(req);
    const ids = Array.isArray(body) ? body : body.ids || [];
    let deleted = 0;
    for (const id of ids) {
      if (await deleteRecord(entity, id)) deleted += 1;
    }
    return send(res, 200, { success: true, deleted });
  }

  return sendError(res, 405, "Method not allowed");
}

async function handleAuth(req, res, segments) {
  const action = segments.slice(4).join("/");

  if (req.method === "POST" && action === "login") {
    const body = await readJson(req);
    const email = normalizeEmail(body.email);
    const rateLimit = consumeAuthRateLimit("login", req, email);
    if (!rateLimit.allowed) return sendRateLimitError(res, rateLimit);

    const password = body.password;
    const account = await authenticatePassword({ email, password, req });
    const user = await ensureUser(account.email);
    const session = await createSession(account, user, req);
    return send(res, 200, {
      access_token: session.accessToken,
      token_type: session.tokenType,
      expires_at: session.expiresAt,
      user
    }, { "Set-Cookie": authCookieHeader(session.accessToken) });
  }

  if (req.method === "POST" && action === "register") {
    const body = await readJson(req);
    const rateLimit = consumeAuthRateLimit("register", req, body.email);
    if (!rateLimit.allowed) return sendRateLimitError(res, rateLimit);

    const email = assertEmail(body.email);
    assertPassword(body.password);
    const existingUser = await findUserByEmail(email);
    if (existingUser && isPrivilegedUser(existingUser)) {
      return sendError(res, 403, "Existing privileged users must be migrated by an administrator");
    }

    const user = existingUser || await ensureUser(email, {
      ...publicUserFields(body),
      role: "user",
      member_category: "standard",
      is_active: true
    });
    const account = await createPasswordAccount({ email, password: body.password, user, req });
    const session = await createSession(account, user, req);
    return send(res, 200, {
      access_token: session.accessToken,
      token_type: session.tokenType,
      expires_at: session.expiresAt,
      user
    }, { "Set-Cookie": authCookieHeader(session.accessToken) });
  }

  if (req.method === "POST" && action === "logout") {
    await revokeRequestSession(req);
    return send(res, 200, { success: true }, { "Set-Cookie": clearAuthCookieHeader() });
  }

  if (req.method === "POST" && action === "verify-otp") return send(res, 200, { success: true });
  if (req.method === "POST" && action === "resend-otp") return send(res, 200, { success: true });
  if (req.method === "POST" && action === "reset-password-request") return send(res, 200, { success: true });
  if (req.method === "POST" && action === "reset-password") return send(res, 200, { success: true });
  if (req.method === "POST" && action === "change-password") {
    const userEmail = await getRequestUserEmail(req);
    if (!userEmail) return sendError(res, 401, "Authentication required");
    const rateLimit = consumeAuthRateLimit("change-password", req, userEmail);
    if (!rateLimit.allowed) return sendRateLimitError(res, rateLimit);

    const body = await readJson(req);
    const currentPassword = body.current_password || body.currentPassword || body.old_password;
    const newPassword = body.new_password || body.newPassword || body.password;
    const account = await authenticatePassword({ email: userEmail, password: currentPassword, req });
    await setPasswordForAccount(account, newPassword, req);
    return send(res, 200, { success: true });
  }

  return sendError(res, 404, "Auth endpoint not found");
}

async function handleUsers(req, res, segments) {
  const action = segments.slice(4).join("/");
  if (req.method === "POST" && action === "invite-user") {
    if (config.NODE_ENV === "production" && !(await requesterHasRole(req, ["admin"]))) {
      return sendError(res, 403, "Admin role required");
    }
    const body = await readJson(req);
    const user = await ensureUser(body.user_email || body.email || DEV_USER_EMAIL, { role: body.role || "user" });
    return send(res, 200, user);
  }
  return sendError(res, 404, "Users endpoint not found");
}

async function bootstrapAdminAuth() {
  const email = normalizeEmail(AUTH_BOOTSTRAP_ADMIN_EMAIL);
  if (!email || !AUTH_BOOTSTRAP_ADMIN_PASSWORD) return;

  let user = await ensureUser(email, {
    full_name: "Antokton Admin",
    first_name: "Antokton",
    surname: "Admin",
    role: "admin",
    member_category: "admin",
    is_active: true
  });

  if (String(user.role || "").toLowerCase() !== "admin" || String(user.member_category || "").toLowerCase() !== "admin") {
    user = await updateRecord("User", user.id, {
      role: "admin",
      member_category: "admin",
      is_active: true
    });
  }

  const existingAccount = await getAuthAccountByEmail(email);
  if (existingAccount) {
    console.log(`Bootstrap admin auth account already exists for ${email}`);
    return;
  }

  await createPasswordAccount({
    email,
    password: AUTH_BOOTSTRAP_ADMIN_PASSWORD,
    user,
    req: null,
    emailVerified: true
  });
  console.log(`Created bootstrap admin auth account for ${email}`);
}

async function cleanupKnownTestUsers() {
  if (config.NODE_ENV !== "production") return;

  const authCleanup = await cleanupKnownTestAuthAccounts();
  let userRecordsDeleted = 0;
  const testEmailPattern = /^auth\.beta\.test\.[^@\s]+@example\.invalid$/i;

  for (const row of await statements.listEntity.all(APP_ID, "User")) {
    const record = recordFromRow(row);
    if (!testEmailPattern.test(String(record.email || ""))) continue;
    await statements.deleteEntity.run(APP_ID, "User", row.id);
    userRecordsDeleted += 1;
  }

  const totalDeleted = authCleanup.accountsDeleted + authCleanup.sessionsDeleted + authCleanup.auditLogsDeleted + userRecordsDeleted;
  if (totalDeleted > 0) {
    console.log(`Cleaned known beta test auth records: accounts=${authCleanup.accountsDeleted}, sessions=${authCleanup.sessionsDeleted}, auditLogs=${authCleanup.auditLogsDeleted}, users=${userRecordsDeleted}`);
  }
}

function serveStatic(req, res, pathname) {
  if (pathname.startsWith("/uploads/")) {
    const uploadFile = getUploadFilePath(pathname.slice("/uploads/".length));
    if (!uploadFile) {
      return sendError(res, 400, "Invalid upload path");
    }

    if (!fs.existsSync(uploadFile) || !fs.statSync(uploadFile).isFile()) {
      return sendError(res, 404, "File not found");
    }

    res.writeHead(200, {
      "Content-Type": mimeTypeForPath(uploadFile),
      "Content-Length": fs.statSync(uploadFile).size,
      "Access-Control-Allow-Origin": "*",
      ...SECURITY_HEADERS
    });
    return fs.createReadStream(uploadFile).pipe(res);
  }

  const distDir = path.join(EXPORT_DIR, "dist");
  if (fs.existsSync(distDir)) {
    const requested = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    const distPath = path.resolve(distDir, requested);
    if (distPath.startsWith(distDir) && fs.existsSync(distPath) && fs.statSync(distPath).isFile()) {
      const ext = path.extname(distPath);
      const type =
        ext === ".html" ? "text/html; charset=utf-8" :
        ext === ".js" ? "text/javascript; charset=utf-8" :
        ext === ".css" ? "text/css; charset=utf-8" :
        ext === ".json" ? "application/json; charset=utf-8" :
        ext === ".svg" ? "image/svg+xml" :
        ext === ".png" ? "image/png" :
        ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" :
        "application/octet-stream";
      res.writeHead(200, { "Content-Type": type, ...SECURITY_HEADERS });
      fs.createReadStream(distPath).pipe(res);
      return;
    }
    if (pathname.startsWith("/assets/")) {
      return sendError(res, 404, "Asset not found");
    }
    const indexPath = path.join(distDir, "index.html");
    if (fs.existsSync(indexPath)) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", ...SECURITY_HEADERS });
      fs.createReadStream(indexPath).pipe(res);
      return;
    }
  }

  const routeMap = new Map([
    ["/", path.join(ROOT_DIR, "antokton.html")],
    ["/assets/index-f4JQjEP4.js", path.join(ROOT_DIR, "antokton-index.js")],
    ["/assets/index-D6YQFS_i.css", path.join(ROOT_DIR, "antokton-index.css")],
    ["/manifest.json", path.join(__dirname, "manifest.json")]
  ]);

  const filePath = routeMap.get(pathname) || path.join(ROOT_DIR, "antokton.html");
  if (!fs.existsSync(filePath)) return sendError(res, 404, "Static file not found");

  const ext = path.extname(filePath);
  const type =
    ext === ".html" ? "text/html; charset=utf-8" :
    ext === ".js" ? "text/javascript; charset=utf-8" :
    ext === ".css" ? "text/css; charset=utf-8" :
    ext === ".json" ? "application/json; charset=utf-8" :
    "application/octet-stream";

  res.writeHead(200, { "Content-Type": type, ...SECURITY_HEADERS });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  req.requestId = requestId(req);
  res.setHeader("X-Request-Id", req.requestId);
  applyRequestTimeout(req, res);

  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const segments = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);

    if (req.method === "OPTIONS") return send(res, 204);

    if (isGenerallyRateLimitedPath(url.pathname)) {
      const rateLimit = consumeGeneralRateLimit(req);
      if (!rateLimit.allowed) return sendRateLimitError(res, rateLimit);
    }

    if (url.pathname === "/health") {
      const dbMode = getDatabaseMode();
      return send(res, 200, {
        ok: true,
        appId: APP_ID,
        db: dbMode === "postgres" ? "postgres" : DB_PATH,
        dbMode,
        schemas: Object.keys(entitySchemas).length
      });
    }

    if (url.pathname === "/health/config") {
      const configStatus = safeConfigStatus();
      return send(res, 200, {
        ok: true,
        ...configStatus,
        database: getDatabaseStatus(),
        storage: getStorageStatus(),
        auth: {
          ...configStatus.auth,
          ...(await getAuthStatus())
        }
      });
    }

    if (url.pathname === "/api/local/entity-schemas") {
      return send(res, 200, entitySchemas);
    }

    if (segments[0] === "api" && segments[1] === "apps" && segments[2] === "public") {
      if (segments[3] === "prod" && segments[4] === "public-settings" && segments[5] === "by-id") {
        return send(res, 200, {
          id: segments[6] || APP_ID,
          app_id: segments[6] || APP_ID,
          name: "Antokton",
          is_public: true,
          auth_required: false,
          user_registration_required: false
        });
      }
    }

    if (segments[0] === "api" && segments[1] === "apps" && segments[2] === "auth" && segments[3] === "logout") {
      const fromUrl = url.searchParams.get("from_url") || "/";
      return redirect(res, fromUrl);
    }

    if (segments[0] === "api" && segments[1] === "apps" && segments[3] === "entities") {
      return await handleEntity(req, res, url, segments);
    }

    if (segments[0] === "api" && segments[1] === "apps" && segments[3] === "auth") {
      return await handleAuth(req, res, segments);
    }

    if (segments[0] === "api" && segments[1] === "apps" && segments[3] === "users") {
      return await handleUsers(req, res, segments);
    }

    if (segments[0] === "api" && segments[1] === "app-logs") {
      const pageName = segments[4] || "unknown";
      const userEmail = await getRequestUserEmail(req);
      await createRecord("UserActivity", {
        user_email: userEmail,
        activity_type: "page_view",
        page_name: pageName
      }, userEmail);
      return send(res, 200, { success: true });
    }

    if (segments[0] === "api" && segments[1] === "apps" && segments[3] === "integration-endpoints") {
      const scope = segments[4];
      const operation = segments[5];
      if (scope === "Core" && operation) return await handleCoreIntegration(req, res, operation);
    }

    if (segments[0] === "api" && segments[1] === "apps" && segments[3] === "functions") {
      const functionName = segments[4];
      if (functionName) return await handleFunction(req, res, functionName);
    }

    if (segments[0] === "api") return sendError(res, 404, "API endpoint not found");
    return serveStatic(req, res, url.pathname);
  } catch (error) {
    logRequestError(error, req, { requestId: req.requestId });
    const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 600 ? error.status : 500;
    return sendError(res, status, error.message || "Internal server error");
  }
});

server.requestTimeout = REQUEST_TIMEOUT_MS;
server.headersTimeout = Math.max(REQUEST_TIMEOUT_MS + 5000, 65000);
server.keepAliveTimeout = 5000;

// Async initialization: connect to DB, apply schema, bootstrap data, then start listening.
async function initialize() {
  validateStartupEnvironment();
  if (typeof initializeAsync === "function") {
    await initializeAsync();
  }
  await persistEntitySchemas();
  if (isDevAuthActive()) await ensureUser();
  await bootstrapAdminAuth();
  await cleanupKnownTestUsers();
}

initialize()
  .then(() => {
    server.listen(PORT, () => {
      const dbMode = getDatabaseMode();
      console.log(`Antokton Base44-compatible backend running on http://localhost:${PORT}`);
      if (dbMode === "postgres") {
        console.log("Using PostgreSQL database");
      } else {
        console.log(`Using SQLite database: ${DB_PATH}`);
      }
    });
  })
  .catch((err) => {
    console.error(`Server initialization failed: ${err.message}`);
    process.exit(1);
  });
