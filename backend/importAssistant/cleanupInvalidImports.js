const { cleanText } = require("./textUtils");
const {
  hasBadEncoding,
  isBlockedNonJobUrl,
  isListingOrCategoryUrl,
  isPlaceholderUrl,
  validateImportedItem
} = require("./validateImportedItem");

const INVALID_STATUSES = new Set([
  "rejected_low_quality_import",
  "rejected_non_job_page",
  "rejected_missing_original_url",
  "rejected_missing_title",
  "rejected_placeholder_url",
  "rejected_bad_encoding",
  "archived_invalid_import"
]);

function postToValidationInput(post = {}) {
  return {
    source_id: post.source_id || "",
    source_name: post.source_name || post.source || "",
    original_title: post.original_title || post.title || "",
    original_description: post.original_text || post.description || post.edited_text || "",
    original_company: post.company_name || post.author_name || "",
    original_location: post.location || post.address || "",
    original_country: post.country || "",
    original_city: post.city || "",
    original_url: post.original_url || post.import_source_url || post.source_url || post.original_post_url || "",
    source_url: post.source_url || post.import_source_url || post.original_url || "",
    apply_url: post.apply_url || post.contact_url || "",
    contact_methods: post.contact_methods || [
      post.contact_phone ? { type: "phone", value: post.contact_phone } : null,
      post.contact_email ? { type: "email", value: post.contact_email } : null,
      post.contact_url ? { type: "website", value: post.contact_url } : null
    ].filter(Boolean),
    published_at: post.original_published_at || post.published_at || post.created_date || "",
    salary: post.salary || post.original_salary || "",
    contract_type: post.contract_type || ""
  };
}

function detectInvalidImportedPost(post = {}) {
  if (INVALID_STATUSES.has(post.status)) return null;

  const url = post.original_url || post.import_source_url || post.source_url || post.original_post_url || "";
  const text = [
    post.original_title,
    post.title,
    post.original_text,
    post.edited_text,
    post.description,
    post.author_name,
    post.location,
    post.country,
    post.city
  ].filter(Boolean).join(" ");

  if (hasBadEncoding(text)) {
    return { status: "rejected_bad_encoding", reason: "Imported post contains broken text encoding" };
  }
  if (!cleanText(url)) {
    return { status: "rejected_missing_original_url", reason: "Imported post has no original URL" };
  }
  if (isPlaceholderUrl(url)) {
    return { status: "rejected_placeholder_url", reason: "Imported post has placeholder original URL" };
  }
  if (isBlockedNonJobUrl(url)) {
    return { status: "rejected_non_job_page", reason: "Imported post URL is a corporate/marketing page" };
  }
  if (isListingOrCategoryUrl(url)) {
    return { status: "rejected_low_quality_import", reason: "Imported post URL is a listing/category page" };
  }

  const item = postToValidationInput(post);
  const validation = validateImportedItem(item, item, {
    id: item.source_id,
    name: item.source_name,
    import_mode: post.import_mode || "automatic"
  });
  if (!validation.valid) {
    return {
      status: validation.status || "rejected_low_quality_import",
      reason: validation.reason || "Imported post failed validation",
      quality_score: validation.quality_score || 0,
      quality_reasons: validation.quality_reasons || []
    };
  }
  return null;
}

async function cleanupInvalidImportedPosts({ store, requestedBy = "system", dryRun = true } = {}) {
  if (!store?.allRecords || !store?.updateRecord) {
    throw new Error("cleanupInvalidImportedPosts requires a store with allRecords/updateRecord");
  }
  const posts = await store.allRecords("ImportedPost");
  const candidates = [];
  for (const post of posts) {
    const invalid = detectInvalidImportedPost(post);
    if (!invalid) continue;
    candidates.push({ post, invalid });
  }
  if (!dryRun) {
    for (const { post, invalid } of candidates) {
      await store.updateRecord("ImportedPost", post.id, {
        status: "archived_invalid_import",
        invalid_import_status: invalid.status,
        invalid_import_reason: invalid.reason,
        import_quality_score: invalid.quality_score || post.import_quality_score || post.quality_score || 0,
        import_quality_reasons: invalid.quality_reasons || post.import_quality_reasons || post.quality_reasons || [],
        archived_invalid_at: new Date().toISOString(),
        archived_invalid_by: requestedBy
      }, requestedBy);
    }
  }
  return {
    success: true,
    dry_run: dryRun,
    scanned_count: posts.length,
    invalid_count: candidates.length,
    invalid_items: candidates.map(({ post, invalid }) => ({
      id: post.id,
      title: post.title || post.original_title || "",
      status: invalid.status,
      reason: invalid.reason,
      original_url: post.original_url || post.import_source_url || post.source_url || ""
    }))
  };
}

module.exports = {
  cleanupInvalidImportedPosts,
  detectInvalidImportedPost
};
