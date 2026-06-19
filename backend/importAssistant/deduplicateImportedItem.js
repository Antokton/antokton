const { canonicalUrl, normalizeKey, overlapScore } = require("./textUtils");

function isDuplicateImportedItem(item = {}, existingItems = [], existingPosts = []) {
  const sourceUrl = canonicalUrl(item.source_url);
  const titleKey = normalizeKey([item.original_title, item.original_company, item.city, item.country].filter(Boolean).join(" "));
  const description = normalizeKey(item.original_description || item.shqip_summary || "");
  const pool = [...existingItems, ...existingPosts];

  for (const existing of pool) {
    if (item.provider_key && item.external_id && existing.provider_key === item.provider_key && existing.external_id === item.external_id) {
      return { duplicate: true, reason: "provider + external_id" };
    }
    if (sourceUrl && canonicalUrl(existing.source_url || existing.import_source_url || existing.original_post_url) === sourceUrl) {
      return { duplicate: true, reason: "source_url" };
    }
    const existingTitleKey = normalizeKey([
      existing.original_title || existing.title || existing.edited_text,
      existing.original_company || existing.company_name,
      existing.city,
      existing.country
    ].filter(Boolean).join(" "));
    if (titleKey && existingTitleKey && titleKey === existingTitleKey) {
      return { duplicate: true, reason: "title + company + location" };
    }
    const existingDesc = normalizeKey(existing.original_description || existing.description || existing.edited_text || "");
    if (description && existingDesc && overlapScore(description, existingDesc) > 0.82) {
      return { duplicate: true, reason: "similar_description" };
    }
  }

  return { duplicate: false, reason: "" };
}

module.exports = { isDuplicateImportedItem };
