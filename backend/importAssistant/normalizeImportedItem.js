const { canonicalUrl, cleanText, clampScore } = require("./textUtils");
const { detectSourceIdentity } = require("./detectSourceIdentity");
const { detectContactLanguage } = require("./detectContactLanguage");
const { scoreEthical } = require("./scoreEthical");
const { scoreRisk } = require("./scoreRisk");
const { scoreRelevance } = require("./scoreRelevance");
const { translateImportedItem } = require("./translateImportedItem");
const { buildExpiryFields } = require("./expiry");

function extractContactMethods(item = {}) {
  const text = cleanText([item.original_contact, item.original_description, item.source_url].filter(Boolean).join(" "));
  const methods = [];
  const phones = text.match(/(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?){2,}\d{2,}/g) || [];
  for (const phone of phones.slice(0, 3)) {
    const value = phone.replace(/\s+/g, " ").trim();
    if (value.length >= 7 && !methods.some((m) => m.value === value)) {
      methods.push({ type: /whatsapp/i.test(text) ? "whatsapp" : "phone", value });
    }
  }
  const emails = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
  for (const email of emails.slice(0, 3)) methods.push({ type: "email", value: email.toLowerCase() });
  const urls = text.match(/https?:\/\/[^\s)]+/gi) || [];
  for (const url of urls.slice(0, 4)) {
    const value = canonicalUrl(url);
    if (!methods.some((m) => m.value === value)) {
      methods.push({ type: /apply|application|jobs?|career/i.test(value) ? "application_form" : "website", value });
    }
  }
  return methods;
}

function inferProfession(item = {}) {
  const text = cleanText([item.original_title, item.original_description].filter(Boolean).join(" "));
  const rules = [
    [/shofer\s*ce|ce driver|truck driver/i, "Shofer CE"],
    [/shofer|driver/i, "Shofer"],
    [/electric|elektr/i, "Elektriçist"],
    [/clean|pastr/i, "Pastrues/e"],
    [/construction|nd[eë]rtim|fasad/i, "Ndërtim"],
    [/warehouse|depo|magazin/i, "Depo"],
    [/mechanic|mekanik/i, "Mekanik"],
    [/baker|furr/i, "Furrë buke"],
    [/pastry|pastic/i, "Pasticeri"],
    [/painter|bojaxh/i, "Bojaxhi"]
  ];
  for (const [pattern, profession] of rules) if (pattern.test(text)) return profession;
  return cleanText(item.profession || "");
}

function calculateCompleteness(item = {}) {
  const checks = [
    item.original_title,
    item.original_description,
    item.category,
    item.profession,
    item.country,
    item.city || item.original_location,
    item.contact_methods?.length,
    item.source_url
  ];
  return clampScore((checks.filter(Boolean).length / checks.length) * 100);
}

function calculateFreshness(item = {}) {
  const date = item.published_at || item.created_at || item.imported_at;
  if (!date) return 65;
  const age = (Date.now() - new Date(date).getTime()) / 86400000;
  if (!Number.isFinite(age) || age < 0) return 70;
  if (age <= 2) return 100;
  if (age <= 7) return 85;
  if (age <= 30) return 65;
  return 45;
}

function chooseAddress(raw = {}) {
  const address = cleanText(raw.address || raw.original_address || "");
  const location = cleanText(raw.original_location || raw.location || "");
  const city = cleanText(raw.original_city || raw.city || "");
  const country = cleanText(raw.original_country || raw.country || "");
  const candidates = [address, location, city].filter(Boolean);
  const full = candidates.find((candidate) => {
    const normalized = candidate.toLowerCase();
    return candidate.length > country.length && normalized !== country.toLowerCase();
  });
  return full || address || location || city || "";
}

async function normalizeImportedItem(raw = {}, source = {}) {
  const address = chooseAddress(raw);
  const base = {
    source_id: source.id || "",
    source_name: cleanText(raw.source_name || source.name || raw.provider_key || source.provider_key || ""),
    provider_key: raw.provider_key || source.provider_key || "",
    external_id: cleanText(raw.external_id || raw.id || raw.slug || raw.url || ""),
    source_url: canonicalUrl(raw.source_url || raw.url || ""),
    source_public_visible: false,
    imported_public_badge_visible: false,
    item_type: raw.item_type || "job",
    original_title: cleanText(raw.original_title || raw.title || ""),
    original_description: cleanText(raw.original_description || raw.description || raw.content || ""),
    original_language: raw.original_language || "",
    original_company: cleanText(raw.original_company || raw.company || raw.company_name || ""),
    original_contact: cleanText(raw.original_contact || raw.contact || ""),
    original_location: cleanText(raw.original_location || raw.location || ""),
    address,
    original_country: cleanText(raw.original_country || raw.country || ""),
    original_city: cleanText(raw.original_city || raw.city || ""),
    original_salary: cleanText(raw.original_salary || raw.salary || ""),
    original_published_at: raw.original_published_at || raw.published_at || raw.created_at || "",
    category: raw.category || "pune",
    profession: cleanText(raw.profession || inferProfession(raw)),
    country: cleanText(raw.country || raw.original_country || ""),
    region: cleanText(raw.region || raw.original_region || ""),
    city: cleanText(raw.city || raw.original_city || ""),
    contract_type: cleanText(raw.contract_type || ""),
    salary_min: raw.salary_min || null,
    salary_max: raw.salary_max || null,
    currency: raw.currency || "EUR",
    imported_at: new Date().toISOString()
  };
  base.contact_methods = Array.isArray(raw.contact_methods) && raw.contact_methods.length
    ? raw.contact_methods
    : extractContactMethods(base);
  const identity = detectSourceIdentity(base, source);
  const ethical = scoreEthical({ ...base, ...identity });
  const risk = scoreRisk({ ...base, ...identity });
  const relevance = scoreRelevance({ ...base, ...identity });
  const language = detectContactLanguage(base, identity);
  const translated = await translateImportedItem({ ...base, ...identity, ...ethical, ...risk, ...relevance });
  const expiry = buildExpiryFields({ ...base, ...translated });
  const freshness_score = calculateFreshness(base);
  const completeness_score = calculateCompleteness(base);
  const sourceTrust = clampScore((identity.source_identity_confidence || 0) + (source.trust_level === "high" ? 15 : source.trust_level === "medium" ? 8 : 0));
  const final_score = clampScore(
    relevance.relevance_score * 0.35
    + sourceTrust * 0.25
    + ethical.ethical_score * 0.20
    + freshness_score * 0.10
    + completeness_score * 0.10
  );
  const status = (risk.risk_score >= 70 || ethical.ethical_score < 55 || identity.source_identity_type === "anonymous")
    ? "pending_review"
    : "pending_review";
  return {
    ...base,
    ...translated,
    ...identity,
    ...language,
    ...ethical,
    ...risk,
    ...relevance,
    ...expiry,
    source_trust_score: sourceTrust,
    freshness_score,
    completeness_score,
    final_score,
    status,
    requires_manual_review: true
  };
}

module.exports = {
  extractContactMethods,
  normalizeImportedItem
};
