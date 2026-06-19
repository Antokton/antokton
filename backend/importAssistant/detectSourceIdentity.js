const { cleanText, canonicalUrl } = require("./textUtils");

const KNOWN_FOREIGN = /eures|adzuna|jooble|arbeitnow|arbeitsagentur|indeed|linkedin|stepstone/i;
const ALBANIAN = /shqip|alban|kosov|dardan|ilir|antokton/i;

function detectSourceIdentity(item = {}, source = {}) {
  const text = cleanText([item.source_name, item.source_url, item.original_company, source.name, source.base_url].filter(Boolean).join(" "));
  const url = canonicalUrl(item.source_url || source.base_url || "");
  const isAlbanian = ALBANIAN.test(text);
  const hasCompany = Boolean(item.original_company || /gmbh|ag|ltd|shpk|company|kompani|agency|agjenci/i.test(text));
  const hasPublicProfile = /facebook\.com\/(?!groups\/)|linkedin\.com\/(?:company|in)\/|instagram\.com\//i.test(url || text);
  const trust = String(source.trust_level || "").toLowerCase();

  let type = "unknown";
  let confidence = 35;
  if (hasCompany) {
    type = /agency|agjenci/i.test(text) ? "agency" : "company";
    confidence = 75;
  } else if (hasPublicProfile) {
    type = "public_person";
    confidence = 65;
  } else if (/group|community|komunitet/i.test(text)) {
    type = "community_page";
    confidence = 55;
  } else if (!text || /whatsapp|inbox|dm/i.test(text)) {
    type = "anonymous";
    confidence = 25;
  }

  if (KNOWN_FOREIGN.test(text)) confidence += 10;
  if (trust === "high") confidence += 15;
  if (trust === "medium") confidence += 8;
  if (trust === "low") confidence -= 10;

  return {
    source_identity_type: type,
    source_identity_name: cleanText(item.original_company || source.name || item.source_name || ""),
    source_identity_url: url,
    source_identity_confidence: Math.max(0, Math.min(100, confidence)),
    is_albanian_source: isAlbanian,
    albanian_source_reason: isAlbanian
      ? (type === "anonymous" ? "Burim shqiptar i paqartë; nuk merr bonus automatik." : "Burim shqiptar me identitet të dukshëm.")
      : ""
  };
}

module.exports = { detectSourceIdentity };
