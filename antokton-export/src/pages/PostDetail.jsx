import React, { useState, useEffect } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { MapPin, Clock, MessageCircle, Send, ArrowLeft, Phone, Briefcase, Flag, Share2, Copy, Users as UsersIcon, X, Pencil, Check, MoreVertical, ExternalLink, Link2, Eye, Upload, Star } from "lucide-react";
import LocationPicker from "../components/job/LocationPicker";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import moment from "moment";
import { motion, AnimatePresence } from "framer-motion";
import ApplicationForm from "../components/job/ApplicationForm";
import CommentItem from "../components/job/CommentItem";
import { PHONE_PLACEHOLDER, getInternationalPhoneError, isValidInternationalPhone, normalizeInternationalPhone, normalizePhoneForCountry } from "@/lib/phone";
import UserAvatar from "@/components/ui/UserAvatar";
import { hasEarlyMemberPremiumAccess, hasPremiumAccess } from "@/utils/premiumAccess";
import { getUserDisplayName, isStaffUser } from "@/lib/userDisplay";
import { requireCompleteProfileForInteraction } from "@/lib/profileCompleteness";
import ImageFocusControls from "@/components/media/ImageFocusControls";
import ImageFocusPreview from "@/components/media/ImageFocusPreview";
import { getImageFocus, getImageFocusStyle, pruneImageFocusMap, reorderImageGallery, updateImageFocus } from "@/lib/imageFocus";
import { PAZAR_CATEGORIES, cleanPazarLabel, findPazarCategory } from "@/lib/pazarCategories";

function SimilarPosts({ currentJobId, category }) {
  const { data: similarJobs = [] } = useQuery({
    queryKey: ['similar-jobs', category, currentJobId],
    queryFn: async () => {
      const jobs = await base44.entities.Job.filter({ 
        status: "approved",
        category: category 
      }, "-created_date", 50);
      return jobs.filter(j => j.id !== currentJobId).slice(0, 4);
    },
    enabled: !!category && !!currentJobId
  });

  if (similarJobs.length === 0) return null;

  return (
    <div className="mt-8 pt-8 border-t border-white/10">
      <h2 className="text-xl font-bold text-white mb-4">Postime të Ngjashme</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {similarJobs.map(job => (
          <a
            key={job.id}
            href={createPageUrl("PostDetail") + `?id=${job.id}`}
            className="block p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/8 transition-all group"
          >
            <h3 className="text-white font-semibold text-sm group-hover:text-[#8ab4ff] transition-colors mb-2 line-clamp-2">
              {job.title}
            </h3>
            <div className="flex items-center gap-2 text-xs text-white mb-2">
              <MapPin className="w-3 h-3" />
              {formatLocationParts(job.city, job.country)}
            </div>
            <p className="text-white text-xs line-clamp-2">{job.description}</p>
          </a>
        ))}
      </div>
    </div>
  );
}

// Opsionet e raportimit sipas kategorisë
const getReportReasons = (category) => {
  const base = [
    { value: "inappropriate", label: "Përmbajtje e papërshtatshme" },
    { value: "fake", label: "Mashtrim / njoftim i rremë" },
    { value: "offensive", label: "Gjuhë fyese" },
    { value: "spam", label: "Spam" },
    { value: "other", label: "Tjetër" },
  ];
  if (category === "prona" || category === "pazar") {
    return [
      { value: "i_shitur", label: "✅ Është shitur / Nuk është më në dispozicion" },
      { value: "cmim_i_ndryshuar", label: "💰 Çmimi është ndryshuar" },
      ...base,
    ];
  }
  if (category === "pune") {
    return [
      { value: "vend_i_plotesuar", label: "✅ Vendi i punës është plotësuar tashmë" },
      { value: "nuk_jepet_me", label: "🚪 Pozicioni nuk ofrohet më" },
      ...base,
    ];
  }
  if (category === "sherbime") {
    return [
      { value: "nuk_jepet_me", label: "🚪 Shërbimi nuk ofrohet më" },
      { value: "cmim_i_ndryshuar", label: "💰 Çmimi është ndryshuar" },
      ...base,
    ];
  }
  return base;
};

const reportReasonLabel = (value) => {
  const all = [
    { value: "i_shitur", label: "I shitur / Nuk është më" },
    { value: "vend_i_plotesuar", label: "Vend i plotësuar" },
    { value: "nuk_jepet_me", label: "Nuk ofrohet më" },
    { value: "cmim_i_ndryshuar", label: "Çmimi ndryshoi" },
    { value: "inappropriate", label: "Përmbajtje e papërshtatshme" },
    { value: "spam", label: "Spam" },
    { value: "fake", label: "Rremë/Mashtrim" },
    { value: "offensive", label: "Ofensiv" },
    { value: "other", label: "Tjetër" },
  ];
  return all.find(r => r.value === value)?.label || value;
};

const formatViewText = (count) => `${count} ${Number(count) === 1 ? "shikim" : "shikime"}`;
const formatLocationParts = (...parts) => {
  const seen = new Set();
  return parts
    .flatMap((part) => String(part || "").split(","))
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => {
      const key = part.toLocaleLowerCase("sq");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(", ");
};
const profileDisplayName = (profile = {}, fallbackEmail = "") => (
  [profile.first_name, profile.surname].filter(Boolean).join(" ").trim()
  || profile.full_name
  || profile.display_name
  || profile.public_name
  || fallbackEmail.split("@")[0]
  || "Aplikues"
);

const categoryLabels = {
  pune: "Punë", shtepi: "Shtëpi", juridike: "Juridike",
  edukim: "Edukim", bamiresi: "Bamirësi", media: "Media", sherbime: "Shërbime"
};

export default function PostDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const jobId = urlParams.get("id");
  const shouldAutoEdit = urlParams.get("edit") === "1";
  const rawBackTo = urlParams.get("from") || "";
  const backTo = (() => {
    try {
      const decoded = decodeURIComponent(rawBackTo);
      if (decoded.startsWith("/") && !decoded.startsWith("//") && !decoded.includes("://")) return decoded;
    } catch {
      // Fall back to Feed below.
    }
    return createPageUrl("Feed");
  })();

  const [user, setUser] = useState(null);
  const [isAuth, setIsAuth] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [userReaction, setUserReaction] = useState(null);
  const [showApplicationForm, setShowApplicationForm] = useState(false);

  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [showPostReactionPicker, setShowPostReactionPicker] = useState(false);
  const [showQuickApply, setShowQuickApply] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [quickApplyForm, setQuickApplyForm] = useState({ email: "", phone: "", message: "" });
  const [quickApplyCvFile, setQuickApplyCvFile] = useState(null);
  const [reportForm, setReportForm] = useState({ reason: "", details: "", reporter_name: "", reporter_contact: "" });
  const [reportReasons, setReportReasons] = useState([]);
  const [timeLeft, setTimeLeft] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [showComments, setShowComments] = useState(false);
  const [staffProfileNotice, setStaffProfileNotice] = useState("");
  const [photoViewerUrl, setPhotoViewerUrl] = useState("");
  const viewTrackedRef = React.useRef(null);

  const queryClient = useQueryClient();
  const canSeePrivateImportFields = user?.role === "admin" || user?.role === "moderator";
  const premiumAccess = hasPremiumAccess(user, hasActiveSubscription);
  const photoViewerFocus = photoViewerUrl ? getImageFocus(job?.image_focus_json, photoViewerUrl) : null;

  useEffect(() => {
    if (!photoViewerUrl) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setPhotoViewerUrl("");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [photoViewerUrl]);

  useEffect(() => {
    const checkAuth = async () => {
      const authenticated = await base44.auth.isAuthenticated();
      setIsAuth(authenticated);
      if (authenticated) {
        const me = await base44.auth.me();
        setUser(me);
        setQuickApplyForm((prev) => ({ ...prev, email: prev.email || me.email || "" }));
        
        // Check for active subscription
        const subscriptions = await base44.entities.PremiumSubscription.filter({
          user_email: me.email,
          is_active: true
        });
        
        const now = new Date();
        const hasActive = subscriptions.some(sub => new Date(sub.end_date) > now);
        setHasActiveSubscription(hasActive);
      }
    };
    checkAuth();
  }, []);

  const { data: job, isLoading } = useQuery({
    queryKey: ["job", jobId, user?.role],
    queryFn: async () => {
      if (!jobId) return null;
      const result = await base44.entities.Job.filter({ id: jobId });
      return result[0] || null;
    },
    enabled: !!jobId,
  });

  useEffect(() => {
    if (!job?.id || viewTrackedRef.current === job.id) return;
    viewTrackedRef.current = job.id;
    let cancelled = false;
    base44.postViews.record(job.id)
      .then((stats) => {
        if (cancelled || typeof stats?.view_count !== "number") return;
        queryClient.setQueryData(["job", jobId, user?.role], (current) => (
          current ? { ...current, ...stats } : current
        ));
      })
      .catch((error) => {
        console.warn("Post view was not recorded", error);
      });
    return () => { cancelled = true; };
  }, [job?.id, jobId, queryClient, user?.role]);

  const { data: comments = [] } = useQuery({
    queryKey: ["comments", jobId],
    queryFn: () => base44.entities.JobComment.filter({ job_id: jobId }, "-created_date", 100),
    enabled: !!jobId,
    staleTime: 30 * 1000,
  });

  const { data: reactions = [] } = useQuery({
    queryKey: ["reactions", jobId],
    queryFn: () => base44.entities.JobReaction.filter({ job_id: jobId }),
    enabled: !!jobId,
  });

  const { data: commentLikes = [] } = useQuery({
    queryKey: ["commentLikes", jobId],
    queryFn: () => base44.entities.CommentLike.list(),
    enabled: !!jobId,
  });

  const { data: commentReports = [] } = useQuery({
    queryKey: ["commentReports", jobId],
    queryFn: () => base44.entities.CommentReport.filter({ status: "pending" }),
    enabled: !!jobId && (user?.role === "admin" || user?.role === "moderator"),
  });

  const { data: applications = [] } = useQuery({
    queryKey: ["jobApplications", jobId],
    queryFn: () => base44.entities.JobApplication.filter({ job_id: jobId }),
    enabled: !!jobId
  });

  useEffect(() => {
    if (user && reactions.length > 0) {
      const myReaction = reactions.find(r => r.user_email === user.email);
      if (myReaction) setUserReaction(myReaction.reaction_type);
    }
  }, [reactions, user]);

  useEffect(() => {
    if (!job?.deadline) return;
    
    const calculateTimeLeft = () => {
      const now = new Date();
      const deadline = new Date(job.deadline);
      const diff = deadline - now;
      
      if (diff <= 0) {
        setTimeLeft({ expired: true });
        return;
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      setTimeLeft({ days, hours, isUrgent: days < 3 });
    };
    
    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [job?.deadline]);

  const commentMutation = useMutation({
    mutationFn: async () => {
      if (!requireCompleteProfileForInteraction(user, "koment")) return;
      // Check comment limit for non-subscribed users
      if (!premiumAccess && user.subscription_type === "none") {
        const userComments = comments.filter(c => c.created_by === user.email);
        if (userComments.length >= 2) {
          throw new Error("Anëtarët e pa-abonuar mund të lënë maksimum 2 komente për njoftim.");
        }
      }

      const displayName = user?.first_name && user?.surname 
        ? `${user.first_name} ${user.surname}`
        : user?.first_name || user?.full_name || user?.email?.split('@')[0] || "Anonim";
      
      await base44.entities.JobComment.create({
        job_id: jobId,
        text: commentText,
        author_name: displayName,
      });
      await base44.entities.Job.update(jobId, {
        comments_count: (job?.comments_count || 0) + 1,
      });
    },
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: ["comments", jobId] });
      queryClient.invalidateQueries({ queryKey: ["job", jobId] });
    },
    onError: (error) => {
      alert(error.message);
    },
  });

  const reactionMutation = useMutation({
    mutationFn: async (type) => {
      const existingReaction = reactions.find(r => r.user_email === user?.email);
      
      if (existingReaction) {
        if (existingReaction.reaction_type === type) return;
        await base44.entities.JobReaction.update(existingReaction.id, { reaction_type: type });
      } else {
        await base44.entities.JobReaction.create({
          job_id: jobId,
          reaction_type: type,
          user_email: user?.email,
        });
      }

      const allReactions = await base44.entities.JobReaction.filter({ job_id: jobId });
      const likes = allReactions.filter(r => r.reaction_type === "like").length;
      const dislikes = allReactions.filter(r => r.reaction_type === "dislike").length;
      await base44.entities.Job.update(jobId, { likes_count: likes, dislikes_count: dislikes });
    },
    onMutate: async (type) => {
      await queryClient.cancelQueries({ queryKey: ["reactions", jobId] });
      await queryClient.cancelQueries({ queryKey: ["job", jobId] });
      
      const previousJob = queryClient.getQueryData(["job", jobId]);
      const updatedJob = {
        ...previousJob,
        likes_count: type === "like" ? (previousJob.likes_count || 0) + 1 : previousJob.likes_count,
        dislikes_count: type === "dislike" ? (previousJob.dislikes_count || 0) + 1 : previousJob.dislikes_count,
      };
      
      queryClient.setQueryData(["job", jobId], updatedJob);
      
      return { previousJob };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reactions", jobId] });
      queryClient.invalidateQueries({ queryKey: ["job", jobId] });
    },
    onError: (_err, _newData, context) => {
      if (context?.previousJob) {
        queryClient.setQueryData(["job", jobId], context.previousJob);
      }
    },
  });

  const handleReaction = (type) => {
    if (!isAuth) {
      base44.auth.redirectToLogin();
      return;
    }
    setUserReaction(type);
    reactionMutation.mutate(type);
  };



  const quickApplyMutation = useMutation({
    mutationFn: async () => {
      if (!isValidInternationalPhone(quickApplyForm.phone)) {
        alert(getInternationalPhoneError("Telefoni"));
        throw new Error("invalid_phone");
      }
      let cvUrl = "";
      if (quickApplyCvFile) {
        const { data } = await base44.integrations.Core.UploadFile({ file: quickApplyCvFile });
        cvUrl = data.file_url || "";
      }
      const applicantEmail = isAuth && user?.email ? user.email : quickApplyForm.email;
      const applicantName = profileDisplayName(user || {}, applicantEmail);
      await base44.entities.JobApplication.create({
        job_id: jobId,
        applicant_name: applicantName,
        applicant_email: applicantEmail,
        applicant_phone: normalizeInternationalPhone(quickApplyForm.phone),
        cover_letter: quickApplyForm.message,
        cv_url: cvUrl,
        status: "applied"
      });
      
      // Send notification to job poster
      if (job?.created_by) {
        await base44.entities.Notification.create({
          user_email: job.created_by,
          type: "application",
          title: "Aplikim i Ri",
          message: `Keni një aplikim të ri nga ${applicantName}`,
          link: createPageUrl("EmployerDashboard"),
          related_id: jobId
        });
      }
    },
    onSuccess: () => {
      setShowQuickApply(false);
      setQuickApplyForm({ email: user?.email || "", phone: "", message: "" });
      setQuickApplyCvFile(null);
      queryClient.invalidateQueries({ queryKey: ["jobApplications", jobId] });
      alert("Aplikimi juaj u dërgua me sukses!");
    },
    onError: (error) => {
      if (error?.message === "invalid_phone") return;
      alert("Gabim gjatë dërgimit të aplikimit. Ju lutem provoni përsëri.");
    },
  });

  const deleteJobMutation = useMutation({
    mutationFn: async () => {
      // Ruaj historikun para fshirjes
      const logData = {
        entity_id: jobId,
        entity_type: "job",
        entity_title: job?.title || "",
        action_type: "delete",
        performed_by: user?.email || "unknown",
        previous_status: job?.status || "approved",
        new_status: "deleted",
        reason: user?.email === job?.created_by ? "Fshirë nga autori" : "Fshirë nga moderatori/admini",
      };

      // AdminAction - i dukshëm për admin/moderatorë
      await base44.entities.AdminAction.create(logData);

      // UserActivity - i dukshëm për postuesin (autorin)
      await base44.entities.UserActivity.create({
        user_email: job?.created_by || user?.email,
        activity_type: "job_delete",
        related_job_id: jobId,
        metadata: {
          job_title: job?.title || "",
          deleted_by: user?.email,
          deleted_by_role: user?.role || "user",
          category: job?.category || "",
        }
      });

      await base44.entities.Job.delete(jobId);
    },
    onSuccess: () => {
      window.location.href = backTo;
    }
  });

  const handleDeleteJob = () => {
    setShowDeleteModal(true);
  };

  const startEditJob = () => {
    const editImages = (Array.isArray(job.image_urls) && job.image_urls.length > 0
      ? job.image_urls
      : job.image_url
        ? [job.image_url]
        : []
    ).filter(Boolean).slice(0, 6);
    const editMainImageIndex = Math.min(
      Math.max(Number.parseInt(job.main_image_index, 10) || 0, 0),
      Math.max(editImages.length - 1, 0)
    );
    setEditForm({
      title: job.title,
      description: job.description,
      contact_info: job.contact_info || '',
      phone_number: job.phone_number || '',
      phone_app: job.phone_app || 'telefon',
      salary_info: job.salary_info || '',
      address: job.address || [job.city, job.country].filter(Boolean).join(", ") || '',
      city: job.city || '',
      zone: job.zone || '',
      country: job.country || '',
      location_precision: job.location_precision || 'sakte',
      category: job.category || '',
      pazar_category: job.pazar_category || '',
      pazar_subcategory: job.pazar_subcategory || '',
      poster_name: job.poster_name || '',
      source_url: job.source_url || '',
      show_source_url: Boolean(job.show_source_url),
      author_profile_url: job.author_profile_url || '',
      import_author_profile_url: job.import_author_profile_url || job.author_profile_url || '',
      show_author_profile_url: Boolean(job.show_author_profile_url),
      image_urls: editImages,
      main_image_index: editMainImageIndex,
      image_url: editImages[editMainImageIndex] || job.image_url || '',
      image_focus_json: pruneImageFocusMap(job.image_focus_json, editImages)
    });
    setIsEditing(true);
  };

  useEffect(() => {
    const canAutoEdit = shouldAutoEdit && job && isAuth && (user?.role === "admin" || user?.role === "moderator" || user?.email === job?.created_by);
    if (canAutoEdit && !isEditing) startEditJob();
  }, [shouldAutoEdit, job?.id, isAuth, user?.role, user?.email, isEditing]);

  const setEditMainImage = (index) => {
    setEditForm((current) => {
      const images = Array.isArray(current.image_urls) ? current.image_urls : [];
      return {
        ...current,
        main_image_index: index,
        image_url: images[index] || ""
      };
    });
  };

  const removeEditImage = (index) => {
    setEditForm((current) => {
      const images = (Array.isArray(current.image_urls) ? current.image_urls : []).filter((_, i) => i !== index);
      const mainImageIndex = Math.min(Number(current.main_image_index || 0), Math.max(images.length - 1, 0));
      return {
        ...current,
        image_urls: images,
        main_image_index: mainImageIndex,
        image_url: images[mainImageIndex] || "",
        image_focus_json: pruneImageFocusMap(current.image_focus_json, images)
      };
    });
  };

  const reorderEditImages = (fromIndex, toIndex) => {
    setEditForm((current) => ({
      ...current,
      ...reorderImageGallery(current.image_urls, fromIndex, toIndex, current.main_image_index),
    }));
  };

  const handleEditImageUpload = async (event) => {
    const currentImages = Array.isArray(editForm.image_urls) ? editForm.image_urls : [];
    const slots = Math.max(0, 6 - currentImages.length);
    const files = Array.from(event.target.files || []).slice(0, slots);
    event.target.value = "";
    if (!files.length) return;

    try {
      const uploads = await Promise.all(files.map((file) => base44.integrations.Core.UploadFile({ file })));
      const nextImages = [...currentImages, ...uploads.map((item) => item?.file_url).filter(Boolean)].slice(0, 6);
      const mainImageIndex = Math.min(Number(editForm.main_image_index || 0), Math.max(nextImages.length - 1, 0));
      setEditForm((current) => ({
        ...current,
        image_urls: nextImages,
        main_image_index: mainImageIndex,
        image_url: nextImages[mainImageIndex] || ""
      }));
    } catch (error) {
      alert(error?.message || "Fotot nuk u ngarkuan. Provo përsëri.");
    }
  };

  const selectedEditImage = (editForm.image_urls || [])[Math.min(Number(editForm.main_image_index || 0), Math.max((editForm.image_urls || []).length - 1, 0))] || "";

  const updateEditImageFocus = (focus) => {
    if (!selectedEditImage) return;
    setEditForm((current) => ({
      ...current,
      image_focus_json: updateImageFocus(current.image_focus_json, selectedEditImage, focus),
    }));
  };

  const editJobMutation = useMutation({
    mutationFn: async () => {
      const phoneNumber = normalizePhoneForCountry(
        editForm.phone_number,
        editForm.country,
        `${editForm.city || ""} ${editForm.address || ""} ${editForm.description || ""}`
      );
      if (phoneNumber && !isValidInternationalPhone(phoneNumber)) {
        throw new Error(getInternationalPhoneError("Numri i telefonit"));
      }
      const editImages = (Array.isArray(editForm.image_urls) ? editForm.image_urls : editForm.image_url ? [editForm.image_url] : [])
        .map((item) => String(item || "").trim())
        .filter(Boolean)
        .slice(0, 6);
      const editMainImageIndex = Math.min(
        Math.max(Number.parseInt(editForm.main_image_index, 10) || 0, 0),
        Math.max(editImages.length - 1, 0)
      );
      const imageFocus = pruneImageFocusMap(editForm.image_focus_json, editImages);
      const updatePayload = {
        ...editForm,
        address: editForm.address || editForm.city || "",
        phone_number: phoneNumber || "",
        phone_app: phoneNumber ? (editForm.phone_app || "telefon") : "",
        category: editForm.category,
        pazar_category: editForm.pazar_category || undefined,
        pazar_subcategory: editForm.pazar_subcategory || undefined,
        poster_name: editForm.poster_name || job.poster_name,
        author_profile_url: editForm.author_profile_url || "",
        import_author_profile_url: editForm.import_author_profile_url || editForm.author_profile_url || "",
        show_author_profile_url: editForm.show_author_profile_url === true,
        image_urls: editImages,
        main_image_index: editMainImageIndex,
        image_url: editImages[editMainImageIndex] || "",
        image_focus_json: imageFocus,
      };
      const updatedJob = await base44.entities.Job.update(jobId, updatePayload);
      return { ...(job || {}), ...updatePayload, ...(updatedJob || {}) };
    },
    onSuccess: (updatedJob) => {
      if (updatedJob) {
        queryClient.setQueryData(["job", jobId, user?.role], updatedJob);
      }
      const cleanUrl = `${window.location.pathname}?id=${encodeURIComponent(jobId)}${rawBackTo ? `&from=${encodeURIComponent(rawBackTo)}` : ""}`;
      window.history.replaceState(null, "", cleanUrl);
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["job", jobId] });
    },
    onError: (error) => {
      alert(error.message || "Gabim në ruajtje");
    }
  });

  const { data: posterProfile } = useQuery({
    queryKey: ["jobPosterProfile", job?.created_by],
    queryFn: async () => {
      const users = await base44.entities.User.filter({ email: job.created_by }, "-created_date", 1);
      return users[0] || null;
    },
    enabled: !!job?.created_by,
    staleTime: 5 * 60 * 1000,
  });

  const reportPostMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Report.create({
        post_id: jobId,
        reported_entity: "Job",
        reported_entity_id: jobId,
        reported_user_email: job?.created_by || job?.author_email || "",
        post_title: job?.title || "",
        post_category: job?.category || "",
        reporter_id: user?.id || "",
        reporter_email: user?.email || "",
        reporter_name: user?.full_name || reportForm.reporter_name || "",
        reporter_contact: user?.email || reportForm.reporter_contact || "",
        reason: reportForm.reason,
        description: (reportForm.details || "").replace(/<[^>]*>/g, "").trim().slice(0, 2000),
        details: (reportForm.details || "").replace(/<[^>]*>/g, "").trim().slice(0, 2000),
        status: "new"
      });
      // Dërgo notifikim tek të gjithë adminët/moderatorët
      const staffUsers = await base44.entities.User.list();
      const staff = staffUsers.filter(u => u.role === "admin" || u.role === "moderator");
      await Promise.all(staff.map(s =>
        base44.entities.Notification.create({
          user_email: s.email,
          type: "system",
          title: "Raportim i ri",
          message: `"${job?.title || "Njoftim"}" u raportua si: ${reportReasonLabel(reportForm.reason)}`,
          link: `/Admin?section=reports`,
          related_id: jobId
        })
      ));
    },
    onSuccess: () => {
      setShowReportModal(false);
      setReportForm({ reason: "", details: "", reporter_name: "", reporter_contact: "" });
      alert("Raportimi u dërgua tek stafi. Faleminderit!");
    }
  });

  const handleShare = (platform) => {
    const url = window.location.href;
    const text = `${job.title} - Antokton`;
    
    const urls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
    };
    
    if (platform === 'copy') {
      navigator.clipboard.writeText(url);
      alert('Linku u kopjua!');
    } else {
      window.open(urls[platform], '_blank', 'width=600,height=400');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!job || !jobId) {
    window.location.href = backTo;
    return null;
  }

  return (
    <div className="mx-auto max-w-3xl overflow-x-hidden px-4 py-8 sm:px-6">
      {/* Back */}
      <Link
        to={backTo}
        className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Kthehu
      </Link>

      {/* Post Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-full overflow-hidden rounded-2xl border border-white/10"
        style={{ background: 'rgba(255, 255, 255, 0.06)' }}
      >
        <div className="p-6 sm:p-8">
          <div className="flex min-w-0 items-center justify-between gap-3 mb-4">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">
                {categoryLabels[job.category] || job.category}
              </Badge>
              {job.profession && (
                <Badge variant="outline" className="text-xs border-white/20 text-white/60">
                  <Briefcase className="w-3 h-3 mr-1" />
                  {job.profession}
                </Badge>
              )}
            </div>
            {/* 3-dot menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-white/40 hover:text-white hover:bg-white/10 w-8 h-8 p-0">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#0b1020] border-white/10 w-48">
                {isAuth && (user?.role === 'admin' || user?.role === 'moderator' || user?.email === job?.created_by) && !isEditing && (
                  <>
                    <DropdownMenuItem onClick={startEditJob} className="text-[#8ab4ff] hover:text-[#8ab4ff] cursor-pointer">
                      <Pencil className="w-4 h-4 mr-2" />
                      Përpuno
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDeleteJob} className="text-red-400 hover:text-red-300 cursor-pointer">
                      <X className="w-4 h-4 mr-2" />
                      {deleteJobMutation.isPending ? "Duke fshirë..." : "Fshi"}
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem
                  onClick={() => {
                    const reasons = getReportReasons(job?.category);
                    setReportReasons(reasons);
                    setReportForm({ reason: reasons[0]?.value || "spam", details: "", reporter_name: "", reporter_contact: "" });
                    setShowReportModal(true);
                  }}
                  className="text-red-400 hover:text-red-300 cursor-pointer"
                >
                  <Flag className="w-4 h-4 mr-2" />
                  Raporto Njoftimin
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Edit Form */}
          {isEditing && (
            <div className="mb-6 p-4 rounded-xl border border-[#8ab4ff]/40 bg-[#8ab4ff]/5 space-y-3">
              <p className="text-[#8ab4ff] text-xs font-semibold uppercase tracking-wider">Përpuno Njoftimin</p>
              <div className="space-y-1">
                <Label className="text-white/60 text-xs">Titulli</Label>
                <Input value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} className="bg-white/5 border-white/10 text-white" />
              </div>
              <div className="space-y-1">
                <Label className="text-white/60 text-xs">Përshkrimi</Label>
                <Textarea value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} className="bg-white/5 border-white/10 text-white min-h-[120px]" />
              </div>
              <div className="space-y-1">
              <Label className="text-white/60 text-xs">Numri i telefonit</Label>
               <div className="flex gap-2">
                 <Input value={editForm.phone_number || ''} onChange={e => setEditForm({...editForm, phone_number: e.target.value})} placeholder={PHONE_PLACEHOLDER} className="bg-white/5 border-white/10 text-white flex-1 min-w-0" />
                 {(() => {
                   const editPhoneIcons = {
                     telefon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-white/70"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.73 9.5a19.79 19.79 0 01-3.07-8.67A2 2 0 012.64 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.59a16 16 0 006.29 6.29l.96-.96a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>,
                     whatsapp: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-[#25D366]"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>,
                     viber: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-[#7360F2]"><path d="M11.4 0C5.5.3.3 5.2.3 11.1c0 2.2.6 4.3 1.8 6.1L.3 24l6.9-1.8c1.7 1 3.6 1.5 5.6 1.5h.1c5.8 0 10.8-4.7 11.1-10.5C24.2 7 20.3 2.5 15.2.6 14 .2 12.7 0 11.4 0zm4.1 16.9c-.3.8-1.5 1.5-2.1 1.6-.5.1-1.2.1-1.9-.1-.4-.1-1-.3-1.7-.6-3-1.3-5-4.3-5.1-4.5-.1-.2-1.2-1.6-1.2-3s.7-2.1 1-2.4c.2-.3.5-.4.7-.4h.5c.2 0 .4 0 .5.4.2.4.7 1.7.8 1.8.1.1.1.3 0 .5-.1.1-.2.3-.3.4-.1.1-.3.3-.4.4-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.5 1.5.3.1.5.1.7-.1.2-.2.7-.8.9-1.1.2-.3.4-.2.7-.1.3.1 1.8.9 2.1 1 .3.2.5.3.6.4.1.2 0 .9-.4 1.5z"/></svg>,
                     telegram: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-[#2AABEE]"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.96 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>,
                     bip: <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4"><rect width="24" height="24" rx="6" fill="#1DA1F2"/><text x="3.5" y="16.5" fontSize="9" fill="white" fontWeight="bold" fontFamily="Arial">BiP</text></svg>,
                     signal: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-[#3A76F0]"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 4.5a7.5 7.5 0 110 15 7.5 7.5 0 010-15zm0 2a5.5 5.5 0 100 11 5.5 5.5 0 000-11zm0 2a3.5 3.5 0 110 7 3.5 3.5 0 010-7z"/></svg>,
                     tjeter: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-white/50"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18.01"/></svg>,
                   };
                   const apps = [{v:"telefon",l:"Telefon"},{v:"whatsapp",l:"WhatsApp"},{v:"viber",l:"Viber"},{v:"telegram",l:"Telegram"},{v:"bip",l:"BiP"},{v:"signal",l:"Signal"},{v:"tjeter",l:"Tjetër"}];
                   const cur = editForm.phone_app || 'telefon';
                   return (
                     <Select value={cur} onValueChange={v => setEditForm({...editForm, phone_app: v})}>
                       <SelectTrigger className="flex-shrink-0 w-[130px]" style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', color: '#ffffff' }}>
                         <div className="flex items-center gap-2">
                           {editPhoneIcons[cur]}
                           <span className="text-sm">{apps.find(a=>a.v===cur)?.l}</span>
                         </div>
                       </SelectTrigger>
                       <SelectContent style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)' }}>
                         {apps.map(a => (
                           <SelectItem key={a.v} value={a.v}>
                             <div className="flex items-center gap-2">{editPhoneIcons[a.v]}<span>{a.l}</span></div>
                           </SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                   );
                 })()}
               </div>
              </div>
              <div className="space-y-1">
                <Label className="text-white/60 text-xs">Email ose info tjetër kontakti (opsional)</Label>
                <Input value={editForm.contact_info} onChange={e => setEditForm({...editForm, contact_info: e.target.value})} className="bg-white/5 border-white/10 text-white" />
              </div>
              <div className="space-y-1">
                <Label className="text-white/60 text-xs">Linku i kontaktit nga burimi (opsional)</Label>
                <Input
                  value={editForm.author_profile_url || ''}
                  onChange={e => setEditForm({...editForm, author_profile_url: e.target.value, import_author_profile_url: e.target.value})}
                  placeholder="https://facebook.com/profile... ose link kontakti"
                  className="bg-white/5 border-white/10 text-white"
                />
                <label className="flex cursor-pointer items-start gap-2 text-xs text-white/50">
                  <input
                    type="checkbox"
                    checked={Boolean(editForm.show_author_profile_url)}
                    onChange={e => setEditForm({...editForm, show_author_profile_url: e.target.checked})}
                    className="mt-0.5 h-4 w-4 accent-[#8ab4ff]"
                  />
                  <span>Shfaq linkun e kontaktit publikisht. Pa zgjedhje ruhet vetëm për admin/moderator.</span>
                </label>
              </div>
              <div className="space-y-1">
                <Label className="text-white/60 text-xs">Linku i burimit / postimit origjinal (opsional)</Label>
                <Input value={editForm.source_url || ''} onChange={e => setEditForm({...editForm, source_url: e.target.value})} placeholder="https://..." className="bg-white/5 border-white/10 text-white" />
                <label className="flex cursor-pointer items-start gap-2 text-xs text-white/50">
                  <input
                    type="checkbox"
                    checked={Boolean(editForm.show_source_url)}
                    onChange={e => setEditForm({...editForm, show_source_url: e.target.checked})}
                    className="mt-0.5 h-4 w-4 accent-[#8ab4ff]"
                  />
                  <span>Shfaq linkun publikisht. Pa zgjedhje ruhet vetëm për gjurmim të postimit origjinal.</span>
                </label>
              </div>
              <div className="space-y-1">
                <Label className="text-white/60 text-xs">Kategoria</Label>
                <select value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value, ...(e.target.value !== "pazar" ? { pazar_category: "", pazar_subcategory: "" } : {})})}
                  className="w-full rounded-md px-3 py-2 text-sm text-white border border-white/10" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  {[{v:'pune',l:'Punë'},{v:'sherbime',l:'Shërbime'},{v:'pazar',l:'Pazar'},{v:'edukim',l:'Edukim'},{v:'bamiresi',l:'Bamirësi'},{v:'media',l:'Media'}].map(c => (
                    <option key={c.v} value={c.v} className="bg-[#0b1020]">{c.l}</option>
                  ))}
                </select>
              </div>
              {editForm.category === "pazar" && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-white/60 text-xs">Kategoria e Pazarit</Label>
                    <select
                      value={editForm.pazar_category || ""}
                      onChange={e => setEditForm({...editForm, pazar_category: e.target.value, pazar_subcategory: ""})}
                      className="w-full rounded-md border border-white/10 px-3 py-2 text-sm text-white"
                      style={{ background: 'rgba(255,255,255,0.05)' }}
                    >
                      <option value="" className="bg-[#0b1020]">Zgjidh...</option>
                      {PAZAR_CATEGORIES.map(c => (
                        <option key={c.value} value={c.value} className="bg-[#0b1020]">{cleanPazarLabel(c.label)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-white/60 text-xs">Nënkategoria</Label>
                    <select
                      value={editForm.pazar_subcategory || ""}
                      onChange={e => setEditForm({...editForm, pazar_subcategory: e.target.value})}
                      disabled={!findPazarCategory(editForm.pazar_category)?.subcategories?.length}
                      className="w-full rounded-md border border-white/10 px-3 py-2 text-sm text-white disabled:opacity-50"
                      style={{ background: 'rgba(255,255,255,0.05)' }}
                    >
                      <option value="" className="bg-[#0b1020]">Zgjidh...</option>
                      {(findPazarCategory(editForm.pazar_category)?.subcategories || []).map(sub => (
                        <option key={sub.value} value={sub.value} className="bg-[#0b1020]">{sub.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              <div className="space-y-1">
                <Label className="text-white/60 text-xs">Paga/Çmimi</Label>
                <Input value={editForm.salary_info} onChange={e => setEditForm({...editForm, salary_info: e.target.value})} className="bg-white/5 border-white/10 text-white" />
              </div>
              {(user?.role === 'admin' || user?.role === 'moderator') && (
                <div className="space-y-1 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
                  <Label className="text-amber-300 text-xs font-semibold">🛡️ Emri i Postuesit (Admin/Mod)</Label>
                  <Input value={editForm.poster_name || ''} onChange={e => setEditForm({...editForm, poster_name: e.target.value})} placeholder="Emri që shfaqet publikisht..." className="bg-white/5 border-white/10 text-white" />
                </div>
              )}
              {(editForm.category === "pazar" || (Array.isArray(editForm.image_urls) && editForm.image_urls.length > 0)) && (
                <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <Label className="text-white/70 text-xs font-semibold">Fotot për Pazar ({Math.min((editForm.image_urls || []).length, 6)}/6)</Label>
                    <span className="text-white/40 text-[11px]">Ylli cakton foton kryesore</span>
                  </div>
                  {(editForm.image_urls || []).length > 0 && (
                    <>
                      <div className="mx-auto max-w-md rounded-lg border border-white/10 bg-black/20">
                        <ImageFocusPreview
                          src={selectedEditImage}
                          alt="Foto kryesore"
                          className="aspect-square w-full rounded-lg"
                          focus={getImageFocus(editForm.image_focus_json, selectedEditImage)}
                          onChange={updateEditImageFocus}
                          onError={(e) => { e.currentTarget.style.display = "none"; }}
                        />
                      </div>
                      <ImageFocusControls
                        value={getImageFocus(editForm.image_focus_json, selectedEditImage)}
                        onChange={updateEditImageFocus}
                      />
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                        {(editForm.image_urls || []).slice(0, 6).map((imgUrl, i) => {
                          const selected = Number(editForm.main_image_index || 0) === i;
                          const focus = getImageFocus(editForm.image_focus_json, imgUrl);
                          return (
                            <div
                              key={`${imgUrl}-${i}`}
                              draggable
                              onDragStart={(event) => event.dataTransfer.setData("text/plain", String(i))}
                              onDragOver={(event) => event.preventDefault()}
                              onDrop={(event) => {
                                event.preventDefault();
                                const fromIndex = Number(event.dataTransfer.getData("text/plain"));
                                reorderEditImages(fromIndex, i);
                              }}
                              className={`relative cursor-grab overflow-hidden rounded-lg border ${selected ? "border-[#9bffd6]" : "border-white/10"} active:cursor-grabbing`}
                              title="Tërhiqe për ta riorganizuar"
                            >
                              <button type="button" onClick={() => setEditMainImage(i)} className="absolute left-1 top-1 rounded-full bg-black/60 p-1 text-white hover:text-[#ffd166]" title="Bëje foto kryesore">
                                <Star className={`h-3.5 w-3.5 ${selected ? "fill-[#ffd166] text-[#ffd166]" : ""}`} />
                              </button>
                              <button type="button" onClick={() => removeEditImage(i)} className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:text-red-300" title="Hiqe foton">
                                <X className="h-3.5 w-3.5" />
                              </button>
                              <img src={imgUrl} alt="" className="h-16 w-full object-cover" style={getImageFocusStyle(focus)} onError={(e) => { e.currentTarget.style.display = "none"; }} />
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                  <label className={`inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white/75 hover:bg-white/10 ${(editForm.image_urls || []).length >= 6 ? "pointer-events-none opacity-45" : ""}`}>
                    <Upload className="h-4 w-4" />
                    Ngarko foto për Pazar
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleEditImageUpload} disabled={editJobMutation.isPending || (editForm.image_urls || []).length >= 6} />
                  </label>
                  <p className="text-white/40 text-[11px]">Mund të ruhen deri në 6 foto; fotoja me yll shfaqet si kryesore dhe thumbnail.</p>
                </div>
              )}
              <div className="space-y-1">
                <Label className="text-white/60 text-xs">Vendndodhja</Label>
                <LocationPicker
                  value={{ address: editForm.address || [editForm.city, editForm.zone, editForm.country].filter(Boolean).join(", "), country: editForm.country, zone: editForm.zone || "", city: editForm.city, location_precision: editForm.location_precision }}
                  onChange={loc => setEditForm(f => ({ ...f, address: loc.address, country: loc.country, zone: loc.zone || "", city: loc.city, location_precision: loc.location_precision }))}
                />
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button onClick={() => editJobMutation.mutate()} disabled={editJobMutation.isPending} className="bg-green-500 hover:bg-green-600 text-white gap-1.5 flex-1 min-w-[140px]">
                  <Check className="w-3.5 h-3.5" /> {editJobMutation.isPending ? "Duke ruajtur..." : "Ruaj Ndryshimet"}
                </Button>
                <Button onClick={() => setIsEditing(false)} variant="ghost" className="text-white/60 hover:text-white border border-white/20 flex-1 min-w-[80px]">
                  <X className="w-3.5 h-3.5 mr-1" /> Anulo
                </Button>
              </div>
            </div>
          )}

          <h1 className="break-words text-2xl sm:text-3xl font-bold text-white leading-tight">
            {isEditing ? editForm.title : job.title}
          </h1>

          {isAuth && hasEarlyMemberPremiumAccess(user) && (
            <div className="mt-3 rounded-xl border border-[#9bffd6]/25 bg-[#9bffd6]/10 px-3 py-2 text-sm text-[#d8fff1]">
              Antoktoni është në fazë beta publike. Përdorimi bazë i platformës është falas për të gjithë. Nëse dëshironi, mund ta mbështesni vullnetarisht zhvillimin dhe mirëmbajtjen e projektit duke klikuar{" "}
              <Link to={createPageUrl("Subscriptions")} className="font-semibold text-[#9bffd6] underline underline-offset-2">këtu</Link>.
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-white">
            {(job.country || job.city) && (() => {
              const isAntokton = job.country === "Antokton";
              const isPrecise = job.location_precision !== 'perafersisht';
              // Kur është "përafërsisht", shfaq vetëm zonën/qytetin - jo adresën e saktë
              const displayAddress = isPrecise
                ? (job.address && job.address !== job.city ? formatLocationParts(job.address, isAntokton ? null : job.country) : formatLocationParts(job.city, isAntokton ? "Antokton" : job.country))
                : formatLocationParts(job.city || job.zone, isAntokton ? "Antokton" : job.country);
              const mapsQuery = displayAddress;
              return (
                <a
                  href={`https://www.google.com/maps/search/${encodeURIComponent(mapsQuery)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-white hover:text-[#8ab4ff] transition-colors"
                >
                  <MapPin className="w-4 h-4" />
                  {displayAddress}
                  {!isPrecise && (
                    <span className="text-xs text-white/40 ml-0.5">(zonë ~1km)</span>
                  )}
                </a>
              );
            })()}
            <span className="flex items-center gap-1.5 text-white/70">
              <Clock className="w-4 h-4" />
              {moment(job.created_date).format("D MMMM YYYY")}
            </span>
            {(job.poster_name || posterProfile || job.created_by) && (() => {
              const posterDisplayName = job.poster_name || getUserDisplayName(posterProfile, job.created_by);
              const canSeeProfile = isAuth && premiumAccess;
              const posterIsStaff = isStaffUser(posterProfile);
              const profileLink = job.created_by ? `/Member/${encodeURIComponent(job.created_by)}` : null;
              const visibleProfileLink = canSeeProfile && !posterIsStaff ? profileLink : null;
              if (posterIsStaff) {
                return (
                  <button
                    type="button"
                    onClick={() => setStaffProfileNotice("Ky profil në këtë njoftim nuk hapet pasi ky është pjesë e stafit.")}
                    className="flex items-center gap-1.5 text-[#8ab4ff] hover:text-[#9bffd6] transition-colors underline underline-offset-2"
                  >
                    <UserAvatar
                      name={posterDisplayName}
                      email={job.created_by}
                      photoUrl={job.author_photo_url}
                      size={24}
                    />
                    {posterDisplayName}
                  </button>
                );
              }
              if (visibleProfileLink) {
                return (
                  <a
                    href={visibleProfileLink}
                    target="_self"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[#8ab4ff] hover:text-[#9bffd6] transition-colors underline underline-offset-2"
                  >
                    <UserAvatar
                      name={posterDisplayName}
                      email={job.created_by}
                      photoUrl={job.author_photo_url}
                      size={24}
                    />
                    {posterDisplayName}
                  </a>
                );
              }
              return (
                <span className="flex items-center gap-1.5 text-white/70">
                  <UserAvatar
                    name={posterDisplayName}
                    email={job.created_by}
                    photoUrl={job.author_photo_url}
                    size={24}
                  />
                  {posterDisplayName}
                </span>
              );
            })()}
          </div>

          {staffProfileNotice && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-[#8ab4ff]/25 bg-[#8ab4ff]/10 px-3 py-2 text-sm text-[#dbeafe]">
              <span>{staffProfileNotice}</span>
              <button type="button" onClick={() => setStaffProfileNotice("")} className="text-white/55 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {job.salary_info && (
            <div className="mt-4 px-4 py-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-300 text-sm font-medium">
              💰 {job.salary_info}
            </div>
          )}

          {/* Foto gallery - nga image_urls (array) ose image_url (singular fallback) */}
          {(() => {
            const imgs = Array.isArray(job.image_urls) && job.image_urls.length > 0
              ? job.image_urls.slice(0, 6)
              : job.image_url ? [job.image_url] : [];
            if (imgs.length === 0) return null;
            const mainIndex = Math.min(Number(job.main_image_index || 0), Math.max(0, imgs.length - 1));
            const mainImage = imgs[mainIndex] || imgs[0];
            const mainFocus = getImageFocus(job.image_focus_json, mainImage);
            return (
              <div
                data-swipe-back-ignore
                className="mt-5 max-w-full space-y-2"
                style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x' }}
              >
                <button type="button" onClick={() => setPhotoViewerUrl(mainImage)} className="block w-full overflow-hidden rounded-xl border border-white/10 bg-white/5 text-left">
                  <ImageFocusPreview
                    src={mainImage}
                    alt="Foto kryesore"
                    focus={mainFocus}
                    className="h-[min(70vw,520px)] min-h-[220px] w-full hover:opacity-95 transition-opacity cursor-pointer"
                    onError={e => e.currentTarget.style.display = 'none'}
                  />
                </button>
                {imgs.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {imgs.map((imgUrl, i) => {
                      const focus = getImageFocus(job.image_focus_json, imgUrl);
                      return (
                        <button key={i} type="button" onClick={() => setPhotoViewerUrl(imgUrl)} className={`shrink-0 overflow-hidden rounded-lg border ${i === mainIndex ? "border-[#9bffd6]" : "border-white/10"} bg-white/5`}>
                          <ImageFocusPreview
                            src={imgUrl}
                            alt={`foto ${i + 1}`}
                            focus={focus}
                            className="h-16 w-20 hover:opacity-90 transition-opacity cursor-pointer"
                            onError={e => e.currentTarget.style.display = 'none'}
                          />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          <div className="mt-6 break-words text-white leading-relaxed whitespace-pre-wrap">
            {String((isEditing ? editForm.description : job.description) || "").split(/(https?:\/\/[^\s]+)/g).map((part, i) => {
              if (part.match(/https?:\/\/[^\s]+/)) {
                return (
                  <a
                    key={i}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all text-[#8ab4ff] hover:text-[#9bffd6] underline"
                  >
                    {part}
                  </a>
                );
              }
              return <span key={i}>{part}</span>;
            })}
          </div>

          {(job.contact_info || job.phone_number || job.author_profile_url || job.import_author_profile_url || job.source_url || job.import_source_url) && (() => {
            const canSeeContact = isAuth && premiumAccess;
            const phoneAppLabels = { telefon: "Telefon", whatsapp: "WhatsApp", viber: "Viber", telegram: "Telegram", bip: "BiP", signal: "Signal", tjeter: "" };
            const phoneAppSvgs = {
              telefon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 flex-shrink-0 text-white/70"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.73 9.5a19.79 19.79 0 01-3.07-8.67A2 2 0 012.64 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.59a16 16 0 006.29 6.29l.96-.96a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>,
              whatsapp: <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 flex-shrink-0 text-[#25D366]"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>,
              viber: <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 flex-shrink-0 text-[#7360F2]"><path d="M11.4 0C5.5.3.3 5.2.3 11.1c0 2.2.6 4.3 1.8 6.1L.3 24l6.9-1.8c1.7 1 3.6 1.5 5.6 1.5h.1c5.8 0 10.8-4.7 11.1-10.5C24.2 7 20.3 2.5 15.2.6 14 .2 12.7 0 11.4 0zm4.1 16.9c-.3.8-1.5 1.5-2.1 1.6-.5.1-1.2.1-1.9-.1-.4-.1-1-.3-1.7-.6-3-1.3-5-4.3-5.1-4.5-.1-.2-1.2-1.6-1.2-3s.7-2.1 1-2.4c.2-.3.5-.4.7-.4h.5c.2 0 .4 0 .5.4.2.4.7 1.7.8 1.8.1.1.1.3 0 .5-.1.1-.2.3-.3.4-.1.1-.3.3-.4.4-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.5 1.5.3.1.5.1.7-.1.2-.2.7-.8.9-1.1.2-.3.4-.2.7-.1.3.1 1.8.9 2.1 1 .3.2.5.3.6.4.1.2 0 .9-.4 1.5z"/></svg>,
              telegram: <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 flex-shrink-0 text-[#2AABEE]"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.96 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>,
              bip: <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 flex-shrink-0"><rect width="24" height="24" rx="6" fill="#1DA1F2"/><text x="3.5" y="16.5" fontSize="9" fill="white" fontWeight="bold" fontFamily="Arial">BiP</text></svg>,
              signal: <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 flex-shrink-0 text-[#3A76F0]"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 4.5a7.5 7.5 0 110 15 7.5 7.5 0 010-15zm0 2a5.5 5.5 0 100 11 5.5 5.5 0 000-11zm0 2a3.5 3.5 0 110 7 3.5 3.5 0 010-7z"/></svg>,
              tjeter: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 flex-shrink-0 text-white/50"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18.01"/></svg>,
            };
            const phoneApp = job.phone_app || "telefon";
            const phoneIcon = phoneAppSvgs[phoneApp] || phoneAppSvgs.telefon;
            const phoneLabel = phoneAppLabels[phoneApp] || "";
            const cleanPhone = (job.phone_number || "").replace(/\s/g, "");
            const digitsOnly = cleanPhone.replace(/[^\d]/g, "");
            const phoneHref = phoneApp === "whatsapp"
              ? `https://wa.me/${digitsOnly}`
              : phoneApp === "viber"
              ? `viber://chat?number=${cleanPhone}`
              : phoneApp === "telegram"
              ? `https://t.me/${cleanPhone}`
              : `tel:${cleanPhone}`;
            const canShowAuthorContactUrl = canSeePrivateImportFields || job.show_author_profile_url === true;
            const authorContactUrl = job.author_profile_url || job.import_author_profile_url || "";
            const canShowSourceUrl = canSeePrivateImportFields || job.show_source_url === true;
            const sourceUrl = job.source_url || job.import_source_url || "";
            const isAuthorContactLine = (line = "") => (
              authorContactUrl && line.trim().replace(/\/$/, "") === authorContactUrl.trim().replace(/\/$/, "")
            );
            const hasVisibleContact = job.phone_number || job.contact_info || (canShowAuthorContactUrl && authorContactUrl) || (canShowSourceUrl && sourceUrl);
            const hasPublicImportLink =
              (job.show_author_profile_url === true && authorContactUrl) ||
              (job.show_source_url === true && sourceUrl);
            const canSeeContactDetails = canSeeContact || hasPublicImportLink || canSeePrivateImportFields;

            return hasVisibleContact ? (
              <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 text-sm font-medium text-white mb-2">
                  <Phone className="w-4 h-4" />
                  Kontakt
                </div>
                {canSeeContactDetails ? (
                 <div className="text-white text-sm space-y-2">
                   {/* Numri i telefonit - direkt i klikueshëm */}
                   {canSeeContact && job.phone_number && (
                     <div className="flex items-center gap-3">
                       <a
                         href={`tel:${cleanPhone}`}
                         className="flex min-w-0 max-w-full items-center gap-2 break-all text-[#8ab4ff] hover:text-[#9bffd6] font-semibold text-base transition-colors"
                       >
                         {phoneIcon}
                         {job.phone_number}
                       </a>
                       {phoneApp === "whatsapp" && (
                         <a
                           href={`https://wa.me/${digitsOnly}`}
                           target="_blank"
                           rel="noopener noreferrer"
                           title="Dërgo mesazh WhatsApp"
                           className="flex items-center justify-center w-8 h-8 rounded-full transition-all hover:scale-110"
                           style={{ background: '#25D366' }}
                         >
                           <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                         </a>
                       )}
                     </div>
                   )}
                    {/* Info tjetër kontakti */}
                    {canSeeContact && job.contact_info && job.contact_info.split(/\n/).filter((line) => canShowAuthorContactUrl || !isAuthorContactLine(line)).map((line, i) => {
                      const emailMatch = line.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
                      const urlMatch = line.match(/https?:\/\/[^\s]+/);
                      const mapsMatch = line.match(/^(rr\.|rruga|adresa|adresë|str\.|sheshi|bul\.)/i);
                      const phoneMatch = line.match(/[\+]?[\d\s\-\(\)]{7,}/);
                      if (emailMatch) return <a key={i} href={`mailto:${emailMatch[0]}`} className="block break-all text-[#8ab4ff] hover:text-[#9bffd6] underline">{line}</a>;
                      if (urlMatch) return <a key={i} href={urlMatch[0]} target="_blank" rel="noopener noreferrer" className="block break-all text-[#8ab4ff] hover:text-[#9bffd6] underline">{line}</a>;
                      if (mapsMatch) return <a key={i} href={`https://www.google.com/maps/search/${encodeURIComponent(line)}`} target="_blank" rel="noopener noreferrer" className="block break-words text-[#8ab4ff] hover:text-[#9bffd6] underline">📍 {line}</a>;
                      if (phoneMatch && line.replace(/[^\d]/g,'').length >= 7) return <a key={i} href={`tel:${line.replace(/\s/g,'')}`} className="block break-all text-[#8ab4ff] hover:text-[#9bffd6] underline">{line}</a>;
                      return <span key={i} className="block break-words">{line}</span>;
                    })}
                    {canShowAuthorContactUrl && authorContactUrl && !(job.contact_info || "").includes(authorContactUrl) && (
                      <a
                        href={authorContactUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex min-w-0 max-w-full items-center gap-2 break-all text-[#8ab4ff] hover:text-[#9bffd6] underline underline-offset-2"
                      >
                        <Link2 className="h-3.5 w-3.5 shrink-0" />
                        <span className="min-w-0 break-all">Linku i kontaktit nga burimi</span>
                        {canSeePrivateImportFields && job.show_author_profile_url !== true && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-200 no-underline">
                            <Eye className="h-3 w-3" /> i kufizuar
                          </span>
                        )}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    )}
                    {canShowSourceUrl && sourceUrl && (
                      <a
                        href={sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex min-w-0 max-w-full items-center gap-2 break-all text-xs text-white/45 hover:text-[#8ab4ff] underline underline-offset-2"
                      >
                        <Link2 className="h-3.5 w-3.5 shrink-0" />
                        <span className="min-w-0 break-all">Linku i burimit / postimit origjinal</span>
                        {canSeePrivateImportFields && job.show_source_url !== true && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-white/50 no-underline">
                            <Eye className="h-3 w-3" /> i kufizuar
                          </span>
                        )}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    )}
                    {canSeeContact && (job.address || job.city || job.country) && (() => {
                      const contactLocation = formatLocationParts(job.address || job.city, job.country === "Antokton" ? null : job.country);
                      return (
                      <a
                        href={`https://www.google.com/maps/search/${encodeURIComponent(contactLocation)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="inline-flex max-w-full items-center gap-1.5 mt-1 text-xs text-[#9bffd6] hover:text-white underline underline-offset-2"
                        title="Hap lokacionin në hartë"
                      >
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="min-w-0 break-words">{contactLocation}</span>
                      </a>
                    )})()}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                      <p className="text-yellow-300 text-sm font-medium mb-2">🔒 Kontaktet e plota janë të fshehura</p>
                      <p className="text-white text-xs">Gjatë beta publike, disa kontakte mund të jenë të kufizuara për arsye sigurie dhe moderimi.</p>
                    </div>
                    <Link to={createPageUrl("Subscriptions")} className="inline-block w-full text-center px-4 py-3 bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] rounded-lg text-sm font-semibold hover:opacity-90">
                      Mëso për fazën beta
                    </Link>
                  </div>
                )}
              </div>
            ) : null;
          })()}

          {applications.length > 0 && (
            <div className="mt-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <div className="flex items-center gap-2 text-blue-300">
                <UsersIcon className="w-5 h-5" />
                <span className="font-semibold">{applications.length} persona kanë aplikuar për këtë pozicion</span>
              </div>
            </div>
          )}

          {/* Butoni "Apliko Tani" - vetëm për punë */}
          {job.category === "pune" && job.job_type === "ofroj" && (
            <div className="mt-5">
              <Button
                onClick={() => setShowQuickApply(true)}
                className="w-full bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] hover:opacity-90 h-12 font-semibold text-sm"
              >
                <Briefcase className="w-4 h-4 mr-2" />
                Apliko Tani
              </Button>
            </div>
          )}

          {/* Facebook-style action bar */}
          <div className="mt-4 pt-4 border-t border-white/10">
            {/* Counts row */}
            {(reactions.length > 0 || comments.length > 0 || typeof job.view_count === "number") && (
              <div className="flex items-center justify-between text-xs text-white/40 mb-2 px-1">
                <div className="flex items-center gap-1">
                  {reactions.length > 0 && (
                    <span className="flex items-center gap-0.5">
                      {["👍","❤️","😂","😮","😢","😡","👎"]
                        .filter(e => reactions.some(r => r.reaction_type === e))
                        .slice(0, 3)
                        .map(e => <span key={e}>{e}</span>)}
                      <span className="ml-0.5">{reactions.length}</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {typeof job.view_count === "number" && (
                    <span className="inline-flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {formatViewText(job.view_count)}
                    </span>
                  )}
                  {comments.length > 0 && (
                    <button onClick={() => setShowComments(v => !v)} className="hover:text-white/70 transition-colors">
                      {comments.length} komente
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Action buttons row */}
            <div className="flex max-w-full items-center overflow-visible border-t border-white/10 pt-1 gap-0">
              {/* Emoji Reaction button */}
              <div className="relative flex-1 flex justify-center">
                <button
                  onClick={() => {
                    if (!isAuth) { base44.auth.redirectToLogin(); return; }
                    setShowPostReactionPicker(v => !v);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full justify-center ${userReaction ? "text-[#9bffd6]" : "text-white/50 hover:text-white hover:bg-white/5"}`}
                >
                  <span className="text-base leading-none select-none">
                    {userReaction === "like" ? "👍" : userReaction === "dislike" ? "👎" : userReaction || "👍"}
                  </span>
                  <span className="hidden sm:inline text-xs">{userReaction ? "Reagova" : "Reago"}</span>
                </button>
                <AnimatePresence>
                  {showPostReactionPicker && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, y: 6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8, y: 6 }}
                      transition={{ duration: 0.15 }}
                      className="absolute bottom-12 left-1/2 -translate-x-1/2 z-50 flex items-center gap-0.5 px-2 py-1.5 rounded-full shadow-xl"
                      style={{ background: 'rgba(15,23,42,0.98)', border: '1px solid rgba(255,255,255,0.18)' }}
                    >
                      {["👍","❤️","😂","😮","😢","😡","👎"].map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => {
                            setShowPostReactionPicker(false);
                            const mapped = emoji === "👍" ? "like" : emoji === "👎" ? "dislike" : emoji;
                            handleReaction(mapped);
                          }}
                          className="text-xl p-0.5 hover:scale-150 active:scale-125 transition-transform duration-100 select-none"
                          style={{ lineHeight: 1 }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="w-px h-5 bg-white/10" />

              {/* Comment button */}
              <button
                onClick={() => setShowComments(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex-1 justify-center ${showComments ? "text-[#9bffd6]" : "text-white/50 hover:text-white hover:bg-white/5"}`}
              >
                <MessageCircle className={`w-4 h-4 ${showComments ? "fill-[#9bffd6]/20" : ""}`} />
                <span className="hidden sm:inline">Komento</span>
                {comments.length > 0 && <span className="text-xs bg-white/10 rounded-full px-1.5">{comments.length}</span>}
              </button>

              <div className="w-px h-5 bg-white/10 mx-1" />

              {/* Share dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white/50 hover:text-white hover:bg-white/5 transition-colors flex-1 justify-center">
                    <Share2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Shpërnda</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-[#0b1020] border-white/10 w-52">
                  <DropdownMenuItem onClick={() => handleShare('facebook')} className="cursor-pointer text-white/70 hover:text-white gap-2">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-400"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    Facebook
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleShare('whatsapp')} className="cursor-pointer text-white/70 hover:text-white gap-2">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-green-400"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    WhatsApp
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleShare('twitter')} className="cursor-pointer text-white/70 hover:text-white gap-2">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    Twitter / X
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleShare('linkedin')} className="cursor-pointer text-white/70 hover:text-white gap-2">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-500"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                    LinkedIn
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleShare('copy')} className="cursor-pointer text-white/70 hover:text-white gap-2">
                    <Copy className="w-4 h-4" />
                    Kopjo Linkun
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Comments Section - toggleable */}
      {showComments && (
        <div id="comments" className="mt-3 space-y-2">
          {comments.filter(c => !c.parent_id).map((comment, i) => (
            <motion.div key={comment.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <CommentItem
                comment={comment}
                allComments={comments}
                commentLikes={commentLikes}
                user={user}
                isAuth={isAuth}
                canComment={isAuth && premiumAccess}
                jobId={jobId}
              />
            </motion.div>
          ))}

          {isAuth && premiumAccess ? (
            <div className="flex max-w-full items-center gap-2 overflow-hidden mt-3 px-1">
              <div
                className="flex-shrink-0 rounded-full flex items-center justify-center font-bold text-[#0b1020]"
                style={{ width: 30, height: 30, fontSize: 11, background: 'linear-gradient(135deg, #8ab4ff, #9bffd6)' }}
              >
                {(user?.first_name || user?.full_name || "A")[0].toUpperCase()}
              </div>
              <div
                className="flex min-w-0 flex-1 items-center gap-2 rounded-full px-4 py-2"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
              >
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && commentText.trim() && !commentMutation.isPending) {
                      e.preventDefault();
                      commentMutation.mutate();
                    }
                  }}
                  placeholder="Shkruaj një koment…"
                  className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/35 min-w-0"
                  autoFocus
                />
                <button
                  onClick={() => commentText.trim() && !commentMutation.isPending && commentMutation.mutate()}
                  disabled={!commentText.trim() || commentMutation.isPending}
                  className={`flex-shrink-0 transition-colors ${commentText.trim() ? "text-[#8ab4ff] hover:text-[#9bffd6]" : "text-white/20"}`}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center text-sm py-2">
              {!isAuth ? (
                <p className="text-white/40">
                  <button onClick={() => base44.auth.redirectToLogin()} className="text-[#8ab4ff] font-medium hover:underline">
                    Hyr në llogari
                  </button>
                  {" "}për të komentuar
                </p>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-white/40 text-xs">Komentimi është i kufizuar gjatë fazës beta publike</span>
                  <Link to={createPageUrl("Subscriptions")} className="text-[#8ab4ff] text-xs font-semibold hover:underline">
                    Mëso më shumë
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {showApplicationForm && (
          <ApplicationForm
            job={job}
            onClose={() => setShowApplicationForm(false)}
            onSuccess={() => {
              setShowApplicationForm(false);
              alert("Aplikimi juaj u dërgua me sukses!");
            }}
          />
        )}
      </AnimatePresence>

      {/* Quick Apply Modal */}
      <Dialog open={showQuickApply} onOpenChange={setShowQuickApply}>
        <DialogContent className="bg-[#0b1020] border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Apliko Tani
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!isAuth && (
              <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-xs text-amber-100">
                Për profil të plotë dhe emër të verifikuar, aplikoni pasi të hyni në llogari.
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-white/70">Email *</Label>
              <Input
                type="email"
                value={quickApplyForm.email}
                onChange={(e) => setQuickApplyForm({ ...quickApplyForm, email: e.target.value })}
                placeholder="email@example.com"
                readOnly={isAuth}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70">Telefon / WhatsApp (opsional)</Label>
              <Input
                value={quickApplyForm.phone}
                onChange={(e) => setQuickApplyForm({ ...quickApplyForm, phone: e.target.value })}
                placeholder={PHONE_PLACEHOLDER}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70">Mesazhi juaj</Label>
              <Textarea
                value={quickApplyForm.message}
                onChange={(e) => setQuickApplyForm({ ...quickApplyForm, message: e.target.value })}
                placeholder="Përshkruaj shkurtimisht pse jeni të interesuar..."
                className="bg-white/5 border-white/10 text-white min-h-[100px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70">CV (opsionale)</Label>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70 hover:bg-white/10">
                <Upload className="h-4 w-4" />
                {quickApplyCvFile ? quickApplyCvFile.name : "Ngarko CV"}
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    if (file && file.size > 5 * 1024 * 1024) {
                      alert("Madhësia e CV-së nuk duhet të kalojë 5MB");
                      e.target.value = "";
                      return;
                    }
                    setQuickApplyCvFile(file);
                  }}
                />
              </label>
            </div>
            <Button
              onClick={() => quickApplyMutation.mutate()}
              disabled={!quickApplyForm.email || quickApplyMutation.isPending}
              className="w-full bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] hover:opacity-90"
            >
              {quickApplyMutation.isPending ? "Duke dërguar..." : "Dërgo Aplikimin"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="bg-[#0b1020] border-white/10 max-w-sm">
          <DialogHeader>
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 mx-auto mb-2">
              <X className="w-7 h-7 text-red-400" />
            </div>
            <DialogTitle className="text-white text-center text-lg">Fshi Njoftimin</DialogTitle>
            <DialogDescription className="text-white/50 text-center text-sm mt-1">
              Jeni të sigurt që doni ta fshini njoftimin<br />
              <span className="text-white/70 font-medium">"{job?.title}"</span>?<br />
              <span className="text-red-400/80 text-xs mt-1 block">Ky veprim është i pakthyeshëm.</span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button
              onClick={() => setShowDeleteModal(false)}
              variant="ghost"
              className="flex-1 border border-white/15 text-white/60 hover:text-white hover:bg-white/8"
            >
              Anulo
            </Button>
            <Button
              onClick={() => { setShowDeleteModal(false); deleteJobMutation.mutate(); }}
              disabled={deleteJobMutation.isPending}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold"
            >
              {deleteJobMutation.isPending ? "Duke fshirë..." : "Po, Fshi"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Report Modal */}
      <Dialog open={showReportModal} onOpenChange={setShowReportModal}>
        <DialogContent className="bg-[#0b1020] border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Flag className="w-5 h-5 text-red-400" />
              Raporto Njoftimin
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-white/50 text-xs">Raporti shkon direkt tek stafi ynë për shqyrtim.</p>
            <div className="space-y-2">
              <Label className="text-white/70">Zgjidhni arsyen *</Label>
              <div className="space-y-2">
                {reportReasons.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setReportForm({ ...reportForm, reason: opt.value })}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all border ${
                      reportForm.reason === opt.value
                        ? "border-[#8ab4ff] bg-[#8ab4ff]/10 text-white"
                        : "border-white/10 bg-white/5 text-white/70 hover:bg-white/8"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70">Detaje shtesë (opcionale)</Label>
              <Textarea
                value={reportForm.details}
                onChange={(e) => setReportForm({ ...reportForm, details: e.target.value })}
                placeholder="Shpjego nëse dëshironi..."
                className="bg-white/5 border-white/10 text-white min-h-[70px]"
              />
            </div>
            <Button
              onClick={() => reportPostMutation.mutate()}
              disabled={reportPostMutation.isPending}
              className="w-full bg-red-500 hover:bg-red-600 text-white"
            >
              {reportPostMutation.isPending ? "Duke dërguar..." : "Dërgo Raportimin"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {photoViewerUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-3 sm:p-5"
          onClick={() => setPhotoViewerUrl("")}
          role="dialog"
          aria-modal="true"
          aria-label="Pamja e fotos"
        >
          <button
            type="button"
            onClick={() => setPhotoViewerUrl("")}
            className="absolute right-3 top-3 z-[2] rounded-full border border-white/25 bg-black/80 p-3 text-white shadow-lg hover:bg-white/10 sm:right-5 sm:top-5"
            aria-label="Mbyll foton"
          >
            <X className="h-6 w-6" />
          </button>
          <div
            className="flex max-h-[92vh] w-full max-w-6xl flex-col items-center gap-3"
            onClick={(event) => event.stopPropagation()}
          >
          <ImageFocusPreview
            src={photoViewerUrl}
            alt="Foto e njoftimit"
            focus={photoViewerFocus}
            className="h-[82vh] max-h-[82vh] w-full rounded-xl border border-white/10 bg-black/40"
            imageClassName="rounded-xl"
          />
            <button
              type="button"
              onClick={() => setPhotoViewerUrl("")}
              className="rounded-xl border border-white/20 bg-white/10 px-5 py-2 text-sm font-semibold text-white hover:bg-white/15"
            >
              Mbyll
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
