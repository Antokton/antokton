const { cleanText } = require("./textUtils");
const { generateAlbanianListingTitle } = require("./generateAlbanianListingTitle");

function summarize(item = {}) {
  const parts = [];
  const profession = item.profession || "";
  const location = [item.city, item.region, item.country].filter(Boolean).join(", ");
  if (item.item_type === "job" || item.category === "pune") {
    if (profession || location) parts.push(`Kërkohet ${profession || "punëtor"}${location ? ` në ${location}` : ""}.`);
  } else {
    parts.push(`${item.shqip_title || item.original_title || ""}${location ? ` në ${location}` : ""}.`);
  }
  if (item.original_company) parts.push(`Kompania: ${item.original_company}.`);
  if (item.original_salary) parts.push(`Paga: ${item.original_salary}.`);
  if (item.contract_type) parts.push(`Lloji i kontratës: ${item.contract_type}.`);
  const language = String(item.original_language || "").toLowerCase();
  const description = cleanText(item.original_description || "");
  const looksAlbanian = /(?:\bpun[eë]\b|\bk[eë]rkohet\b|\bofrohet\b|\bpag[aë]\b|\bqytet\b|\bkontakt\b)/i.test(description);
  if (description && (language === "sq" || looksAlbanian)) {
    parts.push(description.slice(0, 300));
  } else if (description && description.length > 120) {
    parts.push(description.slice(0, 300));
  }
  return cleanText(parts.join(" ")).slice(0, 600);
}

async function translateImportedItem(item = {}) {
  return {
    shqip_title: cleanText(item.shqip_title || generateAlbanianListingTitle(item)).slice(0, 140),
    shqip_summary: cleanText(item.shqip_summary || summarize(item)).slice(0, 600),
    original_language: item.original_language || "unknown"
  };
}

async function translateContactMessage({ message, targetLanguage }) {
  return {
    translated_text: cleanText(message || ""),
    target_language: targetLanguage || "",
    provider: "manual-placeholder",
    message: "AI provider nuk është aktivizuar; teksti u kthye pa përkthim."
  };
}

module.exports = { translateContactMessage, translateImportedItem };
