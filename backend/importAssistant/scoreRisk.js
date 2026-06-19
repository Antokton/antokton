const { clampScore, cleanText } = require("./textUtils");

const RISK_PATTERNS = [
  [/pages[eë]\s+paraprake|upfront payment|pay.*before/i, 25, "Kërkohet pagesë paraprake."],
  [/fitime t[eë] shpejta|get rich|guaranteed income/i, 25, "Premtime të dyshimta fitimesh të shpejta."],
  [/crypto|trading|forex|investment/i, 20, "Ka sinjale kripto/trading/investim."],
  [/whatsapp/i, 8, "Kontakti përmend WhatsApp."],
  [/adult|erotik|escort|porn/i, 35, "Përmbajtje adult/erotike."],
  [/illegal|paligjsh|pa dokumente/i, 35, "Sinjale pune/aktiviteti të paligjshëm."]
];

function scoreRisk(item = {}) {
  const text = cleanText([item.original_title, item.original_description, item.original_contact, item.source_name].filter(Boolean).join(" "));
  let score = 10;
  const reasons = [];
  for (const [pattern, weight, reason] of RISK_PATTERNS) {
    if (pattern.test(text)) {
      score += weight;
      reasons.push(reason);
    }
  }
  if (!item.original_company && !item.source_identity_name) {
    score += 12;
    reasons.push("Mungon kompani ose identitet i qartë.");
  }
  if (!item.original_location && !item.city && !item.country) {
    score += 10;
    reasons.push("Mungon lokacioni.");
  }
  if (!item.source_url) {
    score += 8;
    reasons.push("Mungon linku burimor.");
  }
  const onlyWhatsapp = (item.contact_methods || []).length === 1 && item.contact_methods[0]?.type === "whatsapp";
  if (onlyWhatsapp && !item.source_identity_name) {
    score += 20;
    reasons.push("Kontakt vetëm WhatsApp pa identitet të verifikueshëm.");
  }
  if (/(\d{5,})\s*(eur|€)/i.test(text)) {
    score += 10;
    reasons.push("Paga mund të jetë joreale; kërkon verifikim.");
  }
  return {
    risk_score: clampScore(score),
    risk_reason: reasons.length ? reasons.join(" ") : "Risk i ulët nga sinjalet tekstuale."
  };
}

module.exports = { scoreRisk };
