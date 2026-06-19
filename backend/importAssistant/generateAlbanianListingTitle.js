const { cleanText, normalizeKey } = require("./textUtils");

const PLURAL_HINTS = [
  "workers",
  "drivers",
  "operators",
  "punetore",
  "punëtorë",
  "shofera",
  "cleaners",
  "several",
  "multiple"
];

const PROFESSION_MAP = [
  [/ce\b|c\+e|truck|lorry|kamion/i, "shofer CE"],
  [/\bc\b|driver|shofer/i, "shofer"],
  [/electric|elektr/i, "elektriçist"],
  [/plumb|hidraul/i, "hidraulik"],
  [/paint|bojaxh/i, "bojaxhi"],
  [/clean|pastr/i, "pastruese"],
  [/warehouse|depo|magazin/i, "punëtor magazine"],
  [/construction|nd[eë]rtim|mason|fasad/i, "punëtor ndërtimi"],
  [/mechanic|mekanik/i, "mekanik"],
  [/baker|furr/i, "punëtor në furrë buke"],
  [/pastry|pastic/i, "pasticier"],
  [/care|kujdest/i, "kujdestar"],
  [/security|siguri/i, "punonjës sigurie"],
  [/delivery|shp[eë]rndar/i, "punëtor shpërndarjeje"]
];

function inferProfession(item = {}) {
  const explicit = cleanText(item.profession || item.category || "");
  if (explicit && explicit.length < 60) return explicit;
  const text = cleanText([item.original_title, item.original_description, item.title, item.description].filter(Boolean).join(" "));
  for (const [pattern, profession] of PROFESSION_MAP) {
    if (pattern.test(text)) return profession;
  }
  return cleanText(item.original_title || item.title || "punëtor");
}

function generateAlbanianListingTitle(item = {}) {
  const profession = inferProfession(item).replace(/^k[eë]rkohet\s+/i, "").replace(/^k[eë]rkohen\s+/i, "").trim();
  const text = normalizeKey([item.original_title, item.original_description, item.title, item.description].filter(Boolean).join(" "));
  const plural = Number(item.positions || item.vacancies || 0) > 1 || PLURAL_HINTS.some((hint) => text.includes(normalizeKey(hint)));
  const prefix = plural ? "Kërkohen" : "Kërkohet";
  return `${prefix} ${profession || "punëtor"}`.replace(/\s+/g, " ").trim();
}

module.exports = { generateAlbanianListingTitle };
