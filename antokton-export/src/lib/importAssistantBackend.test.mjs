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
const { runImport } = require(path.join(root, "backend/importAssistant/importRunner.js"));
const { buildExpiryFields, parseImportedExpiry, getAutomaticExpiryDays } = require(path.join(root, "backend/importAssistant/expiry.js"));

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
