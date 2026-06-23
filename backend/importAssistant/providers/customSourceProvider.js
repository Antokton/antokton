const genericRssProvider = require("./genericRssProvider");
const { cleanText } = require("../textUtils");
const { isBlockedNonJobUrl, isListingOrCategoryUrl } = require("../validateImportedItem");

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

function getUrl(source = {}) {
  return source.api_endpoint || source.jobs_url || source.category_url || source.source_url || source.base_url || "";
}

function absoluteUrl(value = "", base = "") {
  try {
    return new URL(String(value || "").trim(), base).toString();
  } catch {
    return "";
  }
}

function htmlDecode(value = "") {
  return cleanText(String(value || "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&"));
}

function normalizeCountry(country = "") {
  const value = cleanText(country);
  if (!value) return "";
  const lower = value.toLowerCase();
  if (lower === "germany" || lower === "deutschland") return "Gjermani";
  if (lower === "belgium") return "Belgjikë";
  if (lower === "netherlands") return "Holandë";
  if (lower === "france") return "Francë";
  if (lower === "italy") return "Itali";
  if (lower === "switzerland") return "Zvicër";
  if (lower === "austria") return "Austri";
  if (lower === "sweden") return "Suedi";
  if (lower === "denmark") return "Danimarkë";
  if (lower === "finland") return "Finlandë";
  if (lower === "spain") return "Spanjë";
  if (lower === "portugal") return "Portugali";
  if (lower === "ireland") return "Irlandë";
  if (lower === "united kingdom" || lower === "uk") return "Britani e Madhe";
  return value;
}

function splitTags(value) {
  if (Array.isArray(value)) return value.map((tag) => cleanText(tag)).filter(Boolean);
  return String(value || "")
    .split(/[,\n;]/)
    .map((tag) => cleanText(tag))
    .filter(Boolean);
}

function splitKeywords(value) {
  return String(value || "")
    .split(/[,\n;]/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function passesTextFilters(item = {}, source = {}) {
  const config = parserConfig(source);
  const text = cleanText([
    item.original_title,
    item.original_description,
    item.original_company,
    item.original_location,
    Array.isArray(item.tags) ? item.tags.join(" ") : ""
  ].join(" ")).toLowerCase();
  const include = splitKeywords(source.profession_filter || config.profession_filter);
  const exclude = splitKeywords(source.excluded_keywords || config.excluded_keywords);
  const defaultExclude = [];
  if (include.length && !include.some((keyword) => text.includes(keyword))) return false;
  if ([...defaultExclude, ...exclude].some((keyword) => text.includes(keyword))) return false;
  return true;
}

function mapRemoteOk(rows = [], source = {}) {
  return rows
    .filter((job) => job && typeof job === "object" && (job.id || job.slug) && job.position)
    .map((job) => ({
      provider_key: "custom",
      external_id: String(job.id || job.slug || job.url || ""),
      original_id: String(job.id || job.slug || job.url || ""),
      source_url: job.url || (job.slug ? `https://remoteok.com/remote-jobs/${job.slug}` : ""),
      source_name: source.name || "Remote OK",
      item_type: "job",
      category: "pune",
      original_title: job.position || "",
      original_description: cleanText([
        job.description,
        job.tags?.length ? `Tags: ${job.tags.join(", ")}` : "",
        job.apply_url ? `Apply: ${job.apply_url}` : ""
      ].filter(Boolean).join("\n")),
      original_company: job.company || "",
      original_location: cleanText(job.location || "Remote"),
      original_country: normalizeCountry(job.location || "Remote"),
      original_city: "",
      original_salary: job.salary_min || job.salary_max ? `${job.salary_min || ""}-${job.salary_max || ""} ${job.currency || "USD"}` : "",
      contact_methods: job.apply_url ? [{ type: "application_form", value: job.apply_url }] : [],
      tags: splitTags(job.tags),
      published_at: job.date || (job.epoch ? new Date(Number(job.epoch) * 1000).toISOString() : "")
    }));
}

function mapGenericJobs(json, source = {}) {
  const config = parserConfig(source);
  const rows = Array.isArray(json)
    ? json
    : Array.isArray(json.stellenangebote)
      ? json.stellenangebote
    : Array.isArray(json.jobs)
      ? json.jobs
      : Array.isArray(json.data)
        ? json.data
        : Array.isArray(json.results)
          ? json.results
          : [];
  return rows.map((job) => {
    const url = job.url || job.source_url || job.apply_url || job.link || (job.refnr ? `https://www.arbeitsagentur.de/jobsuche/jobdetail/${encodeURIComponent(job.refnr)}` : "");
    const location = typeof job.arbeitsort === "object" && job.arbeitsort
      ? cleanText([job.arbeitsort.ort, job.arbeitsort.region, job.arbeitsort.land].filter(Boolean).join(", "))
      : cleanText(job.location || job.candidate_required_location || "");
    const country = typeof job.arbeitsort === "object" && job.arbeitsort ? job.arbeitsort.land : job.country;
    const city = typeof job.arbeitsort === "object" && job.arbeitsort ? job.arbeitsort.ort : job.city;
    const description = cleanText([
      job.description || job.content || job.summary || "",
      job.beruf ? `Beruf: ${job.beruf}` : "",
      job.arbeitgeber ? `Arbeitgeber: ${job.arbeitgeber}` : "",
      location ? `Ort: ${location}` : "",
      job.aktuelleVeroeffentlichungsdatum ? `Veröffentlicht: ${job.aktuelleVeroeffentlichungsdatum}` : "",
    ].filter(Boolean).join("\n"));
    return {
      provider_key: source.provider_key || "custom",
      external_id: String(job.id || job.slug || job.external_id || job.refnr || url || job.title || ""),
      source_url: url,
      source_name: source.name || "API",
      item_type: config.item_type || "job",
      category: source.category_filter || "pune",
      original_title: job.title || job.titel || job.beruf || job.position || job.name || "",
      original_description: description,
      original_company: job.company || job.company_name || job.organization || job.arbeitgeber || "",
      original_location: location,
      original_country: normalizeCountry(country || ""),
      original_city: cleanText(city || ""),
      original_salary: cleanText(job.salary || job.verguetung || ""),
      contact_methods: (job.apply_url || url) ? [{ type: "application_form", value: job.apply_url || url }] : [],
      tags: splitTags(job.tags || job.category),
      published_at: job.date || job.created_at || job.publication_date || job.published_at || job.aktuelleVeroeffentlichungsdatum || ""
    };
  });
}

function buildBundesagenturUrl(source = {}, maxItems = 50) {
  const config = parserConfig(source);
  const endpoint = source.api_endpoint || getUrl(source);
  const url = new URL(endpoint);
  const query = cleanText(config.query || source.query || config.default_query || "fahrer");
  const location = cleanText(config.country_filter || source.country_filter || config.default_location || "Deutschland");
  url.searchParams.set("was", query);
  if (location) url.searchParams.set("wo", location);
  url.searchParams.set("angebotsart", String(config.angebotsart || 1));
  url.searchParams.set("page", String(config.page || 1));
  url.searchParams.set("size", String(Math.min(Number(config.page_size || maxItems || 10), 50)));
  return url.toString();
}

async function fetchJsonApi({ maxItems = 50, source = {} } = {}) {
  const url = getUrl(source);
  if (!url) return [];
  const config = parserConfig(source);
  const isBundesagentur = config.api_format === "bundesagentur" || /arbeitsagentur\.de\/jobboerse\/jobsuche-service/i.test(url);
  const readUrl = isBundesagentur ? buildBundesagenturUrl(source, maxItems) : url;
  const headers = { Accept: "application/json", "User-Agent": "AntoktonImportAssistant/1.0" };
  if (isBundesagentur) headers[config.api_key_header || "X-API-Key"] = config.api_key || "jobboerse-jobsuche";
  const response = await fetch(readUrl, {
    headers
  });
  if (!response.ok) throw new Error(`API source returned ${response.status}`);
  const json = await response.json();
  const mapped = config.api_format === "remoteok" || /remoteok\.com/i.test(url)
    ? mapRemoteOk(Array.isArray(json) ? json : [], source)
    : mapGenericJobs(json, source);
  return mapped.slice(0, maxItems);
}

function flattenJsonLd(value) {
  const rows = [];
  const visit = (node) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach(visit);
    rows.push(node);
    if (node["@graph"]) visit(node["@graph"]);
    if (node.itemListElement) visit(node.itemListElement);
  };
  visit(value);
  return rows;
}

function parseJsonLdJobs(html = "", source = {}, baseUrl = "") {
  const scripts = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const jobs = [];
  for (const script of scripts) {
    try {
      const json = JSON.parse(htmlDecode(script[1]));
      for (const node of flattenJsonLd(json)) {
        const type = Array.isArray(node["@type"]) ? node["@type"].join(" ") : node["@type"];
        if (!/JobPosting|ListItem/i.test(String(type || "")) && !(node.title && node.url)) continue;
        const org = node.hiringOrganization || node.organization || {};
        const location = Array.isArray(node.jobLocation) ? node.jobLocation[0] : node.jobLocation || {};
        const address = location.address || {};
        const url = absoluteUrl(node.url || node.sameAs || node["@id"] || node.item?.url || "", baseUrl);
        if (!node.title && !url) continue;
        jobs.push({
          provider_key: source.provider_key || "custom",
          external_id: url || node.identifier?.value || node.title,
          source_url: url || baseUrl,
          source_name: source.name || "HTML",
          item_type: "job",
          category: source.category_filter || "pune",
          original_title: cleanText(node.title || node.name || node.item?.name || ""),
          original_description: cleanText(node.description || node.item?.description || ""),
          original_company: cleanText(org.name || ""),
          original_location: cleanText(address.streetAddress || address.addressLocality || node.jobLocationType || source.country_filter || ""),
          original_country: normalizeCountry(address.addressCountry || source.country_filter || ""),
          original_city: cleanText(address.addressLocality || ""),
          original_salary: cleanText(node.baseSalary?.value?.value || node.baseSalary?.value || ""),
          contract_type: cleanText(node.employmentType || ""),
          published_at: node.datePosted || "",
          original_expires_at: node.validThrough || "",
          contact_methods: url ? [{ type: "application_form", value: url }] : []
        });
      }
    } catch {
      // Ignore malformed JSON-LD blocks and continue with anchor extraction.
    }
  }
  return jobs;
}

function htmlTitle(html = "") {
  const og = /<meta\b[^>]*(?:property|name)=["']og:title["'][^>]*content=["']([^"']+)["'][^>]*>/i.exec(html)
    || /<meta\b[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']og:title["'][^>]*>/i.exec(html);
  if (og?.[1]) return htmlDecode(og[1]);
  return tagless(/<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] || "");
}

function htmlDescription(html = "") {
  const meta = /<meta\b[^>]*(?:name|property)=["'](?:description|og:description)["'][^>]*content=["']([^"']+)["'][^>]*>/i.exec(html)
    || /<meta\b[^>]*content=["']([^"']+)["'][^>]*(?:name|property)=["'](?:description|og:description)["'][^>]*>/i.exec(html);
  return htmlDecode(meta?.[1] || "");
}

function htmlHeading(html = "") {
  return tagless(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1] || "");
}

function bodyText(html = "") {
  const main = /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(html)?.[1]
    || /<article\b[^>]*>([\s\S]*?)<\/article>/i.exec(html)?.[1]
    || /<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(html)?.[1]
    || html;
  return tagless(main).slice(0, 3000);
}

function extractEmail(text = "") {
  return cleanText((text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || [])[0] || "");
}

function extractPhone(text = "") {
  return cleanText((text.match(/(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?){2,}\d{2,}/) || [])[0] || "");
}

function extractLocationFromText(text = "", source = {}) {
  const value = cleanText(text);
  const match = /(?:lokacioni|vendndodhja|location|ort|standort|lieu|sede)\s*:?\s*([^\n\r.]{3,80})/i.exec(value);
  return cleanText(match?.[1] || source.country_filter || "");
}

async function enrichItemFromDetailPage(item = {}, source = {}) {
  if (!item.source_url || isListingOrCategoryUrl(item.source_url) || isBlockedNonJobUrl(item.source_url)) return item;
  try {
    const response = await fetch(item.source_url, {
      headers: { Accept: "text/html,application/xhtml+xml", "User-Agent": "AntoktonImportAssistant/1.0" }
    });
    if (!response.ok) return { ...item, _detail_page_loaded: false };
    const html = await response.text();
    const title = htmlHeading(html) || htmlTitle(html) || item.original_title;
    const description = bodyText(html) || htmlDescription(html) || item.original_description;
    const email = extractEmail(description);
    const phone = extractPhone(description);
    const contactMethods = [...(Array.isArray(item.contact_methods) ? item.contact_methods : [])];
    if (email && !contactMethods.some((method) => method.value === email)) contactMethods.push({ type: "email", value: email });
    if (phone && !contactMethods.some((method) => method.value === phone)) contactMethods.push({ type: "phone", value: phone });
    const location = item.original_location && item.original_location !== source.country_filter
      ? item.original_location
      : extractLocationFromText(description, source);
    return {
      ...item,
      _detail_page_loaded: true,
      original_title: cleanText(title || item.original_title),
      original_description: cleanText(description || item.original_description),
      original_company: item.original_company && item.original_company !== source.name ? item.original_company : "",
      original_location: location,
      original_country: normalizeCountry(item.original_country || source.country_filter || ""),
      contact_methods: contactMethods
    };
  } catch {
    return { ...item, _detail_page_loaded: false };
  }
}

function tagless(value = "") {
  return htmlDecode(String(value || "").replace(/<[^>]+>/g, " "));
}

function looksJavascriptRendered(html = "") {
  const visibleText = tagless(/<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(html)?.[1] || html);
  const scriptCount = (html.match(/<script\b/gi) || []).length;
  return /id=["'](?:root|app|__next|__nuxt)["']/i.test(html) && scriptCount >= 5 && visibleText.length < 900;
}

function looksBotProtected(html = "", status = 0) {
  return status === 403 || /cloudflare|cf-ray|captcha|bot protection|access denied|verify you are human|checking your browser/i.test(html);
}

function looksLikeListingUrl(url = "", text = "", source = {}) {
  const config = parserConfig(source);
  const patterns = splitKeywords(config.item_url_patterns || "job,jobs,pune,puna,punesim,vende-pune,vend-pune,konkurs,karriere,career,careers,vacancy,vacancies,position,listing,njoftim,njoftime");
  let path = "";
  try {
    const parsed = new URL(url);
    path = `${parsed.pathname} ${parsed.search}`.toLowerCase();
  } catch {
    path = String(url || "").toLowerCase();
  }
  const haystack = `${path} ${text}`.toLowerCase();
  return patterns.some((pattern) => haystack.includes(pattern));
}

function hasUsableHtmlParserConfig(config = {}) {
  return Boolean(config.item_selector || config.item_url_patterns || config.json_ld_jobs);
}

function inferHtmlParserConfigFromHtml(html = "", source = {}, baseUrl = "") {
  const candidateDiagnostics = inspectAnchorCandidates(html, {
    ...source,
    parser_config: {
      item_url_patterns: "job,jobs,pune,puna,punesim,vende-pune,vend-pune,konkurs,karriere,career,careers,vacancy,vacancies,position,positions,stelle,stellenangebote,jobdetail,apply",
      json_ld_jobs: true,
    },
  }, baseUrl);
  const jsonLdJobs = parseJsonLdJobs(html, source, baseUrl);
  const classCounts = new Map();
  const blockPattern = /<([a-z0-9-]+)\b([^>]*(?:class|data-testid|data-test)[^>]*)>([\s\S]{0,2200}?(?:job|position|vacanc|career|pune|stelle|stellenangebot|apply)[\s\S]{0,2200}?)<\/\1>/gi;
  for (const match of html.matchAll(blockPattern)) {
    const className = /class\s*=\s*["']([^"']+)["']/i.exec(match[2] || "")?.[1] || "";
    className.split(/\s+/).forEach((name) => {
      if (/(job|position|vacanc|card|listing|result|posting|opportunity|stelle|angebot)/i.test(name)) {
        classCounts.set(name, (classCounts.get(name) || 0) + 1);
      }
    });
  }
  const likelyClass = [...classCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "";
  if (!candidateDiagnostics.candidate_job_links_found && !jsonLdJobs.length && !likelyClass) return null;
  return {
    item_url_patterns: "job,jobs,pune,puna,punesim,vende-pune,vend-pune,konkurs,karriere,career,careers,vacancy,vacancies,position,positions,stelle,stellenangebote,jobdetail,apply",
    json_ld_jobs: jsonLdJobs.length > 0,
    item_selector: likelyClass ? `.${likelyClass}` : "",
    title_selector: "h1,h2,h3,a,[class*='title'],[class*='position'],[class*='job'],[class*='stelle']",
    link_selector: "a[href]",
    company_selector: "[class*='company'],[class*='employer'],[class*='organization'],[class*='arbeitgeber']",
    location_selector: "[class*='location'],[class*='city'],[class*='country'],[class*='ort'],[class*='standort']",
    date_selector: "time,[class*='date'],[class*='posted'],[class*='datum']",
    summary_selector: "p,[class*='summary'],[class*='description'],[class*='excerpt']",
    requires_detail_page: true,
    discovered_by: "runtime_auto_parser",
  };
}

function missingParserConfigFailure(source = {}, url = "") {
  return [{
    provider_key: source.provider_key || "custom",
    source_url: url,
    source_name: source.name || "HTML",
    item_type: "job",
    category: source.category_filter || "pune",
    original_title: source.name || "HTML source",
    original_description: "",
    _import_rejection_status: "needs_configuration",
    _import_rejection_reason: "HTML source missing clear parser configuration"
  }];
}

function nonJobPageFailure(source = {}, url = "") {
  return [{
    provider_key: source.provider_key || "custom",
    source_url: url,
    source_name: source.name || "HTML",
    item_type: "job",
    category: source.category_filter || "pune",
    original_title: source.name || "HTML source",
    original_description: "",
    _import_rejection_status: "rejected_non_job_page",
    _import_rejection_reason: "URL is a corporate/marketing page, not a job posting."
  }];
}

function sameListingIndex(url = "", baseUrl = "") {
  try {
    const current = new URL(url);
    const base = new URL(baseUrl);
    const currentPath = current.pathname.replace(/\/+$/, "") || "/";
    const basePath = base.pathname.replace(/\/+$/, "") || "/";
    return current.origin === base.origin && (currentPath === basePath || currentPath === "/jobs" || currentPath === "/pune");
  } catch {
    return false;
  }
}

function isNavigationTitle(title = "") {
  const value = cleanText(title).toLowerCase();
  return /^(ballina|home|navigation|menu|login|ky[cç]u|regjistrohu|about|rreth|kontakt|kryefaqja|clear all|post a job|publiko konkurs|shpall konkurs|shto njoftim|akademi pune)$/.test(value)
    || /^(full time|part time|internship|remote|shites\/e|kategori|category)$/.test(value);
}

function isCategoryPath(url = "") {
  try {
    const path = new URL(url).pathname.toLowerCase();
    return /\/(?:job-type|job-category|category|categories|tag|tags|page)\//.test(path);
  } catch {
    return false;
  }
}

function parseHtmlAnchors(html = "", source = {}, baseUrl = "") {
  const seen = new Set();
  const items = [];
  const anchors = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)];
  for (const anchor of anchors) {
    const attrs = anchor[1] || "";
    const href = /href=["']([^"']+)["']/i.exec(attrs)?.[1] || "";
    const url = absoluteUrl(htmlDecode(href), baseUrl);
    const title = tagless(anchor[2] || "");
    if (!url || seen.has(url) || title.length < 8) continue;
    if (isBlockedNonJobUrl(url)) continue;
    if (isListingOrCategoryUrl(url)) continue;
    if (sameListingIndex(url, baseUrl) || isNavigationTitle(title) || isCategoryPath(url)) continue;
    if (!looksLikeListingUrl(url, title, source)) continue;
    seen.add(url);
    items.push({
      provider_key: source.provider_key || "custom",
      external_id: url,
      source_url: url,
      source_name: source.name || "HTML",
      item_type: "job",
      category: source.category_filter || "pune",
      original_title: title.slice(0, 180),
      original_description: "",
      original_company: "",
      original_location: "",
      original_country: normalizeCountry(source.country_filter || ""),
      original_city: "",
      contact_methods: [{ type: "application_form", value: url }],
      _requires_detail_page: true,
      _detail_page_loaded: false
    });
  }
  return items;
}

function countSimpleSelectorMatches(html = "", selector = "") {
  const value = String(selector || "").trim();
  if (!value) return 0;
  if (value === "a[href]") return (html.match(/<a\b[^>]*href=/gi) || []).length;
  if (/^[a-z][a-z0-9-]*$/i.test(value)) {
    return (html.match(new RegExp(`<${value}\\b`, "gi")) || []).length;
  }
  const className = /^\.([a-z0-9_-]+)$/i.exec(value)?.[1] || /\[class\*=['"]([^'"]+)['"]\]/i.exec(value)?.[1];
  if (className) {
    return (html.match(new RegExp(`class=["'][^"']*${className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^"']*["']`, "gi")) || []).length;
  }
  const idName = /^#([a-z0-9_-]+)$/i.exec(value)?.[1];
  if (idName) {
    return (html.match(new RegExp(`id=["']${idName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`, "gi")) || []).length;
  }
  return 0;
}

function selectorMatchSummary(html = "", source = {}) {
  const config = parserConfig(source);
  const selectors = [
    ["item_selector", config.item_selector],
    ["title_selector", config.title_selector],
    ["link_selector", config.link_selector || "a[href]"],
    ["company_selector", config.company_selector],
    ["location_selector", config.location_selector],
    ["date_selector", config.date_selector],
    ["summary_selector", config.summary_selector],
  ].filter(([, selector]) => selector);
  const summary = {};
  for (const [name, selectorText] of selectors) {
    summary[name] = String(selectorText)
      .split(",")
      .map((selector) => selector.trim())
      .filter(Boolean)
      .map((selector) => ({ selector, matches: countSimpleSelectorMatches(html, selector) }));
  }
  return summary;
}

function inspectAnchorCandidates(html = "", source = {}, baseUrl = "") {
  const anchors = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)];
  const candidateUrls = [];
  const acceptedUrls = [];
  const seenCandidates = new Set();
  for (const anchor of anchors) {
    const attrs = anchor[1] || "";
    const href = /href=["']([^"']+)["']/i.exec(attrs)?.[1] || "";
    const url = absoluteUrl(htmlDecode(href), baseUrl);
    const title = tagless(anchor[2] || "");
    if (!url || seenCandidates.has(url)) continue;
    if (looksLikeListingUrl(url, title, source)) {
      seenCandidates.add(url);
      candidateUrls.push(url);
      if (!isBlockedNonJobUrl(url) && !isListingOrCategoryUrl(url) && !sameListingIndex(url, baseUrl) && !isNavigationTitle(title) && !isCategoryPath(url)) {
        acceptedUrls.push(url);
      }
    }
  }
  return {
    all_links_found: anchors.length,
    candidate_job_links_found: candidateUrls.length,
    accepted_job_links_found: acceptedUrls.length,
    first_candidate_urls: candidateUrls.slice(0, 10),
    first_accepted_urls: acceptedUrls.slice(0, 10),
  };
}

async function fetchHtmlPage({ maxItems = 50, source = {} } = {}) {
  const url = getUrl(source);
  if (!url) return [];
  if (isBlockedNonJobUrl(url)) return nonJobPageFailure(source, url);
  const response = await fetch(url, {
    headers: { Accept: "text/html,application/xhtml+xml", "User-Agent": "AntoktonImportAssistant/1.0" }
  });
  if (!response.ok) throw new Error(`HTML source returned ${response.status}`);
  const html = await response.text();
  const config = parserConfig(source);
  const inferredConfig = hasUsableHtmlParserConfig(config) ? null : inferHtmlParserConfigFromHtml(html, source, response.url || url);
  if (!hasUsableHtmlParserConfig(config) && !inferredConfig) {
    return missingParserConfigFailure(source, response.url || url);
  }
  const effectiveSource = inferredConfig
    ? { ...source, parser_config: { ...config, ...inferredConfig } }
    : source;
  const jsonLd = parseJsonLdJobs(html, effectiveSource, response.url || url);
  const anchors = parseHtmlAnchors(html, effectiveSource, response.url || url);
  const merged = [];
  const seen = new Set();
  for (const item of [...jsonLd, ...anchors]) {
    const key = item.source_url || item.external_id || item.original_title;
    if (!key || seen.has(key)) continue;
    if (isBlockedNonJobUrl(item.source_url)) continue;
    seen.add(key);
    merged.push({
      ...item,
      original_description: item.original_description || ""
    });
  }
  const enriched = [];
  for (const item of merged.slice(0, maxItems)) {
    enriched.push(await enrichItemFromDetailPage(item, source));
  }
  return enriched;
}

async function inspectHtmlSource(source = {}) {
  const url = getUrl(source);
  const config = parserConfig(source);
  const selectorsTried = {
    item_selector: config.item_selector || "",
    item_url_patterns: config.item_url_patterns || "",
    json_ld_jobs: config.json_ld_jobs === true,
    title_selector: config.title_selector || "",
    link_selector: config.link_selector || "a[href]",
    company_selector: config.company_selector || "",
    location_selector: config.location_selector || "",
    date_selector: config.date_selector || "",
    summary_selector: config.summary_selector || "",
  };
  if (!url) {
    return {
      url: "",
      http_status: 0,
      html_size: 0,
      selectors_tried: selectorsTried,
      reason: "Nuk ka URL për lexim.",
    };
  }
  if (isBlockedNonJobUrl(url)) {
    return {
      url,
      http_status: 0,
      html_size: 0,
      selectors_tried: selectorsTried,
      reason: "URL është e bllokuar si faqe jo-njoftim ose faqe marketingu.",
    };
  }
  try {
    const response = await fetch(url, {
      headers: { Accept: "text/html,application/xhtml+xml", "User-Agent": "AntoktonImportAssistant/1.0" }
    });
    const html = await response.text();
    const inferredConfig = hasUsableHtmlParserConfig(config) ? null : inferHtmlParserConfigFromHtml(html, source, response.url || url);
    const effectiveSource = inferredConfig
      ? { ...source, parser_config: { ...config, ...inferredConfig } }
      : source;
    const anchors = parseHtmlAnchors(html, effectiveSource, response.url || url);
    const jsonLd = parseJsonLdJobs(html, effectiveSource, response.url || url);
    const candidateDiagnostics = inspectAnchorCandidates(html, effectiveSource, response.url || url);
    const selectorMatches = selectorMatchSummary(html, effectiveSource);
    const javascriptRendered = looksJavascriptRendered(html);
    const botProtection = looksBotProtected(html, response.status);
    let reason = "";
    if (botProtection) reason = `Faqja duket me Cloudflare/bot protection ose CAPTCHA${response.ok ? "" : `; HTTP ${response.status}`}.`;
    else if (!response.ok) reason = `URL ktheu HTTP ${response.status}.`;
    else if (!html.trim()) reason = "HTML bosh.";
    else if (javascriptRendered) reason = "Faqja duket JavaScript-rendered; HTML publik nuk përmban kartat e njoftimeve.";
    else if (!hasUsableHtmlParserConfig(config) && !inferredConfig) reason = "Mungon parser_config dhe auto-parser nuk gjeti kartë/link njoftimi të besueshëm. Shënohet si needs_configuration.";
    else if (!anchors.length && !jsonLd.length) reason = "HTML u lexua, por nuk u kapën linke njoftimesh me selectorët/patterns aktualë.";
    else reason = `U gjetën ${anchors.length} linke dhe ${jsonLd.length} JSON-LD, por mund të kenë dështuar në validim.`;
    return {
      url: response.url || url,
      http_status: response.status,
      html_size: html.length,
      selectors_tried: selectorsTried,
      selector_matches: selectorMatches,
      inferred_parser_config: inferredConfig,
      configuration_status: !hasUsableHtmlParserConfig(config) && !inferredConfig ? "needs_configuration" : "configured",
      javascript_rendered: javascriptRendered,
      bot_protection: botProtection,
      all_links_found: candidateDiagnostics.all_links_found,
      candidate_job_links_found: candidateDiagnostics.candidate_job_links_found,
      accepted_job_links_found: candidateDiagnostics.accepted_job_links_found,
      first_candidate_urls: candidateDiagnostics.first_candidate_urls,
      first_accepted_urls: candidateDiagnostics.first_accepted_urls,
      anchors_found: anchors.length,
      json_ld_jobs_found: jsonLd.length,
      html_preview: html.slice(0, 1000),
      reason,
    };
  } catch (error) {
    return {
      url,
      http_status: 0,
      html_size: 0,
      selectors_tried: selectorsTried,
      reason: error?.message || "HTML nuk u lexua.",
    };
  }
}

async function fetchTelegramPublic({ maxItems = 50, source = {} } = {}) {
  const url = getUrl(source);
  if (!url || !/t\.me\//i.test(url)) return [];
  const publicUrl = url.includes("/s/") ? url : url.replace(/https?:\/\/t\.me\//i, "https://t.me/s/");
  const response = await fetch(publicUrl, {
    headers: { Accept: "text/html", "User-Agent": "AntoktonImportAssistant/1.0" }
  });
  if (!response.ok) throw new Error(`Telegram source returned ${response.status}`);
  const html = await response.text();
  const blocks = html.split(/tgme_widget_message_wrap/).slice(1);
  return blocks.slice(0, maxItems).map((block, index) => {
    const link = absoluteUrl(/href=["']([^"']+)["'][^>]*class=["']tgme_widget_message_date/i.exec(block)?.[1] || "", publicUrl);
    const textMatch = /class=["']tgme_widget_message_text[^"']*["'][^>]*>([\s\S]*?)(?:<\/div>\s*<div|<\/div>)/i.exec(block);
    const text = tagless(textMatch?.[1] || "");
    return {
      provider_key: source.provider_key || "custom",
      external_id: link || `${publicUrl}#${index}`,
      source_url: link || publicUrl,
      source_name: source.name || "Telegram",
      item_type: "job",
      category: source.category_filter || "pune",
      original_title: text.slice(0, 120) || `Njoftim nga ${source.name || "Telegram"}`,
      original_description: text,
      original_company: source.name || "",
      original_location: source.country_filter || "",
      original_country: normalizeCountry(source.country_filter || "")
    };
  }).filter((item) => item.original_description || item.original_title);
}

async function fetchFacebookApi({ maxItems = 50, source = {}, config = {} } = {}) {
  const accessToken = config.FACEBOOK_ACCESS_TOKEN || config.FB_GRAPH_TOKEN;
  const sourceConfig = parserConfig(source);
  const pageId = sourceConfig.page_id || source.facebook_page_id || "";
  if (!accessToken || !pageId) return [];
  const fields = "id,message,created_time,permalink_url,full_picture,from";
  const url = `https://graph.facebook.com/v19.0/${encodeURIComponent(pageId)}/posts?fields=${encodeURIComponent(fields)}&limit=${Math.min(maxItems, 50)}&access_token=${encodeURIComponent(accessToken)}`;
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Facebook API returned ${response.status}`);
  const json = await response.json();
  return (Array.isArray(json.data) ? json.data : []).map((post) => ({
    provider_key: source.provider_key || "custom",
    external_id: post.id,
    source_url: post.permalink_url || "",
    source_name: source.name || "Facebook Page",
    item_type: "job",
    category: source.category_filter || "pune",
    original_title: cleanText(post.message || "").slice(0, 120) || `Njoftim nga ${source.name || "Facebook"}`,
    original_description: cleanText(post.message || ""),
    original_company: post.from?.name || source.name || "",
    original_location: source.country_filter || "",
    original_country: normalizeCountry(source.country_filter || ""),
    published_at: post.created_time || ""
  }));
}

async function fetchItems(options = {}) {
  const url = getUrl(options.source || {});
  if (options.source?.blocked_for_jobs || isBlockedNonJobUrl(url)) return nonJobPageFailure(options.source || {}, url);
  const parserType = String(options.source?.parser_type || options.source?.crawl_method || "").toLowerCase() || "rss";
  if (parserType === "rss") return genericRssProvider.fetchItems(options);
  if (parserType === "api") return fetchJsonApi(options);
  if (parserType === "html") return fetchHtmlPage(options);
  if (parserType === "telegram") return fetchTelegramPublic(options);
  if (parserType === "facebook") return fetchFacebookApi(options);
  return [];
}

module.exports = { fetchItems, inspectHtmlSource };
