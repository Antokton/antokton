import React, { useState, useEffect } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Trash2, RotateCcw, Save, Send, Globe, Archive, X } from "lucide-react";
import { COUNTRIES_DATA, CATEGORIES, LISTING_TYPES, SOURCES } from "./importConstants";

export default function ImportForm({ user, editingPost, onDone }) {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const empty = {
    original_text: "",
    edited_text: "",
    author_name: "",
    author_profile_url: "",
    original_post_url: "",
    category: "",
    listing_type: "",
    country: "",
    region: "",
    city: "",
    source: "facebook_group",
    show_author_publicly: false,
    show_original_post_url_publicly: false,
  };

  const [form, setForm] = useState(empty);
  const [originalTextLocked, setOriginalTextLocked] = useState(false);

  useEffect(() => {
    if (editingPost) {
      setForm({ ...empty, ...editingPost });
      setOriginalTextLocked(true);
    } else {
      setForm(empty);
      setOriginalTextLocked(false);
    }
  }, [editingPost]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  // When user types in the textarea for the first time (new post)
  const handleTextChange = (val) => {
    if (!originalTextLocked) {
      setForm(f => ({ ...f, original_text: val, edited_text: val }));
    } else {
      set("edited_text", val);
    }
  };

  const handleFirstInput = (val) => {
    if (!originalTextLocked && !form.original_text) {
      setOriginalTextLocked(true);
    }
    handleTextChange(val);
  };

  // Regions from selected country
  const countryData = COUNTRIES_DATA.find(c => c.name === form.country);
  const regions = countryData?.regions || [];
  const regionData = regions.find(r => r.name === form.region);
  const cities = regionData?.cities || [];

  const handleCountryChange = (val) => setForm(f => ({ ...f, country: val, region: "", city: "" }));
  const handleRegionChange = (val) => setForm(f => ({ ...f, region: val, city: "" }));

  // AI auto-fill from URL
  const [urlLoading, setUrlLoading] = useState(false);

  const handleUrlChange = async (val) => {
    set("original_post_url", val);
    if (!val.trim() || (!val.includes("facebook.com") && !val.includes("instagram.com") && !val.includes("linkedin.com"))) return;
    setUrlLoading(true);
    const prompt = `Nga ky link i postimit: ${val}

Nxirr këto të dhëna nëse janë të dukshme nga URL ose nga njohuria jote e formatit:
- author_name: emri i autorit nëse shihet në URL (ose bosh)
- source: cili nga këto: facebook_group, facebook_page, manual, whatsapp, telegram, tjeter
- suggested_text: nëse URL ka tekst relevant, sugjero një tekst të shkurtër fillestar (ose bosh)

Kthe JSON me këto fusha.`;
    try {
      const res = await base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: { type: "object", properties: { author_name: { type: "string" }, source: { type: "string" }, suggested_text: { type: "string" } } } });
      setForm(f => ({
        ...f,
        original_post_url: val,
        ...(res.author_name ? { author_name: res.author_name } : {}),
        ...(res.source ? { source: res.source } : {}),
        ...(res.suggested_text && !f.edited_text ? { original_text: res.suggested_text, edited_text: res.suggested_text } : {}),
      }));
    } catch {}
    setUrlLoading(false);
  };

  // AI Actions
  const runAI = async (action) => {
    if (!form.edited_text.trim()) return;
    setAiLoading(true);
    let prompt = "";
    if (action === "spell") {
      prompt = `Korrigjo drejtshkrimin shqip të këtij teksti. Zëvendëso 'e' me 'ë' ku duhet, 'c' me 'ç' ku duhet. Rregullo pikësimin dhe hapësirat. Mos ndryshon kuptimin. Kthe vetëm tekstin e korrigjuar pa asnjë koment:\n\n${form.edited_text}`;
    } else if (action === "clean") {
      prompt = `Pastro këtë tekst: largo hapësirat e tepërta, normalizon ndërprerjet e rreshtave, largo formatimin e çrregullt. Kthe vetëm tekstin e pastruar pa koment:\n\n${form.edited_text}`;
    }
    const res = await base44.integrations.Core.InvokeLLM({ prompt });
    set("edited_text", typeof res === "string" ? res.trim() : (res?.text || form.edited_text).trim());
    setAiLoading(false);
  };

  const resetToOriginal = () => set("edited_text", form.original_text);

  // Save actions
  const save = async (status) => {
    if (!form.listing_type) { alert("Zgjidhni llojin e njoftimit!"); return; }
    if (!form.edited_text.trim()) { alert("Teksti nuk mund të jetë bosh!"); return; }
    setLoading(true);
    const payload = {
      ...form,
      status,
      imported_by: user.email,
      ...(status === "publikuar" && !editingPost?.published_at ? { published_at: new Date().toISOString() } : {}),
    };
    if (editingPost) {
      await base44.entities.ImportedPost.update(editingPost.id, payload);
    } else {
      await base44.entities.ImportedPost.create(payload);
    }
    qc.invalidateQueries({ queryKey: ["importedPosts"] });
    setLoading(false);
    onDone();
  };

  const isAdmin = user.role === "admin";
  const isStaff = user.role === "admin" || user.role === "moderator";

  return (
    <div className="space-y-5 max-w-3xl">

      {/* Text area */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-white text-sm font-semibold">Teksti i njoftimit</label>
          <div className="flex gap-2">
            <button
              onClick={() => runAI("spell")}
              disabled={aiLoading}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs text-[#9bffd6] border border-[#9bffd6]/30 bg-[#9bffd6]/10 hover:bg-[#9bffd6]/20 transition-colors disabled:opacity-40"
            >
              {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              Korrigjo drejtshkrimin
            </button>
            <button
              onClick={() => runAI("clean")}
              disabled={aiLoading}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs text-[#8ab4ff] border border-[#8ab4ff]/30 bg-[#8ab4ff]/10 hover:bg-[#8ab4ff]/20 transition-colors disabled:opacity-40"
            >
              <Trash2 className="w-3 h-3" />
              Pastro tekstin
            </button>
            <button
              onClick={resetToOriginal}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs text-white/60 border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Kthe origjinalin
            </button>
          </div>
        </div>
        <textarea
          value={form.edited_text}
          onChange={e => handleFirstInput(e.target.value)}
          placeholder="Ngjit ose shkruaj tekstin e njoftimit këtu..."
          rows={8}
          className="w-full rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 text-sm p-3 resize-none focus:outline-none focus:border-[#8ab4ff]/50"
          style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }}
        />
        {originalTextLocked && form.edited_text !== form.original_text && (
          <p className="text-white/40 text-xs">⚠️ Teksti i edituar ndryshon nga origjinali. Klikoni "Kthe origjinalin" për ta rivendosur.</p>
        )}
      </div>

      {/* Author */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
        <label className="text-white text-sm font-semibold block">Autori</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-white/60 text-xs mb-1 block">Emri i autorit</label>
            <Input
              value={form.author_name}
              onChange={e => set("author_name", e.target.value)}
              placeholder="Emri Mbiemri"
              className="bg-white/5 border-white/10 text-white placeholder-white/40 text-sm"
              style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }}
            />
          </div>
          <div>
            <label className="text-white/60 text-xs mb-1 block">URL e profilit</label>
            <Input
              value={form.author_profile_url}
              onChange={e => set("author_profile_url", e.target.value)}
              placeholder="https://facebook.com/..."
              className="bg-white/5 border-white/10 text-white placeholder-white/40 text-sm"
              style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }}
            />
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.show_author_publicly}
            onChange={e => set("show_author_publicly", e.target.checked)}
            className="rounded border-white/20"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', accentColor: '#8ab4ff' }}
          />
          <span className="text-white/60 text-xs">Shfaq emrin e autorit publikisht</span>
        </label>
      </div>

      {/* Original Post URL - admin/mod only */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
        <label className="text-white text-sm font-semibold block flex items-center gap-2">
          Linku i postimit origjinal <span className="text-white/30 text-xs font-normal">(i brendshëm)</span>
          {urlLoading && <Loader2 className="w-3 h-3 animate-spin text-[#8ab4ff]" />}
        </label>
        <Input
          value={form.original_post_url}
          onChange={e => handleUrlChange(e.target.value)}
          placeholder="https://facebook.com/groups/... (AI do të plotësojë automatikisht)"
          className="bg-white/5 border-white/10 text-white placeholder-white/40 text-sm"
          style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }}
        />
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.show_original_post_url_publicly}
            onChange={e => set("show_original_post_url_publicly", e.target.checked)}
            className="rounded border-white/20"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', accentColor: '#8ab4ff' }}
          />
          <span className="text-white/60 text-xs">Shfaq linkun origjinal publikisht</span>
        </label>
      </div>

      {/* Category, Type, Source */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-white/60 text-xs mb-1.5 block">Kategoria</label>
          <Select value={form.category} onValueChange={v => set("category", v)}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white text-sm" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }}>
              <SelectValue placeholder="Zgjidh..." />
            </SelectTrigger>
            <SelectContent className="bg-[#0b1020] border-white/10">
              {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value} className="text-white">{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-white/60 text-xs mb-1.5 block">Lloji <span className="text-red-400">*</span></label>
          <Select value={form.listing_type} onValueChange={v => set("listing_type", v)}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white text-sm" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }}>
              <SelectValue placeholder="Zgjidh..." />
            </SelectTrigger>
            <SelectContent className="bg-[#0b1020] border-white/10">
              {LISTING_TYPES.map(t => <SelectItem key={t.value} value={t.value} className="text-white">{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-white/60 text-xs mb-1.5 block">Burimi</label>
          <Select value={form.source} onValueChange={v => set("source", v)}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white text-sm" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }}>
              <SelectValue placeholder="Zgjidh..." />
            </SelectTrigger>
            <SelectContent className="bg-[#0b1020] border-white/10">
              {SOURCES.map(s => <SelectItem key={s.value} value={s.value} className="text-white">{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Location */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
        <label className="text-white text-sm font-semibold block">Vendndodhja</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-white/60 text-xs mb-1 block">Shteti</label>
            <Select value={form.country} onValueChange={handleCountryChange}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white text-sm" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }}>
                <SelectValue placeholder="Zgjidh..." />
              </SelectTrigger>
              <SelectContent className="bg-[#0b1020] border-white/10">
                {COUNTRIES_DATA.map(c => <SelectItem key={c.name} value={c.name} className="text-white">{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-white/60 text-xs mb-1 block">Rajoni</label>
            {regions.length > 0 ? (
              <Select value={form.region} onValueChange={handleRegionChange}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white text-sm" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }}>
                  <SelectValue placeholder="Zgjidh..." />
                </SelectTrigger>
                <SelectContent className="bg-[#0b1020] border-white/10">
                  {regions.map(r => <SelectItem key={r.name} value={r.name} className="text-white">{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Input value={form.region} onChange={e => set("region", e.target.value)} placeholder="Rajoni..." className="bg-white/5 border-white/10 text-white text-sm" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }} />
            )}
          </div>
          <div>
            <label className="text-white/60 text-xs mb-1 block">Qyteti</label>
            {cities.length > 0 ? (
              <Select value={form.city} onValueChange={v => set("city", v)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white text-sm" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }}>
                  <SelectValue placeholder="Zgjidh..." />
                </SelectTrigger>
                <SelectContent className="bg-[#0b1020] border-white/10">
                  {cities.map(c => <SelectItem key={c} value={c} className="text-white">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Input value={form.city} onChange={e => set("city", e.target.value)} placeholder="Qyteti..." className="bg-white/5 border-white/10 text-white text-sm" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }} />
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 pt-2">
        <button onClick={() => save("draft")} disabled={loading} className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm text-white border border-white/20 bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-40">
          <Save className="w-4 h-4" /> Ruaj si draft
        </button>
        {!isStaff && (
          <button onClick={() => save("ne_pritje")} disabled={loading} className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm text-[#8ab4ff] border border-[#8ab4ff]/30 bg-[#8ab4ff]/10 hover:bg-[#8ab4ff]/20 transition-colors disabled:opacity-40">
            <Send className="w-4 h-4" /> Dërgo për miratim
          </button>
        )}
        {isStaff && (
          <button onClick={() => save("publikuar")} disabled={loading} className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm text-[#0b1020] font-bold transition-colors disabled:opacity-40"
            style={{ background: 'linear-gradient(to right, #8ab4ff, #9bffd6)' }}>
            <Globe className="w-4 h-4" /> Publiko në Antokton
          </button>
        )}
        {isAdmin && (
          <>
            <button onClick={() => save("refuzuar")} disabled={loading} className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm text-red-400 border border-red-400/30 bg-red-400/10 hover:bg-red-400/20 transition-colors disabled:opacity-40">
              <X className="w-4 h-4" /> Refuzo
            </button>
            <button onClick={() => save("arkivuar")} disabled={loading} className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm text-white/40 border border-white/10 bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-40">
              <Archive className="w-4 h-4" /> Arkivo
            </button>
          </>
        )}
        {editingPost && (
          <button onClick={onDone} className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm text-white/40 border border-white/10 bg-white/5 hover:bg-white/10 transition-colors sm:ml-auto">
            Anulo
          </button>
        )}
        {loading && <Loader2 className="w-5 h-5 text-white/50 animate-spin self-center" />}
      </div>
    </div>
  );
}
