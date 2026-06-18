const clampScore = (value) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
const sanitizeImportedText = (value = "") => String(value || "")
  .replace(/&#x([0-9a-f]+);?/gi, (_, hex) => {
    const codePoint = Number.parseInt(hex, 16);
    return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : "";
  })
  .replace(/&#(\d+);?/g, (_, number) => {
    const codePoint = Number.parseInt(number, 10);
    return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : "";
  })
  .replace(/&euml;/gi, (match) => match === "&Euml;" ? "Ë" : "ë")
  .replace(/&ccedil;/gi, (match) => match === "&Ccedil;" ? "Ç" : "ç")
  .replace(/&amp;/gi, "&")
  .replace(/&nbsp;/gi, " ")
  .replace(/Ã«/g, "ë")
  .replace(/Ã§/g, "ç")
  .normalize("NFC");

const REPUTABLE_FOREIGN_SOURCES = [
  "eures",
  "adzuna",
  "jooble",
  "arbeitnow",
  "arbeitsagentur",
  "indeed",
  "linkedin",
  "stepstone",
  "glassdoor",
];

const VERIFIED_SOURCE_TERMS = [
  "company",
  "kompani",
  "gmbh",
  "ag",
  "shpk",
  "ltd",
  "srl",
  "agency",
  "agjenci",
  "organization",
  "organizat",
  "verein",
  "official",
  "zyrtar",
];

const ALBANIAN_SOURCE_TERMS = [
  "shqip",
  "kosov",
  "alban",
  "illyr",
  "ilir",
  "dardan",
  "antokton",
];

const ETHICAL_RISK_PATTERNS = [
  /\balkool\w*|\balcohol\b|\bliquor\b/i,
  /\bkazino\w*|\bcasino\b/i,
  /\bbaste\w*|\bbetting\b|\bsportbook\b/i,
  /\blo[jëe]ra?\s+fati|\bgambling\b/i,
  /\bkamata?\b|\binterest\s+loan\b|\busury\b/i,
  /\bporn\w*|\badult\s+content\b/i,
  /\berotik\w*|\berotic\b|\bescort\b/i,
  /\bpaligjsh\w*|\billegal\b/i,
  /\bmashtrim\w*|\bscam\b|\bfraud\b/i,
  /\binvestim\w*\s+(?:i\s+)?dyshimt|\bcrypto\s+guaranteed\b|\bget\s+rich\s+quick\b/i,
];

const ETHICAL_POSITIVE_PATTERNS = [
  /\bhallall\b|\bhalal\b/i,
  /\btransparen\w*|\btransparent\b/i,
  /\bkontrat[eë]\b|\bcontract\b/i,
  /\bkompani\s+serioze\b|\breputable\b/i,
  /\bpun[eë]\s+reale\b|\bverified\b|\bverifikuar\b/i,
];

const LANGUAGE_PATTERNS = [
  ["Gjermanisht", /\b(gjermani|gjermanisht|germany|deutschland|deutsch|german)\b/i],
  ["Anglisht", /\b(anglisht|english|uk|united kingdom|england)\b/i],
  ["Frëngjisht", /\b(fr[ëe]ngjisht|france|franc[ëe]|french|fran[çc]ais)\b/i],
  ["Holandisht", /\b(holandisht|holland[ëe]|netherlands|nederland|dutch)\b/i],
  ["Italisht", /\b(italisht|itali|italia|italian)\b/i],
  ["Spanjisht", /\b(spanjisht|spanj[ëe]|spain|spanish)\b/i],
  ["Turqisht", /\b(turqisht|turqi|turkish|t[üu]rk)\b/i],
  ["Arabisht", /\b(arabisht|arabic|arab)\b/i],
];

function hasAny(patterns, text) {
  return patterns.some((pattern) => pattern.test(text));
}

function sourceText(context = {}) {
  return sanitizeImportedText([
    context.sourceName,
    context.source_name,
    context.sourceUrl,
    context.source_url,
    context.import_source_url,
    context.authorName,
    context.author_name,
    context.authorProfileUrl,
    context.author_profile_url,
    context.import_author_profile_url,
    context.rawText,
    context.raw_text,
  ].filter(Boolean).join(" "));
}

export function detectSourceProfile(context = {}) {
  const text = sourceText(context);
  const lower = text.toLowerCase();
  const hasUrl = /https?:\/\//i.test(text);
  const isKnownForeign = REPUTABLE_FOREIGN_SOURCES.some((source) => lower.includes(source));
  const hasVerifiedIdentity = hasUrl && VERIFIED_SOURCE_TERMS.some((term) => lower.includes(term));
  const looksAlbanian = ALBANIAN_SOURCE_TERMS.some((term) => lower.includes(term));
  const hasPublicProfileHistory = /facebook\.com\/(?!groups\/)|linkedin\.com\/(?:company|in)\/|instagram\.com\//i.test(text);

  if (hasVerifiedIdentity || hasPublicProfileHistory) {
    return {
      source_priority_level: 1,
      source_profile: looksAlbanian ? "verified_albanian_or_public" : "verified_public_identity",
      source_bonus_allowed: true,
    };
  }

  if (isKnownForeign) {
    return {
      source_priority_level: 2,
      source_profile: "known_foreign_source",
      source_bonus_allowed: true,
    };
  }

  return {
    source_priority_level: 3,
    source_profile: looksAlbanian ? "unverified_albanian_source" : "anonymous_or_unverified_source",
    source_bonus_allowed: false,
  };
}

export function calculateEthicalScore(context = {}) {
  const text = sanitizeImportedText([
    context.rawText,
    context.raw_text,
    context.title,
    context.description,
    context.category,
    context.profession,
    context.sourceName,
    context.source_name,
  ].filter(Boolean).join(" "));

  let score = 75;
  const riskHits = ETHICAL_RISK_PATTERNS.filter((pattern) => pattern.test(text)).length;
  const positiveHits = ETHICAL_POSITIVE_PATTERNS.filter((pattern) => pattern.test(text)).length;
  score -= riskHits * 25;
  score += positiveHits * 8;
  return clampScore(score);
}

export function calculateSourceTrustScore(context = {}) {
  const profile = detectSourceProfile(context);
  let score = profile.source_priority_level === 1 ? 82 : profile.source_priority_level === 2 ? 68 : 38;
  const text = sourceText(context);
  if (/https?:\/\//i.test(text)) score += 6;
  if (context.authorName || context.author_name) score += 4;
  if (context.authorProfileUrl || context.author_profile_url || context.import_author_profile_url) score += 4;
  if (/facebook\.com\/groups\//i.test(text) && !/facebook\.com\/profile|facebook\.com\/people|facebook\.com\/pages/i.test(text)) score -= 8;
  return { ...profile, source_trust_score: clampScore(score) };
}

export function calculateCompletenessScore(draft = {}) {
  const checks = [
    draft.title,
    draft.description || draft.edited_text,
    draft.category,
    draft.profession || draft.pazar_category || draft.listing_type,
    draft.country,
    draft.city || draft.address,
    draft.phone_number || draft.contact_info || draft.author_profile_url || draft.import_author_profile_url,
    draft.source_url || draft.import_source_url,
  ];
  return clampScore((checks.filter(Boolean).length / checks.length) * 100);
}

export function calculateFreshnessScore(draft = {}) {
  const date = draft.created_at || draft.created_date || draft.published_at || draft.posted_at || draft.date;
  if (!date) return 65;
  const ageMs = Date.now() - new Date(date).getTime();
  if (!Number.isFinite(ageMs) || ageMs < 0) return 70;
  const ageDays = ageMs / 86400000;
  if (ageDays <= 2) return 100;
  if (ageDays <= 7) return 85;
  if (ageDays <= 30) return 65;
  if (ageDays <= 90) return 45;
  return 25;
}

export function calculateProfessionalRelevanceScore(draft = {}) {
  let score = 45;
  if (draft.category) score += 10;
  if (draft.profession || draft.pazar_category || draft.listing_type) score += 20;
  if (draft.description || draft.edited_text) score += 10;
  if (draft.city || draft.country) score += 8;
  if (draft.phone_number || draft.contact_info || draft.author_profile_url || draft.import_author_profile_url) score += 7;
  return clampScore(score);
}

export function detectCommunicationLanguages(draft = {}) {
  const text = sanitizeImportedText([
    draft.rawText,
    draft.raw_text,
    draft.description,
    draft.edited_text,
    draft.country,
    draft.city,
    draft.contact_info,
    draft.source_name,
    draft.source_url,
    draft.import_source_url,
  ].filter(Boolean).join(" "));
  const sourceProfile = detectSourceProfile(draft);
  const isAlbanianContact = sourceProfile.source_profile === "verified_albanian_or_public"
    || /\b(shqip|albanian|kosov|antokton)\b/i.test(text);
  const communication_languages = isAlbanianContact
    ? []
    : LANGUAGE_PATTERNS.filter(([, pattern]) => pattern.test(text)).map(([label]) => label);

  return {
    communication_languages,
    show_communication_language: communication_languages.length > 0,
  };
}

export function calculateImportQualityScore(draft = {}, context = {}) {
  const merged = { ...context, ...draft };
  const professional_relevance_score = calculateProfessionalRelevanceScore(merged);
  const source = calculateSourceTrustScore(merged);
  const hallall_score = calculateEthicalScore(merged);
  const freshness_score = calculateFreshnessScore(merged);
  const completeness_score = calculateCompletenessScore(merged);
  const final_score = clampScore(
    professional_relevance_score * 0.35
    + source.source_trust_score * 0.25
    + hallall_score * 0.20
    + freshness_score * 0.10
    + completeness_score * 0.10
  );
  const requires_manual_review =
    hallall_score < 55 ||
    source.source_priority_level === 3 ||
    source.source_trust_score < 50 ||
    final_score < 60;
  const risk_level = hallall_score < 40 || source.source_trust_score < 35
    ? "high"
    : requires_manual_review
      ? "medium"
      : "low";
  const quality_notes = [
    source.source_bonus_allowed ? "" : "Burimi nuk ka identitet të verifikueshëm; kërkon shqyrtim manual.",
    hallall_score < 55 ? "U gjetën sinjale me risk etik/hallall." : "",
    completeness_score < 65 ? "Informacioni është i paplotë." : "",
  ].filter(Boolean);

  return {
    professional_relevance_score,
    source_trust_score: source.source_trust_score,
    hallall_score,
    ethical_score: hallall_score,
    freshness_score,
    completeness_score,
    final_score,
    source_priority_level: source.source_priority_level,
    source_profile: source.source_profile,
    source_bonus_allowed: source.source_bonus_allowed,
    risk_level,
    requires_manual_review,
    quality_notes,
    ...detectCommunicationLanguages(merged),
  };
}
