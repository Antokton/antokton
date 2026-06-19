const { cleanText } = require("../textUtils");

function tagValue(xml, tag) {
  const match = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i").exec(xml);
  return cleanText((match?.[1] || "").replace(/^<!\[CDATA\[|\]\]>$/g, ""));
}

async function fetchGenericRss({ maxItems = 50, source = {} } = {}) {
  if (!source.base_url) return [];
  const response = await fetch(source.base_url, {
    headers: { Accept: "application/rss+xml, application/xml, text/xml", "User-Agent": "AntoktonImportAssistant/1.0" }
  });
  if (!response.ok) throw new Error(`RSS source returned ${response.status}`);
  const xml = await response.text();
  const items = xml.split(/<item\b/i).slice(1).map((chunk) => `<item ${chunk}`);
  return items.slice(0, maxItems).map((entry) => ({
    provider_key: source.provider_key || "generic_rss",
    external_id: tagValue(entry, "guid") || tagValue(entry, "link") || tagValue(entry, "title"),
    source_url: tagValue(entry, "link"),
    source_name: source.name || "RSS",
    item_type: source.category_filter || "job",
    category: source.category_filter === "housing" ? "pazar" : source.category_filter === "service" ? "sherbime" : "pune",
    original_title: tagValue(entry, "title"),
    original_description: tagValue(entry, "description"),
    published_at: tagValue(entry, "pubDate")
  }));
}

module.exports = { fetchItems: fetchGenericRss };
