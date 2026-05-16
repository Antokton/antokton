import React, { useState, useEffect } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Save, Loader2, Star, Pin, Trash2, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";

const HOMEPAGE_FIELDS = [
  {
    group: "promo_banner",
    label: "📢 Baneri Promovues (top)",
    fields: [
      { key: "promo_enabled", label: "Aktivo Banerin", type: "toggle" },
      { key: "promo_title", label: "Teksti kryesor (i theksuar)", placeholder: "Ju jeni ndër vizitorët e parë të Antokton.", type: "text" },
      { key: "promo_body", label: "Teksti i plotë i banerit", placeholder: "Për këtë arsye keni të drejtën...", type: "textarea" },
      { key: "promo_highlight", label: "Teksti i theksuar (kursivis)", placeholder: "Vllaznia që a n'tok ton...", type: "text" },
    ]
  },
  {
    group: "hero",
    label: "🏠 Seksioni Hero (ballina)",
    fields: [
      { key: "hero_title_line1", label: "Rreshti 1 i titullit", placeholder: "Bashkësia shqiptare", type: "text" },
      { key: "hero_title_line2", label: "Rreshti 2 (me gradient)", placeholder: "në Europë", type: "text" },
      { key: "hero_subtitle", label: "Nëntitulli", placeholder: "Platforma e parë shqiptare...", type: "textarea" },
      { key: "hero_cta_primary", label: "Butoni kryesor (teksti)", placeholder: "Shiko Njoftimet", type: "text" },
      { key: "hero_cta_secondary", label: "Butoni dytësor (teksti)", placeholder: "Regjistrohu Falas", type: "text" },
    ]
  },
  {
    group: "homepage_sections",
    label: "📋 Seksionet e Faqes Kryesore",
    fields: [
      { key: "show_featured_jobs", label: "Shfaq Njoftime të Fundit", type: "toggle" },
      { key: "show_featured_events", label: "Shfaq Ngjarje", type: "toggle" },
      { key: "show_stats", label: "Shfaq Statistikat", type: "toggle" },
      { key: "show_how_it_works", label: "Shfaq 'Si funksionon'", type: "toggle" },
      { key: "featured_jobs_count", label: "Numri i njoftimeve të shfaqura", placeholder: "6", type: "text" },
    ]
  },
  {
    group: "announcement",
    label: "📣 Njoftim i Veçantë (site-wide)",
    fields: [
      { key: "announcement_enabled", label: "Aktivo Njoftimin", type: "toggle" },
      { key: "announcement_text", label: "Teksti i njoftimit", placeholder: "Platformа është në fazë beta...", type: "textarea" },
      { key: "announcement_type", label: "Lloji (info / warning / success)", placeholder: "info", type: "text" },
      { key: "announcement_link", label: "Linku (opsional)", placeholder: "https://...", type: "text" },
    ]
  },
];

export default function HomepageManager() {
  const queryClient = useQueryClient();
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ["siteConfig"],
    queryFn: () => base44.entities.SiteConfig.list(),
  });

  // Featured jobs
  const { data: approvedJobs = [] } = useQuery({
    queryKey: ["approvedJobsForFeature"],
    queryFn: () => base44.entities.Job.filter({ status: "approved" }, "-created_date", 50),
  });

  const { data: featuredJobs = [] } = useQuery({
    queryKey: ["featuredJobs"],
    queryFn: () => base44.entities.FeaturedJob.list("-created_date", 20),
  });

  const pinMutation = useMutation({
    mutationFn: async (job) => {
      const alreadyFeatured = featuredJobs.find(f => f.job_id === job.id);
      if (alreadyFeatured) {
        await base44.entities.FeaturedJob.delete(alreadyFeatured.id);
      } else {
        await base44.entities.FeaturedJob.create({ job_id: job.id, job_title: job.title, job_category: job.category });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["featuredJobs"] }),
  });

  useEffect(() => {
    if (configs.length > 0) {
      const map = {};
      configs.forEach(c => { map[c.key] = c.value; });
      setValues(map);
    }
  }, [configs]);

  const handleSave = async (group) => {
    setSaving(true);
    try {
      const groupSchema = HOMEPAGE_FIELDS.find(g => g.group === group);
      if (!groupSchema) return;

      for (const field of groupSchema.fields) {
        const val = values[field.key] ?? (field.type === "toggle" ? "true" : "");
        const existing = configs.find(c => c.key === field.key);
        if (existing) {
          await base44.entities.SiteConfig.update(existing.id, { value: val });
        } else {
          await base44.entities.SiteConfig.create({ key: field.key, value: val, label: field.label, group });
        }
      }

      queryClient.invalidateQueries({ queryKey: ["siteConfig"] });
      toast.success("Ndryshimet u ruajtën!");
    } catch (e) {
      toast.error("Gabim gjatë ruajtjes");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 text-white/30 animate-spin" /></div>;
  }

  const isFeatured = (jobId) => featuredJobs.some(f => f.job_id === jobId);

  return (
    <div className="space-y-8">
      {HOMEPAGE_FIELDS.map(group => (
        <div key={group.group} className="rounded-xl border border-white/10 bg-white/5 p-5">
          <h3 className="text-white font-semibold mb-4 text-sm">{group.label}</h3>
          <div className="space-y-3">
            {group.fields.map(field => (
              <div key={field.key}>
                <label className="text-white/60 text-xs font-medium block mb-1">{field.label}</label>
                {field.type === "toggle" ? (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setValues({ ...values, [field.key]: values[field.key] === "false" ? "true" : "false" })}
                      className={`w-11 h-6 rounded-full transition-all relative ${
                        values[field.key] !== "false" ? "bg-[#8ab4ff]" : "bg-white/20"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${
                        values[field.key] !== "false" ? "left-5" : "left-0.5"
                      }`} />
                    </button>
                    <span className="text-white/60 text-xs">
                      {values[field.key] !== "false" ? "Aktiv" : "Jo aktiv"}
                    </span>
                  </div>
                ) : field.type === "textarea" ? (
                  <Textarea
                    value={values[field.key] || ""}
                    onChange={e => setValues({ ...values, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    className="min-h-[70px] resize-none text-sm bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                ) : (
                  <Input
                    value={values[field.key] || ""}
                    onChange={e => setValues({ ...values, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    className="h-9 text-sm bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                )}
              </div>
            ))}
          </div>
          <Button
            onClick={() => handleSave(group.group)}
            disabled={saving}
            className="mt-4 bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] h-8 text-xs"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}
            Ruaj
          </Button>
        </div>
      ))}

      {/* Featured / Pinned Jobs */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-5">
        <h3 className="text-white font-semibold mb-1 text-sm">📌 Njoftime të Ngjitura (Homepage)</h3>
        <p className="text-white/40 text-xs mb-4">Zgjedh cilat njoftime të shfaqen të ngjitura në ballina.</p>

        {featuredJobs.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {featuredJobs.map(f => (
              <Badge key={f.id} className="bg-[#8ab4ff]/20 text-[#8ab4ff] border-[#8ab4ff]/30 flex items-center gap-1.5">
                <Pin className="w-2.5 h-2.5" />
                {f.job_title}
                <button onClick={() => pinMutation.mutate({ id: f.job_id })} className="ml-1 hover:text-red-400">
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
          {approvedJobs.slice(0, 30).map(job => (
            <div
              key={job.id}
              className={`flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer transition-all ${
                isFeatured(job.id) ? "bg-[#8ab4ff]/10 border border-[#8ab4ff]/20" : "bg-white/5 border border-white/10 hover:bg-white/10"
              }`}
              onClick={() => pinMutation.mutate(job)}
            >
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-medium truncate">{job.title}</p>
                <p className="text-white/40 text-[10px]">{job.category} • {job.city || job.country}</p>
              </div>
              {isFeatured(job.id) ? (
                <Pin className="w-3.5 h-3.5 text-[#8ab4ff] shrink-0 ml-2" />
              ) : (
                <Pin className="w-3.5 h-3.5 text-white/20 shrink-0 ml-2" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}