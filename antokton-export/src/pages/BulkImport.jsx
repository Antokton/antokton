import React, { useState } from "react";
import { base44 } from "@/api/antoktonClient";
import { extractImportedPostFields } from "@/lib/importExtractors";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2, AlertCircle, Plus, Trash2, Send } from "lucide-react";

const COUNTRIES = [
  { value: "Angli", label: "Angli" },
  { value: "Belgjikë", label: "Belgjikë" },
  { value: "Francë", label: "Francë" },
  { value: "Gjermani", label: "Gjermani" },
  { value: "Itali", label: "Itali" },
  { value: "Antokton", label: "Antokton" },
];

const CATEGORIES = [
  { value: "pune", label: "Punë" },
  { value: "shtepi", label: "Shtëpi" },
  { value: "sherbime", label: "Shërbime" },
  { value: "edukim", label: "Edukim" },
  { value: "bamiresi", label: "Bamirësi" },
  { value: "media", label: "Media" },
  { value: "juridike", label: "Juridike" },
];

export default function BulkImport() {
  const [user, setUser] = useState(null);
  const [entries, setEntries] = useState([
    { id: 1, rawText: "", country: "Angli", category: "pune", status: "idle", result: null, error: null }
  ]);
  const [processingAll, setProcessingAll] = useState(false);

  React.useEffect(() => {
    const load = async () => {
      const auth = await base44.auth.isAuthenticated();
      if (auth) setUser(await base44.auth.me());
      else base44.auth.redirectToLogin();
    };
    load();
  }, []);

  const addEntry = () => {
    setEntries(prev => [...prev, {
      id: Date.now(), rawText: "", country: "Angli", category: "pune", status: "idle", result: null, error: null
    }]);
  };

  const removeEntry = (id) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const updateEntry = (id, field, value) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const processEntry = async (entry) => {
    if (!entry.rawText.trim()) return;

    updateEntry(entry.id, "status", "processing");
    updateEntry(entry.id, "error", null);

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Ti je ekspert i gjuhës shqipe dhe rekrutimit. Ke marrë një postim nga një grup Facebook pune për shqiptarët.

POSTIMI ORIGJINAL:
${entry.rawText}

Detyra jote:
1. Nxirr titullin kryesor të njoftimit (maksimum 80 karaktere, i qartë dhe profesional)
2. Rishkruaj të gjithë tekstin duke e korrigjuar drejtshkrimin dhe gramatikën sipas STANDARDIT TË GJUHËS SHQIPE. Mos përdor dialekte, mos përdor fjalë të huaja kur ekzistojnë shqip, mos shkurto fjalët, shkruaj saktë çdo fjalë. Mbaj të gjitha informacionet origjinale (pagë, kualifikime, kontakt, telefon, etj.).
3. Nxirr vendin/qytetin nëse përmendет
4. Nxirr profesionin nëse përmendет
5. Nxirr kontaktet, linkun burimor dhe lokacionin/adresën nëse përmenden. Mos i lër kontaktet brenda përshkrimit publik.

Kthe rezultatin SI JSON me këtë strukturë:
{
  "title": "titulli i njoftimit",
  "description": "teksti i plotë i korrigjuar në shqip standard, pa telefon/email/link brenda trupit",
  "city": "qyteti nëse ka, ose string bosh",
  "address": "adresa/lokacioni nëse ka, ose string bosh",
  "profession": "profesioni nëse ka, ose string bosh",
  "phone_number": "numri ndërkombëtar me + nëse ka, ose string bosh",
  "contact_info": "email, telefon lokal ose kontakt tjetër nëse ka, ose string bosh",
  "source_url": "linku origjinal nëse ka, ose string bosh",
  "import_original_text": "teksti origjinal i plotë"
}`,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            city: { type: "string" },
            address: { type: "string" },
            profession: { type: "string" },
            phone_number: { type: "string" },
            contact_info: { type: "string" },
            source_url: { type: "string" },
            import_original_text: { type: "string" }
          }
        }
      });

      updateEntry(entry.id, "result", extractImportedPostFields(entry.rawText, result));
      updateEntry(entry.id, "status", "ready");
    } catch (err) {
      updateEntry(entry.id, "error", err.message);
      updateEntry(entry.id, "status", "error");
    }
  };

  const processAll = async () => {
    setProcessingAll(true);
    const pending = entries.filter(e => e.rawText.trim() && e.status === "idle");
    for (const entry of pending) {
      await processEntry(entry);
    }
    setProcessingAll(false);
  };

  const publishEntry = async (entry) => {
    if (!entry.result) return;
    const result = extractImportedPostFields(entry.rawText, entry.result);
    updateEntry(entry.id, "status", "publishing");

    try {
      await base44.entities.Job.create({
        title: result.title,
        description: result.description,
        country: entry.country,
        city: result.city || "",
        address: result.address || "",
        category: entry.category,
        profession: result.profession || "",
        contact_info: result.contact_info || "",
        phone_number: result.phone_number || "",
        source_url: result.source_url || "",
        author_profile_url: result.author_profile_url || "",
        import_source_url: result.import_source_url || result.source_url || "",
        import_author_profile_url: result.import_author_profile_url || result.author_profile_url || "",
        importer_email: user?.email || "",
        show_source_url: result.show_source_url === true,
        show_author_profile_url: result.show_author_profile_url === true,
        import_original_text: result.import_original_text || entry.rawText,
        imported_community_request: true,
        import_type: "bulk_import_assistant",
        status: "approved",
        poster_name: user?.full_name || "Admin"
      });
      updateEntry(entry.id, "status", "published");
    } catch (err) {
      updateEntry(entry.id, "error", err.message);
      updateEntry(entry.id, "status", "error");
    }
  };

  const publishAll = async () => {
    const ready = entries.filter(e => e.status === "ready");
    for (const entry of ready) {
      await publishEntry(entry);
    }
  };

  const readyCount = entries.filter(e => e.status === "ready").length;
  const publishedCount = entries.filter(e => e.status === "published").length;

  if (!user || user.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-white/50">Vetëm adminët mund të aksesojnë këtë faqe.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Import Njoftimesh</h1>
        <p className="text-white/50 text-sm mt-1">Ngjit tekstin nga grupet e Facebook-ut — AI-ja korrigjon shqipen dhe nxjerr titullin.</p>
      </div>

      {/* Summary bar */}
      <div className="flex gap-3 mb-6">
        <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/60">
          <span className="text-white font-medium">{entries.length}</span> njoftime
        </div>
        {readyCount > 0 && (
          <div className="px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-xs text-green-400">
            <span className="font-medium">{readyCount}</span> gati për publikim
          </div>
        )}
        {publishedCount > 0 && (
          <div className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400">
            <span className="font-medium">{publishedCount}</span> publikuar
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <Button onClick={processAll} disabled={processingAll} className="bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] text-xs h-9">
          {processingAll ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
          Procesо të Gjitha me AI
        </Button>
        {readyCount > 0 && (
          <Button onClick={publishAll} className="bg-green-600 hover:bg-green-700 text-white text-xs h-9">
            <Send className="w-3.5 h-3.5 mr-1.5" />
            Publiko të Gjitha ({readyCount})
          </Button>
        )}
        <Button onClick={addEntry} variant="outline" className="border-white/20 text-white text-xs h-9">
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Shto Njoftim
        </Button>
      </div>

      {/* Entries */}
      <div className="space-y-4">
        {entries.map((entry, idx) => (
          <div key={entry.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-white/60 text-xs font-medium">Njoftimi #{idx + 1}</span>
              <div className="flex items-center gap-2">
                {entry.status === "published" && (
                  <span className="flex items-center gap-1 text-xs text-green-400">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Publikuar
                  </span>
                )}
                {entry.status === "error" && (
                  <span className="flex items-center gap-1 text-xs text-red-400">
                    <AlertCircle className="w-3.5 h-3.5" /> Gabim
                  </span>
                )}
                <button onClick={() => removeEntry(entry.id)} className="text-white/30 hover:text-red-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Country + Category */}
            <div className="flex gap-2 mb-3">
              <Select value={entry.country} onValueChange={(v) => updateEntry(entry.id, "country", v)}>
                <SelectTrigger className="h-8 w-40 bg-white/5 border-white/10 text-white text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0b1020] border-white/10 text-white">
                  {COUNTRIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={entry.category} onValueChange={(v) => updateEntry(entry.id, "category", v)}>
                <SelectTrigger className="h-8 w-36 bg-white/5 border-white/10 text-white text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0b1020] border-white/10 text-white">
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Raw text input */}
            <Textarea
              value={entry.rawText}
              onChange={(e) => updateEntry(entry.id, "rawText", e.target.value)}
              placeholder="Ngjit këtu tekstin e postimit nga Facebook..."
              className="bg-white/5 border-white/10 text-white text-xs min-h-[100px] mb-3 placeholder:text-white/30"
              disabled={["processing", "publishing", "published"].includes(entry.status)}
            />

            {/* AI Result preview */}
            {entry.result && (
              <div className="mb-3 p-3 rounded-lg bg-white/5 border border-[#8ab4ff]/20 space-y-2">
                <div>
                  <span className="text-[#8ab4ff] text-xs font-medium">Titulli:</span>
                  <p className="text-white text-sm mt-0.5">{entry.result.title}</p>
                </div>
                <div>
                  <span className="text-[#8ab4ff] text-xs font-medium">Teksti i korrigjuar:</span>
                  <p className="text-white/80 text-xs mt-0.5 whitespace-pre-wrap line-clamp-4">{entry.result.description}</p>
                </div>
                <div className="grid gap-1 sm:grid-cols-2">
                  {entry.result.import_original_text && <span className="text-white/50 text-xs">Origjinali: <span className="text-white/70">i ruajtur për gjurmim</span></span>}
                  {entry.result.city && <span className="text-white/50 text-xs">Qyteti: <span className="text-white">{entry.result.city}</span></span>}
                  {entry.result.address && <span className="text-white/50 text-xs">Lokacioni: <span className="text-white">{entry.result.address}</span></span>}
                  {entry.result.profession && <span className="text-white/50 text-xs">Profesioni: <span className="text-white">{entry.result.profession}</span></span>}
                  {entry.result.phone_number && <span className="text-white/50 text-xs">Telefon: <span className="text-white">{entry.result.phone_number}</span></span>}
                  {entry.result.contact_info && <span className="text-white/50 text-xs">Kontakt: <span className="text-white whitespace-pre-wrap">{entry.result.contact_info}</span></span>}
                  {entry.result.source_url && <span className="text-white/50 text-xs">Burimi: <span className="text-white break-all">{entry.result.source_url}</span></span>}
                </div>
              </div>
            )}

            {entry.error && (
              <p className="text-red-400 text-xs mb-3">{entry.error}</p>
            )}

            {/* Action buttons per entry */}
            <div className="flex gap-2">
              {(entry.status === "idle" || entry.status === "error") && entry.rawText.trim() && (
                <Button onClick={() => processEntry(entry)} size="sm" className="bg-white/10 hover:bg-white/20 text-white border-0 text-xs h-7">
                  Proceso me AI
                </Button>
              )}
              {entry.status === "processing" && (
                <Button disabled size="sm" className="bg-white/10 text-white text-xs h-7">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Duke procesuar...
                </Button>
              )}
              {entry.status === "ready" && (
                <Button onClick={() => publishEntry(entry)} size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs h-7">
                  <Send className="w-3 h-3 mr-1" /> Publiko
                </Button>
              )}
              {entry.status === "publishing" && (
                <Button disabled size="sm" className="bg-green-600 text-white text-xs h-7">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Duke publikuar...
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <Button onClick={addEntry} variant="outline" className="w-full border-white/10 border-dashed text-white/40 hover:text-white text-xs h-10">
          <Plus className="w-4 h-4 mr-1.5" /> Shto Njoftim Tjetër
        </Button>
      </div>
    </div>
  );
}
