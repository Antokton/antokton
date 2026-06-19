const { cleanText } = require("../textUtils");

const GERMANY_ALIASES = new Set(["germany", "deutschland", "gjermani", "remote", "hybrid"]);

const GERMAN_CITY_REGIONS = {
  berlin: "Berlin",
  hamburg: "Hamburg",
  münchen: "Bayern",
  munich: "Bayern",
  nürnberg: "Bayern",
  augsburg: "Bayern",
  stuttgart: "Baden-Württemberg",
  mannheim: "Baden-Württemberg",
  karlsruhe: "Baden-Württemberg",
  köln: "Nordrhein-Westfalen",
  cologne: "Nordrhein-Westfalen",
  düsseldorf: "Nordrhein-Westfalen",
  dortmund: "Nordrhein-Westfalen",
  essen: "Nordrhein-Westfalen",
  frankfurt: "Hessen",
  wiesbaden: "Hessen",
  kassel: "Hessen",
  bremen: "Bremen",
  hannover: "Niedersachsen",
  leipzig: "Sachsen",
  dresden: "Sachsen",
};

function parseLocation(location) {
  const pieces = (Array.isArray(location) ? location : String(location || "").split(","))
    .map((part) => cleanText(part))
    .filter(Boolean);
  const city = pieces.find((part) => !GERMANY_ALIASES.has(part.toLowerCase())) || "";
  const region = GERMAN_CITY_REGIONS[city.toLowerCase()] || "";
  return { city, region };
}

function splitKeywords(value) {
  return String(value || "")
    .split(/[,\n;]/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function passesSourceFilters(job, source = {}) {
  const text = cleanText([job.title, job.description, job.company_name, Array.isArray(job.tags) ? job.tags.join(" ") : ""].join(" ")).toLowerCase();
  const category = String(source.category_filter || source.parser_config?.category_filter || "").toLowerCase();
  const country = String(source.country_filter || source.parser_config?.country_filter || "").toLowerCase();
  if (category && !["job", "pune", "punë"].includes(category)) return false;
  if (country && !["gjermani", "germany", "deutschland"].includes(country)) return false;
  const include = splitKeywords(source.profession_filter || source.parser_config?.profession_filter);
  const exclude = splitKeywords(source.excluded_keywords || source.parser_config?.excluded_keywords);
  const defaultExclude = [
    "senior", "lead", "head of", "director", "manager", "principal", "architect",
    "professor", "teacher", "research", "phd", "master degree", "university degree",
    "software engineer", "developer", "data scientist", "consultant"
  ];
  if (include.length && !include.some((keyword) => text.includes(keyword))) return false;
  if ([...defaultExclude, ...exclude].some((keyword) => text.includes(keyword))) return false;
  return true;
}

async function fetchArbeitnowJobs({ maxItems = 50, source = {} } = {}) {
  const endpoint = source.base_url || "https://www.arbeitnow.com/api/job-board-api";
  const response = await fetch(endpoint, {
    headers: { Accept: "application/json", "User-Agent": "AntoktonImportAssistant/1.0" }
  });
  if (!response.ok) throw new Error(`Arbeitnow returned ${response.status}`);
  const json = await response.json();
  const rows = Array.isArray(json.data) ? json.data : [];
  return rows.filter((job) => passesSourceFilters(job, source)).slice(0, maxItems).map((job) => {
    const location = parseLocation(job.location);
    return ({
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
    original_city: location.city,
    region: location.region,
    original_salary: "",
    contract_type: Array.isArray(job.job_types) ? job.job_types.join(", ") : "",
    tags: job.tags || [],
    published_at: job.created_at ? new Date(job.created_at * 1000).toISOString() : ""
  });});
}

module.exports = { fetchItems: fetchArbeitnowJobs };
