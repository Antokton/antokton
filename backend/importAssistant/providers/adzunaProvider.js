const COUNTRY_CODES = {
  belgium: "be",
  belgique: "be",
  belgikë: "be",
  germany: "de",
  deutschland: "de",
  gjermani: "de",
  netherlands: "nl",
  holland: "nl",
  holandë: "nl",
  france: "fr",
  francë: "fr",
  italy: "it",
  italia: "it",
  itali: "it",
  switzerland: "ch",
  zvicër: "ch",
  austria: "at",
  austri: "at",
  sweden: "se",
  suedi: "se",
  denmark: "dk",
  danimarkë: "dk",
  finland: "fi",
  finlandë: "fi",
  spain: "es",
  spanjë: "es",
  portugal: "pt",
  portugali: "pt",
  ireland: "ie",
  irlandë: "ie",
  "united kingdom": "gb",
  uk: "gb",
  britani: "gb",
  "britani e madhe": "gb"
};

function countryCode(value = "") {
  return COUNTRY_CODES[String(value || "").trim().toLowerCase()] || "de";
}

async function fetchItems({ config = {}, source = {}, maxItems = 50 } = {}) {
  if (!config.ADZUNA_APP_ID || !config.ADZUNA_APP_KEY) return [];
  const configuredCountryCode = String(source.parser_config?.country_code || "").trim().toLowerCase();
  const country = configuredCountryCode || countryCode(source.parser_config?.country_filter || source.country_filter || "Germany");
  const query = source.parser_config?.query || source.profession_filter || "";
  const url = new URL(`https://api.adzuna.com/v1/api/jobs/${country}/search/1`);
  url.searchParams.set("app_id", config.ADZUNA_APP_ID);
  url.searchParams.set("app_key", config.ADZUNA_APP_KEY);
  url.searchParams.set("results_per_page", String(Math.min(50, Math.max(1, Number(maxItems || 50)))));
  if (query) url.searchParams.set("what", query);
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Adzuna returned ${response.status}`);
  const json = await response.json();
  return (json.results || []).map((job) => ({
    provider_key: "adzuna",
    external_id: String(job.id || job.redirect_url || ""),
    source_url: job.redirect_url,
    source_name: source.name || "Adzuna",
    item_type: "job",
    category: "pune",
    original_title: job.title,
    original_description: job.description,
    original_company: job.company?.display_name || "",
    original_location: job.location?.display_name || "",
    original_country: source.parser_config?.country_filter || source.country_filter || "",
    original_city: Array.isArray(job.location?.area) ? job.location.area[job.location.area.length - 1] || "" : "",
    original_salary: [job.salary_min, job.salary_max].filter(Boolean).join("-"),
    salary_min: job.salary_min,
    salary_max: job.salary_max,
    currency: "EUR",
    published_at: job.created
  }));
}

module.exports = { fetchItems };
