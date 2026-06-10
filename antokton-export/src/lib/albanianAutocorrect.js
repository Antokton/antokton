const ALBANIAN_CORRECTIONS = new Map([
  ["asht", "është"],
  ["eshte", "është"],
  ["jam", "jam"],
  ["jane", "janë"],
  ["jemi", "jemi"],
  ["jeni", "jeni"],
  ["nje", "një"],
  ["ne", "në"],
  ["te", "të"],
  ["qe", "që"],
  ["per", "për"],
  ["pa", "pa"],
  ["me", "me"],
  ["shume", "shumë"],
  ["mire", "mirë"],
  ["mir", "mirë"],
  ["pershendetje", "përshëndetje"],
  ["faleminderit", "faleminderit"],
  ["pergezoj", "përgëzoj"],
  ["pergezime", "përgëzime"],
  ["inisiativen", "iniciativën"],
  ["iniciativen", "iniciativën"],
  ["iniciative", "iniciativë"],
  ["shqipetare", "shqiptare"],
  ["shqiperia", "Shqipëria"],
  ["shqiperi", "Shqipëri"],
  ["gjermani", "Gjermani"],
  ["punetor", "punëtor"],
  ["punetore", "punëtorë"],
  ["kerkohen", "kërkohen"],
  ["kerkohet", "kërkohet"],
  ["njoftim", "njoftim"],
  ["njoftime", "njoftime"],
]);

const PHRASE_CORRECTIONS = [
  [/ju\s+pergezoj/gi, "ju përgëzoj"],
  [/per\s+inisiativen/gi, "për iniciativën"],
  [/per\s+iniciativen/gi, "për iniciativën"],
];

function preserveCase(match, replacement) {
  if (match === match.toUpperCase()) return replacement.toUpperCase();
  if (match[0] === match[0].toUpperCase()) return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  return replacement;
}

export function autocorrectAlbanianText(text = "") {
  let next = String(text || "");
  for (const [pattern, replacement] of PHRASE_CORRECTIONS) {
    next = next.replace(pattern, (match) => preserveCase(match, replacement));
  }
  for (const [from, to] of ALBANIAN_CORRECTIONS) {
    next = next.replace(new RegExp(`\\b${from}\\b`, "gi"), (match) => preserveCase(match, to));
  }
  return next.replace(/\s+([,.!?;:])/g, "$1");
}

export function autocorrectAlbanianDraft(text = "") {
  const corrected = autocorrectAlbanianText(text);
  return corrected;
}
