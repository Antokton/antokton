import React, { useState } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2, Pencil, Trash2, Globe } from "lucide-react";
import { CATEGORIES, LISTING_TYPES, SOURCES, STATUS_LABELS, STATUS_COLORS } from "./importConstants";

const getCategoryLabel = (value) => {
  if (value === "prona") return "Pazar";
  return CATEGORIES.find(c => c.value === value)?.label || "—";
};
import { publishImportedPost } from "./publishImportedPost";
import moment from "moment";

const isPublishedInJobs = (post, publishedJobLinks) => (
  post.status === "publikuar" &&
  (publishedJobLinks.ids.has(post.published_post_id) || publishedJobLinks.importIds.has(post.id))
);

export default function ImportTable({ user, onEdit }) {
  const qc = useQueryClient();
  const [filters, setFilters] = useState({ status: "all", category: "all", listing_type: "all", source: "all", search: "" });
  const [publishingId, setPublishingId] = useState(null);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["importedPosts"],
    queryFn: () => base44.entities.ImportedPost.list("-created_date", 200),
  });

  const { data: publishedJobs = [] } = useQuery({
    queryKey: ["jobs", "imported-links"],
    queryFn: () => base44.entities.Job.filter({ status: "approved" }, "-created_date", 500),
  });

  const publishedJobLinks = React.useMemo(() => ({
    ids: new Set(publishedJobs.map((job) => job.id || job._id).filter(Boolean)),
    importIds: new Set(publishedJobs.map((job) => job.original_import_id).filter(Boolean)),
  }), [publishedJobs]);

  const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val }));

  const filtered = posts.filter(p => {
    if (filters.status !== "all" && p.status !== filters.status) return false;
    if (filters.category !== "all" && p.category !== filters.category) return false;
    if (filters.listing_type !== "all" && p.listing_type !== filters.listing_type) return false;
    if (filters.source !== "all" && p.source !== filters.source) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!`${p.edited_text} ${p.author_name} ${p.city} ${p.country}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const handleDelete = async (id) => {
    if (!confirm("Jeni të sigurt?")) return;
    await base44.entities.ImportedPost.delete(id);
    qc.invalidateQueries({ queryKey: ["importedPosts"] });
  };

  const handleQuickPublish = async (post) => {
    setPublishingId(post.id);
    try {
      const postToPublish = isPublishedInJobs(post, publishedJobLinks)
        ? post
        : { ...post, published_post_id: "" };
      await publishImportedPost(base44, postToPublish, user);
      qc.invalidateQueries({ queryKey: ["importedPosts"] });
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["jobs", "imported-links"] });
    } catch (error) {
      alert(error?.message || "Publikimi dështoi. Provo përsëri.");
    } finally {
      setPublishingId(null);
    }
  };

  const isAdmin = user.role === "admin";

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Input
          value={filters.search}
          onChange={e => setFilter("search", e.target.value)}
          placeholder="Kërko..."
          className="w-40 bg-white/5 border-white/10 text-white text-xs h-8"
          style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }}
        />
        <Select value={filters.status} onValueChange={v => setFilter("status", v)}>
          <SelectTrigger className="w-36 bg-white/5 border-white/10 text-white h-8 text-xs" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }}>
            <SelectValue placeholder="Statusi" />
          </SelectTrigger>
          <SelectContent className="bg-[#0b1020] border-white/10">
            <SelectItem value="all" className="text-white">Të gjitha</SelectItem>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v} className="text-white">{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.category} onValueChange={v => setFilter("category", v)}>
          <SelectTrigger className="w-36 bg-white/5 border-white/10 text-white h-8 text-xs" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }}>
            <SelectValue placeholder="Kategoria" />
          </SelectTrigger>
          <SelectContent className="bg-[#0b1020] border-white/10">
            <SelectItem value="all" className="text-white">Të gjitha</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value} className="text-white">{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.listing_type} onValueChange={v => setFilter("listing_type", v)}>
          <SelectTrigger className="w-36 bg-white/5 border-white/10 text-white h-8 text-xs" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }}>
            <SelectValue placeholder="Lloji" />
          </SelectTrigger>
          <SelectContent className="bg-[#0b1020] border-white/10">
            <SelectItem value="all" className="text-white">Të gjitha</SelectItem>
            {LISTING_TYPES.map(t => <SelectItem key={t.value} value={t.value} className="text-white">{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.source} onValueChange={v => setFilter("source", v)}>
          <SelectTrigger className="w-40 bg-white/5 border-white/10 text-white h-8 text-xs" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }}>
            <SelectValue placeholder="Burimi" />
          </SelectTrigger>
          <SelectContent className="bg-[#0b1020] border-white/10">
            <SelectItem value="all" className="text-white">Të gjitha</SelectItem>
            {SOURCES.map(s => <SelectItem key={s.value} value={s.value} className="text-white">{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-white/40 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-white/40 text-sm">Nuk u gjetën postime të importuara.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                {["Teksti", "Autori", "Kategoria", "Shteti", "Rajoni", "Qyteti", "Lloji", "Burimi", "Statusi", "Importuar nga", "Data", ""].map(h => (
                  <th key={h} className="text-left px-3 py-2.5 text-white/50 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(post => {
                const reallyPublished = isPublishedInJobs(post, publishedJobLinks);
                const needsPublish = !reallyPublished;
                return (
                <tr key={post.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-3 py-2.5 max-w-[200px]">
                    <p className="text-white/80 truncate">{post.edited_text?.slice(0, 60)}...</p>
                  </td>
                  <td className="px-3 py-2.5 text-white/70 whitespace-nowrap">{post.author_name || "—"}</td>
                  <td className="px-3 py-2.5 text-white/70">{getCategoryLabel(post.category)}</td>
                  <td className="px-3 py-2.5 text-white/70 whitespace-nowrap">{post.country || "—"}</td>
                  <td className="px-3 py-2.5 text-white/70 whitespace-nowrap">{post.region || "—"}</td>
                  <td className="px-3 py-2.5 text-white/70 whitespace-nowrap">{post.city || "—"}</td>
                  <td className="px-3 py-2.5 text-white/70">{LISTING_TYPES.find(t => t.value === post.listing_type)?.label || "—"}</td>
                  <td className="px-3 py-2.5 text-white/70">{SOURCES.find(s => s.value === post.source)?.label || "—"}</td>
                  <td className="px-3 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${reallyPublished ? STATUS_COLORS.publikuar : "bg-yellow-400/15 text-yellow-300"}`}>
                      {reallyPublished ? (STATUS_LABELS[post.status] || post.status) : "Në pritje"}
                    </span>
                    {!reallyPublished && post.status === "publikuar" && (
                      <p className="mt-1 text-[10px] text-yellow-300/70">mungon postimi publik</p>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-white/50 whitespace-nowrap">{post.imported_by?.split("@")[0] || "—"}</td>
                  <td className="px-3 py-2.5 text-white/40 whitespace-nowrap">{moment(post.created_date).format("DD/MM/YY")}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      <button onClick={() => onEdit(post)} className="inline-flex items-center gap-1 rounded border border-white/10 px-2 py-1 text-white/70 hover:text-white hover:bg-white/10 transition-colors" title="Përpuno">
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Përpuno</span>
                      </button>
                      {isAdmin && needsPublish && (
                        <button onClick={() => handleQuickPublish(post)} disabled={publishingId === post.id} className="inline-flex items-center gap-1 rounded border border-[#9bffd6]/20 px-2 py-1 text-[#9bffd6]/80 hover:text-[#9bffd6] hover:bg-[#9bffd6]/10 transition-colors disabled:opacity-40" title="Publiko">
                          {publishingId === post.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                          <span>{post.status === "publikuar" ? "Ripubliko" : "Publiko"}</span>
                        </button>
                      )}
                      {isAdmin && (
                        <button onClick={() => handleDelete(post.id)} className="inline-flex items-center gap-1 rounded border border-red-400/15 px-2 py-1 text-red-300/70 hover:text-red-300 hover:bg-red-400/10 transition-colors" title="Fshi">
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Fshi</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-white/30 text-xs text-right">{filtered.length} postime</p>
    </div>
  );
}
