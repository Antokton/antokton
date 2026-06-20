import React, { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { base44 } from "@/api/antoktonClient";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  ShoppingBag, Home, Car, Sofa, Shirt, Smartphone, Bike,
  Wrench, Leaf, BookOpen, Gift, Search,
  Plus, MapPin, Clock, Heart, X, Upload, Star,
  ExternalLink, Loader2, Tag, ArrowLeft,
  AlertCircle, CheckCircle, MoreVertical, Flag, Share2, MessageCircle, Phone, Eye, Pencil, Trash2
} from "lucide-react";
import { PHONE_PLACEHOLDER, getInternationalPhoneError, isValidInternationalPhone, normalizeInternationalPhone } from "@/lib/phone";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ImageFocusControls from "@/components/media/ImageFocusControls";
import ImageFocusPreview from "@/components/media/ImageFocusPreview";
import LocationPicker from "@/components/job/LocationPicker";
import { getImageFocus, getImageFocusStyle, pruneImageFocusMap, reorderImageGallery, updateImageFocus } from "@/lib/imageFocus";
import { PAZAR_NAV_CATEGORIES, cleanPazarLabel, findPazarCategory, pazarCategoryMatches } from "@/lib/pazarCategories";
import { buildExpiryFields, filterActivePosts } from "@/lib/expiry";

/* ─── KATEGORITE ─── */
const ICONS_BY_CATEGORY = {
  all: ShoppingBag,
  prona: Home,
  makina: Car,
  makineri: Wrench,
  vegla_pune: Wrench,
  elektronike: Smartphone,
  mobilje_shtepi: Sofa,
  veshje: Shirt,
  femije: Gift,
  sport_hobi: Bike,
  libra_media: BookOpen,
  ushqim_bujqesi: Leaf,
  dhurime: Gift,
  tjeter_pazar: Tag,
};

const CATEGORIES = PAZAR_NAV_CATEGORIES.map((category) => ({
  key: category.value,
  label: cleanPazarLabel(category.label),
  icon: ICONS_BY_CATEGORY[category.value] || ShoppingBag,
  subcategories: category.subcategories || [],
}));

/* ─── LISTING CARD ─── */
const REPORT_REASONS = [
  { value: "i_shitur", label: "Është shitur / nuk është më në dispozicion" },
  { value: "cmim_i_ndryshuar", label: "Çmimi është ndryshuar" },
  { value: "fake", label: "Mashtrim / njoftim i rremë" },
  { value: "spam", label: "Spam" },
  { value: "inappropriate", label: "Përmbajtje e papërshtatshme" },
  { value: "other", label: "Tjetër" },
];

function cleanText(value, max = 1200) {
  return String(value || "").replace(/[<>]/g, "").trim().slice(0, max);
}

function ListingCard({ job, user, onChanged }) {
  const navigate = useNavigate();
  const [liked, setLiked] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return JSON.parse(window.localStorage.getItem("pazar_favorites") || "[]").includes(job.id);
    } catch {
      return false;
    }
  });
  const [reporting, setReporting] = useState(false);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingSaving, setRatingSaving] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("i_shitur");
  const [reportDetails, setReportDetails] = useState("");
  const price = job.salary_info || "";
  const gallery = Array.isArray(job.image_urls) ? job.image_urls : [];
  const thumbnail = job.image_url || gallery[Math.min(Number(job.main_image_index || 0), Math.max(0, gallery.length - 1))] || gallery[0] || "";
  const thumbnailFocus = getImageFocus(job.image_focus_json, thumbnail);
  const detailUrl = `/PostDetail?id=${job.id}&from=/Pazar`;
  const publicContactUrl = job.show_author_profile_url === true ? (job.author_profile_url || job.import_author_profile_url || "") : "";
  const canContact = Boolean(job.phone_number || publicContactUrl);
  const canStaffEdit = user?.role === "admin" || user?.role === "moderator";

  const stopCardClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const toggleFavorite = (event) => {
    stopCardClick(event);
    setLiked((current) => {
      const next = !current;
      if (typeof window !== "undefined") {
        try {
          const saved = JSON.parse(window.localStorage.getItem("pazar_favorites") || "[]");
          const updated = next
            ? Array.from(new Set([...saved, job.id]))
            : saved.filter((id) => id !== job.id);
          window.localStorage.setItem("pazar_favorites", JSON.stringify(updated));
        } catch {
          // Local favorites are best-effort.
        }
      }
      return next;
    });
  };

  const openExternal = (event, targetUrl) => {
    stopCardClick(event);
    if (!targetUrl) return;
    window.open(targetUrl, "_blank", "noopener,noreferrer");
  };

  const contactListing = (event) => {
    stopCardClick(event);
    if (job.phone_number) {
      window.location.href = `tel:${String(job.phone_number).replace(/\s+/g, "")}`;
      return;
    }
    if (publicContactUrl) openExternal(event, publicContactUrl);
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

  const goToDetail = (event, edit = false) => {
    stopCardClick(event);
    navigate(`${detailUrl}${edit ? "&edit=1" : ""}`);
  };

  const saveRating = async () => {
    if (!user) {
      base44.auth.redirectToLogin();
      return;
    }
    if (!ratingValue || ratingSaving) return;
    setRatingSaving(true);
    try {
      await base44.entities.Rating.create({
        post_id: job.id,
        job_id: job.id,
        listing_id: job.id,
        rating_type: "marketplace_listing",
        rater_email: user.email || "",
        rated_user_email: job.created_by || job.author_email || "",
        rated_entity: "Job",
        rated_entity_id: job.id,
        overall_rating: ratingValue,
        rating: ratingValue,
        comment: cleanText(ratingComment, 600),
        status: "new",
      });
      setRatingOpen(false);
      setRatingValue(0);
      setRatingComment("");
      alert("Vlerësimi u ruajt.");
    } catch (error) {
      alert(error?.message || "Vlerësimi nuk u ruajt. Provo përsëri.");
    } finally {
      setRatingSaving(false);
    }
  };

  const deleteListing = async (event) => {
    stopCardClick(event);
    if (!canStaffEdit) return;
    if (!window.confirm("Dëshiron ta fshish këtë njoftim?")) return;
    try {
      await base44.entities.Job.delete(job.id);
      onChanged?.();
    } catch (error) {
      alert(error?.message || "Njoftimi nuk u fshi. Provo përsëri.");
    }
  };

  const openReport = (event) => {
    stopCardClick(event);
    if (!user) {
      base44.auth.redirectToLogin();
      return;
    }
    setReportOpen(true);
  };

  const reportListing = async () => {
    if (reporting) return;
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
        reason: reportReason,
        description: cleanText(reportDetails) || REPORT_REASONS.find((item) => item.value === reportReason)?.label || "Raportim nga menuja e Pazarit.",
        details: cleanText(reportDetails),
        status: "new"
      });
      setReportOpen(false);
      setReportDetails("");
      alert("Raportimi u dërgua tek stafi.");
    } catch (error) {
      alert(error?.message || "Raportimi nuk u ruajt. Provo përsëri.");
    } finally {
      setReporting(false);
    }
  };

  const modalBase = "fixed inset-0 z-[10000] flex items-center justify-center bg-black/75 p-4";

  return (
    <>
    <Link to={detailUrl}
      className="bg-[#1c2333] rounded-xl overflow-hidden border border-white/8 hover:border-white/20 transition-all group block">
      {/* Image */}
      <div className="relative aspect-square bg-[#2a3347] overflow-hidden">
        {thumbnail ? (
          <ImageFocusPreview
            src={thumbnail}
            alt={job.title}
            focus={thumbnailFocus}
            className="h-full w-full"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag className="w-10 h-10 text-white/20" />
          </div>
        )}
        <div className="absolute right-2 top-2 z-30 flex gap-1.5 rounded-full bg-black/70 p-1 shadow-lg ring-1 ring-white/20 backdrop-blur">
          <button onClick={toggleFavorite}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition-all
              ${liked ? "bg-red-500 text-white" : "bg-white/10 text-white hover:bg-white/20"}`}
            aria-label={liked ? "Hiq nga të preferuarat" : "Ruaje si të preferuar"}
          >
            <Heart className={`w-4 h-4 ${liked ? "fill-white" : ""}`} />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                onClick={stopCardClick}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:bg-white/20"
                aria-label="Më shumë mundësi"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 border-white/10 bg-[#0b1020] text-white">
            <DropdownMenuItem onSelect={(event) => { event.preventDefault(); goToDetail(event); }} className="cursor-pointer gap-2 text-white/85">
              <Eye className="h-4 w-4 text-white/65" /> Shiko të plotë
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={(event) => { event.preventDefault(); shareListing(event); }} className="cursor-pointer gap-2 text-white/85">
              <Share2 className="h-4 w-4 text-white/65" /> Shpërndaj
            </DropdownMenuItem>
            {canContact && (
              <DropdownMenuItem onSelect={(event) => { event.preventDefault(); contactListing(event); }} className="cursor-pointer gap-2 text-white/85">
                {job.phone_number ? <Phone className="h-4 w-4 text-white/65" /> : <ExternalLink className="h-4 w-4 text-white/65" />}
                {job.phone_number ? "Thirr" : "Shkruaj"}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={(event) => { event.preventDefault(); stopCardClick(event); setRatingOpen(true); }} className="cursor-pointer gap-2 text-white/85">
              <Star className="h-4 w-4 text-[#ffd166]" /> Jep vlerësim
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={(event) => { event.preventDefault(); openReport(event); }} className="cursor-pointer gap-2 text-orange-200">
              <Flag className="h-4 w-4 text-orange-300" /> {reporting ? "Duke raportuar..." : "Raporto"}
            </DropdownMenuItem>
            {canStaffEdit && (
              <DropdownMenuItem onSelect={(event) => { event.preventDefault(); goToDetail(event, true); }} className="cursor-pointer gap-2 text-[#8ab4ff]">
                <Pencil className="h-4 w-4" /> Përpuno
              </DropdownMenuItem>
            )}
            {canStaffEdit && (
              <DropdownMenuItem onSelect={(event) => { event.preventDefault(); deleteListing(event); }} className="cursor-pointer gap-2 text-red-300">
                <Trash2 className="h-4 w-4" /> Fshi
              </DropdownMenuItem>
            )}
            {!canContact && (
              <DropdownMenuItem onSelect={(event) => { event.preventDefault(); goToDetail(event); }} className="cursor-pointer gap-2 text-white/85">
                <MessageCircle className="h-4 w-4 text-white/65" /> Shiko mënyrat e kontaktit
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
          </DropdownMenu>
        </div>
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

    {ratingOpen && createPortal(
      <div className={modalBase} onClick={() => setRatingOpen(false)}>
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0b1020] p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Jep vlerësim</h3>
            <button type="button" onClick={() => setRatingOpen(false)} className="rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
          </div>
          <div className="mb-3 flex justify-center gap-1.5">
            {[1, 2, 3, 4, 5].map((value) => (
              <button key={value} type="button" onClick={() => setRatingValue(value)} className="p-1">
                <Star className={`h-8 w-8 ${value <= ratingValue ? "fill-[#ffd166] text-[#ffd166]" : "text-white/25"}`} />
              </button>
            ))}
          </div>
          <textarea
            value={ratingComment}
            onChange={(event) => setRatingComment(event.target.value)}
            placeholder="Koment opsional..."
            className="mb-3 min-h-[80px] w-full rounded-xl border border-white/10 bg-[#111a2c] px-3 py-2 text-sm text-white placeholder:text-white/35"
          />
          <button type="button" onClick={saveRating} disabled={!ratingValue || ratingSaving} className="w-full rounded-xl bg-[#8ab4ff] px-4 py-2.5 text-sm font-bold text-[#0b1020] disabled:opacity-50">
            {ratingSaving ? "Duke ruajtur..." : "Ruaj vlerësimin"}
          </button>
        </div>
      </div>,
      document.body
    )}

    {reportOpen && createPortal(
      <div className={modalBase} onClick={() => setReportOpen(false)}>
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b1020] p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-base font-bold text-white"><Flag className="h-4 w-4 text-orange-300" /> Raporto</h3>
            <button type="button" onClick={() => setReportOpen(false)} className="rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
          </div>
          <label className="mb-1 block text-xs font-semibold text-white/60">Arsyeja</label>
          <select value={reportReason} onChange={(event) => setReportReason(event.target.value)} className="mb-3 w-full rounded-xl border border-white/10 bg-[#111a2c] px-3 py-2 text-sm text-white">
            {REPORT_REASONS.map((item) => <option key={item.value} value={item.value} className="bg-[#0b1020]">{item.label}</option>)}
          </select>
          <label className="mb-1 block text-xs font-semibold text-white/60">Detaje shtesë</label>
          <textarea
            value={reportDetails}
            onChange={(event) => setReportDetails(event.target.value)}
            placeholder="Shpjego problemin nëse dëshiron..."
            className="mb-3 min-h-[90px] w-full rounded-xl border border-white/10 bg-[#111a2c] px-3 py-2 text-sm text-white placeholder:text-white/35"
          />
          <button type="button" onClick={reportListing} disabled={reporting} className="w-full rounded-xl bg-orange-400 px-4 py-2.5 text-sm font-bold text-[#0b1020] disabled:opacity-50">
            {reporting ? "Duke dërguar..." : "Dërgo raportimin"}
          </button>
        </div>
      </div>,
      document.body
    )}
    </>
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
  const [subcategory, setSubcategory] = useState("");
  const [jobType, setJobType] = useState("ofroj");
  const selectedCategory = findPazarCategory(category);

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
      image_focus_json: pruneImageFocusMap(prev?.image_focus_json, images),
    }));
  };

  const reorderImages = (fromIndex, toIndex) => {
    setExtracted((prev) => ({
      ...prev,
      ...reorderImageGallery(prev?.image_urls, fromIndex, toIndex, prev?.main_image_index),
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
      const nextMain = currentImages.length === 0
        ? 0
        : Math.min(Number(extracted?.main_image_index || 0), Math.max(0, nextImages.length - 1));
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

  const selectedImportImage = (extracted?.image_urls || [])[Math.min(Number(extracted?.main_image_index || 0), Math.max((extracted?.image_urls || []).length - 1, 0))] || "";

  const updateImportImageFocus = (focus) => {
    if (!selectedImportImage) return;
    setExtracted((prev) => ({
      ...prev,
      image_focus_json: updateImageFocus(prev?.image_focus_json, selectedImportImage, focus),
    }));
  };

  // Force body scroll when modal open (override any layout overflow:hidden)
  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, []);

  const openManualDraft = (message) => {
    const source = url.trim();
    setExtracted({
      title: "",
      description: "",
      salary_info: "",
      city: "",
      address: "",
      poster_name: "",
      phone_number: "",
      contact_info: "",
      image_urls: [],
      main_image_index: 0,
      image_url: "",
      image_focus_json: {},
      source_url: source,
      import_source_url: source,
      author_profile_url: "",
      import_author_profile_url: "",
      show_source_url: false,
      show_author_profile_url: false,
      category: "pazar",
      pazar_category: category,
      pazar_subcategory: subcategory,
      job_type: jobType,
      status: "pending",
    });
    setError(message || "Nuk u lexua automatikisht nga linku. Linku u ruajt për gjurmim; plotëso të dhënat manualisht dhe publiko kur ta kontrollosh.");
    setStep("preview");
  };

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
          image_focus_json: pruneImageFocusMap(imported.image_focus_json, Array.isArray(imported.image_urls) ? imported.image_urls.slice(0, 6) : imported.image_url ? [imported.image_url] : []),
          source_url: imported.source_url || url.trim(),
          import_source_url: imported.import_source_url || imported.source_url || url.trim(),
          import_author_profile_url: imported.import_author_profile_url || imported.author_profile_url || "",
          show_source_url: false,
          show_author_profile_url: false,
        });
        setStep("preview");
      } else {
        openManualDraft("Nuk u lexua automatikisht nga linku. Linku ruhet vetëm për gjurmim; plotëso të dhënat manualisht.");
      }
    } catch (e) {
      const technical = e?.status ? ` (${e.status})` : "";
      openManualDraft(`Importi automatik nuk u hap${technical}. Linku ruhet vetëm për gjurmim; plotëso të dhënat manualisht.`);
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
    const imageFocus = pruneImageFocusMap(extracted.image_focus_json, images);
    const expiry = buildExpiryFields({
      ...extracted,
      category: "pazar",
      pazar_category: extracted.pazar_category || category,
      pazar_subcategory: extracted.pazar_subcategory || subcategory || "",
      job_type: jobType,
    });
    setLoading(true);
    try {
      await base44.entities.Job.create({
        ...extracted,
        image_urls: images,
        main_image_index: mainIndex,
        image_url: images[mainIndex] || extracted.image_url || "",
        image_focus_json: imageFocus,
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
        pazar_category: extracted.pazar_category || category,
        pazar_subcategory: extracted.pazar_subcategory || subcategory || "",
        job_type: jobType,
        ...expiry,
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
                    <select value={category} onChange={e => { setCategory(e.target.value); setSubcategory(""); }}
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
                {selectedCategory?.subcategories?.length > 0 && (
                  <div>
                    <label className="text-white/60 text-xs mb-1 block">Nënkategoria</label>
                    <select value={subcategory} onChange={e => setSubcategory(e.target.value)}
                      className="w-full bg-[#1c2333] border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm outline-none">
                      <option value="">Zgjidh...</option>
                      {selectedCategory.subcategories.map((sub) => (
                        <option key={sub.value} value={sub.value}>{sub.label}</option>
                      ))}
                    </select>
                  </div>
                )}
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
              <p className={`text-sm font-medium flex items-center gap-2 ${error ? "text-yellow-300" : "text-[#9bffd6]"}`}>
                {error ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                {error ? "Draft manual nga linku" : "Të dhënat u morën me sukses!"}
              </p>
              <div className="space-y-3">
                {/* Foto preview - deri 6 */}
                {Array.isArray(extracted.image_urls) && extracted.image_urls.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-white/40 text-xs block">Fotot ({Math.min(extracted.image_urls.length, 6)}/6)</label>
                    <div className="mx-auto max-w-md rounded-xl border border-white/10 bg-[#1c2333]">
                      <ImageFocusPreview
                        src={selectedImportImage}
                        alt="Foto kryesore"
                        className="aspect-square w-full rounded-xl"
                        focus={getImageFocus(extracted.image_focus_json, selectedImportImage)}
                        onChange={updateImportImageFocus}
                        onError={e => e.currentTarget.style.display='none'}
                      />
                    </div>
                    <ImageFocusControls
                      value={getImageFocus(extracted.image_focus_json, selectedImportImage)}
                      onChange={updateImportImageFocus}
                    />
                    <div className="grid grid-cols-3 gap-2">
                      {extracted.image_urls.slice(0, 6).map((imgUrl, i) => {
                        const selected = Number(extracted.main_image_index || 0) === i;
                        const focus = getImageFocus(extracted.image_focus_json, imgUrl);
                        return (
                          <div
                            key={`${imgUrl}-${i}`}
                            draggable
                            onDragStart={(event) => event.dataTransfer.setData("text/plain", String(i))}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={(event) => {
                              event.preventDefault();
                              const fromIndex = Number(event.dataTransfer.getData("text/plain"));
                              reorderImages(fromIndex, i);
                            }}
                            className={`relative cursor-grab overflow-hidden rounded-lg border ${selected ? "border-[#9bffd6]" : "border-white/10"} active:cursor-grabbing`}
                            title="Tërhiqe për ta riorganizuar"
                          >
                            <img src={imgUrl} alt="" className="h-16 w-full object-cover" style={getImageFocusStyle(focus)} onError={e => e.currentTarget.style.display='none'} />
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
                <p className="text-xs text-white/40">
                  Maksimumi i ngarkimit është 6 foto. Fotoja me yll shfaqet si kryesore dhe thumbnail në Pazar.
                </p>
                <div>
                  <label className="text-white/40 text-xs">Titulli</label>
                  <input value={extracted.title || ""} onChange={e => setExtracted({...extracted, title: e.target.value})}
                    className="w-full bg-[#1c2333] border border-white/15 rounded-xl px-3 py-2 text-white text-sm outline-none mt-1" />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-white/40 text-xs">Kategoria e Pazarit</label>
                    <select
                      value={extracted.pazar_category || category}
                      onChange={(e) => {
                        setCategory(e.target.value);
                        setSubcategory("");
                        setExtracted({ ...extracted, pazar_category: e.target.value, pazar_subcategory: "" });
                      }}
                      className="mt-1 w-full rounded-xl border border-white/15 bg-[#1c2333] px-3 py-2 text-sm text-white outline-none"
                    >
                      {CATEGORIES.filter(c => c.key !== "all").map(c => (
                        <option key={c.key} value={c.key}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-white/40 text-xs">Nënkategoria</label>
                    <select
                      value={extracted.pazar_subcategory || subcategory}
                      onChange={(e) => {
                        setSubcategory(e.target.value);
                        setExtracted({ ...extracted, pazar_subcategory: e.target.value });
                      }}
                      className="mt-1 w-full rounded-xl border border-white/15 bg-[#1c2333] px-3 py-2 text-sm text-white outline-none disabled:opacity-50"
                      disabled={!findPazarCategory(extracted.pazar_category || category)?.subcategories?.length}
                    >
                      <option value="">Zgjidh...</option>
                      {(findPazarCategory(extracted.pazar_category || category)?.subcategories || []).map((sub) => (
                        <option key={sub.value} value={sub.value}>{sub.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-white/40 text-xs">Çmimi</label>
                  <input value={extracted.salary_info || ""} onChange={e => setExtracted({...extracted, salary_info: e.target.value})}
                    className="w-full bg-[#1c2333] border border-white/15 rounded-xl px-3 py-2 text-white text-sm outline-none mt-1" placeholder="Çmimi..." />
                </div>
                <div className="space-y-2">
                  <label className="text-white/40 text-xs">Vendndodhja</label>
                  <LocationPicker
                    value={{
                      address: extracted.address || extracted.city || "",
                      country: extracted.country || "",
                      zone: extracted.region || extracted.zone || "",
                      city: extracted.city || "",
                      location_precision: extracted.location_precision || "sakte",
                    }}
                    onChange={(loc) => setExtracted({
                      ...extracted,
                      address: loc.address,
                      country: loc.country,
                      region: loc.zone || "",
                      zone: loc.zone || "",
                      city: loc.city,
                      location_precision: loc.location_precision,
                    })}
                  />
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
  return typeof document !== "undefined" ? createPortal(modal, document.body) : null;
}

/* ─── MAIN PAGE ─── */
export default function Pazar() {
  const initialParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const [activeCategory, setActiveCategory] = useState(initialParams?.get("category") || "all");
  const [activeSubcategory, setActiveSubcategory] = useState(initialParams?.get("sub") || "");
  const [search, setSearch] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [user, setUser] = useState(null);
  const canImportPosts = user?.role === "admin" || user?.role === "moderator";
  const activeCategoryData = CATEGORIES.find((item) => item.key === activeCategory);

  const updatePazarUrl = (categoryKey, subcategoryKey = "") => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams();
    if (categoryKey && categoryKey !== "all") params.set("category", categoryKey);
    if (subcategoryKey) params.set("sub", subcategoryKey);
    const nextUrl = params.toString() ? `/Pazar?${params.toString()}` : "/Pazar";
    window.history.replaceState(null, "", nextUrl);
  };

  const selectCategory = (categoryKey) => {
    setActiveCategory(categoryKey);
    setActiveSubcategory("");
    updatePazarUrl(categoryKey);
  };

  const selectSubcategory = (categoryKey, subcategoryKey) => {
    setActiveCategory(categoryKey);
    setActiveSubcategory(subcategoryKey);
    updatePazarUrl(categoryKey, subcategoryKey);
  };

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
    return filterActivePosts(jobs).filter(j => {
      // Shfaq: njoftime me category="pazar" OSE me pazar_category OSE prona shitje/qera
      const isPazar = j.category === "pazar" || !!j.pazar_category;
      const isPronaForSaleOrRent = j.category === "prona" && (j.property_deal_type === "shitje" || j.property_deal_type === "qera");

      if (!isPazar && !isPronaForSaleOrRent) return false;

      // Filter by active category
      if (activeCategory !== "all") {
        const pazarCat = j.pazar_category || "";
        const matchesPazarCat = pazarCategoryMatches(pazarCat, activeCategory);
        const matchesMainCat = j.category === activeCategory;
        if (!matchesPazarCat && !matchesMainCat) return false;
      }

      if (activeSubcategory && j.pazar_subcategory !== activeSubcategory) {
        return false;
      }

      // Search filter
      if (search) {
        const q = search.toLowerCase();
        if (!`${j.title} ${j.description || ""} ${j.city || ""}`.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [jobs, activeCategory, activeSubcategory, search]);

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
            <div key={cat.key} className="mb-0.5">
              <button onClick={() => selectCategory(cat.key)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all w-full text-left
                  ${activeCategory === cat.key ? "bg-[#8ab4ff]/15 text-[#8ab4ff]" : "text-white/60 hover:bg-white/5 hover:text-white"}`}>
                <cat.icon className="w-5 h-5 shrink-0" />
                {cat.label}
              </button>
              {activeCategory === cat.key && cat.subcategories?.length > 0 && (
                <div className="ml-8 mt-1 space-y-1 border-l border-white/10 pl-2">
                  {cat.subcategories.map((sub) => (
                    <button
                      key={sub.value}
                      onClick={() => selectSubcategory(cat.key, sub.value)}
                      className={`block w-full rounded-lg px-2 py-1.5 text-left text-xs transition-all ${
                        activeSubcategory === sub.value ? "bg-[#9bffd6]/15 text-[#9bffd6]" : "text-white/45 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
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
              <button key={cat.key} onClick={() => selectCategory(cat.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all
                  ${activeCategory === cat.key ? "bg-[#8ab4ff] text-[#0b1020]" : "bg-white/8 text-white/60 hover:bg-white/15"}`}>
                <cat.icon className="w-3.5 h-3.5" />
                {cat.label}
              </button>
            ))}
          </div>
          {activeCategoryData?.subcategories?.length > 0 && (
            <div className="md:hidden flex gap-2 overflow-x-auto px-4 pb-3 [&::-webkit-scrollbar]:hidden border-b border-white/8"
              style={{ touchAction: 'pan-x', WebkitOverflowScrolling: 'touch' }}>
              {activeCategoryData.subcategories.map((sub) => (
                <button
                  key={sub.value}
                  onClick={() => selectSubcategory(activeCategory, sub.value)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                    activeSubcategory === sub.value ? "bg-[#9bffd6] text-[#0b1020]" : "bg-white/8 text-white/55 hover:bg-white/15"
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>
          )}

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
                {filtered.map(job => <ListingCard key={job.id} job={job} user={user} onChanged={refetch} />)}
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
