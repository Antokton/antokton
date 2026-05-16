import React, { useState } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Loader2, Save, X, Star } from "lucide-react";
import toast from "react-hot-toast";

export default function PartnersManager() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", logo_url: "", description: "", website_url: "", is_main: true, order: 0 });

  const { data: partners = [], isLoading } = useQuery({
    queryKey: ["adminPartners"],
    queryFn: () => base44.entities.Partner.list("order", 200),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingId) {
        await base44.entities.Partner.update(editingId, form);
      } else {
        await base44.entities.Partner.create(form);
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Bashkëpunëtori u përditësua!" : "Bashkëpunëtori u shtua!");
      queryClient.invalidateQueries({ queryKey: ["adminPartners"] });
      queryClient.invalidateQueries({ queryKey: ["partners"] });
      setShowForm(false);
      setEditingId(null);
      setForm({ name: "", logo_url: "", description: "", website_url: "", is_main: true, order: 0 });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Partner.delete(id),
    onSuccess: () => {
      toast.success("Bashkëpunëtori u fshi!");
      queryClient.invalidateQueries({ queryKey: ["adminPartners"] });
      queryClient.invalidateQueries({ queryKey: ["partners"] });
    }
  });

  const startEdit = (p) => {
    setForm({ name: p.name, logo_url: p.logo_url || "", description: p.description || "", website_url: p.website_url || "", is_main: p.is_main !== false, order: p.order || 0 });
    setEditingId(p.id);
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold">Menaxho Bashkëpunëtorët</h3>
        <Button onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: "", logo_url: "", description: "", website_url: "", is_main: true, order: partners.length }); }}
          className="bg-[#8ab4ff]/20 text-[#8ab4ff] border border-[#8ab4ff]/30 hover:bg-[#8ab4ff]/30 h-8 text-xs">
          <Plus className="w-3.5 h-3.5 mr-1" /> Shto Bashkëpunëtor
        </Button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-white/10 p-5 bg-white/5 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-white text-sm font-medium">{editingId ? "Ndrysho" : "Shto"} Bashkëpunëtor</h4>
            <button onClick={() => { setShowForm(false); setEditingId(null); }}><X className="w-4 h-4 text-white/40 hover:text-white" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-white/60 text-xs mb-1 block">Emri *</label>
              <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Emri i organizatës" className="h-8 text-xs bg-white/5 border-white/10 text-white" />
            </div>
            <div>
              <label className="text-white/60 text-xs mb-1 block">Renditja</label>
              <Input type="number" value={form.order} onChange={e => setForm({...form, order: parseInt(e.target.value) || 0})} className="h-8 text-xs bg-white/5 border-white/10 text-white" />
            </div>
          </div>
          <div>
            <label className="text-white/60 text-xs mb-1 block">URL e Logos</label>
            <Input value={form.logo_url} onChange={e => setForm({...form, logo_url: e.target.value})} placeholder="https://..." className="h-8 text-xs bg-white/5 border-white/10 text-white" />
          </div>
          <div>
            <label className="text-white/60 text-xs mb-1 block">Linku (website)</label>
            <Input value={form.website_url} onChange={e => setForm({...form, website_url: e.target.value})} placeholder="https://example.com" className="h-8 text-xs bg-white/5 border-white/10 text-white" />
          </div>
          <div>
            <label className="text-white/60 text-xs mb-1 block">Përshkrimi (opsional)</label>
            <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="min-h-[60px] resize-none text-xs bg-white/5 border-white/10 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_main" checked={form.is_main} onChange={e => setForm({...form, is_main: e.target.checked})} className="rounded" />
            <label htmlFor="is_main" className="text-white/60 text-xs flex items-center gap-1"><Star className="w-3 h-3" /> Bashkëpunëtor kryesor (me logo)</label>
          </div>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.name}
            className="bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] w-full h-8 text-xs">
            {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}
            {editingId ? "Ruaj Ndryshimet" : "Shto"}
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 text-white/30 animate-spin" /></div>
      ) : partners.length === 0 ? (
        <p className="text-white/30 text-sm text-center py-8">Nuk ka bashkëpunëtorë të shtuar ende</p>
      ) : (
        <div className="space-y-2">
          {partners.map(p => (
            <div key={p.id} className="rounded-lg border border-white/10 p-3 bg-white/5 flex items-center gap-3">
              {p.logo_url ? (
                <img src={p.logo_url} alt={p.name} className="w-12 h-8 object-contain rounded bg-white/10" />
              ) : (
                <div className="w-12 h-8 rounded bg-white/10 flex items-center justify-center text-white/40 text-xs">Logo</div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium">{p.name}</p>
                {p.website_url && <p className="text-white/40 text-xs truncate">{p.website_url}</p>}
              </div>
              {p.is_main !== false && <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[10px]"><Star className="w-2.5 h-2.5 mr-0.5" />Kryesor</Badge>}
              <span className="text-white/30 text-xs">#{p.order || 0}</span>
              <div className="flex gap-1">
                <button onClick={() => startEdit(p)} className="text-[#8ab4ff]/60 hover:text-[#8ab4ff] p-1 rounded transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => { if (confirm('Fshi këtë bashkëpunëtor?')) deleteMutation.mutate(p.id); }}
                  className="text-red-400/60 hover:text-red-400 p-1 rounded transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}