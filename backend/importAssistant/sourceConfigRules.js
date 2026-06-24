function isPlaceholderUrl(value = "") {
  return /^https?:\/\/\.\.\.(?:\/|$)/i.test(String(value || "").trim());
}

function cleanPlaceholderUrls(source = {}) {
  const next = { ...source };
  for (const key of ["source_url", "base_url", "api_endpoint", "rss_url", "jobs_url", "category_url"]) {
    if (isPlaceholderUrl(next[key])) next[key] = "";
  }
  return next;
}

function isAcademicPositions(source = {}) {
  const text = [
    source.name,
    source.source_url,
    source.base_url,
    source.jobs_url,
    source.category_url,
  ].filter(Boolean).join(" ").toLowerCase();
  return text.includes("academicpositions") || text.includes("academic positions");
}

function isBundesagentur(source = {}) {
  const text = [
    source.name,
    source.source_url,
    source.base_url,
    source.jobs_url,
    source.api_endpoint,
    source.category_url,
  ].filter(Boolean).join(" ").toLowerCase();
  return text.includes("arbeitsagentur") || text.includes("bundesagentur");
}

function isKosovaJob(source = {}) {
  const text = [
    source.name,
    source.source_url,
    source.base_url,
    source.jobs_url,
    source.category_url,
  ].filter(Boolean).join(" ").toLowerCase();
  return text.includes("kosovajob") || text.includes("kosova job");
}

const ADZUNA_DOMAINS = {
  "adzuna.be": { countryCode: "be", country: "Belgium", language: "nl/fr", name: "Adzuna Belgium" },
  "adzuna.de": { countryCode: "de", country: "Germany", language: "de", name: "Adzuna Germany" },
  "adzuna.it": { countryCode: "it", country: "Italy", language: "it", name: "Adzuna Italy" },
  "adzuna.fr": { countryCode: "fr", country: "France", language: "fr", name: "Adzuna France" },
  "adzuna.uk": { countryCode: "gb", country: "United Kingdom", language: "en", name: "Adzuna UK" },
  "adzuna.at": { countryCode: "at", country: "Austria", language: "de", name: "Adzuna Austria" },
  "adzuna.nl": { countryCode: "nl", country: "Netherlands", language: "nl", name: "Adzuna Netherlands" },
  "adzuna.ch": { countryCode: "ch", country: "Switzerland", language: "de/fr/it", name: "Adzuna Switzerland" },
  "adzuna.es": { countryCode: "es", country: "Spain", language: "es", name: "Adzuna Spain" },
};

function adzunaDomainFromSource(source = {}) {
  const values = [
    source.source_url,
    source.base_url,
    source.jobs_url,
    source.api_endpoint,
    source.name,
  ].filter(Boolean);
  for (const value of values) {
    const text = String(value || "").toLowerCase();
    for (const domain of Object.keys(ADZUNA_DOMAINS)) {
      if (text.includes(domain)) return domain;
    }
  }
  return "";
}

function adzunaConfigForDomain(domain = "") {
  const key = String(domain || "").toLowerCase().replace(/^www\./, "");
  return ADZUNA_DOMAINS[key] || null;
}

function adzunaDisplayName(currentName = "", cfg = {}) {
  const name = String(currentName || "").trim();
  return !name || /^adzuna$/i.test(name) ? cfg.name : name;
}

function isAdzuna(source = {}) {
  const text = [
    source.name,
    source.provider_key,
    source.source_url,
    source.base_url,
    source.jobs_url,
    source.api_endpoint,
  ].filter(Boolean).join(" ").toLowerCase();
  return text.includes("adzuna") || Boolean(adzunaDomainFromSource(source));
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

function preserveNonSelectorParserConfig(config = {}) {
  const blocked = new Set([
    "item_url_patterns",
    "item_selector",
    "title_selector",
    "link_selector",
    "company_selector",
    "location_selector",
    "date_selector",
    "summary_selector",
    "requires_detail_page",
    "known_source"
  ]);
  return Object.fromEntries(Object.entries(config).filter(([key]) => !blocked.has(key)));
}

function sourceEnabledValue(source = {}) {
  if (source.enabled !== undefined) {
    return source.enabled === true || source.enabled === "true" || source.enabled === 1 || source.enabled === "1";
  }
  if (source.is_active !== undefined) {
    return !(source.is_active === false || source.is_active === "false" || source.is_active === 0 || source.is_active === "0");
  }
  return true;
}

function applyKnownSourceConfig(source = {}) {
  let next = cleanPlaceholderUrls(source);
  if (isAdzuna(next)) {
    const domain = adzunaDomainFromSource(next) || "adzuna.de";
    const cfg = adzunaConfigForDomain(domain) || ADZUNA_DOMAINS["adzuna.de"];
    const baseUrl = `https://www.${domain}`;
    const apiEndpoint = `https://api.adzuna.com/v1/api/jobs/${cfg.countryCode}/search/1`;
    next = {
      ...next,
      name: adzunaDisplayName(next.name, cfg),
      source_url: baseUrl,
      base_url: baseUrl,
      jobs_url: "",
      api_endpoint: apiEndpoint,
      rss_url: "",
      category_url: "",
      provider_key: "adzuna",
      source_type: "api",
      crawl_method: "api",
      parser_type: "api",
      import_mode: next.import_mode || "automatic",
      automation_level: next.automation_level || "full_auto",
      source_group: next.source_group || "global_provider",
      trust_level: next.trust_level || "trusted",
      language: next.language || cfg.language,
      country_filter: next.country_filter || cfg.country,
      category_filter: next.category_filter || "pune",
      profession_filter: next.profession_filter || "shofer, pastrim, depo, magazin, ndertim, ndërtim, mekanik, elektrik, hidraulik, kuzhinier, siguri, bujqesi, fabrike",
      excluded_keywords: next.excluded_keywords || "senior, manager, director, professor, teacher, research, phd, software, developer, data scientist, consultant",
      login_required: false,
      enabled: sourceEnabledValue(next),
      is_active: sourceEnabledValue(next),
      original_source_required: true,
      parser_config: {
        ...parserConfig(next),
        api_format: "adzuna",
        country_code: cfg.countryCode,
        country_filter: cfg.country,
        source_domain: domain,
      },
      notes: next.notes || `Konfigurim i njohur: Adzuna ${cfg.country} përdor API zyrtare me ADZUNA_APP_ID/ADZUNA_APP_KEY; nuk përdoret HTML/RSS ose /browse.`,
    };
  }
  if (isAcademicPositions(next)) {
    const baseUrl = "https://academicpositions.com";
    const jobsUrl = "https://academicpositions.com/find-jobs";
    const safeExistingConfig = preserveNonSelectorParserConfig(parserConfig(next));
    next = {
      ...next,
      name: next.name || "Academic Positions",
      source_url: jobsUrl,
      base_url: baseUrl,
      jobs_url: jobsUrl,
      api_endpoint: "",
      rss_url: "",
      category_url: "",
      provider_key: "custom",
      source_type: "html",
      crawl_method: "html",
      parser_type: "html",
      import_mode: next.import_mode || "automatic",
      automation_level: next.automation_level || "full_auto",
      login_required: false,
      enabled: sourceEnabledValue(next),
      is_active: sourceEnabledValue(next),
      original_source_required: true,
      parser_config: {
        ...safeExistingConfig,
        item_url_patterns: "/ad/",
        json_ld_jobs: true,
        item_selector: "a[href*='/ad/']",
        title_selector: "h1,h2,h3,[class*='title'],[class*='position'],[class*='job']",
        link_selector: "a[href*='/ad/']",
        company_selector: "[class*='company'],[class*='employer'],[class*='organization']",
        location_selector: "[class*='location'],[class*='city'],[class*='country']",
        date_selector: "time,[class*='date'],[class*='posted']",
        summary_selector: "p,[class*='summary'],[class*='description'],[class*='excerpt']",
        requires_detail_page: true,
        known_source: "academicpositions",
      },
      notes: next.notes || "Konfigurim i njohur: përdor /find-jobs si Jobs URL. Nëse testi del 0, shiko diagnozën HTTP/HTML sepse faqja mund të bllokojë bot/fetch.",
    };
  }
  if (isBundesagentur(next)) {
    const baseUrl = "https://www.arbeitsagentur.de";
    const jobsUrl = "https://www.arbeitsagentur.de/jobsuche/";
    const apiEndpoint = "https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/jobs";
    next = {
      ...next,
      name: next.name || "Bundesagentur für Arbeit",
      source_url: jobsUrl,
      base_url: baseUrl,
      jobs_url: jobsUrl,
      api_endpoint: apiEndpoint,
      rss_url: "",
      category_url: "",
      provider_key: "custom",
      source_type: "api",
      crawl_method: "api",
      parser_type: "api",
      import_mode: next.import_mode || "automatic",
      automation_level: next.automation_level || "full_auto",
      source_group: next.source_group || "global_provider",
      trust_level: next.trust_level || "trusted",
      login_required: false,
      enabled: sourceEnabledValue(next),
      is_active: sourceEnabledValue(next),
      original_source_required: true,
      parser_config: {
        api_format: "bundesagentur",
        api_key_header: "X-API-Key",
        api_key: "jobboerse-jobsuche",
        default_query: "fahrer",
        default_location: "Deutschland",
        page_size: 10,
        max_pages: 2,
        ...parserConfig(next),
      },
      notes: next.notes || "Konfigurim i njohur: përdor API-në publike të Bundesagentur me header X-API-Key dhe endpoint-in /pc/v4/jobs.",
    };
  }
  if (isKosovaJob(next)) {
    const baseUrl = "https://kosovajob.com";
    const jobsUrl = "https://kosovajob.com/";
    next = {
      ...next,
      name: next.name || "KosovaJob",
      source_url: jobsUrl,
      base_url: baseUrl,
      jobs_url: jobsUrl,
      api_endpoint: "",
      rss_url: "",
      category_url: "",
      provider_key: "custom",
      source_type: "html",
      crawl_method: "html",
      parser_type: "html",
      import_mode: next.import_mode || "automatic",
      automation_level: next.automation_level || "full_auto",
      source_group: next.source_group || "albanian_source",
      trust_level: next.trust_level || "needs_review",
      language: next.language || "sq",
      country_filter: next.country_filter || "Kosovë",
      profession_filter: next.profession_filter || "pune, job, vende pune",
      category_filter: next.category_filter || "pune",
      login_required: false,
      enabled: sourceEnabledValue(next),
      is_active: sourceEnabledValue(next),
      original_source_required: true,
      parser_config: {
        item_url_patterns: "job,pune,puna,vende-pune,vend-pune,konkurs,pozite,position",
        json_ld_jobs: true,
        title_selector: "h1,h2,h3,a,[class*='title'],[class*='position'],[class*='job']",
        link_selector: "a[href]",
        company_selector: "[class*='company'],[class*='employer'],[class*='organization']",
        location_selector: "[class*='location'],[class*='city'],[class*='country']",
        date_selector: "time,[class*='date'],[class*='deadline'],[class*='posted']",
        summary_selector: "p,[class*='summary'],[class*='description'],[class*='excerpt']",
        requires_detail_page: true,
        known_source: "kosovajob",
        ...parserConfig(next),
      },
      notes: next.notes || "Konfigurim i njohur: KosovaJob publikon listën e punëve në faqen kryesore; mos përdor /jobs sepse ridrejtohet në /404.",
    };
  }
  return next;
}

module.exports = {
  applyKnownSourceConfig,
  cleanPlaceholderUrls,
  isPlaceholderUrl,
  isAcademicPositions,
  isBundesagentur,
  isKosovaJob,
  isAdzuna,
  adzunaConfigForDomain,
  ADZUNA_DOMAINS,
};
