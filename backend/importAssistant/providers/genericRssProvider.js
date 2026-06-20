const { cleanText } = require("../textUtils");

function decodeXml(value = "") {
  return cleanText(String(value || "").replace(/^<!\[CDATA\[|\]\]>$/g, ""));
}

function tagValue(xml, tag) {
  const match = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i").exec(xml);
  return decodeXml(match?.[1] || "");
}

function attrValue(xml, tag, attr) {
  const match = new RegExp(`<${tag}\\b[^>]*\\s${attr}=["']([^"']+)["'][^>]*>`, "i").exec(xml);
  return cleanText(match?.[1] || "");
}

function sourceUrl(source = {}) {
  return source.rss_url || source.source_url || source.base_url || "";
}

function rssItems(xml = "") {
  return xml.split(/<item\b/i).slice(1).map((chunk) => `<item ${chunk}`);
}

function atomItems(xml = "") {
  return xml.split(/<entry\b/i).slice(1).map((chunk) => `<entry ${chunk}`);
}

function mapEntry(entry, source = {}) {
  const isAtom = /^<entry\b/i.test(entry);
  const link = isAtom ? (attrValue(entry, "link", "href") || tagValue(entry, "link")) : tagValue(entry, "link");
  return {
    provider_key: source.provider_key || "generic_rss",
    external_id: tagValue(entry, "guid") || tagValue(entry, "id") || link || tagValue(entry, "title"),
    source_url: link,
    source_name: source.name || "RSS",
    item_type: source.category_filter || "job",
    category: source.category_filter === "housing" ? "pazar" : source.category_filter === "service" ? "sherbime" : "pune",
    original_title: tagValue(entry, "title"),
    original_description: tagValue(entry, "description") || tagValue(entry, "summary") || tagValue(entry, "content"),
    original_company: tagValue(entry, "author") || tagValue(entry, "dc:creator"),
    original_location: tagValue(entry, "location") || source.country_filter || "",
    original_country: source.country_filter || "",
    published_at: tagValue(entry, "pubDate") || tagValue(entry, "published") || tagValue(entry, "updated")
  };
}

async function fetchGenericRss({ maxItems = 50, source = {} } = {}) {
  const url = sourceUrl(source);
  if (!url) return [];
  const response = await fetch(url, {
    headers: { Accept: "application/rss+xml, application/xml, text/xml", "User-Agent": "AntoktonImportAssistant/1.0" }
  });
  if (!response.ok) throw new Error(`RSS source returned ${response.status}`);
  const xml = await response.text();
  const items = rssItems(xml);
  const entries = items.length ? items : atomItems(xml);
  return entries.slice(0, maxItems).map((entry) => mapEntry(entry, source));
}

module.exports = { fetchItems: fetchGenericRss };
