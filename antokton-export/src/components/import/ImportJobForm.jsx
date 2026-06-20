import React, { useState } from "react";
import { base44 } from "@/api/antoktonClient";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Link2, Sparkles, CheckCircle2, AlertCircle, Phone, MapPin, User, Briefcase, DollarSign, FileText, Image, ClipboardPaste, Star, Upload, X } from "lucide-react";
import { PHONE_PLACEHOLDER, getInternationalPhoneError, isValidInternationalPhone, normalizePhoneForCountry } from "@/lib/phone";
import { getContactInfoInTextMessage } from "@/lib/contentContactGuard";
import { extractImportedPostFields, sanitizeImportedText } from "@/lib/importExtractors";
import LocationPicker from "@/components/job/LocationPicker";
import ImageFocusControls from "@/components/media/ImageFocusControls";
import ImageFocusPreview from "@/components/media/ImageFocusPreview";
import { getImageFocus, getImageFocusStyle, pruneImageFocusMap, updateImageFocus } from "@/lib/imageFocus";
import { buildExpiryFields } from "@/lib/expiry";

const CONTRACT_TYPES = [
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract", label: "Kontratë" },
  { value: "freelance", label: "Freelance" },
  { value: "internship", label: "Praktikë" },
];

const EXPERIENCE_LEVELS = [
  { value: "entry", label: "Fillestar (Entry)" },
  { value: "mid", label: "Mesëm (Mid)" },
  { value: "senior", label: "Ekspert (Senior)" },
  { value: "executive", label: "Drejtor (Executive)" },
];

const JOB_TYPES = [
  { value: "ofroj", label: "🟢 Ofroj punë" },
  { value: "kerkoj", label: "🟡 Kërkoj punë" },
];

const PHONE_APPS = [
  { value: "telefon", label: "Telefon" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "viber", label: "Viber" },
  { value: "telegram", label: "Telegram" },
  { value: "bip", label: "BiP" },
  { value: "signal", label: "Signal" },
  { value: "tjeter", label: "Tjetër" },
];
const STAFF_DEFAULT_POSTER_NAME = "Koordinator Projekti";

const PROFESSION_KEYWORDS = [
  "punetor", "punëtor", "elektricist", "hidraulik", "shofer", "kuzhinier", "kamerier",
  "banakier", "murator", "gips", "gipskarton", "montues", "mekanik", "pastrues",
  "infermier", "programues", "saldues", "magazinier", "recepsionist", "operator",
  "teknik", "ndihmes", "ndihmës", "menaxher", "arkëtar", "shitës", "roje",
  "glassfaser", "fibra optike", "bagerist", "eskavator", "bager", "kopshtar",
  "pastruese", "pastrim", "kujdestar", "kujdestare", "ndihmese", "ndihmëse"
];

const SECTION_STOP_RE = /^(?:cfar[eë]|çfar[eë]|ofrojm[eë]|ofrohet|kushtet|benefitet|paga|pagesa|lokacioni|lokacion|vendndodhja|adresa|kontakt|tel|telefon|whatsapp|viber|email|apliko|na kontakto)\b/i;
const POSITION_SECTION_RE = /(?:pozicionet|pozitat|vende pune|fusha|profesione|rekrutim|k[eë]rkojm[eë]|kerkojme|k[eë]rkohet)/i;
const BULLET_RE = /^[\s\-–—•●▪▫*✅✔️☑️🔹🔸📌]+\s*/u;

const hasProfessionKeyword = (value = "") => {
  const normalized = String(value || "").toLowerCase();
  return PROFESSION_KEYWORDS.some((keyword) => normalized.includes(keyword));
};

const isUrlLike = (value = "") => /^https?:\/\//i.test(String(value || "").trim());

const looksCorruptedText = (value = "") => /�|Ã|Â|â€|Ð|Ñ|\\u00[0-9a-f]{2}/i.test(String(value || ""));

const normalizeImportUrl = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^(?:www\.|m\.|mbasic\.)?facebook\.com\//i.test(raw)) return `https://${raw}`;
  if (/^\/?groups\/[^/]+\/(?:permalink|posts)\/[^/]+/i.test(raw)) {
    return `https://www.facebook.com/${raw.replace(/^\/+/, "")}`;
  }
  return raw;
};

const isFacebookUrl = (value = "") => /(?:^|\/\/)(?:www\.|m\.|mbasic\.)?facebook\.com\//i.test(normalizeImportUrl(value));

const looksTruncatedText = (value = "") => {
  const text = sanitizeImportedText(value);
  return /(^|\s)(?:\.{3}|…)(?:\s|$)/.test(text) || /\bn[eë]\.\.\./i.test(text);
};

const hasCompleteJobSignals = (value = "") => {
  const text = sanitizeImportedText(value);
  return splitRoleLines(text).length > 1 && /kontakt|informata|tel|telefon|whatsapp|\+\d{1,4}/i.test(text) && /lokacion|vendndodhja|qytet|adresa|gütersloh|gutersloh|bielefeld/i.test(text);
};

const cleanRoleLine = (line = "") => sanitizeImportedText(line)
  .replace(/^[\s\-–—•●▪▫*✅✔️☑️🔹🔸📌]+\s*/u, "")
  .replace(/^\d+[\).:\-–]\s*/, "")
  .replace(/\s+/g, " ")
  .trim();

const sentenceCase = (value = "") => {
  const text = String(value || "").toLocaleLowerCase("sq-AL").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.charAt(0).toLocaleUpperCase("sq-AL") + text.slice(1);
};

const titleCase = (value = "") => String(value || "")
  .toLocaleLowerCase("sq-AL")
  .replace(/\s+/g, " ")
  .trim()
  .split(" ")
  .map((word, index) => (index > 0 && ["në", "ne", "dhe", "për", "per", "me"].includes(word)
    ? word.replace("ne", "në").replace("per", "për")
    : word.charAt(0).toLocaleUpperCase("sq-AL") + word.slice(1)))
  .join(" ");

const cleanImportedText = (value = "") => sanitizeImportedText(value)
  .split(/\r?\n/)
  .map((line) => {
    const trimmed = line.replace(/\s+/g, " ").trim();
    if (!trimmed) return "";
    if (/^[A-ZÇË0-9\s.,:;!?()/%+-]+$/.test(trimmed) && /[A-ZÇË]{3,}/.test(trimmed)) {
      return sentenceCase(trimmed);
    }
    return trimmed;
  })
  .join("\n")
  .replace(/\n{3,}/g, "\n\n")
  .trim();

const isContactOrBenefitLine = (line = "") => {
  const value = String(line || "").toLowerCase();
  return /kontakt|tel|telefon|whatsapp|viber|email|paga|pages|akomodim|banim|transport|kontrat|dokument|apliko|cv|info|mund[eë]si|sigurim/.test(value);
};

const inferProfession = (title = "") => {
  const clean = cleanRoleLine(title);
  const lower = clean.toLowerCase();
  const mappings = [
    [/glassfaser|fibra optike/, "Punëtor Glassfaser"],
    [/elektricist/, "Elektricist"],
    [/bagerist|eskavator|bager/, "Bagerist"],
    [/kopshtar/, "Kopshtar"],
    [/pastruese|pastrues|pastrim/, "Pastrues"],
    [/kujdestar|kujdestare/, "Kujdestar"],
    [/ndihm[eë]se|ndihm[eë]s/, "Ndihmës"],
    [/hidraulik/, "Hidraulik"],
    [/gips|gipskarton|knauf/, "Punëtor gipskartoni"],
    [/shofer/, "Shofer"],
    [/kuzhinier/, "Kuzhinier"],
    [/kamerier/, "Kamerier"],
    [/banakier/, "Banakier"],
    [/murator/, "Murator"],
    [/montues/, "Montues"],
    [/mekanik/, "Mekanik"],
    [/pastrues/, "Pastrues"],
    [/infermier/, "Infermier"],
    [/programues/, "Programues"],
    [/saldues/, "Saldues"],
    [/magazinier/, "Magazinier"],
    [/recepsionist/, "Recepsionist"],
    [/operator/, "Operator"],
    [/teknik/, "Teknik"],
    [/menaxher/, "Menaxher"],
    [/ark[eë]tar/, "Arkëtar"],
    [/shit[eë]s/, "Shitës"],
    [/nd[eë]rtim|ndertim/, "Punëtor ndërtimi"],
    [/pun[eë]tor/, "Punëtor"],
  ];
  const match = mappings.find(([regex]) => regex.test(lower));
  if (match) return match[1];
  if (/njoftim\s+pune|pun[eë]\s+n[eë]\s+gjermani|ofroj\s+pun[eë]|k[eë]rkoj\s+pun[eë]/i.test(clean)) return "";
  return titleCase(clean).split(/\s+/).slice(0, 3).join(" ");
};

const extractLocationFromText = (rawText = "") => {
  const lines = sanitizeImportedText(rawText).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const labelRe = /^(?:lokacioni|lokacion|vendndodhja|vendi i pun[eë]s|vendi pun[eë]s|vendi|qyteti|qytet|adresa|adres[eë]|location|address)\s*[:\-–]\s*(.+)$/i;
  for (const line of lines) {
    const match = line.match(labelRe);
    if (!match?.[1]) continue;
    const value = cleanRoleLine(match[1])
      .replace(/\s*\((?:deri|rreth)[^)]+\)\s*/i, "")
      .replace(/\s*(?:deri|rreth)\s+\d+.*$/i, "")
      .trim();
    const city = value
      .split(/[,;|/]| dhe | ose /i)
      .map((part) => part.trim())
      .filter((part) => part && !/^rrethin[eë]?$/i.test(part))
      .slice(0, 1)
      .join(", ");
    return { address: value, city: city || value };
  }
  const knownCityMatch = String(rawText || "").match(/\b(G[uü]tersloh|Bielefeld|Berlin|Hamburg|München|Munich|Dortmund|Düsseldorf|Dusseldorf|Köln|Koln|Frankfurt)\b/gi);
  if (knownCityMatch?.length) {
    const city = Array.from(new Set(knownCityMatch.map((item) => titleCase(item.replace("Gutersloh", "Gütersloh"))))).join(", ");
    return { address: city, city };
  }
  return { address: "", city: "" };
};

const inferCountryFromLocation = (rawText = "") => {
  const value = sanitizeImportedText(rawText).toLowerCase();
  if (/\b(gjermani|germany|deutschland|gütersloh|gutersloh|bielefeld|berlin|hamburg|münchen|munich|dortmund|düsseldorf|dusseldorf|köln|koln|frankfurt)\b/i.test(value)) {
    return "Gjermani";
  }
  return "";
};

const isLikelyRoleLine = (line = "", rawLine = "") => {
  const clean = cleanRoleLine(line);
  if (clean.length < 3 || clean.length > 90) return false;
  if (SECTION_STOP_RE.test(clean) || isContactOrBenefitLine(clean)) return false;
  if (!hasProfessionKeyword(clean)) return false;
  const isBullet = BULLET_RE.test(rawLine) || /^\s*\d+[\).:\-–]\s*/.test(rawLine);
  const isPositionContext = POSITION_SECTION_RE.test(rawLine) || isBullet;
  return isPositionContext || clean.split(/\s+/).length <= 6;
};

const splitRoleLines = (rawText = "") => {
  const rawLines = sanitizeImportedText(rawText).split(/\r?\n/);

  const roles = [];
  let inPositionSection = false;
  for (const rawLine of rawLines) {
    const line = cleanRoleLine(rawLine);
    if (!line) continue;
    if (SECTION_STOP_RE.test(line) && !POSITION_SECTION_RE.test(line)) {
      inPositionSection = false;
      continue;
    }
    if (POSITION_SECTION_RE.test(line)) {
      inPositionSection = true;
      if (!hasProfessionKeyword(line) || line.length > 60) continue;
    }
    if (!inPositionSection && !BULLET_RE.test(rawLine) && !/^\s*\d+[\).:\-–]\s*/.test(rawLine)) continue;
    if (!isLikelyRoleLine(line, rawLine)) continue;
    roles.push(line);
  }

  const seen = new Set();
  return roles.filter((role) => {
    const key = inferProfession(role).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 6);
};

const buildRoleDescription = (rawText = "", role = "") => {
  const selectedProfession = inferProfession(role).toLowerCase();
  const lines = sanitizeImportedText(rawText)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines
    .filter((line) => {
      const clean = cleanRoleLine(line);
      if (!clean) return false;
      if (!hasProfessionKeyword(clean)) return true;
      if (!isLikelyRoleLine(clean, line)) return true;
      return inferProfession(clean).toLowerCase() === selectedProfession;
    })
    .join("\n")
    .trim();
};

const makeRoleTitle = (role = "", rawText = "") => {
  const profession = inferProfession(role);
  const location = extractLocationFromText(rawText);
  const city = (location.city || "").split(",")[0]?.trim();
  return [profession, city ? `në ${city}` : ""].filter(Boolean).join(" ");
};

const polishDraft = (draft = {}, rawText = "") => {
  const profession = inferProfession(draft.profession || draft.title || "") || inferProfession(rawText || draft.import_original_text || draft.original_text || draft.description || "");
  const location = extractLocationFromText(rawText || draft.import_original_text || draft.original_text || draft.description || "");
  const country = draft.country || inferCountryFromLocation(rawText || draft.import_original_text || draft.original_text || draft.description || location.city || location.address);
  const genericTitle = !draft.title || /njoftim\s+pune|pun[eë]\s+n[eë]\s+gjermani/i.test(draft.title);
  const title = genericTitle && profession
    ? [profession, location.city || location.address || country ? `në ${location.city || location.address || country}` : ""].filter(Boolean).join(" ")
    : (draft.title || profession || "Njoftim pune");
  return {
    ...draft,
    title: titleCase(title).split(/\s+/).slice(0, 10).join(" "),
    profession,
    description: cleanImportedText(draft.description || rawText || ""),
    city: draft.city || location.city || "",
    address: draft.address || location.address || "",
    country,
  };
};

const dedupeDrafts = (items = [], rawText = "") => {
  const roleCount = splitRoleLines(rawText).length;
  const seen = new Set();
  const cleanItems = items
    .map((item) => polishDraft(item, rawText))
    .filter((item) => item.title || item.description || item.profession)
    .filter((item) => {
      const key = `${(item.profession || "").toLowerCase()}|${(item.city || "").toLowerCase()}`;
      if (!item.profession || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  return roleCount > 0 ? cleanItems.slice(0, roleCount) : cleanItems;
};

const importedTextFromData = (data = {}) => [
  data.import_original_text,
  data.original_text,
  data.description,
  data.title,
].filter(Boolean).map(sanitizeImportedText).join("\n").trim();

const hasImportableText = (text = "") => {
  const clean = sanitizeImportedText(text).replace(/https?:\/\/\S+/gi, "").replace(/\s+/g, " ").trim();
  if (looksCorruptedText(clean)) return false;
  if (looksTruncatedText(clean) && !hasCompleteJobSignals(text)) return false;
  if (clean.length < 80) return false;
  if (!/[a-zA-ZçÇëË]/.test(clean)) return false;
  if (/facebook|log in|login|sign up|permalink|browser/i.test(clean) && clean.length < 220) return false;
  return hasProfessionKeyword(clean) || /pun[eë]|pozicion|rekrutim|k[eë]rkojm[eë]|ofrojm[eë]|lokacion|kontakt/i.test(clean);
};

const isMeaningfulDraft = (draft = {}) => {
  const title = sanitizeImportedText(draft.title || "").trim();
  const description = sanitizeImportedText(draft.description || "").trim();
  const profession = sanitizeImportedText(draft.profession || "").trim();
  if (!title || !description || !profession) return false;
  if (looksCorruptedText(`${title}\n${description}\n${profession}\n${draft.city || ""}\n${draft.address || ""}`)) return false;
  if (looksTruncatedText(`${title}\n${description}`) && !hasCompleteJobSignals(description)) return false;
  if (isUrlLike(title) || isUrlLike(description)) return false;
  if (title.length > 120 || profession.split(/\s+/).length > 4) return false;
  if (description.length < 80) return false;
  return hasProfessionKeyword(`${profession} ${title} ${description}`);
};

const buildHeuristicDrafts = (rawText = "", baseDraft = {}, fallbackUrl = "", jobType = "ofroj") => {
  const roles = splitRoleLines(rawText);
  if (!roles.length) return [normalizeDraft(rawText, baseDraft, fallbackUrl, jobType)];

  return roles.map((role) => normalizeDraft(rawText, {
    ...baseDraft,
    title: makeRoleTitle(role, rawText),
    profession: baseDraft.profession || inferProfession(role),
    description: `${inferProfession(role)}\n\n${buildRoleDescription(rawText, role) || rawText}`.trim(),
  }, fallbackUrl, jobType));
};

const normalizeDraft = (rawText, draft = {}, fallbackUrl = "", jobType = "ofroj") => {
  const decodedRawText = sanitizeImportedText(rawText);
  const imageUrls = (Array.isArray(draft.image_urls) ? draft.image_urls : draft.image_url ? [draft.image_url] : [])
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 6);
  const mainImageIndex = Math.min(
    Math.max(Number.parseInt(draft.main_image_index, 10) || 0, 0),
    Math.max(imageUrls.length - 1, 0)
  );
  const decodedDraft = {
    ...draft,
    poster_name: sanitizeImportedText(draft.poster_name || ""),
    author_profile_url: "",
    import_author_profile_url: "",
    title: sanitizeImportedText(draft.title || ""),
    description: sanitizeImportedText(draft.description || ""),
    profession: sanitizeImportedText(draft.profession || ""),
    city: sanitizeImportedText(draft.city || ""),
    address: sanitizeImportedText(draft.address || ""),
    contact_info: sanitizeImportedText(draft.contact_info || ""),
    image_urls: imageUrls,
    main_image_index: mainImageIndex,
    image_url: imageUrls[mainImageIndex] || sanitizeImportedText(draft.image_url || ""),
    image_focus_json: pruneImageFocusMap(draft.image_focus_json, imageUrls),
  };
  const polished = polishDraft(decodedDraft, decodedRawText);
  return extractImportedPostFields(decodedRawText || "", {
    ...polished,
    title: polished.title || decodedRawText?.split("\n").find(Boolean)?.slice(0, 90) || "Njoftim pune",
    description: polished.description || decodedRawText || "",
    import_original_text: decodedRawText || draft.import_original_text || draft.original_text || draft.description || "",
    original_text: decodedRawText || draft.original_text || draft.description || "",
    source_url: draft.source_url || fallbackUrl || "",
    import_source_url: draft.import_source_url || draft.source_url || fallbackUrl || "",
    author_profile_url: "",
    import_author_profile_url: "",
    show_source_url: false,
    show_author_profile_url: false,
    category: draft.category || "pune",
    job_type: draft.job_type || jobType || "ofroj",
    image_urls: imageUrls,
    main_image_index: mainImageIndex,
    image_url: imageUrls[mainImageIndex] || draft.image_url || "",
    image_focus_json: pruneImageFocusMap(draft.image_focus_json, imageUrls),
    status: "pending",
  });
};

const hasUsefulAiDraft = (draft) => Boolean(draft?.title || draft?.description || draft?.profession || draft?.city || draft?.country);

const removeUrlsFromContactInfo = (contactInfo = "", urls = []) => {
  const blocked = urls.map((item) => String(item || "").trim()).filter(Boolean);
  return sanitizeImportedText(contactInfo)
    .split(/\r?\n/)
    .filter((line) => {
      const value = line.trim();
      if (!value) return false;
      if (blocked.some((url) => value.includes(url))) return false;
      return !/facebook\.com\/(?:profile\.php|people|[^/\s]+\/?$)/i.test(value);
    })
    .join("\n")
    .trim();
};

const getImportErrorMessage = (error) => {
  const message = String(error?.message || error?.response?.data?.error || error || "");
  if (/502|bad gateway|timeout|network/i.test(message)) {
    return "Shërbimi i leximit/AI nuk u përgjigj për momentin. Ngjit tekstin e njoftimit dhe provo përsëri; linku ruhet për gjurmim.";
  }
  return message || "Gabim gjatë importimit. Për Facebook përdor tekstin e kopjuar, sepse linku shpesh nuk lexohet nga jashtë.";
};

export default function ImportJobForm({ user, onDone }) {
  const [url, setUrl] = useState("");
  const [authorUrl, setAuthorUrl] = useState("");
  const [rawText, setRawText] = useState("");
  const [jobType, setJobType] = useState("ofroj");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState("input");
  const [drafts, setDrafts] = useState([]);
  const [selectedDraftIndex, setSelectedDraftIndex] = useState(0);
  const isStaff = user?.role === "admin" || user?.role === "moderator";
  const data = drafts[selectedDraftIndex] || null;
  const hasMultipleDrafts = drafts.length > 1;

  const setDraftList = (items) => {
    setDrafts(items);
    setSelectedDraftIndex(0);
  };

  const extractDraftsWithAi = async ({ text, sourceUrl, importedData = {}, requireSourceText = false }) => {
    const prompt = `Je asistent importi për Antokton. Nxirr njoftime pune nga teksti/linku më poshtë.

Rregulla:
- Nëse ka disa vende pune/profesione/rekrutime, kthe secilin si objekt më vete në jobs[].
- Mos shpik pagë, qytet, shtet, punëdhënës, kontakt, ose link.
- Profesioni duhet të jetë i plotësuar kur del nga teksti dhe të jetë i shkurtër: 1-3 fjalë.
- Përshkrimi duhet të jetë shqip i pastër, por me faktet e ruajtura.
- Mos përdor tekst me të gjitha shkronjat e mëdha; ktheje në drejtshkrim normal.
- Kontaktet mbaji në contact_info/phone_number, mos i përziej në përshkrim.
- Nëse linku nuk jep përmbajtje të lexueshme, kthe read_success=false dhe jobs=[].
- Nëse ka vetëm link, provo ta lexosh linkun publik. Mos përdor vetëm URL-në si tekst njoftimi.
- Kur lexon vetëm nga linku, kthe edhe source_text me tekstin origjinal të lexuar nga linku. Pa source_text të lexueshëm, read_success duhet të jetë false.
- Nëse teksti del me encoding të prishur, p.sh. PunÃ«tor, kthe read_success=false.

Linku i burimit: ${sourceUrl || ""}

Teksti/të dhënat:
${text || importedData.description || importedData.title || ""}`;

    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: Boolean(sourceUrl),
        response_json_schema: {
          type: "object",
          properties: {
            read_success: { type: "boolean" },
            source_text: { type: "string" },
            jobs: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  profession: { type: "string" },
                  category: { type: "string" },
                  country: { type: "string" },
                  city: { type: "string" },
                  address: { type: "string" },
                  salary_info: { type: "string" },
                  phone_number: { type: "string" },
                  contact_info: { type: "string" },
                  required_skills: { type: "string" },
                  contract_type: { type: "string" },
                  experience_level: { type: "string" }
                }
              }
            },
            warning: { type: "string" }
          }
        }
      });

      const jobs = Array.isArray(response?.jobs) ? response.jobs.filter(hasUsefulAiDraft) : [];
      const sourceText = text || response?.source_text || importedData.description || "";
      const sourceTextOk = hasImportableText(sourceText);
      const readSuccess = response?.read_success !== false && (Boolean(text) || sourceTextOk) && (!requireSourceText || sourceTextOk);
      return {
        readSuccess,
        warning: response?.warning || "",
        drafts: dedupeDrafts(jobs.map((job) => normalizeDraft(sourceText || job.description || "", {
          ...importedData,
          ...job,
          category: job.category || importedData.category || "pune",
          source_url: sourceUrl || importedData.source_url || "",
        }, sourceUrl, jobType)), sourceText).filter(isMeaningfulDraft),
      };
    } catch {
      return { readSuccess: false, warning: "", drafts: [] };
    }
  };

  const handleImport = async () => {
    const cleanUrl = normalizeImportUrl(url);
    const cleanText = rawText.trim();
    if (!cleanUrl && !cleanText) {
      setError("Ngjit linkun ose tekstin e njoftimit para importimit.");
      return;
    }
    if (cleanUrl && isFacebookUrl(cleanUrl) && !cleanText) {
      if (cleanUrl !== url.trim()) setUrl(cleanUrl);
      setDraftList([]);
      setStep("input");
      setError("Për Facebook, kopjo tekstin e postimit këtu. Linku ruhet vetëm për gjurmim.");
      return;
    }

    setLoading(true);
    setError("");
    if (cleanUrl && cleanUrl !== url.trim()) setUrl(cleanUrl);

    try {
      if (cleanText) {
        const baseDraft = { source_url: cleanUrl };
        const heuristicDrafts = buildHeuristicDrafts(cleanText, baseDraft, cleanUrl, jobType);
        const aiResult = cleanUrl && isFacebookUrl(cleanUrl)
          ? { drafts: [], warning: "" }
          : await extractDraftsWithAi({ text: cleanText, sourceUrl: cleanUrl, importedData: baseDraft });
        const nextDrafts = cleanUrl && isFacebookUrl(cleanUrl)
          ? heuristicDrafts
          : (heuristicDrafts.length > aiResult.drafts.length
            ? heuristicDrafts
            : (aiResult.drafts.length ? aiResult.drafts : heuristicDrafts));
        setDraftList(nextDrafts);
        if (nextDrafts.length > 1) {
          setError(`U gjetën ${nextDrafts.length} pozicione. Kontrollo secilin draft veçmas para publikimit.`);
        } else if (aiResult.warning) {
          setError(aiResult.warning);
        }
        setStep("preview");
        return;
      }

      const aiFromUrl = await extractDraftsWithAi({ text: "", sourceUrl: cleanUrl, importedData: { source_url: cleanUrl }, requireSourceText: true });
      if (aiFromUrl.readSuccess && aiFromUrl.drafts.length) {
        setDraftList(aiFromUrl.drafts);
        if (aiFromUrl.drafts.length > 1) {
          setError(`U gjetën ${aiFromUrl.drafts.length} pozicione. Kontrollo secilin draft veçmas para publikimit.`);
        } else if (aiFromUrl.warning) {
          setError(aiFromUrl.warning);
        }
        setStep("preview");
        return;
      }

      const res = await base44.functions.invoke("importJobPost", { url: cleanUrl, job_type: jobType });
      if (res.data?.success) {
        const importedText = importedTextFromData(res.data.data);
        if (!hasImportableText(importedText)) {
          setDraftList([]);
          setStep("input");
          setError("Ky link nuk dha tekst të lexueshëm për njoftimin. Për Facebook/grupe private sistemi nuk mund të lexojë postimin vetëm nga linku; ngjit tekstin e postimit ose përdor një link publik që shfaq përmbajtjen pa login.");
          return;
        }
        const importedBase = { ...res.data.data, author_profile_url: "", import_author_profile_url: "" };
        const heuristicDrafts = buildHeuristicDrafts(importedText, importedBase, cleanUrl, jobType).filter(isMeaningfulDraft);
        const aiResult = await extractDraftsWithAi({ text: importedText, sourceUrl: cleanUrl, importedData: importedBase });
        const nextDrafts = heuristicDrafts.length > aiResult.drafts.length
          ? heuristicDrafts
          : (aiResult.drafts.length ? aiResult.drafts : heuristicDrafts);
        if (!nextDrafts.length) {
          setDraftList([]);
          setStep("input");
          setError("Nuk u krijua draft i besueshëm nga ky link. Sistemi nuk do të publikojë draft të pasaktë; ngjit tekstin e plotë të njoftimit ose përdor link publik me përmbajtje të lexueshme.");
          return;
        }
        setDraftList(nextDrafts);
        const weakImport = !importedText || !nextDrafts.every(isMeaningfulDraft);
        if (weakImport) {
          setError("Linku nuk dha të dhëna të mjaftueshme për profesion/lokacion. Nëse është Facebook/grup privat, ngjit tekstin e postimit; sistemi nuk mund të anashkalojë kufizimet e login-it.");
        } else if (nextDrafts.length > 1) {
          setError(`U gjetën ${nextDrafts.length} pozicione. Kontrollo secilin draft veçmas para publikimit.`);
        } else if (aiResult.warning) {
          setError(aiResult.warning);
        }
        setStep("preview");
      } else {
        setError(getImportErrorMessage(res.data?.error || "Nuk u mundua të importohet njoftimi."));
      }
    } catch (e) {
      setError(getImportErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const saveDraft = async (draft, status) => {
    const prepared = normalizeDraft(draft.import_original_text || draft.original_text || draft.description || "", draft, url.trim(), draft.job_type || jobType);
    const contactUrl = String(prepared.author_profile_url || prepared.import_author_profile_url || authorUrl || "").trim();
    const sourceUrl = prepared.source_url || url.trim();
    const platformPosterName = isStaff ? String(draft.poster_name || STAFF_DEFAULT_POSTER_NAME).trim() : "";
    const images = (Array.isArray(prepared.image_urls) ? prepared.image_urls : prepared.image_url ? [prepared.image_url] : [])
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .slice(0, 6);
    const mainImageIndex = Math.min(
      Math.max(Number.parseInt(prepared.main_image_index, 10) || 0, 0),
      Math.max(images.length - 1, 0)
    );
    const contactInfoWarning = getContactInfoInTextMessage(prepared.description);
    if (contactInfoWarning) {
      throw new Error(contactInfoWarning);
    }
    const phoneNumber = normalizePhoneForCountry(
      prepared.phone_number,
      prepared.country,
      `${prepared.city || ""} ${prepared.address || ""} ${prepared.description || ""} ${prepared.import_original_text || ""}`
    );
    if (phoneNumber && !isValidInternationalPhone(phoneNumber)) {
      throw new Error(getInternationalPhoneError("Numri i telefonit"));
    }
    const expiry = buildExpiryFields({
      ...prepared,
      category: prepared.category || "pune",
      job_type: prepared.job_type || prepared.listing_type || "ofroj",
    });
    await base44.entities.Job.create({
      ...prepared,
      poster_name: platformPosterName || undefined,
      contact_info: removeUrlsFromContactInfo(prepared.contact_info, [contactUrl, sourceUrl]),
      phone_number: phoneNumber || "",
      phone_app: phoneNumber ? (prepared.phone_app || "telefon") : "",
      image_urls: images,
      main_image_index: mainImageIndex,
      image_url: images[mainImageIndex] || prepared.image_url || "",
      image_focus_json: pruneImageFocusMap(prepared.image_focus_json || draft.image_focus_json, images),
      source_url: sourceUrl,
      author_profile_url: contactUrl,
      import_source_url: prepared.import_source_url || sourceUrl,
      import_author_profile_url: contactUrl,
      show_source_url: prepared.show_source_url === true,
      show_author_profile_url: contactUrl ? prepared.show_author_profile_url === true : false,
      import_original_text: prepared.import_original_text || prepared.original_text || "",
      imported_community_request: true,
      import_type: "job_import_assistant",
      importer_email: user?.email || "",
      status,
      moderation_status: status === "approved" ? "approved" : "pending",
      is_halal_compliant: Number(prepared.hallall_score ?? prepared.ethical_score ?? 0) >= 60,
      ...expiry,
    });
  };

  const handlePublish = async (status, publishAll = false) => {
    const targets = publishAll ? drafts : [data].filter(Boolean);
    if (!targets.length) return;

    setSaving(true);
    try {
      for (const draft of targets) {
        await saveDraft(draft, status);
      }
      setStep("done");
      setTimeout(() => onDone?.(), 1200);
    } catch (e) {
      setError("Gabim gjatë ruajtjes: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const set = (key, val) => setDrafts((items) => items.map((item, index) => (
    index === selectedDraftIndex ? { ...item, [key]: val } : item
  )));

  const updateSelectedDraft = (patch) => setDrafts((items) => items.map((item, index) => (
    index === selectedDraftIndex ? { ...item, ...patch } : item
  )));

  const setMainImage = (index) => {
    const images = Array.isArray(data?.image_urls) ? data.image_urls : [];
    updateSelectedDraft({ main_image_index: index, image_url: images[index] || "" });
  };

  const removeImage = (index) => {
    const images = (Array.isArray(data?.image_urls) ? data.image_urls : []).filter((_, i) => i !== index);
    const mainImageIndex = Math.min(Number(data?.main_image_index || 0), Math.max(images.length - 1, 0));
    updateSelectedDraft({
      image_urls: images,
      main_image_index: mainImageIndex,
      image_url: images[mainImageIndex] || "",
      image_focus_json: pruneImageFocusMap(data?.image_focus_json, images),
    });
  };

  const updateSelectedImageFocus = (focus) => {
    const images = Array.isArray(data?.image_urls) ? data.image_urls : [];
    const selectedImage = images[Math.min(Number(data?.main_image_index || 0), Math.max(images.length - 1, 0))] || "";
    updateSelectedDraft({
      image_focus_json: updateImageFocus(data?.image_focus_json, selectedImage, focus),
    });
  };

  const handleUploadImages = async (event) => {
    const currentImages = Array.isArray(data?.image_urls) ? data.image_urls : [];
    const slots = Math.max(0, 6 - currentImages.length);
    const files = Array.from(event.target.files || []).slice(0, slots);
    event.target.value = "";
    if (!files.length) return;

    setSaving(true);
    setError("");
    try {
      const uploads = await Promise.all(files.map((file) => base44.integrations.Core.UploadFile({ file })));
      const nextImages = [...currentImages, ...uploads.map((item) => item?.file_url).filter(Boolean)].slice(0, 6);
      const mainImageIndex = currentImages.length === 0
        ? 0
        : Math.min(Number(data?.main_image_index || 0), Math.max(nextImages.length - 1, 0));
      updateSelectedDraft({
        image_urls: nextImages,
        main_image_index: mainImageIndex,
        image_url: nextImages[mainImageIndex] || "",
      });
    } catch (e) {
      setError(e?.message || "Fotot nuk u ngarkuan. Provo përsëri.");
    } finally {
      setSaving(false);
    }
  };

  if (step === "done") {
    return (
      <div className="text-center py-16 space-y-3">
        <CheckCircle2 className="w-14 h-14 text-[#9bffd6] mx-auto" />
        <p className="text-white font-bold text-xl">Njoftimi u importua!</p>
        <p className="text-white/50 text-sm">Draft-et u shtuan dhe do të shfaqen sipas statusit të zgjedhur.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="rounded-xl border border-[#8ab4ff]/20 bg-[#8ab4ff]/5 p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <ClipboardPaste className="w-4 h-4 text-[#8ab4ff]" />
          <span className="text-white font-semibold text-sm">Importo njoftim pune</span>
        </div>
        <p className="text-white/50 text-xs leading-relaxed">
          Për Facebook Groups përdor tekstin e kopjuar manualisht. Për faqe publike mund të përdorësh edhe linkun. Sistemi krijon draft që ti e kontrollon para publikimit.
        </p>

        <div className="space-y-2">
          <label className="text-white/60 text-xs flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> Teksti origjinal i njoftimit</label>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={8}
            placeholder="Ngjit këtu tekstin e postimit nga Facebook, WhatsApp, Telegram, website etj."
            className="w-full rounded-lg text-sm p-3 resize-y focus:outline-none focus:border-[#8ab4ff]/50"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 space-y-2">
            <label className="text-white/60 text-xs flex items-center gap-1"><Link2 className="w-3.5 h-3.5" /> Linku i burimit, opsional</label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://facebook.com/... ose link website"
              className="bg-white/5 border-white/15 text-white placeholder:text-white/30"
              style={{ background: "rgba(255,255,255,0.05)", color: "#fff" }}
              onKeyDown={(e) => e.key === "Enter" && !loading && handleImport()}
            />
          </div>
          <div className="flex-1 space-y-2">
            <label className="text-white/60 text-xs flex items-center gap-1"><User className="w-3.5 h-3.5" /> Linku i kontaktit nga burimi, opsional</label>
            <Input
              value={authorUrl}
              onChange={(e) => setAuthorUrl(e.target.value)}
              placeholder="https://facebook.com/profile..."
              className="bg-white/5 border-white/15 text-white placeholder:text-white/30"
              style={{ background: "rgba(255,255,255,0.05)", color: "#fff" }}
            />
          </div>
          <div className="sm:w-44 space-y-2">
            <label className="text-white/60 text-xs block">Lloji</label>
            <Select value={jobType} onValueChange={setJobType}>
              <SelectTrigger className="border-white/15 text-white text-sm" style={{ background: "rgba(255,255,255,0.05)", color: "#fff" }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0b1020] border-white/10">
                {JOB_TYPES.map((t) => <SelectItem key={t.value} value={t.value} className="text-white">{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <button
          onClick={handleImport}
          disabled={(!url.trim() && !rawText.trim()) || loading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-[#0b1020] disabled:opacity-40 transition-all"
          style={{ background: "linear-gradient(to right, #8ab4ff, #9bffd6)" }}
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Duke përpunuar...</> : <><Sparkles className="w-4 h-4" /> Përpuno dhe krijo draft</>}
        </button>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}
      </div>

      {step === "preview" && data && (
        <>
          <div className="flex items-center gap-2 text-[#9bffd6] text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" /> Drafti u krijua — kontrolloje dhe redaktoje para publikimit
          </div>

          {hasMultipleDrafts && (
            <div className="rounded-xl border border-[#8ab4ff]/20 bg-[#8ab4ff]/10 p-3 space-y-3">
              <p className="text-[#9bffd6] text-xs font-bold">Të gjitha draft-et para miratimit ({drafts.length})</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {drafts.map((draft, index) => (
                  <button
                    key={`${draft.title}-${index}`}
                    type="button"
                    onClick={() => setSelectedDraftIndex(index)}
                    className={`rounded-lg border p-3 text-left transition-colors ${selectedDraftIndex === index ? "border-[#8ab4ff] bg-[#8ab4ff]/20 text-white" : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"}`}
                  >
                    <span className="block text-[10px] uppercase tracking-wide text-white/40">Draft {index + 1}</span>
                    <span className="block text-sm font-semibold text-white">{draft.title || "Njoftim pune"}</span>
                    <span className="mt-1 block text-xs text-white/65">
                      {[draft.profession, draft.city || draft.address, draft.phone_number].filter(Boolean).join(" • ") || "Kontrollo fushat"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Briefcase className="w-4 h-4 text-[#8ab4ff]" />
              <span className="text-white font-semibold text-sm">Pozicioni</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-white/50 text-xs mb-1 block">Titulli *</label>
                <Input value={data.title || ""} onChange={(e) => set("title", e.target.value)} className="bg-white/5 border-white/10 text-white" style={{ background: "rgba(255,255,255,0.05)", color: "#fff" }} />
              </div>
              <div>
                <label className="text-white/50 text-xs mb-1 block">Profesioni</label>
                <Input value={data.profession || ""} onChange={(e) => set("profession", e.target.value)} placeholder="p.sh. Shofer, Kuzhinier..." className="bg-white/5 border-white/10 text-white" style={{ background: "rgba(255,255,255,0.05)", color: "#fff" }} />
              </div>
              <div>
                <label className="text-white/50 text-xs mb-1 block">Lloji i punës</label>
                <Select value={data.job_type || jobType} onValueChange={(v) => set("job_type", v)}>
                  <SelectTrigger className="border-white/10 text-white text-sm" style={{ background: "rgba(255,255,255,0.05)", color: "#fff" }}><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#0b1020] border-white/10">
                    {JOB_TYPES.map((t) => <SelectItem key={t.value} value={t.value} className="text-white">{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-white/50 text-xs mb-1 block">Lloji i kontratës</label>
                <Select value={data.contract_type || ""} onValueChange={(v) => set("contract_type", v)}>
                  <SelectTrigger className="border-white/10 text-white text-sm" style={{ background: "rgba(255,255,255,0.05)", color: "#fff" }}><SelectValue placeholder="Zgjidh..." /></SelectTrigger>
                  <SelectContent className="bg-[#0b1020] border-white/10">
                    {CONTRACT_TYPES.map((t) => <SelectItem key={t.value} value={t.value} className="text-white">{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-white/50 text-xs mb-1 block">Niveli i përvojës</label>
                <Select value={data.experience_level || ""} onValueChange={(v) => set("experience_level", v)}>
                  <SelectTrigger className="border-white/10 text-white text-sm" style={{ background: "rgba(255,255,255,0.05)", color: "#fff" }}><SelectValue placeholder="Zgjidh..." /></SelectTrigger>
                  <SelectContent className="bg-[#0b1020] border-white/10">
                    {EXPERIENCE_LEVELS.map((t) => <SelectItem key={t.value} value={t.value} className="text-white">{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-white/50 text-xs mb-1 block flex items-center gap-1"><DollarSign className="w-3 h-3" /> Paga / Kompensimi</label>
                <Input value={data.salary_info || ""} onChange={(e) => set("salary_info", e.target.value)} placeholder="p.sh. 800-1200€/muaj" className="bg-white/5 border-white/10 text-white" style={{ background: "rgba(255,255,255,0.05)", color: "#fff" }} />
              </div>
            </div>
            <div>
              <label className="text-white/50 text-xs mb-1 block">Aftësitë e kërkuara</label>
              <Input value={data.required_skills || ""} onChange={(e) => set("required_skills", e.target.value)} placeholder="p.sh. patentë C, komunikim, përvojë..." className="bg-white/5 border-white/10 text-white" style={{ background: "rgba(255,255,255,0.05)", color: "#fff" }} />
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
            <div className="flex items-center gap-2 mb-1"><FileText className="w-4 h-4 text-[#9bffd6]" /><span className="text-white font-semibold text-sm">Përshkrimi</span></div>
            <textarea value={data.description || ""} onChange={(e) => set("description", e.target.value)} rows={7} className="w-full rounded-lg text-sm p-3 resize-none focus:outline-none focus:border-[#8ab4ff]/50" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1"><MapPin className="w-4 h-4 text-[#fbbf24]" /><span className="text-white font-semibold text-sm">Vendndodhja</span></div>
            <LocationPicker
              value={{
                address: data.address || "",
                city: data.city || "",
                country: data.country || "",
                zone: data.zone || "",
                location_precision: data.location_precision || "sakte",
              }}
              onChange={(location) => {
                setDraftList(drafts.map((draft, index) => index === selectedDraftIndex ? {
                  ...draft,
                  address: location.address || "",
                  city: location.city || "",
                  country: location.country || "",
                  zone: location.zone || "",
                  location_precision: location.location_precision || "sakte",
                } : draft));
              }}
            />
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1"><Phone className="w-4 h-4 text-[#9bffd6]" /><span className="text-white font-semibold text-sm">Kontakti</span></div>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px_1fr] gap-3">
              <div>
                <label className="text-white/50 text-xs mb-1 flex items-center gap-1 block">Numri i telefonit {!data.phone_number && <span className="text-yellow-400/70 text-[10px]">(shtoje nëse mungon)</span>}</label>
                <Input value={data.phone_number || ""} onChange={(e) => set("phone_number", e.target.value)} placeholder={PHONE_PLACEHOLDER} className={`bg-white/5 border-white/10 text-white ${!data.phone_number ? "border-yellow-400/30" : ""}`} style={{ background: "rgba(255,255,255,0.05)", color: "#fff" }} />
              </div>
              <div>
                <label className="text-white/50 text-xs mb-1 block">Lloji i kontaktit</label>
                <Select value={data.phone_app || "telefon"} onValueChange={(v) => set("phone_app", v)}>
                  <SelectTrigger className="border-white/10 text-white text-sm" style={{ background: "rgba(255,255,255,0.05)", color: "#fff" }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0b1020] border-white/10">
                    {PHONE_APPS.map((app) => (
                      <SelectItem key={app.value} value={app.value} className="text-white">{app.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-white/50 text-xs mb-1 block">Email ose info tjetër kontakti (opsional)</label>
                <Input value={data.contact_info || ""} onChange={(e) => set("contact_info", e.target.value)} placeholder="email, website, WhatsApp..." className="bg-white/5 border-white/10 text-white" style={{ background: "rgba(255,255,255,0.05)", color: "#fff" }} />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1"><User className="w-4 h-4 text-[#c084fc]" /><span className="text-white font-semibold text-sm">Linku i kontaktit nga burimi</span></div>
            {isStaff && (
              <div>
                <label className="text-white/50 text-xs mb-1 block">Emri i postuesit në platformë (opsional)</label>
                <Input
                  value={data.poster_name || STAFF_DEFAULT_POSTER_NAME}
                  onChange={(e) => set("poster_name", e.target.value)}
                  placeholder={STAFF_DEFAULT_POSTER_NAME}
                  className="bg-white/5 border-white/10 text-white"
                  style={{ background: "rgba(255,255,255,0.05)", color: "#fff" }}
                />
              </div>
            )}
            <p className="text-white/50 text-xs">
              Ky është profili/linku i personit ose faqes që mund të përdoret si kontakt publik nëse e lejon me checkbox.
            </p>
            <Input
              value={data.author_profile_url || data.import_author_profile_url || authorUrl || ""}
              onChange={(e) => {
                set("author_profile_url", e.target.value);
                set("import_author_profile_url", e.target.value);
              }}
              placeholder="https://facebook.com/profile... ose link kontakti"
              className="bg-white/5 border-white/10 text-white text-xs"
              style={{ background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.75)" }}
            />
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={data.show_author_profile_url === true}
                onChange={(e) => set("show_author_profile_url", e.target.checked)}
                disabled={!String(data.author_profile_url || data.import_author_profile_url || authorUrl || "").trim()}
                className="rounded border-white/20"
                style={{ accentColor: "#8ab4ff" }}
              />
              <span className="text-white/60 text-xs">Shfaq linkun e kontaktit publikisht</span>
            </label>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Image className="w-4 h-4 text-white/60" />
                <span className="text-white font-semibold text-sm">Fotot ({Math.min((data.image_urls || []).length, 6)}/6)</span>
              </div>
              <span className="text-white/40 text-xs">Ylli cakton foton kryesore</span>
            </div>

            {Array.isArray(data.image_urls) && data.image_urls.length > 0 && (
              <>
                <div className="mx-auto max-w-md rounded-xl border border-white/10 bg-black/20">
                  <ImageFocusPreview
                    src={data.image_urls[Math.min(Number(data.main_image_index || 0), data.image_urls.length - 1)]}
                    alt="Foto kryesore"
                    className="aspect-square w-full rounded-xl"
                    focus={getImageFocus(data.image_focus_json, data.image_urls[Math.min(Number(data.main_image_index || 0), data.image_urls.length - 1)])}
                    onChange={updateSelectedImageFocus}
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                </div>
                <ImageFocusControls
                  value={getImageFocus(data.image_focus_json, data.image_urls[Math.min(Number(data.main_image_index || 0), data.image_urls.length - 1)])}
                  onChange={updateSelectedImageFocus}
                />
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {data.image_urls.slice(0, 6).map((imgUrl, i) => {
                    const selected = Number(data.main_image_index || 0) === i;
                    const focus = getImageFocus(data.image_focus_json, imgUrl);
                    return (
                      <div key={`${imgUrl}-${i}`} className={`relative overflow-hidden rounded-lg border ${selected ? "border-[#9bffd6]" : "border-white/10"}`}>
                        <button type="button" onClick={() => setMainImage(i)} className="absolute left-1 top-1 rounded-full bg-black/60 p-1 text-white hover:text-[#ffd166]" title="Bëje foto kryesore">
                          <Star className={`h-3.5 w-3.5 ${selected ? "fill-[#ffd166] text-[#ffd166]" : ""}`} />
                        </button>
                        <button type="button" onClick={() => removeImage(i)} className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:text-red-300" title="Hiqe foton">
                          <X className="h-3.5 w-3.5" />
                        </button>
                        <img src={imgUrl} alt="" className="h-20 w-full object-cover" style={getImageFocusStyle(focus)} onError={(e) => { e.currentTarget.style.display = "none"; }} />
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            <label className={`inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/15 px-3 py-2.5 text-sm font-semibold text-white/75 hover:bg-white/10 ${(data.image_urls || []).length >= 6 ? "pointer-events-none opacity-45" : ""}`}>
              <Upload className="h-4 w-4" />
              Ngarko foto për Pazar
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleUploadImages} disabled={saving || (data.image_urls || []).length >= 6} />
            </label>
            <p className="text-white/40 text-xs">Ngarko deri në 6 foto. Fotoja me yll përdoret si foto kryesore dhe thumbnail në Pazar.</p>
          </div>

          <div>
            <label className="text-white/50 text-xs mb-1 block">Linku i njoftimit / burimit</label>
            <Input value={data.source_url || url} onChange={(e) => {
              set("source_url", e.target.value);
              set("import_source_url", e.target.value);
            }} className="bg-white/5 border-white/10 text-white text-xs" style={{ background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.75)" }} />
            <label className="mt-2 flex cursor-pointer items-start gap-2 text-white/50 text-xs">
              <input type="checkbox" checked={Boolean(data.show_source_url)} onChange={(e) => set("show_source_url", e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#8ab4ff]" />
              <span>Shfaq linkun e njoftimit publikisht. Lëre pa zgjedhur për ta ruajtur vetëm për gjurmim të postimit origjinal.</span>
            </label>
          </div>

          {error && <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm"><AlertCircle className="w-4 h-4 shrink-0" /> {error}</div>}

          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 pt-1">
            <button onClick={() => handlePublish("approved")} disabled={saving} className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-[#0b1020] disabled:opacity-40" style={{ background: "linear-gradient(to right, #8ab4ff, #9bffd6)" }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {isStaff ? "Publiko draftin" : "Publiko direkt"}
            </button>
            {isStaff && hasMultipleDrafts && (
              <button onClick={() => handlePublish("approved", true)} disabled={saving} className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-[#9bffd6] border border-[#9bffd6]/30 bg-[#9bffd6]/10 hover:bg-[#9bffd6]/20 transition-colors disabled:opacity-40">
                Publiko të gjitha ({drafts.length})
              </button>
            )}
            {!isStaff && <button onClick={() => handlePublish("pending")} disabled={saving} className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-[#8ab4ff] border border-[#8ab4ff]/30 bg-[#8ab4ff]/10 hover:bg-[#8ab4ff]/20 transition-colors disabled:opacity-40">Dërgo për moderim</button>}
            <button onClick={() => { setStep("input"); setDraftList([]); setError(""); }} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm text-white/50 border border-white/10 bg-white/5 hover:bg-white/10 transition-colors sm:ml-auto">← Importo tjetër</button>
          </div>
        </>
      )}
    </div>
  );
}
