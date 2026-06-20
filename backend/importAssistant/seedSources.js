const SOURCE_TYPE_DEFAULTS = {
  rss: {
    provider_key: "generic_rss",
    import_mode: "automatic",
    crawl_method: "rss",
    automation_level: "full_auto",
    parser_type: "rss",
    source_group: "rss",
    trust_level: "needs_review",
  },
  api: {
    provider_key: "custom",
    import_mode: "automatic",
    crawl_method: "api",
    automation_level: "full_auto",
    parser_type: "api",
    source_group: "custom_api",
    trust_level: "needs_review",
  },
  html: {
    provider_key: "custom",
    import_mode: "automatic",
    crawl_method: "html",
    automation_level: "full_auto",
    parser_type: "html",
    source_group: "community",
    trust_level: "needs_review",
  },
  facebook: {
    provider_key: "custom",
    import_mode: "manual",
    crawl_method: "manual",
    automation_level: "manual",
    parser_type: "manual",
    source_group: "community",
    trust_level: "manual_only",
    moderation_required: true,
    notes: "Përdor API zyrtare/leje të qartë ose import manual; mos përdor scraping agresiv.",
  },
  telegram: {
    provider_key: "custom",
    import_mode: "manual",
    crawl_method: "manual",
    automation_level: "manual",
    parser_type: "manual",
    source_group: "community",
    trust_level: "manual_only",
    moderation_required: true,
    notes: "Përdor bot/API kur ka akses të autorizuar; grupet private mbeten manuale.",
  },
  manual: {
    provider_key: "custom",
    import_mode: "manual",
    crawl_method: "manual",
    automation_level: "manual",
    parser_type: "manual",
    source_group: "manual_url",
    trust_level: "manual_only",
    moderation_required: true,
  },
};

function normalizeSourceType(type = "") {
  const value = String(type || "").trim().toLowerCase();
  if (value === "api/json" || value === "json") return "api";
  if (value === "html_needs_review") return "html";
  return SOURCE_TYPE_DEFAULTS[value] ? value : "manual";
}

function technicalDefaultsForSource(source = {}) {
  const sourceType = normalizeSourceType(source.source_type || source.parser_type);
  const defaults = SOURCE_TYPE_DEFAULTS[sourceType] || SOURCE_TYPE_DEFAULTS.manual;
  return {
    ...defaults,
    source_type: sourceType,
  };
}

// Concrete sources live in the database and are managed from the admin panel.
// This export intentionally stays empty to prevent hardcoded source seeding.
const INITIAL_IMPORT_SOURCES = [];

module.exports = {
  INITIAL_IMPORT_SOURCES,
  SOURCE_TYPE_DEFAULTS,
  normalizeSourceType,
  technicalDefaultsForSource,
};
