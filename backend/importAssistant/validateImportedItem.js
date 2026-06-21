const { cleanText, canonicalUrl } = require("./textUtils");

const NON_JOB_PATH_KEYWORDS = [
  "/corporate",
  "/recruiters",
  "/employers",
  "/pricing",
  "/about",
  "/contact",
  "/blog",
  "/academy",
  "/solutions",
  "/demo",
  "/customers",
  "/companies",
  "/for-companies",
  "/recruitment",
  "/advertise"
];

const LISTING_PATH_PATTERNS = [
  /^\/(?:jobs?|pune|remote-jobs|category|categories|search|results|njoftime\/biznes-pune\/pune)\/?$/i,
  /\/(?:category|categories|search|results|job-type|job-category|tags?)\/?$/i
];

const ARTIFICIAL_TITLE_PATTERNS = [
  /^k[eë]rkohet\s+punonj[eë]s(?:\s+n[eë]\s+.+)?$/i,
  /^k[eë]rkohen\s+punonj[eë]s(?:\s+n[eë]\s+.+)?$/i,
  /^k[eë]rkohet\s+pastrues\/e$/i,
  /^njoftim\s+i\s+importuar$/i,
  /^job\s+posting$/i
];

const BAD_ENCODING_PATTERNS = [
  /�/,
  /[ÃÂÐØ][^\s]{0,3}/,
  /(?:ã|â|ð|ø)/i,
  /(?:Ã|Â|Ð|Ø).*(?:Ã|Â|Ð|Ø)/
];

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function realUrl(value = "") {
  const url = cleanText(value);
  if (!url) return "";
  return canonicalUrl(url);
}

function isPlaceholderUrl(value = "") {
  const url = cleanText(value).toLowerCase();
  if (!url || url === "#" || url === "/" || url === "null" || url === "undefined") return true;
  if (url.startsWith("javascript:")) return true;
  if (url.includes("...")) return true;
  if (/^https?:\/\/(?:www\.)?facebook\.com\/?$/.test(url)) return true;
  if (/^https?:\/\/(?:www\.)?facebook\.com\/groups\/?$/.test(url)) return true;
  return false;
}

function isBlockedNonJobUrl(value = "") {
  const url = realUrl(value);
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.toLowerCase();
    return NON_JOB_PATH_KEYWORDS.some((keyword) => path.includes(keyword));
  } catch {
    const lower = url.toLowerCase();
    return NON_JOB_PATH_KEYWORDS.some((keyword) => lower.includes(keyword));
  }
}

function isListingOrCategoryUrl(value = "") {
  const url = realUrl(value);
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/+$/, "") || "/";
    const privateOnly = parsed.searchParams.has("Private") || parsed.searchParams.has("private");
    if (privateOnly) return true;
    if (path === "/") return true;
    return LISTING_PATH_PATTERNS.some((pattern) => pattern.test(path));
  } catch {
    const lower = url.toLowerCase();
    return lower === "/" || lower.includes("?private=true") || LISTING_PATH_PATTERNS.some((pattern) => pattern.test(lower));
  }
}

function isArtificialTitle(value = "") {
  const title = cleanText(value);
  if (!title) return true;
  return ARTIFICIAL_TITLE_PATTERNS.some((pattern) => pattern.test(title));
}

function hasRealTitle(value = "") {
  const title = cleanText(value);
  if (title.length < 4) return false;
  if (isArtificialTitle(title)) return false;
  if (/^(home|about|contact|pricing|recruiters|employers|companies|blog|academy)$/i.test(title)) return false;
  return true;
}

function contactValue(item = {}, types = []) {
  const methods = asArray(item.contact_methods);
  return methods.some((method) => types.includes(method?.type) && cleanText(method?.value));
}

function qualityFields(item = {}) {
  const description = cleanText(item.original_description || item.description || item.shqip_summary || "");
  const city = cleanText(item.city || item.original_city || "");
  const country = cleanText(item.country || item.original_country || "");
  const fields = {
    company_name: Boolean(cleanText(item.original_company || item.company_name || item.company)),
    location: Boolean(cleanText(item.original_location || item.location || item.address)),
    city_country: Boolean(city || country),
    long_description: description.length > 80,
    apply_url: Boolean(cleanText(item.apply_url || item.contact_url)) || contactValue(item, ["application_form", "website"]),
    published_at: Boolean(cleanText(item.published_at || item.original_published_at)),
    expires_at: Boolean(cleanText(item.expires_at || item.original_expires_at)),
    salary: Boolean(cleanText(item.original_salary || item.salary)),
    contract_type: Boolean(cleanText(item.contract_type))
  };
  return Object.entries(fields).filter(([, present]) => present).map(([key]) => key);
}

function hasBadEncoding(value = "") {
  const text = String(value || "");
  if (!text) return false;
  const suspiciousHits = BAD_ENCODING_PATTERNS.filter((pattern) => pattern.test(text)).length;
  if (suspiciousHits > 0) return true;
  const weirdCount = (text.match(/[^\x09\x0a\x0d\x20-\x7e\u00a0-\u024f\u0370-\u03ff\u0400-\u04ff]/g) || []).length;
  return weirdCount >= 3 && weirdCount / Math.max(text.length, 1) > 0.02;
}

function calculateImportQualityScore(item = {}, raw = {}, source = {}) {
  let score = 0;
  const reasons = [];
  const originalTitle = cleanText(raw.original_title || raw.title || item.original_title || "");
  const url = realUrl(item.original_url || item.source_url || raw.original_url || raw.source_url || raw.url);
  const sourceName = cleanText(item.source_name || source.name);
  const description = cleanText(item.original_description || raw.original_description || raw.description || "");
  const applyUrl = cleanText(item.apply_url || raw.apply_url || item.contact_url || "");
  const methods = asArray(item.contact_methods);
  const hasContact = methods.some((method) => cleanText(method?.value)) || cleanText(item.contact_email || item.contact_phone || item.contact_url);
  const hasCompany = Boolean(cleanText(item.original_company || raw.original_company || raw.company || raw.company_name));
  const hasLocation = Boolean(cleanText(item.original_location || raw.original_location || raw.location || item.address));
  const hasCityCountry = Boolean(cleanText(item.city || item.original_city || item.country || item.original_country));

  if (hasRealTitle(originalTitle)) { score += 25; reasons.push("title"); }
  if (url && !isPlaceholderUrl(url) && !isListingOrCategoryUrl(url) && !isBlockedNonJobUrl(url)) { score += 30; reasons.push("individual_url"); }
  if (cleanText(item.source_id || source.id) && sourceName && !/^burim i personalizuar$/i.test(sourceName)) { score += 15; reasons.push("source"); }
  if (description.length > 80) { score += 15; reasons.push("description"); }
  if (hasCompany) { score += 10; reasons.push("company"); }
  if (hasLocation || hasCityCountry) { score += 10; reasons.push("location"); }
  if (hasContact || applyUrl || contactValue(item, ["application_form", "website"])) { score += 10; reasons.push("apply_or_contact"); }
  if (cleanText(item.published_at || item.original_published_at || raw.published_at)) reasons.push("published_at");
  if (cleanText(item.expires_at || item.original_expires_at || raw.expires_at)) reasons.push("expires_at");
  if (cleanText(item.original_salary || raw.salary || item.salary)) reasons.push("salary");
  if (cleanText(item.contract_type || raw.contract_type)) reasons.push("contract_type");

  return { score: Math.min(100, score), reasons };
}

function hasAnyRequiredDetail(item = {}) {
  const description = cleanText(item.original_description || item.description || item.shqip_summary || "");
  return Boolean(
    cleanText(item.original_company || item.company_name || item.company)
    || cleanText(item.original_location || item.location || item.address)
    || description.length >= 40
    || cleanText(item.apply_url || item.contact_url)
    || contactValue(item, ["application_form", "website", "email", "phone", "whatsapp"])
  );
}

function validateImportedItem(item = {}, raw = {}, source = {}) {
  if (raw?._import_rejection_status) {
    return {
      valid: false,
      status: raw._import_rejection_status,
      reason: raw._import_rejection_reason || "Imported item failed parser validation"
    };
  }

  if (raw?._requires_detail_page && raw?._detail_page_loaded !== true) {
    return {
      valid: false,
      status: "rejected_low_quality_import",
      reason: "Individual detail page could not be opened or parsed",
      quality_score: 0
    };
  }

  const url = realUrl(item.original_url || item.source_url || raw.original_url || raw.source_url || raw.url);
  if (isBlockedNonJobUrl(url)) {
    return {
      valid: false,
      status: "rejected_non_job_page",
      reason: "URL is a corporate/marketing page, not a job posting."
    };
  }

  if (isListingOrCategoryUrl(url)) {
    return {
      valid: false,
      status: "rejected_low_quality_import",
      reason: "Original URL is a listing/category page, not an individual job posting.",
      quality_score: 0
    };
  }

  const originalTitle = raw.original_title || raw.title || item.original_title || "";
  if (!hasRealTitle(originalTitle)) {
    return {
      valid: false,
      status: "rejected_missing_title",
      reason: "Imported item missing required job title",
      quality_score: 0
    };
  }

  if (!url) {
    return {
      valid: false,
      status: "rejected_missing_original_url",
      reason: "Imported item missing original URL",
      quality_score: 0
    };
  }

  if (isPlaceholderUrl(url)) {
    return {
      valid: false,
      status: "rejected_placeholder_url",
      reason: "Imported item has placeholder original URL",
      quality_score: 0
    };
  }

  const encodingText = [
    originalTitle,
    item.original_description,
    raw.original_description || raw.description,
    item.original_company,
    item.original_location,
    item.city,
    item.country
  ].filter(Boolean).join(" ");
  if (hasBadEncoding(encodingText)) {
    return {
      valid: false,
      status: "rejected_bad_encoding",
      reason: "Imported item contains broken text encoding",
      quality_score: 0
    };
  }

  const sourceId = cleanText(item.source_id || source.id);
  const sourceName = cleanText(item.source_name || source.name);
  if (!sourceId || !sourceName) {
    return {
      valid: false,
      status: "rejected_low_quality_import",
      reason: "Imported item missing required source fields",
      quality_score: 0
    };
  }

  const automatic = String(source.import_mode || "").toLowerCase() !== "manual";
  if (automatic && /^burim i personalizuar$/i.test(sourceName)) {
    return {
      valid: false,
      status: "rejected_low_quality_import",
      reason: "Automatic import source_name is generic",
      quality_score: 0
    };
  }

  if (!hasAnyRequiredDetail(item)) {
    const quality = calculateImportQualityScore(item, raw, source);
    return {
      valid: false,
      status: "rejected_low_quality_import",
      reason: "Imported item missing required job fields",
      quality_score: quality.score,
      quality_reasons: quality.reasons
    };
  }

  const present = qualityFields(item);
  const quality = calculateImportQualityScore(item, raw, source);
  if (quality.score < 50) {
    return {
      valid: false,
      status: "rejected_low_quality_import",
      reason: "Imported item quality score is below the minimum threshold",
      quality_score: quality.score,
      quality_reasons: quality.reasons
    };
  }

  return { valid: true, status: "valid", reason: "", quality_score: quality.score, quality_reasons: quality.reasons, quality_fields: present };
}

module.exports = {
  NON_JOB_PATH_KEYWORDS,
  calculateImportQualityScore,
  hasBadEncoding,
  hasRealTitle,
  isBlockedNonJobUrl,
  isListingOrCategoryUrl,
  isPlaceholderUrl,
  qualityFields,
  validateImportedItem
};
