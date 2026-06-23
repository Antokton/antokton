import React, { useEffect, useMemo, useRef, useState } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, Save, Play, Pencil, X } from "lucide-react";
import { CATEGORIES, PROVIDER_LABELS, SOURCE_GROUP_LABELS, PARSER_TYPE_LABELS, TRUST_LEVEL_LABELS, SOURCE_TYPE_LABELS, IMPORT_MODE_LABELS, CRAWL_FREQUENCY_MINUTE_LABELS, AUTOMATION_LEVEL_LABELS } from "./importConstants";

const PROVIDERS = Object.keys(PROVIDER_LABELS);
const SOURCE_GROUPS = Object.keys(SOURCE_GROUP_LABELS);
const PARSER_TYPES = Object.keys(PARSER_TYPE_LABELS);
const TRUST_LEVELS = Object.keys(TRUST_LEVEL_LABELS);
const SOURCE_TYPES = Object.keys(SOURCE_TYPE_LABELS);
const IMPORT_MODES = Object.keys(IMPORT_MODE_LABELS);
const AUTOMATION_LEVELS = Object.keys(AUTOMATION_LEVEL_LABELS);
const CRAWL_FREQUENCIES = Object.keys(CRAWL_FREQUENCY_MINUTE_LABELS);
const COLUMN_STORAGE_KEY = "antokton.importSources.columns.v1";
const COLUMN_MIN_WIDTH = 38;

const DEFAULT_COLUMNS = [
  { key: "name", label: "Emri", width: 190 },
  { key: "source_type", label: "Lloji", width: 110 },
  { key: "import_mode", label: "Mënyra", width: 100 },
  { key: "automation_level", label: "Auto", width: 95 },
  { key: "provider_key", label: "Provider", width: 140 },
  { key: "url", label: "URL", width: 260 },
  { key: "frequency", label: "Frekuenca", width: 110 },
  { key: "source_group", label: "Grupi", width: 120 },
  { key: "parser_type", label: "Parser", width: 100 },
  { key: "filters", label: "Kategori/Profesion", width: 150 },
  { key: "trust_level", label: "Besueshmëria", width: 120 },
  { key: "status", label: "Statusi", width: 90 },
];

const columnWidth = (column) => Math.max(COLUMN_MIN_WIDTH, Number(column.width || 120));

const frequencyValue = (source = {}) => Number(source.crawl_frequency_minutes ?? (Number(source.crawl_frequency_hours ?? 6) * 60));
const sourceIsActive = (source = {}) => {
  const value = source.enabled ?? source.is_active;
  return !(value === false || value === 0 || value === "0" || value === "false");
};

const emptySource = {
  name: "",
  provider_key: "generic_rss",
  source_type: "rss",
  import_mode: "automatic",
  crawl_method: "rss",
  automation_level: "full_auto",
  source_url: "",
  base_url: "",
  api_endpoint: "",
  rss_url: "",
  jobs_url: "",
  category_url: "",
  country_scope: "",
  region_scope: "",
  language: "",
  source_group: "rss",
  parser_type: "rss",
  trust_level: "needs_review",
  login_required: false,
  moderation_required: true,
  enabled: true,
  is_active: true,
  crawl_frequency_minutes: 360,
  category_filter: "job",
  country_filter: "",
  profession_filter: "",
  excluded_keywords: "",
  parser_config: {},
  parser_config_json: "{}",
  notes: ""
};

const sourceDefaultsForType = (sourceType) => {
  if (sourceType === "api") return { import_mode: "automatic", crawl_method: "api", parser_type: "api", automation_level: "full_auto", provider_key: "custom", source_group: "custom_api" };
  if (sourceType === "rss") return { import_mode: "automatic", crawl_method: "rss", parser_type: "rss", automation_level: "full_auto", provider_key: "generic_rss", source_group: "rss" };
  if (sourceType === "html") return { import_mode: "automatic", crawl_method: "html", parser_type: "html", automation_level: "full_auto", provider_key: "custom" };
  if (["facebook", "instagram", "tiktok", "linkedin", "telegram", "whatsapp", "youtube", "x_twitter", "reddit", "discord"].includes(sourceType)) {
    return { import_mode: "manual", crawl_method: "manual", parser_type: "manual", automation_level: "manual", provider_key: "custom", source_group: "community" };
  }
  return { import_mode: "manual", crawl_method: "manual", parser_type: "manual", automation_level: "manual", provider_key: "custom", source_group: "manual_url" };
};

const stringifyConfig = (value) => {
  if (!value) return "{}";
  if (typeof value === "string") {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "{}";
  }
};

const normalizeSourceForm = (form = {}) => {
  let parserConfig = form.parser_config || {};
  if (typeof form.parser_config_json === "string" && form.parser_config_json.trim()) {
    try {
      parserConfig = JSON.parse(form.parser_config_json);
    } catch {
      throw new Error("Parser config duhet të jetë JSON valid.");
    }
  }
  const enabled = form.enabled !== false && form.is_active !== false;
  return {
    ...form,
    enabled,
    is_active: enabled,
    crawl_frequency_minutes: Number(form.crawl_frequency_minutes || 0),
    parser_config: parserConfig,
  };
};

export default function ImportSources() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState(emptySource);
  const [editingId, setEditingId] = useState("");
  const [editForm, setEditForm] = useState({});
  const [busyId, setBusyId] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: "name", direction: "asc" });
  const [dragColumnKey, setDragColumnKey] = useState("");
  const [sourceTypeFilter, setSourceTypeFilter] = useState("all");
  const [automationFilter, setAutomationFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");
  const resizeRef = useRef(null);
  const [columns, setColumns] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(COLUMN_STORAGE_KEY) || "null");
      if (Array.isArray(saved) && saved.length) {
        const savedKeys = new Set(saved.map((column) => column.key));
        const merged = saved
          .map((column) => DEFAULT_COLUMNS.find((item) => item.key === column.key) ? { ...DEFAULT_COLUMNS.find((item) => item.key === column.key), ...column } : null)
          .filter(Boolean);
        DEFAULT_COLUMNS.forEach((column) => {
          if (!savedKeys.has(column.key)) merged.push(column);
        });
        return merged;
      }
    } catch {
      // Ignore corrupted local layout settings and fall back to the default order.
    }
    return DEFAULT_COLUMNS;
  });
  const { data: sources = [], isLoading } = useQuery({
    queryKey: ["importAssistant", "sources"],
    queryFn: () => base44.importAssistant.sources(),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["importAssistant", "sources"] });
  useEffect(() => {
    localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(columns));
  }, [columns]);

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => sources.some((source) => source.id === id)));
  }, [sources]);

  const updateDraft = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  const startEdit = (source) => {
    setEditingId(source.id);
    setEditForm({
      id: source.id || "",
      seed_key: source.seed_key || "",
      name: source.name || "",
      provider_key: source.provider_key || "generic_rss",
      source_type: source.source_type || source.parser_type || "rss",
      import_mode: source.import_mode || "manual",
      crawl_method: source.crawl_method || source.parser_type || source.source_type || "manual",
      automation_level: source.automation_level || (source.import_mode === "automatic" ? "full_auto" : source.import_mode === "mixed" ? "semi_auto" : "manual"),
      source_url: source.source_url || source.base_url || "",
      base_url: source.base_url || source.source_url || "",
      api_endpoint: source.api_endpoint || "",
      rss_url: source.rss_url || "",
      jobs_url: source.jobs_url || "",
      category_url: source.category_url || "",
      country_scope: source.country_scope || "",
      region_scope: source.region_scope || "",
      language: source.language || "",
      source_group: source.source_group || "manual_url",
      parser_type: source.parser_type || "rss",
      trust_level: source.trust_level || "needs_review",
      login_required: source.login_required === true,
      moderation_required: source.moderation_required !== false,
      original_source_required: source.original_source_required !== false,
      enabled: sourceIsActive(source),
      is_active: sourceIsActive(source),
      crawl_frequency_minutes: frequencyValue(source),
      category_filter: source.category_filter || "",
      country_filter: source.country_filter || "",
      profession_filter: source.profession_filter || "",
      excluded_keywords: source.excluded_keywords || "",
      parser_config: source.parser_config || {},
      parser_config_json: stringifyConfig(source.parser_config || {}),
      notes: source.notes || "",
    });
  };
  const updateEdit = (key, value) => setEditForm((current) => ({ ...current, [key]: value }));
  const updateDraftSourceType = (value) => {
    setDraft((current) => ({ ...current, source_type: value, ...sourceDefaultsForType(value) }));
  };
  const updateEditSourceType = (value) => {
    setEditForm((current) => ({ ...current, source_type: value, ...sourceDefaultsForType(value) }));
  };

  const createSource = async () => {
    if (!draft.name.trim()) return alert("Vendos emrin e burimit.");
    try {
      await base44.importAssistant.createSource(normalizeSourceForm(draft));
    } catch (error) {
      alert(error?.message || "Burimi nuk u ruajt.");
      return;
    }
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
    let payload;
    try {
      payload = normalizeSourceForm(editForm);
    } catch (error) {
      alert(error?.message || "Burimi nuk u ruajt.");
      return;
    }
    await updateSource(source, payload);
    setEditingId("");
    setEditForm({});
  };

  const testSource = async (source) => {
    if (!source?.id) return alert("Missing source_id");
    setBusyId(source.id);
    try {
      const result = await base44.importAssistant.testSource(source.id);
      const samples = Array.isArray(result.samples) && result.samples.length
        ? `\nShembuj:\n${result.samples.slice(0, 3).map((item) => `- ${item.status}: ${item.original_title || item.original_url || "pa titull"}${item.reason ? ` (${item.reason})` : ""}`).join("\n")}`
        : "";
      const diagnostics = result.diagnostics || {};
      const missing = Array.isArray(diagnostics.missing_fields) && diagnostics.missing_fields.length
        ? `\nMungojnë: ${diagnostics.missing_fields.join(", ")}`
        : "";
      const tried = [
        diagnostics.provider ? `Provider: ${diagnostics.provider}` : "",
        Array.isArray(diagnostics.queries_tried) && diagnostics.queries_tried.length ? `Queries: ${diagnostics.queries_tried.join(", ")}` : "",
        Array.isArray(diagnostics.countries_tried) && diagnostics.countries_tried.length ? `Vende: ${diagnostics.countries_tried.join(", ")}` : "",
      ].filter(Boolean).join("\n");
      const recommendation = diagnostics.recommendation ? `\nRekomandim: ${diagnostics.recommendation}` : "";
      alert(`Testi përfundoi (pa krijuar postime): ${result.fetched_count || 0} të marra, ${result.valid_count || 0} të vlefshme, ${result.rejected_count || 0} refuzime.${tried ? `\n${tried}` : ""}${missing}${recommendation}${samples}`);
      await Promise.all([
        refresh(),
        qc.invalidateQueries({ queryKey: ["importAssistant", "logs"] }),
      ]);
    } finally {
      setBusyId("");
    }
  };

  const sortValue = (source, key) => {
    if (key === "url") return source.jobs_url || source.category_url || source.source_url || source.base_url || "";
    if (key === "frequency") return frequencyValue(source);
    if (key === "filters") return `${source.category_filter || ""} ${source.profession_filter || ""} ${source.country_filter || ""}`;
    if (key === "status") return sourceIsActive(source) ? "1" : "0";
    return source[key] || "";
  };

  const visibleSources = useMemo(() => sources.filter((source) => {
    if (sourceTypeFilter !== "all" && (source.source_type || source.parser_type) !== sourceTypeFilter) return false;
    const level = source.automation_level || (source.import_mode === "automatic" ? "full_auto" : source.import_mode === "mixed" ? "semi_auto" : "manual");
    if (automationFilter !== "all" && level !== automationFilter) return false;
    if (activeFilter === "active" && !sourceIsActive(source)) return false;
    if (activeFilter === "inactive" && sourceIsActive(source)) return false;
    return true;
  }), [sources, sourceTypeFilter, automationFilter, activeFilter]);

  const sourceStats = useMemo(() => {
    const countType = (type) => sources.filter((source) => (source.source_type || source.parser_type) === type).length;
    return {
      api: countType("api"),
      rss: countType("rss"),
      html: countType("html"),
      manual: sources.filter((source) => (source.source_type || source.parser_type) === "manual" || (source.import_mode || "") === "manual").length,
    };
  }, [sources]);

  const sortedSources = useMemo(() => {
    const rows = [...visibleSources];
    rows.sort((a, b) => {
      const left = sortValue(a, sortConfig.key);
      const right = sortValue(b, sortConfig.key);
      const result = String(left).localeCompare(String(right), "sq", { numeric: true, sensitivity: "base" });
      return sortConfig.direction === "asc" ? result : -result;
    });
    return rows;
  }, [visibleSources, sortConfig]);

  const allVisibleSelected = sortedSources.length > 0 && sortedSources.every((source) => selectedIds.includes(source.id));
  const selectedCount = selectedIds.length;

  const toggleSort = (key) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const moveColumnBefore = (sourceKey, targetKey) => {
    if (!sourceKey || !targetKey || sourceKey === targetKey) return;
    setColumns((current) => {
      const sourceIndex = current.findIndex((column) => column.key === sourceKey);
      const targetIndex = current.findIndex((column) => column.key === targetKey);
      if (sourceIndex < 0 || targetIndex < 0) return current;
      const next = [...current];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  };

  const startColumnResize = (event, column) => {
    event.preventDefault();
    event.stopPropagation();
    resizeRef.current = {
      key: column.key,
      startX: event.clientX,
      startWidth: columnWidth(column),
    };
    const handleMove = (moveEvent) => {
      const resize = resizeRef.current;
      if (!resize) return;
      const nextWidth = Math.max(COLUMN_MIN_WIDTH, resize.startWidth + moveEvent.clientX - resize.startX);
      setColumns((current) => current.map((item) => item.key === resize.key ? { ...item, width: nextWidth } : item));
    };
    const handleUp = () => {
      resizeRef.current = null;
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
  };

  const resetColumns = () => setColumns(DEFAULT_COLUMNS);

  const toggleRow = (id) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const toggleAllVisible = () => {
    setSelectedIds((current) => {
      if (allVisibleSelected) return current.filter((id) => !sortedSources.some((source) => source.id === id));
      return Array.from(new Set([...current, ...sortedSources.map((source) => source.id)]));
    });
  };

  const bulkSetEnabled = async (enabled) => {
    const selectedSources = sources.filter((source) => selectedIds.includes(source.id));
    if (!selectedSources.length) return;
    setBusyId("bulk");
    try {
      await Promise.all(selectedSources.map((source) => base44.importAssistant.updateSource(source.id, { enabled, is_active: enabled })));
      setSelectedIds([]);
      refresh();
    } finally {
      setBusyId("");
    }
  };

  const bulkDelete = async () => {
    const selectedSources = sources.filter((source) => selectedIds.includes(source.id) && source.is_editable_by_admin !== false);
    if (!selectedSources.length) return alert("Burimet e zgjedhura nuk mund të fshihen ose nuk ka zgjedhje.");
    if (!confirm(`Të fshihen ${selectedSources.length} burime të zgjedhura?`)) return;
    setBusyId("bulk");
    try {
      await Promise.all(selectedSources.map((source) => base44.importAssistant.deleteSource(source.id)));
      setSelectedIds([]);
      refresh();
    } finally {
      setBusyId("");
    }
  };

  const renderEditCell = (source, key) => {
    const selectClass = "h-8 bg-white/5 border-white/10 text-white";
    if (key === "name") return <Input value={editForm.name} onChange={(e) => updateEdit("name", e.target.value)} className="h-8 bg-white/5 border-white/10 text-white" />;
    if (key === "source_type") return <Select value={editForm.source_type} onValueChange={updateEditSourceType}><SelectTrigger className={selectClass}><SelectValue /></SelectTrigger><SelectContent className="bg-[#0b1020] border-white/10">{SOURCE_TYPES.map((value) => <SelectItem key={value} value={value} className="text-white">{SOURCE_TYPE_LABELS[value]}</SelectItem>)}</SelectContent></Select>;
    if (key === "import_mode") return <Select value={editForm.import_mode} onValueChange={(v) => updateEdit("import_mode", v)}><SelectTrigger className={selectClass}><SelectValue /></SelectTrigger><SelectContent className="bg-[#0b1020] border-white/10">{IMPORT_MODES.map((value) => <SelectItem key={value} value={value} className="text-white">{IMPORT_MODE_LABELS[value]}</SelectItem>)}</SelectContent></Select>;
    if (key === "automation_level") return <Select value={editForm.automation_level || "manual"} onValueChange={(v) => updateEdit("automation_level", v)}><SelectTrigger className={selectClass}><SelectValue /></SelectTrigger><SelectContent className="bg-[#0b1020] border-white/10">{AUTOMATION_LEVELS.map((value) => <SelectItem key={value} value={value} className="text-white">{AUTOMATION_LEVEL_LABELS[value]}</SelectItem>)}</SelectContent></Select>;
    if (key === "provider_key") return <Select value={editForm.provider_key} onValueChange={(v) => updateEdit("provider_key", v)}><SelectTrigger className={selectClass}><SelectValue /></SelectTrigger><SelectContent className="bg-[#0b1020] border-white/10">{PROVIDERS.map((value) => <SelectItem key={value} value={value} className="text-white">{PROVIDER_LABELS[value]}</SelectItem>)}</SelectContent></Select>;
    if (key === "url") return <div className="space-y-1"><Input value={editForm.source_url} onChange={(e) => { updateEdit("source_url", e.target.value); updateEdit("base_url", e.target.value); }} placeholder="URL" className="h-8 bg-white/5 border-white/10 text-white" /><Input value={editForm.jobs_url} onChange={(e) => updateEdit("jobs_url", e.target.value)} placeholder="Jobs URL" className="h-8 bg-white/5 border-white/10 text-white" /><Input value={editForm.category_url} onChange={(e) => updateEdit("category_url", e.target.value)} placeholder="Category URL" className="h-8 bg-white/5 border-white/10 text-white" /></div>;
    if (key === "frequency") return <Select value={String(editForm.crawl_frequency_minutes ?? 360)} onValueChange={(v) => updateEdit("crawl_frequency_minutes", Number(v))}><SelectTrigger className={selectClass}><SelectValue /></SelectTrigger><SelectContent className="bg-[#0b1020] border-white/10">{CRAWL_FREQUENCIES.map((value) => <SelectItem key={value} value={value} className="text-white">{CRAWL_FREQUENCY_MINUTE_LABELS[value]}</SelectItem>)}</SelectContent></Select>;
    if (key === "source_group") return <Select value={editForm.source_group} onValueChange={(v) => updateEdit("source_group", v)}><SelectTrigger className={selectClass}><SelectValue /></SelectTrigger><SelectContent className="bg-[#0b1020] border-white/10">{SOURCE_GROUPS.map((value) => <SelectItem key={value} value={value} className="text-white">{SOURCE_GROUP_LABELS[value]}</SelectItem>)}</SelectContent></Select>;
    if (key === "parser_type") return <Select value={editForm.parser_type} onValueChange={(v) => updateEdit("parser_type", v)}><SelectTrigger className={selectClass}><SelectValue /></SelectTrigger><SelectContent className="bg-[#0b1020] border-white/10">{PARSER_TYPES.map((value) => <SelectItem key={value} value={value} className="text-white">{PARSER_TYPE_LABELS[value]}</SelectItem>)}</SelectContent></Select>;
    if (key === "filters") return <div className="space-y-1"><Input value={editForm.category_filter} onChange={(e) => updateEdit("category_filter", e.target.value)} placeholder="Kategori" className="h-8 bg-white/5 border-white/10 text-white" /><Input value={editForm.profession_filter} onChange={(e) => updateEdit("profession_filter", e.target.value)} placeholder="Profesion" className="h-8 bg-white/5 border-white/10 text-white" /><Input value={editForm.country_filter} onChange={(e) => updateEdit("country_filter", e.target.value)} placeholder="Vend" className="h-8 bg-white/5 border-white/10 text-white" /><Input value={editForm.language} onChange={(e) => updateEdit("language", e.target.value)} placeholder="Gjuha" className="h-8 bg-white/5 border-white/10 text-white" /><Input value={editForm.notes} onChange={(e) => updateEdit("notes", e.target.value)} placeholder="Shënime" className="h-8 bg-white/5 border-white/10 text-white" /></div>;
    if (key === "trust_level") return <Select value={editForm.trust_level} onValueChange={(v) => updateEdit("trust_level", v)}><SelectTrigger className={selectClass}><SelectValue /></SelectTrigger><SelectContent className="bg-[#0b1020] border-white/10">{TRUST_LEVELS.map((value) => <SelectItem key={value} value={value} className="text-white">{TRUST_LEVEL_LABELS[value]}</SelectItem>)}</SelectContent></Select>;
    if (key === "status") return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${sourceIsActive(editForm) ? "bg-emerald-400/15 text-emerald-200" : "bg-red-400/15 text-red-200"}`}>{sourceIsActive(editForm) ? "Ndezur" : "Fikur"}</span>;
    return null;
  };

  const renderViewCell = (source, key) => {
    if (key === "name") return <span className="font-semibold text-white">{source.name}</span>;
    if (key === "source_type") return SOURCE_TYPE_LABELS[source.source_type || source.parser_type] || source.source_type || "—";
    if (key === "import_mode") return IMPORT_MODE_LABELS[source.import_mode] || source.import_mode || "—";
    if (key === "automation_level") return AUTOMATION_LEVEL_LABELS[source.automation_level] || (source.import_mode === "automatic" ? "Full auto" : source.import_mode === "mixed" ? "Semi auto" : "Manual");
    if (key === "provider_key") return PROVIDER_LABELS[source.provider_key] || source.provider_key || "—";
    if (key === "url") return <span className="block truncate" title={source.jobs_url || source.category_url || source.source_url || source.base_url || ""}>{source.jobs_url || source.category_url || source.source_url || source.base_url || "—"}</span>;
    if (key === "frequency") return CRAWL_FREQUENCY_MINUTE_LABELS[frequencyValue(source)] || `Çdo ${frequencyValue(source)} min`;
    if (key === "source_group") return SOURCE_GROUP_LABELS[source.source_group] || source.source_group || "—";
    if (key === "parser_type") return PARSER_TYPE_LABELS[source.parser_type] || source.parser_type || "—";
    if (key === "filters") return <div><div>{source.category_filter || "Çdo kategori"}</div><div className="text-white/45">{source.profession_filter || "Çdo profesion"}</div><div className="text-white/35">{source.country_filter || "Çdo vend"}</div></div>;
    if (key === "trust_level") return TRUST_LEVEL_LABELS[source.trust_level] || "I panjohur";
    if (key === "status") return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${sourceIsActive(source) ? "bg-emerald-400/15 text-emerald-200" : "bg-red-400/15 text-red-200"}`}>{sourceIsActive(source) ? "Ndezur" : "Fikur"}</span>;
    return null;
  };

  const renderSelectField = (label, key, options, labels) => (
    <label className="block text-[11px] text-white/55">
      {label}
      <Select value={String(editForm[key] ?? "")} onValueChange={(value) => updateEdit(key, value)}>
        <SelectTrigger className="mt-1 h-9 bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
        <SelectContent className="bg-[#0b1020] border-white/10">
          {options.map((value) => <SelectItem key={value} value={String(value)} className="text-white">{labels?.[value] || value}</SelectItem>)}
        </SelectContent>
      </Select>
    </label>
  );

  const renderTextField = (label, key, placeholder = "") => (
    <label className="block text-[11px] text-white/55">
      {label}
      <Input value={editForm[key] || ""} onChange={(e) => updateEdit(key, e.target.value)} placeholder={placeholder} className="mt-1 h-9 bg-white/5 border-white/10 text-white" />
    </label>
  );

  const renderTextareaField = (label, key, placeholder = "", rows = 3) => (
    <label className="block text-[11px] text-white/55">
      {label}
      <textarea
        value={editForm[key] || ""}
        onChange={(e) => updateEdit(key, e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#8ff0cf]/60"
      />
    </label>
  );

  const renderFullEditor = (source) => (
    <tr className="border-t border-[#8ff0cf]/20 bg-[#8ff0cf]/[0.035]">
      <td colSpan={columns.length + 2} className="p-4">
        <div className="rounded-xl border border-[#8ff0cf]/20 bg-[#07101f] p-4 shadow-xl">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white">Përpuno burimin: {source.name || "Burim"}</h3>
              <p className="text-xs text-white/50">Këtu shfaqen të gjitha fushat teknike dhe redaktuese që ruhen për këtë burim.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => saveEdit(source)} disabled={busyId === source.id} className="rounded-lg border border-emerald-300/20 px-3 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-300/10 disabled:opacity-50">
                <Save className="inline w-3 h-3 mr-1" /> Ruaj
              </button>
              <button type="button" onClick={() => { setEditingId(""); setEditForm({}); }} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10">
                <X className="inline w-3 h-3 mr-1" /> Mbyll
              </button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {renderTextField("ID", "id")}
            {renderTextField("Seed key", "seed_key")}
            {renderTextField("Emri", "name", "Emri i burimit")}
            {renderSelectField("Provider", "provider_key", PROVIDERS, PROVIDER_LABELS)}
            {renderSelectField("Lloji i burimit", "source_type", SOURCE_TYPES, SOURCE_TYPE_LABELS)}
            {renderSelectField("Mënyra e importit", "import_mode", IMPORT_MODES, IMPORT_MODE_LABELS)}
            {renderSelectField("Metoda crawl", "crawl_method", ["api", "rss", "html", "manual", "custom"], PARSER_TYPE_LABELS)}
            {renderSelectField("Automatizimi", "automation_level", AUTOMATION_LEVELS, AUTOMATION_LEVEL_LABELS)}
            {renderSelectField("Grupi", "source_group", SOURCE_GROUPS, SOURCE_GROUP_LABELS)}
            {renderSelectField("Parser", "parser_type", PARSER_TYPES, PARSER_TYPE_LABELS)}
            {renderSelectField("Besueshmëria", "trust_level", TRUST_LEVELS, TRUST_LEVEL_LABELS)}
            {renderSelectField("Frekuenca", "crawl_frequency_minutes", CRAWL_FREQUENCIES, CRAWL_FREQUENCY_MINUTE_LABELS)}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {renderTextField("URL kryesore / source_url", "source_url", "https://...")}
            {renderTextField("Base URL", "base_url", "https://...")}
            {renderTextField("API endpoint", "api_endpoint", "https://.../api")}
            {renderTextField("RSS URL", "rss_url", "https://.../feed.xml")}
            {renderTextField("Jobs URL", "jobs_url", "https://.../jobs")}
            {renderTextField("Category URL", "category_url", "https://.../category")}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {renderTextField("Kategoria filter", "category_filter", "pune, pazar...")}
            {renderTextField("Profesion / fjalë kyçe", "profession_filter", "shofer, pastrim...")}
            {renderTextField("Vend/shtet filter", "country_filter", "Germany, Belgium...")}
            {renderTextField("Fjalë përjashtuese", "excluded_keywords", "senior, manager...")}
            {renderTextField("Country scope", "country_scope")}
            {renderTextField("Region scope", "region_scope")}
            {renderTextField("Gjuha", "language", "sq, de, en...")}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {renderTextareaField("Shënime", "notes", "Çfarë duhet ditur për këtë burim...", 4)}
            {renderTextareaField("Parser config JSON", "parser_config_json", "{\"selector\":\"...\"}", 8)}
          </div>

          <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4 text-xs text-white/70">
            <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <input type="checkbox" checked={editForm.enabled !== false && editForm.is_active !== false} onChange={(e) => { updateEdit("enabled", e.target.checked); updateEdit("is_active", e.target.checked); }} />
              Aktiv / përdoret në import
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <input type="checkbox" checked={editForm.login_required === true} onChange={(e) => updateEdit("login_required", e.target.checked)} />
              Kërkon login
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <input type="checkbox" checked={editForm.moderation_required !== false} onChange={(e) => updateEdit("moderation_required", e.target.checked)} />
              Kërkon miratim
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <input type="checkbox" checked={editForm.original_source_required !== false} onChange={(e) => updateEdit("original_source_required", e.target.checked)} />
              Kërkon burim origjinal
            </label>
          </div>

          <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-3 text-[11px] text-white/45">
            Fusha të sistemit: last_checked_at: {source.last_checked_at || "—"} · last_success_at: {source.last_success_at || "—"} · failure_count: {source.failure_count || 0} · last_error: {source.last_error || "—"}
          </div>
        </div>
      </td>
    </tr>
  );

  if (isLoading) return <div className="py-10 text-center text-white/50">Duke ngarkuar burimet...</div>;

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h2 className="text-white font-bold mb-3">Shto burim</h2>
        <div className="grid gap-2 md:grid-cols-3">
          <Input value={draft.name} onChange={(e) => updateDraft("name", e.target.value)} placeholder="Emri i burimit" className="bg-white/5 border-white/10 text-white" />
          <Input value={draft.source_url} onChange={(e) => { updateDraft("source_url", e.target.value); updateDraft("base_url", e.target.value); }} placeholder="URL kryesore/API/RSS" className="bg-white/5 border-white/10 text-white" />
          <Select value={draft.source_type} onValueChange={updateDraftSourceType}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue placeholder="Lloji i burimit" /></SelectTrigger>
            <SelectContent className="bg-[#0b1020] border-white/10">
              {SOURCE_TYPES.map((value) => <SelectItem key={value} value={value} className="text-white">{SOURCE_TYPE_LABELS[value]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={draft.import_mode} onValueChange={(v) => updateDraft("import_mode", v)}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue placeholder="Mënyra e importit" /></SelectTrigger>
            <SelectContent className="bg-[#0b1020] border-white/10">
              {IMPORT_MODES.map((value) => <SelectItem key={value} value={value} className="text-white">{IMPORT_MODE_LABELS[value]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={draft.automation_level} onValueChange={(v) => updateDraft("automation_level", v)}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue placeholder="Automatizimi" /></SelectTrigger>
            <SelectContent className="bg-[#0b1020] border-white/10">
              {AUTOMATION_LEVELS.map((value) => <SelectItem key={value} value={value} className="text-white">{AUTOMATION_LEVEL_LABELS[value]}</SelectItem>)}
            </SelectContent>
          </Select>
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
          <Select value={String(draft.crawl_frequency_minutes ?? 360)} onValueChange={(v) => updateDraft("crawl_frequency_minutes", Number(v))}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue placeholder="Frekuenca" /></SelectTrigger>
            <SelectContent className="bg-[#0b1020] border-white/10">
              {CRAWL_FREQUENCIES.map((value) => <SelectItem key={value} value={value} className="text-white">{CRAWL_FREQUENCY_MINUTE_LABELS[value]}</SelectItem>)}
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
          <Input value={draft.jobs_url} onChange={(e) => updateDraft("jobs_url", e.target.value)} placeholder="Jobs URL (opsional)" className="bg-white/5 border-white/10 text-white" />
          <Input value={draft.category_url} onChange={(e) => updateDraft("category_url", e.target.value)} placeholder="Category URL (opsional)" className="bg-white/5 border-white/10 text-white" />
          <Input value={draft.language} onChange={(e) => updateDraft("language", e.target.value)} placeholder="Gjuha p.sh. sq/de/en" className="bg-white/5 border-white/10 text-white" />
          <Input value={draft.notes} onChange={(e) => updateDraft("notes", e.target.value)} placeholder="Shënime për burimin" className="bg-white/5 border-white/10 text-white md:col-span-2" />
          <button type="button" onClick={createSource} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#8ff0cf] px-3 py-2 text-sm font-semibold text-[#06111f]"><Plus className="w-4 h-4" /> Shto burim</button>
        </div>
      </section>

      <section className="rounded-xl border border-white/10">
        <div className="grid gap-2 border-b border-white/10 bg-white/[0.025] p-3 text-xs text-white/70 lg:grid-cols-[1fr_auto]">
          <div className="flex flex-wrap gap-2">
            <span className="rounded border border-white/10 bg-white/[0.03] px-2 py-1">API: {sourceStats.api}</span>
            <span className="rounded border border-white/10 bg-white/[0.03] px-2 py-1">RSS: {sourceStats.rss}</span>
            <span className="rounded border border-white/10 bg-white/[0.03] px-2 py-1">HTML: {sourceStats.html}</span>
            <span className="rounded border border-white/10 bg-white/[0.03] px-2 py-1">Manuale: {sourceStats.manual}</span>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Select value={sourceTypeFilter} onValueChange={setSourceTypeFilter}>
              <SelectTrigger className="h-8 w-[130px] bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[#0b1020] border-white/10">
                <SelectItem value="all" className="text-white">Të gjitha</SelectItem>
                <SelectItem value="api" className="text-white">API</SelectItem>
                <SelectItem value="rss" className="text-white">RSS</SelectItem>
                <SelectItem value="html" className="text-white">HTML</SelectItem>
                <SelectItem value="manual" className="text-white">Manual</SelectItem>
              </SelectContent>
            </Select>
            <Select value={automationFilter} onValueChange={setAutomationFilter}>
              <SelectTrigger className="h-8 w-[130px] bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[#0b1020] border-white/10">
                <SelectItem value="all" className="text-white">Çdo auto</SelectItem>
                {AUTOMATION_LEVELS.map((value) => <SelectItem key={value} value={value} className="text-white">{AUTOMATION_LEVEL_LABELS[value]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={activeFilter} onValueChange={setActiveFilter}>
              <SelectTrigger className="h-8 w-[120px] bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[#0b1020] border-white/10">
                <SelectItem value="all" className="text-white">Çdo status</SelectItem>
                <SelectItem value="active" className="text-white">Aktive</SelectItem>
                <SelectItem value="inactive" className="text-white">Jo aktive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-white/[0.025] p-3 text-xs text-white/60">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={toggleAllVisible} className="rounded border border-white/10 px-2 py-1 hover:bg-white/10">
              {allVisibleSelected ? "Hiq zgjedhjen" : "Zgjidh të gjitha"}
            </button>
            {selectedCount > 0 && (
              <>
                <span>{selectedCount} burime të zgjedhura</span>
                <button type="button" disabled={busyId === "bulk"} onClick={() => bulkSetEnabled(true)} className="rounded border border-emerald-300/20 px-2 py-1 text-emerald-200 hover:bg-emerald-300/10 disabled:opacity-50">Ndizi</button>
                <button type="button" disabled={busyId === "bulk"} onClick={() => bulkSetEnabled(false)} className="rounded border border-amber-300/20 px-2 py-1 text-amber-200 hover:bg-amber-300/10 disabled:opacity-50">Fiki</button>
                <button type="button" disabled={busyId === "bulk"} onClick={bulkDelete} className="rounded border border-red-400/20 px-2 py-1 text-red-300 hover:bg-red-400/10 disabled:opacity-50">Fshi</button>
              </>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span>Rendit sipas:</span>
            <Select value={sortConfig.key} onValueChange={(v) => setSortConfig((current) => ({ ...current, key: v }))}>
              <SelectTrigger className="h-8 w-[170px] bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[#0b1020] border-white/10">
                {columns.map((column) => <SelectItem key={column.key} value={column.key} className="text-white">{column.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <button type="button" onClick={() => setSortConfig((current) => ({ ...current, direction: current.direction === "asc" ? "desc" : "asc" }))} className="rounded border border-white/10 px-2 py-1 hover:bg-white/10">
              {sortConfig.direction === "asc" ? "Rritës" : "Zbritës"}
            </button>
            <button type="button" onClick={resetColumns} className="rounded border border-white/10 px-2 py-1 hover:bg-white/10">Rikthe kolonat</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="table-fixed text-[11px] leading-tight" style={{ width: columns.reduce((sum, column) => sum + columnWidth(column), 210) + 210 }}>
            <thead className="bg-white/5 text-white/45">
              <tr>
                <th className="sticky left-0 z-20 w-[34px] bg-[#111827] p-2 text-left">
                  <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} aria-label="Zgjidh të gjitha burimet" />
                </th>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    draggable
                    onDragStart={() => setDragColumnKey(column.key)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      moveColumnBefore(dragColumnKey, column.key);
                      setDragColumnKey("");
                    }}
                    onDragEnd={() => setDragColumnKey("")}
                    className={`relative p-1.5 pr-3 text-left align-top ${dragColumnKey === column.key ? "opacity-60" : ""}`}
                    style={{ width: columnWidth(column) }}
                    title="Tërhiq kolonën për ta zhvendosur; kap vijën djathtas për gjerësi."
                  >
                    <div className="flex items-start justify-between gap-1">
                      <button type="button" onClick={() => toggleSort(column.key)} className="min-w-0 cursor-grab truncate text-left font-semibold hover:text-white" title="Rendit sipas kësaj kolone">
                        {column.label}{sortConfig.key === column.key ? (sortConfig.direction === "asc" ? " ↑" : " ↓") : ""}
                      </button>
                    </div>
                    <span
                      onMouseDown={(event) => startColumnResize(event, column)}
                      className="absolute right-0 top-0 h-full w-2 cursor-col-resize border-r border-white/10 hover:border-[#8ff0cf]"
                      aria-hidden="true"
                    />
                  </th>
                ))}
                <th className="sticky right-0 z-20 w-[176px] bg-[#111827] p-2 text-left">Veprime</th>
              </tr>
            </thead>
            <tbody>
              {sortedSources.map((source) => (
                <React.Fragment key={source.id}>
                  <tr className={`border-t border-white/5 text-white/75 align-top hover:bg-white/[0.025] ${selectedIds.includes(source.id) ? "bg-[#8ff0cf]/5" : ""}`}>
                    <td className="sticky left-0 z-10 bg-[#090f1f] p-2">
                      <input type="checkbox" checked={selectedIds.includes(source.id)} onChange={() => toggleRow(source.id)} aria-label={`Zgjidh ${source.name}`} />
                    </td>
                    {columns.map((column) => (
                      <td key={`${source.id}-${column.key}`} className="p-1.5 align-top" style={{ width: columnWidth(column), maxWidth: columnWidth(column) }}>
                        <div className="max-h-10 overflow-hidden break-words">
                          {renderViewCell(source, column.key)}
                        </div>
                      </td>
                    ))}
                    <td className="sticky right-0 z-10 bg-[#090f1f] p-1.5 align-top shadow-[-12px_0_18px_rgba(0,0,0,0.22)]">
                      <div className="flex max-w-[170px] flex-wrap gap-1">
                        <button type="button" onClick={() => editingId === source.id ? setEditingId("") : startEdit(source)} className="rounded border border-white/10 px-2 py-1 hover:bg-white/10">
                          {editingId === source.id ? <X className="inline w-3 h-3 mr-1" /> : <Pencil className="inline w-3 h-3 mr-1" />} {editingId === source.id ? "Mbyll" : "Përpuno"}
                        </button>
                        <button type="button" onClick={() => updateSource(source, { enabled: !sourceIsActive(source), is_active: !sourceIsActive(source) })} disabled={busyId === source.id} className="rounded border border-white/10 px-2 py-1 hover:bg-white/10 disabled:opacity-50">
                          <Save className="inline w-3 h-3 mr-1" /> {sourceIsActive(source) ? "Fike" : "Ndize"}
                        </button>
                        <button type="button" onClick={() => testSource(source)} disabled={busyId === source.id || !source.id} className="rounded border border-[#8ff0cf]/20 px-2 py-1 text-[#8ff0cf] hover:bg-[#8ff0cf]/10 disabled:opacity-40">
                          {busyId === source.id ? <Loader2 className="inline w-3 h-3 mr-1 animate-spin" /> : <Play className="inline w-3 h-3 mr-1" />} Test
                        </button>
                        {source.is_editable_by_admin !== false && (
                          <button type="button" onClick={async () => { if (confirm("Ta fshij këtë burim?")) { await base44.importAssistant.deleteSource(source.id); refresh(); } }} className="rounded border border-red-400/20 px-2 py-1 text-red-300 hover:bg-red-400/10">
                            <Trash2 className="inline w-3 h-3 mr-1" /> Fshi
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {editingId === source.id && renderFullEditor(source)}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
