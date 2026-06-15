import React, { useState, useEffect } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Trash2, RotateCcw, Save, Send, Globe, Archive, X, Image, Star, Upload } from "lucide-react";
import LocationPicker from "@/components/job/LocationPicker";
import ImageFocusControls from "@/components/media/ImageFocusControls";
import ImageFocusPreview from "@/components/media/ImageFocusPreview";
import { CATEGORIES, LISTING_TYPES, SOURCES } from "./importConstants";
import { publishImportedPost } from "./publishImportedPost";
import { getContactInfoInTextMessage } from "@/lib/contentContactGuard";
import { getImageFocus, getImageFocusStyle, pruneImageFocusMap, updateImageFocus } from "@/lib/imageFocus";
import { extractImportedPostFields, sanitizeImportedText } from "@/lib/importExtractors";
import { PAZAR_CATEGORIES, cleanPazarLabel, findPazarCategory } from "@/lib/pazarCategories";

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
    source_url: "",
    import_source_url: "",
    import_author_profile_url: "",
    importer_email: "",
    import_original_text: "",
    category: "",
    pazar_category: "",
    pazar_subcategory: "",
    listing_type: "",
    country: "",
    region: "",
    city: "",
    address: "",
    phone_number: "",
    contact_info: "",
    price: "",
    salary: "",
    salary_info: "",
    source: "facebook_group",
    show_author_publicly: false,
    show_original_post_url_publicly: false,
    show_source_url: false,
    show_author_profile_url: false,
    image_url: "",
    image_urls: [],
    main_image_index: 0,
    image_focus_json: {},
  };

  const [form, setForm] = useState(empty);
  const [originalTextLocked, setOriginalTextLocked] = useState(false);

  useEffect(() => {
    if (editingPost) {
      setForm({
        ...empty,
        ...editingPost,
        source_url: editingPost.source_url || editingPost.original_post_url || "",
        import_source_url: editingPost.import_source_url || editingPost.source_url || editingPost.original_post_url || "",
        import_author_profile_url: editingPost.import_author_profile_url || editingPost.author_profile_url || "",
        show_source_url: editingPost.show_source_url === true || editingPost.show_original_post_url_publicly === true,
        show_author_profile_url: editingPost.show_author_profile_url === true,
      });
      setOriginalTextLocked(true);
    } else {
      setForm(empty);
      setOriginalTextLocked(false);
    }
  }, [editingPost]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const setMainImage = (index) => {
    const images = Array.isArray(form.image_urls) ? form.image_urls : [];
    setForm((f) => ({ ...f, main_image_index: index, image_url: images[index] || "" }));
  };

  const removeImage = (index) => {
    const images = (Array.isArray(form.image_urls) ? form.image_urls : []).filter((_, i) => i !== index);
    const mainImageIndex = Math.min(Number(form.main_image_index || 0), Math.max(images.length - 1, 0));
    setForm((f) => ({
      ...f,
      image_urls: images,
      main_image_index: mainImageIndex,
      image_url: images[mainImageIndex] || "",
      image_focus_json: pruneImageFocusMap(f.image_focus_json, images),
    }));
  };

  const updateSelectedImageFocus = (focus) => {
    const images = Array.isArray(form.image_urls) ? form.image_urls : [];
    const selectedImage = images[Math.min(Number(form.main_image_index || 0), Math.max(images.length - 1, 0))] || "";
    setForm((f) => ({
      ...f,
      image_focus_json: updateImageFocus(f.image_focus_json, selectedImage, focus),
    }));
  };

  const handleUploadImages = async (event) => {
    const currentImages = Array.isArray(form.image_urls) ? form.image_urls : [];
    const slots = Math.max(0, 6 - currentImages.length);
    const files = Array.from(event.target.files || []).slice(0, slots);
    event.target.value = "";
    if (!files.length) return;

    setLoading(true);
    try {
      const uploads = await Promise.all(files.map((file) => base44.integrations.Core.UploadFile({ file })));
      const nextImages = [...currentImages, ...uploads.map((item) => item?.file_url).filter(Boolean)].slice(0, 6);
      const mainImageIndex = Math.min(Number(form.main_image_index || 0), Math.max(nextImages.length - 1, 0));
      setForm((f) => ({
        ...f,
        image_urls: nextImages,
        main_image_index: mainImageIndex,
        image_url: nextImages[mainImageIndex] || "",
      }));
    } catch (e) {
      alert(e?.message || "Fotot nuk u ngarkuan. Provo përsëri.");
    } finally {
      setLoading(false);
    }
  };

  // When user types in the textarea for the first time (new post)
  const handleTextChange = (val) => {
    const cleanVal = sanitizeImportedText(val);
    const extracted = extractImportedPostFields(cleanVal, { description: cleanVal });
    if (!originalTextLocked) {
      setForm(f => ({
        ...f,
        original_text: cleanVal,
        edited_text: cleanVal,
        phone_number: f.phone_number || extracted.phone_number,
        contact_info: f.contact_info || extracted.contact_info,
        address: f.address || extracted.address,
        city: f.city || extracted.city,
      }));
    } else {
      setForm(f => ({
        ...f,
        edited_text: cleanVal,
        phone_number: f.phone_number || extracted.phone_number,
        contact_info: f.contact_info || extracted.contact_info,
        address: f.address || extracted.address,
        city: f.city || extracted.city,
      }));
    }
  };

  const handleFirstInput = (val) => {
    if (!originalTextLocked && !form.original_text) {
      setOriginalTextLocked(true);
    }
    handleTextChange(val);
  };

  // AI auto-fill from URL
  const [urlLoading, setUrlLoading] = useState(false);

  const handleUrlChange = async (val) => {
    setForm(f => ({
      ...f,
      original_post_url: val,
      source_url: val,
      import_source_url: val,
    }));
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
        source_url: val,
        import_source_url: val,
        ...(res.author_name ? { author_name: res.author_name } : {}),
        ...(res.source ? { source: res.source } : {}),
        ...(res.suggested_text && !f.edited_text ? {
          original_text: sanitizeImportedText(res.suggested_text),
          edited_text: sanitizeImportedText(res.suggested_text)
        } : {}),
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
    set("edited_text", sanitizeImportedText(typeof res === "string" ? res.trim() : (res?.text || form.edited_text).trim()));
    setAiLoading(false);
  };

  const resetToOriginal = () => set("edited_text", form.original_text);

  // Save actions
  const save = async (status) => {
    if (!form.listing_type) { alert("Zgjidhni llojin e njoftimit!"); return; }
    if (!form.edited_text.trim()) { alert("Teksti nuk mund të jetë bosh!"); return; }
    const cleanOriginalText = sanitizeImportedText(form.original_text || form.edited_text);
    const cleanEditedText = sanitizeImportedText(form.edited_text);
    const prepared = extractImportedPostFields(cleanOriginalText, {
      ...form,
      original_text: cleanOriginalText,
      edited_text: cleanEditedText,
      description: cleanEditedText,
      source_url: form.source_url || form.original_post_url,
      import_source_url: form.import_source_url || form.source_url || form.original_post_url,
      author_profile_url: form.author_profile_url,
      import_author_profile_url: form.import_author_profile_url || form.author_profile_url,
      show_source_url: form.show_source_url,
      show_author_profile_url: form.show_author_profile_url,
    });
    const contactInfoWarning = getContactInfoInTextMessage(prepared.description);
    if (contactInfoWarning) { alert(contactInfoWarning); return; }
    setLoading(true);
    const payload = {
      ...form,
      original_text: prepared.original_text || cleanOriginalText,
      edited_text: prepared.description,
      address: prepared.address || form.address || "",
      city: prepared.city || form.city || "",
      phone_number: prepared.phone_number || form.phone_number || "",
      contact_info: prepared.contact_info || form.contact_info || "",
      price: prepared.price || prepared.salary || form.price || form.salary || form.salary_info || "",
      salary: prepared.salary || prepared.price || form.salary || form.price || form.salary_info || "",
      salary_info: prepared.salary_info || prepared.salary || prepared.price || form.salary_info || form.salary || form.price || "",
      pazar_category: prepared.pazar_category || form.pazar_category || "",
      pazar_subcategory: prepared.pazar_subcategory || form.pazar_subcategory || "",
      original_post_url: prepared.source_url || form.original_post_url || "",
      source_url: prepared.source_url || form.source_url || form.original_post_url || "",
      import_source_url: prepared.import_source_url || prepared.source_url || form.source_url || form.original_post_url || "",
      import_author_profile_url: prepared.import_author_profile_url || form.author_profile_url || "",
      importer_email: user.email,
      import_original_text: prepared.import_original_text || form.original_text || "",
      show_source_url: prepared.show_source_url === true,
      show_author_profile_url: prepared.show_author_profile_url === true,
      image_urls: (Array.isArray(prepared.image_urls) ? prepared.image_urls : prepared.image_url ? [prepared.image_url] : []).filter(Boolean).slice(0, 6),
      main_image_index: Math.min(
        Math.max(Number.parseInt(prepared.main_image_index, 10) || 0, 0),
        Math.max(((Array.isArray(prepared.image_urls) ? prepared.image_urls : prepared.image_url ? [prepared.image_url] : []).filter(Boolean).slice(0, 6)).length - 1, 0)
      ),
      image_url: (() => {
        const images = (Array.isArray(prepared.image_urls) ? prepared.image_urls : prepared.image_url ? [prepared.image_url] : []).filter(Boolean).slice(0, 6);
        const mainIndex = Math.min(Math.max(Number.parseInt(prepared.main_image_index, 10) || 0, 0), Math.max(images.length - 1, 0));
        return images[mainIndex] || "";
      })(),
      image_focus_json: (() => {
        const images = (Array.isArray(prepared.image_urls) ? prepared.image_urls : prepared.image_url ? [prepared.image_url] : []).filter(Boolean).slice(0, 6);
        return pruneImageFocusMap(prepared.image_focus_json || form.image_focus_json, images);
      })(),
      status,
      imported_by: user.email,
      ...(status === "publikuar" && !editingPost?.published_at ? { published_at: new Date().toISOString() } : {}),
    };
    try {
      let savedPost;
      if (editingPost) {
        const updated = await base44.entities.ImportedPost.update(editingPost.id, payload);
        savedPost = { ...editingPost, ...payload, ...(updated || {}), id: editingPost.id };
      } else {
        savedPost = await base44.entities.ImportedPost.create(payload);
        savedPost = { ...payload, ...(savedPost || {}) };
      }
      if (status === "publikuar") {
        await publishImportedPost(base44, savedPost, user);
      }
      qc.invalidateQueries({ queryKey: ["importedPosts"] });
      qc.invalidateQueries({ queryKey: ["jobs"] });
      onDone();
    } catch (error) {
      alert(error?.message || "Ruajtja dështoi. Provo përsëri.");
    } finally {
      setLoading(false);
    }
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
            <label className="text-white/60 text-xs mb-1 block">Linku i postuesit / kontaktit</label>
            <Input
              value={form.author_profile_url}
              onChange={e => setForm(f => ({
                ...f,
                author_profile_url: e.target.value,
                import_author_profile_url: e.target.value,
              }))}
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
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.show_author_profile_url}
            onChange={e => set("show_author_profile_url", e.target.checked)}
            className="rounded border-white/20"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', accentColor: '#8ab4ff' }}
          />
          <span className="text-white/60 text-xs">Shfaq linkun e postuesit si kontakt publik</span>
        </label>
      </div>

      {/* Original Post URL - admin/mod only */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
        <label className="text-white text-sm font-semibold block flex items-center gap-2">
          Linku i njoftimit / burimit <span className="text-white/30 text-xs font-normal">(i brendshëm)</span>
          {urlLoading && <Loader2 className="w-3 h-3 animate-spin text-[#8ab4ff]" />}
        </label>
        <Input
          value={form.original_post_url}
          onChange={e => handleUrlChange(e.target.value)}
          placeholder="https://facebook.com/groups/... ose link i faqes burim"
          className="bg-white/5 border-white/10 text-white placeholder-white/40 text-sm"
          style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }}
        />
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.show_source_url}
            onChange={e => setForm(f => ({
              ...f,
              show_source_url: e.target.checked,
              show_original_post_url_publicly: e.target.checked,
            }))}
            className="rounded border-white/20"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', accentColor: '#8ab4ff' }}
          />
          <span className="text-white/60 text-xs">Shfaq linkun e njoftimit publikisht</span>
        </label>
      </div>

      {/* Category, Type, Source */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-white/60 text-xs mb-1.5 block">Kategoria</label>
          <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v, ...(v !== "pazar" ? { pazar_category: "", pazar_subcategory: "" } : {}) }))}>
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

      {form.category === "pazar" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
          <div>
            <label className="text-white/60 text-xs mb-1.5 block">Kategoria e Pazarit</label>
            <Select
              value={form.pazar_category || ""}
              onValueChange={v => setForm(f => ({ ...f, pazar_category: v, pazar_subcategory: "" }))}
            >
              <SelectTrigger className="bg-white/5 border-white/10 text-white text-sm" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }}>
                <SelectValue placeholder="Zgjidh..." />
              </SelectTrigger>
              <SelectContent className="bg-[#0b1020] border-white/10">
                {PAZAR_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value} className="text-white">{cleanPazarLabel(c.label)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-white/60 text-xs mb-1.5 block">Nënkategoria</label>
            <Select
              value={form.pazar_subcategory || ""}
              onValueChange={v => set("pazar_subcategory", v)}
              disabled={!findPazarCategory(form.pazar_category)?.subcategories?.length}
            >
              <SelectTrigger className="bg-white/5 border-white/10 text-white text-sm disabled:opacity-50" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }}>
                <SelectValue placeholder="Zgjidh..." />
              </SelectTrigger>
              <SelectContent className="bg-[#0b1020] border-white/10">
                {(findPazarCategory(form.pazar_category)?.subcategories || []).map(sub => (
                  <SelectItem key={sub.value} value={sub.value} className="text-white">{sub.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Location */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
        <label className="text-white text-sm font-semibold block">Adresa / vendndodhja</label>
        <LocationPicker
          value={{ address: form.address || "", country: form.country, zone: form.region || form.zone || "", city: form.city, location_precision: form.location_precision }}
          onChange={loc => setForm(f => ({
            ...f,
            address: loc.address,
            country: loc.country,
            region: loc.zone || "",
            zone: loc.zone || "",
            city: loc.city,
            location_precision: loc.location_precision,
          }))}
        />
        <p className="text-white/40 text-xs">
          Shkruaj adresën ose qytetin; sugjerimet plotësojnë automatikisht vendin, rajonin dhe qytetin.
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
        <label className="text-white text-sm font-semibold block">Kontaktet e nxjerra nga njoftimi</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-white/60 text-xs mb-1 block">Telefon</label>
            <Input value={form.phone_number} onChange={e => set("phone_number", e.target.value)} placeholder="+00 00 000 000 000" className="bg-white/5 border-white/10 text-white text-sm" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }} />
          </div>
          <div>
            <label className="text-white/60 text-xs mb-1 block">Email / kontakt tjetër</label>
            <Input value={form.contact_info} onChange={e => set("contact_info", e.target.value)} placeholder="email, website, telefon lokal..." className="bg-white/5 border-white/10 text-white text-sm" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }} />
          </div>
        </div>
        <p className="text-white/40 text-xs">
          Në ruajtje, telefoni/emaili/linku hiqen nga trupi i tekstit dhe mbeten te fushat e kontaktit/gjurmimit.
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
        <label className="text-white text-sm font-semibold block">Çmimi / Vlera</label>
        <Input
          value={form.price || form.salary || form.salary_info || ""}
          onChange={e => setForm(f => ({ ...f, price: e.target.value, salary: e.target.value, salary_info: e.target.value }))}
          placeholder="p.sh. 50€, 900€, falas..."
          className="bg-white/5 border-white/10 text-white placeholder-white/40 text-sm"
          style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }}
        />
      </div>

      {/* Photos */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Image className="w-4 h-4 text-white/60" />
            <span className="text-white font-semibold text-sm">Fotot për Pazar ({Math.min((form.image_urls || []).length, 6)}/6)</span>
          </div>
          <span className="text-white/40 text-xs">Për Pazar, ylli cakton thumbnail</span>
        </div>
        {(form.image_urls || []).length > 0 && (
          <>
            <div className="mx-auto max-w-md rounded-xl border border-white/10 bg-black/20">
              <ImageFocusPreview
                src={(form.image_urls || [])[Math.min(Number(form.main_image_index || 0), (form.image_urls || []).length - 1)]}
                alt="Foto kryesore"
                className="aspect-square w-full rounded-xl"
                focus={getImageFocus(form.image_focus_json, (form.image_urls || [])[Math.min(Number(form.main_image_index || 0), (form.image_urls || []).length - 1)])}
                onChange={updateSelectedImageFocus}
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            </div>
            <ImageFocusControls
              value={getImageFocus(form.image_focus_json, (form.image_urls || [])[Math.min(Number(form.main_image_index || 0), (form.image_urls || []).length - 1)])}
              onChange={updateSelectedImageFocus}
            />
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {(form.image_urls || []).slice(0, 6).map((imgUrl, i) => {
                const selected = Number(form.main_image_index || 0) === i;
                const focus = getImageFocus(form.image_focus_json, imgUrl);
                return (
                  <div key={`${imgUrl}-${i}`} className={`relative overflow-hidden rounded-lg border ${selected ? "border-[#9bffd6]" : "border-white/10"}`}>
                    <button type="button" onClick={() => setMainImage(i)} className="absolute left-1 top-1 rounded-full bg-black/60 p-1 text-white hover:text-[#ffd166]" title="Bëje foto kryesore">
                      <Star className={`h-3.5 w-3.5 ${selected ? "fill-[#ffd166] text-[#ffd166]" : ""}`} />
                    </button>
                    <button type="button" onClick={() => removeImage(i)} className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:text-red-300" title="Hiqe foton">
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <img src={imgUrl} alt="" className="h-20 w-full object-cover" style={getImageFocusStyle(focus)} onError={(e) => { e.currentTarget.style.display = "none"; }} />
                  </div>
                );
              })}
            </div>
          </>
        )}
        <label className={`inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/15 px-3 py-2.5 text-sm font-semibold text-white/75 hover:bg-white/10 ${(form.image_urls || []).length >= 6 ? "pointer-events-none opacity-45" : ""}`}>
          <Upload className="h-4 w-4" />
          Ngarko foto për Pazar
          <input type="file" accept="image/*" multiple className="hidden" onChange={handleUploadImages} disabled={loading || (form.image_urls || []).length >= 6} />
        </label>
        <p className="text-white/40 text-xs">Mund të ruhen deri në 6 foto; fotoja me yll përdoret si kryesore në Pazar.</p>
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
