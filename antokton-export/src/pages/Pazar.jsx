import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { base44 } from "@/api/antoktonClient";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ShoppingBag, Home, Car, Sofa, Shirt, Smartphone, Bike,
  Wrench, Leaf, BookOpen, Palette, Gift, Search,
  Plus, MapPin, Clock, Heart, X, Upload,
  ExternalLink, Loader2, Tag, ArrowLeft,
  AlertCircle, CheckCircle
} from "lucide-react";
import { PHONE_PLACEHOLDER, getInternationalPhoneError, isValidInternationalPhone, normalizeInternationalPhone } from "@/lib/phone";

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
function ListingCard({ job }) {
  const [liked, setLiked] = useState(false);
  const price = job.salary_info || "";
  return (
    <Link to={`/PostDetail?id=${job.id}`}
      className="bg-[#1c2333] rounded-xl overflow-hidden border border-white/8 hover:border-white/20 transition-all group block">
      {/* Image */}
      <div className="relative aspect-square bg-[#2a3347] overflow-hidden">
        {job.image_url ? (
          <img src={job.image_url} alt={job.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
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
function ImportModal({ onClose, onImported }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [extracted, setExtracted] = useState(null);
  const [step, setStep] = useState("input"); // input | preview | done
  const [category, setCategory] = useState("makina");
  const [jobType, setJobType] = useState("ofroj");

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
        setExtracted(res.data.data);
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
    setLoading(true);
    try {
      await base44.entities.Job.create({
        ...extracted,
        phone_number: phoneNumber || "",
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
                {/* Foto preview - deri 3 falas */}
                {Array.isArray(extracted.image_urls) && extracted.image_urls.length > 0 && (
                  <div>
                    <label className="text-white/40 text-xs mb-1 block">Fotot ({Math.min(extracted.image_urls.length, 3)} falas)</label>
                    <div className="flex gap-2 overflow-x-auto">
                      {extracted.image_urls.slice(0, 3).map((url, i) => (
                        <img key={i} src={url} alt="" className="w-28 h-20 object-cover rounded-lg shrink-0 border border-white/10" onError={e => e.target.style.display='none'} />
                      ))}
                    </div>
                  </div>
                )}
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
                    <input value={extracted.author_profile_url || ""} onChange={e => setExtracted({...extracted, author_profile_url: e.target.value})}
                      className="flex-1 bg-[#1c2333] border border-white/15 rounded-xl px-3 py-2 text-white text-sm outline-none" placeholder="URL profili..." />
                  </div>
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
            <label className="text-white/40 text-xs">Linku origjinal i njoftimit</label>
            <input value={extracted.source_url || ""} onChange={e => setExtracted({...extracted, source_url: e.target.value})}
              className="w-full bg-[#1c2333] border border-white/15 rounded-xl px-3 py-2 text-white text-sm outline-none"
              placeholder="p.sh. https://merrfal.com/..." />
            <label className="flex items-center gap-2 mt-1 cursor-pointer">
              <input type="checkbox" checked={extracted.show_source_url || false} onChange={e => setExtracted({...extracted, show_source_url: e.target.checked})}
                className="w-4 h-4 accent-blue-500" />
              <span className="text-white/50 text-xs">Shfaq linkun origjinal te kontakti</span>
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
            <Link to="/CreatePost"
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
            <Link to="/CreatePost"
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
                {filtered.map(job => <ListingCard key={job.id} job={job} />)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Import Modal */}
      {showImport && canImportPosts && (
        <ImportModal onClose={() => setShowImport(false)} onImported={() => refetch()} />
      )}
    </div>
  );
}
