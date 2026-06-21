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

const ARTIFICIAL_TITLE_PATTERNS = [
  /^k[eë]rkohet\s+punonj[eë]s(?:\s+n[eë]\s+.+)?$/i,
  /^k[eë]rkohen\s+punonj[eë]s(?:\s+n[eë]\s+.+)?$/i,
  /^njoftim\s+i\s+importuar$/i,
  /^job\s+posting$/i
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

function isArtificialTitle(value = "") {
  const title = cleanText(value);
  if (!title) return true;
  return ARTIFICIAL_TITLE_PATTERNS.some((pattern) => pattern.test(title));
}

function hasRealTitle(value = "") {
  const title = cleanText(value);
  if (title.length < 8) return false;
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
    long_description: description.length > 120,
    apply_url: Boolean(cleanText(item.apply_url || item.contact_url)) || contactValue(item, ["application_form", "website"]),
    published_at: Boolean(cleanText(item.published_at || item.original_published_at)),
    expires_at: Boolean(cleanText(item.expires_at || item.original_expires_at)),
    salary: Boolean(cleanText(item.original_salary || item.salary)),
    contract_type: Boolean(cleanText(item.contract_type))
  };
  return Object.entries(fields).filter(([, present]) => present).map(([key]) => key);
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

  const url = realUrl(item.original_url || item.source_url || raw.original_url || raw.source_url || raw.url);
  if (isBlockedNonJobUrl(url)) {
    return {
      valid: false,
      status: "rejected_non_job_page",
      reason: "URL is a corporate/marketing page, not a job posting."
    };
  }

  if (!hasRealTitle(item.original_title || item.title || item.shqip_title)) {
    return {
      valid: false,
      status: "rejected_missing_title",
      reason: "Imported item missing required job title"
    };
  }

  if (!url) {
    return {
      valid: false,
      status: "rejected_missing_original_url",
      reason: "Imported item missing original URL"
    };
  }

  if (isPlaceholderUrl(url)) {
    return {
      valid: false,
      status: "rejected_placeholder_url",
      reason: "Imported item has placeholder original URL"
    };
  }

  const sourceId = cleanText(item.source_id || source.id);
  const sourceName = cleanText(item.source_name || source.name);
  if (!sourceId || !sourceName) {
    return {
      valid: false,
      status: "rejected_low_quality_import",
      reason: "Imported item missing required source fields"
    };
  }

  const automatic = String(source.import_mode || "").toLowerCase() !== "manual";
  if (automatic && /^burim i personalizuar$/i.test(sourceName)) {
    return {
      valid: false,
      status: "rejected_low_quality_import",
      reason: "Automatic import source_name is generic"
    };
  }

  if (!hasAnyRequiredDetail(item)) {
    return {
      valid: false,
      status: "rejected_low_quality_import",
      reason: "Imported item missing required job fields"
    };
  }

  const present = qualityFields(item);
  if (present.length < 2) {
    return {
      valid: false,
      status: "rejected_low_quality_import",
      reason: "Imported item missing required job fields"
    };
  }

  return { valid: true, status: "valid", reason: "", quality_fields: present };
}

module.exports = {
  NON_JOB_PATH_KEYWORDS,
  hasRealTitle,
  isBlockedNonJobUrl,
  isPlaceholderUrl,
  qualityFields,
  validateImportedItem
};
