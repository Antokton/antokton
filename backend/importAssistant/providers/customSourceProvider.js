const genericRssProvider = require("./genericRssProvider");
const { cleanText } = require("../textUtils");

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
    : Array.isArray(json.jobs)
      ? json.jobs
      : Array.isArray(json.data)
        ? json.data
        : Array.isArray(json.results)
          ? json.results
          : [];
  return rows.map((job) => {
    const url = job.url || job.source_url || job.apply_url || job.link || "";
    return {
      provider_key: source.provider_key || "custom",
      external_id: String(job.id || job.slug || job.external_id || url || job.title || ""),
      source_url: url,
      source_name: source.name || "API",
      item_type: config.item_type || "job",
      category: source.category_filter || "pune",
      original_title: job.title || job.position || job.name || "",
      original_description: cleanText(job.description || job.content || job.summary || ""),
      original_company: job.company || job.company_name || job.organization || "",
      original_location: cleanText(job.location || job.candidate_required_location || ""),
      original_country: normalizeCountry(job.country || ""),
      original_city: cleanText(job.city || ""),
      original_salary: cleanText(job.salary || ""),
      contact_methods: job.apply_url ? [{ type: "application_form", value: job.apply_url }] : [],
      tags: splitTags(job.tags || job.category),
      published_at: job.date || job.created_at || job.publication_date || job.published_at || ""
    };
  });
}

async function fetchJsonApi({ maxItems = 50, source = {} } = {}) {
  const url = getUrl(source);
  if (!url) return [];
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "AntoktonImportAssistant/1.0" }
  });
  if (!response.ok) throw new Error(`API source returned ${response.status}`);
  const json = await response.json();
  const config = parserConfig(source);
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

function tagless(value = "") {
  return htmlDecode(String(value || "").replace(/<[^>]+>/g, " "));
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
      original_description: title,
      original_company: source.name || "",
      original_location: source.country_filter || "",
      original_country: normalizeCountry(source.country_filter || ""),
      original_city: "",
      contact_methods: [{ type: "application_form", value: url }]
    });
  }
  return items;
}

async function fetchHtmlPage({ maxItems = 50, source = {} } = {}) {
  const url = getUrl(source);
  if (!url) return [];
  const response = await fetch(url, {
    headers: { Accept: "text/html,application/xhtml+xml", "User-Agent": "AntoktonImportAssistant/1.0" }
  });
  if (!response.ok) throw new Error(`HTML source returned ${response.status}`);
  const html = await response.text();
  const jsonLd = parseJsonLdJobs(html, source, url);
  const anchors = parseHtmlAnchors(html, source, url);
  const merged = [];
  const seen = new Set();
  for (const item of [...jsonLd, ...anchors]) {
    const key = item.source_url || item.external_id || item.original_title;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push({
      ...item,
      original_description: item.original_description || htmlDescription(html) || htmlTitle(html)
    });
  }
  return merged.slice(0, maxItems);
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
  const parserType = String(options.source?.parser_type || options.source?.crawl_method || "").toLowerCase() || "rss";
  if (parserType === "rss") return genericRssProvider.fetchItems(options);
  if (parserType === "api") return fetchJsonApi(options);
  if (parserType === "html") return fetchHtmlPage(options);
  if (parserType === "telegram") return fetchTelegramPublic(options);
  if (parserType === "facebook") return fetchFacebookApi(options);
  return [];
}

module.exports = { fetchItems };
