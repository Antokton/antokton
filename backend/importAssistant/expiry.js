const DAY_MS = 24 * 60 * 60 * 1000;

const EXPIRY_KEYWORDS = [
  "Afati i aplikimit",
  "Apliko deri",
  "Deadline",
  "Closing date",
  "Valid until",
  "Skadon",
  "Data e fundit",
  "Rok za prijavu",
  "Краен рок"
];

function addDays(date, days) {
  const base = date ? new Date(date) : new Date();
  base.setDate(base.getDate() + days);
  return base.toISOString();
}

function normalizeText(value = "") {
  return String(value || "").toLowerCase();
}

function parseDateParts(day, month, year) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (!y || !m || !d) return "";
  const date = new Date(Date.UTC(y < 100 ? 2000 + y : y, m - 1, d, 12, 0, 0));
  return Number.isFinite(date.getTime()) ? date.toISOString() : "";
}

function parseImportedExpiry(item = {}) {
  const text = [
    item.original_expires_at,
    item.expires_at,
    item.deadline,
    item.closing_date,
    item.valid_until,
    item.original_title,
    item.title,
    item.original_description,
    item.description,
    item.original_text,
    item.edited_text,
    item.raw_text
  ].filter(Boolean).join("\n");
  if (!text.trim()) return "";

  const direct = item.original_expires_at || item.expires_at || item.deadline || item.closing_date || item.valid_until;
  if (direct && Number.isFinite(new Date(direct).getTime())) return new Date(direct).toISOString();

  const keywordPattern = EXPIRY_KEYWORDS.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const nearKeyword = new RegExp(`(?:${keywordPattern})[^\\n\\d]{0,40}(\\d{1,2})[./-](\\d{1,2})[./-](\\d{2,4})`, "i");
  const keywordMatch = text.match(nearKeyword);
  if (keywordMatch) return parseDateParts(keywordMatch[1], keywordMatch[2], keywordMatch[3]);

  const isoNearKeyword = new RegExp(`(?:${keywordPattern})[^\\n\\d]{0,40}(\\d{4})-(\\d{1,2})-(\\d{1,2})`, "i");
  const isoMatch = text.match(isoNearKeyword);
  if (isoMatch) return parseDateParts(isoMatch[3], isoMatch[2], isoMatch[1]);

  return "";
}

function getAutomaticExpiryDays(item = {}) {
  const text = normalizeText([
    item.item_type,
    item.category,
    item.listing_type,
    item.job_type,
    item.pazar_category,
    item.pazar_subcategory,
    item.subcategory,
    item.service_field,
    item.profession,
    item.title,
    item.description
  ].filter(Boolean).join(" "));

  if (text.includes("tender")) return 30;
  if (text.includes("grant") || text.includes("burs")) return 45;
  if (text.includes("ortak")) return 60;
  if (text.includes("jurid")) return 90;
  if (text.includes("kurs") || text.includes("trajnim") || text.includes("course")) return 60;
  if (text.includes("praktik")) return 45;
  if (text.includes("vullnet")) return 45;
  if (text.includes("komunit")) return 60;
  if (text.includes("biznes")) return 60;
  if (text.includes("qira") || text.includes("banes") || text.includes("shtëpi") || text.includes("shtepi") || text.includes("housing")) return 21;
  if (text.includes("automjet") || text.includes("makin") || text.includes("vetur")) {
    return text.includes("blej") || text.includes("kerkoj") || text.includes("kërkoj") ? 30 : 45;
  }
  if (text.includes("pazar")) return 45;
  if (text.includes("pune") || text.includes("punë") || text.includes("job") || text.includes("ofroj") || text.includes("kerkoj") || text.includes("kërkoj")) return 30;
  return 60;
}

function buildExpiryFields(item = {}, options = {}) {
  const now = options.now || new Date();
  const originalExpiry = parseImportedExpiry(item);
  const existingExpires = item.expires_at && Number.isFinite(new Date(item.expires_at).getTime())
    ? new Date(item.expires_at).toISOString()
    : "";
  const expiresAt = originalExpiry || existingExpires || addDays(now, getAutomaticExpiryDays(item));
  const expired = Number.isFinite(new Date(expiresAt).getTime()) && new Date(expiresAt).getTime() < now.getTime();
  return {
    original_expires_at: originalExpiry || item.original_expires_at || "",
    expires_at: expiresAt,
    expiry_source: originalExpiry ? "original" : (item.expiry_source || "automatic"),
    expired_at: expired ? (item.expired_at || now.toISOString()) : (item.expired_at || ""),
    is_expired: expired,
    auto_archive_after_expiry: item.auto_archive_after_expiry !== false,
    renewal_count: Number(item.renewal_count || 0),
    last_renewed_at: item.last_renewed_at || ""
  };
}

function isExpired(item = {}, now = new Date()) {
  if (item.is_expired === true) return true;
  if (!item.expires_at) return false;
  const expires = new Date(item.expires_at).getTime();
  return Number.isFinite(expires) && expires < now.getTime();
}

function renewExpiryFields(item = {}, options = {}) {
  const now = options.now || new Date();
  return {
    expires_at: addDays(now, getAutomaticExpiryDays(item)),
    expiry_source: options.source || "admin_set",
    expired_at: "",
    is_expired: false,
    renewal_count: Number(item.renewal_count || 0) + 1,
    last_renewed_at: now.toISOString()
  };
}

module.exports = {
  EXPIRY_KEYWORDS,
  addDays,
  parseImportedExpiry,
  getAutomaticExpiryDays,
  buildExpiryFields,
  isExpired,
  renewExpiryFields
};
