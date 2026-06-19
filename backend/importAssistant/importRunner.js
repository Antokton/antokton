const crypto = require("node:crypto");
const { normalizeImportedItem } = require("./normalizeImportedItem");
const { isDuplicateImportedItem } = require("./deduplicateImportedItem");

const providers = {
  arbeitnow: require("./providers/arbeitnowProvider"),
  adzuna: require("./providers/adzunaProvider"),
  jooble: require("./providers/joobleProvider"),
  eures: require("./providers/euresProvider"),
  generic_rss: require("./providers/genericRssProvider"),
  custom: require("./providers/customSourceProvider")
};

let running = false;

function now() {
  return new Date().toISOString();
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function sourceUrl(source = {}) {
  return source.source_url || source.base_url || "";
}

async function ensureDefaultSettings(store, config) {
  const existing = (await store.allRecords("ImportAssistantSettings"))[0];
  const defaults = {
    auto_import_enabled: config.IMPORT_ASSISTANT_ENABLED !== false,
    import_frequency_hours: config.IMPORT_ASSISTANT_DEFAULT_FREQUENCY_HOURS || 6,
    max_items_per_run: config.IMPORT_ASSISTANT_MAX_PER_RUN || 100,
    auto_publish_enabled: Boolean(config.IMPORT_ASSISTANT_AUTO_PUBLISH),
    default_source_id: "",
    default_provider_key: "",
    default_category_filter: "pune",
    default_country_filter: "",
    default_profession_filter: "shofer, pastrim, depo, magazin, ndertim, ndërtim, mekanik, elektricist, elektriçist, hidraulik, kujdestar, siguri, shperndarje, shpërndarje, bujqesi, bujqësi, fabrike, fabrikë, bojaxhi, furre, furrë, pasticeri",
    default_excluded_keywords: "senior, manager, director, professor, teacher, research, phd, software, developer, data scientist, consultant",
    min_relevance_score: 45,
    max_risk_score: 70
  };
  if (existing) return { ...defaults, ...existing };
  return store.createRecord("ImportAssistantSettings", defaults, "system");
}

async function ensureDefaultSources(store) {
  const existing = await store.allRecords("ImportedSource");
  const defaults = [
    {
      name: "Arbeitnow",
      provider_key: "arbeitnow",
      source_type: "api",
      source_url: "https://www.arbeitnow.com/api/job-board-api",
      base_url: "https://www.arbeitnow.com/api/job-board-api",
      is_active: true,
      crawl_frequency_hours: 6,
      country_filter: "Gjermani",
      category_filter: "job",
      source_group: "global_provider",
      parser_type: "api",
      parser_config: {},
      trust_level: "medium",
      is_editable_by_admin: false,
      failure_count: 0
    },
    {
      name: "Adzuna",
      provider_key: "adzuna",
      source_type: "api",
      source_url: "https://api.adzuna.com/v1/api/jobs",
      base_url: "https://api.adzuna.com/v1/api/jobs",
      is_active: false,
      crawl_frequency_hours: 6,
      country_filter: "",
      category_filter: "job",
      source_group: "global_provider",
      parser_type: "api",
      parser_config: {},
      trust_level: "medium",
      is_editable_by_admin: true,
      failure_count: 0
    },
    {
      name: "Jooble",
      provider_key: "jooble",
      source_type: "api",
      source_url: "https://jooble.org/api",
      base_url: "https://jooble.org/api",
      is_active: false,
      crawl_frequency_hours: 6,
      country_filter: "",
      category_filter: "job",
      source_group: "global_provider",
      parser_type: "api",
      parser_config: {},
      trust_level: "medium",
      is_editable_by_admin: true,
      failure_count: 0
    },
    {
      name: "EURES",
      provider_key: "eures",
      source_type: "api",
      source_url: "",
      base_url: "",
      is_active: false,
      crawl_frequency_hours: 6,
      country_filter: "",
      category_filter: "job",
      source_group: "global_provider",
      parser_type: "api",
      parser_config: {},
      trust_level: "high",
      is_editable_by_admin: true,
      failure_count: 0
    },
    {
      name: "RSS/API i personalizuar",
      provider_key: "generic_rss",
      source_type: "rss",
      source_url: "",
      base_url: "",
      is_active: false,
      crawl_frequency_hours: 6,
      country_filter: "",
      category_filter: "",
      source_group: "rss",
      parser_type: "rss",
      parser_config: {},
      trust_level: "unknown",
      is_editable_by_admin: true,
      failure_count: 0
    },
    {
      name: "Burim i personalizuar",
      provider_key: "custom",
      source_type: "api",
      source_url: "",
      base_url: "",
      is_active: false,
      crawl_frequency_hours: 6,
      country_filter: "",
      category_filter: "",
      source_group: "custom_api",
      parser_type: "custom",
      parser_config: {},
      trust_level: "unknown",
      is_editable_by_admin: true,
      failure_count: 0
    }
  ];
  const existingProviderKeys = new Set(existing.map((source) => source.provider_key).filter(Boolean));
  const created = [];
  for (const source of defaults) {
    if (!existingProviderKeys.has(source.provider_key)) {
      created.push(await store.createRecord("ImportedSource", source, "system"));
    }
  }
  return [...existing, ...created];
}

function shouldUseSource(sourceId, source) {
  return !sourceId || source.id === sourceId || source.provider_key === sourceId;
}

function shouldCrawlSource(source = {}, { manual = false, selected = false } = {}) {
  if (manual && selected) return true;
  if (source.is_active === false) return false;
  const frequency = Number(source.crawl_frequency_hours ?? 6);
  if (frequency <= 0) return false;
  if (manual) return true;
  if (!source.last_checked_at) return true;
  const lastChecked = new Date(source.last_checked_at).getTime();
  if (!Number.isFinite(lastChecked)) return true;
  return Date.now() - lastChecked >= frequency * 60 * 60 * 1000;
}

function applyRuntimeOptions(source = {}, options = {}) {
  const parserConfig = {
    ...(source.parser_config || {}),
  };
  for (const key of ["profession_filter", "excluded_keywords", "category_filter", "country_filter"]) {
    if (options[key]) parserConfig[key] = options[key];
  }
  return {
    ...source,
    category_filter: options.category_filter || source.category_filter,
    country_filter: options.country_filter || source.country_filter,
    profession_filter: options.profession_filter || source.profession_filter,
    excluded_keywords: options.excluded_keywords || source.excluded_keywords,
    parser_config: parserConfig,
  };
}

function passesRuntimeThresholds(normalized = {}, options = {}) {
  const minRelevance = Number(options.min_relevance_score || 0);
  const maxRisk = Number(options.max_risk_score || 100);
  if (minRelevance && Number(normalized.relevance_score || 0) < minRelevance) return false;
  if (Number(normalized.risk_score || 0) > maxRisk) return false;
  return true;
}

async function runImport({ store, config, sourceId = "", maxItems, requestedBy = "system", force = false, options = {} } = {}) {
  if (running && !force) return { success: false, status: "locked", message: "Importimi është duke u ekzekutuar." };
  running = true;
  const startedAt = now();
  const logs = [];
  const createdItems = [];
  let fetchedTotal = 0;
  let duplicateTotal = 0;
  let errorTotal = 0;

  try {
    const settings = await ensureDefaultSettings(store, config);
    const allSources = await ensureDefaultSources(store);
    const manualRun = Boolean(sourceId || options.manual_run);
    const selectedSourceRun = Boolean(sourceId);
    const sources = allSources
      .filter((source) => shouldUseSource(sourceId, source))
      .filter((source) => shouldCrawlSource(source, { manual: manualRun, selected: selectedSourceRun }))
      .map((source) => applyRuntimeOptions(source, options));
    const limit = Math.max(1, Number(maxItems || settings.max_items_per_run || config.IMPORT_ASSISTANT_MAX_PER_RUN || 100));
    const existingImported = await store.allRecords("ImportedPost");
    const existingJobs = await store.allRecords("Job");

    for (const source of sources) {
      const providerKey = source.provider_key || "custom";
      const provider = providers[providerKey] || providers.custom;
      const logBase = {
        provider_key: providerKey,
        source_id: source.id,
        started_at: now(),
        fetched_count: 0,
        created_count: 0,
        duplicate_count: 0,
        rejected_count: 0,
        error_count: 0,
        status: "running"
      };
      let logRecord = await store.createRecord("ImportLog", logBase, requestedBy);
      try {
        const sourceForProvider = { ...source, base_url: sourceUrl(source) };
        const rawItems = ensureArray(await provider.fetchItems({ source: sourceForProvider, config, maxItems: limit }));
        fetchedTotal += rawItems.length;
        let createdCount = 0;
        let duplicateCount = 0;
        for (const raw of rawItems.slice(0, limit)) {
          const normalized = await normalizeImportedItem(raw, source);
          if (!passesRuntimeThresholds(normalized, options)) {
            continue;
          }
          const duplicate = isDuplicateImportedItem(
            normalized,
            [...existingImported, ...createdItems],
            existingJobs
          );
          if (duplicate.duplicate) {
            duplicateCount += 1;
            duplicateTotal += 1;
            await store.createRecord("ImportedPost", {
              original_text: normalized.original_description || normalized.original_title,
              edited_text: normalized.shqip_summary || normalized.original_description,
              title: normalized.shqip_title,
              category: normalized.category,
              listing_type: normalized.item_type === "job" ? "ofroj" : "tjeter",
              source: providerKey,
              source_url: normalized.source_url,
              import_source_url: normalized.source_url,
              original_url: normalized.source_url,
              original_id: normalized.external_id,
              original_published_at: normalized.original_published_at,
              source_name: normalized.source_name,
              external_id: normalized.external_id,
              provider_key: providerKey,
              status: "duplicate",
              duplicate_reason: duplicate.reason,
              imported_by: requestedBy
            }, requestedBy);
            continue;
          }
          const imported = await store.createRecord("ImportedPost", {
            original_text: normalized.original_description || normalized.original_title,
            edited_text: normalized.shqip_summary || normalized.original_description,
            title: normalized.shqip_title,
            author_name: normalized.source_identity_name,
            author_profile_url: normalized.source_identity_url,
            import_author_profile_url: normalized.source_identity_url,
            original_post_url: normalized.source_url,
            source_url: normalized.source_url,
            import_source_url: normalized.source_url,
            source_name: normalized.source_name,
            source: providerKey,
            provider_key: providerKey,
            source_id: normalized.source_id,
            original_url: normalized.source_url,
            original_id: normalized.external_id,
            original_published_at: normalized.original_published_at,
            external_id: normalized.external_id || crypto.randomUUID(),
            item_type: normalized.item_type,
            category: normalized.category,
            listing_type: normalized.item_type === "job" ? "ofroj" : "tjeter",
            profession: normalized.profession,
            country: normalized.country || normalized.original_country,
            region: normalized.region,
            city: normalized.city || normalized.original_city,
            salary: normalized.original_salary,
            contact_info: JSON.stringify(normalized.contact_methods || []),
            contact_methods: normalized.contact_methods || [],
            show_source_url: false,
            show_author_profile_url: false,
            source_public_visible: false,
            imported_public_badge_visible: false,
            status: "pending_review",
            imported_by: requestedBy,
            importer_email: requestedBy,
            relevance_score: normalized.relevance_score,
            relevance_level: normalized.relevance_level,
            relevance_reason: normalized.relevance_reason,
            risk_score: normalized.risk_score,
            risk_reason: normalized.risk_reason,
            ethical_score: normalized.ethical_score,
            hallall_score: normalized.ethical_score,
            ethical_reason: normalized.ethical_reason,
            source_trust_score: normalized.source_trust_score,
            source_identity_type: normalized.source_identity_type,
            source_identity_name: normalized.source_identity_name,
            source_identity_url: normalized.source_identity_url,
            source_identity_confidence: normalized.source_identity_confidence,
            is_albanian_source: normalized.is_albanian_source,
            albanian_source_reason: normalized.albanian_source_reason,
            contact_language_required: normalized.contact_language_required,
            contact_languages: normalized.contact_languages,
            communication_languages: normalized.contact_languages,
            show_communication_language: normalized.contact_language_required,
            freshness_score: normalized.freshness_score,
            completeness_score: normalized.completeness_score,
            final_score: normalized.final_score,
            requires_manual_review: true,
            quality_notes: [normalized.relevance_reason, normalized.risk_reason, normalized.ethical_reason].filter(Boolean)
          }, requestedBy);
          createdItems.push(imported);
          existingImported.push(imported);
          createdCount += 1;
        }
        await store.updateRecord("ImportedSource", source.id, {
          last_checked_at: now(),
          last_success_at: now(),
          failure_count: 0
        });
        logRecord = await store.updateRecord("ImportLog", logRecord.id, {
          finished_at: now(),
          fetched_count: rawItems.length,
          created_count: createdCount,
          duplicate_count: duplicateCount,
          status: "success"
        });
        logs.push(logRecord);
      } catch (error) {
        errorTotal += 1;
        await store.updateRecord("ImportedSource", source.id, {
          last_checked_at: now(),
          failure_count: Number(source.failure_count || 0) + 1
        }).catch(() => {});
        logRecord = await store.updateRecord("ImportLog", logRecord.id, {
          finished_at: now(),
          status: "error",
          error_count: 1,
          error_message: error.message || "Import failed"
        });
        logs.push(logRecord);
      }
    }

    return {
      success: true,
      status: "completed",
      started_at: startedAt,
      finished_at: now(),
      fetched_count: fetchedTotal,
      created_count: createdItems.length,
      duplicate_count: duplicateTotal,
      error_count: errorTotal,
      logs,
      items: createdItems
    };
  } finally {
    running = false;
  }
}

module.exports = {
  ensureDefaultSettings,
  ensureDefaultSources,
  runImport
};
