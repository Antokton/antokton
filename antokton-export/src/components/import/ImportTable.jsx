import React, { useState } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2, Pencil, Trash2, Globe, Check, X, Columns3, ArrowUpDown } from "lucide-react";
import {
  CATEGORIES,
  LISTING_TYPES,
  SOURCES,
  STATUS_LABELS,
  STATUS_COLORS,
  PROVIDER_LABELS,
} from "./importConstants";
import { cleanPazarLabel, findPazarCategory } from "@/lib/pazarCategories";
import { publishImportedPost } from "./publishImportedPost";
import moment from "moment";

const getCategoryLabel = (post) => {
  const value = post?.category;
  if (value === "pazar" || value === "prona" || post?.pazar_category) {
    const pazarCategory = findPazarCategory(post?.pazar_category);
    const subcategory = pazarCategory?.subcategories?.find((sub) => sub.value === post?.pazar_subcategory);
    return ["Pazar", pazarCategory ? cleanPazarLabel(pazarCategory.label) : "", subcategory?.label || ""].filter(Boolean).join(" · ");
  }
  return CATEGORIES.find(c => c.value === value)?.label || "—";
};

const isPublishedInJobs = (post, publishedJobLinks) => (
  ["publikuar", "published"].includes(post.status) &&
  (publishedJobLinks.ids.has(post.published_post_id) || publishedJobLinks.importIds.has(post.id))
);

const scoreTone = (score) => {
  const value = Number(score);
  if (!Number.isFinite(value)) return "bg-white/5 text-white/45";
  if (value >= 75) return "bg-emerald-400/15 text-emerald-300";
  if (value >= 55) return "bg-yellow-400/15 text-yellow-300";
  return "bg-red-400/15 text-red-300";
};

const labelOf = (items, value, fallback = "—") => items.find((item) => item.value === value)?.label || fallback;
const sourceLabel = (post) => PROVIDER_LABELS[post.provider_key] || labelOf(SOURCES, post.source, post.source_name || post.source || post.provider_key || "—");
const statusLabel = (status) => STATUS_LABELS[status] || status || "Në pritje";
const normalizedText = (value) => String(value || "").toLowerCase();
const SCRIPT_OR_TEMPLATE_TEXT = /\b(?:window\.dataLayer|function\s+gtag|gtag\s*\(|dataLayer\.push|__NEXT_DATA__|webpackJsonp|type\s*:\s*["']application_form["']|define\s+actual\s+values\s+based\s+on\s+your\s+own\s+requirements)\b/i;
const NON_JOB_SOURCE_URL = /\/(?:employer-branding|employer|recruit|recruiters|employers|for-employers|pricing|advertise|corporate|about|contact|blog|academy|solutions|demo|customers)(?:\/|$)/i;
const HIDDEN_IMPORT_STATUSES = new Set([
  "duplicate",
  "rejected_low_quality_import",
  "rejected_non_job_page",
  "rejected_missing_original_url",
  "rejected_missing_title",
  "rejected_placeholder_url",
  "skipped_missing_parser_config",
  "archived_invalid_import",
]);

const looksInvalidImportedPost = (post = {}) => {
  const text = [
    post.original_title,
    post.title,
    post.original_text,
    post.edited_text,
    post.description,
    post.contact_url,
    post.contact_info,
  ].filter(Boolean).join(" ");
  const url = post.original_url || post.source_url || post.import_source_url || post.original_post_url || "";
  return SCRIPT_OR_TEMPLATE_TEXT.test(text) || NON_JOB_SOURCE_URL.test(url);
};

function FilterSelect({ value, onValueChange, label, children, width = "w-40" }) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={`${width} bg-white/5 border-white/10 text-white h-8 text-xs`} style={{ background: "rgba(255,255,255,0.05)", color: "#fff" }}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-[#0b1020] border-white/10">
        <SelectItem value="all" className="text-white">{label}: Të gjitha</SelectItem>
        {children}
      </SelectContent>
    </Select>
  );
}

export default function ImportTable({ user, onEdit }) {
  const qc = useQueryClient();
  const [filters, setFilters] = useState({ status: "all", category: "all", listing_type: "all", source: "all", search: "" });
  const [publishingId, setPublishingId] = useState(null);
  const [bulkBusy, setBulkBusy] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState("50");
  const [sort, setSort] = useState({ key: "date", direction: "desc" });
  const [columnOrder, setColumnOrder] = useState([
    "text", "author", "category", "country", "region", "city", "listing_type", "source", "score", "status", "imported_by", "date",
  ]);
  const [visibleColumnKeys, setVisibleColumnKeys] = useState(() => new Set(columnOrder));
  const [columnWidths, setColumnWidths] = useState({});
  const [dragColumn, setDragColumn] = useState("");

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["importedPosts"],
    queryFn: () => base44.entities.ImportedPost.list("-created_date", 1000),
  });

  const { data: publishedJobs = [] } = useQuery({
    queryKey: ["jobs", "imported-links"],
    queryFn: () => base44.entities.Job.filter({ status: "approved" }, "-created_date", 500),
  });

  const publishedJobLinks = React.useMemo(() => ({
    ids: new Set(publishedJobs.map((job) => job.id || job._id).filter(Boolean)),
    importIds: new Set(publishedJobs.map((job) => job.original_import_id).filter(Boolean)),
  }), [publishedJobs]);

  const isAdmin = user?.role === "admin";
  const isStaff = user?.role === "admin" || user?.role === "moderator";
  const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val }));

  const columns = React.useMemo(() => ([
    { key: "text", label: "Teksti", width: 220, sortValue: (p) => p.edited_text || p.shqip_title || p.original_title || "", render: (p) => <p className="text-white/80 truncate">{(p.edited_text || p.shqip_title || p.original_title || "Njoftim i importuar").slice(0, 70)}...</p> },
    { key: "author", label: "Autori", width: 140, sortValue: (p) => p.author_name || "", render: (p) => p.author_name || "—" },
    { key: "category", label: "Kategoria", width: 170, sortValue: (p) => getCategoryLabel(p), render: (p) => getCategoryLabel(p) },
    { key: "country", label: "Vendi", width: 120, sortValue: (p) => p.country || "", render: (p) => p.country || "—" },
    { key: "region", label: "Rajoni", width: 210, sortValue: (p) => p.region || "", render: (p) => p.region || "—" },
    { key: "city", label: "Qyteti", width: 120, sortValue: (p) => p.city || "", render: (p) => p.city || "—" },
    { key: "listing_type", label: "Lloji", width: 120, sortValue: (p) => labelOf(LISTING_TYPES, p.listing_type, ""), render: (p) => labelOf(LISTING_TYPES, p.listing_type, "—") },
    { key: "source", label: "Burimi", width: 140, sortValue: sourceLabel, render: sourceLabel },
    { key: "score", label: "Vlerësimi", width: 140, sortValue: (p) => Number(p.final_score || p.relevance_score || 0), render: (p) => (
      <div className="flex flex-col gap-1">
        <span className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold ${scoreTone(p.final_score || p.relevance_score)}`}>
          {Number.isFinite(Number(p.final_score || p.relevance_score)) ? `${p.final_score || p.relevance_score}/100` : "—"}
        </span>
        {p.requires_manual_review && <span className="text-[10px] text-yellow-300/75">shqyrtim manual</span>}
      </div>
    ) },
    { key: "status", label: "Statusi", width: 150, sortValue: (p) => statusLabel(p.status), render: (p) => {
      const reallyPublished = isPublishedInJobs(p, publishedJobLinks);
      return (
        <>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${reallyPublished ? STATUS_COLORS.publikuar : STATUS_COLORS[p.status] || "bg-yellow-400/15 text-yellow-300"}`}>
            {reallyPublished ? "Publikuar" : statusLabel(p.status)}
          </span>
          {!reallyPublished && ["publikuar", "published"].includes(p.status) && (
            <p className="mt-1 text-[10px] text-yellow-300/70">mungon postimi publik</p>
          )}
        </>
      );
    } },
    { key: "imported_by", label: "Importuar nga", width: 130, sortValue: (p) => p.imported_by || "", render: (p) => p.imported_by?.split("@")[0] || "—" },
    { key: "date", label: "Data", width: 110, sortValue: (p) => p.created_date || p.imported_at || "", render: (p) => moment(p.created_date || p.imported_at).format("DD/MM/YY") },
  ]), [publishedJobLinks]);

  const columnByKey = React.useMemo(() => Object.fromEntries(columns.map((column) => [column.key, column])), [columns]);
  const visibleColumns = columnOrder.map((key) => columnByKey[key]).filter((column) => column && visibleColumnKeys.has(column.key));

  const filtered = React.useMemo(() => {
    const rows = posts.filter(p => {
      if (HIDDEN_IMPORT_STATUSES.has(p.status)) return false;
      if (looksInvalidImportedPost(p)) return false;
      if (filters.status !== "all" && p.status !== filters.status) return false;
      if (filters.category !== "all" && p.category !== filters.category) return false;
      if (filters.listing_type !== "all" && p.listing_type !== filters.listing_type) return false;
      const postSource = p.source || p.provider_key || p.source_name;
      if (filters.source !== "all" && postSource !== filters.source) return false;
      if (filters.search) {
        const q = normalizedText(filters.search);
        const haystack = normalizedText(`${p.edited_text} ${p.shqip_title} ${p.original_title} ${p.author_name} ${p.city} ${p.country} ${sourceLabel(p)}`);
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
    const column = columnByKey[sort.key];
    if (!column) return rows;
    return [...rows].sort((a, b) => {
      const av = column.sortValue(a);
      const bv = column.sortValue(b);
      const result = typeof av === "number" || typeof bv === "number"
        ? Number(av || 0) - Number(bv || 0)
        : String(av || "").localeCompare(String(bv || ""), "sq", { sensitivity: "base" });
      return sort.direction === "asc" ? result : -result;
    });
  }, [posts, filters, sort, columnByKey]);

  React.useEffect(() => {
    setPage(1);
  }, [filters, sort, pageSize]);

  const pageSizeNumber = pageSize === "all" ? filtered.length || 1 : Number(pageSize || 50);
  const totalPages = pageSize === "all" ? 1 : Math.max(1, Math.ceil(filtered.length / pageSizeNumber));
  const safePage = Math.min(page, totalPages);
  const pageStart = pageSize === "all" ? 0 : (safePage - 1) * pageSizeNumber;
  const paginated = pageSize === "all" ? filtered : filtered.slice(pageStart, pageStart + pageSizeNumber);

  const selectedPosts = filtered.filter((post) => selectedIds.has(post.id));
  const allVisibleSelected = paginated.length > 0 && paginated.every((post) => selectedIds.has(post.id));

  const refreshImported = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["importedPosts"] }),
      qc.invalidateQueries({ queryKey: ["jobs"] }),
      qc.invalidateQueries({ queryKey: ["jobs", "imported-links"] }),
      qc.invalidateQueries({ queryKey: ["pazarJobs"] }),
    ]);
  };

  const handleDelete = async (id) => {
    if (!confirm("Jeni të sigurt?")) return;
    await base44.entities.ImportedPost.delete(id);
    await refreshImported();
  };

  const publishOne = async (post) => {
    if (post.provider_key || post.item_type) {
      await base44.importAssistant.publishItem(post.id);
      return;
    }
    const postToPublish = isPublishedInJobs(post, publishedJobLinks) ? post : { ...post, published_post_id: "" };
    await publishImportedPost(base44, postToPublish, user);
  };

  const handleQuickPublish = async (post) => {
    setPublishingId(post.id);
    try {
      await publishOne(post);
      await refreshImported();
    } catch (error) {
      alert(error?.message || "Publikimi dështoi. Provo përsëri.");
    } finally {
      setPublishingId(null);
    }
  };

  const handleRobotAction = async (post, action) => {
    setPublishingId(post.id);
    try {
      if (action === "approve") {
        if (post.provider_key || post.item_type) await base44.importAssistant.approveItem(post.id);
        else await base44.entities.ImportedPost.update(post.id, { status: "miratuar" });
      }
      if (action === "reject") {
        if (post.provider_key || post.item_type) await base44.importAssistant.rejectItem(post.id);
        else await base44.entities.ImportedPost.update(post.id, { status: "refuzuar" });
      }
      if (action === "publish") await publishOne(post);
      await refreshImported();
    } catch (error) {
      alert(error?.message || "Veprimi dështoi.");
    } finally {
      setPublishingId(null);
    }
  };

  const handleBulk = async (action) => {
    if (!selectedPosts.length) return;
    const labels = { approve: "miratohen", reject: "refuzohen", publish: "publikohen", delete: "fshihen" };
    if (!confirm(`Të ${labels[action]} ${selectedPosts.length} njoftime?`)) return;
    setBulkBusy(action);
    try {
      for (const post of selectedPosts) {
        if (action === "delete") await base44.entities.ImportedPost.delete(post.id);
        if (action === "approve") {
          if (post.provider_key || post.item_type) await base44.importAssistant.approveItem(post.id);
          else await base44.entities.ImportedPost.update(post.id, { status: "miratuar" });
        }
        if (action === "reject") {
          if (post.provider_key || post.item_type) await base44.importAssistant.rejectItem(post.id);
          else await base44.entities.ImportedPost.update(post.id, { status: "refuzuar" });
        }
        if (action === "publish") await publishOne(post);
      }
      setSelectedIds(new Set());
      await refreshImported();
    } catch (error) {
      alert(error?.message || "Veprimi në grup dështoi.");
    } finally {
      setBulkBusy("");
    }
  };

  const toggleSelected = (id, checked) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleAllVisible = (checked) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      paginated.forEach((post) => checked ? next.add(post.id) : next.delete(post.id));
      return next;
    });
  };

  const sortBy = (key) => {
    setSort((current) => current.key === key
      ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
      : { key, direction: "asc" });
  };

  const startResize = (key, event) => {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startWidth = columnWidths[key] || columnByKey[key]?.width || 120;
    const onMove = (moveEvent) => {
      setColumnWidths((current) => ({ ...current, [key]: Math.max(80, startWidth + moveEvent.clientX - startX) }));
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const moveColumn = (fromKey, toKey) => {
    if (!fromKey || !toKey || fromKey === toKey) return;
    setColumnOrder((current) => {
      const next = [...current];
      const from = next.indexOf(fromKey);
      const to = next.indexOf(toKey);
      if (from < 0 || to < 0) return current;
      next.splice(from, 1);
      next.splice(to, 0, fromKey);
      return next;
    });
  };

  const ActionButtons = ({ post, needsPublish }) => (
    <div className="flex items-center gap-1.5 whitespace-nowrap">
      <button onClick={(event) => { event.stopPropagation(); onEdit(post); }} className="inline-flex items-center gap-1 rounded border border-white/10 px-2 py-1 text-white/70 hover:text-white hover:bg-white/10 transition-colors" title="Përpuno">
        <Pencil className="w-3.5 h-3.5" />
        <span>Përpuno</span>
      </button>
      {isAdmin && needsPublish && (
        <button onClick={(event) => { event.stopPropagation(); handleRobotAction(post, "publish"); }} disabled={publishingId === post.id} className="inline-flex items-center gap-1 rounded border border-[#9bffd6]/20 px-2 py-1 text-[#9bffd6]/80 hover:text-[#9bffd6] hover:bg-[#9bffd6]/10 transition-colors disabled:opacity-40" title="Publiko">
          {publishingId === post.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
          <span>{["publikuar", "published"].includes(post.status) ? "Ripubliko" : "Publiko"}</span>
        </button>
      )}
      {isStaff && ["pending_review", "imported", "ne_pritje"].includes(post.status) && (
        <>
          <button onClick={(event) => { event.stopPropagation(); handleRobotAction(post, "approve"); }} disabled={publishingId === post.id} className="inline-flex items-center gap-1 rounded border border-emerald-300/20 px-2 py-1 text-emerald-200 hover:bg-emerald-300/10 disabled:opacity-40" title="Mirato">
            <Check className="w-3.5 h-3.5" /><span>Mirato</span>
          </button>
          <button onClick={(event) => { event.stopPropagation(); handleRobotAction(post, "reject"); }} disabled={publishingId === post.id} className="inline-flex items-center gap-1 rounded border border-red-300/20 px-2 py-1 text-red-200 hover:bg-red-300/10 disabled:opacity-40" title="Refuzo">
            <X className="w-3.5 h-3.5" /><span>Refuzo</span>
          </button>
        </>
      )}
      {isAdmin && (
        <button onClick={(event) => { event.stopPropagation(); handleDelete(post.id); }} className="inline-flex items-center gap-1 rounded border border-red-400/15 px-2 py-1 text-red-300/70 hover:text-red-300 hover:bg-red-400/10 transition-colors" title="Fshi">
          <Trash2 className="w-3.5 h-3.5" />
          <span>Fshi</span>
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Input
          value={filters.search}
          onChange={e => setFilter("search", e.target.value)}
          placeholder="Kërko në tekst, qytet, burim..."
          className="w-56 bg-white/5 border-white/10 text-white text-xs h-8"
          style={{ background: "rgba(255,255,255,0.05)", color: "#fff" }}
        />
        <FilterSelect value={filters.status} onValueChange={v => setFilter("status", v)} label="Statusi" width="w-44">
          {Object.entries(STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v} className="text-white">Statusi: {l}</SelectItem>)}
        </FilterSelect>
        <FilterSelect value={filters.category} onValueChange={v => setFilter("category", v)} label="Kategoria" width="w-44">
          {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value} className="text-white">Kategoria: {c.label}</SelectItem>)}
        </FilterSelect>
        <FilterSelect value={filters.listing_type} onValueChange={v => setFilter("listing_type", v)} label="Lloji" width="w-44">
          {LISTING_TYPES.map(t => <SelectItem key={t.value} value={t.value} className="text-white">Lloji: {t.label}</SelectItem>)}
        </FilterSelect>
        <FilterSelect value={filters.source} onValueChange={v => setFilter("source", v)} label="Burimi" width="w-48">
          {SOURCES.map(s => <SelectItem key={s.value} value={s.value} className="text-white">Burimi: {s.label}</SelectItem>)}
        </FilterSelect>
        <Select value={`${sort.key}:${sort.direction}`} onValueChange={(value) => {
          const [key, direction] = value.split(":");
          setSort({ key, direction });
        }}>
          <SelectTrigger className="w-52 bg-white/5 border-white/10 text-white h-8 text-xs" style={{ background: "rgba(255,255,255,0.05)", color: "#fff" }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#0b1020] border-white/10">
            {columns.map((column) => (
              <React.Fragment key={column.key}>
                <SelectItem value={`${column.key}:asc`} className="text-white">Rendit: {column.label} A-Z</SelectItem>
                <SelectItem value={`${column.key}:desc`} className="text-white">Rendit: {column.label} Z-A</SelectItem>
              </React.Fragment>
            ))}
          </SelectContent>
        </Select>
        <details className="relative">
          <summary className="inline-flex h-8 cursor-pointer list-none items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 text-xs text-white hover:bg-white/10">
            <Columns3 className="h-3.5 w-3.5" /> Kolonat
          </summary>
          <div className="absolute right-0 z-30 mt-2 w-72 rounded-xl border border-white/10 bg-[#0b1020] p-3 shadow-2xl">
            <p className="mb-2 text-xs font-semibold text-white">Shfaq, fsheh ose zhvendos kolonat</p>
            <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
              {columnOrder.map((key, index) => {
                const column = columnByKey[key];
                if (!column) return null;
                return (
                  <div key={key} className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.03] px-2 py-1.5 text-xs text-white/80">
                    <input
                      type="checkbox"
                      checked={visibleColumnKeys.has(key)}
                      onChange={(event) => {
                        setVisibleColumnKeys((current) => {
                          const next = new Set(current);
                          if (event.target.checked) next.add(key);
                          else next.delete(key);
                          return next;
                        });
                      }}
                    />
                    <span className="min-w-0 flex-1 truncate">{column.label}</span>
                    <button disabled={index === 0} onClick={() => moveColumn(key, columnOrder[index - 1])} className="rounded border border-white/10 px-1.5 py-0.5 disabled:opacity-30">←</button>
                    <button disabled={index === columnOrder.length - 1} onClick={() => moveColumn(key, columnOrder[index + 1])} className="rounded border border-white/10 px-1.5 py-0.5 disabled:opacity-30">→</button>
                  </div>
                );
              })}
            </div>
          </div>
        </details>
        <Select value={pageSize} onValueChange={setPageSize}>
          <SelectTrigger className="w-36 bg-white/5 border-white/10 text-white h-8 text-xs" style={{ background: "rgba(255,255,255,0.05)", color: "#fff" }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#0b1020] border-white/10">
            <SelectItem value="20" className="text-white">20 për faqe</SelectItem>
            <SelectItem value="50" className="text-white">50 për faqe</SelectItem>
            <SelectItem value="100" className="text-white">100 për faqe</SelectItem>
            <SelectItem value="all" className="text-white">Të gjitha</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selectedPosts.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#8ab4ff]/20 bg-[#8ab4ff]/10 px-3 py-2 text-xs text-white">
          <span className="font-semibold">{selectedPosts.length} të selektuara</span>
          <button onClick={() => handleBulk("approve")} disabled={!!bulkBusy} className="rounded border border-emerald-300/25 px-2 py-1 text-emerald-100 hover:bg-emerald-300/10 disabled:opacity-40">Mirato në grup</button>
          {isAdmin && <button onClick={() => handleBulk("publish")} disabled={!!bulkBusy} className="rounded border border-[#9bffd6]/25 px-2 py-1 text-[#9bffd6] hover:bg-[#9bffd6]/10 disabled:opacity-40">Publiko në grup</button>}
          <button onClick={() => handleBulk("reject")} disabled={!!bulkBusy} className="rounded border border-yellow-300/25 px-2 py-1 text-yellow-100 hover:bg-yellow-300/10 disabled:opacity-40">Refuzo në grup</button>
          {isAdmin && <button onClick={() => handleBulk("delete")} disabled={!!bulkBusy} className="rounded border border-red-300/25 px-2 py-1 text-red-200 hover:bg-red-300/10 disabled:opacity-40">Fshi në grup</button>}
          {bulkBusy && <Loader2 className="h-4 w-4 animate-spin text-white/60" />}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-white/40 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-white/40 text-sm">Nuk u gjetën postime të importuara.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full table-fixed text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="w-10 px-3 py-2.5 text-left">
                  <input type="checkbox" checked={allVisibleSelected} onChange={(event) => toggleAllVisible(event.target.checked)} aria-label="Selekto të gjitha" />
                </th>
                {visibleColumns.map((column) => (
                  <th
                    key={column.key}
                    draggable
                    onDragStart={() => setDragColumn(column.key)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => { moveColumn(dragColumn, column.key); setDragColumn(""); }}
                    className="relative select-none px-3 py-2.5 text-left font-medium text-white/50"
                    style={{ width: columnWidths[column.key] || column.width }}
                  >
                    <button type="button" onClick={() => sortBy(column.key)} className="inline-flex max-w-full items-center gap-1 truncate hover:text-white">
                      <span className="truncate">{column.label}</span>
                      <ArrowUpDown className={`h-3 w-3 ${sort.key === column.key ? "text-[#8ff0cf]" : "text-white/25"}`} />
                    </button>
                    <span onMouseDown={(event) => startResize(column.key, event)} className="absolute right-0 top-0 h-full w-2 cursor-col-resize border-r border-white/10 hover:border-[#8ff0cf]" />
                  </th>
                ))}
                <th className="sticky right-0 z-10 w-[250px] bg-[#171d2d] px-3 py-2.5 text-left font-medium text-white/50">Veprime</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(post => {
                const reallyPublished = isPublishedInJobs(post, publishedJobLinks);
                const needsPublish = !reallyPublished;
                const selected = selectedId === post.id;
                return (
                  <React.Fragment key={post.id}>
                    <tr
                      onClick={() => setSelectedId((current) => current === post.id ? null : post.id)}
                      className={`border-b border-white/5 transition-colors cursor-pointer ${selected ? "bg-[#8ab4ff]/10 ring-1 ring-inset ring-[#8ab4ff]/25" : "hover:bg-white/5"}`}
                      aria-selected={selected}
                    >
                      <td className="px-3 py-2.5" onClick={(event) => event.stopPropagation()}>
                        <input type="checkbox" checked={selectedIds.has(post.id)} onChange={(event) => toggleSelected(post.id, event.target.checked)} aria-label="Selekto njoftimin" />
                      </td>
                      {visibleColumns.map((column) => (
                        <td key={column.key} className="overflow-hidden px-3 py-2.5 text-white/70 whitespace-nowrap" style={{ width: columnWidths[column.key] || column.width }}>
                          {column.render(post)}
                        </td>
                      ))}
                      <td className="sticky right-0 z-[1] px-3 py-2.5 bg-[#0b1020]/95 shadow-[-12px_0_18px_rgba(11,16,32,0.8)]">
                        <ActionButtons post={post} needsPublish={needsPublish} />
                      </td>
                    </tr>
                    {selected && (
                      <tr className="border-b border-[#8ab4ff]/20 bg-[#8ab4ff]/10">
                        <td colSpan={visibleColumns.length + 2} className="px-3 py-3">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0 text-white/75">
                              <p className="font-semibold text-white truncate">{post.edited_text?.slice(0, 120) || post.shqip_title || "Njoftim i importuar"}</p>
                              <p className="text-[11px] text-white/45">Zgjidh një veprim për këtë import. Nëse statusi është “Publikuar” por mungon postimi publik, përdor “Ripubliko”.</p>
                              {(post.quality_notes || []).length > 0 && (
                                <p className="mt-1 text-[11px] text-yellow-200/75">{post.quality_notes.join(" ")}</p>
                              )}
                            </div>
                            <ActionButtons post={post} needsPublish={needsPublish} />
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/40">
        <p>
          {filtered.length === 0
            ? "0 postime"
            : `Duke shfaqur ${pageStart + 1}-${Math.min(pageStart + paginated.length, filtered.length)} nga ${filtered.length} postime`}
        </p>
        {pageSize !== "all" && totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={safePage <= 1}
              className="rounded-md border border-white/10 px-2 py-1 text-white/70 hover:bg-white/10 disabled:opacity-35"
            >
              Mbrapa
            </button>
            <span>Faqja {safePage} / {totalPages}</span>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={safePage >= totalPages}
              className="rounded-md border border-white/10 px-2 py-1 text-white/70 hover:bg-white/10 disabled:opacity-35"
            >
              Para
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
