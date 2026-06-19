async function fetchItems({ config = {} } = {}) {
  if (!config.ADZUNA_APP_ID || !config.ADZUNA_APP_KEY) return [];
  const url = new URL("https://api.adzuna.com/v1/api/jobs/de/search/1");
  url.searchParams.set("app_id", config.ADZUNA_APP_ID);
  url.searchParams.set("app_key", config.ADZUNA_APP_KEY);
  url.searchParams.set("results_per_page", "50");
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Adzuna returned ${response.status}`);
  const json = await response.json();
  return (json.results || []).map((job) => ({
    provider_key: "adzuna",
    external_id: String(job.id || job.redirect_url || ""),
    source_url: job.redirect_url,
    source_name: "Adzuna",
    item_type: "job",
    category: "pune",
    original_title: job.title,
    original_description: job.description,
    original_company: job.company?.display_name || "",
    original_location: job.location?.display_name || "",
    original_country: "Gjermani",
    original_salary: [job.salary_min, job.salary_max].filter(Boolean).join("-"),
    salary_min: job.salary_min,
    salary_max: job.salary_max,
    currency: "EUR",
    published_at: job.created
  }));
}

module.exports = { fetchItems };
