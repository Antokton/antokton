import React, { useState } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, Save, Play } from "lucide-react";

const emptySource = {
  name: "",
  provider_key: "generic_rss",
  base_url: "",
  source_group: "manual_url",
  parser_type: "rss",
  trust_level: "unknown",
  is_active: true,
  category_filter: "job",
  country_filter: ""
};

export default function ImportSources() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState(emptySource);
  const [busyId, setBusyId] = useState("");
  const { data: sources = [], isLoading } = useQuery({
    queryKey: ["importAssistant", "sources"],
    queryFn: () => base44.importAssistant.sources(),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["importAssistant", "sources"] });
  const updateDraft = (key, value) => setDraft((current) => ({ ...current, [key]: value }));

  const createSource = async () => {
    if (!draft.name.trim()) return alert("Vendos emrin e burimit.");
    await base44.importAssistant.createSource(draft);
    setDraft(emptySource);
    refresh();
  };

  const updateSource = async (source, patch) => {
    setBusyId(source.id);
    try {
      await base44.importAssistant.updateSource(source.id, patch);
      refresh();
    } finally {
      setBusyId("");
    }
  };

  const testSource = async (source) => {
    setBusyId(source.id);
    try {
      const result = await base44.importAssistant.testSource(source.id);
      alert(`Testi përfundoi: ${result.created_count || 0} të reja, ${result.duplicate_count || 0} dublikata.`);
      await Promise.all([
        refresh(),
        qc.invalidateQueries({ queryKey: ["importedPosts"] }),
        qc.invalidateQueries({ queryKey: ["importAssistant", "logs"] }),
      ]);
    } finally {
      setBusyId("");
    }
  };

  if (isLoading) return <div className="py-10 text-center text-white/50">Duke ngarkuar burimet...</div>;

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h2 className="text-white font-bold mb-3">Shto burim</h2>
        <div className="grid gap-2 md:grid-cols-3">
          <Input value={draft.name} onChange={(e) => updateDraft("name", e.target.value)} placeholder="Emri i burimit" className="bg-white/5 border-white/10 text-white" />
          <Input value={draft.base_url} onChange={(e) => updateDraft("base_url", e.target.value)} placeholder="URL/API/RSS" className="bg-white/5 border-white/10 text-white" />
          <Select value={draft.provider_key} onValueChange={(v) => updateDraft("provider_key", v)}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-[#0b1020] border-white/10">
              {["arbeitnow", "adzuna", "jooble", "eures", "generic_rss", "custom"].map((value) => <SelectItem key={value} value={value} className="text-white">{value}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={draft.source_group} onValueChange={(v) => updateDraft("source_group", v)}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-[#0b1020] border-white/10">
              {["global_provider", "albanian_source", "partner", "community", "rss", "custom_api", "manual_url"].map((value) => <SelectItem key={value} value={value} className="text-white">{value}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={draft.trust_level} onValueChange={(v) => updateDraft("trust_level", v)}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-[#0b1020] border-white/10">
              {["high", "medium", "low", "unknown"].map((value) => <SelectItem key={value} value={value} className="text-white">{value}</SelectItem>)}
            </SelectContent>
          </Select>
          <button onClick={createSource} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#8ff0cf] px-3 py-2 text-sm font-semibold text-[#06111f]"><Plus className="w-4 h-4" /> Shto burim</button>
        </div>
      </section>

      <section className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-xs">
          <thead className="bg-white/5 text-white/45">
            <tr><th className="text-left p-3">Emri</th><th>Provider</th><th>URL</th><th>Grupi</th><th>Trust</th><th>Statusi</th><th>Veprime</th></tr>
          </thead>
          <tbody>
            {sources.map((source) => (
              <tr key={source.id} className="border-t border-white/5 text-white/75">
                <td className="p-3 font-semibold text-white">{source.name}</td>
                <td>{source.provider_key}</td>
                <td className="max-w-[260px] truncate">{source.base_url || "—"}</td>
                <td>{source.source_group || "—"}</td>
                <td>{source.trust_level || "unknown"}</td>
                <td>{source.is_active === false ? "Jo aktiv" : "Aktiv"}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1.5">
                    <button onClick={() => updateSource(source, { is_active: source.is_active === false })} className="rounded border border-white/10 px-2 py-1 hover:bg-white/10">
                      <Save className="inline w-3 h-3 mr-1" /> {source.is_active === false ? "Aktivo" : "Çaktivizo"}
                    </button>
                    <button onClick={() => testSource(source)} disabled={busyId === source.id} className="rounded border border-[#8ff0cf]/20 px-2 py-1 text-[#8ff0cf] hover:bg-[#8ff0cf]/10 disabled:opacity-40">
                      {busyId === source.id ? <Loader2 className="inline w-3 h-3 mr-1 animate-spin" /> : <Play className="inline w-3 h-3 mr-1" />} Test
                    </button>
                    {source.is_editable_by_admin !== false && (
                      <button onClick={async () => { if (confirm("Ta fshij këtë burim?")) { await base44.importAssistant.deleteSource(source.id); refresh(); } }} className="rounded border border-red-400/20 px-2 py-1 text-red-300 hover:bg-red-400/10">
                        <Trash2 className="inline w-3 h-3 mr-1" /> Fshi
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
