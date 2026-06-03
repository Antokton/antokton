import React, { useState } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, ExternalLink, MapPin, Target, Users, Globe, Mail, HandHeart, Star, ChevronRight, Plus, Edit2, Trash2, X, Check, Calendar, Zap } from "lucide-react";
import { motion } from "framer-motion";

// ── Organizata statike ─────────────────────────────────────────────────
const STATIC_ORGS = [
  { id: "s1", name: "Caritas Shqipëri", type: "Organizatë Ndërkombëtare", flag: "🇦🇱", color: "#e63946", focus: ["Shëndetësi", "Arsim", "Emergjencë"], desc: "Organizata humanitare kryesore në Shqipëri, ofron ndihmë për familjet në nevojë, refugjatët dhe viktimat e fatkeqësive.", url: "https://caritas.al", domain: "caritas.al" },
  { id: "s2", name: "Terre des hommes Albania", type: "Mbrojtja e Fëmijëve", flag: "🇦🇱", color: "#f4a261", focus: ["Fëmijë", "Arsim", "Mbrojtje"], desc: "Organizatë ndërkombëtare që mbron të drejtat e fëmijëve dhe promovon aksesin në arsim cilësor.", url: "https://tdh-europe.org", domain: "tdh-europe.org" },
  { id: "s3", name: "World Vision Kosovë", type: "Zhvillim Komunitar", flag: "🇽🇰", color: "#3a86ff", focus: ["Fëmijë", "Komunitet", "Zhvillim"], desc: "Organizatë humanitare ndërkombëtare që mbështet fëmijët dhe komunitetet vulnerabël në Kosovë.", url: "https://wvi.org/Kosovo", domain: "wvi.org" },
  { id: "s4", name: "Nënë Tereza Foundation", type: "Shëndëtësi & Ndihmë", flag: "🇲🇰", color: "#9b5de5", focus: ["Shëndetësi", "Të varfër", "Kulturë"], desc: "Fondacioni i kushtuar trashëgimisë së Shën Nënë Terezës — mbështet të varfërit dhe të sëmurët.", url: "https://motherteresafoundation.org", domain: "motherteresafoundation.org" },
  { id: "s5", name: "UNICEF Albania", type: "OKB — Fëmijë", flag: "🇦🇱", color: "#00b4d8", focus: ["Fëmijë", "Shëndetësi", "Arsim"], desc: "UNICEF punon me qeverinë shqiptare për të siguruar që çdo fëmijë të ketë akses në shëndetësi dhe arsim cilësor.", url: "https://unicef.org/albania", domain: "unicef.org/albania" },
  { id: "s6", name: "Red Cross Shqipëri", type: "Kryqi i Kuq", flag: "🇦🇱", color: "#e63946", focus: ["Emergjencë", "Shëndetësi", "Trajnim"], desc: "Kryqi i Kuq Shqiptar ofron shërbime emergjence, trajnime të ndihmës së parë dhe ndihma humanitare.", url: "https://kksh.org.al", domain: "kksh.org.al" },
];

const HOW_TO_HELP = [
  { icon: "💰", title: "Dhuro Online", desc: "Kontributo direkt tek organizatat e listuara sipas mundësisë tënde." },
  { icon: "🤝", title: "Vullnetar", desc: "Ofro kohën dhe aftësitë tua duke u bashkuar si vullnetar tek organizatat lokale." },
  { icon: "📢", title: "Ndaj", desc: "Ndaj projektet bamirëse në rrjetet sociale dhe fto miqtë të kontribuojnë." },
  { icon: "🏢", title: "Partnerizo", desc: "Kompania jote mund të bëhet partner bamirësie — na kontakto në info@antokton.com." },
];

const CATEGORY_LABELS = { arsim: "Arsim", shendetesi: "Shëndetësi", infrastrukture: "Infrastrukturë", emergjence: "Emergjencë", kulture: "Kulturë", tjeter: "Tjetër" };
const CATEGORY_COLORS = { arsim: "#3a86ff", shendetesi: "#e63946", infrastrukture: "#f4a261", emergjence: "#ff6b35", kulture: "#9b5de5", tjeter: "#adb5bd" };
const STATIC_ORGS_CONFIG_KEY = "bamiresi_static_orgs";

function parseOrgConfig(value) {
  if (!value) return STATIC_ORGS;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : STATIC_ORGS;
  } catch {
    return STATIC_ORGS;
  }
}

function ProgressBar({ goal, raised }) {
  if (!goal) return null;
  const pct = Math.min(100, Math.round(((raised || 0) / goal) * 100));
  return (
    <div className="mt-3">
      <div className="flex justify-between text-xs text-white/50 mb-1.5">
        <span>€{(raised || 0).toLocaleString()} mbledhur</span>
        <span className="font-semibold text-white/70">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: "linear-gradient(90deg,#8ab4ff,#9bffd6)" }} />
      </div>
      <div className="text-xs text-white/30 mt-1">Synohet: €{goal.toLocaleString()}</div>
    </div>
  );
}

function ProjectCard({ project, isAdmin, onEdit, onDelete, onToggleFeatured }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/10 overflow-hidden flex flex-col relative"
      style={{ background: "rgba(255,255,255,0.05)" }}>
      {project.is_charity_call && (
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "#e63946", color: "#fff" }}>
          <Zap className="w-3 h-3" /> Thirrje
        </div>
      )}
      {isAdmin && (
        <div className="absolute top-2 right-2 z-10 flex gap-1">
          <button onClick={() => onEdit(project)} className="w-7 h-7 rounded-full flex items-center justify-center bg-black/50 text-white/70 hover:text-white"><Edit2 className="w-3.5 h-3.5" /></button>
          <button onClick={() => onDelete(project.id)} className="w-7 h-7 rounded-full flex items-center justify-center bg-black/50 text-red-400 hover:text-red-300"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      )}
      {project.image_url && <img src={project.image_url} alt={project.title} className="w-full h-40 object-cover" />}
      {!project.image_url && (
        <div className="h-20 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${CATEGORY_COLORS[project.category] || "#8ab4ff"}22, transparent)` }}>
          <Heart className="w-8 h-8 text-white/20" />
        </div>
      )}
      <div className="p-5 flex flex-col flex-1 gap-2">
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full self-start border"
          style={{ color: CATEGORY_COLORS[project.category] || "#8ab4ff", borderColor: `${CATEGORY_COLORS[project.category] || "#8ab4ff"}40`, background: `${CATEGORY_COLORS[project.category] || "#8ab4ff"}15` }}>
          {CATEGORY_LABELS[project.category] || project.category}
        </span>
        <h3 className="text-white font-semibold text-base leading-tight">{project.title}</h3>
        {project.organizer && <p className="text-white/40 text-xs flex items-center gap-1"><Users className="w-3 h-3" />{project.organizer}</p>}
        {project.country && <p className="text-white/40 text-xs flex items-center gap-1"><MapPin className="w-3 h-3" />{project.country}</p>}
        <p className="text-white/55 text-sm leading-relaxed flex-1">
          {project.short_description || (project.description || "").slice(0, 130) + ((project.description || "").length > 130 ? "…" : "")}
        </p>
        {project.goal_amount && <ProgressBar goal={project.goal_amount} raised={project.raised_amount || 0} />}
        {project.deadline && (
          <p className="text-xs text-white/30 flex items-center gap-1"><Target className="w-3 h-3" />Afati: {new Date(project.deadline).toLocaleDateString("sq-AL")}</p>
        )}
        {isAdmin && (
          <div className="flex gap-2 mt-2 flex-wrap">
            <button onClick={() => onToggleFeatured(project, "featured_day")}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold border transition-all ${project.featured_day ? "bg-yellow-500/20 border-yellow-500/40 text-yellow-400" : "bg-white/5 border-white/10 text-white/40"}`}>
              <Calendar className="w-3 h-3" /> Ngjarje Ditës
            </button>
            <button onClick={() => onToggleFeatured(project, "featured_week")}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold border transition-all ${project.featured_week ? "bg-[#8ab4ff]/20 border-[#8ab4ff]/40 text-[#8ab4ff]" : "bg-white/5 border-white/10 text-white/40"}`}>
              <Star className="w-3 h-3" /> Ngjarje Javës
            </button>
          </div>
        )}
        {project.donation_link && (
          <a href={project.donation_link} target="_blank" rel="noopener noreferrer"
            className="mt-3 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-[#0b1020] w-full"
            style={{ background: "linear-gradient(135deg,#8ab4ff,#9bffd6)" }}>
            <Heart className="w-4 h-4" /> Dono tani <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
        {project.contact_email && !project.donation_link && (
          <a href={`mailto:${project.contact_email}`}
            className="mt-3 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-all w-full">
            Kontakto
          </a>
        )}
      </div>
    </motion.div>
  );
}

const EMPTY_FORM = {
  title: "", description: "", short_description: "", category: "tjeter",
  image_url: "", goal_amount: "", raised_amount: "", donation_link: "",
  contact_email: "", country: "", organizer: "", is_active: true,
  is_charity_call: false, deadline: "", order: 0
};

function ProjectModal({ project, onClose, onSave }) {
  const [form, setForm] = useState(project ? {
    ...EMPTY_FORM, ...project,
    goal_amount: project.goal_amount || "",
    raised_amount: project.raised_amount || "",
  } : EMPTY_FORM);

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+112px)] pt-[calc(env(safe-area-inset-top)+88px)] sm:items-center sm:p-4" style={{ background: "rgba(0,0,0,0.8)", WebkitOverflowScrolling: "touch" }} onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-white/10 overflow-hidden shadow-2xl max-h-[calc(100dvh-220px)] sm:max-h-[90vh] flex flex-col" style={{ background: "#1a2640" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <h3 className="text-white font-bold">{project ? "Përpuno Projektin" : "Shto Projekt / Thirrje"}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:bg-white/10"><X className="w-4 h-4" /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-5 space-y-3" style={{ WebkitOverflowScrolling: "touch" }}>
          <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
            <input type="checkbox" checked={!!form.is_charity_call} onChange={e => setForm(f => ({ ...f, is_charity_call: e.target.checked }))} className="w-4 h-4 rounded" />
            <Zap className="w-4 h-4 text-red-400" /> Thirrje Bamirësie (shfaqet në Njoftime)
          </label>
          {[
            { label: "Titulli*", key: "title", type: "text" },
            { label: "Organizatori", key: "organizer", type: "text" },
            { label: "Vendi", key: "country", type: "text" },
            { label: "Email kontakti", key: "contact_email", type: "email" },
            { label: "Link donacioni", key: "donation_link", type: "url" },
            { label: "Foto (URL)", key: "image_url", type: "url" },
            { label: "Shuma e synuar (€)", key: "goal_amount", type: "number" },
            { label: "Shuma e mbledhur (€)", key: "raised_amount", type: "number" },
            { label: "Afati", key: "deadline", type: "date" },
            { label: "Renditja", key: "order", type: "number" },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs text-white/50 mb-1">{f.label}</label>
              <input type={f.type} value={form[f.key] || ""} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none border border-white/10 bg-white/5 focus:border-[#8ab4ff]/50" />
            </div>
          ))}
          <div>
            <label className="block text-xs text-white/50 mb-1">Kategoria</label>
            <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none border border-white/10 bg-[#1a2640] focus:border-[#8ab4ff]/50">
              {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1">Përshkrim i shkurtër</label>
            <textarea value={form.short_description || ""} onChange={e => setForm(p => ({ ...p, short_description: e.target.value }))} rows={2}
              className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none border border-white/10 bg-white/5 focus:border-[#8ab4ff]/50 resize-none" />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1">Përshkrimi i plotë*</label>
            <textarea value={form.description || ""} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={4}
              className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none border border-white/10 bg-white/5 focus:border-[#8ab4ff]/50 resize-none" />
          </div>
          <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
            <input type="checkbox" checked={!!form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4 rounded" />
            Aktiv
          </label>
        </div>
        <div className="px-5 py-4 border-t border-white/10 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-white/60 hover:bg-white/5">Anulo</button>
          <button onClick={() => onSave({ ...form, goal_amount: form.goal_amount ? Number(form.goal_amount) : null, raised_amount: form.raised_amount ? Number(form.raised_amount) : 0, order: Number(form.order) || 0 })}
            className="px-5 py-2 rounded-lg text-sm font-bold text-[#0b1020]" style={{ background: "linear-gradient(to right, #8ab4ff, #9bffd6)" }}>
            <Check className="w-4 h-4 inline mr-1" /> Ruaj
          </button>
        </div>
      </div>
    </div>
  );
}

function OrgModal({ org, onClose, onSave }) {
  const [form, setForm] = useState({
    id: org?.id || `org_${Date.now()}`,
    name: org?.name || "",
    type: org?.type || "",
    flag: org?.flag || "🤝",
    color: org?.color || "#8ab4ff",
    focusText: (org?.focus || []).join(", "),
    desc: org?.desc || "",
    url: org?.url || "",
    domain: org?.domain || "",
  });

  const save = () => {
    const next = {
      ...form,
      focus: form.focusText.split(",").map((item) => item.trim()).filter(Boolean),
    };
    delete next.focusText;
    onSave(next);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+112px)] pt-[calc(env(safe-area-inset-top)+88px)] sm:items-center sm:p-4" style={{ background: "rgba(0,0,0,0.8)", WebkitOverflowScrolling: "touch" }} onClick={onClose}>
      <div className="flex max-h-[calc(100dvh-220px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 shadow-2xl sm:max-h-[90vh]" style={{ background: "#1a2640" }} onClick={(event) => event.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4">
          <h3 className="font-bold text-white">{org ? "Përpuno organizatën" : "Shto organizatë bamirësie"}</h3>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-white/50 hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-5" style={{ WebkitOverflowScrolling: "touch" }}>
          {[
            ["Emri*", "name", "text"],
            ["Lloji", "type", "text"],
            ["Simboli/flamuri", "flag", "text"],
            ["Ngjyra", "color", "text"],
            ["Fushat, të ndara me presje", "focusText", "text"],
            ["URL", "url", "url"],
            ["Domain", "domain", "text"],
          ].map(([label, key, type]) => (
            <div key={key}>
              <label className="mb-1 block text-xs text-white/50">{label}</label>
              <input
                type={type}
                value={form[key] || ""}
                onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#8ab4ff]/50"
              />
            </div>
          ))}
          <div>
            <label className="mb-1 block text-xs text-white/50">Përshkrimi</label>
            <textarea
              rows={4}
              value={form.desc || ""}
              onChange={(event) => setForm((prev) => ({ ...prev, desc: event.target.value }))}
              className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#8ab4ff]/50"
            />
          </div>
        </div>
        <div className="flex shrink-0 justify-end gap-3 border-t border-white/10 px-5 py-4">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-white/60 hover:bg-white/5">Anulo</button>
          <button onClick={save} className="rounded-lg px-5 py-2 text-sm font-bold text-[#0b1020]" style={{ background: "linear-gradient(to right, #8ab4ff, #9bffd6)" }}>
            <Check className="mr-1 inline h-4 w-4" /> Ruaj
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BamiresiFull() {
  const [user, setUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [editingOrg, setEditingOrg] = useState(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.isAuthenticated().then(async auth => {
      if (auth) setUser(await base44.auth.me());
    });
  }, []);

  const isAdmin = user?.role === "admin" || user?.role === "moderator";
  const canAddContent = user?.role === "admin";

  const { data: projects = [] } = useQuery({
    queryKey: ["charityProjects"],
    queryFn: () => base44.entities.CharityProject.list("order", 100),
  });

  const { data: siteConfigs = [] } = useQuery({
    queryKey: ["siteConfig"],
    queryFn: () => base44.entities.SiteConfig.list(),
  });

  const orgsConfig = siteConfigs.find((config) => config.key === STATIC_ORGS_CONFIG_KEY);
  const staticOrgs = React.useMemo(() => parseOrgConfig(orgsConfig?.value), [orgsConfig?.value]);

  const visibleProjects = isAdmin ? projects : projects.filter(p => p.is_active);
  const calls = visibleProjects.filter(p => p.is_charity_call);
  const regularProjects = visibleProjects.filter(p => !p.is_charity_call);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CharityProject.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["charityProjects"] }); setShowModal(false); setEditingProject(null); }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CharityProject.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["charityProjects"] }); setShowModal(false); setEditingProject(null); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CharityProject.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["charityProjects"] })
  });

  const staticOrgsMutation = useMutation({
    mutationFn: async (nextOrgs) => {
      const value = JSON.stringify(nextOrgs, null, 2);
      if (orgsConfig) {
        return base44.entities.SiteConfig.update(orgsConfig.id, { value });
      }
      return base44.entities.SiteConfig.create({
        key: STATIC_ORGS_CONFIG_KEY,
        value,
        label: "Organizatat statike te Bamirësisë",
        group: "bamiresi",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["siteConfig"] });
      setEditingOrg(null);
      setShowOrgModal(false);
    },
  });

  const handleSave = (formData) => {
    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id) => {
    if (confirm("Fshi këtë projekt?")) deleteMutation.mutate(id);
  };

  const handleToggleFeatured = (project, field) => {
    const now = new Date();
    const expires = new Date(field === "featured_day" ? now.getTime() + 24*60*60*1000 : now.getTime() + 7*24*60*60*1000);
    const isCurrentlyOn = project[field];
    updateMutation.mutate({
      id: project.id,
      data: {
        [field]: !isCurrentlyOn,
        [`${field}_expires`]: !isCurrentlyOn ? expires.toISOString() : null,
      }
    });
  };

  const handleSaveOrg = (org) => {
    const nextOrgs = staticOrgs.some((item) => item.id === org.id)
      ? staticOrgs.map((item) => (item.id === org.id ? org : item))
      : staticOrgs.concat(org);
    staticOrgsMutation.mutate(nextOrgs);
  };

  const handleDeleteOrg = (orgId) => {
    if (confirm("Fshihe këtë organizatë nga faqja Bamirësi?")) {
      staticOrgsMutation.mutate(staticOrgs.filter((org) => org.id !== orgId));
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-16">

      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="relative rounded-3xl overflow-hidden p-8 sm:p-14 text-center"
          style={{ background: "linear-gradient(135deg, rgba(230,57,70,0.12) 0%, rgba(138,180,255,0.08) 50%, rgba(155,255,214,0.06) 100%)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, rgba(230,57,70,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(138,180,255,0.2) 0%, transparent 50%)" }} />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/50 text-xs mb-5">
              <Heart className="w-3.5 h-3.5 text-red-400" /> Diaspora shqiptare bashkohet
            </div>
            <h1 className="text-3xl sm:text-5xl font-bold text-white mb-4">
              Bamirësi &{" "}
              <span style={{ background: "linear-gradient(135deg,#e63946,#8ab4ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Ndihmë</span>
            </h1>
            <p className="text-white/55 max-w-xl mx-auto text-sm leading-relaxed mb-8">
              Platforma jonë bashkon diasporën shqiptare me organizata bamirëse të besuara. Çdo kontribut — i vogël apo i madh — ndryshon jetëra.
            </p>
            <a href="mailto:info@antokton.com" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold text-[#0b1020]"
              style={{ background: "linear-gradient(135deg,#8ab4ff,#9bffd6)" }}>
              <Heart className="w-4 h-4" /> Regjistro organizatën tënde
            </a>
          </div>
        </div>
      </motion.div>

      {/* Admin Panel */}
      {isAdmin && (
        <section>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5 p-4 rounded-2xl border border-yellow-500/20" style={{ background: "rgba(234,179,8,0.06)" }}>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Star className="w-5 h-5 text-yellow-400" />
              <span className="text-yellow-400 font-bold text-sm">Panel Administratori</span>
              <span className="text-white/40 text-xs">— {projects.length} projekte gjithsej</span>
            </div>
            {canAddContent && (
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <button onClick={() => { setEditingProject(null); setShowModal(true); }}
                  className="flex w-full items-center justify-center gap-2 whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold text-[#0b1020] sm:w-auto"
                  style={{ background: "linear-gradient(to right,#8ab4ff,#9bffd6)" }}>
                  <Plus className="w-4 h-4" /> Shto Projekt / Thirrje
                </button>
                <button onClick={() => { setEditingOrg(null); setShowOrgModal(true); }}
                  className="flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold text-white hover:bg-white/10 sm:w-auto">
                  <Plus className="w-4 h-4" /> Shto organizatë bamirësie
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Si mund të ndihmosh */}
      <section>
        <div className="flex items-center gap-2.5 mb-7">
          <HandHeart className="w-5 h-5 text-red-400" />
          <h2 className="text-white font-bold text-xl">Si mund të ndihmosh?</h2>
          <div className="flex-1 h-px bg-white/8" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {HOW_TO_HELP.map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className="p-5 rounded-2xl border border-white/10 text-center hover:border-white/20 transition-all"
              style={{ background: "rgba(255,255,255,0.04)" }}>
              <div className="text-3xl mb-3">{item.icon}</div>
              <p className="text-white font-semibold text-sm mb-1.5">{item.title}</p>
              <p className="text-white/45 text-xs leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Thirrje Bamirësie */}
      {calls.length > 0 && (
        <section>
          <div className="flex items-center gap-2.5 mb-7">
            <Zap className="w-5 h-5 text-red-400" />
            <h2 className="text-white font-bold text-xl">Thirrje Bamirësie</h2>
            <div className="flex-1 h-px bg-white/8" />
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {calls.map(p => (
              <ProjectCard key={p.id} project={p} isAdmin={isAdmin}
                onEdit={(p) => { setEditingProject(p); setShowModal(true); }}
                onDelete={handleDelete} onToggleFeatured={handleToggleFeatured} />
            ))}
          </div>
        </section>
      )}

      {/* Organizata të besuara (statike) */}
      <section>
        <div className="flex items-center gap-2.5 mb-7">
          <Star className="w-5 h-5 text-[#9bffd6]" />
          <h2 className="text-white font-bold text-xl">Organizata të besuara</h2>
          <div className="flex-1 h-px bg-white/8" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {staticOrgs.map((org, i) => (
            <motion.div key={org.id}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              whileHover={{ y: -3 }}
              className="group relative flex flex-col p-5 rounded-2xl border border-white/10 hover:border-white/25 transition-all"
              style={{ background: "rgba(255,255,255,0.05)" }}>
              {isAdmin && (
                <div className="absolute right-2 top-2 z-10 flex gap-1">
                  <button onClick={() => { setEditingOrg(org); setShowOrgModal(true); }} className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white/70 hover:text-white" title="Përpuno">
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleDeleteOrg(org.id)} className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-red-400 hover:text-red-300" title="Fshihe">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 border border-white/10" style={{ background: `${org.color}18` }}>{org.flag}</div>
                <div>
                  <p className="text-white font-semibold text-sm leading-tight">{org.name}</p>
                  <p className="text-white/35 text-xs mt-0.5">{org.type}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {org.focus.map(f => (
                  <span key={f} className="text-[10px] px-2 py-0.5 rounded-full border"
                    style={{ color: org.color, borderColor: `${org.color}40`, background: `${org.color}12` }}>{f}</span>
                ))}
              </div>
              <p className="text-white/50 text-xs leading-relaxed flex-1">{org.desc}</p>
              <a href={org.url} target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center gap-1 text-[#8ab4ff] text-xs font-medium group-hover:gap-2 transition-all">
                <Globe className="w-3 h-3" /> {org.domain} <ChevronRight className="w-3 h-3" />
              </a>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Projekte nga komuniteti (nga DB) */}
      {regularProjects.length > 0 && (
        <section>
          <div className="flex items-center gap-2.5 mb-7">
            <Heart className="w-5 h-5 text-red-400" />
            <h2 className="text-white font-bold text-xl">Projekte nga komuniteti</h2>
            <div className="flex-1 h-px bg-white/8" />
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {regularProjects.map(p => (
              <ProjectCard key={p.id} project={p} isAdmin={isAdmin}
                onEdit={(p) => { setEditingProject(p); setShowModal(true); }}
                onDelete={handleDelete} onToggleFeatured={handleToggleFeatured} />
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <div className="rounded-2xl border border-white/10 p-8 sm:p-12 text-center"
        style={{ background: "linear-gradient(135deg, rgba(230,57,70,0.06), rgba(138,180,255,0.04))" }}>
        <Heart className="w-10 h-10 text-red-400/60 mx-auto mb-4" />
        <h3 className="text-white font-bold text-xl mb-2">Ke një projekt bamirësie?</h3>
        <p className="text-white/45 text-sm mb-6 max-w-md mx-auto">Nëse drejton ose njeh një organizatë bamirëse shqiptare, na kontakto për ta shtuar në platformë.</p>
        <a href="mailto:info@antokton.com" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold text-[#0b1020]"
          style={{ background: "linear-gradient(135deg,#8ab4ff,#9bffd6)" }}>
          <Mail className="w-4 h-4" /> info@antokton.com
        </a>
      </div>

      {/* Modal */}
      {showModal && (
        <ProjectModal
          project={editingProject}
          onClose={() => { setShowModal(false); setEditingProject(null); }}
          onSave={handleSave}
        />
      )}
      {showOrgModal && (
        <OrgModal
          org={editingOrg}
          onClose={() => { setEditingOrg(null); setShowOrgModal(false); }}
          onSave={handleSaveOrg}
        />
      )}
    </div>
  );
}
