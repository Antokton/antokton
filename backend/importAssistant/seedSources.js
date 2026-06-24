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
  instagram: {
    provider_key: "custom",
    import_mode: "manual",
    crawl_method: "manual",
    automation_level: "manual",
    parser_type: "manual",
    source_group: "community",
    trust_level: "manual_only",
    moderation_required: true,
    notes: "Vetëm API zyrtare/leje të qartë; profilet personale mbeten manuale.",
  },
  tiktok: {
    provider_key: "custom",
    import_mode: "manual",
    crawl_method: "manual",
    automation_level: "manual",
    parser_type: "manual",
    source_group: "community",
    trust_level: "manual_only",
    moderation_required: true,
    notes: "Vetëm API zyrtare/leje të qartë; mos përdor scraping të paqëndrueshëm.",
  },
  linkedin: {
    provider_key: "custom",
    import_mode: "manual",
    crawl_method: "manual",
    automation_level: "manual",
    parser_type: "manual",
    source_group: "community",
    trust_level: "manual_only",
    moderation_required: true,
    notes: "Vetëm API/leje për faqe kompanish; përmbajtja private mbetet manuale.",
  },
  whatsapp: {
    provider_key: "custom",
    import_mode: "manual",
    crawl_method: "manual",
    automation_level: "manual",
    parser_type: "manual",
    source_group: "community",
    trust_level: "manual_only",
    moderation_required: true,
    notes: "WhatsApp importohet vetëm manualisht nga tekst/link i dhënë nga stafi.",
  },
  youtube: {
    provider_key: "custom",
    import_mode: "manual",
    crawl_method: "manual",
    automation_level: "manual",
    parser_type: "manual",
    source_group: "community",
    trust_level: "manual_only",
    moderation_required: true,
    notes: "Aktivizohet automatikisht vetëm kur vendoset API/leje e qartë.",
  },
  x_twitter: {
    provider_key: "custom",
    import_mode: "manual",
    crawl_method: "manual",
    automation_level: "manual",
    parser_type: "manual",
    source_group: "community",
    trust_level: "manual_only",
    moderation_required: true,
    notes: "Aktivizohet automatikisht vetëm kur vendoset API/leje e qartë.",
  },
  reddit: {
    provider_key: "custom",
    import_mode: "manual",
    crawl_method: "manual",
    automation_level: "manual",
    parser_type: "manual",
    source_group: "community",
    trust_level: "manual_only",
    moderation_required: true,
    notes: "Aktivizohet automatikisht vetëm kur vendoset API/leje e qartë.",
  },
  discord: {
    provider_key: "custom",
    import_mode: "manual",
    crawl_method: "manual",
    automation_level: "manual",
    parser_type: "manual",
    source_group: "community",
    trust_level: "manual_only",
    moderation_required: true,
    notes: "Discord importohet me webhook/API kur ka akses; serverët privatë mbeten manualë.",
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

const { ADZUNA_DOMAINS } = require("./sourceConfigRules");

function adzunaSeedSources() {
  return Object.entries(ADZUNA_DOMAINS).map(([domain, cfg]) => {
    const baseUrl = `https://www.${domain}`;
    return {
      seed_key: `adzuna-${cfg.countryCode}-api`,
      name: cfg.name,
      provider_key: "adzuna",
      source_type: "api",
      import_mode: "automatic",
      crawl_method: "api",
      automation_level: "full_auto",
      parser_type: "api",
      source_group: "global_provider",
      trust_level: "trusted",
      source_url: baseUrl,
      base_url: baseUrl,
      api_endpoint: `https://api.adzuna.com/v1/api/jobs/${cfg.countryCode}/search/1`,
      rss_url: "",
      jobs_url: "",
      category_url: "",
      category_filter: "pune",
      profession_filter: "shofer, pastrim, depo, magazin, ndertim, ndërtim, mekanik, elektrik, hidraulik, kuzhinier, siguri, bujqesi, fabrike",
      excluded_keywords: "senior, manager, director, professor, teacher, research, phd, software, developer, data scientist, consultant",
      country_filter: cfg.country,
      language: cfg.language,
      parser_config: {
        api_format: "adzuna",
        country_code: cfg.countryCode,
        country_filter: cfg.country,
        source_domain: domain,
      },
      enabled: false,
      is_active: false,
      crawl_frequency_minutes: 360,
      notes: `Adzuna ${cfg.country} përdor API zyrtare. Aktivizoje vetëm pasi Render të ketë ADZUNA_APP_ID dhe ADZUNA_APP_KEY.`,
    };
  });
}

function normalizeSourceType(type = "") {
  const value = String(type || "").trim().toLowerCase();
  const compact = value.replace(/[\s_-]+/g, "");
  if (["api/json", "json", "apijson", "api"].includes(value) || compact === "apijson") return "api";
  if (["html_needs_review", "html publik", "html public", "htmlpublik", "html"].includes(value) || compact === "htmlpublik") return "html";
  if (["rss", "feed"].includes(value)) return "rss";
  if (["x", "twitter", "x/twitter", "xtwitter"].includes(value) || compact === "xtwitter") return "x_twitter";
  if (value === "facebook group" || value === "facebook page") return "facebook";
  return SOURCE_TYPE_DEFAULTS[value] ? value : "manual";
}

function textForSource(source = {}) {
  return [
    source.name,
    source.provider_key,
    source.source_type,
    source.parser_type,
    source.source_url,
    source.base_url,
    source.api_endpoint,
    source.rss_url,
    source.jobs_url,
    source.category_url
  ].filter(Boolean).join(" ").toLowerCase();
}

function inferSourceType(source = {}) {
  const explicit = normalizeSourceType(source.source_type || "");
  const text = textForSource(source);
  if (/arbeitnow/.test(text)) return "api";
  if (/remoteok\.com\/api|adzuna|jooble|eures|jobicy|himalayas/.test(text)) return "api";
  if (/\.rss\b|\/rss\b|rss\.|feed\b|\/feed\b/.test(text)) return "rss";
  if (/facebook|fb\.com/.test(text)) return "facebook";
  if (/instagram/.test(text)) return "instagram";
  if (/tiktok/.test(text)) return "tiktok";
  if (/linkedin/.test(text)) return "linkedin";
  if (/telegram|t\.me/.test(text)) return "telegram";
  if (/whatsapp|wa\.me/.test(text)) return "whatsapp";
  if (/youtube|youtu\.be/.test(text)) return "youtube";
  if (/twitter|x\.com/.test(text)) return "x_twitter";
  if (/reddit/.test(text)) return "reddit";
  if (/discord/.test(text)) return "discord";
  if (explicit !== "manual") return explicit;
  if (/^https?:\/\//.test(String(source.source_url || source.base_url || source.jobs_url || source.category_url || ""))) return "html";
  return explicit;
}

function providerForSource(source = {}, sourceType = "") {
  const text = textForSource(source);
  if (/arbeitnow/.test(text)) return "arbeitnow";
  if (/adzuna/.test(text)) return "adzuna";
  if (/jooble/.test(text)) return "jooble";
  if (/eures/.test(text)) return "eures";
  if (sourceType === "rss") return "generic_rss";
  return "custom";
}

function sourceGroupForSource(source = {}, sourceType = "") {
  const text = textForSource(source);
  if (["api"].includes(sourceType) && /arbeitnow|remoteok|adzuna|jooble|eures|jobicy|himalayas|remote|europe|gov|arbeitsagentur|francetravail|vdab|actiris|leforem|nav|jobnet|ams|sepe|findajob|jobsireland/.test(text)) {
    return "global_provider";
  }
  if (sourceType === "rss") return "rss";
  if (/staff\.al|punajuaj|portalpune|albaniajobs|ekipi|punesim|kosovajob|gjirafa|lyppune|kastori|njoftime|merrjep|reklama5|epunesimi|puna\.gov|acp\.al|gazetacelesi/.test(text)) {
    return "albanian_source";
  }
  if (["facebook", "instagram", "tiktok", "linkedin", "telegram", "whatsapp", "youtube", "x_twitter", "reddit", "discord"].includes(sourceType)) {
    return "community";
  }
  return SOURCE_TYPE_DEFAULTS[sourceType]?.source_group || "manual_url";
}

function technicalDefaultsForSource(source = {}) {
  const sourceType = inferSourceType(source);
  const defaults = SOURCE_TYPE_DEFAULTS[sourceType] || SOURCE_TYPE_DEFAULTS.manual;
  const providerKey = providerForSource(source, sourceType);
  const sourceGroup = sourceGroupForSource(source, sourceType);
  const next = {
    ...defaults,
    provider_key: providerKey || defaults.provider_key,
    source_group: sourceGroup || defaults.source_group,
    source_type: sourceType,
  };
  if (sourceType === "api") {
    next.import_mode = "automatic";
    next.crawl_method = "api";
    next.automation_level = "full_auto";
    next.parser_type = "api";
  }
  if (sourceType === "rss") {
    next.import_mode = "automatic";
    next.crawl_method = "rss";
    next.automation_level = "full_auto";
    next.parser_type = "rss";
  }
  if (sourceType === "html") {
    next.import_mode = "automatic";
    next.crawl_method = "html";
    next.automation_level = "full_auto";
    next.parser_type = "html";
  }
  return next;
}

const INITIAL_IMPORT_SOURCES = [
  {
    seed_key: "arbeitnow-public-api",
    name: "Arbeitnow",
    provider_key: "arbeitnow",
    source_type: "api",
    import_mode: "automatic",
    crawl_method: "api",
    automation_level: "full_auto",
    parser_type: "api",
    source_group: "global_provider",
    trust_level: "medium",
    source_url: "https://www.arbeitnow.com/api/job-board-api",
    base_url: "https://www.arbeitnow.com/api/job-board-api",
    category_filter: "pune",
    country_filter: "Germany",
    parser_config: { max_pages: 25 },
    enabled: true,
    is_active: true,
    crawl_frequency_minutes: 360,
    notes: "API publike pa key; njoftimet ruhen si pending_review dhe linkojnë burimin origjinal."
  },
  {
    seed_key: "remoteok-public-api",
    name: "Remote OK",
    provider_key: "custom",
    source_type: "api",
    import_mode: "automatic",
    crawl_method: "api",
    automation_level: "full_auto",
    parser_type: "api",
    source_group: "global_provider",
    trust_level: "medium",
    source_url: "https://remoteok.com/api",
    base_url: "https://remoteok.com/api",
    category_filter: "pune",
    country_filter: "",
    parser_config: { api_format: "remoteok" },
    enabled: true,
    is_active: true,
    crawl_frequency_minutes: 360,
    notes: "Remote OK API publike; kërkon linkim tek burimi origjinal."
  },
  {
    seed_key: "weworkremotely-rss",
    name: "We Work Remotely RSS",
    provider_key: "generic_rss",
    source_type: "rss",
    import_mode: "automatic",
    crawl_method: "rss",
    automation_level: "full_auto",
    parser_type: "rss",
    source_group: "rss",
    trust_level: "medium",
    source_url: "https://weworkremotely.com/remote-jobs.rss",
    base_url: "https://weworkremotely.com/remote-jobs.rss",
    category_filter: "pune",
    country_filter: "",
    parser_config: {},
    enabled: true,
    is_active: true,
    crawl_frequency_minutes: 360,
    notes: "RSS publik; përdoret si fallback kur burimet e tjera sjellin dublikata."
  },
  ...adzunaSeedSources(),
  {
    seed_key: "punajuaj-html",
    name: "PunaJuaj",
    provider_key: "custom",
    source_type: "html",
    import_mode: "automatic",
    crawl_method: "html",
    automation_level: "full_auto",
    parser_type: "html",
    source_group: "albanian_source",
    trust_level: "needs_review",
    source_url: "https://www.punajuaj.com",
    base_url: "https://www.punajuaj.com",
    category_filter: "pune",
    country_filter: "Antokton",
    parser_config: { item_url_patterns: "job,pune,puna,konkurs,vend-pune,vende-pune" },
    enabled: true,
    is_active: true,
    crawl_frequency_minutes: 360,
    notes: "Burim shqiptar publik HTML; njoftimet ruhen për shqyrtim manual."
  },
  {
    seed_key: "portalpune-html",
    name: "PortalPune",
    provider_key: "custom",
    source_type: "html",
    import_mode: "automatic",
    crawl_method: "html",
    automation_level: "full_auto",
    parser_type: "html",
    source_group: "albanian_source",
    trust_level: "needs_review",
    source_url: "https://portalpune.com",
    base_url: "https://portalpune.com",
    category_filter: "pune",
    country_filter: "Antokton",
    parser_config: { item_url_patterns: "job,pune,puna,konkurs,vend-pune,vende-pune" },
    enabled: true,
    is_active: true,
    crawl_frequency_minutes: 360,
    notes: "Burim shqiptar publik HTML; njoftimet ruhen për shqyrtim manual."
  },
  {
    seed_key: "kosovajob-html",
    name: "KosovaJob",
    provider_key: "custom",
    source_type: "html",
    import_mode: "automatic",
    crawl_method: "html",
    automation_level: "full_auto",
    parser_type: "html",
    source_group: "albanian_source",
    trust_level: "needs_review",
    source_url: "https://kosovajob.com",
    base_url: "https://kosovajob.com",
    category_filter: "pune",
    country_filter: "Antokton",
    parser_config: { item_url_patterns: "job,pune,puna,konkurs,vend-pune,vende-pune" },
    enabled: true,
    is_active: true,
    crawl_frequency_minutes: 360,
    notes: "Burim shqiptar publik HTML; njoftimet ruhen për shqyrtim manual."
  },
  {
    seed_key: "merrjep-al-pune-html",
    name: "MerrJep.al Punë",
    provider_key: "custom",
    source_type: "html",
    import_mode: "automatic",
    crawl_method: "html",
    automation_level: "full_auto",
    parser_type: "html",
    source_group: "albanian_source",
    trust_level: "needs_review",
    source_url: "https://www.merrjep.al/njoftime/pune",
    base_url: "https://www.merrjep.al/njoftime/pune",
    category_filter: "pune",
    country_filter: "Antokton",
    parser_config: { item_url_patterns: "njoftime,pune,shpallje,listing" },
    enabled: true,
    is_active: true,
    crawl_frequency_minutes: 360,
    notes: "Burim shqiptar publik HTML; njoftimet ruhen për shqyrtim manual."
  },
  {
    seed_key: "njoftime-pune-html",
    name: "Njoftime.com Punë",
    provider_key: "custom",
    source_type: "html",
    import_mode: "automatic",
    crawl_method: "html",
    automation_level: "full_auto",
    parser_type: "html",
    source_group: "albanian_source",
    trust_level: "needs_review",
    source_url: "https://www.njoftime.com/forum/forums/oferta-pune.25/",
    base_url: "https://www.njoftime.com/forum/forums/oferta-pune.25/",
    category_filter: "pune",
    country_filter: "Antokton",
    parser_config: { item_url_patterns: "threads,oferta-pune,pune,njoftime" },
    enabled: true,
    is_active: true,
    crawl_frequency_minutes: 360,
    notes: "Burim shqiptar publik HTML; njoftimet ruhen për shqyrtim manual."
  }
];

module.exports = {
  INITIAL_IMPORT_SOURCES,
  SOURCE_TYPE_DEFAULTS,
  inferSourceType,
  normalizeSourceType,
  technicalDefaultsForSource,
};
