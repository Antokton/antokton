import React, { useState } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Loader2, Star, StarOff, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const CATEGORY_LABELS = {
  arsim: "Arsim",
  shendetesi: "Shëndetësi",
  infrastrukture: "Infrastrukturë",
  emergjence: "Emergjencë",
  kulture: "Kulturë",
  tjeter: "Tjetër",
};

const emptyForm = {
  title: "",
  description: "",
  short_description: "",
  category: "tjeter",
  image_url: "",
  goal_amount: "",
  raised_amount: "",
  donation_link: "",
  contact_email: "",
  country: "",
  organizer: "",
  deadline: "",
  order: 0,
  is_active: true,
  is_featured: false,
};

export default function CharityAdmin() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null); // null = list, 'new' = new, id = edit
  const [form, setForm] = useState(emptyForm);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["charityProjectsAdmin"],
    queryFn: () => base44.entities.CharityProject.list("-order", 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CharityProject.create(data),
    onSuccess: () => { qc.invalidateQueries(["charityProjectsAdmin"]); qc.invalidateQueries(["charityProjects"]); setEditing(null); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CharityProject.update(id, data),
    onSuccess: () => { qc.invalidateQueries(["charityProjectsAdmin"]); qc.invalidateQueries(["charityProjects"]); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CharityProject.delete(id),
    onSuccess: () => { qc.invalidateQueries(["charityProjectsAdmin"]); qc.invalidateQueries(["charityProjects"]); },
  });

  const handleEdit = (project) => {
    setForm({ ...emptyForm, ...project, goal_amount: project.goal_amount || "", raised_amount: project.raised_amount || "" });
    setEditing(project.id);
  };

  const handleNew = () => {
    setForm(emptyForm);
    setEditing("new");
  };

  const handleSave = () => {
    const data = {
      ...form,
      goal_amount: form.goal_amount ? Number(form.goal_amount) : null,
      raised_amount: form.raised_amount ? Number(form.raised_amount) : 0,
      order: Number(form.order) || 0,
    };
    if (editing === "new") {
      createMutation.mutate(data);
    } else {
      updateMutation.mutate({ id: editing, data });
    }
  };

  const toggleField = (project, field) => {
    updateMutation.mutate({ id: project.id, data: { [field]: !project[field] } });
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (editing !== null) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="outline" size="sm" onClick={() => setEditing(null)}
            className="border-white/20 text-white/70 hover:text-white">← Kthehu</Button>
          <h3 className="text-white font-semibold">{editing === "new" ? "Projekt i ri" : "Modifiko projektin"}</h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-1.5">
            <Label className="text-white/70 text-xs">Titulli *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Titulli i projektit" className="bg-white/5 border-white/10 text-white" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs">Kategoria</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0b1020] border-white/10">
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs">Organizatori</Label>
            <Input value={form.organizer} onChange={(e) => setForm({ ...form, organizer: e.target.value })}
              placeholder="Fondacioni / Organizata" className="bg-white/5 border-white/10 text-white" />
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label className="text-white/70 text-xs">Përshkrim i shkurtër (kartelë)</Label>
            <Input value={form.short_description} onChange={(e) => setForm({ ...form, short_description: e.target.value })}
              placeholder="1-2 fjali" className="bg-white/5 border-white/10 text-white" />
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label className="text-white/70 text-xs">Përshkrim i plotë *</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Përshkruaj projektin..." className="bg-white/5 border-white/10 text-white min-h-[100px]" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs">Synimi (€)</Label>
            <Input type="number" value={form.goal_amount} onChange={(e) => setForm({ ...form, goal_amount: e.target.value })}
              placeholder="p.sh. 10000" className="bg-white/5 border-white/10 text-white" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs">Mbledhur deri tani (€)</Label>
            <Input type="number" value={form.raised_amount} onChange={(e) => setForm({ ...form, raised_amount: e.target.value })}
              placeholder="p.sh. 3500" className="bg-white/5 border-white/10 text-white" />
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label className="text-white/70 text-xs">URL e fotos</Label>
            <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              placeholder="https://..." className="bg-white/5 border-white/10 text-white" />
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label className="text-white/70 text-xs">Link donacioni (GoFundMe, PayPal, etj.)</Label>
            <Input value={form.donation_link} onChange={(e) => setForm({ ...form, donation_link: e.target.value })}
              placeholder="https://..." className="bg-white/5 border-white/10 text-white" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs">Email kontakti</Label>
            <Input value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
              placeholder="email@example.com" className="bg-white/5 border-white/10 text-white" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs">Vendi</Label>
            <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}
              placeholder="p.sh. Kosovë" className="bg-white/5 border-white/10 text-white" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs">Afati (opsional)</Label>
            <Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              className="bg-white/5 border-white/10 text-white" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs">Renditja (0 = i pari)</Label>
            <Input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })}
              className="bg-white/5 border-white/10 text-white" />
          </div>

          <div className="flex items-center gap-4 sm:col-span-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="w-4 h-4 accent-[#8ab4ff]" />
              <span className="text-white/70 text-sm">Aktiv (i dukshëm)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
                className="w-4 h-4 accent-[#9bffd6]" />
              <span className="text-white/70 text-sm">I veçuar</span>
            </label>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button onClick={handleSave} disabled={isSaving || !form.title || !form.description}
            className="bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] font-semibold">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Ruaj
          </Button>
          <Button variant="outline" onClick={() => setEditing(null)} className="border-white/20 text-white/70">
            Anulo
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold">Projektet e Bamirësisë</h3>
        <Button onClick={handleNew} size="sm"
          className="bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] font-semibold">
          <Plus className="w-4 h-4 mr-1.5" /> Projekt i ri
        </Button>
      </div>

      {isLoading && <div className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin text-white/30 mx-auto" /></div>}

      {!isLoading && projects.length === 0 && (
        <div className="text-center py-10 text-white/30 text-sm">Nuk ka projekte akoma.</div>
      )}

      <div className="space-y-2">
        {projects.map((project) => (
          <div key={project.id}
            className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/5">
            {project.image_url && (
              <img src={project.image_url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-white text-sm font-medium truncate">{project.title}</span>
                <Badge className="text-[10px] px-1.5 py-0 bg-white/10 text-white/50 border-white/10">
                  {CATEGORY_LABELS[project.category]}
                </Badge>
                {project.is_featured && <Badge className="text-[10px] px-1.5 py-0 bg-[#9bffd6]/10 text-[#9bffd6] border-[#9bffd6]/20">⭐</Badge>}
                {!project.is_active && <Badge className="text-[10px] px-1.5 py-0 bg-red-500/10 text-red-400 border-red-500/20">Joaktiv</Badge>}
              </div>
              {project.organizer && <p className="text-white/40 text-xs mt-0.5">{project.organizer}</p>}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-1 shrink-0">
              <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-white/45">
                Renditja: {project.order ?? 0}
              </span>
              <button onClick={() => toggleField(project, "is_featured")} title={project.is_featured ? "Hiq nga featured" : "Bëj featured"}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] text-white/50 hover:text-[#9bffd6] hover:bg-white/5 transition-all">
                {project.is_featured ? <StarOff className="w-4 h-4" /> : <Star className="w-4 h-4" />}
                {project.is_featured ? "Mos shfaq" : "Shfaq"}
              </button>
              <button onClick={() => toggleField(project, "is_active")} title={project.is_active ? "Çaktivizo" : "Aktivizo"}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] text-white/50 hover:text-white hover:bg-white/5 transition-all">
                {project.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {project.is_active ? "Fshihe" : "Shfaq"}
              </button>
              <button onClick={() => handleEdit(project)}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] text-white/50 hover:text-[#8ab4ff] hover:bg-white/5 transition-all">
                <Pencil className="w-4 h-4" />
                Përpuno
              </button>
              <button onClick={() => { if (confirm("Fshi projektin?")) deleteMutation.mutate(project.id); }}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] text-white/50 hover:text-red-400 hover:bg-white/5 transition-all">
                <Trash2 className="w-4 h-4" />
                Fshi
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
