import React, { useState } from "react";
import { base44 } from "@/api/antoktonClient";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Link2, Sparkles, CheckCircle2, AlertCircle, Phone, MapPin, User, Briefcase, DollarSign, FileText, Image, ClipboardPaste } from "lucide-react";
import { PHONE_PLACEHOLDER, getInternationalPhoneError, isValidInternationalPhone, normalizeInternationalPhone } from "@/lib/phone";
import { getContactInfoInTextMessage } from "@/lib/contentContactGuard";
import { extractImportedPostFields } from "@/lib/importExtractors";

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

const PROFESSION_KEYWORDS = [
  "punetor", "punëtor", "elektricist", "hidraulik", "shofer", "kuzhinier", "kamerier",
  "banakier", "murator", "gips", "gipskarton", "montues", "mekanik", "pastrues",
  "infermier", "programues", "saldues", "magazinier", "recepsionist", "operator",
  "teknik", "ndihmes", "ndihmës", "menaxher", "arkëtar", "shitës", "roje"
];

const SECTION_STOP_RE = /^(?:cfar[eë]|çfar[eë]|ofrojm[eë]|ofrohet|kushtet|benefitet|paga|pagesa|lokacioni|lokacion|vendndodhja|adresa|kontakt|tel|telefon|whatsapp|viber|email|apliko|na kontakto)\b/i;
const POSITION_SECTION_RE = /(?:pozicionet|pozitat|vende pune|fusha|profesione|rekrutim|k[eë]rkojm[eë]|kerkojme|k[eë]rkohet)/i;
const BULLET_RE = /^[\s\-–—•●▪▫*✅✔️☑️🔹🔸📌]+\s*/u;

const hasProfessionKeyword = (value = "") => {
  const normalized = String(value || "").toLowerCase();
  return PROFESSION_KEYWORDS.some((keyword) => normalized.includes(keyword));
};

const cleanRoleLine = (line = "") => String(line || "")
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
  .map((word) => word.charAt(0).toLocaleUpperCase("sq-AL") + word.slice(1))
  .join(" ");

const cleanImportedText = (value = "") => String(value || "")
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
    [/elektricist/, "Elektricist"],
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
  return titleCase(clean).split(/\s+/).slice(0, 3).join(" ");
};

const extractLocationFromText = (rawText = "") => {
  const lines = String(rawText || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const labelRe = /^(?:lokacioni|lokacion|vendndodhja|vendi|qyteti|qytet|adresa|adres[eë]|location|address)\s*[:\-–]\s*(.+)$/i;
  for (const line of lines) {
    const match = line.match(labelRe);
    if (!match?.[1]) continue;
    const value = cleanRoleLine(match[1]).replace(/\s*(?:deri|rreth)\s+\d+.*$/i, "").trim();
    const city = value.split(/[,;|/]| dhe | ose /i).map((part) => part.trim()).filter(Boolean).join(", ");
    return { address: value, city: city || value };
  }
  const knownCityMatch = String(rawText || "").match(/\b(G[uü]tersloh|Bielefeld|Berlin|Hamburg|München|Munich|Dortmund|Düsseldorf|Dusseldorf|Köln|Koln|Frankfurt)\b/gi);
  if (knownCityMatch?.length) {
    const city = Array.from(new Set(knownCityMatch.map((item) => titleCase(item.replace("Gutersloh", "Gütersloh"))))).join(", ");
    return { address: city, city };
  }
  return { address: "", city: "" };
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
  const rawLines = String(rawText || "").split(/\r?\n/);

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

const polishDraft = (draft = {}, rawText = "") => {
  const profession = inferProfession(draft.profession || draft.title || "");
  const location = extractLocationFromText(rawText || draft.import_original_text || draft.original_text || draft.description || "");
  const title = draft.title || profession || "Njoftim pune";
  return {
    ...draft,
    title: titleCase(title).split(/\s+/).slice(0, 10).join(" "),
    profession,
    description: cleanImportedText(draft.description || rawText || ""),
    city: draft.city || location.city || "",
    address: draft.address || location.address || "",
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

const buildHeuristicDrafts = (rawText = "", baseDraft = {}, fallbackUrl = "", jobType = "ofroj") => {
  const roles = splitRoleLines(rawText);
  if (!roles.length) return [normalizeDraft(rawText, baseDraft, fallbackUrl, jobType)];

  return roles.map((role) => normalizeDraft(rawText, {
    ...baseDraft,
    title: inferProfession(role),
    profession: baseDraft.profession || inferProfession(role),
    description: `${inferProfession(role)}\n\n${rawText}`.trim(),
  }, fallbackUrl, jobType));
};

const normalizeDraft = (rawText, draft = {}, fallbackUrl = "", jobType = "ofroj") => {
  const polished = polishDraft(draft, rawText);
  return extractImportedPostFields(rawText || "", {
    ...polished,
    title: polished.title || rawText?.split("\n").find(Boolean)?.slice(0, 90) || "Njoftim pune",
    description: polished.description || rawText || "",
    import_original_text: rawText || draft.import_original_text || draft.original_text || draft.description || "",
    original_text: rawText || draft.original_text || draft.description || "",
    source_url: draft.source_url || fallbackUrl || "",
    import_source_url: draft.import_source_url || draft.source_url || fallbackUrl || "",
    author_profile_url: draft.author_profile_url || "",
    import_author_profile_url: draft.import_author_profile_url || draft.author_profile_url || "",
    show_source_url: false,
    show_author_profile_url: false,
    category: draft.category || "pune",
    job_type: draft.job_type || jobType || "ofroj",
    status: "pending",
  });
};

const hasUsefulAiDraft = (draft) => Boolean(draft?.title || draft?.description || draft?.profession || draft?.city || draft?.country);

export default function ImportJobForm({ user, onDone }) {
  const [url, setUrl] = useState("");
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

  const extractDraftsWithAi = async ({ text, sourceUrl, importedData = {} }) => {
    const prompt = `Je asistent importi për Antokton. Nxirr njoftime pune nga teksti/linku më poshtë.

Rregulla:
- Nëse ka disa vende pune/profesione/rekrutime, kthe secilin si objekt më vete në jobs[].
- Mos shpik pagë, qytet, shtet, punëdhënës, kontakt, ose link.
- Profesioni duhet të jetë i plotësuar kur del nga teksti dhe të jetë i shkurtër: 1-3 fjalë.
- Përshkrimi duhet të jetë shqip i pastër, por me faktet e ruajtura.
- Mos përdor tekst me të gjitha shkronjat e mëdha; ktheje në drejtshkrim normal.
- Kontaktet mbaji në contact_info/phone_number, mos i përziej në përshkrim.
- Nëse linku nuk jep përmbajtje të lexueshme, përdor vetëm tekstin e dhënë dhe mos shpik.

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
                  poster_name: { type: "string" },
                  author_profile_url: { type: "string" },
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
      const sourceText = text || importedData.description || "";
      return {
        warning: response?.warning || "",
        drafts: dedupeDrafts(jobs.map((job) => normalizeDraft(sourceText, {
          ...importedData,
          ...job,
          category: job.category || importedData.category || "pune",
          source_url: sourceUrl || importedData.source_url || "",
        }, sourceUrl, jobType)), sourceText),
      };
    } catch {
      return { warning: "", drafts: [] };
    }
  };

  const handleImport = async () => {
    const cleanUrl = url.trim();
    const cleanText = rawText.trim();
    if (!cleanUrl && !cleanText) {
      setError("Ngjit linkun ose tekstin e njoftimit para importimit.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (cleanText) {
        const aiResult = await extractDraftsWithAi({ text: cleanText, sourceUrl: cleanUrl, importedData: { source_url: cleanUrl } });
        const nextDrafts = aiResult.drafts.length
          ? aiResult.drafts
          : buildHeuristicDrafts(cleanText, { source_url: cleanUrl }, cleanUrl, jobType);
        setDraftList(nextDrafts);
        if (nextDrafts.length > 1) {
          setError(`U gjetën ${nextDrafts.length} pozicione. Kontrollo secilin draft veçmas para publikimit.`);
        } else if (aiResult.warning) {
          setError(aiResult.warning);
        }
        setStep("preview");
        return;
      }

      const res = await base44.functions.invoke("importJobPost", { url: cleanUrl, job_type: jobType });
      if (res.data?.success) {
        const importedText = res.data.data?.import_original_text || res.data.data?.original_text || res.data.data?.description || "";
        const aiResult = await extractDraftsWithAi({ text: importedText, sourceUrl: cleanUrl, importedData: res.data.data });
        const nextDrafts = aiResult.drafts.length
          ? aiResult.drafts
          : buildHeuristicDrafts(importedText, res.data.data, cleanUrl, jobType);
        setDraftList(nextDrafts);
        const weakImport = !importedText || !nextDrafts.some((draft) => draft.profession || draft.city || draft.country);
        if (weakImport) {
          setError("Linku nuk dha të dhëna të mjaftueshme për profesion/lokacion. Nëse është Facebook/grup privat, ngjit tekstin e postimit; sistemi nuk mund të anashkalojë kufizimet e login-it.");
        } else if (nextDrafts.length > 1) {
          setError(`U gjetën ${nextDrafts.length} pozicione. Kontrollo secilin draft veçmas para publikimit.`);
        } else if (aiResult.warning) {
          setError(aiResult.warning);
        }
        setStep("preview");
      } else {
        setError(res.data?.error || "Nuk u mundua të importohet njoftimi.");
      }
    } catch (e) {
      setError("Gabim gjatë importimit. Për Facebook përdor tekstin e kopjuar, sepse linku shpesh nuk lexohet nga jashtë.");
    } finally {
      setLoading(false);
    }
  };

  const saveDraft = async (draft, status) => {
    const prepared = normalizeDraft(draft.import_original_text || draft.original_text || draft.description || "", draft, url.trim(), draft.job_type || jobType);
    const contactInfoWarning = getContactInfoInTextMessage(prepared.description);
    if (contactInfoWarning) {
      throw new Error(contactInfoWarning);
    }
    if (prepared.phone_number && !isValidInternationalPhone(prepared.phone_number)) {
      throw new Error(getInternationalPhoneError("Numri i telefonit"));
    }
    const phoneNumber = normalizeInternationalPhone(prepared.phone_number);
    await base44.entities.Job.create({
      ...prepared,
      phone_number: phoneNumber || "",
      source_url: prepared.source_url || url.trim(),
      author_profile_url: prepared.author_profile_url || "",
      import_source_url: prepared.import_source_url || prepared.source_url || url.trim(),
      import_author_profile_url: prepared.import_author_profile_url || prepared.author_profile_url || "",
      show_source_url: prepared.show_source_url === true,
      show_author_profile_url: prepared.show_author_profile_url === true,
      import_original_text: prepared.import_original_text || prepared.original_text || "",
      imported_community_request: true,
      import_type: "job_import_assistant",
      importer_email: user?.email || "",
      status,
      moderation_status: status === "approved" ? "approved" : "pending",
      is_halal_compliant: true,
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div><label className="text-white/50 text-xs mb-1 block">Qyteti</label><Input value={data.city || ""} onChange={(e) => set("city", e.target.value)} className="bg-white/5 border-white/10 text-white" style={{ background: "rgba(255,255,255,0.05)", color: "#fff" }} /></div>
              <div><label className="text-white/50 text-xs mb-1 block">Shteti</label><Input value={data.country || ""} onChange={(e) => set("country", e.target.value)} className="bg-white/5 border-white/10 text-white" style={{ background: "rgba(255,255,255,0.05)", color: "#fff" }} /></div>
              <div><label className="text-white/50 text-xs mb-1 block">Adresa</label><Input value={data.address || ""} onChange={(e) => set("address", e.target.value)} className="bg-white/5 border-white/10 text-white" style={{ background: "rgba(255,255,255,0.05)", color: "#fff" }} /></div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1"><Phone className="w-4 h-4 text-[#9bffd6]" /><span className="text-white font-semibold text-sm">Kontakti</span></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-white/50 text-xs mb-1 flex items-center gap-1 block">Numri i telefonit {!data.phone_number && <span className="text-yellow-400/70 text-[10px]">(shtoje nëse mungon)</span>}</label>
                <Input value={data.phone_number || ""} onChange={(e) => set("phone_number", e.target.value)} placeholder={PHONE_PLACEHOLDER} className={`bg-white/5 border-white/10 text-white ${!data.phone_number ? "border-yellow-400/30" : ""}`} style={{ background: "rgba(255,255,255,0.05)", color: "#fff" }} />
              </div>
              <div>
                <label className="text-white/50 text-xs mb-1 block">Kontakt tjetër</label>
                <Input value={data.contact_info || ""} onChange={(e) => set("contact_info", e.target.value)} placeholder="email, website, WhatsApp..." className="bg-white/5 border-white/10 text-white" style={{ background: "rgba(255,255,255,0.05)", color: "#fff" }} />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1"><User className="w-4 h-4 text-[#c084fc]" /><span className="text-white font-semibold text-sm">Dhënësi / Kompania</span></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className="text-white/50 text-xs mb-1 block">Emri</label><Input value={data.poster_name || ""} onChange={(e) => set("poster_name", e.target.value)} className="bg-white/5 border-white/10 text-white" style={{ background: "rgba(255,255,255,0.05)", color: "#fff" }} /></div>
              <div><label className="text-white/50 text-xs mb-1 block">Linku i postuesit / kontaktit</label><Input value={data.author_profile_url || ""} onChange={(e) => {
                set("author_profile_url", e.target.value);
                set("import_author_profile_url", e.target.value);
              }} className="bg-white/5 border-white/10 text-white" style={{ background: "rgba(255,255,255,0.05)", color: "#fff" }} /></div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={data.show_author_profile_url === true}
                onChange={(e) => set("show_author_profile_url", e.target.checked)}
                className="rounded border-white/20"
                style={{ accentColor: "#8ab4ff" }}
              />
              <span className="text-white/60 text-xs">Shfaq linkun e postuesit si kontakt publik</span>
            </label>
          </div>

          {Array.isArray(data.image_urls) && data.image_urls.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
              <div className="flex items-center gap-2 mb-1"><Image className="w-4 h-4 text-white/60" /><span className="text-white font-semibold text-sm">Fotot ({data.image_urls.length})</span></div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {data.image_urls.slice(0, 5).map((imgUrl, i) => <img key={i} src={imgUrl} alt="" className="w-28 h-20 object-cover rounded-lg shrink-0 border border-white/10" onError={(e) => { e.currentTarget.style.display = "none"; }} />)}
              </div>
            </div>
          )}

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
