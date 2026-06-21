const crypto = require("node:crypto");
const { normalizeImportedItem } = require("./normalizeImportedItem");
const { isDuplicateImportedItem } = require("./deduplicateImportedItem");
const { INITIAL_IMPORT_SOURCES, technicalDefaultsForSource } = require("./seedSources");
const { validateImportedItem } = require("./validateImportedItem");

const providers = {
  arbeitnow: require("./providers/arbeitnowProvider"),
  adzuna: require("./providers/adzunaProvider"),
  jooble: require("./providers/joobleProvider"),
  eures: require("./providers/euresProvider"),
  generic_rss: require("./providers/genericRssProvider"),
  custom: require("./providers/customSourceProvider")
};

let running = false;

const DEFAULT_MIN_NEW_PER_RUN = 20;
const FALLBACK_QUERIES = [
  "driver", "truck driver", "CE driver", "C driver", "warehouse", "logistics",
  "construction", "cleaner", "cleaning", "painter", "electrician", "plumber",
  "mechanic", "factory worker", "production worker", "bakery", "baker",
  "pastry", "agriculture", "farm worker", "caregiver", "security", "delivery driver",
  "chauffeur poids lourd", "chauffeur CE", "chauffeur C", "magasinier", "entrepôt",
  "nettoyage", "peintre", "électricien", "plombier", "mécanicien", "boulanger",
  "pâtissier", "ouvrier agricole", "vrachtwagenchauffeur", "chauffeur CE",
  "magazijnmedewerker", "logistiek medewerker", "schoonmaak", "schilder",
  "elektricien", "loodgieter", "monteur", "bakker", "banketbakker",
  "productiemedewerker", "LKW Fahrer", "Fahrer CE", "Lagerarbeiter", "Lagerhelfer",
  "Logistik", "Reinigungskraft", "Maler", "Elektriker", "Klempner", "Mechaniker",
  "Bäcker", "Konditor", "Produktionsmitarbeiter", "Bauarbeiter", "autista camion",
  "autista patente CE", "magazziniere", "logistica", "pulizie", "imbianchino",
  "elettricista", "idraulico", "meccanico", "panettiere", "pasticcere", "operaio",
  "HGV driver", "warehouse operative", "pastry chef", "construction worker"
];
const FALLBACK_COUNTRIES = [
  "Belgium", "Germany", "Netherlands", "France", "Italy", "Switzerland", "Austria",
  "Sweden", "Denmark", "Finland", "Spain", "Portugal", "Ireland", "United Kingdom"
];

function now() {
  return new Date().toISOString();
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueStrings(values = []) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

function splitList(value) {
  return String(value || "")
    .split(/[,\n;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parserConfig(source = {}) {
  if (!source.parser_config) return {};
  if (typeof source.parser_config === "string") {
    try {
      return JSON.parse(source.parser_config) || {};
    } catch {
      return {};
    }
  }
  return typeof source.parser_config === "object" ? source.parser_config : {};
}

function sourceUrl(source = {}) {
  return source.jobs_url || source.category_url || source.source_url || source.base_url || "";
}

function sourceEnabled(source = {}) {
  if (typeof source.enabled === "boolean") return source.enabled;
  if (source.enabled === 0 || source.enabled === "0" || source.enabled === "false") return false;
  if (source.enabled === 1 || source.enabled === "1" || source.enabled === "true") return true;
  return source.is_active !== false;
}

function getFrequencyMinutes(source = {}) {
  if (source.crawl_frequency_minutes !== undefined && source.crawl_frequency_minutes !== null) {
    return Number(source.crawl_frequency_minutes);
  }
  return Number(source.crawl_frequency_hours ?? 6) * 60;
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
    default_excluded_keywords: "senior, manager, director, professor, teacher, research, phd, software, developer, data scientist, consultant, engineer, ingenieur, analyst, controller, support, administrator, marketing, designer, student, internship, praktikant, werkstudent, sap, bank, kredit, finanz, datenerfasser, recruiter, recruiting, personalreferent, öffentlichkeitsarbeit, architektur, stadtentwicklung, referent, controlling, leiter, produktmanagement, office management, nebenberuf",
    min_new_items_per_run: Number(config.IMPORT_ASSISTANT_MIN_NEW_PER_RUN || DEFAULT_MIN_NEW_PER_RUN),
    min_relevance_score: 45,
    max_risk_score: 70
  };
  if (existing) return { ...defaults, ...existing };
  return store.createRecord("ImportAssistantSettings", defaults, "system");
}

async function ensureDefaultSources(store) {
  const existing = [...await store.allRecords("ImportedSource")];
  const seenSeedKeys = new Set(existing.map((source) => source.seed_key).filter(Boolean));
  const seenUrls = new Set(existing.map((source) => source.source_url || source.base_url).filter(Boolean));
  for (const initial of INITIAL_IMPORT_SOURCES) {
    if (seenSeedKeys.has(initial.seed_key) || seenUrls.has(initial.source_url || initial.base_url)) continue;
    const created = await store.createRecord("ImportedSource", {
      ...initial,
      parser_config: initial.parser_config || {},
      is_editable_by_admin: true,
      failure_count: 0
    }, "system");
    existing.push(created);
    if (created.seed_key) seenSeedKeys.add(created.seed_key);
    if (created.source_url || created.base_url) seenUrls.add(created.source_url || created.base_url);
  }
  for (const source of existing) {
    const defaults = technicalDefaultsForSource(source);
    const patch = {};
    for (const field of [
      "provider_key",
      "source_type",
      "import_mode",
      "crawl_method",
      "automation_level",
      "parser_type",
      "source_group",
      "trust_level",
    ]) {
      if (source[field] === undefined || source[field] === null || source[field] === "") {
        patch[field] = defaults[field];
      }
    }
    if ((source.crawl_frequency_minutes === undefined || source.crawl_frequency_minutes === null) && source.crawl_frequency_hours === undefined) {
      patch.crawl_frequency_minutes = 360;
      patch.crawl_frequency_hours = 6;
    }
    if ((source.api_endpoint === undefined || source.api_endpoint === "") && defaults.crawl_method === "api") {
      patch.api_endpoint = source.source_url || source.base_url || "";
    }
    if ((source.rss_url === undefined || source.rss_url === "") && defaults.crawl_method === "rss") {
      patch.rss_url = source.source_url || source.base_url || "";
    }
    if ((source.provider_key || "").toLowerCase() === "arbeitnow") {
      const currentConfig = parserConfig(source);
      if (!currentConfig.max_pages || Number(currentConfig.max_pages) < 25) {
        patch.parser_config = { ...currentConfig, max_pages: 25 };
      }
      if (!source.source_url && !source.base_url) {
        patch.source_url = "https://www.arbeitnow.com/api/job-board-api";
        patch.base_url = "https://www.arbeitnow.com/api/job-board-api";
      }
    }
    const sourceUrlValue = String(source.source_url || source.base_url || source.jobs_url || "").toLowerCase();
    if (sourceUrlValue.includes("jobteaser.com/en/corporate/recruiters")) {
      patch.enabled = false;
      patch.is_active = false;
      patch.blocked_for_jobs = true;
      patch.trust_level = "manual_only";
      patch.import_mode = "manual";
      patch.crawl_method = "manual";
      patch.parser_type = "manual";
      patch.notes = "Blocked for jobs: URL is a corporate/recruiters landing page, not a jobs feed.";
    }
    if (Object.keys(patch).length) {
      await store.updateRecord("ImportedSource", source.id, patch);
      Object.assign(source, patch);
    }
  }
  return existing;
}

function shouldUseSource(sourceId, source) {
  return !sourceId || source.id === sourceId || source.provider_key === sourceId;
}

function shouldCrawlSource(source = {}, { manual = false, selected = false } = {}) {
  if (manual && selected) return true;
  if (!sourceEnabled(source)) return false;
  if (manual && !selected && source.import_mode === "manual") return false;
  const frequencyMinutes = getFrequencyMinutes(source);
  if (frequencyMinutes <= 0) return false;
  if (manual) return true;
  const last = source.last_crawled_at || source.last_checked_at;
  if (!last) return true;
  const lastChecked = new Date(last).getTime();
  if (!Number.isFinite(lastChecked)) return true;
  return Date.now() - lastChecked >= frequencyMinutes * 60 * 1000;
}

function providerIsConfigured(providerKey = "", config = {}) {
  if (providerKey === "adzuna") return Boolean(config.ADZUNA_APP_ID && config.ADZUNA_APP_KEY);
  if (providerKey === "jooble") return Boolean(config.JOOBLE_API_KEY);
  if (providerKey === "eures") return Boolean(config.EURES_API_KEY);
  return true;
}

function providerMissingReason(providerKey = "") {
  if (providerKey === "adzuna") return "ADZUNA_APP_ID/ADZUNA_APP_KEY mungon; u kalua te burimet e tjera.";
  if (providerKey === "jooble") return "JOOBLE_API_KEY mungon; u kalua te burimet e tjera.";
  if (providerKey === "eures") return "EURES_API_KEY mungon; u kalua te burimet e tjera.";
  return "Provider nuk është i konfiguruar; u kalua te burimet e tjera.";
}

function applyRuntimeOptions(source = {}, options = {}) {
  const existingParserConfig = parserConfig(source);
  const nextParserConfig = {
    ...existingParserConfig,
  };
  for (const key of ["profession_filter", "excluded_keywords", "category_filter", "country_filter"]) {
    if (options[key]) nextParserConfig[key] = options[key];
  }
  return {
    ...source,
    category_filter: options.category_filter || source.category_filter,
    country_filter: options.country_filter || source.country_filter,
    profession_filter: options.profession_filter || source.profession_filter,
    excluded_keywords: options.excluded_keywords || source.excluded_keywords,
    parser_config: nextParserConfig,
  };
}

function supportsQueryExpansion(source = {}) {
  const providerKey = source.provider_key || "";
  return ["adzuna", "jooble", "eures"].includes(providerKey);
}

function buildAttemptPlan(source = {}, options = {}, { selectedSourceRun = false } = {}) {
  const config = parserConfig(source);
  const baseQuery = options.query || config.query || source.query || "";
  const baseQueries = uniqueStrings([
    ...splitList(source.profession_filter || config.profession_filter),
    ...splitList(options.profession_filter),
    baseQuery
  ]);
  const queries = supportsQueryExpansion(source)
    ? uniqueStrings([...baseQueries, ...FALLBACK_QUERIES])
    : uniqueStrings([baseQuery || source.profession_filter || source.category_filter || ""]);
  const countries = supportsQueryExpansion(source)
    ? uniqueStrings([options.country_filter, source.country_filter, config.country_filter, ...FALLBACK_COUNTRIES])
    : uniqueStrings([options.country_filter, source.country_filter, config.country_filter]);
  const limitedQueries = (selectedSourceRun ? queries.slice(0, 20) : queries.slice(0, 8));
  const limitedCountries = (selectedSourceRun ? countries.slice(0, 14) : countries.slice(0, 6));
  const attempts = [];
  for (const query of (limitedQueries.length ? limitedQueries : [""])) {
    for (const country of (limitedCountries.length ? limitedCountries : [""])) {
      attempts.push({ query, country });
    }
  }
  return attempts.length ? attempts : [{ query: "", country: "" }];
}

function passesRuntimeThresholds(normalized = {}, options = {}) {
  if (!options.enforce_runtime_quality_filters) return true;
  const minRelevance = Number(options.min_relevance_score || 0);
  const maxRisk = Number(options.max_risk_score || 100);
  if (minRelevance && Number(normalized.relevance_score || 0) < minRelevance) return false;
  if (Number(normalized.risk_score || 0) > maxRisk) return false;
  return true;
}

function primaryContact(methods = [], type) {
  return ensureArray(methods).find((method) => method?.type === type)?.value || "";
}

function duplicateHash(item = {}) {
  const input = [
    item.source_id,
    item.original_id || item.external_id,
    item.original_url || item.source_url,
    item.original_title,
    item.original_company,
    item.country,
    item.city
  ].filter(Boolean).join("|").toLowerCase();
  return crypto.createHash("sha256").update(input || crypto.randomUUID()).digest("hex");
}

async function createImportFailure({ raw, source, providerKey, store, requestedBy, normalized, validation }) {
  const payload = {
    source_id: normalized?.source_id || source?.id || "",
    source_name: normalized?.source_name || raw?.source_name || source?.name || providerKey || "",
    provider: providerKey || source?.provider_key || raw?.provider_key || "",
    raw_payload: raw || {},
    reason: validation?.reason || "Imported item failed validation",
    status: validation?.status || "rejected_low_quality_import",
    original_url: normalized?.original_url || normalized?.source_url || raw?.original_url || raw?.source_url || raw?.url || "",
    original_title: normalized?.original_title || raw?.original_title || raw?.title || "",
    created_at: now()
  };
  try {
    return await store.createRecord("ImportFailure", payload, requestedBy);
  } catch (error) {
    return { id: "", ...payload, error: error?.message || "Failed to store import failure" };
  }
}

async function processRawImportedItem({ raw, source, providerKey, store, requestedBy, options, existingImported, existingJobs, createdItems }) {
  const normalized = await normalizeImportedItem(raw, source);
  const sourceName = normalized.source_name || source.name || providerKey;
  const contactMethods = normalized.contact_methods || [];
  const validation = validateImportedItem(normalized, raw, source);
  if (!validation.valid) {
    await createImportFailure({ raw, source, providerKey, store, requestedBy, normalized, validation });
    return { created: false, duplicate: false, skipped: false, rejected: true, imported: null, validation };
  }
  if (!passesRuntimeThresholds(normalized, options)) {
    const runtimeValidation = {
      valid: false,
      status: "rejected_low_quality_import",
      reason: "Imported item did not pass runtime relevance/risk filters"
    };
    await createImportFailure({ raw, source, providerKey, store, requestedBy, normalized, validation: runtimeValidation });
    return { created: false, duplicate: false, skipped: false, rejected: true, imported: null, validation: runtimeValidation };
  }
  const duplicate = isDuplicateImportedItem(
    normalized,
    [...existingImported, ...createdItems],
    existingJobs
  );
  if (duplicate.duplicate) {
    const duplicateRecord = await store.createRecord("ImportedPost", {
      original_text: normalized.original_description || normalized.original_title,
      edited_text: normalized.shqip_summary || normalized.original_description,
      title: normalized.shqip_title,
      description: normalized.shqip_summary || normalized.original_description,
      company_name: normalized.original_company || "",
      location: normalized.original_location || "",
      category: normalized.category,
      listing_type: normalized.item_type === "job" ? "ofroj" : "tjeter",
      source: providerKey,
      source_id: normalized.source_id || source.id,
      source_name: sourceName,
      source_url: normalized.source_url,
      import_source_url: normalized.source_url,
      original_url: normalized.original_url || normalized.source_url,
      original_post_id: normalized.original_post_id || normalized.external_id,
      original_id: normalized.original_id || normalized.external_id,
      original_published_at: normalized.original_published_at,
      external_id: normalized.external_id,
      provider_key: providerKey,
      status: "duplicate",
      expires_at: normalized.expires_at,
      original_expires_at: normalized.original_expires_at,
      expiry_source: normalized.expiry_source,
      expired_at: normalized.expired_at,
      is_expired: normalized.is_expired,
      auto_archive_after_expiry: normalized.auto_archive_after_expiry,
      renewal_count: normalized.renewal_count,
      last_renewed_at: normalized.last_renewed_at,
      duplicate_reason: duplicate.reason,
      duplicate_hash: duplicateHash(normalized),
      address: normalized.address || normalized.original_location || "",
      contact_email: primaryContact(contactMethods, "email"),
      contact_phone: primaryContact(contactMethods, "phone") || primaryContact(contactMethods, "whatsapp"),
      contact_url: primaryContact(contactMethods, "website") || primaryContact(contactMethods, "application_form"),
      raw_import_payload: raw,
      imported_by: requestedBy
    }, requestedBy);
    existingImported.push(duplicateRecord);
    return { created: false, duplicate: true, skipped: false, imported: duplicateRecord };
  }
  const imported = await store.createRecord("ImportedPost", {
    original_text: normalized.original_description || normalized.original_title,
    edited_text: normalized.shqip_summary || normalized.original_description,
    title: normalized.shqip_title,
    description: normalized.shqip_summary || normalized.original_description,
    company_name: normalized.original_company || "",
    location: normalized.original_location || "",
    address: normalized.address || normalized.original_location || "",
    author_name: normalized.source_identity_name,
    author_profile_url: normalized.source_identity_url,
    import_author_profile_url: normalized.source_identity_url,
    original_post_url: normalized.source_url,
    source_url: normalized.source_url,
    import_source_url: normalized.source_url,
    source_name: sourceName,
    source: providerKey,
    provider_key: providerKey,
    source_id: normalized.source_id || source.id,
    original_url: normalized.original_url || normalized.source_url,
    original_post_id: normalized.original_post_id || normalized.external_id,
    original_id: normalized.original_id || normalized.external_id,
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
    contact_info: JSON.stringify(contactMethods),
    contact_methods: contactMethods,
    contact_email: primaryContact(contactMethods, "email"),
    contact_phone: primaryContact(contactMethods, "phone") || primaryContact(contactMethods, "whatsapp"),
    contact_url: primaryContact(contactMethods, "website") || primaryContact(contactMethods, "application_form"),
    show_source_url: false,
    show_author_profile_url: false,
    source_public_visible: false,
    imported_public_badge_visible: false,
    status: "pending_review",
    expires_at: normalized.expires_at,
    original_expires_at: normalized.original_expires_at,
    expiry_source: normalized.expiry_source,
    expired_at: normalized.expired_at,
    is_expired: normalized.is_expired,
    auto_archive_after_expiry: normalized.auto_archive_after_expiry,
    renewal_count: normalized.renewal_count,
    last_renewed_at: normalized.last_renewed_at,
    duplicate_hash: duplicateHash(normalized),
    raw_import_payload: raw,
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
  return { created: true, duplicate: false, skipped: false, imported };
}

async function runImport({ store, config, sourceId = "", maxItems, requestedBy = "system", force = false, options = {} } = {}) {
  if (running && !force) return { success: false, status: "locked", message: "Importimi është duke u ekzekutuar." };
  running = true;
  const startedAt = now();
  const logs = [];
  const createdItems = [];
  let fetchedTotal = 0;
  let duplicateTotal = 0;
  let skippedTotal = 0;
  let rejectedTotal = 0;
  let validTotal = 0;
  let errorTotal = 0;

  try {
    const settings = await ensureDefaultSettings(store, config);
    const allSources = await ensureDefaultSources(store);
    const strictSource = Boolean(options.strict_source);
    const manualRun = Boolean(sourceId || options.manual_run);
    const selectedSourceRun = Boolean(sourceId && strictSource);
    const sources = allSources
      .filter((source) => !strictSource || shouldUseSource(sourceId, source))
      .filter((source) => shouldCrawlSource(source, { manual: manualRun, selected: selectedSourceRun }))
      .map((source) => applyRuntimeOptions(source, options))
      .sort((a, b) => {
        if (!sourceId || strictSource) return 0;
        const aSelected = shouldUseSource(sourceId, a) ? 0 : 1;
        const bSelected = shouldUseSource(sourceId, b) ? 0 : 1;
        return aSelected - bSelected;
      });
    const minNewItems = Math.max(0, Number(options.min_new_items_per_run || settings.min_new_items_per_run || config.IMPORT_ASSISTANT_MIN_NEW_PER_RUN || DEFAULT_MIN_NEW_PER_RUN));
    const requestedLimit = Number(maxItems || settings.max_items_per_run || config.IMPORT_ASSISTANT_MAX_PER_RUN || 100);
    const limit = Math.max(1, minNewItems || 0, requestedLimit);
    const existingImported = [...await store.allRecords("ImportedPost")];
    const existingJobs = [...await store.allRecords("Job")];
    const runnableSourceCount = Math.max(1, sources.filter((source) => providerIsConfigured(source.provider_key || "custom", config) || selectedSourceRun).length);
    const perSourceTargetNew = selectedSourceRun
      ? limit
      : Math.max(1, Math.ceil((minNewItems || limit) / Math.min(runnableSourceCount, 4)));

    for (const source of sources) {
      const providerKey = source.provider_key || "custom";
      const provider = providers[providerKey] || providers.custom;
      const logBase = {
        provider_key: providerKey,
        source_id: source.id,
        started_at: now(),
        fetched_count: 0,
        valid_count: 0,
        imported_count: 0,
        created_count: 0,
        duplicate_count: 0,
        skipped_count: 0,
        rejected_count: 0,
        error_count: 0,
        target_new_count: minNewItems,
        queries_tried: [],
        countries_tried: [],
        status: "running"
      };
      let logRecord = await store.createRecord("ImportLog", logBase, requestedBy);
      if (!providerIsConfigured(providerKey, config) && !selectedSourceRun) {
        skippedTotal += 1;
        logRecord = await store.updateRecord("ImportLog", logRecord.id, {
          finished_at: now(),
          skipped_count: 1,
          target_new_count: minNewItems,
          status: "skipped",
          error_message: providerMissingReason(providerKey)
        });
        logs.push(logRecord);
        continue;
      }
      try {
        let createdCount = 0;
        let duplicateCount = 0;
        let skippedCount = 0;
        let rejectedCount = 0;
        let validCount = 0;
        let fetchedCount = 0;
        const queriesTried = new Set();
        const countriesTried = new Set();
        const attempts = buildAttemptPlan(source, options, { selectedSourceRun });
        const perAttemptLimit = Math.max(5, Math.min(limit, Math.ceil(limit / Math.max(1, Math.min(attempts.length, 8)))));
        for (const attempt of attempts) {
          if (createdItems.length >= limit) break;
          if (!selectedSourceRun && createdCount >= perSourceTargetNew) break;
          if (minNewItems && createdItems.length >= minNewItems && !selectedSourceRun) break;
          if (attempt.query) queriesTried.add(attempt.query);
          if (attempt.country) countriesTried.add(attempt.country);
          const sourceForProvider = applyRuntimeOptions({
            ...source,
            base_url: sourceUrl(source),
            parser_config: {
              ...parserConfig(source),
              query: attempt.query,
              country_filter: attempt.country || source.country_filter || parserConfig(source).country_filter || "",
            },
          }, {
            ...options,
            profession_filter: attempt.query || options.profession_filter || source.profession_filter,
            country_filter: attempt.country || options.country_filter || source.country_filter,
          });
          const rawItems = ensureArray(await provider.fetchItems({ source: sourceForProvider, config, maxItems: perAttemptLimit }));
          fetchedCount += rawItems.length;
          fetchedTotal += rawItems.length;
          for (const raw of rawItems.slice(0, perAttemptLimit)) {
            if (createdItems.length >= limit) break;
            if (!selectedSourceRun && createdCount >= perSourceTargetNew) break;
            const processed = await processRawImportedItem({
              raw,
              source,
              providerKey,
              store,
              requestedBy,
              options,
              existingImported,
              existingJobs,
              createdItems
            });
            if (processed.created) createdCount += 1;
            if (processed.duplicate) {
              duplicateCount += 1;
              duplicateTotal += 1;
            }
            if (processed.created || processed.duplicate) {
              validCount += 1;
              validTotal += 1;
            }
            if (processed.skipped) {
              skippedCount += 1;
              skippedTotal += 1;
            }
            if (processed.rejected) {
              rejectedCount += 1;
              rejectedTotal += 1;
            }
          }
        }
        await store.updateRecord("ImportedSource", source.id, {
          last_checked_at: now(),
          last_crawled_at: now(),
          last_success_at: now(),
          last_error: "",
          failure_count: 0
        });
        logRecord = await store.updateRecord("ImportLog", logRecord.id, {
          finished_at: now(),
          fetched_count: fetchedCount,
          valid_count: validCount,
          imported_count: createdCount,
          created_count: createdCount,
          duplicate_count: duplicateCount,
          skipped_count: skippedCount,
          rejected_count: rejectedCount,
          queries_tried: [...queriesTried],
          countries_tried: [...countriesTried],
          target_new_count: minNewItems,
          status: createdCount > 0 && rejectedCount > 0
            ? "imported_with_rejections"
            : createdCount > 0
              ? (createdItems.length >= minNewItems || !minNewItems ? "success" : "partial_success")
              : (fetchedCount > 0 && rejectedCount > 0 && validCount === 0)
                ? "imported_zero_valid_items"
                : (duplicateCount > 0 ? "duplicate_only" : "no_results"),
          error_message: fetchedCount > 0 && rejectedCount > 0 && validCount === 0
            ? "Items fetched but failed quality validation"
            : (createdCount === 0 && minNewItems ? `Nuk u arrit minimumi ${minNewItems}; u provuan ${queriesTried.size || 1} query dhe ${countriesTried.size || 1} vende për këtë burim.` : "")
        });
        logs.push(logRecord);
      } catch (error) {
        errorTotal += 1;
        await store.updateRecord("ImportedSource", source.id, {
          last_checked_at: now(),
          last_crawled_at: now(),
          last_error: error.message || "Import failed",
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
      status: createdItems.length === 0 && rejectedTotal > 0 && validTotal === 0
        ? "imported_zero_valid_items"
        : (createdItems.length === 0 && duplicateTotal > 0 ? "duplicate_only" : (createdItems.length < minNewItems ? "partial_success" : "completed")),
      started_at: startedAt,
      finished_at: now(),
      fetched_count: fetchedTotal,
      valid_count: validTotal,
      imported_count: createdItems.length,
      created_count: createdItems.length,
      duplicate_count: duplicateTotal,
      skipped_count: skippedTotal,
      rejected_count: rejectedTotal,
      error_count: errorTotal,
      target_new_count: minNewItems,
      fallback_summary: {
        providers_tried: uniqueStrings(logs.map((log) => log.provider_key)),
        queries_tried: uniqueStrings(logs.flatMap((log) => ensureArray(log.queries_tried))),
        countries_tried: uniqueStrings(logs.flatMap((log) => ensureArray(log.countries_tried))),
        min_new_items_per_run: minNewItems,
        reason: createdItems.length >= minNewItems
          ? ""
          : `U krijuan ${createdItems.length} të reja nga minimumi ${minNewItems}; u shteruan burimet/provat e disponueshme.`
      },
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
