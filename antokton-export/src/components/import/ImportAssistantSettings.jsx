import React, { useState } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Play, Save } from "lucide-react";
import { CATEGORIES, PROVIDER_LABELS, SOURCE_TYPE_LABELS, CRAWL_FREQUENCY_MINUTE_LABELS } from "./importConstants";

const DEFAULT_SETTINGS = {
  default_category_filter: "pune",
  default_country_filter: "",
  default_profession_filter: "shofer, pastrim, depo, magazin, ndërtim, mekanik, elektriçist, hidraulik, kujdestar, siguri, shpërndarje, bujqësi, fabrikë, bojaxhi, furrë, pasticeri",
  default_excluded_keywords: "senior, manager, director, professor, teacher, research, phd, software, developer, data scientist, consultant, engineer, ingenieur, analyst, controller, support, administrator, marketing, designer, student, internship, praktikant, werkstudent, sap, bank, kredit, finanz, datenerfasser, recruiter, recruiting, personalreferent, öffentlichkeitsarbeit, architektur, stadtentwicklung, referent, controlling, leiter, produktmanagement, office management, nebenberuf",
  min_new_items_per_run: 20,
  min_relevance_score: 45,
  max_risk_score: 70,
};

const DEFAULT_IMPORT_QUERIES = [
  "shofer", "pastrim", "depo", "magazin", "ndertim", "mekanik",
  "elektricist", "hidraulik", "kuzhinier", "siguri", "bujqesi",
  "fabrike", "pasticeri"
];
const DEFAULT_IMPORT_COUNTRIES = [
  "Germany", "Belgium", "Netherlands", "France", "Italy", "Austria",
  "Switzerland", "United Kingdom", "Remote"
];

const sourceIsActive = (source = {}) => {
  const value = source.enabled ?? source.is_active;
  return !(value === false || value === 0 || value === "0" || value === "false");
};
const sourceFrequency = (source = {}) => Number(source.crawl_frequency_minutes ?? (Number(source.crawl_frequency_hours ?? 6) * 60));
const asList = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return value.split(",").map((item) => item.trim()).filter(Boolean);
    }
  }
  return [];
};
const STATUS_LABELS = {
  success: "Sukses",
  partial_success: "Sukses i pjesshëm",
  duplicate_only: "Vetëm dublikata",
  imported_with_rejections: "Importuar me refuzime",
  imported_zero_valid_items: "Zero të vlefshme",
  no_results: "Pa rezultate",
  skipped: "U kapërcye",
  error: "Gabim",
  running: "Duke punuar",
};

function OnOffToggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      className={`inline-flex min-w-[148px] items-center justify-between rounded-full border px-1.5 py-1 text-xs font-semibold transition-colors ${
        checked
          ? "border-emerald-300/40 bg-emerald-300/15 text-emerald-100"
          : "border-red-300/35 bg-red-400/10 text-red-100"
      }`}
      title={label}
    >
      <span className={`rounded-full px-3 py-1 ${checked ? "bg-emerald-300 text-[#06111f]" : "text-white/45"}`}>Ndezur</span>
      <span className={`rounded-full px-3 py-1 ${checked ? "text-white/45" : "bg-red-300 text-[#16070b]"}`}>Fikur</span>
    </button>
  );
}

export default function ImportAssistantSettings() {
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const { data: settings = {}, isLoading } = useQuery({
    queryKey: ["importAssistant", "settings"],
    queryFn: () => base44.importAssistant.settings(),
  });
  const { data: logs = [] } = useQuery({
    queryKey: ["importAssistant", "logs"],
    queryFn: () => base44.importAssistant.logs(),
  });
  const { data: sources = [] } = useQuery({
    queryKey: ["importAssistant", "sources"],
    queryFn: () => base44.importAssistant.sources(),
  });
  const [form, setForm] = useState(null);
  const values = { ...DEFAULT_SETTINGS, ...(form || settings) };

  React.useEffect(() => {
    if (!form && settings?.id) setForm(settings);
  }, [settings, form]);

  const update = (key, value) => setForm((current) => ({ ...(current || settings), [key]: value }));

  const savePatch = async (patch) => {
    const next = { ...values, ...patch };
    setForm(next);
    await base44.importAssistant.updateSettings(next);
    await qc.invalidateQueries({ queryKey: ["importAssistant", "settings"] });
  };

  const save = async () => {
    setSaving(true);
    try {
      await base44.importAssistant.updateSettings(values);
      await qc.invalidateQueries({ queryKey: ["importAssistant", "settings"] });
      alert("Cilësimet u ruajtën.");
    } finally {
      setSaving(false);
    }
  };

  const runNow = async () => {
    setRunning(true);
    try {
      const selectedSourceId = values.default_source_id || "";
      const allActiveSources = !selectedSourceId || selectedSourceId === "all";
      const queries = asList(values.default_profession_filter).length
        ? asList(values.default_profession_filter)
        : DEFAULT_IMPORT_QUERIES;
      const countries = asList(values.default_country_filter).length
        ? asList(values.default_country_filter)
        : DEFAULT_IMPORT_COUNTRIES;
      const payload = {
        allActiveSources,
        sourceId: allActiveSources ? null : selectedSourceId,
        source_id: allActiveSources ? "" : selectedSourceId,
        queries,
        countries,
        maxResults: values.max_items_per_run || 100,
        max_items: values.max_items_per_run || 100,
        minQualityScore: 50,
        category_filter: values.default_category_filter || "",
        country_filter: values.default_country_filter || "",
        profession_filter: values.default_profession_filter || "",
        excluded_keywords: values.default_excluded_keywords || "",
        min_new_items_per_run: values.min_new_items_per_run || 20,
        min_relevance_score: values.min_relevance_score || 0,
        max_risk_score: values.max_risk_score || 100,
      };
      console.log("IMPORT PAYLOAD", payload);
      const result = await base44.importAssistant.run(payload);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["importedPosts"] }),
        qc.invalidateQueries({ queryKey: ["importAssistant", "logs"] }),
        qc.invalidateQueries({ queryKey: ["importAssistant", "failures"] }),
      ]);
      const summary = result.fallback_summary || {};
      alert([
        `Importimi përfundoi: ${result.imported_count || result.created_count || 0} të reja, ${result.duplicate_count || 0} dublikata, ${result.rejected_count || 0} refuzime, ${result.skipped_count || 0} skipped.`,
        `Të marra: ${result.fetched_count || 0}; të vlefshme: ${result.valid_count || 0}.`,
        `Provider-at: ${(summary.providers_tried || []).join(", ") || "—"}`,
        `Queries: ${(summary.queries_tried || []).slice(0, 8).join(", ") || "—"}`,
        `Vendet: ${(summary.countries_tried || []).slice(0, 8).join(", ") || "—"}`,
        summary.reason || ""
      ].filter(Boolean).join("\n"));
    } catch (error) {
      alert(error?.message || "Importimi dështoi.");
    } finally {
      setRunning(false);
    }
  };

  if (isLoading) return <div className="py-10 text-center text-white/50">Duke ngarkuar...</div>;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_1fr]">
      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-4">
        <div>
          <h2 className="text-white font-bold">Roboti i importimit</h2>
          <p className="text-white/55 text-xs mt-1">Importon nga burime publike/API/RSS dhe i ruan në pritje për miratim.</p>
        </div>
        <label className="flex items-center justify-between gap-3 text-sm text-white/80">
          <span>
            Auto Import
            <span className="block text-[11px] text-white/45">Importim automatik nga burimet aktive</span>
          </span>
          <OnOffToggle checked={values.auto_import_enabled !== false} onChange={(v) => savePatch({ auto_import_enabled: v })} label="Auto Import" />
        </label>
        <label className="block text-xs text-white/60">
          Frekuenca (orë)
          <Input type="number" min="1" value={values.import_frequency_hours || 6} onChange={(e) => update("import_frequency_hours", Number(e.target.value))} className="mt-1 bg-white/5 border-white/10 text-white" />
        </label>
        <label className="block text-xs text-white/60">
          Maksimumi për import
          <Input type="number" min="1" value={values.max_items_per_run || 100} onChange={(e) => update("max_items_per_run", Number(e.target.value))} className="mt-1 bg-white/5 border-white/10 text-white" />
        </label>
        <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-white">Cilësimet para importimit</h3>
            <p className="text-[11px] text-white/45">Këto filtra përdoren kur shtypet “Importo tani” dhe ndihmojnë të shmangen profile shumë të larta.</p>
          </div>
          <label className="block text-xs text-white/60">
            Burimi / Provideri
            <Select value={values.default_source_id || "all"} onValueChange={(v) => update("default_source_id", v === "all" ? "" : v)}>
              <SelectTrigger className="mt-1 bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[#0b1020] border-white/10">
                <SelectItem value="all" className="text-white">Të gjitha burimet aktive</SelectItem>
                {sources.map((source) => (
                  <SelectItem key={source.id} value={source.id} className="text-white">
                    {source.name} · {SOURCE_TYPE_LABELS[source.source_type || source.parser_type] || "Burim"} · {sourceIsActive(source) ? "Aktiv" : "Fikur"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2">
            <p className="mb-2 text-[11px] font-semibold text-white/70">Burimet e regjistruara</p>
            <div className="max-h-32 space-y-1 overflow-y-auto pr-1">
              {sources.map((source) => (
                <div key={source.id} className="flex items-center justify-between gap-2 rounded-md bg-white/[0.03] px-2 py-1 text-[11px] text-white/65">
                  <span className="min-w-0 truncate">{source.name} · {SOURCE_TYPE_LABELS[source.source_type || source.parser_type] || PROVIDER_LABELS[source.provider_key] || source.provider_key}</span>
                  <span className="shrink-0 text-white/40">{CRAWL_FREQUENCY_MINUTE_LABELS[sourceFrequency(source)] || `Çdo ${sourceFrequency(source)} min`}</span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 font-semibold ${sourceIsActive(source) ? "bg-emerald-400/15 text-emerald-200" : "bg-red-400/15 text-red-200"}`}>{sourceIsActive(source) ? "Aktiv" : "Fikur"}</span>
                </div>
              ))}
              {!sources.length && <p className="py-2 text-center text-white/40">Nuk ka burime ende.</p>}
            </div>
            <p className="mt-2 text-[11px] text-white/40">Shto ose aktivizo burime te tabi “Burime”.</p>
          </div>
          <label className="block text-xs text-white/60">
            Kategoria
            <Select value={values.default_category_filter || "all"} onValueChange={(v) => update("default_category_filter", v === "all" ? "" : v)}>
              <SelectTrigger className="mt-1 bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[#0b1020] border-white/10">
                <SelectItem value="all" className="text-white">Çdo kategori</SelectItem>
                {CATEGORIES.map((category) => <SelectItem key={category.value} value={category.value} className="text-white">{category.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </label>
          <label className="block text-xs text-white/60">
            Profesione / fjalë kyçe të lejuara
            <textarea
              value={values.default_profession_filter || ""}
              onChange={(e) => update("default_profession_filter", e.target.value)}
              placeholder="p.sh. shofer, pastrim, depo, ndërtim, mekanik"
              className="mt-1 min-h-[72px] w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#8ff0cf]/50"
            />
          </label>
          <label className="block text-xs text-white/60">
            Fjalë për t’u përjashtuar
            <textarea
              value={values.default_excluded_keywords || ""}
              onChange={(e) => update("default_excluded_keywords", e.target.value)}
              placeholder="p.sh. senior, manager, professor, phd, software"
              className="mt-1 min-h-[60px] w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#8ff0cf]/50"
            />
          </label>
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="block text-xs text-white/60">
              Vend/shtet
              <Input value={values.default_country_filter || ""} onChange={(e) => update("default_country_filter", e.target.value)} placeholder="p.sh. Gjermani" className="mt-1 bg-white/5 border-white/10 text-white" />
            </label>
            <label className="block text-xs text-white/60">
              Relevanca minimale
              <Input type="number" min="0" max="100" value={values.min_relevance_score ?? 45} onChange={(e) => update("min_relevance_score", Number(e.target.value))} className="mt-1 bg-white/5 border-white/10 text-white" />
            </label>
            <label className="block text-xs text-white/60">
              Risku maksimal
              <Input type="number" min="0" max="100" value={values.max_risk_score ?? 70} onChange={(e) => update("max_risk_score", Number(e.target.value))} className="mt-1 bg-white/5 border-white/10 text-white" />
            </label>
            <label className="block text-xs text-white/60">
              Minimumi i të rejave
              <Input type="number" min="0" value={values.min_new_items_per_run ?? 20} onChange={(e) => update("min_new_items_per_run", Number(e.target.value))} className="mt-1 bg-white/5 border-white/10 text-white" />
            </label>
          </div>
        </div>
        <label className="flex items-center justify-between gap-3 text-sm text-white/80">
          <span>
            Auto Publish
            <span className="block text-[11px] text-white/45">Publikim automatik, zakonisht duhet fikur</span>
          </span>
          <OnOffToggle checked={values.auto_publish_enabled === true} onChange={(v) => update("auto_publish_enabled", v)} label="Auto Publish" />
        </label>
        <p className="rounded-lg border border-yellow-300/20 bg-yellow-300/10 p-3 text-xs text-yellow-100">
          Siguria bazë: auto-publish është OFF. Njoftimet e importuara hyjnë në radhë për miratim nga stafi.
        </p>
        <div className="flex flex-wrap gap-2">
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Ruaj
          </button>
          <button onClick={runNow} disabled={running} className="inline-flex items-center gap-2 rounded-lg bg-[#8ff0cf] px-3 py-2 text-sm font-semibold text-[#06111f] disabled:opacity-50">
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Importo tani
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h2 className="text-white font-bold mb-3">Import logs</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-white/45">
              <tr>
                <th className="text-left py-2">Provider</th>
                <th>Statusi</th>
                <th>Të marra</th>
                <th>Të reja</th>
                <th>Dublikata</th>
                <th>Skipped</th>
                <th>Query/Vende</th>
                <th>Shënim</th>
                <th>Gabime</th>
              </tr>
            </thead>
            <tbody>
              {logs.slice(0, 12).map((log) => (
                <tr key={log.id} className="border-t border-white/5 text-white/75">
                  <td className="py-2">{log.provider_key || "—"}</td>
                  <td>{STATUS_LABELS[log.status] || log.status || "—"}</td>
                  <td>{log.fetched_count || 0}</td>
                  <td>{log.created_count || 0}</td>
                  <td>{log.duplicate_count || 0}</td>
                  <td>{log.skipped_count || 0}</td>
                  <td className="max-w-[260px] text-white/55">
                    <span className="block truncate" title={asList(log.queries_tried).join(", ")}>Q: {asList(log.queries_tried).slice(0, 3).join(", ") || "—"}</span>
                    <span className="block truncate" title={asList(log.countries_tried).join(", ")}>V: {asList(log.countries_tried).slice(0, 3).join(", ") || "—"}</span>
                  </td>
                  <td className="max-w-[260px] truncate text-white/45" title={log.error_message || ""}>{log.error_message || "—"}</td>
                  <td className="text-red-200">{log.error_count || 0}</td>
                </tr>
              ))}
              {!logs.length && <tr><td colSpan={9} className="py-8 text-center text-white/40">Ende nuk ka logs.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
