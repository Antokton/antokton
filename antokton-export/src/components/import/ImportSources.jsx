import React, { useState } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, Save, Play, Pencil, X } from "lucide-react";
import { CATEGORIES, PROVIDER_LABELS, SOURCE_GROUP_LABELS, PARSER_TYPE_LABELS, TRUST_LEVEL_LABELS } from "./importConstants";

const PROVIDERS = Object.keys(PROVIDER_LABELS);
const SOURCE_GROUPS = Object.keys(SOURCE_GROUP_LABELS);
const PARSER_TYPES = Object.keys(PARSER_TYPE_LABELS);
const TRUST_LEVELS = Object.keys(TRUST_LEVEL_LABELS);

const emptySource = {
  name: "",
  provider_key: "generic_rss",
  base_url: "",
  source_group: "manual_url",
  parser_type: "rss",
  trust_level: "unknown",
  is_active: true,
  category_filter: "job",
  country_filter: "",
  profession_filter: ""
};

export default function ImportSources() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState(emptySource);
  const [editingId, setEditingId] = useState("");
  const [editForm, setEditForm] = useState({});
  const [busyId, setBusyId] = useState("");
  const { data: sources = [], isLoading } = useQuery({
    queryKey: ["importAssistant", "sources"],
    queryFn: () => base44.importAssistant.sources(),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["importAssistant", "sources"] });
  const updateDraft = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  const startEdit = (source) => {
    setEditingId(source.id);
    setEditForm({
      name: source.name || "",
      provider_key: source.provider_key || "generic_rss",
      base_url: source.base_url || "",
      source_group: source.source_group || "manual_url",
      parser_type: source.parser_type || "rss",
      trust_level: source.trust_level || "unknown",
      category_filter: source.category_filter || "",
      country_filter: source.country_filter || "",
      profession_filter: source.profession_filter || "",
    });
  };
  const updateEdit = (key, value) => setEditForm((current) => ({ ...current, [key]: value }));

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

  const saveEdit = async (source) => {
    await updateSource(source, editForm);
    setEditingId("");
    setEditForm({});
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
              {PROVIDERS.map((value) => <SelectItem key={value} value={value} className="text-white">{PROVIDER_LABELS[value]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={draft.source_group} onValueChange={(v) => updateDraft("source_group", v)}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-[#0b1020] border-white/10">
              {SOURCE_GROUPS.map((value) => <SelectItem key={value} value={value} className="text-white">{SOURCE_GROUP_LABELS[value]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={draft.trust_level} onValueChange={(v) => updateDraft("trust_level", v)}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-[#0b1020] border-white/10">
              {TRUST_LEVELS.map((value) => <SelectItem key={value} value={value} className="text-white">{TRUST_LEVEL_LABELS[value]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={draft.parser_type} onValueChange={(v) => updateDraft("parser_type", v)}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue placeholder="Parser" /></SelectTrigger>
            <SelectContent className="bg-[#0b1020] border-white/10">
              {PARSER_TYPES.map((value) => <SelectItem key={value} value={value} className="text-white">{PARSER_TYPE_LABELS[value]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={draft.category_filter || "all"} onValueChange={(v) => updateDraft("category_filter", v === "all" ? "" : v)}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue placeholder="Kategoria" /></SelectTrigger>
            <SelectContent className="bg-[#0b1020] border-white/10">
              <SelectItem value="all" className="text-white">Çdo kategori</SelectItem>
              {CATEGORIES.map((category) => <SelectItem key={category.value} value={category.value} className="text-white">{category.label}</SelectItem>)}
              <SelectItem value="job" className="text-white">Punë/API job</SelectItem>
            </SelectContent>
          </Select>
          <Input value={draft.profession_filter} onChange={(e) => updateDraft("profession_filter", e.target.value)} placeholder="Profesion/fjalë kyçe" className="bg-white/5 border-white/10 text-white" />
          <Input value={draft.country_filter} onChange={(e) => updateDraft("country_filter", e.target.value)} placeholder="Vend/shtet filter" className="bg-white/5 border-white/10 text-white" />
          <button onClick={createSource} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#8ff0cf] px-3 py-2 text-sm font-semibold text-[#06111f]"><Plus className="w-4 h-4" /> Shto burim</button>
        </div>
      </section>

      <section className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-xs">
          <thead className="bg-white/5 text-white/45">
            <tr><th className="text-left p-3">Emri</th><th>Provider</th><th>URL</th><th>Grupi</th><th>Parser</th><th>Kategori/Profesion</th><th>Besueshmëria</th><th>Statusi</th><th>Veprime</th></tr>
          </thead>
          <tbody>
            {sources.map((source) => (
              <tr key={source.id} className="border-t border-white/5 text-white/75 align-top">
                {editingId === source.id ? (
                  <>
                    <td className="p-3"><Input value={editForm.name} onChange={(e) => updateEdit("name", e.target.value)} className="h-8 bg-white/5 border-white/10 text-white" /></td>
                    <td><Select value={editForm.provider_key} onValueChange={(v) => updateEdit("provider_key", v)}><SelectTrigger className="h-8 bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger><SelectContent className="bg-[#0b1020] border-white/10">{PROVIDERS.map((value) => <SelectItem key={value} value={value} className="text-white">{PROVIDER_LABELS[value]}</SelectItem>)}</SelectContent></Select></td>
                    <td><Input value={editForm.base_url} onChange={(e) => updateEdit("base_url", e.target.value)} className="h-8 min-w-[220px] bg-white/5 border-white/10 text-white" /></td>
                    <td><Select value={editForm.source_group} onValueChange={(v) => updateEdit("source_group", v)}><SelectTrigger className="h-8 bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger><SelectContent className="bg-[#0b1020] border-white/10">{SOURCE_GROUPS.map((value) => <SelectItem key={value} value={value} className="text-white">{SOURCE_GROUP_LABELS[value]}</SelectItem>)}</SelectContent></Select></td>
                    <td><Select value={editForm.parser_type} onValueChange={(v) => updateEdit("parser_type", v)}><SelectTrigger className="h-8 bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger><SelectContent className="bg-[#0b1020] border-white/10">{PARSER_TYPES.map((value) => <SelectItem key={value} value={value} className="text-white">{PARSER_TYPE_LABELS[value]}</SelectItem>)}</SelectContent></Select></td>
                    <td className="space-y-1 p-2"><Input value={editForm.category_filter} onChange={(e) => updateEdit("category_filter", e.target.value)} placeholder="Kategori" className="h-8 bg-white/5 border-white/10 text-white" /><Input value={editForm.profession_filter} onChange={(e) => updateEdit("profession_filter", e.target.value)} placeholder="Profesion" className="h-8 bg-white/5 border-white/10 text-white" /><Input value={editForm.country_filter} onChange={(e) => updateEdit("country_filter", e.target.value)} placeholder="Vend" className="h-8 bg-white/5 border-white/10 text-white" /></td>
                    <td><Select value={editForm.trust_level} onValueChange={(v) => updateEdit("trust_level", v)}><SelectTrigger className="h-8 bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger><SelectContent className="bg-[#0b1020] border-white/10">{TRUST_LEVELS.map((value) => <SelectItem key={value} value={value} className="text-white">{TRUST_LEVEL_LABELS[value]}</SelectItem>)}</SelectContent></Select></td>
                  </>
                ) : (
                  <>
                    <td className="p-3 font-semibold text-white">{source.name}</td>
                    <td>{PROVIDER_LABELS[source.provider_key] || source.provider_key}</td>
                    <td className="max-w-[260px] truncate">{source.base_url || "—"}</td>
                    <td>{SOURCE_GROUP_LABELS[source.source_group] || source.source_group || "—"}</td>
                    <td>{PARSER_TYPE_LABELS[source.parser_type] || source.parser_type || "—"}</td>
                    <td>
                      <div>{source.category_filter || "Çdo kategori"}</div>
                      <div className="text-white/45">{source.profession_filter || "Çdo profesion"}</div>
                      <div className="text-white/35">{source.country_filter || "Çdo vend"}</div>
                    </td>
                    <td>{TRUST_LEVEL_LABELS[source.trust_level] || "I panjohur"}</td>
                  </>
                )}
                <td>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${source.is_active === false ? "bg-red-400/15 text-red-200" : "bg-emerald-400/15 text-emerald-200"}`}>
                    {source.is_active === false ? "Fikur" : "Ndezur"}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1.5">
                    {editingId === source.id ? (
                      <>
                        <button onClick={() => saveEdit(source)} disabled={busyId === source.id} className="rounded border border-emerald-300/20 px-2 py-1 text-emerald-200 hover:bg-emerald-300/10">
                          <Save className="inline w-3 h-3 mr-1" /> Ruaj
                        </button>
                        <button onClick={() => { setEditingId(""); setEditForm({}); }} className="rounded border border-white/10 px-2 py-1 hover:bg-white/10">
                          <X className="inline w-3 h-3 mr-1" /> Anulo
                        </button>
                      </>
                    ) : (
                      <button onClick={() => startEdit(source)} className="rounded border border-white/10 px-2 py-1 hover:bg-white/10">
                        <Pencil className="inline w-3 h-3 mr-1" /> Përpuno
                      </button>
                    )}
                    <button onClick={() => updateSource(source, { is_active: source.is_active === false })} className="rounded border border-white/10 px-2 py-1 hover:bg-white/10">
                      <Save className="inline w-3 h-3 mr-1" /> {source.is_active === false ? "Ndize" : "Fike"}
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
