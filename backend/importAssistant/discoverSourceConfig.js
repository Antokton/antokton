const { cleanText } = require("./textUtils");
const { applyKnownSourceConfig, isAcademicPositions } = require("./sourceConfigRules");

const JOB_PATHS = [
  "/jobs",
  "/find-jobs",
  "/careers",
  "/career",
  "/vacancies",
  "/vacancy",
  "/job-search",
  "/positions",
  "/open-positions",
  "/opportunities",
  "/pune",
  "/vende-pune",
  "/njoftime/pune",
  "/karriere",
  "/karriera",
];

const FEED_PATHS = [
  "/feed",
  "/feed.xml",
  "/rss",
  "/rss.xml",
  "/jobs.rss",
  "/jobs/feed",
  "/jobs/feed.xml",
  "/vacancies.rss",
  "/sitemap.xml",
];

const API_PATHS = [
  "/api/jobs",
  "/api/vacancies",
  "/api/positions",
  "/jobs.json",
  "/vacancies.json",
];

function safeUrl(value = "", base = "") {
  try {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const withProtocol = base || /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    return new URL(withProtocol, base || undefined).toString();
  } catch {
    return "";
  }
}

function normalizeInputUrl(value = "") {
  const url = safeUrl(value);
  if (!url) return "";
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

function originOf(url = "") {
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}

function sameHost(url = "", base = "") {
  try {
    return new URL(url).hostname.replace(/^www\./, "") === new URL(base).hostname.replace(/^www\./, "");
  } catch {
    return false;
  }
}

function tagless(value = "") {
  return cleanText(String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'"));
}

async function fetchText(url, accept = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8") {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: accept,
        "User-Agent": "AntoktonImportAssistant/1.0 (+https://antokton.com)",
      },
    });
    const contentType = response.headers.get("content-type") || "";
    const text = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      url: response.url || url,
      contentType,
      text: text.slice(0, 900000),
    };
  } finally {
    clearTimeout(timer);
  }
}

function extractLinks(html = "", baseUrl = "") {
  const rows = [];
  for (const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const attrs = match[1] || "";
    const href = /href\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1] || "";
    const url = safeUrl(href, baseUrl);
    const text = tagless(match[2] || "");
    if (url) rows.push({ url, text });
  }
  return rows;
}

function extractFeedLinks(html = "", baseUrl = "") {
  const rows = [];
  for (const match of html.matchAll(/<link\b([^>]+)>/gi)) {
    const attrs = match[1] || "";
    const type = /type\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1] || "";
    const rel = /rel\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1] || "";
    const href = /href\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1] || "";
    if (!/alternate/i.test(rel) && !/rss|atom|xml/i.test(type)) continue;
    const url = safeUrl(href, baseUrl);
    if (url) rows.push(url);
  }
  return rows;
}

function extractApiCandidates(html = "", baseUrl = "") {
  const rows = new Set();
  const patterns = [
    /["']([^"']*\/api\/[^"']*(?:job|jobs|vacanc|position)[^"']*)["']/gi,
    /["']([^"']*(?:job|jobs|vacanc|position)[^"']*\.json[^"']*)["']/gi,
  ];
  patterns.forEach((pattern) => {
    for (const match of html.matchAll(pattern)) {
      const url = safeUrl(match[1], baseUrl);
      if (url) rows.add(url);
    }
  });
  return [...rows].slice(0, 8);
}

function scoreJobUrl(url = "", text = "") {
  const haystack = `${url} ${text}`.toLowerCase();
  let score = 0;
  if (/(^|\/)(jobs?|find-jobs|careers?|vacanc(?:y|ies)|job-search|positions?|open-positions)(\/|$|\?)/i.test(url)) score += 8;
  if (/\b(find jobs?|jobs?|careers?|vacancies|open positions|job search|karriere|vende pune|pune)\b/i.test(text)) score += 7;
  if (/\/(?:job|jobs|vacanc|position|career|pune)/i.test(url)) score += 3;
  if (/(login|signin|register|privacy|terms|about|contact|blog|news)/i.test(haystack)) score -= 5;
  return score;
}

function uniqueCandidates(rows = []) {
  const seen = new Set();
  return rows.filter((row) => {
    const key = row.url || row;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function hasJsonLdJobs(html = "") {
  return /application\/ld\+json/i.test(html) && /JobPosting|jobLocation|hiringOrganization/i.test(html);
}

function detectJavascriptRendered(html = "") {
  const bodyText = tagless(/<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(html)?.[1] || html);
  const scriptCount = (html.match(/<script\b/gi) || []).length;
  const rootMount = /<div[^>]+id=["'](?:root|app|__next|__nuxt)["']/i.test(html);
  return rootMount && scriptCount >= 5 && bodyText.length < 700;
}

function inferParserConfig(html = "", sourceUrl = "") {
  const classCounts = new Map();
  const jobBlockPattern = /<([a-z0-9-]+)\b([^>]*(?:class|data-testid|data-test)[^>]*)>([\s\S]{0,2500}?(?:job|position|vacanc|career|pune|apply)[\s\S]{0,2500}?)<\/\1>/gi;
  for (const match of html.matchAll(jobBlockPattern)) {
    const attrs = match[2] || "";
    const className = /class\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1] || "";
    className.split(/\s+/).forEach((name) => {
      if (/(job|position|vacanc|card|listing|result|posting|opportunity)/i.test(name)) {
        classCounts.set(name, (classCounts.get(name) || 0) + 1);
      }
    });
  }
  const likelyClass = [...classCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "";
  const itemSelector = likelyClass ? `.${likelyClass}` : "";
  const urlPatterns = (() => {
    try {
      const path = new URL(sourceUrl).pathname.toLowerCase();
      if (path.includes("vacanc")) return "vacancy,vacancies,job,jobs,position,apply";
      if (path.includes("career")) return "career,careers,job,jobs,position,apply";
    } catch {}
    return "job,jobs,position,positions,vacancy,vacancies,career,careers,apply";
  })();
  return {
    item_url_patterns: urlPatterns,
    json_ld_jobs: hasJsonLdJobs(html),
    item_selector: itemSelector,
    title_selector: "h1,h2,h3,a,[class*='title'],[class*='position'],[class*='job']",
    link_selector: "a[href]",
    company_selector: "[class*='company'],[class*='employer'],[class*='organization']",
    location_selector: "[class*='location'],[class*='city'],[class*='country']",
    date_selector: "time,[class*='date'],[class*='posted']",
    summary_selector: "p,[class*='summary'],[class*='description'],[class*='excerpt']",
    requires_detail_page: true,
    discovered_by: "auto_discover",
  };
}

function buildCandidateUrls(baseUrl = "", homeHtml = "") {
  const origin = originOf(baseUrl);
  const menuLinks = extractLinks(homeHtml, baseUrl)
    .filter((link) => sameHost(link.url, baseUrl))
    .map((link) => ({ ...link, score: scoreJobUrl(link.url, link.text) }))
    .filter((link) => link.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);
  const common = JOB_PATHS.map((path) => ({ url: `${origin}${path}`, text: path, score: scoreJobUrl(`${origin}${path}`, path) }));
  return uniqueCandidates([...menuLinks, ...common]).slice(0, 18);
}

function buildFeedCandidates(baseUrl = "", homeHtml = "") {
  const origin = originOf(baseUrl);
  return uniqueCandidates([
    ...extractFeedLinks(homeHtml, baseUrl),
    ...FEED_PATHS.map((path) => `${origin}${path}`),
  ]).slice(0, 14);
}

function buildApiCandidates(baseUrl = "", homeHtml = "") {
  const origin = originOf(baseUrl);
  return uniqueCandidates([
    ...extractApiCandidates(homeHtml, baseUrl),
    ...API_PATHS.map((path) => `${origin}${path}`),
  ]).slice(0, 12);
}

function summarizeReason({ home, feedResult, apiResult, htmlResult, errors = [] }) {
  if (!home?.ok) {
    if (home?.status === 401 || home?.status === 403) return `Domain-i ktheu ${home.status}; burimi duket i bllokuar, kërkon autorizim, ose ka mbrojtje anti-bot.`;
    return `Domain-i nuk u hap (${home?.status || "pa përgjigje"}).`;
  }
  if (/cloudflare|cf-ray|captcha|bot protection|access denied/i.test(home.text || "")) return "Faqja duket me Cloudflare/bot protection ose CAPTCHA.";
  if (/login|sign in|authentication required/i.test(home.text || "") && !(htmlResult?.score > 0)) return "Burimi duket se kërkon login.";
  if (detectJavascriptRendered(home.text || "") && !htmlResult?.url) return "Faqja duket JavaScript-rendered dhe nuk jep HTML statik të importueshëm.";
  if (feedResult?.error) return feedResult.error;
  if (apiResult?.error) return apiResult.error;
  if (htmlResult?.error) return htmlResult.error;
  if (errors.length) return errors[0];
  return "Nuk u gjet URL me njoftime ose feed/API i lexueshëm.";
}

async function testFeed(url = "") {
  try {
    const result = await fetchText(url, "application/rss+xml,application/atom+xml,application/xml,text/xml,*/*;q=0.8");
    const xml = result.text || "";
    const itemCount = (xml.match(/<(item|entry)\b/gi) || []).length;
    const isFeed = /<(rss|feed)\b/i.test(xml) && itemCount > 0;
    return { ...result, isFeed, itemCount };
  } catch (error) {
    return { ok: false, url, error: error?.name === "AbortError" ? "RSS/API timeout." : error?.message || "RSS nuk u lexua." };
  }
}

async function testApi(url = "") {
  try {
    const result = await fetchText(url, "application/json,*/*;q=0.8");
    if (!result.ok) return { ...result, isApi: false };
    const json = JSON.parse(result.text);
    const rows = Array.isArray(json) ? json : (json.jobs || json.data || json.results || []);
    return { ...result, isApi: Array.isArray(rows) && rows.length > 0, itemCount: Array.isArray(rows) ? rows.length : 0 };
  } catch (error) {
    return { ok: false, url, error: error?.message || "API nuk u lexua." };
  }
}

async function testHtmlCandidate(candidate = {}) {
  try {
    const result = await fetchText(candidate.url);
    if (!result.ok) return { ...result, score: 0, error: `URL ${candidate.url} ktheu status ${result.status}.` };
    const html = result.text || "";
    const links = extractLinks(html, result.url || candidate.url);
    const jobLinks = links.filter((link) => scoreJobUrl(link.url, link.text) >= 5);
    const jsonLd = hasJsonLdJobs(html);
    const score = candidate.score + Math.min(jobLinks.length, 20) + (jsonLd ? 10 : 0) - (detectJavascriptRendered(html) ? 6 : 0);
    return { ...result, score, jobLinks: jobLinks.length, jsonLd, parserConfig: inferParserConfig(html, result.url || candidate.url) };
  } catch (error) {
    return { ok: false, url: candidate.url, score: 0, error: error?.name === "AbortError" ? "HTML timeout." : error?.message || "HTML nuk u lexua." };
  }
}

async function discoverSourceConfig(input = {}) {
  const inputUrl = normalizeInputUrl(input.url || input.source_url || input.base_url || "");
  if (!inputUrl) {
    return { success: false, reason: "Vendos domain ose URL të vlefshme.", diagnostics: { tried: [] } };
  }

  const knownSource = applyKnownSourceConfig({
    name: input.name || "",
    source_url: inputUrl,
    base_url: inputUrl,
    category_filter: input.category_filter || "pune",
    country_filter: input.country_filter || "",
    profession_filter: input.profession_filter || "",
    source_group: input.source_group || "community",
  });
  if (isAcademicPositions(knownSource)) {
    return {
      success: true,
      reason: "Konfigurim i njohur: Academic Positions përdor /find-jobs si Jobs URL.",
      source: knownSource,
      diagnostics: {
        tried: [{ type: "known_source", url: inputUrl, status: 200, ok: true }],
        feeds: [],
        apis: [],
        html: [{ url: knownSource.jobs_url, status: 0, ok: true, score: 100, jobLinks: 0, jsonLd: true }],
      },
    };
  }

  const diagnostics = { tried: [], feeds: [], apis: [], html: [] };
  const errors = [];
  let home;
  try {
    home = await fetchText(inputUrl);
    diagnostics.tried.push({ type: "home", url: inputUrl, status: home.status, ok: home.ok });
  } catch (error) {
    home = { ok: false, status: 0, url: inputUrl, text: "", error: error?.message || "Domain-i nuk u hap." };
    errors.push(home.error);
  }

  const baseUrl = home?.url || inputUrl;
  const homeHtml = home?.text || "";
  const origin = originOf(baseUrl);

  let feedHit = null;
  for (const feedUrl of buildFeedCandidates(baseUrl, homeHtml)) {
    const result = await testFeed(feedUrl);
    diagnostics.feeds.push({ url: feedUrl, status: result.status || 0, ok: result.ok === true, items: result.itemCount || 0 });
    if (result.isFeed) {
      feedHit = { url: result.url || feedUrl, items: result.itemCount };
      break;
    }
  }

  let apiHit = null;
  if (!feedHit) {
    for (const apiUrl of buildApiCandidates(baseUrl, homeHtml)) {
      const result = await testApi(apiUrl);
      diagnostics.apis.push({ url: apiUrl, status: result.status || 0, ok: result.ok === true, items: result.itemCount || 0 });
      if (result.isApi) {
        apiHit = { url: result.url || apiUrl, items: result.itemCount };
        break;
      }
    }
  }

  let htmlHit = null;
  if (!feedHit && !apiHit) {
    const htmlCandidates = buildCandidateUrls(baseUrl, homeHtml);
    const results = [];
    for (const candidate of htmlCandidates) {
      const result = await testHtmlCandidate(candidate);
      diagnostics.html.push({ url: candidate.url, status: result.status || 0, ok: result.ok === true, score: result.score || 0, jobLinks: result.jobLinks || 0, jsonLd: result.jsonLd === true });
      if (result.ok) results.push(result);
    }
    htmlHit = results.sort((a, b) => (b.score || 0) - (a.score || 0))[0] || null;
    if (htmlHit && htmlHit.score < 8 && !htmlHit.jsonLd) htmlHit = null;
  }

  const sourceName = input.name || (() => {
    try {
      return new URL(inputUrl).hostname.replace(/^www\./, "").split(".")[0].replace(/[-_]+/g, " ");
    } catch {
      return "Burim i ri";
    }
  })();

  const discovered = {
    name: sourceName.replace(/\b\w/g, (letter) => letter.toUpperCase()),
    base_url: origin || inputUrl,
    source_url: inputUrl,
    api_endpoint: "",
    rss_url: "",
    jobs_url: "",
    category_url: "",
    provider_key: "custom",
    source_type: "html",
    import_mode: "automatic",
    crawl_method: "html",
    automation_level: "full_auto",
    parser_type: "html",
    source_group: input.source_group || "community",
    trust_level: "trusted",
    parser_config: {},
    notes: "",
    login_required: false,
    moderation_required: true,
    original_source_required: true,
  };

  let success = false;
  let reason = "";
  if (feedHit) {
    success = true;
    Object.assign(discovered, {
      source_url: feedHit.url,
      rss_url: feedHit.url,
      source_type: "rss",
      crawl_method: "rss",
      parser_type: "rss",
      provider_key: "generic_rss",
      source_group: "rss",
      parser_config: { discovered_by: "auto_discover", feed_items_seen: feedHit.items },
      notes: `Auto-discover: RSS/Atom feed u gjet (${feedHit.items} items).`,
    });
  } else if (apiHit) {
    success = true;
    Object.assign(discovered, {
      source_url: apiHit.url,
      api_endpoint: apiHit.url,
      source_type: "api",
      crawl_method: "api",
      parser_type: "api",
      provider_key: "custom",
      source_group: "custom_api",
      parser_config: { discovered_by: "auto_discover", api_items_seen: apiHit.items },
      notes: `Auto-discover: API endpoint u gjet (${apiHit.items} items).`,
    });
  } else if (htmlHit) {
    success = true;
    Object.assign(discovered, {
      source_url: htmlHit.url || inputUrl,
      jobs_url: htmlHit.url || inputUrl,
      source_type: "html",
      crawl_method: "html",
      parser_type: "html",
      provider_key: "custom",
      parser_config: htmlHit.parserConfig || inferParserConfig(htmlHit.text || "", htmlHit.url || inputUrl),
      notes: `Auto-discover: HTML publik u gjet. Linke pune të dalluara: ${htmlHit.jobLinks || 0}. JSON-LD: ${htmlHit.jsonLd ? "po" : "jo"}.`,
    });
  } else {
    reason = summarizeReason({ home, errors });
  }

  if (!reason) {
    reason = success ? "Konfigurimi u zbulua automatikisht." : summarizeReason({ home, errors });
  }

  return {
    success,
    reason,
    source: discovered,
    diagnostics,
  };
}

module.exports = { discoverSourceConfig, normalizeInputUrl, inferParserConfig };
