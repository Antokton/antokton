import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const { normalizeImportedItem } = require(path.join(root, "backend/importAssistant/normalizeImportedItem.js"));
const { isDuplicateImportedItem } = require(path.join(root, "backend/importAssistant/deduplicateImportedItem.js"));
const { scoreRelevance } = require(path.join(root, "backend/importAssistant/scoreRelevance.js"));
const { scoreRisk } = require(path.join(root, "backend/importAssistant/scoreRisk.js"));
const { scoreEthical } = require(path.join(root, "backend/importAssistant/scoreEthical.js"));
const { detectContactLanguage } = require(path.join(root, "backend/importAssistant/detectContactLanguage.js"));
const { generateAlbanianListingTitle } = require(path.join(root, "backend/importAssistant/generateAlbanianListingTitle.js"));
const { ensureDefaultSources, runImport, testImportSource } = require(path.join(root, "backend/importAssistant/importRunner.js"));
const { technicalDefaultsForSource } = require(path.join(root, "backend/importAssistant/seedSources.js"));
const { cleanupInvalidImportedPosts } = require(path.join(root, "backend/importAssistant/cleanupInvalidImports.js"));
const { buildExpiryFields, parseImportedExpiry, getAutomaticExpiryDays } = require(path.join(root, "backend/importAssistant/expiry.js"));
const { validateImportedItem } = require(path.join(root, "backend/importAssistant/validateImportedItem.js"));
const { translateImportedItem } = require(path.join(root, "backend/importAssistant/translateImportedItem.js"));
const arbeitnowProvider = require(path.join(root, "backend/importAssistant/providers/arbeitnowProvider.js"));
const customSourceProvider = require(path.join(root, "backend/importAssistant/providers/customSourceProvider.js"));
const genericRssProvider = require(path.join(root, "backend/importAssistant/providers/genericRssProvider.js"));
const { discoverSourceConfig } = require(path.join(root, "backend/importAssistant/discoverSourceConfig.js"));
const { handleImportAssistantRoute } = require(path.join(root, "backend/importAssistant/importRoutes.js"));
const { applyKnownSourceConfig } = require(path.join(root, "backend/importAssistant/sourceConfigRules.js"));

test("generateAlbanianListingTitle creates natural Albanian title", () => {
  assert.equal(generateAlbanianListingTitle({ original_title: "Truck Driver CE wanted" }), "Kërkohet shofer CE");
  assert.match(generateAlbanianListingTitle({ original_title: "Workers construction needed" }), /^Kërkohen /);
});

test("scoring detects relevance, risk and ethical issues", () => {
  const item = { original_title: "Shofer CE", original_description: "Kontratë e qartë, paga 2500 EUR, transport", original_company: "Demo GmbH", country: "Gjermani" };
  assert.equal(scoreRelevance(item).relevance_level, "high");
  assert.ok(scoreRisk({ original_description: "pay upfront then crypto profits" }).risk_score >= 45);
  assert.ok(scoreEthical({ original_description: "casino betting alcohol" }).ethical_score < 55);
});

test("contact language is hidden for verified Albanian source and shown for foreign", () => {
  assert.equal(detectContactLanguage({}, { is_albanian_source: true, source_identity_type: "company", source_identity_confidence: 80 }).contact_language_required, false);
  assert.deepEqual(detectContactLanguage({ original_description: "German language required" }, { is_albanian_source: false }).contact_languages, ["de"]);
});

test("normalization creates contact methods and pending review item", async () => {
  const item = await normalizeImportedItem({
    provider_key: "test",
    source_url: "https://example.com/job?utm_source=x",
    original_title: "Electrician",
    original_description: "Contact info@example.com or +49 177 8749318. English ok.",
    original_company: "Example GmbH",
    original_country: "Gjermani",
    original_city: "Berlin"
  }, { name: "Example", trust_level: "medium" });
  assert.equal(item.status, "pending_review");
  assert.equal(item.contact_methods.some((method) => method.type === "phone"), true);
  assert.equal(item.contact_methods.some((method) => method.type === "email"), true);
  assert.ok(item.final_score > 0);
});

test("import validation rejects corporate pages and placeholder URLs", () => {
  const base = {
    source_id: "source-1",
    source_name: "JobTeaser",
    original_title: "JobTeaser recruiters",
    original_description: "Corporate landing page for recruiters",
    original_company: "JobTeaser",
    original_location: "France",
    source_url: "https://www.jobteaser.com/en/corporate/recruiters",
    original_url: "https://www.jobteaser.com/en/corporate/recruiters"
  };
  assert.equal(validateImportedItem(base, {}, { id: "source-1", name: "JobTeaser", import_mode: "automatic" }).status, "rejected_non_job_page");
  assert.equal(validateImportedItem({ ...base, source_url: "https://facebook.com/...", original_url: "https://facebook.com/..." }, {}, { id: "source-1", name: "Facebook", import_mode: "automatic" }).status, "rejected_placeholder_url");
  const arbeitnowJob = validateImportedItem({
    ...base,
    source_name: "Arbeitnow",
    original_title: "Warehouse operative",
    original_description: "Clear warehouse role with picking, packing and stable contract. The description is long enough to explain the work and requirements.",
    original_company: "Demo GmbH",
    original_location: "Berlin, Germany",
    source_url: "https://www.arbeitnow.com/jobs/companies/demo-gmbh/warehouse-operative-berlin-123456",
    original_url: "https://www.arbeitnow.com/jobs/companies/demo-gmbh/warehouse-operative-berlin-123456",
    contact_methods: [{ type: "application_form", value: "https://www.arbeitnow.com/jobs/companies/demo-gmbh/warehouse-operative-berlin-123456" }]
  }, {}, { id: "source-1", name: "Arbeitnow", import_mode: "automatic" });
  assert.equal(arbeitnowJob.valid, true);
});

test("auto-discover source config turns a domain into a usable HTML jobs source", async () => {
  const originalFetch = global.fetch;
  global.fetch = async (url) => {
    const href = String(url);
    if (href === "https://example.test") {
      return {
        ok: true,
        status: 200,
        url: href,
        headers: { get: () => "text/html" },
        text: async () => `<html><body><nav><a href="/find-jobs">Find jobs</a></nav></body></html>`,
      };
    }
    if (href === "https://example.test/find-jobs") {
      return {
        ok: true,
        status: 200,
        url: href,
        headers: { get: () => "text/html" },
        text: async () => `<html><body>
          <article class="job-card"><a href="/jobs/cleaner-1">Cleaner wanted in Brussels</a><span class="company">Demo</span><span class="location">Brussels</span></article>
          <article class="job-card"><a href="/jobs/driver-2">Driver wanted in Berlin</a><span class="company">Demo</span><span class="location">Berlin</span></article>
        </body></html>`,
      };
    }
    return {
      ok: false,
      status: 404,
      url: href,
      headers: { get: () => "text/html" },
      text: async () => "not found",
    };
  };
  try {
    const result = await discoverSourceConfig({ url: "example.test", name: "Example" });
    assert.equal(result.success, true);
    assert.equal(result.source.jobs_url, "https://example.test/find-jobs");
    assert.equal(result.source.parser_type, "html");
    assert.equal(result.source.parser_config.item_selector, ".job-card");
    assert.match(result.source.parser_config.item_url_patterns, /job/);
  } finally {
    global.fetch = originalFetch;
  }
});

test("auto-discover uses known Academic Positions jobs URL without placeholders", async () => {
  const result = await discoverSourceConfig({ url: "https://academicpositions.com", name: "Academic Positions" });
  assert.equal(result.success, true);
  assert.equal(result.source.source_url, "https://academicpositions.com/find-jobs");
  assert.equal(result.source.base_url, "https://academicpositions.com");
  assert.equal(result.source.jobs_url, "https://academicpositions.com/find-jobs");
  assert.equal(result.source.rss_url, "");
  assert.equal(result.source.api_endpoint, "");
  assert.equal(result.source.category_url, "");
  assert.equal(result.source.login_required, false);
  assert.equal(result.source.original_source_required, true);
  assert.equal(result.source.enabled, true);
});

test("auto-discover rejects redirected 404 job URLs", async () => {
  const originalFetch = global.fetch;
  global.fetch = async (url) => {
    const href = String(url);
    if (href === "https://badjobs.test") {
      return {
        ok: true,
        status: 200,
        url: href,
        headers: { get: () => "text/html" },
        text: async () => `<html><body><a href="/jobs">Jobs</a></body></html>`,
      };
    }
    if (href === "https://badjobs.test/jobs") {
      return {
        ok: true,
        status: 200,
        url: "https://badjobs.test/404",
        headers: { get: () => "text/html" },
        text: async () => `<html><title>Page not found</title><body><a href="/jobs/driver">Driver job</a></body></html>`,
      };
    }
    return {
      ok: false,
      status: 404,
      url: href,
      headers: { get: () => "text/html" },
      text: async () => "not found",
    };
  };
  try {
    const result = await discoverSourceConfig({ url: "https://badjobs.test", name: "Bad Jobs" });
    assert.equal(result.success, false);
    assert.notEqual(result.source.jobs_url, "https://badjobs.test/404");
    assert.match(result.reason, /404|not found|Nuk u gjet/i);
    assert.equal(result.diagnostics.html.some((row) => row.finalUrl === "https://badjobs.test/404" && row.ok === false), true);
  } finally {
    global.fetch = originalFetch;
  }
});

test("auto-discover uses KosovaJob homepage instead of redirected 404", async () => {
  const result = await discoverSourceConfig({ url: "https://kosovajob.com", name: "KosovaJob" });
  assert.equal(result.success, true);
  assert.equal(result.source.source_url, "https://kosovajob.com/");
  assert.equal(result.source.jobs_url, "https://kosovajob.com/");
  assert.equal(result.source.base_url, "https://kosovajob.com");
  assert.equal(result.source.language, "sq");
  assert.equal(result.source.country_filter, "Kosovë");
  assert.equal(result.source.category_filter, "pune");
  assert.equal(result.source.rss_url, "");
  assert.equal(result.source.api_endpoint, "");
  assert.match(result.source.profession_filter, /vende pune/);
});

test("auto-discover configures Bundesagentur as API source", async () => {
  const result = await discoverSourceConfig({ url: "https://www.arbeitsagentur.de", name: "Bundesagentur für Arbeit" });
  assert.equal(result.success, true);
  assert.equal(result.source.provider_key, "custom");
  assert.equal(result.source.source_type, "api");
  assert.equal(result.source.parser_type, "api");
  assert.equal(result.source.api_endpoint, "https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/jobs");
  assert.equal(result.source.parser_config.api_format, "bundesagentur");
  assert.equal(result.source.parser_config.api_key, "jobboerse-jobsuche");
});

test("known source config preserves disabled state", () => {
  for (const source of [
    { name: "Academic Positions", source_url: "https://academicpositions.com", enabled: false, is_active: false },
    { name: "Bundesagentur für Arbeit", source_url: "https://www.arbeitsagentur.de", enabled: false, is_active: false },
    { name: "KosovaJob", source_url: "https://kosovajob.com", enabled: false, is_active: false },
  ]) {
    const normalized = applyKnownSourceConfig(source);
    assert.equal(normalized.enabled, false, `${source.name} should stay disabled`);
    assert.equal(normalized.is_active, false, `${source.name} should stay inactive`);
  }
});

test("import validation requires real title, URL, source and quality fields", () => {
  const source = { id: "source-1", name: "Arbeitnow", import_mode: "automatic" };
  const invalid = validateImportedItem({
    source_id: "source-1",
    source_name: "Arbeitnow",
    original_title: "Kërkohet punonjës",
    original_url: "https://example.test/job/1",
    source_url: "https://example.test/job/1"
  }, {}, source);
  assert.equal(invalid.status, "rejected_missing_title");

  const valid = validateImportedItem({
    source_id: "source-1",
    source_name: "Arbeitnow",
    original_title: "Warehouse operative",
    original_description: "Clear warehouse role with picking, packing and stable contract. The description is long enough to explain the work and requirements.",
    original_company: "Demo GmbH",
    original_location: "Berlin, Germany",
    original_url: "https://example.test/job/2",
    source_url: "https://example.test/job/2",
    contact_methods: [{ type: "application_form", value: "https://example.test/job/2/apply" }]
  }, {}, source);
  assert.equal(valid.valid, true);

  const pendingQuality = validateImportedItem({
    source_id: "source-1",
    source_name: "Arbeitnow",
    original_title: "Cleaner",
    original_company: "Clean Demo",
    original_location: "Brussels, Belgium",
    original_url: "https://example.test/job/3",
    source_url: "https://example.test/job/3"
  }, {}, source);
  assert.equal(pendingQuality.valid, true);
  assert.ok(pendingQuality.quality_score >= 50);
});

test("import validation reports detail page failure reasons", () => {
  const validation = validateImportedItem({
    source_id: "source-1",
    source_name: "Academic Positions",
    original_title: "Research position",
    original_url: "https://academicpositions.com/job/demo",
    source_url: "https://academicpositions.com/job/demo"
  }, {
    _requires_detail_page: true,
    _detail_page_loaded: false,
    _detail_page_status: 403,
    _detail_page_reason: "Faqja e detajit ktheu HTTP 403."
  }, { id: "source-1", name: "Academic Positions", import_mode: "automatic" });
  assert.equal(validation.valid, false);
  assert.equal(validation.status, "rejected_low_quality_import");
  assert.match(validation.reason, /403/);
});

test("normalization preserves full imported address separately from country", async () => {
  const item = await normalizeImportedItem({
    provider_key: "test",
    source_url: "https://example.com/job-address",
    original_title: "Warehouse worker",
    original_description: "Clear contract. Contact info@example.com.",
    original_company: "Example GmbH",
    original_location: "Alexanderplatz 1, Berlin, Gjermani",
    original_country: "Gjermani",
    original_city: "Berlin"
  }, { name: "Example", trust_level: "medium" });
  assert.equal(item.address, "Alexanderplatz 1, Berlin, Gjermani");
  assert.equal(item.country, "Gjermani");
  assert.equal(item.city, "Berlin");
});

test("import expiry uses original deadline or automatic category defaults", () => {
  const original = parseImportedExpiry({
    original_description: "Afati i aplikimit: 25.07.2026"
  });
  assert.match(original, /^2026-07-25/);

  const jobExpiry = buildExpiryFields({ category: "pune" }, { now: new Date("2026-06-20T00:00:00Z") });
  assert.match(jobExpiry.expires_at, /^2026-07-20/);
  assert.equal(jobExpiry.expiry_source, "automatic");
  assert.equal(getAutomaticExpiryDays({ category: "pazar", pazar_category: "makina", listing_type: "shitje" }), 45);
});

test("deduplication catches source URL and similar title", () => {
  const item = { provider_key: "x", external_id: "1", source_url: "https://example.com/a?utm_source=x", original_title: "Shofer CE", city: "Berlin", country: "Gjermani" };
  assert.equal(isDuplicateImportedItem(item, [{ provider_key: "x", external_id: "1" }], []).duplicate, true);
  assert.equal(isDuplicateImportedItem(item, [{ source_url: "https://example.com/a" }], []).duplicate, true);
  assert.equal(isDuplicateImportedItem({ source_id: "source-1", original_id: "abc" }, [{ source_id: "source-1", original_id: "abc" }], []).reason, "source_id + original_id");
});

test("default sources seed editable working public providers", async () => {
  const created = [];
  const store = {
    async allRecords(entity) {
      assert.equal(entity, "ImportedSource");
      return [];
    },
    async createRecord(entity, data) {
      const row = { id: `${entity}-${created.length + 1}`, ...data };
      created.push({ entity, data: row });
      return row;
    },
    async updateRecord() {}
  };
  const sources = await ensureDefaultSources(store);
  assert.equal(sources.some((source) => source.seed_key === "arbeitnow-public-api"), true);
  assert.equal(sources.some((source) => source.seed_key === "weworkremotely-rss"), true);
  assert.equal(sources.some((source) => source.seed_key === "punajuaj-html"), true);
  assert.equal(created.every((row) => row.data.is_editable_by_admin === true), true);
});

test("import source classifier maps real sources to their technical function", () => {
  assert.deepEqual(
    {
      source_type: technicalDefaultsForSource({ name: "EURES", source_url: "https://eures.europa.eu" }).source_type,
      provider_key: technicalDefaultsForSource({ name: "EURES", source_url: "https://eures.europa.eu" }).provider_key,
      import_mode: technicalDefaultsForSource({ name: "EURES", source_url: "https://eures.europa.eu" }).import_mode,
    },
    { source_type: "api", provider_key: "eures", import_mode: "automatic" }
  );
  assert.equal(technicalDefaultsForSource({ name: "We Work Remotely RSS", source_url: "https://weworkremotely.com/remote-jobs.rss" }).source_type, "rss");
  assert.equal(technicalDefaultsForSource({ name: "MerrJep.al Punë", source_url: "https://www.merrjep.al/njoftime/pune" }).source_type, "html");
  assert.equal(technicalDefaultsForSource({ name: "Facebook Groups", source_url: "https://facebook.com/groups/demo" }).import_mode, "manual");
  assert.equal(technicalDefaultsForSource({ name: "WhatsApp Communities" }).source_type, "whatsapp");
});

test("RSS provider reads RSS and Atom feeds", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    async text() {
      return `<feed><entry><id>1</id><title>Warehouse operative</title><link href="https://example.test/atom-job"/><summary>Job summary</summary><updated>2026-06-20</updated></entry></feed>`;
    }
  });
  try {
    const rows = await genericRssProvider.fetchItems({ source: { source_url: "https://example.test/feed", name: "Atom" }, maxItems: 10 });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].source_url, "https://example.test/atom-job");
    assert.equal(rows[0].original_title, "Warehouse operative");
  } finally {
    global.fetch = originalFetch;
  }
});

test("custom provider imports public HTML listing links", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    async text() {
      return `<html><body><a href="/jobs/cleaner-1">Kërkohet pastruese në Bruksel</a><a href="/about">Rreth nesh</a></body></html>`;
    }
  });
  try {
    const rows = await customSourceProvider.fetchItems({
      source: {
        name: "Demo HTML",
        parser_type: "html",
        source_url: "https://example.test",
        category_filter: "pune",
        country_filter: "Belgjikë",
        parser_config: { item_url_patterns: "jobs" }
      },
      maxItems: 10
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].source_url, "https://example.test/jobs/cleaner-1");
  } finally {
    global.fetch = originalFetch;
  }
});

test("custom provider extracts KosovaJob card fields", async () => {
  const originalFetch = global.fetch;
  global.fetch = async (url) => ({
    ok: true,
    status: 200,
    url: String(url),
    async text() {
      if (String(url).includes("/kosovajob-llc/")) {
        return `<html><body><main><h1>Administrator/e i/e Zyrës</h1><p>Aplikim online.</p></main></body></html>`;
      }
      return `<html><body>
        <div class="jobListCnts">
          <a href="https://kosovajob.com/kosovajob-llc/administratore-ie-zyres">
            <div class="jobListCntsInner">
              <div class="jobListTitle" date="2026-06-30 23:55:00">Administrator/e i/e Zyrës</div>
              <div class="jobListCity">Prishtinë</div>
            </div>
          </a>
        </div>
        <a href="https://kosovajob.com/404">404</a>
      </body></html>`;
    }
  });
  try {
    const source = applyKnownSourceConfig({ name: "KosovaJob", source_url: "https://kosovajob.com" });
    const rows = await customSourceProvider.fetchItems({ source, maxItems: 5 });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].source_url, "https://kosovajob.com/kosovajob-llc/administratore-ie-zyres");
    assert.equal(rows[0].original_title, "Administrator/e i/e Zyrës");
    assert.equal(rows[0].original_company, "Kosovajob Llc");
    assert.equal(rows[0].original_location, "Prishtinë");
    assert.equal(rows[0].original_city, "Prishtinë");
    assert.equal(rows[0].published_at, "2026-06-30 23:55:00");
    assert.equal(rows[0].original_id, rows[0].source_url);
  } finally {
    global.fetch = originalFetch;
  }
});

test("custom provider auto-infers parser config for HTML sources", async () => {
  const originalFetch = global.fetch;
  global.fetch = async (url) => ({
    ok: true,
    status: 200,
    url: String(url),
    async text() {
      return `<html><body>
        <article class="result-card"><a href="/careers/driver-1">Driver wanted in Hamburg</a></article>
        <article class="result-card"><a href="/careers/cleaner-2">Cleaner wanted in Brussels</a></article>
      </body></html>`;
    }
  });
  try {
    const rows = await customSourceProvider.fetchItems({
      source: {
        name: "No Config HTML",
        parser_type: "html",
        source_url: "https://example.test/careers",
        category_filter: "pune"
      },
      maxItems: 10
    });
    assert.equal(rows.length, 2);
    assert.equal(rows[0].source_url, "https://example.test/careers/driver-1");
  } finally {
    global.fetch = originalFetch;
  }
});

test("custom provider imports Bundesagentur API jobs", async () => {
  const originalFetch = global.fetch;
  let requestedUrl = "";
  let apiKey = "";
  global.fetch = async (url, options = {}) => {
    requestedUrl = String(url);
    apiKey = options.headers?.["X-API-Key"] || "";
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          stellenangebote: [{
            titel: "Fahrer (m/w/d)",
            beruf: "Fahrer/in",
            refnr: "REF-1",
            arbeitgeber: "Demo GmbH",
            arbeitsort: { ort: "Berlin", region: "Berlin", land: "Deutschland" },
            aktuelleVeroeffentlichungsdatum: "2026-06-23"
          }]
        };
      }
    };
  };
  try {
    const source = applyKnownSourceConfig({ name: "Bundesagentur für Arbeit", source_url: "https://www.arbeitsagentur.de" });
    const rows = await customSourceProvider.fetchItems({ source, maxItems: 5 });
    assert.equal(apiKey, "jobboerse-jobsuche");
    assert.match(requestedUrl, /was=fahrer/);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].original_title, "Fahrer (m/w/d)");
    assert.equal(rows[0].source_url, "https://www.arbeitsagentur.de/jobsuche/jobdetail/REF-1");
    assert.equal(rows[0].original_company, "Demo GmbH");
  } finally {
    global.fetch = originalFetch;
  }
});

test("runImport stores corporate JobTeaser page as import failure instead of post", async () => {
  const records = {
    ImportedSource: [{
      id: "jobteaser-bad",
      name: "JobTeaser Recruiters",
      provider_key: "custom",
      source_type: "html",
      import_mode: "automatic",
      crawl_method: "html",
      parser_type: "html",
      enabled: true,
      is_active: true,
      source_url: "https://www.jobteaser.com/en/corporate/recruiters",
      category_filter: "pune",
      parser_config: { item_url_patterns: "jobs" }
    }],
    ImportAssistantSettings: [{ id: "settings", auto_import_enabled: true, max_items_per_run: 5, min_new_items_per_run: 1 }],
    ImportedPost: [],
    Job: [],
    ImportLog: [],
    ImportFailure: []
  };
  const store = {
    async allRecords(entity) { return records[entity] || []; },
    async createRecord(entity, data) {
      const row = { id: `${entity}-${(records[entity] || []).length + 1}`, created_date: new Date().toISOString(), ...data };
      records[entity] = records[entity] || [];
      records[entity].push(row);
      return row;
    },
    async updateRecord(entity, id, patch) {
      const row = records[entity].find((item) => item.id === id);
      Object.assign(row, patch);
      return row;
    },
    async deleteRecord() { return true; }
  };

  const result = await runImport({
    store,
    config: { IMPORT_ASSISTANT_MIN_NEW_PER_RUN: 1 },
    sourceId: "jobteaser-bad",
    requestedBy: "test",
    options: { strict_source: true, manual_run: true, min_new_items_per_run: 1, min_relevance_score: 0, max_risk_score: 100 }
  });

  assert.equal(result.created_count, 0);
  assert.equal(result.rejected_count, 1);
  assert.equal(records.ImportedPost.length, 0);
  assert.equal(records.ImportFailure[0].status, "rejected_non_job_page");
  assert.equal(records.ImportLog[0].status, "imported_zero_valid_items");
  assert.equal(result.rejection_samples.length, 1);
  assert.match(result.rejection_samples[0].reason, /corporate|marketing/i);
});

test("source test is a dry run and does not create imported posts or failures", async () => {
  const records = {
    ImportedSource: [{
      id: "html-source",
      name: "Demo Jobs",
      provider_key: "custom",
      source_type: "html",
      import_mode: "automatic",
      crawl_method: "html",
      parser_type: "html",
      enabled: true,
      source_url: "https://example.test/jobs",
      category_filter: "pune",
      parser_config: { item_url_patterns: "jobs" }
    }],
    ImportAssistantSettings: [],
    ImportedPost: [],
    Job: [],
    ImportLog: [],
    ImportFailure: []
  };
  const store = {
    async allRecords(entity) { return records[entity] || []; },
    async createRecord(entity, data) {
      const row = { id: `${entity}-${records[entity].length + 1}`, created_date: new Date().toISOString(), ...data };
      records[entity].push(row);
      return row;
    },
    async updateRecord(entity, id, patch) {
      const row = records[entity].find((item) => item.id === id);
      Object.assign(row, patch);
      return row;
    },
    async deleteRecord() { return true; }
  };
  const originalFetch = global.fetch;
  global.fetch = async (url) => {
    if (String(url).endsWith("/jobs")) {
      return { ok: true, async text() { return `<a href="/jobs/cleaner-1">Cleaner job in Brussels</a>`; } };
    }
    return { ok: true, async text() { return `<html><body><h1>Cleaner job in Brussels</h1><main>Cleaning job with a real employer, clear schedule, Brussels location, application link and contact details for candidates. This description is intentionally long enough to pass validation.</main></body></html>`; } };
  };
  try {
    const result = await testImportSource({ store, config: {}, sourceId: "html-source", requestedBy: "test" });
    assert.equal(result.dry_run, true);
    assert.equal(result.fetched_count, 1);
    assert.equal(result.valid_count, 1);
    assert.equal(records.ImportedPost.length, 0);
    assert.equal(records.ImportFailure.length, 0);
    assert.equal(records.ImportedSource.length, 1);
    assert.equal(records.ImportLog.length, 0);
  } finally {
    global.fetch = originalFetch;
  }
});

test("source test route is read-only and does not create sources when zero results", async () => {
  const records = {
    ImportedSource: [{
      id: "html-zero",
      name: "Zero Jobs",
      provider_key: "custom",
      source_type: "html",
      import_mode: "automatic",
      crawl_method: "html",
      parser_type: "html",
      enabled: true,
      source_url: "https://example.test/jobs",
      jobs_url: "https://example.test/jobs",
      category_filter: "pune",
      parser_config: { item_url_patterns: "jobs", json_ld_jobs: true }
    }],
    ImportAssistantSettings: [],
    ImportedPost: [],
    Job: [],
    ImportLog: [],
    ImportFailure: []
  };
  let readPayloadCalls = 0;
  const store = {
    async allRecords(entity) { return records[entity] || []; },
    async createRecord(entity, data) {
      const row = { id: `${entity}-${records[entity].length + 1}`, created_date: new Date().toISOString(), ...data };
      records[entity].push(row);
      return row;
    },
    async updateRecord(entity, id, patch) {
      const row = records[entity].find((item) => item.id === id);
      if (row) Object.assign(row, patch);
      return row;
    },
    async deleteRecord() { return true; }
  };
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    status: 200,
    url: "https://example.test/jobs",
    async text() { return "<html><body><main>No job links here</main></body></html>"; }
  });
  try {
    const beforeSources = records.ImportedSource.length;
    const beforeLogs = records.ImportLog.length;
    const result = await handleImportAssistantRoute({
      req: { method: "POST" },
      res: {},
      segments: ["api", "import-assistant", "v1", "sources", "html-zero", "test"],
      send: (_res, status, body) => ({ status, body }),
      sendError: (_res, status, message) => ({ status, body: { error: message } }),
      readPayload: async () => { readPayloadCalls += 1; return {}; },
      requesterHasRole: async () => true,
      getRequestUserEmail: async () => "admin@test",
      store,
      config: {}
    });
    assert.equal(result.status, 200);
    assert.equal(result.body.dry_run, true);
    assert.equal(result.body.fetched_count, 0);
    assert.equal(records.ImportedSource.length, beforeSources);
    assert.equal(records.ImportLog.length, beforeLogs);
    assert.equal(records.ImportedPost.length, 0);
    assert.equal(records.ImportFailure.length, 0);
    assert.equal(readPayloadCalls, 0);
  } finally {
    global.fetch = originalFetch;
  }
});

test("source status toggle bypasses automatic configuration validation", async () => {
  const records = {
    ImportedSource: [{
      id: "broken-auto-source",
      name: "Broken Auto Source",
      provider_key: "custom",
      source_type: "html",
      import_mode: "automatic",
      crawl_method: "html",
      parser_type: "html",
      automation_level: "full_auto",
      enabled: true,
      is_active: true,
      source_url: "",
      base_url: "",
      jobs_url: "",
      crawl_frequency_minutes: 360,
    }],
    ImportAssistantSettings: [],
    ImportedPost: [],
    Job: [],
    ImportLog: [],
    ImportFailure: []
  };
  const store = {
    async allRecords(entity) { return records[entity] || []; },
    async createRecord(entity, data) {
      const row = { id: `${entity}-${records[entity].length + 1}`, created_date: new Date().toISOString(), ...data };
      records[entity].push(row);
      return row;
    },
    async updateRecord(entity, id, patch) {
      const row = records[entity].find((item) => item.id === id);
      if (row) Object.assign(row, patch);
      return row;
    },
    async deleteRecord() { return true; }
  };
  const result = await handleImportAssistantRoute({
    req: { method: "PUT" },
    res: {},
    segments: ["api", "import-assistant", "v1", "sources", "broken-auto-source"],
    send: (_res, status, body) => ({ status, body }),
    sendError: (_res, status, message) => ({ status, body: { error: message } }),
    readPayload: async () => ({ enabled: false, is_active: false }),
    requesterHasRole: async () => true,
    getRequestUserEmail: async () => "admin@test",
    store,
    config: {}
  });
  assert.equal(result.status, 200);
  assert.equal(records.ImportedSource[0].enabled, false);
  assert.equal(records.ImportedSource[0].is_active, false);
});

test("validator rejects listing URLs and broken mojibake text", () => {
  const source = { id: "src", name: "MerrJep.al Punë", import_mode: "automatic" };
  const listing = validateImportedItem({
    source_id: "src",
    source_name: "MerrJep.al Punë",
    original_title: "Kërkohet pastruese për shtëpi",
    original_url: "https://merrjep.al/njoftime/biznes-pune/pune?Private=True",
    source_url: "https://merrjep.al/njoftime/biznes-pune/pune?Private=True",
    original_description: "Kërkohet pastruese për shtëpi me orar dhe lokacion të qartë. Kontaktoni për aplikim.",
    original_company: "Demo",
    original_location: "Tiranë"
  }, {}, source);
  assert.equal(listing.valid, false);
  assert.equal(listing.status, "rejected_low_quality_import");

  const mojibake = validateImportedItem({
    source_id: "src",
    source_name: "Remote OK",
    original_title: "KÃ«rkohet punonjÃ«s ÃÂÐ",
    original_url: "https://example.test/jobs/1",
    source_url: "https://example.test/jobs/1",
    original_description: "KÃ«rkohet punonjÃ«s me pÃ«rvojÃ« dhe kontratÃ«. Ky tekst është i prishur dhe nuk duhet të publikohet.",
    original_company: "Demo",
    original_location: "Remote"
  }, {}, { id: "src", name: "Remote OK", import_mode: "automatic" });
  assert.equal(mojibake.valid, false);
  assert.equal(mojibake.status, "rejected_bad_encoding");
});

test("validator rejects script/template text and employer branding pages", () => {
  const source = { id: "src", name: "Academic Positions", import_mode: "automatic" };
  const scriptJunk = validateImportedItem({
    source_id: "src",
    source_name: "Academic Positions",
    original_title: "Employer Branding",
    original_url: "https://recruit.academicpositions.com/employer-branding",
    source_url: "https://recruit.academicpositions.com/employer-branding",
    original_description: "Company: Employer Branding // Define dataLayer and the gtag function. window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);}",
    contact_methods: [{ type: "application_form", value: "{\"type\":\"application_form\",\"value\":\"https://recruit.academicpositions.com/employer-branding\"}" }]
  }, {}, source);
  assert.equal(scriptJunk.valid, false);
  assert.match(scriptJunk.reason, /script\/template|corporate\/marketing/i);

  const corporatePage = validateImportedItem({
    source_id: "src",
    source_name: "Academic Positions",
    original_title: "Employer Branding",
    original_url: "https://recruit.academicpositions.com/employer-branding",
    source_url: "https://recruit.academicpositions.com/employer-branding",
    original_description: "A marketing page for employers and recruitment branding services.",
    original_company: "Academic Positions",
    original_location: "Europe"
  }, {}, source);
  assert.equal(corporatePage.valid, false);
  assert.equal(corporatePage.status, "rejected_non_job_page");
});

test("translation placeholder keeps generated summary Albanian for foreign imports", async () => {
  const translated = await translateImportedItem({
    item_type: "job",
    category: "pune",
    profession: "shofer",
    country: "Gjermani",
    original_company: "Demo GmbH",
    original_description: "We are looking for a truck driver with immediate start and an English job description that should not be copied as the Albanian display text."
  });
  assert.match(translated.shqip_summary, /Kërkohet shofer në Gjermani/);
  assert.doesNotMatch(translated.shqip_summary, /We are looking/i);
});

test("cleanup archives invalid imported posts without deleting them", async () => {
  const records = {
    ImportedPost: [{
      id: "bad-1",
      title: "Kërkohet punonjës",
      source_id: "src",
      source_name: "MerrJep.al Punë",
      source_url: "https://merrjep.al/njoftime/biznes-pune/pune?Private=True",
      original_url: "https://merrjep.al/njoftime/biznes-pune/pune?Private=True",
      original_text: "Detajet e plota verifikohen nga burimi origjinal para publikimit.",
      status: "pending_review"
    }]
  };
  const store = {
    async allRecords(entity) { return records[entity] || []; },
    async updateRecord(entity, id, patch) {
      const row = records[entity].find((item) => item.id === id);
      Object.assign(row, patch);
      return row;
    }
  };

  const dryRun = await cleanupInvalidImportedPosts({ store, dryRun: true });
  assert.equal(dryRun.invalid_count, 1);
  assert.equal(records.ImportedPost[0].status, "pending_review");

  const result = await cleanupInvalidImportedPosts({ store, dryRun: false, requestedBy: "admin@test" });
  assert.equal(result.invalid_count, 1);
  assert.equal(records.ImportedPost.length, 1);
  assert.equal(records.ImportedPost[0].status, "archived_invalid_import");
  assert.equal(records.ImportedPost[0].invalid_import_status, "rejected_low_quality_import");
});

test("custom provider imports Remote OK API without blocking by profession filter", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    async json() {
      return [
        { legal: "ok" },
        { id: 1, position: "Customer Support", company: "Demo", url: "https://remoteok.com/remote-jobs/1", apply_url: "https://demo.test/apply" },
        { id: 2, position: "Senior Software Engineer", company: "Demo", url: "https://remoteok.com/remote-jobs/2" }
      ];
    }
  });
  try {
    const rows = await customSourceProvider.fetchItems({
      source: {
        name: "Remote OK",
        parser_type: "api",
        source_url: "https://remoteok.com/api",
        profession_filter: "warehouse",
        parser_config: { api_format: "remoteok" }
      },
      maxItems: 10
    });
    assert.equal(rows.length, 2);
  } finally {
    global.fetch = originalFetch;
  }
});

test("manual run works when auto import settings are disabled", async () => {
  const records = { ImportedSource: [], ImportAssistantSettings: [], ImportedPost: [], Job: [], ImportLog: [], ImportFailure: [] };
  const store = {
    async allRecords(entity) { return records[entity] || []; },
    async createRecord(entity, data) {
      const row = { id: `${entity}-${records[entity].length + 1}`, created_date: new Date().toISOString(), ...data };
      records[entity].push(row);
      return row;
    },
    async updateRecord(entity, id, patch) {
      const row = records[entity].find((item) => item.id === id);
      Object.assign(row, patch);
      return row;
    },
    async deleteRecord() { return true; }
  };
  records.ImportAssistantSettings.push({ id: "settings", auto_import_enabled: false, max_items_per_run: 1 });
  const result = await runImport({ store, config: { IMPORT_ASSISTANT_MAX_PER_RUN: 1 }, maxItems: 0, requestedBy: "test" });
  assert.equal(result.success, true);
});

test("import fallback continues after duplicate-only first source", async () => {
  const records = {
    ImportedSource: [{
      id: "source-1",
      name: "Arbeitnow",
      provider_key: "arbeitnow",
      source_type: "api",
      import_mode: "automatic",
      crawl_method: "api",
      automation_level: "full_auto",
      enabled: true,
      source_url: "https://example.test/jobs",
      country_filter: "Germany",
      category_filter: "pune",
      profession_filter: "driver",
      parser_config: { max_pages: 1 }
    }],
    ImportAssistantSettings: [{ id: "settings", auto_import_enabled: true, max_items_per_run: 10, min_new_items_per_run: 1 }],
    ImportedPost: [{ id: "existing", source_url: "https://example.test/jobs/duplicate", original_url: "https://example.test/jobs/duplicate" }],
    Job: [],
    ImportLog: [], ImportFailure: []
  };
  const store = {
    async allRecords(entity) { return records[entity] || []; },
    async createRecord(entity, data) {
      const row = { id: `${entity}-${records[entity].length + 1}`, created_date: new Date().toISOString(), ...data };
      records[entity].push(row);
      return row;
    },
    async updateRecord(entity, id, patch) {
      const row = records[entity].find((item) => item.id === id);
      Object.assign(row, patch);
      return row;
    },
    async deleteRecord() { return true; }
  };
  let fetchCount = 0;
  const originalFetch = global.fetch;
  global.fetch = async () => {
    fetchCount += 1;
    const duplicate = fetchCount === 1;
    return {
      ok: true,
      async json() {
        return {
          data: [{
            title: duplicate ? "Truck Driver CE" : "Warehouse Worker",
            description: "Clear contract and contact test@example.com.",
            company_name: "Demo GmbH",
            location: "Berlin, Germany",
            slug: duplicate ? "duplicate" : "new-warehouse",
            url: duplicate ? "https://example.test/jobs/duplicate" : "https://example.test/jobs/new-warehouse",
            created_at: 1760000000
          }],
          links: {}
        };
      }
    };
  };
  try {
    const result = await runImport({
      store,
      config: { IMPORT_ASSISTANT_MAX_PER_RUN: 10, IMPORT_ASSISTANT_MIN_NEW_PER_RUN: 1 },
      requestedBy: "test",
      options: { manual_run: true, min_new_items_per_run: 1, min_relevance_score: 0, max_risk_score: 100 }
    });
    assert.equal(result.created_count, 1);
    assert.equal(result.duplicate_count, 1);
    assert.ok(fetchCount >= 1);
    assert.equal(records.ImportedPost.some((item) => item.status === "pending_review" && item.source_url === "https://example.test/jobs/new-warehouse"), true);
    assert.ok(result.fallback_summary.providers_tried.includes("arbeitnow"));
  } finally {
    global.fetch = originalFetch;
  }
});

test("all active source selection runs enabled automatic sources", async () => {
  const records = {
    ImportedSource: [{
      id: "arbeitnow-source",
      name: "Arbeitnow",
      provider_key: "arbeitnow",
      source_type: "api",
      import_mode: "automatic",
      crawl_method: "api",
      enabled: true,
      source_url: "https://example.test/jobs",
      category_filter: "pune",
      country_filter: "Germany",
      profession_filter: "cleaner"
    }],
    ImportAssistantSettings: [{ id: "settings", auto_import_enabled: true, max_items_per_run: 10, min_new_items_per_run: 1 }],
    ImportedPost: [],
    Job: [],
    ImportLog: [],
    ImportFailure: []
  };
  const store = {
    async allRecords(entity) { return records[entity] || []; },
    async createRecord(entity, data) {
      const row = { id: `${entity}-${records[entity].length + 1}`, created_date: new Date().toISOString(), ...data };
      records[entity].push(row);
      return row;
    },
    async updateRecord(entity, id, patch) {
      const row = records[entity].find((item) => item.id === id);
      Object.assign(row, patch);
      return row;
    },
    async deleteRecord() { return true; }
  };
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    async json() {
      return {
        data: [{
          title: "Cleaner",
          description: "Cleaning role",
          company_name: "Clean Demo",
          location: "Brussels, Belgium",
          slug: "cleaner-brussels",
          url: "https://example.test/jobs/cleaner-brussels",
          created_at: 1760000000
        }],
        links: {}
      };
    }
  });
  try {
    const result = await runImport({
      store,
      config: { IMPORT_ASSISTANT_MIN_NEW_PER_RUN: 1 },
      sourceId: "all",
      requestedBy: "test",
      options: { manual_run: true, min_new_items_per_run: 1, min_relevance_score: 0, max_risk_score: 100 }
    });
    assert.equal(result.created_count, 1);
    assert.equal(result.fallback_summary.providers_tried.includes("arbeitnow"), true);
    assert.equal(records.ImportedPost[0].status, "pending_review");
  } finally {
    global.fetch = originalFetch;
  }
});

test("manual import uses public seed fallback when stored runnable sources are unavailable", async () => {
  const records = {
    ImportedSource: [{
      id: "stale-arbeitnow",
      seed_key: "arbeitnow-public-api",
      name: "Arbeitnow",
      provider_key: "arbeitnow",
      source_type: "api",
      import_mode: "automatic",
      crawl_method: "api",
      enabled: false,
      is_active: false,
      source_url: "https://www.arbeitnow.com/api/job-board-api",
      base_url: "https://www.arbeitnow.com/api/job-board-api",
      category_filter: "pune",
      country_filter: "Germany"
    }],
    ImportAssistantSettings: [{ id: "settings", auto_import_enabled: true, max_items_per_run: 5, min_new_items_per_run: 1 }],
    ImportedPost: [],
    Job: [],
    ImportLog: [],
    ImportFailure: []
  };
  const store = {
    async allRecords(entity) { return records[entity] || []; },
    async createRecord(entity, data) {
      const row = { id: `${entity}-${records[entity].length + 1}`, created_date: new Date().toISOString(), ...data };
      records[entity].push(row);
      return row;
    },
    async updateRecord(entity, id, patch) {
      const row = records[entity].find((item) => item.id === id);
      Object.assign(row, patch);
      return row;
    },
    async deleteRecord() { return true; }
  };
  const originalFetch = global.fetch;
  global.fetch = async (url) => {
    if (String(url).includes("arbeitnow")) {
      return {
        ok: true,
        async json() {
          return {
            data: [{
              title: "Warehouse Worker",
              description: "Clear warehouse role with stable contract and direct application details for the candidate.",
              company_name: "Demo GmbH",
              location: "Berlin, Germany",
              slug: "warehouse-worker-berlin",
              url: "https://www.arbeitnow.com/jobs/companies/demo-gmbh/warehouse-worker-berlin-123456",
              created_at: 1760000000
            }],
            links: {}
          };
        }
      };
    }
    return { ok: true, async text() { return "<rss></rss>"; }, async json() { return []; } };
  };
  try {
    const result = await runImport({
      store,
      config: {},
      requestedBy: "test",
      options: { manual_run: true, min_new_items_per_run: 1, min_relevance_score: 0, max_risk_score: 100 }
    });
    assert.equal(result.created_count, 1);
    assert.equal(result.fallback_summary.providers_tried.includes("arbeitnow"), true);
    assert.notEqual(result.status, "no_runnable_sources");
  } finally {
    global.fetch = originalFetch;
  }
});

test("import run logs unconfigured API providers as skipped and continues to next source", async () => {
  const records = { ImportedSource: [], ImportAssistantSettings: [], ImportedPost: [], Job: [], ImportLog: [], ImportFailure: [] };
  const store = {
    async allRecords(entity) { return records[entity] || []; },
    async createRecord(entity, data) {
      const row = { id: `${entity}-${records[entity].length + 1}`, created_date: new Date().toISOString(), ...data };
      records[entity].push(row);
      return row;
    },
    async updateRecord(entity, id, patch) {
      const row = records[entity].find((item) => item.id === id);
      Object.assign(row, patch);
      return row;
    },
    async deleteRecord() { return true; }
  };
  records.ImportedSource.push(
    {
      id: "adzuna-source",
      name: "Adzuna",
      provider_key: "adzuna",
      source_type: "API",
      crawl_method: "api",
      import_mode: "automatic",
      is_active: true,
      enabled: true,
      crawl_frequency_minutes: 360,
      category_filter: "pune"
    },
    {
      id: "arbeitnow-source",
      name: "Arbeitnow",
      provider_key: "arbeitnow",
      source_type: "API",
      crawl_method: "api",
      import_mode: "automatic",
      is_active: true,
      enabled: true,
      crawl_frequency_minutes: 360,
      category_filter: "pune",
      country_filter: "Germany",
      profession_filter: "warehouse"
    }
  );
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    async json() {
      return {
        data: [{
          title: "Warehouse operative",
          description: "Warehouse logistics job with picking, packing, loading goods, stable contract, clear employer details, published location and application information for candidates.",
          company_name: "Demo Logistics",
          location: "Berlin, Germany",
          slug: "warehouse-operative",
          url: "https://example.test/jobs/warehouse-operative",
          created_at: 1760000000
        }],
        links: {}
      };
    }
  });
  try {
    const result = await runImport({
      store,
      config: { IMPORT_ASSISTANT_MIN_NEW_PER_RUN: 1 },
      requestedBy: "test",
      options: { manual_run: true, min_new_items_per_run: 1, min_relevance_score: 0, max_risk_score: 100 }
    });
    assert.equal(result.created_count, 1);
    assert.equal(result.skipped_count, 1);
    assert.equal(records.ImportLog.some((log) => log.provider_key === "adzuna" && log.status === "skipped"), true);
    assert.equal(records.ImportedPost.some((item) => item.status === "pending_review" && item.source_url === "https://example.test/jobs/warehouse-operative"), true);
  } finally {
    global.fetch = originalFetch;
  }
});

test("selected import source is treated as starting point and falls back to other active sources", async () => {
  const records = {
    ImportedSource: [
      {
        id: "source-duplicate",
        name: "Arbeitnow duplicate",
        provider_key: "arbeitnow",
        source_type: "api",
        import_mode: "automatic",
        crawl_method: "api",
        enabled: true,
        source_url: "https://example.test/duplicate",
        category_filter: "pune",
        country_filter: "Germany",
        profession_filter: "warehouse"
      },
      {
        id: "source-new",
        name: "Arbeitnow fallback",
        provider_key: "arbeitnow",
        source_type: "api",
        import_mode: "automatic",
        crawl_method: "api",
        enabled: true,
        source_url: "https://example.test/new",
        category_filter: "pune",
        country_filter: "Germany",
        profession_filter: "warehouse"
      }
    ],
    ImportAssistantSettings: [],
    ImportedPost: [{ provider_key: "arbeitnow", external_id: "duplicate-job", source_url: "https://example.test/jobs/duplicate" }],
    Job: [],
    ImportLog: [], ImportFailure: []
  };
  const store = {
    async allRecords(entity) { return records[entity] || []; },
    async createRecord(entity, data) {
      const row = { id: `${entity}-${records[entity].length + 1}`, created_date: new Date().toISOString(), ...data };
      records[entity].push(row);
      return row;
    },
    async updateRecord(entity, id, patch) {
      const row = records[entity].find((item) => item.id === id);
      Object.assign(row, patch);
      return row;
    },
    async deleteRecord() { return true; }
  };
  const originalFetch = global.fetch;
  global.fetch = async (url) => ({
    ok: true,
    async json() {
      const duplicate = String(url).includes("/duplicate");
      return {
        data: [duplicate ? {
          title: "Warehouse operative",
          description: "Warehouse logistics job",
          company_name: "Demo",
          location: "Berlin, Germany",
          slug: "duplicate-job",
          url: "https://example.test/jobs/duplicate",
          created_at: 1760000000
        } : {
          title: "Cleaning worker",
          description: "Cleaning job with a clear contract, stable schedule, direct employer information, published city, start details and application information for candidates.",
          company_name: "Clean Demo",
          location: "Hamburg, Germany",
          slug: "new-cleaner",
          url: "https://example.test/jobs/new-cleaner",
          created_at: 1760000000
        }],
        links: {}
      };
    }
  });
  try {
    const result = await runImport({
      store,
      config: { IMPORT_ASSISTANT_MIN_NEW_PER_RUN: 1 },
      sourceId: "source-duplicate",
      requestedBy: "test",
      options: { manual_run: true, min_new_items_per_run: 1, min_relevance_score: 0, max_risk_score: 100 }
    });
    assert.equal(result.created_count, 1);
    assert.equal(result.duplicate_count > 0, true);
    assert.equal(result.fallback_summary.providers_tried.includes("arbeitnow"), true);
    assert.equal(records.ImportLog.length >= 2, true);
    assert.equal(records.ImportedPost.some((item) => item.status === "pending_review" && item.source_url === "https://example.test/jobs/new-cleaner"), true);
  } finally {
    global.fetch = originalFetch;
  }
});

test("arbeitnow provider expands Albanian import keywords before filtering", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    async json() {
      return {
        data: [
          { title: "Truck Driver CE", description: "Delivery logistics", company_name: "Demo", location: "Berlin", slug: "driver" },
          { title: "Lager Mitarbeiter", description: "Warehouse work", company_name: "Demo", location: "Hamburg", slug: "lager" },
          { title: "Senior Software Engineer", description: "Developer role", company_name: "Demo", location: "Munich", slug: "software" }
        ]
      };
    }
  });
  try {
    const rows = await arbeitnowProvider.fetchItems({
      maxItems: 10,
      source: {
        base_url: "https://example.test/jobs",
        category_filter: "pune",
        country_filter: "Gjermani",
        profession_filter: "shofer, depo",
        excluded_keywords: "software, developer, senior",
        parser_config: { enforce_profession_filter: true }
      }
    });
    assert.deepEqual(rows.map((row) => row.original_title), ["Truck Driver CE", "Lager Mitarbeiter"]);
  } finally {
    global.fetch = originalFetch;
  }
});
