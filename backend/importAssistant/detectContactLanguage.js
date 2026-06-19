const { cleanText } = require("./textUtils");

const LANGS = [
  ["sq", /shqip|albanian|kosov/i],
  ["en", /english|anglisht/i],
  ["fr", /fran[çc]ais|french|fr[ëe]ngjisht|france/i],
  ["nl", /nederlands|dutch|holandisht|netherlands|holland/i],
  ["de", /deutsch|german|gjermanisht|germany|deutschland/i],
  ["it", /italian|italisht|italy|itali/i],
  ["es", /spanish|spanjisht|spain|spanj/i],
  ["tr", /turkish|turqisht|turqi/i],
  ["ar", /arabic|arabisht|arab/i],
  ["sv", /swedish|suedisht|sweden|suedi/i],
  ["da", /danish|danisht|denmark|danimark/i],
  ["fi", /finnish|finlandisht|finland/i]
];

function detectContactLanguage(item = {}, identity = {}) {
  if (identity.is_albanian_source && identity.source_identity_type !== "anonymous" && identity.source_identity_confidence >= 55) {
    return { contact_language_required: false, contact_languages: [] };
  }
  const text = cleanText([item.original_title, item.original_description, item.original_country, item.original_city, item.source_name].filter(Boolean).join(" "));
  const detected = LANGS.filter(([, pattern]) => pattern.test(text)).map(([code]) => code);
  return {
    contact_language_required: detected.length > 0 && !detected.includes("sq"),
    contact_languages: [...new Set(detected.filter((code) => code !== "sq"))]
  };
}

module.exports = { detectContactLanguage };
