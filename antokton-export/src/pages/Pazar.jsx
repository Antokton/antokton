import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { base44 } from "@/api/antoktonClient";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ShoppingBag, Home, Car, Sofa, Shirt, Smartphone, Bike,
  Wrench, Leaf, BookOpen, Palette, Gift, Search,
  Plus, MapPin, Clock, Heart, X, Upload, Star,
  ExternalLink, Loader2, Tag, ArrowLeft,
  AlertCircle, CheckCircle, MoreVertical, Phone, Link2, Flag, Share2, MessageCircle
} from "lucide-react";
import { PHONE_PLACEHOLDER, getInternationalPhoneError, isValidInternationalPhone, normalizeInternationalPhone } from "@/lib/phone";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

/* ─── KATEGORITE ─── */
const CATEGORIES = [
  { key: "all", label: "Të gjitha", icon: ShoppingBag },
  { key: "prona", label: "Prona", icon: Home },
  { key: "makina", label: "Makina", icon: Car },
  { key: "mobilje", label: "Mobilje", icon: Sofa },
  { key: "shtepi", label: "Shtëpi & Kuzhinë", icon: Home },
  { key: "elektronike", label: "Elektronikë", icon: Smartphone },
  { key: "veshje", label: "Veshje", icon: Shirt },
  { key: "aksesore", label: "Aksesorë", icon: Tag },
  { key: "bicikleta", label: "Bicikleta & Sport", icon: Bike },
  { key: "mjete", label: "Mjete & Pajisje", icon: Wrench },
  { key: "bujqesia", label: "Bujqësi", icon: Leaf },
  { key: "libra", label: "Libra & Edukim", icon: BookOpen },
  { key: "art", label: "Art & Koleksione", icon: Palette },
  { key: "dhurime", label: "Dhurime falas", icon: Gift },
];

// Nënkategorite e Fëmijëve (shfaqen si filter shtesë)
const FEMIJE_SUBCATS = [
  { key: "femije_veshje", label: "Veshje fëmijësh", parent: "veshje" },
  { key: "femije_bicikleta", label: "Bicikleta fëmijësh", parent: "bicikleta" },
  { key: "femije_lojera", label: "Lodra & Lojëra", parent: "all" },
  { key: "femije_mjete", label: "Mjete fëmijësh", parent: "mjete" },
];

/* ─── LISTING CARD ─── */
function ListingCard({ job, user }) {
  const [liked, setLiked] = useState(false);
  const [reporting, setReporting] = useState(false);
  const price = job.salary_info || "";
  const gallery = Array.isArray(job.image_urls) ? job.image_urls : [];
  const thumbnail = job.image_url || gallery[Math.min(Number(job.main_image_index || 0), Math.max(0, gallery.length - 1))] || gallery[0] || "";
  const detailUrl = `/PostDetail?id=${job.id}`;
  const publicContactUrl = job.show_author_profile_url === true ? (job.author_profile_url || job.import_author_profile_url || "") : "";
  const canContact = Boolean(job.phone_number || publicContactUrl);

  const stopCardClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const shareListing = async (event) => {
    stopCardClick(event);
    const url = `${window.location.origin}${detailUrl}`;
    const title = `${job.title || "Njoftim"} - Antokton`;
    try {
      if (navigator.share) {
        await navigator.share({ title, text: title, url });
      } else {
        await navigator.clipboard.writeText(url);
        alert("Linku u kopjua.");
      }
    } catch {
      // User cancelled native share.
    }
  };

  const reportListing = async (event) => {
    stopCardClick(event);
    if (!user) {
      base44.auth.redirectToLogin();
      return;
    }
    if (reporting) return;
    const confirmed = window.confirm("Dëshiron ta raportosh këtë njoftim për kontroll nga stafi?");
    if (!confirmed) return;
    setReporting(true);
    try {
      await base44.entities.Report.create({
        post_id: job.id,
        reported_entity: "Job",
        reported_entity_id: job.id,
        reported_user_email: job.created_by || job.author_email || "",
        post_title: job.title || "",
        post_category: job.category || "pazar",
        reporter_id: user.id || "",
        reporter_email: user.email || "",
        reporter_name: user.full_name || "",
        reason: "other",
        description: "Raportim nga menuja e Pazarit.",
        details: "Raportim nga menuja e Pazarit.",
        status: "new"
      });
      alert("Raportimi u dërgua tek stafi.");
    } catch (error) {
      alert(error?.message || "Raportimi nuk u ruajt. Provo përsëri.");
    } finally {
      setReporting(false);
    }
  };

  return (
    <Link to={detailUrl}
      className="bg-[#1c2333] rounded-xl overflow-hidden border border-white/8 hover:border-white/20 transition-all group block">
      {/* Image */}
      <div className="relative aspect-square bg-[#2a3347] overflow-hidden">
        {thumbnail ? (
          <img src={thumbnail} alt={job.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag className="w-10 h-10 text-white/20" />
          </div>
        )}
        <button onClick={e => { e.preventDefault(); setLiked(!liked); }}
          className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all
            ${liked ? "bg-red-500 text-white" : "bg-black/50 text-white/70 hover:text-white"}`}>
          <Heart className={`w-4 h-4 ${liked ? "fill-white" : ""}`} />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              onClick={stopCardClick}
              className="absolute right-2 top-12 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white/80 transition-all hover:bg-black/75 hover:text-white"
              aria-label="Më shumë mundësi"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 border-white/10 bg-[#0b1020] text-white">
            <DropdownMenuItem onClick={(event) => { stopCardClick(event); setLiked(true); }} className="cursor-pointer gap-2 text-white/85">
              <Heart className={`h-4 w-4 ${liked ? "fill-red-400 text-red-400" : "text-white/65"}`} />
              {liked ? "I ruajtur si i preferuar" : "Ruaje si i preferuar"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={shareListing} className="cursor-pointer gap-2 text-white/85">
              <Share2 className="h-4 w-4 text-white/65" /> Shpërndaj
            </DropdownMenuItem>
            {job.phone_number && (
              <DropdownMenuItem asChild>
                <a href={`tel:${String(job.phone_number).replace(/\s+/g, "")}`} onClick={stopCardClick} className="flex cursor-pointer items-center gap-2 text-white/85">
                  <Phone className="h-4 w-4 text-white/65" /> Kontakto me telefon
                </a>
              </DropdownMenuItem>
            )}
            {publicContactUrl && (
              <DropdownMenuItem asChild>
                <a href={publicContactUrl} target="_blank" rel="noopener noreferrer" onClick={stopCardClick} className="flex cursor-pointer items-center gap-2 text-white/85">
                  <Link2 className="h-4 w-4 text-white/65" /> Link kontakti
                </a>
              </DropdownMenuItem>
            )}
            {!canContact && (
              <DropdownMenuItem asChild>
                <Link to={detailUrl} onClick={stopCardClick} className="flex cursor-pointer items-center gap-2 text-white/85">
                  <MessageCircle className="h-4 w-4 text-white/65" /> Shiko mënyrat e kontaktit
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              <Link to={`${detailUrl}#vleresim`} onClick={stopCardClick} className="flex cursor-pointer items-center gap-2 text-white/85">
                <Star className="h-4 w-4 text-[#ffd166]" /> Jep vlerësim
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={reportListing} className="cursor-pointer gap-2 text-orange-200">
              <Flag className="h-4 w-4 text-orange-300" /> {reporting ? "Duke raportuar..." : "Raporto"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {job.job_type === "ofroj" && price && (
          <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs font-bold px-2 py-0.5 rounded-lg">
            {price}
          </div>
        )}
        {job.job_type === "kerkoj" && (
          <div className="absolute top-2 left-2 bg-[#8ab4ff]/90 text-[#0b1020] text-[10px] font-bold px-2 py-0.5 rounded-lg">
            KËRKOJ
          </div>
        )}
        {job.job_type === "dhuroj" && (
          <div className="absolute top-2 left-2 bg-[#9bffd6]/90 text-[#0b1020] text-[10px] font-bold px-2 py-0.5 rounded-lg">
            DHUROJ
          </div>
        )}
      </div>
      {/* Info */}
      <div className="p-3">
        <p className="text-white font-semibold text-sm leading-tight line-clamp-2">{job.title}</p>
        {(job.city || job.country) && (
          <p className="text-white/40 text-xs mt-1 flex items-center gap-1">
            <MapPin className="w-3 h-3" />{job.city || job.country}
          </p>
        )}
        <p className="text-white/30 text-xs mt-0.5 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {new Date(job.created_date).toLocaleDateString("sq")}
        </p>
      </div>
    </Link>
  );
}

/* ─── IMPORT MODAL ─── */
function ImportModal({ onClose, onImported, user }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [extracted, setExtracted] = useState(null);
  const [step, setStep] = useState("input"); // input | preview | done
  const [category, setCategory] = useState("makina");
  const [jobType, setJobType] = useState("ofroj");

  const setMainImage = (index) => {
    const images = Array.isArray(extracted?.image_urls) ? extracted.image_urls : [];
    setExtracted((prev) => ({ ...prev, main_image_index: index, image_url: images[index] || "" }));
  };

  const removeImage = (index) => {
    const images = (Array.isArray(extracted?.image_urls) ? extracted.image_urls : []).filter((_, i) => i !== index);
    const nextMain = Math.min(Number(extracted?.main_image_index || 0), Math.max(0, images.length - 1));
    setExtracted((prev) => ({
      ...prev,
      image_urls: images,
      main_image_index: nextMain,
      image_url: images[nextMain] || "",
    }));
  };

  const handleUploadImages = async (event) => {
    const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith("image/"));
    event.target.value = "";
    if (!files.length) return;
    const currentImages = Array.isArray(extracted?.image_urls) ? extracted.image_urls : [];
    const slots = Math.max(0, 6 - currentImages.length);
    if (slots <= 0) {
      setError("Mund të ngarkoni maksimumi 6 foto.");
      return;
    }
    try {
      setLoading(true);
      const uploads = await Promise.all(files.slice(0, slots).map((file) => base44.integrations.Core.UploadFile({ file })));
      const nextImages = [...currentImages, ...uploads.map((item) => item.file_url).filter(Boolean)].slice(0, 6);
      const nextMain = Math.min(Number(extracted?.main_image_index || 0), Math.max(0, nextImages.length - 1));
      setExtracted((prev) => ({
        ...prev,
        image_urls: nextImages,
        main_image_index: nextMain,
        image_url: nextImages[nextMain] || "",
      }));
    } catch (error) {
      setError("Gabim gjatë ngarkimit të fotove.");
    } finally {
      setLoading(false);
    }
  };

  // Force body scroll when modal open (override any layout overflow:hidden)
  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, []);

  const handleFetch = async () => {
    if (!url.trim()) return;
    setLoading(true); setError(""); setExtracted(null);
    try {
      const res = await base44.functions.invoke("importMarketplacePost", { url: url.trim(), category, job_type: jobType });
      if (res.data?.success) {
        const imported = res.data.data || {};
        setExtracted({
          ...imported,
          image_urls: Array.isArray(imported.image_urls) ? imported.image_urls.slice(0, 6) : imported.image_url ? [imported.image_url] : [],
          main_image_index: 0,
          image_url: (Array.isArray(imported.image_urls) && imported.image_urls[0]) || imported.image_url || "",
          source_url: imported.source_url || url.trim(),
          import_source_url: imported.import_source_url || imported.source_url || url.trim(),
          import_author_profile_url: imported.import_author_profile_url || imported.author_profile_url || "",
          show_source_url: false,
          show_author_profile_url: false,
        });
        setStep("preview");
      } else {
        setError(res.data?.error || "Nuk u mundua të importohet njoftimi.");
      }
    } catch (e) {
      setError("Gabim gjatë importimit. Kontrolloni URL-në.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!extracted) return;
    if (!isValidInternationalPhone(extracted.phone_number)) {
      setError(getInternationalPhoneError("Numri i telefonit"));
      return;
    }
    const phoneNumber = normalizeInternationalPhone(extracted.phone_number);
    const images = Array.isArray(extracted.image_urls) ? extracted.image_urls.slice(0, 6) : [];
    const mainIndex = Math.min(Number(extracted.main_image_index || 0), Math.max(0, images.length - 1));
    setLoading(true);
    try {
      await base44.entities.Job.create({
        ...extracted,
        image_urls: images,
        main_image_index: mainIndex,
        image_url: images[mainIndex] || extracted.image_url || "",
        phone_number: phoneNumber || "",
        source_url: extracted.source_url || url,
        author_profile_url: extracted.author_profile_url || "",
        import_source_url: extracted.import_source_url || extracted.source_url || url,
        import_author_profile_url: extracted.import_author_profile_url || extracted.author_profile_url || "",
        importer_email: user?.email || "",
        import_original_text: extracted.import_original_text || extracted.description || "",
        show_source_url: extracted.show_source_url === true,
        show_author_profile_url: extracted.show_author_profile_url === true,
        imported_community_request: true,
        import_type: "marketplace_import_assistant",
        status: "approved",
        category: "pazar",
        pazar_category: category,
        job_type: jobType,
      });
      setStep("done");
      setTimeout(() => { onClose(); onImported?.(); }, 1500);
    } catch (e) {
      setError("Gabim gjatë ruajtjes.");
    } finally {
      setLoading(false);
    }
  };

  const modal = (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.75)' }} onClick={onClose}>
      <div
        style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: '520px', maxHeight: '88vh', overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            {step === "preview" && (
              <button onClick={() => setStep("input")} className="text-white/50 hover:text-white mr-1">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <Upload className="w-5 h-5 text-[#8ab4ff]" />
            <h2 className="text-white font-bold text-base">Importo Njoftim</h2>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          {step === "input" && (
            <>
              <p className="text-white/60 text-sm">
                Ngjit URL-në e njoftimit nga faqe si OLX, Merrjep, Autoscout, Immobilien Scout, Willhaben, Facebook Marketplace, etj.
              </p>

              {/* Supported sites */}
              <div className="flex flex-wrap gap-2">
                {["OLX.al","Merrjep.com","Merrfal.com","Autoscout24","Immoscout24","Willhaben","eBay Kleinanzeigen","Subito.it","Leboncoin"].map(s => (
                  <span key={s} className="text-xs bg-white/5 border border-white/10 px-2 py-1 rounded-lg text-white/50">{s}</span>
                ))}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-white/60 text-xs mb-1 block">URL e njoftimit *</label>
                  <input value={url} onChange={e => setUrl(e.target.value)}
                    placeholder="https://www.olx.al/oferta/..."
                    className="w-full bg-[#1c2333] border border-white/15 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#8ab4ff] placeholder:text-white/30" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-white/60 text-xs mb-1 block">Kategoria</label>
                    <select value={category} onChange={e => setCategory(e.target.value)}
                      className="w-full bg-[#1c2333] border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm outline-none">
                      {CATEGORIES.filter(c => c.key !== "all").map(c => (
                        <option key={c.key} value={c.key}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-white/60 text-xs mb-1 block">Lloji</label>
                    <select value={jobType} onChange={e => setJobType(e.target.value)}
                     className="w-full bg-[#1c2333] border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm outline-none">
                     <option value="ofroj">Ofroj / Shes</option>
                     <option value="kerkoj">Kërkoj / Blen</option>
                     <option value="dhuroj">Dhuroj falas</option>
                    </select>
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}

              <button onClick={handleFetch} disabled={!url.trim() || loading}
                className="w-full py-3 rounded-xl font-bold text-[#0b1020] disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(to right, #8ab4ff, #9bffd6)' }}>
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Duke marrë të dhënat...</> : <><ExternalLink className="w-4 h-4" /> Merr të dhënat</>}
              </button>
            </>
          )}

          {step === "preview" && extracted && (
            <>
              <p className="text-[#9bffd6] text-sm font-medium flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> Të dhënat u morën me sukses!
              </p>
              <div className="space-y-3">
                {/* Foto preview - deri 6 */}
                {Array.isArray(extracted.image_urls) && extracted.image_urls.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-white/40 text-xs block">Fotot ({Math.min(extracted.image_urls.length, 6)}/6)</label>
                    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#1c2333]">
                      <img
                        src={extracted.image_urls[extracted.main_image_index || 0]}
                        alt="Foto kryesore"
                        className="h-52 w-full object-cover"
                        onError={e => e.currentTarget.style.display='none'}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {extracted.image_urls.slice(0, 6).map((imgUrl, i) => {
                        const selected = Number(extracted.main_image_index || 0) === i;
                        return (
                          <div key={`${imgUrl}-${i}`} className={`relative overflow-hidden rounded-lg border ${selected ? "border-[#9bffd6]" : "border-white/10"}`}>
                            <img src={imgUrl} alt="" className="h-16 w-full object-cover" onError={e => e.currentTarget.style.display='none'} />
                            <button type="button" onClick={() => setMainImage(i)} className={`absolute left-1 top-1 rounded-full p-1 ${selected ? "bg-[#9bffd6] text-[#0b1020]" : "bg-black/60 text-white"}`}>
                              <Star className={`h-3 w-3 ${selected ? "fill-current" : ""}`} />
                            </button>
                            <button type="button" onClick={() => removeImage(i)} className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-red-500">
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <label className={`inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/15 px-3 py-2.5 text-sm font-semibold text-white/75 hover:bg-white/10 ${(extracted.image_urls || []).length >= 6 ? "pointer-events-none opacity-45" : ""}`}>
                  <Upload className="h-4 w-4" />
                  Ngarko foto manualisht
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleUploadImages} disabled={loading || (extracted.image_urls || []).length >= 6} />
                </label>
                <div>
                  <label className="text-white/40 text-xs">Titulli</label>
                  <input value={extracted.title || ""} onChange={e => setExtracted({...extracted, title: e.target.value})}
                    className="w-full bg-[#1c2333] border border-white/15 rounded-xl px-3 py-2 text-white text-sm outline-none mt-1" />
                </div>
                <div>
                  <label className="text-white/40 text-xs">Çmimi</label>
                  <input value={extracted.salary_info || ""} onChange={e => setExtracted({...extracted, salary_info: e.target.value})}
                    className="w-full bg-[#1c2333] border border-white/15 rounded-xl px-3 py-2 text-white text-sm outline-none mt-1" placeholder="Çmimi..." />
                </div>
                <div>
                  <label className="text-white/40 text-xs">Vendndodhja</label>
                  <input value={extracted.address || extracted.city || ""} onChange={e => setExtracted({...extracted, city: e.target.value})}
                    className="w-full bg-[#1c2333] border border-white/15 rounded-xl px-3 py-2 text-white text-sm outline-none mt-1" placeholder="Qyteti..." />
                </div>
                <div>
                  <label className="text-white/40 text-xs">Dhënësi</label>
                  <div className="flex gap-2 mt-1">
                    <input value={extracted.poster_name || ""} onChange={e => setExtracted({...extracted, poster_name: e.target.value})}
                      className="flex-1 bg-[#1c2333] border border-white/15 rounded-xl px-3 py-2 text-white text-sm outline-none" placeholder="Emri dhënësit..." />
                    <input value={extracted.author_profile_url || ""} onChange={e => setExtracted({...extracted, author_profile_url: e.target.value, import_author_profile_url: e.target.value})}
                      className="flex-1 bg-[#1c2333] border border-white/15 rounded-xl px-3 py-2 text-white text-sm outline-none" placeholder="Linku i postuesit / kontaktit..." />
                  </div>
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input type="checkbox" checked={extracted.show_author_profile_url === true} onChange={e => setExtracted({...extracted, show_author_profile_url: e.target.checked})}
                      className="w-4 h-4 accent-blue-500" />
                    <span className="text-white/50 text-xs">Shfaq linkun e postuesit si kontakt publik</span>
                  </label>
                </div>
                <div>
                  <label className="text-white/40 text-xs">Përshkrimi</label>
                  <textarea value={extracted.description || ""} onChange={e => setExtracted({...extracted, description: e.target.value})}
                    rows={4} className="w-full bg-[#1c2333] border border-white/15 rounded-xl px-3 py-2 text-white text-sm outline-none mt-1 resize-none" />
                </div>
                <div>
                  <label className="text-white/40 text-xs flex items-center gap-1">
                    📞 Numri i telefonit
                    {!extracted.phone_number && <span className="text-yellow-400/70 text-[10px] ml-1">(nuk u gjet automatikisht — shtoje manualisht)</span>}
                  </label>
                  <input value={extracted.phone_number || ""} onChange={e => setExtracted({...extracted, phone_number: e.target.value})}
                    className={`w-full bg-[#1c2333] border rounded-xl px-3 py-2 text-white text-sm outline-none mt-1 ${!extracted.phone ? "border-yellow-400/30 focus:border-yellow-400/60" : "border-white/15 focus:border-[#8ab4ff]"}`}
                    placeholder={PHONE_PLACEHOLDER} />
                </div>
                <div>
                  <label className="text-white/40 text-xs">Kontakt tjetër (email, website)</label>
                  <input value={extracted.contact_info || ""} onChange={e => setExtracted({...extracted, contact_info: e.target.value})}
                    className="w-full bg-[#1c2333] border border-white/15 rounded-xl px-3 py-2 text-white text-sm outline-none mt-1" placeholder="email, link..." />
                </div>
                          <div>
            <label className="text-white/40 text-xs">Linku i njoftimit / burimit</label>
            <input value={extracted.source_url || ""} onChange={e => setExtracted({...extracted, source_url: e.target.value, import_source_url: e.target.value})}
              className="w-full bg-[#1c2333] border border-white/15 rounded-xl px-3 py-2 text-white text-sm outline-none"
              placeholder="p.sh. https://merrfal.com/..." />
            <label className="flex items-center gap-2 mt-1 cursor-pointer">
              <input type="checkbox" checked={extracted.show_source_url === true} onChange={e => setExtracted({...extracted, show_source_url: e.target.checked})}
                className="w-4 h-4 accent-blue-500" />
              <span className="text-white/50 text-xs">Shfaq linkun e njoftimit publikisht</span>
            </label>
          </div>
              </div>
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}
              <button onClick={handleSave} disabled={loading}
                className="w-full py-3 rounded-xl font-bold text-[#0b1020] disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(to right, #8ab4ff, #9bffd6)' }}>
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Duke ruajtur...</> : "Publiko Njoftimin"}
              </button>
            </>
          )}

          {step === "done" && (
            <div className="text-center py-8 space-y-3">
              <div className="text-5xl">✅</div>
              <p className="text-white font-bold text-lg">Njoftimi u importua!</p>
              <p className="text-white/50 text-sm">Njoftimi u publikua në Pazar.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
  return createPortal(modal, document.body);
}

/* ─── MAIN PAGE ─── */
export default function Pazar() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [user, setUser] = useState(null);
  const canImportPosts = user?.role === "admin" || user?.role === "moderator";

  React.useEffect(() => {
    base44.auth.isAuthenticated().then(async auth => {
      if (auth) setUser(await base44.auth.me());
    });
  }, []);

  const { data: jobs = [], isLoading, refetch } = useQuery({
    queryKey: ["pazarJobs"],
    queryFn: () => base44.entities.Job.filter({ status: "approved" }, "-created_date", 200),
  });

  const filtered = useMemo(() => {
    return jobs.filter(j => {
      // Shfaq: njoftime me category="pazar" OSE me pazar_category OSE prona shitje/qera
      const isPazar = j.category === "pazar" || !!j.pazar_category;
      const isPronaForSaleOrRent = j.category === "prona" && (j.property_deal_type === "shitje" || j.property_deal_type === "qera");

      if (!isPazar && !isPronaForSaleOrRent) return false;

      // Filter by active category
      if (activeCategory !== "all") {
        const pazarCat = j.pazar_category || "";
        const matchesPazarCat = pazarCat === activeCategory;
        const matchesMainCat = j.category === activeCategory;
        // Handle femije subcategories
        const isFemijeSubcat = FEMIJE_SUBCATS.some(s => s.key === activeCategory && (pazarCat === s.parent || pazarCat === activeCategory));
        if (!matchesPazarCat && !matchesMainCat && !isFemijeSubcat) return false;
      }

      // Search filter
      if (search) {
        const q = search.toLowerCase();
        if (!`${j.title} ${j.description || ""} ${j.city || ""}`.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [jobs, activeCategory, search]);

  return (
    <div className="min-h-screen bg-[#0b1020]">
      {/* Header */}
      <div className="bg-[#0b1020] border-b border-white/10 px-4 py-3 sticky top-16 z-20">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-white font-black text-xl flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-[#8ab4ff]" /> Pazar
          </h1>
          <div className="flex items-center gap-2">
            {canImportPosts && (
              <button onClick={() => setShowImport(true)}
                className="flex items-center gap-1.5 bg-[#8ab4ff]/15 border border-[#8ab4ff]/30 text-[#8ab4ff] text-xs font-semibold px-3 py-2 rounded-lg hover:bg-[#8ab4ff]/25 transition-all">
                <Upload className="w-3.5 h-3.5" /> Importo
              </button>
            )}
            <Link to="/CreatePost?category=pazar"
              className="flex items-center gap-1.5 text-[#0b1020] text-xs font-bold px-3 py-2 rounded-lg"
              style={{ background: 'linear-gradient(to right, #8ab4ff, #9bffd6)' }}>
              <Plus className="w-3.5 h-3.5" /> Posto
            </Link>
          </div>
        </div>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Kërko në Pazar..."
            className="w-full bg-[#1c2333] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm outline-none placeholder:text-white/30 focus:border-[#8ab4ff]/40" />
        </div>
      </div>

      <div className="flex">
        {/* Left sidebar - categories (desktop) */}
        <div className="hidden md:flex flex-col w-64 shrink-0 p-4 border-r border-white/8 sticky top-32 h-screen overflow-y-auto">
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-3">Kategoritë</p>
          {CATEGORIES.map(cat => (
            <button key={cat.key} onClick={() => setActiveCategory(cat.key)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all w-full text-left mb-0.5
                ${activeCategory === cat.key ? "bg-[#8ab4ff]/15 text-[#8ab4ff]" : "text-white/60 hover:bg-white/5 hover:text-white"}`}>
              <cat.icon className="w-5 h-5 shrink-0" />
              {cat.label}
            </button>
          ))}
          <div className="mt-6 pt-4 border-t border-white/8">
            <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-3">Veprimet</p>
            {canImportPosts && (
              <button onClick={() => setShowImport(true)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:bg-white/5 hover:text-white transition-all w-full">
                <Upload className="w-5 h-5" /> Importo Njoftim
              </button>
            )}
            <Link to="/CreatePost?category=pazar"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:bg-white/5 hover:text-white transition-all">
              <Plus className="w-5 h-5" /> Posto Njoftim
            </Link>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Mobile categories scroll */}
          <div className="md:hidden flex gap-2 overflow-x-auto px-4 py-3 [&::-webkit-scrollbar]:hidden border-b border-white/8"
            style={{ touchAction: 'pan-x', WebkitOverflowScrolling: 'touch' }}>
            {CATEGORIES.map(cat => (
              <button key={cat.key} onClick={() => setActiveCategory(cat.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all
                  ${activeCategory === cat.key ? "bg-[#8ab4ff] text-[#0b1020]" : "bg-white/8 text-white/60 hover:bg-white/15"}`}>
                <cat.icon className="w-3.5 h-3.5" />
                {cat.label}
              </button>
            ))}
          </div>

          {/* Grid */}
          <div className="p-3">
            {isLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 text-[#8ab4ff] animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20">
                <ShoppingBag className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <p className="text-white/60 font-medium">Nuk ka njoftime në Pazar</p>
                <p className="text-white/30 text-sm mt-1">Bëhu i pari që poston!</p>
                {canImportPosts && (
                  <button onClick={() => setShowImport(true)}
                    className="mt-4 px-6 py-2.5 rounded-xl text-sm font-bold text-[#0b1020]"
                    style={{ background: 'linear-gradient(to right, #8ab4ff, #9bffd6)' }}>
                    Importo nga faqe tjetër
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {filtered.map(job => <ListingCard key={job.id} job={job} user={user} />)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Import Modal */}
      {showImport && canImportPosts && (
        <ImportModal user={user} onClose={() => setShowImport(false)} onImported={() => refetch()} />
      )}
    </div>
  );
}
