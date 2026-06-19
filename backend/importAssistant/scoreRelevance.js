const { clampScore, cleanText } = require("./textUtils");

const PRIORITY_PROFESSIONS = [
  [/shofer\s*(c|ce)?|driver|truck|lorry/i, "Shofer/logjistikë"],
  [/logjistik|depo|magazin|warehouse/i, "Depo/logjistikë"],
  [/nd[eë]rtim|construction|fasad|mason|builder/i, "Ndërtim"],
  [/pastrim|cleaner|cleaning/i, "Pastrim"],
  [/bojaxh|painter/i, "Bojaxhi"],
  [/bujq[eë]si|agriculture|farm/i, "Bujqësi"],
  [/factory|fabrik/i, "Fabrikë"],
  [/mekanik|mechanic/i, "Mekanik"],
  [/elektr|electric/i, "Elektriçist"],
  [/hidraul|plumb/i, "Hidraulik"],
  [/kujdest|caregiver|care/i, "Kujdestar"],
  [/siguri|security/i, "Siguri"],
  [/delivery|shp[eë]rndar/i, "Shpërndarje"],
  [/furr|bakery|baker/i, "Furrë buke"],
  [/pastic|pastry/i, "Pasticeri"],
  [/restaurant|restorant|hotel/i, "Restorant/hotel me kontroll etik"]
];

const PRIORITY_COUNTRIES = [
  "belgjik", "gjermani", "zvic", "franc", "itali", "holand", "austri",
  "suedi", "danimark", "finland", "britani", "irland", "spanj", "greqi",
  "kroaci", "slloveni", "portugali"
];

const POSITIVE = [
  [/nuk k[eë]rkohet diplom|no degree/i, "Nuk kërkohet diplomë."],
  [/strehim|accommodation|housing provided/i, "Ofrohet strehim."],
  [/transport/i, "Ofrohet transport."],
  [/relocation|visa sponsorship/i, "Ka mbështetje zhvendosjeje/vize."],
  [/anglisht baz[eë]|basic english/i, "Mjafton anglisht bazë."],
  [/fillim i menj[eë]hersh[eë]m|immediate start/i, "Fillim i menjëhershëm."],
  [/kontrat[eë]|contract/i, "Kontratë e qartë."],
  [/salary|paga|€|eur/i, "Paga është e publikuar."],
  [/company|kompani|gmbh|ag|ltd|shpk/i, "Kompani reale ose e emërtuar."]
];

const NEGATIVE = [
  [/native (german|french|dutch)|gjuh[eë].*avancuar/i, "Kërkohet gjuhë vendase e avancuar."],
  [/university degree|diplom[eë] universitare/i, "Kërkohet diplomë universitare."],
  [/inbox|dm me|më shkruaj/i, "Kontakt i paqartë."],
  [/salary.*negotiable only|pag[eë].*paqart/i, "Paga është e paqartë."]
];

function scoreRelevance(item = {}) {
  const text = cleanText([item.original_title, item.original_description, item.profession, item.country, item.city].filter(Boolean).join(" "));
  let score = item.item_type === "job" ? 45 : 35;
  const reasons = [];
  for (const [pattern, reason] of PRIORITY_PROFESSIONS) {
    if (pattern.test(text)) {
      score += 18;
      reasons.push(reason);
      break;
    }
  }
  if (PRIORITY_COUNTRIES.some((country) => text.toLowerCase().includes(country))) {
    score += 10;
    reasons.push("Vend me prioritet për diasporën.");
  }
  for (const [pattern, reason] of POSITIVE) {
    if (pattern.test(text)) {
      score += 5;
      reasons.push(reason);
    }
  }
  for (const [pattern, reason] of NEGATIVE) {
    if (pattern.test(text)) {
      score -= 8;
      reasons.push(reason);
    }
  }
  if (item.original_company) score += 5;
  if (item.contact_methods?.length) score += 5;
  const finalScore = clampScore(score);
  return {
    relevance_score: finalScore,
    relevance_level: finalScore >= 75 ? "high" : finalScore >= 50 ? "medium" : "low",
    relevance_reason: reasons.length ? reasons.join(" ") : "Relevancë e llogaritur nga kategoria dhe përmbajtja."
  };
}

module.exports = { scoreRelevance };
