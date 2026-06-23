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

function applyKnownSourceConfig(source = {}) {
  let next = cleanPlaceholderUrls(source);
  if (isAcademicPositions(next)) {
    const baseUrl = "https://academicpositions.com";
    const jobsUrl = "https://academicpositions.com/find-jobs";
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
      enabled: true,
      is_active: true,
      original_source_required: true,
      parser_config: {
        item_url_patterns: "find-jobs,job,jobs,position,positions,vacancy,vacancies,apply",
        json_ld_jobs: true,
        title_selector: "h1,h2,h3,a,[class*='title'],[class*='position'],[class*='job']",
        link_selector: "a[href]",
        company_selector: "[class*='company'],[class*='employer'],[class*='organization']",
        location_selector: "[class*='location'],[class*='city'],[class*='country']",
        date_selector: "time,[class*='date'],[class*='posted']",
        summary_selector: "p,[class*='summary'],[class*='description'],[class*='excerpt']",
        requires_detail_page: true,
        known_source: "academicpositions",
        ...parserConfig(next),
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
      enabled: true,
      is_active: true,
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
  return next;
}

module.exports = { applyKnownSourceConfig, cleanPlaceholderUrls, isPlaceholderUrl, isAcademicPositions, isBundesagentur };
