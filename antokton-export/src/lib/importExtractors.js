const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const URL_RE = /https?:\/\/[^\s<>"')]+/gi;
const PHONE_RE = /(?:\+\d{1,4}[\s().-]?)?(?:\d[\s().-]?){7,14}\d\b/g;

const UNIQUE = (items) => Array.from(new Set(items.filter(Boolean).map((v) => String(v).trim()).filter(Boolean)));

function cleanUrl(url = "") {
  return String(url).trim().replace(/[.,;:!?]+$/, "");
}

function cleanPhone(phone = "") {
  return String(phone).trim().replace(/\s+/g, " ");
}

function hasUsefulPhone(candidate = "") {
  const value = String(candidate || "");
  const digits = value.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return false;
  if (/^\d{1,2}[\s./-]\d{1,2}[\s./-]\d{2,4}$/.test(value.trim())) return false;
  if (/^(19|20)\d{2}$/.test(digits)) return false;
  return true;
}

function hasEmail(text = "") {
  return new RegExp(EMAIL_RE.source, "i").test(String(text || ""));
}

function hasUrl(text = "") {
  return new RegExp(URL_RE.source, "i").test(String(text || ""));
}

function extractFirstByLabels(text = "", labels = []) {
  const lines = String(text || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const labelRe = new RegExp(`^(?:${labels.join("|")})\\s*[:\\-–]\\s*(.+)$`, "i");
  for (const line of lines) {
    const match = line.match(labelRe);
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

export function stripContactLines(text = "") {
  return String(text || "")
    .split(/\r?\n/)
    .filter((line) => {
      const value = line.trim();
      if (!value) return true;
      const phones = value.match(PHONE_RE) || [];
      return !hasEmail(value) && !hasUrl(value) && !phones.some(hasUsefulPhone);
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function extractImportedPostFields(rawText = "", initial = {}) {
  const source = String(rawText || "");
  const description = String(initial.description || source || "");
  const combined = [source, description, initial.contact_info].filter(Boolean).join("\n");

  const emails = UNIQUE(combined.match(EMAIL_RE) || []);
  const urls = UNIQUE((combined.match(URL_RE) || []).map(cleanUrl));
  const phones = UNIQUE((combined.match(PHONE_RE) || []).map(cleanPhone).filter(hasUsefulPhone));
  const internationalPhones = phones.filter((phone) => /^\s*\+/.test(phone));
  const localPhones = phones.filter((phone) => !/^\s*\+/.test(phone));

  const sourceUrl = cleanUrl(initial.source_url || initial.original_post_url || urls[0] || "");
  const contactUrls = urls.filter((url) => url !== sourceUrl);
  const address =
    initial.address ||
    extractFirstByLabels(combined, ["adresa", "adresë", "lokacioni", "lokacion", "vendndodhja", "location", "address"]) ||
    "";
  const city =
    initial.city ||
    extractFirstByLabels(combined, ["qyteti", "qytet", "city"]) ||
    "";

  const contactLines = UNIQUE([
    initial.contact_info,
    ...emails,
    ...contactUrls,
    ...localPhones.map((phone) => `Telefon: ${phone}`),
  ]);

  return {
    ...initial,
    description: stripContactLines(description) || description,
    import_original_text: initial.import_original_text || source,
    original_text: initial.original_text || source,
    contact_info: contactLines.join("\n"),
    phone_number: initial.phone_number || internationalPhones[0] || "",
    address,
    city,
    source_url: sourceUrl,
    show_source_url: Boolean(initial.show_source_url),
  };
}
