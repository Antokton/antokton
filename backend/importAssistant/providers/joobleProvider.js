async function fetchItems({ config = {}, source = {}, maxItems = 50 } = {}) {
  if (!config.JOOBLE_API_KEY) return [];
  const query = source.parser_config?.query || source.profession_filter || "driver";
  const location = source.parser_config?.country_filter || source.country_filter || "";
  const response = await fetch(`https://jooble.org/api/${config.JOOBLE_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      keywords: query,
      location,
      page: 1,
      limit: Math.min(50, Math.max(1, Number(maxItems || 50)))
    })
  });
  if (!response.ok) throw new Error(`Jooble returned ${response.status}`);
  const json = await response.json();
  return (json.jobs || []).slice(0, maxItems).map((job) => ({
    provider_key: "jooble",
    external_id: String(job.id || job.link || job.title || ""),
    source_url: job.link || "",
    source_name: "Jooble",
    item_type: "job",
    category: "pune",
    original_title: job.title || "",
    original_description: job.snippet || job.description || "",
    original_company: job.company || "",
    original_location: job.location || location || "",
    original_country: location,
    original_city: job.location || "",
    original_salary: job.salary || "",
    published_at: job.updated || job.date || ""
  }));
}

module.exports = { fetchItems };
