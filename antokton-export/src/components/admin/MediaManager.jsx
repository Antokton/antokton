import React, { useState } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Tv, Radio, Loader2, Save, X } from "lucide-react";
import toast from "react-hot-toast";

const CRED_OPTIONS = ["e panjohur","e ulet","mesatare","e larte"];
const CRED_COLORS  = { "e larte": "#22c55e", "mesatare": "#f59e0b", "e ulet": "#ef4444", "e panjohur": "#6b7280" };
const REL_OPTIONS  = ["laik","islamik","krishtere","bektashiane","neutral","te_gjitha"];
const AGE_OPTIONS  = ["femije","te_rinj","te_rritur","te_moshuarit","te_gjitha"];

function ChannelRow({ ch, onEdit, onToggle, onDelete, onQuickUpdate }) {
  return (
    <div className="rounded-lg border border-white/10 p-2.5 bg-white/5 flex items-center gap-2.5 flex-wrap">
      <div className="w-8 h-8 rounded flex items-center justify-center text-lg flex-shrink-0 bg-white/5 border border-white/10">
        {ch.logo_url ? <img src={ch.logo_url} alt={ch.name} className="w-8 h-8 object-contain rounded" /> : (ch.flag || "📡")}
      </div>
      <p className="text-white text-xs font-medium w-28 truncate">{ch.name}</p>

      <label className="flex items-center gap-1 text-[10px] text-white/45">
        <span>Besueshmëria</span>
        <select value={ch.credibility || "e panjohur"}
          onChange={e => onQuickUpdate(ch.id, { credibility: e.target.value })}
          className="text-[10px] rounded px-1.5 py-0.5 border outline-none cursor-pointer"
          style={{ background: "#0b1020", color: CRED_COLORS[ch.credibility] || "#6b7280", borderColor: `${CRED_COLORS[ch.credibility] || "#6b7280"}44` }}>
          {CRED_OPTIONS.map(v => <option key={v} value={v} style={{ color: "#fff" }}>{v}</option>)}
        </select>
      </label>

      {/* Inline religion selector */}
      <select value={ch.religious_orientation || "laik"}
        onChange={e => onQuickUpdate(ch.id, { religious_orientation: e.target.value })}
        className="text-[10px] rounded px-1.5 py-0.5 border border-white/10 outline-none cursor-pointer bg-[#0b1020] text-white/60">
        {REL_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
      </select>

      {/* Inline age selector */}
      <select value={ch.target_age || "te_gjitha"}
        onChange={e => onQuickUpdate(ch.id, { target_age: e.target.value })}
        className="text-[10px] rounded px-1.5 py-0.5 border border-white/10 outline-none cursor-pointer bg-[#0b1020] text-white/60">
        {AGE_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
      </select>

      <Badge className={`ml-auto text-[9px] px-1.5 ${ch.is_active ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-gray-500/20 text-gray-400 border-gray-500/30"}`}>
        {ch.is_active ? "✓" : "–"}
      </Badge>
      <div className="flex flex-wrap justify-end gap-1 flex-shrink-0">
        <span className="rounded border border-white/10 bg-white/5 px-1.5 py-1 text-[9px] text-white/40">
          Rendit
        </span>
        <button onClick={() => onToggle.mutate({ id: ch.id, is_active: !ch.is_active })}
          className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-[9px] text-white/45 hover:text-white hover:bg-white/5 transition-colors">
          {ch.is_active ? "Fshihe" : "Shfaq"}
        </button>
        <button onClick={() => onEdit(ch)} className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-[9px] text-[#8ab4ff]/70 hover:text-[#8ab4ff] hover:bg-white/5 transition-colors">
          <Pencil className="w-3 h-3" />
          Përpuno
        </button>
        <button onClick={() => { if (confirm('Fshi këtë kanal?')) onDelete.mutate(ch.id); }}
          className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-[9px] text-red-400/70 hover:text-red-400 hover:bg-white/5 transition-colors">
          <Trash2 className="w-3 h-3" />
          Fshi
        </button>
      </div>
    </div>
  );
}

export default function MediaManager() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const EMPTY_FORM = { name: "", type: "tv", flag: "", color: "#8ab4ff", logo_url: "", stream_url: "", website_url: "", description: "", credibility: "e panjohur", programming_type: [], target_age: "te_gjitha", religious_orientation: "laik", order: 0, is_featured: false };
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const { data: channels = [], isLoading } = useQuery({
    queryKey: ["mediaChannels"],
    queryFn: () => base44.entities.MediaChannel.list("order", 200),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingId) {
        await base44.entities.MediaChannel.update(editingId, form);
      } else {
        await base44.entities.MediaChannel.create(form);
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Kanali u përditësua!" : "Kanali u shtua!");
      queryClient.invalidateQueries({ queryKey: ["mediaChannels"] });
      setShowForm(false);
      setEditingId(null);
      setForm({ ...EMPTY_FORM });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MediaChannel.delete(id),
    onSuccess: () => {
      toast.success("Kanali u fshi!");
      queryClient.invalidateQueries({ queryKey: ["mediaChannels"] });
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.MediaChannel.update(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mediaChannels"] }),
  });

  const quickUpdateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MediaChannel.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mediaChannels"] }),
  });
  const handleQuickUpdate = (id, data) => quickUpdateMutation.mutate({ id, data });

  const fetchWebsiteMetadata = async () => {
    const targetUrl = (form.website_url || form.stream_url || "").trim();
    if (!targetUrl) {
      toast.error("Vendos linkun e website-it ose stream-it.");
      return;
    }
    setMetadataLoading(true);
    try {
      const res = await base44.functions.invoke("extractWebsiteMetadata", { url: targetUrl });
      const meta = res.data || {};
      if (!meta.success) throw new Error(meta.error || "Nuk u gjetën të dhëna.");
      setForm(prev => ({
        ...prev,
        name: prev.name || meta.site_name || meta.title || "",
        logo_url: prev.logo_url || meta.logo_url || meta.image_url || "",
        description: prev.description || meta.description || "",
        website_url: prev.website_url || meta.site_url || targetUrl,
      }));
      toast.success("Logo/foto u mor nga website.");
    } catch (error) {
      toast.error(error.message || "Nuk u mor dot logo/foto.");
    } finally {
      setMetadataLoading(false);
    }
  };

  const fillMissingLogos = async () => {
    const targets = channels.filter((channel) => !channel.logo_url && (channel.website_url || channel.stream_url));
    if (!targets.length) {
      toast("Nuk ka media me website pa logo.");
      return;
    }
    setMetadataLoading(true);
    let updated = 0;
    try {
      for (const channel of targets) {
        const targetUrl = channel.website_url || channel.stream_url;
        const res = await base44.functions.invoke("extractWebsiteMetadata", { url: targetUrl });
        const meta = res.data || {};
        const logoUrl = meta.logo_url || meta.image_url || "";
        if (!meta.success || !logoUrl) continue;
        await base44.entities.MediaChannel.update(channel.id, {
          logo_url: logoUrl,
          description: channel.description || meta.description || "",
          website_url: channel.website_url || meta.site_url || targetUrl,
        });
        updated += 1;
      }
      queryClient.invalidateQueries({ queryKey: ["mediaChannels"] });
      toast.success(updated ? `U plotësuan ${updated} logo/foto.` : "Nuk u gjet logo e re.");
    } catch (error) {
      toast.error(error.message || "Plotësimi i logove dështoi.");
    } finally {
      setMetadataLoading(false);
    }
  };

  const startEdit = (ch) => {
    setForm({
      name: ch.name, type: ch.type, flag: ch.flag || "", color: ch.color || "#8ab4ff",
      logo_url: ch.logo_url || "", stream_url: ch.stream_url || "", website_url: ch.website_url || "",
      description: ch.description || "", credibility: ch.credibility || "e panjohur",
      programming_type: ch.programming_type || [], target_age: ch.target_age || "te_gjitha",
      religious_orientation: ch.religious_orientation || "laik", order: ch.order || 0, is_featured: ch.is_featured || false,
    });
    setEditingId(ch.id);
    setShowForm(true);
  };

  const PROG_OPTIONS = ["lajme","argëtim","sport","kulture","feja","ekonomi","teknologji","politike","muzike","film","dokumentar","edukativ"];

  const tvChannels = channels.filter(c => c.type === "tv");
  const radioChannels = channels.filter(c => c.type === "radio");
  const otherChannels = channels.filter(c => !["tv","radio"].includes(c.type));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold">Menaxho Mediat</h3>
        <div className="flex flex-wrap justify-end gap-2">
          <Button onClick={fillMissingLogos} disabled={metadataLoading}
            className="bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 h-8 text-xs">
            {metadataLoading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null}
            Plotëso logot
          </Button>
          <Button onClick={() => { setShowForm(true); setEditingId(null); setForm({ ...EMPTY_FORM }); }}
            className="bg-[#8ab4ff]/20 text-[#8ab4ff] border border-[#8ab4ff]/30 hover:bg-[#8ab4ff]/30 h-8 text-xs">
            <Plus className="w-3.5 h-3.5 mr-1" /> Shto Kanal
          </Button>
        </div>
      </div>

      {showForm && (
        <div className="rounded-xl border border-white/10 p-5 bg-white/5 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-white text-sm font-medium">{editingId ? "Ndrysho" : "Shto"} Kanal</h4>
            <button onClick={() => { setShowForm(false); setEditingId(null); }}><X className="w-4 h-4 text-white/40 hover:text-white" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-white/60 text-xs mb-1 block">Emri *</label>
              <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="P.sh. RTK1" className="h-8 text-xs bg-white/5 border-white/10 text-white" />
            </div>
            <div>
              <label className="text-white/60 text-xs mb-1 block">Lloji *</label>
              <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}
                className="w-full h-8 text-xs bg-white/5 border border-white/10 text-white rounded-md px-2">
                <option value="tv" className="bg-[#0b1020]">📺 TV</option>
                <option value="radio" className="bg-[#0b1020]">📻 Radio</option>
                <option value="gazeta" className="bg-[#0b1020]">📰 Gazeta</option>
                <option value="revista" className="bg-[#0b1020]">📖 Revista</option>
                <option value="podcast" className="bg-[#0b1020]">🎙️ Podcast</option>
              </select>
            </div>
            <div>
              <label className="text-white/60 text-xs mb-1 block">Flamuri emoji</label>
              <Input value={form.flag} onChange={e => setForm({...form, flag: e.target.value})} placeholder="🇦🇱" className="h-8 text-xs bg-white/5 border-white/10 text-white" />
            </div>
            <div>
              <label className="text-white/60 text-xs mb-1 block">Ngjyra hex</label>
              <Input value={form.color} onChange={e => setForm({...form, color: e.target.value})} placeholder="#e63946" className="h-8 text-xs bg-white/5 border-white/10 text-white" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3">
          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <label className="text-white/60 text-xs block">URL e Logos</label>
              <button type="button" onClick={fetchWebsiteMetadata} disabled={metadataLoading}
                className="rounded-md border border-[#8ab4ff]/25 px-2 py-1 text-[10px] text-[#8ab4ff] hover:bg-[#8ab4ff]/10 disabled:opacity-60">
                {metadataLoading ? "Duke kërkuar..." : "Gjej nga website"}
              </button>
            </div>
            <Input value={form.logo_url} onChange={e => setForm({...form, logo_url: e.target.value})} placeholder="https://..." className="h-8 text-xs bg-white/5 border-white/10 text-white" />
          </div>
            <div>
              <label className="text-white/60 text-xs mb-1 block">URL e Stream / Embed (live ose YouTube/Spotify)</label>
              <Input value={form.stream_url} onChange={e => setForm({...form, stream_url: e.target.value})} placeholder="https://stream.example.com/live" className="h-8 text-xs bg-white/5 border-white/10 text-white" />
            </div>
            <div>
              <label className="text-white/60 text-xs mb-1 block">Faqja Zyrtare</label>
              <Input value={form.website_url} onChange={e => setForm({...form, website_url: e.target.value})} placeholder="https://rtk.live" className="h-8 text-xs bg-white/5 border-white/10 text-white" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-white/60 text-xs mb-1 block">Besueshmëria</label>
                <select value={form.credibility} onChange={e => setForm({...form, credibility: e.target.value})}
                  className="w-full h-8 text-xs bg-white/5 border border-white/10 text-white rounded-md px-2">
                  {["e larte","mesatare","e ulet","e panjohur"].map(v => <option key={v} value={v} className="bg-[#0b1020]">{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-white/60 text-xs mb-1 block">Grupmosha</label>
                <select value={form.target_age} onChange={e => setForm({...form, target_age: e.target.value})}
                  className="w-full h-8 text-xs bg-white/5 border border-white/10 text-white rounded-md px-2">
                  {["femije","te_rinj","te_rritur","te_moshuarit","te_gjitha"].map(v => <option key={v} value={v} className="bg-[#0b1020]">{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-white/60 text-xs mb-1 block">Orientimi fetar</label>
                <select value={form.religious_orientation} onChange={e => setForm({...form, religious_orientation: e.target.value})}
                  className="w-full h-8 text-xs bg-white/5 border border-white/10 text-white rounded-md px-2">
                  {["laik","islamik","krishtere","bektashiane","neutral","te_gjitha"].map(v => <option key={v} value={v} className="bg-[#0b1020]">{v}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-white/60 text-xs mb-1 block">Renditja (0 = i pari)</label>
              <Input type="number" value={form.order} onChange={e => setForm({...form, order: Number(e.target.value) || 0})} className="h-8 text-xs bg-white/5 border-white/10 text-white" />
            </div>
            <div>
              <label className="text-white/60 text-xs mb-1 block">Programacioni (zgjidhni)</label>
              <div className="flex flex-wrap gap-1.5">
                {PROG_OPTIONS.map(opt => (
                  <button key={opt} type="button"
                    onClick={() => setForm(f => ({
                      ...f,
                      programming_type: f.programming_type.includes(opt)
                        ? f.programming_type.filter(x => x !== opt)
                        : [...f.programming_type, opt]
                    }))}
                    className={`px-2 py-1 rounded-full text-[10px] font-medium border transition-all ${
                      form.programming_type.includes(opt)
                        ? "bg-[#8ab4ff]/20 border-[#8ab4ff]/40 text-[#8ab4ff]"
                        : "bg-white/5 border-white/10 text-white/40 hover:text-white/70"
                    }`}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-white/60 text-xs mb-1 block">Përshkrimi (opsional)</label>
              <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Përshkrim i shkurtër..." className="min-h-[60px] resize-none text-xs bg-white/5 border-white/10 text-white" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_featured} onChange={e => setForm({...form, is_featured: e.target.checked})} className="w-4 h-4 rounded border-white/20" />
              <span className="text-white/60 text-xs">I veçuar</span>
            </label>
          </div>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.name}
            className="bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] w-full h-8 text-xs">
            {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}
            {editingId ? "Ruaj Ndryshimet" : "Shto Kanalin"}
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 text-white/30 animate-spin" /></div>
      ) : (
        <div className="space-y-4">
          {/* TV */}
          <div>
            <h4 className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Tv className="w-3.5 h-3.5" /> Kanale TV ({tvChannels.length})
            </h4>
            {tvChannels.length === 0 ? (
              <p className="text-white/30 text-xs py-4 text-center">Nuk ka kanale TV të shtuara</p>
            ) : (
              <div className="space-y-2">
                {tvChannels.map(ch => <ChannelRow key={ch.id} ch={ch} onEdit={startEdit} onToggle={toggleActiveMutation} onDelete={deleteMutation} onQuickUpdate={handleQuickUpdate} />)}
              </div>
            )}
          </div>

          {/* Radio */}
          <div>
            <h4 className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5" /> Kanale Radio ({radioChannels.length})
            </h4>
            {radioChannels.length === 0 ? (
              <p className="text-white/30 text-xs py-4 text-center">Nuk ka kanale Radio të shtuara</p>
            ) : (
              <div className="space-y-2">
                {radioChannels.map(ch => <ChannelRow key={ch.id} ch={ch} onEdit={startEdit} onToggle={toggleActiveMutation} onDelete={deleteMutation} onQuickUpdate={handleQuickUpdate} />)}
              </div>
            )}
          </div>
          {/* Other (gazeta, revista, podcast) */}
          {otherChannels.length > 0 && (
            <div>
              <h4 className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-2">Të tjera ({otherChannels.length})</h4>
              <div className="space-y-2">
                {otherChannels.map(ch => <ChannelRow key={ch.id} ch={ch} onEdit={startEdit} onToggle={toggleActiveMutation} onDelete={deleteMutation} onQuickUpdate={handleQuickUpdate} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
