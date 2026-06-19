const HTML_ENTITIES = {
  amp: "&",
  nbsp: " ",
  quot: '"',
  apos: "'",
  lt: "<",
  gt: ">",
  euml: "ë",
  Euml: "Ë",
  ccedil: "ç",
  Ccedil: "Ç"
};

function cleanText(value = "") {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);?/g, (_, num) => String.fromCodePoint(Number.parseInt(num, 10)))
    .replace(/&([a-zA-Z]+);/g, (match, name) => HTML_ENTITIES[name] || match)
    .replace(/Ã«/g, "ë")
    .replace(/Ã§/g, "ç")
    .replace(/\s+/g, " ")
    .trim()
    .normalize("NFC");
}

function normalizeKey(value = "") {
  return cleanText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function words(value = "") {
  return normalizeKey(value).split(" ").filter((word) => word.length > 2);
}

function overlapScore(a = "", b = "") {
  const aw = new Set(words(a));
  const bw = new Set(words(b));
  if (!aw.size || !bw.size) return 0;
  let hits = 0;
  for (const word of aw) if (bw.has(word)) hits += 1;
  return hits / Math.max(aw.size, bw.size);
}

function canonicalUrl(value = "") {
  try {
    const url = new URL(String(value || "").trim());
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|mc_)/i.test(key)) url.searchParams.delete(key);
    }
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    return url.toString().replace(/\/$/, "");
  } catch {
    return cleanText(value);
  }
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

module.exports = {
  canonicalUrl,
  clampScore,
  cleanText,
  normalizeKey,
  overlapScore,
  words
};
