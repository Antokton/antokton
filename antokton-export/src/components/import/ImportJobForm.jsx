import React, { useState } from "react";
import { base44 } from "@/api/antoktonClient";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Link2, Sparkles, CheckCircle2, AlertCircle, Phone, MapPin, User, Briefcase, DollarSign, FileText, Image } from "lucide-react";
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

export default function ImportJobForm({ user, onDone }) {
  const [url, setUrl] = useState("");
  const [jobType, setJobType] = useState("ofroj");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState("input"); // input | preview | done
  const [data, setData] = useState(null);
  const isStaff = user?.role === "admin" || user?.role === "moderator";

  const handleImport = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await base44.functions.invoke("importJobPost", { url: url.trim(), job_type: jobType });
      if (res.data?.success) {
        setData(extractImportedPostFields(res.data.data?.import_original_text || res.data.data?.original_text || res.data.data?.description || "", {
          ...res.data.data,
          source_url: res.data.data?.source_url || url.trim(),
          show_source_url: false,
        }));
        setStep("preview");
      } else {
        setError(res.data?.error || "Nuk u mundua të importohet njoftimi.");
      }
    } catch (e) {
      setError("Gabim gjatë importimit. Kontrolloni URL-në.");
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (status) => {
    if (!data) return;
    const prepared = extractImportedPostFields(data.import_original_text || data.original_text || data.description || "", data);
    const contactInfoWarning = getContactInfoInTextMessage(prepared.description);
    if (contactInfoWarning) {
      setError(contactInfoWarning);
      return;
    }
    if (!isValidInternationalPhone(prepared.phone_number)) {
      setError(getInternationalPhoneError("Numri i telefonit"));
      return;
    }
    const phoneNumber = normalizeInternationalPhone(prepared.phone_number);
    setSaving(true);
    try {
      await base44.entities.Job.create({
        ...prepared,
        phone_number: phoneNumber || "",
        source_url: prepared.source_url || url.trim(),
        show_source_url: Boolean(prepared.show_source_url),
        import_original_text: prepared.import_original_text || prepared.original_text || "",
        status: status,
        moderation_status: status === "approved" ? "approved" : "pending",
        is_halal_compliant: true,
      });
      setStep("done");
      setTimeout(() => onDone?.(), 1800);
    } catch (e) {
      setError("Gabim gjatë ruajtjes: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const set = (key, val) => setData(d => ({ ...d, [key]: val }));

  if (step === "done") {
    return (
      <div className="text-center py-16 space-y-3">
        <CheckCircle2 className="w-14 h-14 text-[#9bffd6] mx-auto" />
        <p className="text-white font-bold text-xl">Njoftimi u importua!</p>
        <p className="text-white/50 text-sm">Njoftimi u shtua dhe do të shfaqet sipas statusit të zgjedhur.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Step 1: URL Input */}
      <div className="rounded-xl border border-[#8ab4ff]/20 bg-[#8ab4ff]/5 p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Link2 className="w-4 h-4 text-[#8ab4ff]" />
          <span className="text-white font-semibold text-sm">Linku i njoftimit të punës</span>
        </div>
        <p className="text-white/50 text-xs">Ngjit linkun nga OLX, Merrjep, Merrfal, LinkedIn, Facebook, Indeed, ose çdo faqe tjetër.</p>

        <div className="flex gap-2">
          <Input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://www.olx.al/oferta/... ose https://linkedin.com/jobs/..."
            className="flex-1 bg-white/5 border-white/15 text-white placeholder:text-white/30"
            style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }}
            onKeyDown={e => e.key === 'Enter' && !loading && handleImport()}
          />
          <Select value={jobType} onValueChange={setJobType}>
            <SelectTrigger className="w-40 border-white/15 text-white text-sm shrink-0" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#0b1020] border-white/10">
              {JOB_TYPES.map(t => <SelectItem key={t.value} value={t.value} className="text-white">{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <button
          onClick={handleImport}
          disabled={!url.trim() || loading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-[#0b1020] disabled:opacity-40 transition-all"
          style={{ background: 'linear-gradient(to right, #8ab4ff, #9bffd6)' }}
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Duke marrë të dhënat me AI...</> : <><Sparkles className="w-4 h-4" /> Importo & Analizo</>}
        </button>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}
      </div>

      {/* Step 2: Preview & Edit */}
      {step === "preview" && data && (
        <>
          <div className="flex items-center gap-2 text-[#9bffd6] text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" /> Të dhënat u morën me sukses — mund t'i redaktosh para publikimit
          </div>

          {/* Title & Profession */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Briefcase className="w-4 h-4 text-[#8ab4ff]" />
              <span className="text-white font-semibold text-sm">Pozicioni</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-white/50 text-xs mb-1 block">Titulli *</label>
                <Input value={data.title || ""} onChange={e => set("title", e.target.value)}
                  className="bg-white/5 border-white/10 text-white" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }} />
              </div>
              <div>
                <label className="text-white/50 text-xs mb-1 block">Profesioni</label>
                <Input value={data.profession || ""} onChange={e => set("profession", e.target.value)}
                  placeholder="p.sh. Programues, Kuzhinier..."
                  className="bg-white/5 border-white/10 text-white" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }} />
              </div>
              <div>
                <label className="text-white/50 text-xs mb-1 block">Lloji i punës</label>
                <Select value={data.job_type} onValueChange={v => set("job_type", v)}>
                  <SelectTrigger className="border-white/10 text-white text-sm" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0b1020] border-white/10">
                    {JOB_TYPES.map(t => <SelectItem key={t.value} value={t.value} className="text-white">{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-white/50 text-xs mb-1 block">Lloji i kontratës</label>
                <Select value={data.contract_type || ""} onValueChange={v => set("contract_type", v)}>
                  <SelectTrigger className="border-white/10 text-white text-sm" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }}>
                    <SelectValue placeholder="Zgjidh..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0b1020] border-white/10">
                    {CONTRACT_TYPES.map(t => <SelectItem key={t.value} value={t.value} className="text-white">{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-white/50 text-xs mb-1 block">Niveli i përvojës</label>
                <Select value={data.experience_level || ""} onValueChange={v => set("experience_level", v)}>
                  <SelectTrigger className="border-white/10 text-white text-sm" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }}>
                    <SelectValue placeholder="Zgjidh..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0b1020] border-white/10">
                    {EXPERIENCE_LEVELS.map(t => <SelectItem key={t.value} value={t.value} className="text-white">{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-white/50 text-xs mb-1 block flex items-center gap-1"><DollarSign className="w-3 h-3" /> Paga / Kompensimi</label>
                <Input value={data.salary_info || ""} onChange={e => set("salary_info", e.target.value)}
                  placeholder="p.sh. 800-1200€/muaj"
                  className="bg-white/5 border-white/10 text-white" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }} />
              </div>
            </div>
            <div>
              <label className="text-white/50 text-xs mb-1 block">Aftësitë e kërkuara</label>
              <Input value={data.required_skills || ""} onChange={e => set("required_skills", e.target.value)}
                placeholder="p.sh. JavaScript, React, komunikim..."
                className="bg-white/5 border-white/10 text-white" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }} />
            </div>
          </div>

          {/* Description */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-[#9bffd6]" />
              <span className="text-white font-semibold text-sm">Përshkrimi</span>
            </div>
            <textarea
              value={data.description || ""}
              onChange={e => set("description", e.target.value)}
              rows={7}
              className="w-full rounded-lg text-sm p-3 resize-none focus:outline-none focus:border-[#8ab4ff]/50"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
            />
          </div>

          {/* Location */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-4 h-4 text-[#fbbf24]" />
              <span className="text-white font-semibold text-sm">Vendndodhja</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-white/50 text-xs mb-1 block">Qyteti</label>
                <Input value={data.city || ""} onChange={e => set("city", e.target.value)}
                  className="bg-white/5 border-white/10 text-white" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }} />
              </div>
              <div>
                <label className="text-white/50 text-xs mb-1 block">Shteti</label>
                <Input value={data.country || ""} onChange={e => set("country", e.target.value)}
                  className="bg-white/5 border-white/10 text-white" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }} />
              </div>
              <div>
                <label className="text-white/50 text-xs mb-1 block">Adresa</label>
                <Input value={data.address || ""} onChange={e => set("address", e.target.value)}
                  className="bg-white/5 border-white/10 text-white" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }} />
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Phone className="w-4 h-4 text-[#9bffd6]" />
              <span className="text-white font-semibold text-sm">Kontakti</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-white/50 text-xs mb-1 flex items-center gap-1 block">
                  Numri i telefonit
                  {!data.phone_number && <span className="text-yellow-400/70 text-[10px]">(shtoje nëse mungon)</span>}
                </label>
                <Input value={data.phone_number || ""} onChange={e => set("phone_number", e.target.value)}
                  placeholder={PHONE_PLACEHOLDER}
                  className={`bg-white/5 border-white/10 text-white ${!data.phone_number ? "border-yellow-400/30" : ""}`}
                  style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }} />
              </div>
              <div>
                <label className="text-white/50 text-xs mb-1 block">Kontakt tjetër (email, website)</label>
                <Input value={data.contact_info || ""} onChange={e => set("contact_info", e.target.value)}
                  placeholder="email@company.com"
                  className="bg-white/5 border-white/10 text-white" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }} />
              </div>
            </div>
          </div>

          {/* Poster */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <User className="w-4 h-4 text-[#c084fc]" />
              <span className="text-white font-semibold text-sm">Dhënësi / Kompania</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-white/50 text-xs mb-1 block">Emri</label>
                <Input value={data.poster_name || ""} onChange={e => set("poster_name", e.target.value)}
                  className="bg-white/5 border-white/10 text-white" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }} />
              </div>
              <div>
                <label className="text-white/50 text-xs mb-1 block">URL profili / kompanie</label>
                <Input value={data.author_profile_url || ""} onChange={e => set("author_profile_url", e.target.value)}
                  className="bg-white/5 border-white/10 text-white" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }} />
              </div>
            </div>
          </div>

          {/* Images preview */}
          {Array.isArray(data.image_urls) && data.image_urls.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <Image className="w-4 h-4 text-white/60" />
                <span className="text-white font-semibold text-sm">Fotot ({data.image_urls.length})</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {data.image_urls.slice(0, 5).map((imgUrl, i) => (
                  <img key={i} src={imgUrl} alt="" className="w-28 h-20 object-cover rounded-lg shrink-0 border border-white/10"
                    onError={e => e.target.style.display = 'none'} />
                ))}
              </div>
            </div>
          )}

          {/* Source URL */}
          <div>
            <label className="text-white/50 text-xs mb-1 block">Burimi origjinal (URL)</label>
            <Input value={data.source_url || url} onChange={e => set("source_url", e.target.value)}
              className="bg-white/5 border-white/10 text-white text-xs" style={{ background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.75)' }} />
            <label className="mt-2 flex cursor-pointer items-start gap-2 text-white/50 text-xs">
              <input
                type="checkbox"
                checked={Boolean(data.show_source_url)}
                onChange={e => set("show_source_url", e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#8ab4ff]"
              />
              <span>Shfaq linkun publikisht. Lëre pa zgjedhur për ta ruajtur vetëm për gjurmim të postimit origjinal.</span>
            </label>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 pt-1">
            <button
              onClick={() => handlePublish("approved")}
              disabled={saving}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-[#0b1020] disabled:opacity-40"
              style={{ background: 'linear-gradient(to right, #8ab4ff, #9bffd6)' }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {isStaff ? "Publiko njoftimin" : "Publiko direkt"}
            </button>
            {!isStaff && (
              <button
                onClick={() => handlePublish("pending")}
                disabled={saving}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-[#8ab4ff] border border-[#8ab4ff]/30 bg-[#8ab4ff]/10 hover:bg-[#8ab4ff]/20 transition-colors disabled:opacity-40"
              >
                Dërgo për moderim
              </button>
            )}
            <button
              onClick={() => { setStep("input"); setData(null); setError(""); }}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm text-white/50 border border-white/10 bg-white/5 hover:bg-white/10 transition-colors sm:ml-auto"
            >
              ← Importo tjetër
            </button>
          </div>
        </>
      )}
    </div>
  );
}
