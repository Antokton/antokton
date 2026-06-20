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

const KEYWORD_ALIASES = {
  shofer: ["driver", "fahrer", "kraftfahrer", "truck", "lieferfahrer", "delivery"],
  pastrim: ["clean", "cleaner", "cleaning", "reinigung", "reiniger", "housekeeping"],
  depo: ["warehouse", "lager", "lagerist", "logistik", "logistics"],
  magazin: ["warehouse", "lager", "lagerist", "logistik", "logistics"],
  "ndërtim": ["construction", "bau", "baustelle", "handwerker"],
  ndertim: ["construction", "bau", "baustelle", "handwerker"],
  mekanik: ["mechanic", "mechaniker", "mechatroniker"],
  "elektriçist": ["electrician", "elektriker", "elektro"],
  elektricist: ["electrician", "elektriker", "elektro"],
  hidraulik: ["plumber", "sanitär", "heizung"],
  kujdestar: ["caregiver", "pflege"],
  siguri: ["security", "sicherheit"],
  "shpërndarje": ["delivery", "lieferung", "kurier", "fahrer"],
  shperndarje: ["delivery", "lieferung", "kurier", "fahrer"],
  bujqesi: ["farm", "agriculture", "landwirtschaft", "ernte"],
  "bujqësi": ["farm", "agriculture", "landwirtschaft", "ernte"],
  fabrike: ["factory", "produktion", "production", "fertigung"],
  "fabrikë": ["factory", "produktion", "production", "fertigung"],
  bojaxhi: ["painter", "maler", "lackierer"],
  furre: ["bakery", "baker", "bäcker", "baecker", "backerei", "bäckerei"],
  "furrë": ["bakery", "baker", "bäcker", "baecker", "backerei", "bäckerei"],
  pasticeri: ["pastry", "confectioner", "konditor", "bäckerei"]
};

function expandKeywords(keywords = []) {
  const expanded = new Set();
  for (const keyword of keywords) {
    expanded.add(keyword);
    const aliases = KEYWORD_ALIASES[keyword] || KEYWORD_ALIASES[keyword.normalize("NFD").replace(/[\u0300-\u036f]/g, "")];
    if (aliases) aliases.forEach((alias) => expanded.add(alias));
  }
  return [...expanded];
}

function passesSourceFilters(job, source = {}) {
  const text = cleanText([job.title, job.description, job.company_name, Array.isArray(job.tags) ? job.tags.join(" ") : ""].join(" ")).toLowerCase();
  const category = String(source.category_filter || source.parser_config?.category_filter || "").toLowerCase();
  const country = String(source.country_filter || source.parser_config?.country_filter || "").toLowerCase();
  if (category && !["job", "pune", "punë"].includes(category)) return false;
  if (country && !["gjermani", "germany", "deutschland"].includes(country)) return false;
  const enforceTextFilters = source.parser_config?.enforce_profession_filter === true || source.parser_config?.enforce_text_filters === true;
  const include = enforceTextFilters ? expandKeywords(splitKeywords(source.profession_filter || source.parser_config?.profession_filter)) : [];
  const exclude = enforceTextFilters ? expandKeywords(splitKeywords(source.excluded_keywords || source.parser_config?.excluded_keywords)) : [];
  const defaultExclude = [
    "senior", "lead", "head of", "director", "manager", "principal", "architect",
    "professor", "teacher", "research", "phd", "master degree", "university degree",
    "software engineer", "developer", "data scientist", "consultant",
    "werkstudent", "praktikant", "praktikum", "internship", "trainee",
    "power bi", "power apps", "office der geschäftsführung", "unternehmensberatung",
    "geschäftsführung", "consulting", "analyst", "ingenieur", "engineer",
    "sachbearbeiter", "buchhalter", "kreditoren", "kredit", "assistenz",
    "projektassistenz", "customer service", "kundenbetreuung", "sap",
    "finanz", "datenerfasser", "recruiter", "recruiting", "personalreferent",
    "öffentlichkeitsarbeit", "architektur", "stadtentwicklung", "referent",
    "controlling", "leiter", "produktmanagement", "office management",
    "nebenberuf"
  ];
  if (enforceTextFilters && include.length && !include.some((keyword) => text.includes(keyword))) return false;
  if (enforceTextFilters && [...defaultExclude, ...exclude].some((keyword) => text.includes(keyword))) return false;
  return true;
}

async function fetchArbeitnowJobs({ maxItems = 50, source = {} } = {}) {
  const endpoint = source.base_url || "https://www.arbeitnow.com/api/job-board-api";
  const rows = [];
  let nextUrl = endpoint;
  const maxPages = Math.max(1, Math.min(50, Number(source.parser_config?.max_pages || 5)));
  for (let page = 0; nextUrl && page < maxPages && rows.length < maxItems; page += 1) {
    const response = await fetch(nextUrl, {
      headers: { Accept: "application/json", "User-Agent": "AntoktonImportAssistant/1.0" }
    });
    if (!response.ok) throw new Error(`Arbeitnow returned ${response.status}`);
    const json = await response.json();
    const pageRows = Array.isArray(json.data) ? json.data : [];
    rows.push(...pageRows.filter((job) => passesSourceFilters(job, source)));
    nextUrl = json.links?.next || "";
  }
  const uniqueRows = [];
  const seen = new Set();
  for (const job of rows) {
    const key = job.url || job.slug || job.id || job.title;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    uniqueRows.push(job);
  }
  return uniqueRows.slice(0, maxItems).map((job) => {
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
