const { canonicalUrl, normalizeKey, overlapScore } = require("./textUtils");

function isDuplicateImportedItem(item = {}, existingItems = [], existingPosts = []) {
  const sourceUrl = canonicalUrl(item.original_url || item.source_url);
  const originalId = item.original_id || item.original_post_id || item.external_id;
  const titleKey = normalizeKey([item.original_title, item.original_company, item.city, item.country].filter(Boolean).join(" "));
  const description = normalizeKey(item.original_description || item.shqip_summary || "");
  const pool = [...existingItems, ...existingPosts];

  for (const existing of pool) {
    const existingOriginalId = existing.original_id || existing.original_post_id || existing.external_id;
    if (item.source_id && originalId && existing.source_id === item.source_id && existingOriginalId === originalId) {
      return { duplicate: true, reason: "source_id + original_id" };
    }
    if (item.provider_key && item.external_id && existing.provider_key === item.provider_key && existing.external_id === item.external_id) {
      return { duplicate: true, reason: "provider + external_id" };
    }
    if (sourceUrl && canonicalUrl(existing.original_url || existing.source_url || existing.import_source_url || existing.original_post_url) === sourceUrl) {
      return { duplicate: true, reason: "original_url" };
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
