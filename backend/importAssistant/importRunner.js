const crypto = require("node:crypto");
const { normalizeImportedItem } = require("./normalizeImportedItem");
const { isDuplicateImportedItem } = require("./deduplicateImportedItem");
const { INITIAL_IMPORT_SOURCES, technicalDefaultsForSource } = require("./seedSources");
const { validateImportedItem, isBlockedNonJobUrl } = require("./validateImportedItem");
const { applyKnownSourceConfig } = require("./sourceConfigRules");

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
const DEFAULT_IMPORT_QUERIES = [
  "shofer", "pastrim", "depo", "magazin", "ndertim", "mekanik",
  "elektricist", "hidraulik", "kuzhinier", "siguri", "bujqesi",
  "fabrike", "pasticeri"
];
const DEFAULT_IMPORT_COUNTRIES = [
  "Germany", "Belgium", "Netherlands", "France", "Italy", "Austria",
  "Switzerland", "United Kingdom", "Remote"
];
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
  const normalized = applyKnownSourceConfig(source);
  return normalized.api_endpoint || normalized.rss_url || normalized.jobs_url || normalized.category_url || normalized.source_url || normalized.base_url || "";
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
      "crawl_method",
      "automation_level",
      "parser_type",
      "source_group",
    ]) {
      if (source[field] !== defaults[field]) {
        patch[field] = defaults[field];
      }
    }
    if (
      source.import_mode === undefined ||
      source.import_mode === null ||
      source.import_mode === "" ||
      source.import_mode === "mixed" ||
      (["api", "rss", "html"].includes(defaults.source_type) && source.import_mode !== defaults.import_mode)
    ) {
      patch.import_mode = defaults.import_mode;
    }
    if (source.trust_level === undefined || source.trust_level === null || source.trust_level === "") {
      patch.trust_level = defaults.trust_level;
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

const ALL_SOURCE_SELECTIONS = new Set([
  "all",
  "__all",
  "all-active",
  "all_active",
  "all-active-sources",
  "all_active_sources",
  "all-sources",
  "all_sources",
  "te gjitha",
  "të gjitha",
  "te_gjitha",
  "të_gjitha"
]);

function normalizeSelectedSourceId(value = "") {
  const selected = String(value || "").trim();
  if (!selected) return "";
  return ALL_SOURCE_SELECTIONS.has(selected.toLowerCase()) ? "" : selected;
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

function isAutomaticRunnableSource(source = {}) {
  if (!sourceEnabled(source)) return false;
  return String(source.import_mode || "").toLowerCase() !== "manual";
}

async function forceSeedRunnableSources(store) {
  const existing = [...await store.allRecords("ImportedSource")];
  const seenSeedKeys = new Set(existing.map((source) => source.seed_key).filter(Boolean));
  const seenUrls = new Set(existing.map((source) => source.source_url || source.base_url || source.rss_url || source.api_endpoint).filter(Boolean));
  const created = [];
  for (const initial of INITIAL_IMPORT_SOURCES.filter(isAutomaticRunnableSource)) {
    const initialUrl = initial.source_url || initial.base_url || initial.rss_url || initial.api_endpoint || "";
    if (seenSeedKeys.has(initial.seed_key) || (initialUrl && seenUrls.has(initialUrl))) continue;
    const row = await store.createRecord("ImportedSource", {
      ...initial,
      parser_config: initial.parser_config || {},
      is_editable_by_admin: true,
      failure_count: 0
    }, "system");
    created.push(row);
    if (row.seed_key) seenSeedKeys.add(row.seed_key);
    if (row.source_url || row.base_url || row.rss_url || row.api_endpoint) {
      seenUrls.add(row.source_url || row.base_url || row.rss_url || row.api_endpoint);
    }
  }
  return [...existing, ...created];
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

function diagnoseSourceConfig(source = {}, providerKey = "") {
  const config = parserConfig(source);
  const missing = [];
  const url = sourceUrl(source);
  const crawlMethod = source.crawl_method || source.parser_type || source.source_type || "";
  if (!source.name) missing.push("name");
  if (!providerKey) missing.push("provider_key");
  if (!source.source_type && !source.parser_type) missing.push("source_type/parser_type");
  if (!source.import_mode) missing.push("import_mode");
  if (!source.source_group) missing.push("source_group");
  if (["custom", "generic_rss"].includes(providerKey) && !url && !source.api_endpoint && !source.rss_url && !source.jobs_url && !source.category_url) {
    missing.push("source_url/base_url/api_endpoint/rss_url/jobs_url/category_url");
  }
  if ((crawlMethod === "rss" || providerKey === "generic_rss") && !source.rss_url && !url) missing.push("rss_url");
  if (crawlMethod === "api" && !source.api_endpoint && !url) missing.push("api_endpoint");
  if (crawlMethod === "html" && !source.jobs_url && !source.category_url && !url) missing.push("jobs_url/category_url/source_url");
  if (providerKey === "adzuna") {
    missing.push("ADZUNA_APP_ID/ADZUNA_APP_KEY në env nëse nuk janë vendosur");
  }
  if (providerKey === "jooble") missing.push("JOOBLE_API_KEY në env nëse nuk është vendosur");
  if (providerKey === "eures") missing.push("EURES_API_KEY në env nëse nuk është vendosur");
  const hasQuery = source.profession_filter || config.profession_filter || config.query || source.query;
  if (supportsQueryExpansion(source) && !hasQuery) missing.push("profession_filter/query");
  return [...new Set(missing)];
}

function sourceTestRecommendation(source = {}, runtimeConfig = {}, fetchedCount = 0, validCount = 0, rejectedCount = 0) {
  const providerKey = source.provider_key || "custom";
  const url = sourceUrl(source);
  if (!providerIsConfigured(providerKey, runtimeConfig)) return providerMissingReason(providerKey);
  if (!url && ["custom", "generic_rss"].includes(providerKey)) return "Vendos URL të lexueshme publike ose endpoint API/RSS para testit.";
  if (fetchedCount === 0) return "Burimi nuk ktheu artikuj. Kontrollo URL/API/RSS, provider-in, query-n dhe vendin; nëse burimi kërkon login, importi publik nuk mund ta lexojë automatikisht.";
  if (fetchedCount > 0 && validCount === 0 && rejectedCount > 0) return "Burimi ktheu artikuj, por nuk kaluan validimin. Hap shembujt dhe plotëso titull/URL/përshkrim/kontakt ose ul filtrat shumë të ngushtë.";
  return "";
}

function summarizeImportLogs(logs = [], sources = [], { createdCount = 0, minNewItems = 0 } = {}) {
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const sourceNames = uniqueStrings(logs.map((log) => sourceById.get(log.source_id)?.name || log.provider_key));
  const failureNotes = uniqueStrings(logs.flatMap((log) => [
    log.error_message,
    log.note,
    log.status && !["success", "partial_success", "running"].includes(log.status) ? log.status : ""
  ]));
  const sourceStatuses = logs.slice(0, 12).map((log) => ({
    source_id: log.source_id || "",
    source_name: sourceById.get(log.source_id)?.name || log.provider_key || "-",
    provider_key: log.provider_key || "",
    status: log.status || "",
    fetched_count: Number(log.fetched_count || 0),
    valid_count: Number(log.valid_count || 0),
    created_count: Number(log.created_count || log.imported_count || 0),
    rejected_count: Number(log.rejected_count || 0),
    skipped_count: Number(log.skipped_count || 0),
    error_count: Number(log.error_count || 0),
    reason: log.error_message || ""
  }));
  let zeroReason = "";
  if (createdCount === 0) {
    if (!logs.length) zeroReason = "Nuk u ekzekutua asnjë burim importi.";
    else if (failureNotes.length) zeroReason = failureNotes[0];
    else zeroReason = "Burimet u provuan, por nuk kthyen njoftime të vlefshme për filtrat aktualë.";
  } else if (minNewItems && createdCount < minNewItems) {
    zeroReason = `U krijuan ${createdCount} të reja nga minimumi ${minNewItems}; u shteruan burimet/provat e disponueshme.`;
  }
  return {
    providers_tried: uniqueStrings(logs.map((log) => log.provider_key)),
    source_names: sourceNames,
    queries_tried: uniqueStrings(logs.flatMap((log) => ensureArray(log.queries_tried))),
    countries_tried: uniqueStrings(logs.flatMap((log) => ensureArray(log.countries_tried))),
    failure_notes: failureNotes,
    source_statuses: sourceStatuses,
    min_new_items_per_run: minNewItems,
    zero_reason: zeroReason,
    reason: zeroReason
  };
}

function runtimeSeedFallbackSources(config = {}) {
  return INITIAL_IMPORT_SOURCES
    .filter(isAutomaticRunnableSource)
    .filter((source) => providerIsConfigured(source.provider_key || "custom", config))
    .map((source) => ({
      ...source,
      id: source.id || source.seed_key || source.provider_key || source.name,
      parser_config: source.parser_config || {},
      _runtime_seed_fallback: true
    }));
}

function appendMissingRuntimeSeedFallbacks(sources = [], config = {}) {
  const seen = new Set(sources.flatMap((source) => [
    source.seed_key,
    source.source_url,
    source.base_url,
    source.rss_url,
    source.api_endpoint
  ].filter(Boolean)));
  const missing = runtimeSeedFallbackSources(config)
    .filter((source) => !seen.has(source.seed_key)
      && !seen.has(source.source_url)
      && !seen.has(source.base_url)
      && !seen.has(source.rss_url)
      && !seen.has(source.api_endpoint));
  return [...sources, ...missing];
}

function applyRuntimeOptions(source = {}, options = {}) {
  const existingParserConfig = parserConfig(source);
  const nextParserConfig = {
    ...existingParserConfig,
  };
  const runtimeCountryFilter = String(options.country_filter || "").trim();
  const hasMultiCountryFilter = /[,\n;]/.test(runtimeCountryFilter);
  for (const key of ["profession_filter", "excluded_keywords", "category_filter", "country_filter"]) {
    if (key === "country_filter" && hasMultiCountryFilter) continue;
    if (options[key]) nextParserConfig[key] = options[key];
  }
  return {
    ...source,
    category_filter: options.category_filter || source.category_filter,
    country_filter: hasMultiCountryFilter ? source.country_filter : (options.country_filter || source.country_filter),
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
  if (isBlockedNonJobUrl(sourceUrl(source))) {
    return [{ query: "", country: "" }];
  }
  if (!supportsQueryExpansion(source)) {
    return [{
      query: config.query || source.query || "",
      country: source.country_filter || config.country_filter || ""
    }];
  }
  const baseQuery = options.query || config.query || source.query || "";
  const requestedQueries = uniqueStrings([
    ...ensureArray(options.queries),
    ...splitList(options.queries),
    ...splitList(options.profession_filter),
  ]);
  const requestedCountries = uniqueStrings([
    ...ensureArray(options.countries),
    ...splitList(options.countries),
    ...splitList(options.country_filter),
  ]);
  const baseQueries = uniqueStrings([
    ...(requestedQueries.length ? requestedQueries : DEFAULT_IMPORT_QUERIES),
    ...splitList(source.profession_filter || config.profession_filter),
    baseQuery
  ]);
  const queries = uniqueStrings([...baseQueries, ...FALLBACK_QUERIES]);
  const countries = uniqueStrings([...(requestedCountries.length ? requestedCountries : DEFAULT_IMPORT_COUNTRIES), source.country_filter, config.country_filter, ...FALLBACK_COUNTRIES]);
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

function rejectionSample({ raw = {}, normalized = {}, validation = {}, source = {}, providerKey = "" } = {}) {
  return {
    source_id: normalized.source_id || source.id || "",
    source_name: normalized.source_name || raw.source_name || source.name || providerKey || "",
    provider: providerKey || source.provider_key || raw.provider_key || "",
    title: normalized.original_title || raw.original_title || raw.title || "",
    original_url: normalized.original_url || normalized.source_url || raw.original_url || raw.source_url || raw.url || "",
    status: validation.status || "rejected_low_quality_import",
    reason: validation.reason || raw._import_rejection_reason || "Imported item failed validation",
    quality_score: Number(validation.quality_score || 0),
    detail_status: raw._detail_page_status || "",
    detail_url: raw._detail_page_url || raw.source_url || "",
    detail_reason: raw._detail_page_reason || ""
  };
}

async function createImportFailure({ raw, source, providerKey, store, requestedBy, normalized, validation }) {
  const payload = {
    source_id: normalized?.source_id || source?.id || "",
    source_name: normalized?.source_name || raw?.source_name || source?.name || providerKey || "",
    provider: providerKey || source?.provider_key || raw?.provider_key || "",
    raw_payload: raw || {},
    reason: validation?.reason || "Imported item failed validation",
    status: validation?.status || "rejected_low_quality_import",
    quality_score: Number(validation?.quality_score || 0),
    quality_reasons: validation?.quality_reasons || validation?.quality_fields || [],
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
    return { created: false, duplicate: false, skipped: false, rejected: true, imported: null, validation, rejection_sample: rejectionSample({ raw, normalized, validation, source, providerKey }) };
  }
  if (!passesRuntimeThresholds(normalized, options)) {
    const runtimeValidation = {
      valid: false,
      status: "rejected_low_quality_import",
      reason: "Imported item did not pass runtime relevance/risk filters"
    };
    await createImportFailure({ raw, source, providerKey, store, requestedBy, normalized, validation: runtimeValidation });
    return { created: false, duplicate: false, skipped: false, rejected: true, imported: null, validation: runtimeValidation, rejection_sample: rejectionSample({ raw, normalized, validation: runtimeValidation, source, providerKey }) };
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
    quality_score: validation.quality_score,
    quality_reasons: validation.quality_reasons || validation.quality_fields || [],
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
    import_quality_score: validation.quality_score,
    import_quality_reasons: validation.quality_reasons || validation.quality_fields || [],
    requires_manual_review: true,
    quality_notes: [normalized.relevance_reason, normalized.risk_reason, normalized.ethical_reason].filter(Boolean)
  }, requestedBy);
  createdItems.push(imported);
  existingImported.push(imported);
  return { created: true, duplicate: false, skipped: false, imported };
}

async function testImportSource({ store, config, sourceId = "", maxItems = 5, requestedBy = "system" } = {}) {
  if (!sourceId) {
    const error = new Error("Missing source_id");
    error.statusCode = 400;
    throw error;
  }
  const allSources = await store.allRecords("ImportedSource");
  const foundSource = allSources.find((item) => item.id === sourceId || item.provider_key === sourceId);
  if (!foundSource) {
    const error = new Error("Source not found");
    error.statusCode = 404;
    throw error;
  }
  const source = applyKnownSourceConfig(foundSource);
  const providerKey = source.provider_key || "custom";
  const provider = providers[providerKey] || providers.custom;
  const startedAt = now();
  const logBase = {
    provider_key: providerKey,
    source_id: source.id,
    started_at: startedAt,
    fetched_count: 0,
    valid_count: 0,
    imported_count: 0,
    created_count: 0,
    duplicate_count: 0,
    skipped_count: 0,
    rejected_count: 0,
    error_count: 0,
    target_new_count: 0,
    queries_tried: [],
    countries_tried: [],
    status: "test_running",
    error_message: ""
  };
  let logRecord = { id: "", created_date: startedAt, ...logBase };
  if (!providerIsConfigured(providerKey, config)) {
    const diagnostics = {
      provider: providerKey,
      missing_fields: diagnoseSourceConfig(source, providerKey),
      queries_tried: [],
      countries_tried: [],
      recommendation: providerMissingReason(providerKey)
    };
    logRecord = {
      ...logRecord,
      finished_at: now(),
      status: "test_skipped",
      skipped_count: 1,
      error_message: providerMissingReason(providerKey)
    };
    return { success: true, dry_run: true, ...logRecord, samples: [], diagnostics };
  }
  try {
    const attempts = buildAttemptPlan(source, {
      profession_filter: source.profession_filter || parserConfig(source).profession_filter || "",
      country_filter: source.country_filter || parserConfig(source).country_filter || "",
      queries: splitList(source.profession_filter || parserConfig(source).profession_filter || ""),
      countries: splitList(source.country_filter || parserConfig(source).country_filter || ""),
    }, { selectedSourceRun: true }).slice(0, 8);
    const queriesTried = new Set();
    const countriesTried = new Set();
    let rawItems = [];
    for (const attempt of attempts.length ? attempts : [{ query: "", country: "" }]) {
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
        profession_filter: attempt.query || source.profession_filter || parserConfig(source).profession_filter || "",
        country_filter: attempt.country || source.country_filter || parserConfig(source).country_filter || "",
      });
      rawItems = ensureArray(await provider.fetchItems({ source: sourceForProvider, config, maxItems }));
      if (rawItems.length) break;
    }
    const samples = [];
    let validCount = 0;
    let rejectedCount = 0;
    for (const raw of rawItems.slice(0, maxItems)) {
      const normalized = await normalizeImportedItem(raw, source);
      const validation = validateImportedItem(normalized, raw, source);
      if (validation.valid) validCount += 1;
      else rejectedCount += 1;
      samples.push({
        original_title: normalized.original_title || raw.original_title || raw.title || "",
        original_url: normalized.original_url || raw.original_url || raw.source_url || "",
        status: validation.valid ? "valid" : validation.status,
        reason: validation.reason || "",
        quality_score: validation.quality_score || 0,
        detail_status: raw._detail_page_status || "",
        detail_url: raw._detail_page_url || raw.source_url || "",
        detail_reason: raw._detail_page_reason || ""
      });
    }
    const needsConfiguration = rawItems.length > 0
      && rawItems.every((raw) => ["needs_configuration", "skipped_missing_parser_config"].includes(raw?._import_rejection_status));
    logRecord = {
      ...logRecord,
      finished_at: now(),
      fetched_count: rawItems.length,
      valid_count: validCount,
      rejected_count: rejectedCount,
      queries_tried: [...queriesTried],
      countries_tried: [...countriesTried],
      status: needsConfiguration ? "test_needs_configuration" : (rawItems.length && !validCount ? "test_zero_valid_items" : "test_completed"),
      error_message: needsConfiguration ? "Source needs parser configuration" : (rawItems.length && !validCount ? "Items fetched but failed validation" : (rawItems.length ? "" : "Test returned zero items"))
    };
    const htmlDiagnostics = (rawItems.length === 0 || needsConfiguration)
      && providerKey === "custom"
      && String(source.parser_type || source.crawl_method || source.source_type || "").toLowerCase() === "html"
      && typeof provider.inspectHtmlSource === "function"
        ? await provider.inspectHtmlSource(source)
        : null;
    const diagnostics = {
      provider: providerKey,
      source_url: sourceUrl(source),
      read_url: htmlDiagnostics?.url || sourceUrl(source),
      http_status: htmlDiagnostics?.http_status,
      html_size: htmlDiagnostics?.html_size,
      selectors_tried: htmlDiagnostics?.selectors_tried,
      selector_matches: htmlDiagnostics?.selector_matches,
      javascript_rendered: htmlDiagnostics?.javascript_rendered,
      bot_protection: htmlDiagnostics?.bot_protection,
      all_links_found: htmlDiagnostics?.all_links_found,
      candidate_job_links_found: htmlDiagnostics?.candidate_job_links_found,
      accepted_job_links_found: htmlDiagnostics?.accepted_job_links_found,
      first_candidate_urls: htmlDiagnostics?.first_candidate_urls,
      first_accepted_urls: htmlDiagnostics?.first_accepted_urls,
      anchors_found: htmlDiagnostics?.anchors_found,
      json_ld_jobs_found: htmlDiagnostics?.json_ld_jobs_found,
      html_preview: htmlDiagnostics?.html_preview,
      zero_reason: htmlDiagnostics?.reason,
      configuration_status: needsConfiguration ? "needs_configuration" : htmlDiagnostics?.configuration_status,
      inferred_parser_config: htmlDiagnostics?.inferred_parser_config,
      missing_fields: diagnoseSourceConfig(source, providerKey),
      queries_tried: [...queriesTried],
      countries_tried: [...countriesTried],
      recommendation: needsConfiguration
        ? (htmlDiagnostics?.reason || "Burimi HTML kërkon konfigurim parser-i ose auto-discovery nuk gjeti kartat e njoftimeve.")
        : (htmlDiagnostics?.reason || sourceTestRecommendation(source, config, rawItems.length, validCount, rejectedCount))
    };
    return {
      success: !needsConfiguration,
      dry_run: true,
      fetched_count: rawItems.length,
      valid_count: validCount,
      rejected_count: rejectedCount,
      created_count: 0,
      duplicate_count: 0,
      samples,
      diagnostics,
      log: logRecord
    };
  } catch (error) {
    const htmlDiagnostics = providerKey === "custom"
      && String(source.parser_type || source.crawl_method || source.source_type || "").toLowerCase() === "html"
      && typeof provider.inspectHtmlSource === "function"
        ? await provider.inspectHtmlSource(source)
        : null;
    logRecord = {
      ...logRecord,
      finished_at: now(),
      status: "test_error",
      error_count: 1,
      error_message: htmlDiagnostics?.reason || error.message || "Source test failed"
    };
    return {
      success: false,
      dry_run: true,
      fetched_count: 0,
      valid_count: 0,
      rejected_count: 0,
      created_count: 0,
      duplicate_count: 0,
      error_count: 1,
      message: error.message || "Source test failed",
      diagnostics: {
        provider: providerKey,
        source_url: sourceUrl(source),
        read_url: htmlDiagnostics?.url || sourceUrl(source),
        http_status: htmlDiagnostics?.http_status,
        html_size: htmlDiagnostics?.html_size,
        selectors_tried: htmlDiagnostics?.selectors_tried,
        selector_matches: htmlDiagnostics?.selector_matches,
        javascript_rendered: htmlDiagnostics?.javascript_rendered,
        bot_protection: htmlDiagnostics?.bot_protection,
        all_links_found: htmlDiagnostics?.all_links_found,
        candidate_job_links_found: htmlDiagnostics?.candidate_job_links_found,
        accepted_job_links_found: htmlDiagnostics?.accepted_job_links_found,
        first_candidate_urls: htmlDiagnostics?.first_candidate_urls,
        first_accepted_urls: htmlDiagnostics?.first_accepted_urls,
        anchors_found: htmlDiagnostics?.anchors_found,
        json_ld_jobs_found: htmlDiagnostics?.json_ld_jobs_found,
        html_preview: htmlDiagnostics?.html_preview,
        zero_reason: htmlDiagnostics?.reason,
        missing_fields: diagnoseSourceConfig(source, providerKey),
        queries_tried: [],
        countries_tried: [],
        recommendation: htmlDiagnostics?.reason || error.message || "Source test failed"
      },
      log: logRecord
    };
  }
}

async function runImport({ store, config, sourceId = "", maxItems, requestedBy = "system", force = false, options = {} } = {}) {
  if (running && !force) return { success: false, status: "locked", message: "Importimi është duke u ekzekutuar." };
  running = true;
  sourceId = normalizeSelectedSourceId(sourceId);
  const providerFilter = normalizeSelectedSourceId(options.provider_filter || "");
  const startedAt = now();
  const logs = [];
  const createdItems = [];
  let fetchedTotal = 0;
  let duplicateTotal = 0;
  let skippedTotal = 0;
  let rejectedTotal = 0;
  let validTotal = 0;
  let errorTotal = 0;
  const rejectionSamples = [];

  try {
    const settings = await ensureDefaultSettings(store, config);
    const allSources = await ensureDefaultSources(store);
    const strictSource = Boolean(options.strict_source);
    const manualRun = Boolean(sourceId || options.manual_run);
    const selectedSourceRun = Boolean(sourceId && strictSource);
    let sources = allSources
      .map(applyKnownSourceConfig)
      .filter((source) => !strictSource || shouldUseSource(sourceId, source))
      .filter((source) => !providerFilter || shouldUseSource(providerFilter, source))
      .filter((source) => shouldCrawlSource(source, { manual: manualRun, selected: selectedSourceRun }))
      .map((source) => applyRuntimeOptions(source, options))
      .sort((a, b) => {
        if (!sourceId || strictSource) return 0;
        const aSelected = shouldUseSource(sourceId, a) ? 0 : 1;
        const bSelected = shouldUseSource(sourceId, b) ? 0 : 1;
        return aSelected - bSelected;
      });

    if (!sources.length && manualRun && !strictSource && !providerFilter) {
      const reseededSources = await forceSeedRunnableSources(store);
      sources = reseededSources
        .map(applyKnownSourceConfig)
        .filter(isAutomaticRunnableSource)
        .filter((source) => shouldCrawlSource(source, { manual: true, selected: false }))
        .map((source) => applyRuntimeOptions(source, options));
    }
    if (!sources.length && manualRun && !strictSource && !providerFilter) {
      sources = runtimeSeedFallbackSources(config)
        .map(applyKnownSourceConfig)
        .map((source) => applyRuntimeOptions(source, options));
    }
    if (sources.length && manualRun && !strictSource && !providerFilter) {
      sources = appendMissingRuntimeSeedFallbacks(sources, config)
        .map(applyKnownSourceConfig)
        .map((source) => applyRuntimeOptions(source, options));
    }
    const minNewItems = Math.max(0, Number(options.min_new_items_per_run || settings.min_new_items_per_run || config.IMPORT_ASSISTANT_MIN_NEW_PER_RUN || DEFAULT_MIN_NEW_PER_RUN));
    const requestedLimit = Number(maxItems || settings.max_items_per_run || config.IMPORT_ASSISTANT_MAX_PER_RUN || 100);
    const limit = Math.max(1, minNewItems || 0, requestedLimit);
    const existingImported = [...await store.allRecords("ImportedPost")];
    const existingJobs = [...await store.allRecords("Job")];
    const runnableSourceCount = Math.max(1, sources.filter((source) => providerIsConfigured(source.provider_key || "custom", config) || selectedSourceRun).length);
    const perSourceTargetNew = selectedSourceRun
      ? limit
      : Math.max(1, Math.ceil((minNewItems || limit) / Math.min(runnableSourceCount, 4)));

    if (!sources.length) {
      const logRecord = await store.createRecord("ImportLog", {
        provider_key: providerFilter || sourceId || "none",
        source_id: sourceId || "",
        started_at: startedAt,
        finished_at: now(),
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
        status: "no_runnable_sources",
        error_message: "Nuk u gjet asnjë burim aktiv automatik/semi-auto për import. Kontrollo Burimet ose zgjedhjen e burimit."
      }, requestedBy);
      logs.push(logRecord);
      return {
        success: true,
        status: "no_runnable_sources",
        started_at: startedAt,
        finished_at: now(),
        fetched_count: 0,
        valid_count: 0,
        imported_count: 0,
        created_count: 0,
        duplicate_count: 0,
        skipped_count: 0,
        rejected_count: 0,
        error_count: 0,
        target_new_count: minNewItems,
        fallback_summary: {
          ...summarizeImportLogs(logs, sources, { createdCount: 0, minNewItems }),
          reason: logRecord.error_message,
          zero_reason: logRecord.error_message
        },
        logs,
        items: []
      };
    }

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
        const sourceRejectionSamples = [];
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
              if (processed.rejection_sample && sourceRejectionSamples.length < 5) {
                sourceRejectionSamples.push(processed.rejection_sample);
              }
              if (processed.rejection_sample && rejectionSamples.length < 10) {
                rejectionSamples.push(processed.rejection_sample);
              }
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
            ? `Items fetched but failed quality validation${sourceRejectionSamples[0]?.reason ? `: ${sourceRejectionSamples[0].reason}` : ""}`
            : (createdCount === 0 && minNewItems ? `Nuk u arrit minimumi ${minNewItems}; u provuan ${queriesTried.size || 1} query dhe ${countriesTried.size || 1} vende për këtë burim.` : "")
        });
        if (sourceRejectionSamples.length) {
          logRecord.rejection_samples = sourceRejectionSamples;
        }
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

    const runSummary = summarizeImportLogs(logs, sources, { createdCount: createdItems.length, minNewItems });
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
        ...runSummary,
        rejection_samples: rejectionSamples,
        reason: runSummary.reason || (createdItems.length >= minNewItems
          ? ""
          : `U krijuan ${createdItems.length} të reja nga minimumi ${minNewItems}; u shteruan burimet/provat e disponueshme.`)
      },
      logs,
      rejection_samples: rejectionSamples,
      items: createdItems
    };
  } finally {
    running = false;
  }
}

module.exports = {
  ensureDefaultSettings,
  ensureDefaultSources,
  normalizeSelectedSourceId,
  runImport,
  testImportSource
};
