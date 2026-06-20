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
const { ensureDefaultSources, runImport } = require(path.join(root, "backend/importAssistant/importRunner.js"));
const { buildExpiryFields, parseImportedExpiry, getAutomaticExpiryDays } = require(path.join(root, "backend/importAssistant/expiry.js"));
const arbeitnowProvider = require(path.join(root, "backend/importAssistant/providers/arbeitnowProvider.js"));

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

test("default sources do not seed concrete providers from code", async () => {
  const created = [];
  const store = {
    async allRecords(entity) {
      assert.equal(entity, "ImportedSource");
      return [];
    },
    async createRecord(entity, data) {
      created.push({ entity, data });
      return data;
    },
    async updateRecord() {
      throw new Error("No source should be updated when the database is empty");
    }
  };
  const sources = await ensureDefaultSources(store);
  assert.deepEqual(sources, []);
  assert.deepEqual(created, []);
});

test("manual run works when auto import settings are disabled", async () => {
  const records = { ImportedSource: [], ImportAssistantSettings: [], ImportedPost: [], Job: [], ImportLog: [] };
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

test("import fallback continues after duplicate-only first query", async () => {
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
    ImportLog: []
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
    assert.ok(fetchCount >= 2);
    assert.equal(records.ImportedPost.some((item) => item.status === "pending_review" && item.source_url === "https://example.test/jobs/new-warehouse"), true);
    assert.ok(records.ImportLog[0].queries_tried.length >= 2);
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
        excluded_keywords: "software, developer, senior"
      }
    });
    assert.deepEqual(rows.map((row) => row.original_title), ["Truck Driver CE", "Lager Mitarbeiter"]);
  } finally {
    global.fetch = originalFetch;
  }
});
