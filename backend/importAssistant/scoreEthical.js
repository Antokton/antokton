const { clampScore, cleanText } = require("./textUtils");

const NEGATIVE = [
  [/alkool|alcohol|liquor/i, "Përmendet alkool."],
  [/kazino|casino|baste|betting|gambling|loj[eë]ra fati/i, "Përmenden kazino/baste/lojëra fati."],
  [/kamat|usury|interest loan/i, "Ka sinjale kamate ose kredie problematike."],
  [/porn|adult|erotik|escort/i, "Ka përmbajtje adult/erotike."],
  [/illegal|paligjsh|pa dokumente/i, "Ka sinjale aktiviteti të paligjshëm."],
  [/crypto|trading|investim.*dyshimt|fitime t[eë] shpejta|get rich/i, "Ka sinjale skeme financiare të dyshimtë."],
  [/mish jo hallall|non[- ]?halal meat|pork|derri/i, "Ka sinjale për mish jo hallall."]
];

const POSITIVE = [
  [/hallall|halal/i, "Përmendet qartë hallall."],
  [/kontrat[eë]|contract/i, "Përmendet kontratë e qartë."],
  [/kompani serioze|reputable|verifikuar|verified|transparent/i, "Burimi/kompania duket transparente."]
];

function scoreEthical(item = {}) {
  const text = cleanText([item.original_title, item.original_description, item.shqip_summary, item.original_company, item.source_name].filter(Boolean).join(" "));
  let score = 75;
  const reasons = [];
  for (const [pattern, reason] of NEGATIVE) {
    if (pattern.test(text)) {
      score -= 25;
      reasons.push(reason);
    }
  }
  const foodContext = /restaurant|restorant|hotel|furr|bakery|pastic|kuzhin/i.test(text);
  for (const [pattern, reason] of POSITIVE) {
    if (pattern.test(text)) {
      score += foodContext && /hallall|halal/i.test(String(pattern)) ? 10 : 6;
      reasons.push(reason);
    }
  }
  if (foodContext && !/hallall|halal/i.test(text)) reasons.push("Ushqimi/hoteleria nuk merr bonus etik pa qartësi hallall.");
  return {
    ethical_score: clampScore(score),
    ethical_reason: reasons.length ? reasons.join(" ") : "Nuk u gjetën sinjale të qarta problematike."
  };
}

module.exports = { scoreEthical };
