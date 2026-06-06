const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const URL_RE = /https?:\/\/[^\s<>"')]+/gi;
const PHONE_RE = /(?:\+\d{1,4}[\s().-]?)?(?:\d[\s().-]?){7,14}\d\b/g;

const UNIQUE = (items) => Array.from(new Set(items.filter(Boolean).map((v) => String(v).trim()).filter(Boolean)));

const NAMED_ENTITIES = {
  amp: "&",
  apos: "'",
  ccedil: "ç",
  Ccedil: "Ç",
  euml: "ë",
  Euml: "Ë",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: "\"",
};

const MOJIBAKE_REPLACEMENTS = [
  [/Ã«/g, "ë"],
  [/Ã‹/g, "Ë"],
  [/Ã§/g, "ç"],
  [/Ã‡/g, "Ç"],
  [/â€™/g, "'"],
  [/â€˜/g, "'"],
  [/â€œ/g, "\""],
  [/â€�/g, "\""],
  [/â€“/g, "–"],
  [/â€”/g, "—"],
  [/Â /g, " "],
  [/Â/g, ""],
];

export function sanitizeImportedText(value = "") {
  let text = String(value || "");
  text = text.replace(/&#x([0-9a-f]+);?/gi, (_, hex) => {
    const codePoint = Number.parseInt(hex, 16);
    return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : "";
  });
  text = text.replace(/&#(\d+);?/g, (_, number) => {
    const codePoint = Number.parseInt(number, 10);
    return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : "";
  });
  text = text.replace(/&([a-zA-Z][a-zA-Z0-9]+);/g, (match, name) => (
    Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, name) ? NAMED_ENTITIES[name] : match
  ));
  for (const [pattern, replacement] of MOJIBAKE_REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }
  text = text.replace(/([a-zçë])Ë/g, "$1ë").replace(/([a-zçë])Ç/g, "$1ç");
  return text.normalize("NFC");
}

function cleanUrl(url = "") {
  return String(url).trim().replace(/[.,;:!?]+$/, "");
}

function cleanPhone(phone = "") {
  return String(phone).trim().replace(/\s+/g, " ");
}

function inferCountryFromText(text = "") {
  const value = sanitizeImportedText(text).toLowerCase();
  if (/\b(gjermani|germany|deutschland|gütersloh|gutersloh|bielefeld|berlin|hamburg|münchen|munich|dortmund|düsseldorf|dusseldorf|köln|koln|frankfurt)\b/i.test(value)) {
    return "Gjermani";
  }
  return "";
}

function hasUsefulPhone(candidate = "") {
  const value = String(candidate || "");
  const digits = value.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return false;
  if (/^\d{1,2}[\s./-]\d{1,2}[\s./-]\d{2,4}$/.test(value.trim())) return false;
  if (/^(19|20)\d{2}$/.test(digits)) return false;
  return true;
}

function normalizePhoneForCountry(phone = "", country = "", context = "") {
  const clean = cleanPhone(phone);
  if (!clean) return "";
  if (/^\s*\+/.test(clean)) return clean;
  const digits = clean.replace(/\D/g, "");
  const isGermany = country === "Gjermani" || /\b(gjermani|germany|deutschland)\b/i.test(context);
  if (isGermany && /^0\d{7,14}$/.test(digits)) return `+49${digits.slice(1)}`;
  return "";
}

function hasEmail(text = "") {
  return new RegExp(EMAIL_RE.source, "i").test(String(text || ""));
}

function hasUrl(text = "") {
  return new RegExp(URL_RE.source, "i").test(String(text || ""));
}

function extractFirstByLabels(text = "", labels = []) {
  const lines = sanitizeImportedText(text).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const labelRe = new RegExp(`^(?:${labels.join("|")})\\s*[:\\-–]\\s*(.+)$`, "i");
  for (const line of lines) {
    const match = line.match(labelRe);
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

export function stripContactLines(text = "") {
  return sanitizeImportedText(text)
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
  const cleanInitial = Object.fromEntries(Object.entries(initial || {}).map(([key, value]) => [
    key,
    typeof value === "string" ? sanitizeImportedText(value) : value,
  ]));
  const source = sanitizeImportedText(rawText || "");
  const description = sanitizeImportedText(cleanInitial.description || source || "");
  const combined = sanitizeImportedText([source, description, cleanInitial.contact_info].filter(Boolean).join("\n"));

  const emails = UNIQUE(combined.match(EMAIL_RE) || []);
  const urls = UNIQUE((combined.match(URL_RE) || []).map(cleanUrl));
  const phones = UNIQUE((combined.match(PHONE_RE) || []).map(cleanPhone).filter(hasUsefulPhone));
  const internationalPhones = phones.filter((phone) => /^\s*\+/.test(phone));
  const localPhones = phones.filter((phone) => !/^\s*\+/.test(phone));

  const sourceUrl = cleanUrl(cleanInitial.source_url || cleanInitial.import_source_url || cleanInitial.original_post_url || urls[0] || "");
  const authorProfileUrl = cleanUrl(cleanInitial.author_profile_url || cleanInitial.import_author_profile_url || "");
  const contactUrls = urls.filter((url) => url !== sourceUrl && url !== authorProfileUrl);
  const address =
    cleanInitial.address ||
    extractFirstByLabels(combined, ["adresa", "adresë", "lokacioni", "lokacion", "vendndodhja", "vendi i pun[eë]s", "vendi pun[eë]s", "vendi", "location", "address"]) ||
    "";
  const city =
    cleanInitial.city ||
    extractFirstByLabels(combined, ["qyteti", "qytet", "city"]) ||
    "";
  const country = cleanInitial.country || inferCountryFromText([combined, address, city].join("\n"));
  const normalizedLocalPhone = localPhones.map((phone) => normalizePhoneForCountry(phone, country, combined)).find(Boolean) || "";
  const primaryPhone = cleanInitial.phone_number || internationalPhones[0] || normalizedLocalPhone || "";
  const contactOnlyLocalPhones = localPhones.filter((phone) => normalizePhoneForCountry(phone, country, combined) !== primaryPhone);

  const contactLines = UNIQUE([
    cleanInitial.contact_info,
    ...emails,
    ...contactUrls,
    ...contactOnlyLocalPhones.map((phone) => `Telefon: ${phone}`),
  ]);

  return {
    ...cleanInitial,
    description: stripContactLines(description) || description,
    import_original_text: sanitizeImportedText(cleanInitial.import_original_text || source),
    original_text: sanitizeImportedText(cleanInitial.original_text || source),
    contact_info: contactLines.join("\n"),
    phone_number: primaryPhone,
    address,
    city,
    country,
    source_url: sourceUrl,
    author_profile_url: authorProfileUrl,
    import_source_url: cleanInitial.import_source_url || sourceUrl,
    import_author_profile_url: cleanInitial.import_author_profile_url || authorProfileUrl,
    show_source_url: cleanInitial.show_source_url === true,
    show_author_profile_url: cleanInitial.show_author_profile_url === true,
  };
}
