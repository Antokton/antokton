const DAY_MS = 24 * 60 * 60 * 1000;

export function addDays(date, days) {
  const base = date ? new Date(date) : new Date();
  base.setDate(base.getDate() + days);
  return base.toISOString();
}

function normalized(value = "") {
  return String(value || "").toLowerCase();
}

export function getAutomaticExpiryDays(item = {}) {
  const text = normalized([
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

export function buildExpiryFields(item = {}, options = {}) {
  const now = options.now || new Date();
  const existingExpires = item.expires_at && Number.isFinite(new Date(item.expires_at).getTime())
    ? new Date(item.expires_at).toISOString()
    : "";
  const originalExpires = item.original_expires_at && Number.isFinite(new Date(item.original_expires_at).getTime())
    ? new Date(item.original_expires_at).toISOString()
    : "";
  const expiresAt = originalExpires || existingExpires || addDays(now, getAutomaticExpiryDays(item));
  const expired = Number.isFinite(new Date(expiresAt).getTime()) && new Date(expiresAt).getTime() < now.getTime();
  return {
    original_expires_at: originalExpires,
    expires_at: expiresAt,
    expiry_source: originalExpires ? "original" : (item.expiry_source || "automatic"),
    expired_at: expired ? (item.expired_at || now.toISOString()) : (item.expired_at || ""),
    is_expired: expired,
    auto_archive_after_expiry: item.auto_archive_after_expiry !== false,
    renewal_count: Number(item.renewal_count || 0),
    last_renewed_at: item.last_renewed_at || ""
  };
}

export function isPostExpired(post = {}, now = new Date()) {
  if (post.is_expired === true || post.status === "expired" || post.status === "archived") return true;
  if (!post.expires_at) return false;
  const expires = new Date(post.expires_at).getTime();
  return Number.isFinite(expires) && expires < now.getTime();
}

export function getDaysUntilExpiry(post = {}, now = new Date()) {
  if (!post.expires_at) return null;
  const expires = new Date(post.expires_at).getTime();
  if (!Number.isFinite(expires)) return null;
  return Math.ceil((expires - now.getTime()) / DAY_MS);
}

export function isExpiringSoon(post = {}, now = new Date()) {
  const days = getDaysUntilExpiry(post, now);
  return days !== null && days >= 0 && days <= 3;
}

export function filterActivePosts(posts = [], options = {}) {
  if (options.includeExpired) return posts;
  return posts.filter((post) => !isPostExpired(post));
}

export function formatExpiryLabel(post = {}) {
  if (!post.expires_at) return "Pa afat";
  if (isPostExpired(post)) return "I skaduar";
  const days = getDaysUntilExpiry(post);
  if (days === null) return "Pa afat";
  if (days <= 3) return "Skadon së shpejti";
  if (days === 1) return "Skadon për 1 ditë";
  return `Skadon për ${days} ditë`;
}

export function renewExpiryFields(post = {}, source = "admin_set") {
  return {
    expires_at: addDays(new Date(), getAutomaticExpiryDays(post)),
    expiry_source: source,
    expired_at: "",
    is_expired: false,
    renewal_count: Number(post.renewal_count || 0) + 1,
    last_renewed_at: new Date().toISOString()
  };
}
