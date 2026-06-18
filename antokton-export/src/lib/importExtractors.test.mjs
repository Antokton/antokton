import assert from "node:assert/strict";
import test from "node:test";

import { extractImportedPostFields, sanitizeImportedText } from "./importExtractors.js";
import { calculateImportQualityScore, detectSourceProfile } from "./importQualityScoring.js";
import { normalizePhoneForCountry } from "./phone.js";

test("sanitizeImportedText decodes Albanian HTML entities", () => {
  assert.equal(sanitizeImportedText("Pun&#xeb; n&#xeb; Gjermani"), "Punë në Gjermani");
  assert.equal(sanitizeImportedText("K&#xeb;rkohet Pun&#xeb;tor&#xeb;"), "Kërkohet Punëtorë");
});

test("sanitizeImportedText repairs common UTF-8 mojibake", () => {
  assert.equal(sanitizeImportedText("PunÃ« nÃ« Gjermani"), "Punë në Gjermani");
});

test("sanitizeImportedText normalizes mixed Albanian casing", () => {
  assert.equal(sanitizeImportedText("PunËtorë"), "Punëtorë");
});

test("extractImportedPostFields stores decoded UTF-8 text", () => {
  const result = extractImportedPostFields("Pun&#xeb; n&#xeb; Gjermani", {
    description: "K&#xeb;rkohet Pun&#xeb;tor&#xeb;",
  });

  assert.equal(result.original_text, "Punë në Gjermani");
  assert.equal(result.import_original_text, "Punë në Gjermani");
  assert.equal(result.description, "Kërkohet Punëtorë");
});

test("extractImportedPostFields extracts German phone and country from imported text", () => {
  const result = extractImportedPostFields(`
📍 Lokacioni: Gütersloh dhe rrethinë (deri në 70 km)
📞 Kontakt dhe Informata: +49 177 8749318
`, {});

  assert.equal(result.phone_number, "+49 177 8749318");
  assert.equal(result.country, "Gjermani");
});

test("extractImportedPostFields normalizes German local phone numbers", () => {
  const result = extractImportedPostFields(`
Vendi i punës: Gjermani
Telefon/WhatsApp: 0176 77817618
`, {});

  assert.equal(result.phone_number, "+4917677817618");
  assert.equal(result.address, "Gjermani");
  assert.equal(result.country, "Gjermani");
});

test("normalizePhoneForCountry converts German local numbers without choosing an app", () => {
  assert.equal(normalizePhoneForCountry("0176 77817618", "Gjermani"), "+4917677817618");
});

test("extractImportedPostFields normalizes Gjermania to Gjermani", () => {
  const result = extractImportedPostFields("Punë në Gjermania", {
    country: "Gjermania",
  });

  assert.equal(result.country, "Gjermani");
});

test("extractImportedPostFields normalizes foreign place names without definite forms", () => {
  const bremen = extractImportedPostFields("Punë në Bremeni", {
    city: "Bremeni",
    country: "Gjermania",
  });
  assert.equal(bremen.city, "Bremen");
  assert.equal(bremen.country, "Gjermani");

  const brussels = extractImportedPostFields("Punë në Brukseli", {
    city: "Brukseli",
    country: "Belgjika",
  });
  assert.equal(brussels.city, "Bruksel");
  assert.equal(brussels.country, "Belgjikë");
});

test("extractImportedPostFields treats Budva and neighboring state labels as Antokton", () => {
  assert.equal(extractImportedPostFields("Kërkohet punëtor në Budva", {}).country, "Antokton");
  assert.equal(extractImportedPostFields("Kërkohet punëtor në Tiranë", {}).country, "Antokton");
  assert.equal(extractImportedPostFields("Kërkohet punëtor", { country: "Shqipëri" }).country, "Antokton");
  assert.equal(extractImportedPostFields("Kërkohet punëtor", { country: "Kosovë" }).country, "Antokton");
  assert.equal(extractImportedPostFields("Kërkohet punëtor", { country: "Mal i Zi" }).country, "Antokton");
  assert.equal(extractImportedPostFields("Kërkohet punëtor", { country: "Serbi" }).country, "Antokton");
  assert.equal(extractImportedPostFields("Kërkohet punëtor", { country: "Greqi" }).country, "Antokton");
  assert.equal(extractImportedPostFields("Kërkohet punëtor", { country: "Maqedoni e Veriut" }).country, "Antokton");
});

test("import quality scoring lowers hallall score for gambling and requires review", () => {
  const result = extractImportedPostFields("Punë në kazino me baste dhe lojëra fati", {
    title: "Punë në kazino",
    category: "pune",
    profession: "Punëtor",
    source_url: "https://facebook.com/groups/anonymous/permalink/1",
  });

  assert.ok(result.hallall_score < 55);
  assert.equal(result.requires_manual_review, true);
  assert.equal(result.risk_level, "high");
});

test("known foreign sources get level 2 but anonymous Albanian groups get no bonus", () => {
  const eures = detectSourceProfile({ sourceUrl: "https://eures.europa.eu/job/123", sourceName: "EURES" });
  assert.equal(eures.source_priority_level, 2);
  assert.equal(eures.source_bonus_allowed, true);

  const group = detectSourceProfile({ sourceUrl: "https://facebook.com/groups/shqiptaret/jobs/1", sourceName: "Grup shqiptar" });
  assert.equal(group.source_priority_level, 3);
  assert.equal(group.source_bonus_allowed, false);
});

test("final import score follows weighted formula inputs", () => {
  const score = calculateImportQualityScore({
    title: "Kërkohet elektricist",
    description: "Punë reale me kontratë në Gjermani.",
    category: "pune",
    profession: "Elektricist",
    country: "Gjermani",
    city: "Berlin",
    phone_number: "+49 177 8749318",
    source_url: "https://eures.europa.eu/job/123",
    source_name: "EURES",
  });

  assert.equal(score.source_priority_level, 2);
  assert.ok(score.final_score >= 65);
  assert.ok(score.hallall_score >= 75);
});

test("communication language is hidden for Albanian verified/public contact and shown for foreign source", () => {
  const albanian = calculateImportQualityScore({
    description: "Kompani shqiptare e verifikuar kërkon punëtor.",
    source_url: "https://facebook.com/profile.php?id=100",
    source_name: "Biznes shqiptar zyrtar",
  });
  assert.equal(albanian.show_communication_language, false);

  const german = calculateImportQualityScore({
    description: "Kontakt në Gjermani, Deutsch/German preferred.",
    country: "Gjermani",
    source_url: "https://arbeitnow.com/job/1",
  });
  assert.equal(german.show_communication_language, true);
  assert.ok(german.communication_languages.includes("Gjermanisht"));
});
