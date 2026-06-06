import assert from "node:assert/strict";
import test from "node:test";

import { extractImportedPostFields, sanitizeImportedText } from "./importExtractors.js";

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
