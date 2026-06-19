const { cleanText } = require("../textUtils");

async function fetchArbeitnowJobs({ maxItems = 50, source = {} } = {}) {
  const endpoint = source.base_url || "https://www.arbeitnow.com/api/job-board-api";
  const response = await fetch(endpoint, {
    headers: { Accept: "application/json", "User-Agent": "AntoktonImportAssistant/1.0" }
  });
  if (!response.ok) throw new Error(`Arbeitnow returned ${response.status}`);
  const json = await response.json();
  const rows = Array.isArray(json.data) ? json.data : [];
  return rows.slice(0, maxItems).map((job) => ({
    provider_key: "arbeitnow",
    external_id: String(job.slug || job.id || job.url || ""),
    source_url: job.url || "",
    source_name: "Arbeitnow",
    item_type: "job",
    category: "pune",
    original_title: job.title || "",
    original_description: cleanText(job.description || ""),
    original_company: job.company_name || "",
    original_location: Array.isArray(job.location) ? job.location.join(", ") : job.location || "",
    original_country: "Gjermani",
    original_city: Array.isArray(job.location) ? job.location[0] : "",
    original_salary: "",
    contract_type: Array.isArray(job.job_types) ? job.job_types.join(", ") : "",
    tags: job.tags || [],
    published_at: job.created_at ? new Date(job.created_at * 1000).toISOString() : ""
  }));
}

module.exports = { fetchItems: fetchArbeitnowJobs };
