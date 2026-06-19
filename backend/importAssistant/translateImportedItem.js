const { cleanText } = require("./textUtils");
const { generateAlbanianListingTitle } = require("./generateAlbanianListingTitle");

function summarize(item = {}) {
  const parts = [];
  if (item.profession) parts.push(`Profesioni: ${item.profession}.`);
  if (item.original_company) parts.push(`Kompania: ${item.original_company}.`);
  if (item.city || item.country) parts.push(`Vendndodhja: ${[item.city, item.country].filter(Boolean).join(", ")}.`);
  if (item.original_salary) parts.push(`Paga: ${item.original_salary}.`);
  if (item.contract_type) parts.push(`Kontrata: ${item.contract_type}.`);
  const description = cleanText(item.original_description || "").slice(0, 420);
  if (description) parts.push(description);
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
