import React, { useState, useEffect } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Check, X, Clock, Shield, Loader2, Inbox, Trash2, Share2, RotateCcw, Flag, Eye, Edit, ExternalLink, MousePointer2, Palette, Plus, Upload } from "lucide-react";
import { createPageUrl } from "../utils";
import { motion, AnimatePresence } from "framer-motion";
import moment from "moment";
import toast from "react-hot-toast";
import AnalyticsDashboard from "../components/admin/AnalyticsDashboard";
import StaticContentManager from "../components/admin/StaticContentManager";
import BulkNotifications from "../components/admin/BulkNotifications";
import MediaManager from "../components/admin/MediaManager";
import PartnersManager from "../components/admin/PartnersManager";
import SiteSettingsManager from "../components/admin/SiteSettingsManager";
import HomepageManager from "../components/admin/HomepageManager";
import UserManager from "../components/admin/UserManager";
import NavConfigManager from "../components/admin/NavConfigManager";
import CharityAdmin from "../components/admin/CharityAdmin";
import ImportForm from "../components/import/ImportForm";
import ImportTable from "../components/import/ImportTable";

const VISUAL_EDITOR_STORAGE_KEY = "antokton.visualEditor.enabled";
const VISUAL_EDITOR_TOGGLE_EVENT = "antokton:visual-editor-toggle";
const DESIGNER_PAGES_KEY = "visual_designer_pages";

const DESIGN_PAGES = [
  { key: "Home", label: "Kryefaqja", description: "Hero, butonat, kategorite dhe seksionet kryesore" },
  { key: "Feed", label: "Njoftime", description: "Lista e njoftimeve dhe kartat e punes" },
  { key: "Statuset", label: "Statuset", description: "Postimet, pyetjet dhe rishperndarjet e komunitetit" },
  { key: "Events", label: "Ngjarje", description: "Faqja e ngjarjeve dhe kartat publike" },
  { key: "Pazar", label: "Pazar", description: "Postimet e pazarit dhe listimet" },
  { key: "Members", label: "Anetaret", description: "Lista dhe shfaqja e anetareve" },
  { key: "Profile", label: "Profili", description: "Faqja e profilit te perdoruesit" },
  { key: "Admin", label: "Paneli Admin", description: "Paneli ku je tani" },
  { url: "/akademia", label: "Akademia", description: "Faqja publike e Akademia Antokton" },
  { url: "/AkademiaAdmin", label: "Akademia Admin", description: "Menaxhimi i kurseve dhe aplikimeve" },
];

function parseDesignerPages(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function slugifyDesignerPage(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export default function Admin() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("pending");
  const [section, setSection] = useState("jobs");
  const [importTab, setImportTab] = useState("table");
  const [importEditingPost, setImportEditingPost] = useState(null);
  const [reviewsSection, setReviewsSection] = useState("pending");
  const [selectedUserCategory, setSelectedUserCategory] = useState(null);
  const [selectedAction, setSelectedAction] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventForm, setEventForm] = useState({});
  const [uploadingEventImage, setUploadingEventImage] = useState(false);
  const [newDesignerPageTitle, setNewDesignerPageTitle] = useState("");
  const queryClient = useQueryClient();

  const setVisualDesignerEnabled = (enabled) => {
    localStorage.setItem(VISUAL_EDITOR_STORAGE_KEY, enabled ? "true" : "false");
    window.dispatchEvent(new CustomEvent(VISUAL_EDITOR_TOGGLE_EVENT, { detail: { enabled } }));
  };

  const addVisualEditParam = (url) => {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}visual_edit=1`;
  };

  const openVisualDesigner = (page) => {
    setVisualDesignerEnabled(true);
    const url = page.url || createPageUrl(page.key);
    window.location.href = addVisualEditParam(url);
  };

  const enableVisualDesignerHere = () => {
    setVisualDesignerEnabled(true);
    toast.success("Editimi vizual u aktivizua. Kliko nje element ne faqe.");
  };

  const disableVisualDesigner = () => {
    setVisualDesignerEnabled(false);
    toast.success("Editimi vizual u mbyll.");
  };

  const upsertDesignerPages = async (pages) => {
    const value = JSON.stringify(pages, null, 2);
    if (designerPagesConfig) {
      await base44.entities.SiteConfig.update(designerPagesConfig.id, { value });
    } else {
      await base44.entities.SiteConfig.create({
        key: DESIGNER_PAGES_KEY,
        value,
        label: "Visual designer pages",
        group: "visual_editor",
      });
    }
    await queryClient.invalidateQueries({ queryKey: ["siteConfig"] });
  };

  const createDesignerPage = async () => {
    const title = newDesignerPageTitle.trim();
    if (!title) {
      toast.error("Shkruaj titullin e faqes.");
      return;
    }

    const baseSlug = slugifyDesignerPage(title) || `faqe-${Date.now()}`;
    let slug = baseSlug;
    let counter = 2;
    while (customDesignerPages.some((page) => page.slug === slug)) {
      slug = `${baseSlug}-${counter}`;
      counter += 1;
    }

    const now = new Date().toISOString();
    const nextPages = customDesignerPages.concat({
      slug,
      title,
      description: "",
      created_at: now,
      updated_at: now,
    });

    await upsertDesignerPages(nextPages);
    setNewDesignerPageTitle("");
    toast.success("Faqja u krijua.");
    openVisualDesigner({ url: `/DesignerPage/${slug}` });
  };

  useEffect(() => {
    const checkAuth = async () => {
      const authenticated = await base44.auth.isAuthenticated();
      if (authenticated) {
        const me = await base44.auth.me();
        setUser(me);
      }
    };
    checkAuth();
  }, []);

  const { data: allJobs = [], isLoading } = useQuery({
    queryKey: ["adminJobs"],
    queryFn: () => base44.entities.Job.list("-created_date", 500),
  });

  const { data: allEvents = [] } = useQuery({
    queryKey: ["adminEvents"],
    queryFn: () => base44.entities.Event.list("-created_date", 500),
  });

  const { data: companyReviews = [] } = useQuery({
    queryKey: ["companyReviews"],
    queryFn: () => base44.entities.CompanyRating.list("-created_date", 200),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ["allUsersAdmin"],
    queryFn: () => base44.entities.User.list("-created_date", 500),
  });

  const { data: adminActions = [] } = useQuery({
    queryKey: ["adminActions"],
    queryFn: () => base44.entities.AdminAction.list("-created_date", 200),
  });

  const { data: reports = [] } = useQuery({
    queryKey: ["reports"],
    queryFn: () => base44.entities.Report.list("-created_date", 200),
  });

  const { data: siteConfigs = [] } = useQuery({
    queryKey: ["siteConfig"],
    queryFn: () => base44.entities.SiteConfig.list(),
    staleTime: 60 * 1000,
  });

  const designerPagesConfig = siteConfigs.find((config) => config.key === DESIGNER_PAGES_KEY);
  const customDesignerPages = parseDesignerPages(designerPagesConfig?.value);
  const pagesForDesign = [
    ...DESIGN_PAGES,
    ...customDesignerPages.map((page) => ({
      url: `/DesignerPage/${page.slug}`,
      label: page.title,
      description: page.description || "Faqe e krijuar nga paneli Web Dizajn",
    })),
  ];

  const invalidateEventQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["adminEvents"] });
    queryClient.invalidateQueries({ queryKey: ["events"] });
    queryClient.invalidateQueries({ queryKey: ["featuredDayNotif"] });
    queryClient.invalidateQueries({ queryKey: ["featuredWeekNotif"] });
  };

  const deleteReportedPostMutation = useMutation({
    mutationFn: async ({ postId, reportId }) => {
      await base44.entities.Job.delete(postId);
      await base44.entities.Report.update(reportId, { status: 'resolved' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["adminJobs"] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, job, rejectionNote }) => {
      const updateData = { status, moderation_status: status };
      if (rejectionNote) updateData.moderation_note = rejectionNote;
      await base44.entities.Job.update(id, updateData);
      // Log action
      await base44.entities.AdminAction.create({
        action_type: status === 'approved' ? 'approve' : status === 'rejected' ? 'reject' : 'update',
        entity_type: 'job',
        entity_id: id,
        entity_title: job?.title || '',
        performed_by: user.email,
        previous_status: job?.status,
        new_status: status,
        reason: rejectionNote || ''
      });
      // Dërgo njoftim kur miratohet ose refuzohet
      if (status === 'approved' && job?.created_by) {
        await base44.entities.Notification.create({
          user_email: job.created_by,
          type: 'status_update',
          title: '✅ Njoftimi juaj u miratua!',
          message: `Njoftimi juaj "${job.title}" u miratua nga moderatorët dhe është tani publik në platformë.`,
          link: `/PostDetail?id=${id}`,
          related_id: id
        });
        // Dërgo email nëse përdoruesi ka aktivizuar email_digest ose application_status
        await base44.functions.invoke('notifyApprovalEmail', { job, userEmail: job.created_by });
      }
      if (status === 'rejected' && job?.created_by) {
        await base44.entities.Notification.create({
          user_email: job.created_by,
          type: 'status_update',
          title: 'Njoftimi juaj u refuzua',
          message: rejectionNote
            ? `Njoftimi juaj nuk përputhet me standardin e publikimit të platformës. Arsyeja: ${rejectionNote}. Ju lutemi rishikoni përmbajtjen dhe ridërgojeni.`
            : 'Njoftimi juaj nuk përputhet me standardin e publikimit të platformës. Ju lutemi rishikoni përmbajtjen dhe ridërgojeni.',
          link: '/CreatePost'
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adminJobs"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, job }) => {
      await base44.entities.Job.delete(id);
      // Log action
      await base44.entities.AdminAction.create({
        action_type: 'permanent_delete',
        entity_type: 'job',
        entity_id: id,
        entity_title: job?.title || '',
        performed_by: user.email
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adminJobs"] }),
  });

  const updateEventMutation = useMutation({
    mutationFn: async ({ id, status, organizerEmail, event }) => {
      await base44.entities.Event.update(id, { status });
      // Log action
      await base44.entities.AdminAction.create({
        action_type: status === 'approved' ? 'approve' : status === 'rejected' ? 'reject' : 'update',
        entity_type: 'event',
        entity_id: id,
        entity_title: event?.title || '',
        performed_by: user.email,
        previous_status: event?.status,
        new_status: status
      });
    },
    onSuccess: async (_, variables) => {
      invalidateEventQueries();
      
      // Send notification to event organizer
      const statusText = variables.status === 'approved' ? 'u aprovua' : 'u refuzua';
      await base44.entities.Notification.create({
        user_email: variables.organizerEmail,
        type: 'system',
        title: `Ngarja juaj ${statusText}`,
        message: `Ngarja juaj ka statusin: ${statusText}`,
        link: `/events`
      });
    }
  });

  const deleteEventMutation = useMutation({
    mutationFn: async ({ id, hardDelete, event }) => {
      if (hardDelete) {
        await base44.entities.Event.delete(id);
        // Log permanent deletion
        await base44.entities.AdminAction.create({
          action_type: 'permanent_delete',
          entity_type: 'event',
          entity_id: id,
          entity_title: event?.title || '',
          performed_by: user.email
        });
      } else {
        await base44.entities.Event.update(id, { 
          status: 'deleted_public',
          deleted_by: user.email,
          deleted_at: new Date().toISOString()
        });
        // Log soft deletion
        await base44.entities.AdminAction.create({
          action_type: 'delete',
          entity_type: 'event',
          entity_id: id,
          entity_title: event?.title || '',
          performed_by: user.email,
          previous_status: event?.status,
          new_status: 'deleted_public'
        });
      }
    },
    onSuccess: () => invalidateEventQueries(),
  });

  const restoreEventMutation = useMutation({
    mutationFn: async ({ id, event }) => {
      await base44.entities.Event.update(id, { status: 'approved' });
      // Log restoration
      await base44.entities.AdminAction.create({
        action_type: 'restore',
        entity_type: 'event',
        entity_id: id,
        entity_title: event?.title || '',
        performed_by: user.email,
        previous_status: 'deleted_public',
        new_status: 'approved'
      });
    },
    onSuccess: () => invalidateEventQueries(),
  });

  const editEventMutation = useMutation({
    mutationFn: async ({ id, data, event }) => {
      if (data.featured_day) {
        await Promise.all(
          allEvents
            .filter(item => item.id !== id && item.featured_day)
            .map(item => base44.entities.Event.update(item.id, {
              featured_day: false,
              featured_day_expires: null
            }))
        );
      }
      if (data.featured_week) {
        await Promise.all(
          allEvents
            .filter(item => item.id !== id && item.featured_week)
            .map(item => base44.entities.Event.update(item.id, {
              featured_week: false,
              featured_week_expires: null
            }))
        );
      }
      await base44.entities.Event.update(id, data);
      await base44.entities.AdminAction.create({
        action_type: 'edit',
        entity_type: 'event',
        entity_id: id,
        entity_title: data.title || event?.title || '',
        performed_by: user.email,
        previous_status: event?.status,
        new_status: data.status
      });
    },
    onSuccess: () => {
      invalidateEventQueries();
      setEditingEvent(null);
      setEventForm({});
      toast.success("Ngjarja u perpunua!");
    },
    onError: (error) => toast.error("Gabim gjate perpunimit: " + error.message)
  });

  const featureEventMutation = useMutation({
    mutationFn: async ({ event, type, enable, expires }) => {
      const flagKey = type === 'day' ? 'featured_day' : 'featured_week';
      const expiresKey = type === 'day' ? 'featured_day_expires' : 'featured_week_expires';
      const updates = { featured_by: user.email };
      updates[flagKey] = enable;
      updates[expiresKey] = enable ? expires : null;

      if (enable) {
        await Promise.all(
          allEvents
            .filter(item => item.id !== event.id && item[flagKey])
            .map(item => base44.entities.Event.update(item.id, {
              [flagKey]: false,
              [expiresKey]: null
            }))
        );
      }
      await base44.entities.Event.update(event.id, updates);
      await base44.entities.AdminAction.create({
        action_type: enable ? `feature_${type}` : `unfeature_${type}`,
        entity_type: 'event',
        entity_id: event.id,
        entity_title: event.title || '',
        performed_by: user.email
      });
    },
    onSuccess: () => {
      invalidateEventQueries();
      toast.success("Ngjarja u perditesua!");
    },
    onError: (error) => toast.error("Gabim gjate perditesimit: " + error.message)
  });

  const featureRequestDecisionMutation = useMutation({
    mutationFn: async ({ event, approve }) => {
      if (!approve) {
        await base44.entities.Event.update(event.id, {
          featured_request_status: "rejected"
        });
        await base44.entities.AdminAction.create({
          action_type: "reject_feature_request",
          entity_type: "event",
          entity_id: event.id,
          entity_title: event.title || "",
          performed_by: user.email,
          previous_status: "pending",
          new_status: "rejected"
        });
        return;
      }

      const type = event.featured_request_type;
      const days = event.featured_request_duration_days;
      const flagKey = type === "day" ? "featured_day" : "featured_week";
      const expiresKey = type === "day" ? "featured_day_expires" : "featured_week_expires";
      const expires = days ? new Date() : null;
      if (expires) expires.setDate(expires.getDate() + days);

      await Promise.all(
        allEvents
          .filter(item => item.id !== event.id && item[flagKey])
          .map(item => base44.entities.Event.update(item.id, {
            [flagKey]: false,
            [expiresKey]: null
          }))
      );

      await base44.entities.Event.update(event.id, {
        featured_by: user.email,
        [flagKey]: true,
        [expiresKey]: expires ? expires.toISOString() : null,
        ...(event.status === "pending" ? { status: "approved" } : {}),
        featured_request_status: "approved"
      });
      await base44.entities.AdminAction.create({
        action_type: `approve_feature_request_${type}`,
        entity_type: "event",
        entity_id: event.id,
        entity_title: event.title || "",
        performed_by: user.email,
        previous_status: "pending",
        new_status: "approved"
      });
    },
    onSuccess: () => {
      invalidateEventQueries();
      toast.success("Kerkesa u perditesua!");
    },
    onError: (error) => toast.error("Gabim gjate kerkeses: " + error.message)
  });

  const updateMemberCategoryMutation = useMutation({
    mutationFn: ({ userEmail, category }) => base44.entities.User.update(userEmail, { member_category: category }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allUsersAdmin"] });
      toast.success("Kategoria u përditësua!");
    }
  });

  const approveReviewMutation = useMutation({
    mutationFn: async (reviewId) => {
      await base44.entities.CompanyRating.update(reviewId, { 
        is_approved: true,
        approved_by: user.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companyReviews"] });
      toast.success("Rishikimi u aprovua!");
    }
  });

  const rejectReviewMutation = useMutation({
    mutationFn: async (reviewId) => {
      await base44.entities.CompanyRating.delete(reviewId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companyReviews"] });
      toast.success("Rishikimi u fshi!");
    }
  });

  const publishToFacebookMutation = useMutation({
    mutationFn: async (jobId) => {
      const { data } = await base44.functions.invoke("publishToFacebook", { jobId });
      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message || "Publikuar në Facebook!");
      } else {
        toast.error(data.message || "Gabim në publikim");
      }
    },
    onError: (error) => {
      toast.error("Gabim në publikim: " + error.message);
    }
  });

  const handleApproveAndPublish = async (jobId) => {
    await updateMutation.mutateAsync({ id: jobId, status: "approved" });
    publishToFacebookMutation.mutate(jobId);
  };

  const isAdmin = user?.role === "admin" || user?.member_category === "admin";
  const isModerator = user?.role === "moderator" || user?.member_category === "moderator";
  const hasAccess = isAdmin || isModerator;

  if (!user || !hasAccess) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <Shield className="w-12 h-12 text-white/20 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white">Akses i kufizuar</h2>
        <p className="text-white/40 mt-2 text-sm">Kjo faqe është vetëm për administratorë dhe moderatorë.</p>
      </div>
    );
  }

  const toLocalDateTime = (value) => value ? moment(value).format("YYYY-MM-DDTHH:mm") : "";
  const fromLocalDateTime = (value) => value ? new Date(value).toISOString() : null;
  const isFeatureActive = (event, type) => {
    const flag = type === "day" ? event.featured_day : event.featured_week;
    const expires = type === "day" ? event.featured_day_expires : event.featured_week_expires;
    if (!flag) return false;
    if (!expires) return true;
    return new Date(expires) > new Date();
  };

  const openEventEditor = (event) => {
    setEditingEvent(event);
    setEventForm({
      title: event.title || "",
      description: event.description || "",
      event_date: toLocalDateTime(event.event_date),
      location: event.location || "",
      country: event.country || "",
      category: event.category || "meetup",
      event_type: event.event_type || "in_person",
      meeting_link: event.meeting_link || "",
      max_participants: event.max_participants || "",
      image_url: event.image_url || "",
      status: event.status || "pending",
      featured_day: !!event.featured_day,
      featured_week: !!event.featured_week,
      featured_day_expires: toLocalDateTime(event.featured_day_expires),
      featured_week_expires: toLocalDateTime(event.featured_week_expires)
    });
  };

  const saveEventEdit = (event) => {
    editEventMutation.mutate({
      id: event.id,
      event,
      data: {
        title: eventForm.title,
        description: eventForm.description,
        event_date: fromLocalDateTime(eventForm.event_date),
        location: eventForm.location,
        country: eventForm.country,
        category: eventForm.category,
        event_type: eventForm.event_type,
        is_virtual: eventForm.event_type === "online",
        meeting_link: eventForm.meeting_link,
        max_participants: eventForm.max_participants ? Number(eventForm.max_participants) : null,
        image_url: eventForm.image_url,
        status: eventForm.status,
        featured_day: !!eventForm.featured_day,
        featured_week: !!eventForm.featured_week,
        featured_day_expires: eventForm.featured_day ? fromLocalDateTime(eventForm.featured_day_expires) : null,
        featured_week_expires: eventForm.featured_week ? fromLocalDateTime(eventForm.featured_week_expires) : null
      }
    });
  };

  const uploadEventImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingEventImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setEventForm((current) => ({ ...current, image_url: file_url }));
    } catch (error) {
      console.error("Gabim gjatë ngarkimit të fotos së ngjarjes:", error);
      toast.error("Nuk u ngarkua fotoja e ngjarjes");
    } finally {
      setUploadingEventImage(false);
      event.target.value = "";
    }
  };

  const toggleFeaturedEvent = (event, type) => {
    const active = isFeatureActive(event, type);
    const flag = type === "day" ? event.featured_day : event.featured_week;
    if (active) {
      if (!confirm(type === "day" ? "Hiq si ngjarje e dites?" : "Hiq si ngjarje e javes?")) return;
      featureEventMutation.mutate({ event, type, enable: false, expires: null });
      return;
    }

    const amount = prompt(
      type === "day"
        ? (flag ? "Afati ka skaduar. Sa dite ta rivendosim si ngjarje e dites? Shkruaj 0 per pa afat." : "Sa dite te jete si ngjarje e dites? Shkruaj 0 per pa afat.")
        : (flag ? "Afati ka skaduar. Sa jave ta rivendosim si ngjarje e javes? Shkruaj 0 per pa afat." : "Sa jave te jete si ngjarje e javes? Shkruaj 0 per pa afat."),
      "1"
    );
    const parsed = Number.parseInt(amount, 10);
    if (Number.isNaN(parsed) || parsed < 0) return;
    const expires = parsed === 0 ? null : new Date();
    if (expires) expires.setDate(expires.getDate() + (type === "day" ? parsed : parsed * 7));
    featureEventMutation.mutate({ event, type, enable: true, expires: expires ? expires.toISOString() : null });
  };

  const filteredJobs = allJobs.filter(j => {
    if (tab === "pending") return j.status === "pending";
    if (tab === "approved") return j.status === "approved";
    if (tab === "rejected") return j.status === "rejected";
    return true;
  });

  const filteredEvents = allEvents.filter(e => {
    if (tab === "pending") return e.status === "pending" || e.status === "deletion_requested" || e.featured_request_status === "pending";
    if (tab === "approved") return e.status === "approved";
    if (tab === "rejected") return e.status === "rejected";
    return true;
  });

  const deletedEvents = allEvents.filter(e => e.status === "deleted_public");
  const deletedJobs = allJobs.filter(j => j.status === "deleted_public");

  const filteredReviews = companyReviews.filter(r => {
    if (reviewsSection === "pending") return !r.is_approved;
    if (reviewsSection === "approved") return r.is_approved;
    return true;
  });

  const pendingJobsCount = allJobs.filter(j => j.status === "pending").length;
  const pendingEventsCount = allEvents.filter(e => e.status === "pending" || e.featured_request_status === "pending").length;
  const pendingReviewsCount = companyReviews.filter(r => !r.is_approved).length;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8ab4ff]/20 to-[#9bffd6]/20 flex items-center justify-center">
          <Shield className="w-5 h-5 text-[#8ab4ff]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">
            {isAdmin ? "Paneli i Adminit" : "Paneli i Moderatorit"}
          </h1>
          <p className="text-white/40 text-sm">Menaxho njoftimet dhe ngjarjet</p>
        </div>
        {(pendingJobsCount > 0 || pendingEventsCount > 0 || pendingReviewsCount > 0) && (
          <Badge className="ml-auto bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            {pendingJobsCount + pendingEventsCount + pendingReviewsCount} në pritje
          </Badge>
        )}
      </div>

      {/* Navigation - grouped, grid-friendly on mobile */}
      <div className="mb-6 space-y-3">
        {/* Grup 1: Moderim */}
        <div>
          <p className="text-white/30 text-[10px] uppercase font-semibold tracking-wider mb-1.5 px-0.5">Moderim</p>
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
            {[
              { key: "jobs", label: `Njoftime (${pendingJobsCount})` },
              { key: "events", label: `Ngjarje (${pendingEventsCount})` },
              { key: "reviews", label: `Rishikime (${pendingReviewsCount})` },
              { key: "reports", label: "Raportimet" },
              { key: "history", label: "Historiku" },
              { key: "import", label: "📥 Importo" },
            ].map(item => (
              <button
                key={item.key}
                onClick={() => setSection(item.key)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all text-left ${
                  section === item.key
                    ? "bg-[#8ab4ff]/20 text-[#8ab4ff] border border-[#8ab4ff]/30"
                    : "bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {isAdmin && (
          <>
            {/* Grup 2: Analitika & Komunikim */}
            <div data-visual-editor-ui="true">
              <p className="text-white/30 text-[10px] uppercase font-semibold tracking-wider mb-1.5 px-0.5">Analitika & Komunikim</p>
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                {[
                  { key: "analytics", label: "📊 Analitika" },
                  { key: "notifications", label: "📨 Njoftimet" },
                  { key: "content", label: "📝 Përmbajtja" },
                ].map(item => (
                  <button
                    key={item.key}
                    onClick={() => setSection(item.key)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all text-left ${
                      section === item.key
                        ? "bg-[#8ab4ff]/20 text-[#8ab4ff] border border-[#8ab4ff]/30"
                        : "bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Grup 3: Konfigurim */}
            <div>
              <p className="text-white/30 text-[10px] uppercase font-semibold tracking-wider mb-1.5 px-0.5">Konfigurim</p>
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                {[
                  { key: "users", label: "👥 Anëtarët" },
                  { key: "media", label: "📺 Media" },
                  { key: "partners", label: "🤝 Bashkëpunëtorët" },
                  { key: "charity", label: "❤️ Bamirësi" },
                  { key: "homepage", label: "🏠 Ballina" },
                  { key: "settings", label: "⚙️ Cilësimet" },
                ].map(item => (
                  <button
                    key={item.key}
                    onClick={() => setSection(item.key)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all text-left ${
                      section === item.key
                        ? "bg-[#9bffd6]/20 text-[#9bffd6] border border-[#9bffd6]/30"
                        : "bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div data-visual-editor-ui="true">
              <p className="text-white/30 text-[10px] uppercase font-semibold tracking-wider mb-1.5 px-0.5">Dizajn</p>
              <button
                type="button"
                onClick={() => setSection("designer")}
                className={`inline-flex w-full sm:w-auto items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left ${
                  section === "designer"
                    ? "bg-[#9bffd6]/20 text-[#9bffd6] border border-[#9bffd6]/30"
                    : "bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10"
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                Web Dizajn
              </button>
            </div>
          </>
        )}
      </div>



      {section === "reviews" && (
        <Tabs value={reviewsSection} onValueChange={setReviewsSection} className="mb-6">
          <TabsList className="bg-white/10 border-white/10">
            <TabsTrigger value="pending" className="gap-1.5 data-[state=active]:bg-white/20 data-[state=active]:text-white">
              <Clock className="w-3.5 h-3.5" /> Në pritje
            </TabsTrigger>
            <TabsTrigger value="approved" className="gap-1.5 data-[state=active]:bg-white/20 data-[state=active]:text-white">
              <Check className="w-3.5 h-3.5" /> Aprovuar
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {section !== "categories" && section !== "history" && section !== "analytics" && section !== "content" && section !== "notifications" && section !== "media" && section !== "partners" && section !== "charity" && section !== "users" && section !== "homepage" && section !== "designer" && section !== "settings" && section !== "import" && (
        <Tabs value={tab} onValueChange={setTab} className="mb-6">
          <TabsList className="bg-white/10 border-white/10">
            <TabsTrigger value="pending" className="gap-1.5 data-[state=active]:bg-white/20 data-[state=active]:text-white">
              <Clock className="w-3.5 h-3.5" /> Në pritje
            </TabsTrigger>
            <TabsTrigger value="approved" className="gap-1.5 data-[state=active]:bg-white/20 data-[state=active]:text-white">
              <Check className="w-3.5 h-3.5" /> Aprovuar
            </TabsTrigger>
            <TabsTrigger value="rejected" className="gap-1.5 data-[state=active]:bg-white/20 data-[state=active]:text-white">
              <X className="w-3.5 h-3.5" /> Refuzuar
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {isLoading && section !== "analytics" && section !== "content" && section !== "notifications" && section !== "reports" && section !== "designer" ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
        </div>
      ) : section === "designer" ? (
        <div data-visual-editor-ui="true" className="space-y-5">
          <div className="rounded-2xl border border-[#9bffd6]/25 bg-gradient-to-br from-[#9bffd6]/12 via-white/5 to-[#8ab4ff]/10 p-5 shadow-xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#9bffd6]/30 bg-[#9bffd6]/10 px-3 py-1 text-xs font-semibold text-[#9bffd6]">
                  <MousePointer2 className="h-3.5 w-3.5" />
                  Editor vizual per administratorin
                </div>
                <h2 className="text-xl font-bold text-white">Web Dizajn</h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/60">
                  Aktivizo editimin vizual, hap faqen qe do te rregullosh dhe kliko mbi tekst, imazh, buton, link ose bllok. Ndryshimet ruhen si konfigurim ne databaze dhe nuk prekin kodin baze te faqes.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={enableVisualDesignerHere}
                  className="gap-2 bg-[#9bffd6] text-[#07111f] hover:bg-[#9bffd6]/90"
                >
                  <MousePointer2 className="h-4 w-4" />
                  Aktivizo ketu
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={disableVisualDesigner}
                  className="border-white/15 text-white hover:bg-white/10"
                >
                  Mbyll editorin
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="mb-4">
              <h3 className="text-base font-bold text-white">Krijo faqe te re</h3>
              <p className="text-xs text-white/45">Faqja krijohet lokalisht ne Antokton dhe hapet menjehere me editimin vizual aktiv.</p>
            </div>
            <form
              className="flex flex-col gap-3 sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                createDesignerPage();
              }}
            >
              <Input
                value={newDesignerPageTitle}
                onChange={(event) => setNewDesignerPageTitle(event.target.value)}
                placeholder="Titulli i faqes se re"
                className="bg-white/10 border-white/15 text-white placeholder:text-white/35"
              />
              <Button
                type="submit"
                className="shrink-0 gap-2 bg-[#8ab4ff] text-[#07111f] hover:bg-[#8ab4ff]/90"
              >
                <Plus className="h-4 w-4" />
                Krijo dhe edito
              </Button>
            </form>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white">Hap nje faqe per editim</h3>
                <p className="text-xs text-white/45">Editorin mund ta ndezesh nga ketu dhe pastaj te zgjedhesh elementet direkt ne faqe.</p>
              </div>
              <Badge className="border-[#8ab4ff]/30 bg-[#8ab4ff]/15 text-[#8ab4ff]">Admin only</Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {pagesForDesign.map((page) => (
                <button
                  type="button"
                  key={page.url || page.key}
                  onClick={() => openVisualDesigner(page)}
                  className="group rounded-xl border border-white/10 bg-[#07111f]/60 p-4 text-left transition hover:border-[#9bffd6]/40 hover:bg-[#9bffd6]/10"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-white">{page.label}</span>
                    <ExternalLink className="h-4 w-4 text-white/35 transition group-hover:text-[#9bffd6]" />
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-white/45">{page.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/10 p-4 text-xs leading-relaxed text-yellow-50/75">
            Ky editor eshte per ndryshime vizuale te shpejta: tekst, imazh, link, ngjyra, madhesi fonti, sfond dhe fshehje elementi. Per ndryshime te medha layout-i ose funksione te reja, vazhdojme me kod te paster qe te mbetet i qendrueshem.
          </div>
        </div>
      ) : section === "reports" ? (
        <div className="space-y-3">
          {reports.filter(r => r.status === 'pending').length === 0 ? (
            <div className="text-center py-20">
              <Inbox className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/40">Nuk ka raporte në pritje</p>
            </div>
          ) : (
            reports.filter(r => r.status === 'pending').map(report => {
              const reportedJob = allJobs.find(j => j.id === report.post_id);
              return (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-white/10 p-5 bg-white/5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Flag className="w-4 h-4 text-red-400" />
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                          {report.reason === 'spam' ? 'Spam' :
                           report.reason === 'fake' ? 'Rremë/Mashtrim' :
                           report.reason === 'offensive' ? 'Ofensiv' : 'Tjetër'}
                        </Badge>
                      </div>
                      <h3 className="text-white font-semibold text-sm mb-1">
                        Postimi: {reportedJob?.title || 'Njoftim i fshirë'}
                      </h3>
                      {report.details && (
                        <p className="text-white/60 text-xs mb-2">{report.details}</p>
                      )}
                      <p className="text-white/40 text-xs">
                        Raportuar nga: {report.reporter_email} • {moment(report.created_date).fromNow()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {reportedJob && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(createPageUrl("PostDetail") + `?id=${report.post_id}`, '_blank')}
                          className="gap-1 text-blue-400 border-blue-500/30 hover:bg-blue-500/10 h-8"
                        >
                          <Eye className="w-3.5 h-3.5" /> Shiko
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (confirm('A jeni të sigurt që dëshironi ta fshini këtë postim?')) {
                            deleteReportedPostMutation.mutate({ postId: report.post_id, reportId: report.id });
                          }
                        }}
                        className="gap-1 text-red-400 border-red-500/30 hover:bg-red-500/10 h-8"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Fshi Postimin
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      ) : section === "analytics" ? (
        <AnalyticsDashboard jobs={allJobs} events={allEvents} users={allUsers} adminActions={adminActions} />
      ) : section === "content" ? (
        <StaticContentManager />
      ) : section === "notifications" ? (
        <BulkNotifications allUsers={allUsers} />
      ) : section === "media" ? (
        <MediaManager />
      ) : section === "charity" ? (
        <CharityAdmin />
      ) : section === "partners" ? (
        <PartnersManager />
      ) : section === "users" ? (
        <UserManager allUsers={allUsers} />
      ) : section === "homepage" ? (
        <HomepageManager />
      ) : section === "settings" ? (
        <div className="space-y-8">
          <NavConfigManager />
          <SiteSettingsManager />
        </div>
      ) : section === "categories" ? (
        <div className="rounded-lg border border-white/10 overflow-hidden bg-white/5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/8">
                  <th className="text-left px-4 py-3 text-white/70 font-semibold">Emri</th>
                  <th className="text-left px-4 py-3 text-white/70 font-semibold">Email</th>
                  <th className="text-left px-4 py-3 text-white/70 font-semibold">Kategoria Aktuale</th>
                  <th className="text-left px-4 py-3 text-white/70 font-semibold">Ndryshim Kategorie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {allUsers.map(u => (
                  <tr key={u.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{u.first_name && u.surname ? `${u.first_name} ${u.surname}` : u.full_name || 'N/A'}</p>
                    </td>
                    <td className="px-4 py-3 text-white/60 text-xs">{u.email}</td>
                    <td className="px-4 py-3">
                      <Badge className={
                        u.member_category === 'privileged' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                        u.member_category === 'leader' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                        u.member_category === 'moderator' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                        u.member_category === 'admin' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                        'bg-gray-500/20 text-gray-400 border-gray-500/30'
                      }>
                        {u.member_category === 'privileged' ? 'Privilegjuar' :
                         u.member_category === 'leader' ? 'Udhëheqës' :
                         u.member_category === 'moderator' ? 'Moderator' :
                         u.member_category === 'admin' ? 'Admin' : 'Standard'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={u.member_category || 'standard'}
                        onChange={(e) => updateMemberCategoryMutation.mutate({ userEmail: u.email, category: e.target.value })}
                        className="bg-white/10 border border-white/20 text-white rounded px-2 py-1.5 text-xs font-medium hover:bg-white/15 transition-colors"
                      >
                        <option value="standard" className="bg-[#0b1020] text-white">Standard</option>
                        <option value="privileged" className="bg-[#0b1020] text-white">Privilegjuar</option>
                        <option value="leader" className="bg-[#0b1020] text-white">Udhëheqës</option>
                        <option value="moderator" className="bg-[#0b1020] text-white">Moderator</option>
                        <option value="inspector" className="bg-[#0b1020] text-white">Inspektor</option>
                        <option value="admin" className="bg-[#0b1020] text-white">Admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : section === "reviews" ? (
        filteredReviews.length === 0 ? (
          <div className="text-center py-20">
            <Inbox className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/40">Nuk ka rishikime {reviewsSection === "pending" ? "në pritje" : ""}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filteredReviews.map((review) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="rounded-xl border border-white/10 p-5"
                  style={{ background: 'rgba(255, 255, 255, 0.06)' }}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-yellow-500/20 text-yellow-400">
                            {review.overall_rating} ⭐
                          </Badge>
                          <Badge variant="outline" className="border-white/20 text-white/60">
                            {review.position}
                          </Badge>
                          {review.is_anonymous && (
                            <Badge variant="outline" className="border-purple-500/30 text-purple-400">
                              Anonim
                            </Badge>
                          )}
                        </div>
                        <p className="text-white/80 text-sm mb-2">{review.comment}</p>
                        <div className="flex gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs border-white/20 text-white/50">
                            Ambienti: {review.work_environment}⭐
                          </Badge>
                          <Badge variant="outline" className="text-xs border-white/20 text-white/50">
                            Paga: {review.salary_benefits}⭐
                          </Badge>
                          <Badge variant="outline" className="text-xs border-white/20 text-white/50">
                            Menaxhimi: {review.management}⭐
                          </Badge>
                        </div>
                        <p className="text-white/30 text-xs mt-2">
                          Nga: {review.is_anonymous ? 'Anonim' : review.reviewer_email} • {moment(review.created_date).fromNow()}
                        </p>
                      </div>
                      {!review.is_approved && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => approveReviewMutation.mutate(review.id)}
                            className="gap-1 text-green-400 border-green-500/30 hover:bg-green-500/10 h-8"
                          >
                            <Check className="w-3.5 h-3.5" /> Aprovo
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => rejectReviewMutation.mutate(review.id)}
                            className="gap-1 text-red-400 border-red-500/30 hover:bg-red-500/10 h-8"
                          >
                            <X className="w-3.5 h-3.5" /> Refuzo
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )
      ) : section === "history" ? (
        <div className="space-y-6">
          <Tabs value={tab} onValueChange={setTab} className="mb-6">
            <TabsList className="bg-white/10 border-white/10">
              <TabsTrigger value="all" className="data-[state=active]:bg-white/20 data-[state=active]:text-white">Të gjitha</TabsTrigger>
              <TabsTrigger value="events" className="data-[state=active]:bg-white/20 data-[state=active]:text-white">Ngjarje</TabsTrigger>
              <TabsTrigger value="jobs" className="data-[state=active]:bg-white/20 data-[state=active]:text-white">Njoftime</TabsTrigger>
              <TabsTrigger value="members" className="data-[state=active]:bg-white/20 data-[state=active]:text-white">Anëtarë</TabsTrigger>
              <TabsTrigger value="companies" className="data-[state=active]:bg-white/20 data-[state=active]:text-white">Firma</TabsTrigger>
            </TabsList>
          </Tabs>

          {tab === "all" && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Historiku i plotë i veprimeve</h3>
              {adminActions.length === 0 ? (
                <p className="text-white/40 text-center py-8">Nuk ka veprime të regjistruara</p>
              ) : (
                <div className="space-y-2">
                  {adminActions.map(action => (
                    <motion.div
                      key={action.id}
                      onClick={() => setSelectedAction(action)}
                      className="rounded-lg border border-white/10 p-3 bg-white/5 text-sm cursor-pointer hover:bg-white/10 transition-colors"
                      whileHover={{ scale: 1.01 }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={
                              action.action_type === 'approve' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                              action.action_type === 'reject' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                              action.action_type === 'delete' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                              action.action_type === 'permanent_delete' ? 'bg-red-600/20 text-red-300 border-red-600/30' :
                              action.action_type === 'restore' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                              'bg-gray-500/20 text-gray-400 border-gray-500/30'
                            }>
                              {action.action_type === 'approve' ? 'Aprovim' :
                               action.action_type === 'reject' ? 'Refuzim' :
                               action.action_type === 'delete' ? 'Fshirje' :
                               action.action_type === 'permanent_delete' ? 'Fshirje Përgjithmonë' :
                               action.action_type === 'restore' ? 'Rikthim' :
                               action.action_type}
                            </Badge>
                            <Badge variant="outline" className="border-white/20 text-white/60">
                              {action.entity_type === 'job' ? 'Njoftim' :
                               action.entity_type === 'event' ? 'Ngjarje' :
                               action.entity_type === 'member' ? 'Anëtar' :
                               action.entity_type === 'company' ? 'Kompani' :
                               action.entity_type}
                            </Badge>
                          </div>
                          <p className="text-white font-medium">{action.entity_title}</p>
                          <div className="flex items-center gap-4 mt-1 text-white/40 text-xs">
                            <span>Nga: {action.performed_by}</span>
                            <span>{moment(action.created_date).format('DD/MM/YYYY HH:mm')}</span>
                            {action.previous_status && action.new_status && (
                              <span>{action.previous_status} → {action.new_status}</span>
                            )}
                          </div>
                          {action.reason && (
                            <p className="text-white/50 text-xs mt-1">Arsye: {action.reason}</p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "events" && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Ngjarje të fshira</h3>
              {deletedEvents.length === 0 ? (
                <p className="text-white/40 text-center py-8">Nuk ka ngjarje të fshira</p>
              ) : (
                <div className="space-y-3">
                  {deletedEvents.map(event => (
                    <div key={event.id} className="rounded-xl border border-white/10 p-4 bg-white/5">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-white font-medium">{event.title}</h4>
                          <p className="text-white/40 text-xs mt-1">Fshirë nga: {event.deleted_by}</p>
                          <p className="text-white/30 text-xs">Më: {moment(event.deleted_at).format('DD/MM/YYYY HH:mm')}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => restoreEventMutation.mutate({ id: event.id, event })}
                            className="bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30"
                          >
                            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Rikthe
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (confirm('A jeni të sigurt që dëshironi ta fshini përgjithmonë këtë ngjarje?')) {
                                deleteEventMutation.mutate({ id: event.id, hardDelete: true, event });
                              }
                            }}
                            className="text-red-400 border-red-500/30 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" /> Fshije përgjithmonë
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "jobs" && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Njoftime të fshira</h3>
              {deletedJobs.length === 0 ? (
                <p className="text-white/40 text-center py-8">Nuk ka njoftime të fshira</p>
              ) : (
                <div className="space-y-3">
                  {deletedJobs.map(job => (
                    <div key={job.id} className="rounded-xl border border-white/10 p-4 bg-white/5">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-white font-medium">{job.title}</h4>
                          <p className="text-white/40 text-xs mt-1">Kategoria: {job.category}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (confirm('A jeni të sigurt që dëshironi ta fshini përgjithmonë këtë njoftim?')) {
                              deleteMutation.mutate({ id: job.id, job });
                            }
                          }}
                          className="text-red-400 border-red-500/30 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Fshije përgjithmonë
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "members" && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Anëtarë të fshirë</h3>
              <p className="text-white/40 text-center py-8">Funksionaliteti në zhvillim</p>
            </div>
          )}

          {tab === "companies" && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Firma të fshira</h3>
              <p className="text-white/40 text-center py-8">Funksionaliteti në zhvillim</p>
            </div>
          )}
        </div>
      ) : section === "import" ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-white/50 text-xs">Kalo njoftime nga Facebook ose burime të tjera në Antokton</p>
            <div className="flex gap-2">
              <button onClick={() => { setImportTab("table"); setImportEditingPost(null); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${importTab === "table" ? "bg-[#8ab4ff]/20 text-[#8ab4ff] border border-[#8ab4ff]/30" : "bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10"}`}>
                Lista
              </button>
              <button onClick={() => { setImportTab("form"); setImportEditingPost(null); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${importTab === "form" ? "bg-[#8ab4ff]/20 text-[#8ab4ff] border border-[#8ab4ff]/30" : "bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10"}`}>
                + Importo të ri
              </button>
            </div>
          </div>
          {importTab === "table" ? (
            <ImportTable user={user} onEdit={(post) => { setImportEditingPost(post); setImportTab("form"); }} />
          ) : (
            <ImportForm user={user} editingPost={importEditingPost} onDone={() => { setImportEditingPost(null); setImportTab("table"); }} />
          )}
        </div>
      ) : section === "jobs" ? (
        filteredJobs.length === 0 ? (
          <div className="text-center py-20">
            <Inbox className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/40">Nuk ka njoftime {tab === "pending" ? "në pritje" : ""}</p>
          </div>
        ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {filteredJobs.map((job) => (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="rounded-lg border border-white/10 p-4 bg-white/5 hover:bg-white/8 transition-colors"
                  >
                    {/* Rreshti 1: Titulli */}
                    <h3 className="text-white font-semibold text-sm mb-1">{job.title}</h3>

                    {/* Nënrreshti: Përshkrimi */}
                    <p className="text-white/50 text-xs line-clamp-2 mb-2">{job.description}</p>

                    {/* Rreshti 2: Emri i postuesit, kategoria, ora */}
                    <div className="flex items-center gap-3 mb-3 text-xs text-white/40 flex-wrap">
                      <span>{job.poster_name || job.created_by}</span>
                      <Badge variant="outline" className="text-[10px] border-white/20 text-white/50">{job.category}</Badge>
                      <span>{moment(job.created_date).fromNow()}</span>
                      {job.is_halal_compliant && (
                        <Badge className="bg-green-500/15 text-green-400 border-green-500/30 text-[10px]">✅ Hallall</Badge>
                      )}
                      {!job.is_halal_compliant && (job.category === 'pune' || job.category === 'sherbime') && (
                        <Badge className="bg-red-500/15 text-red-400 border-red-500/30 text-[10px]">⚠️ Pa konfirmim</Badge>
                      )}
                    </div>

                    {/* Rreshti 3: Butonat */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {job.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateMutation.mutate({ id: job.id, status: "approved", job })}
                            className="gap-1 text-green-400 border-green-500/30 hover:bg-green-500/10 h-8"
                          >
                            <Check className="w-3.5 h-3.5" /> Miratoj
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.location.href = `/PostDetail?id=${job.id}`}
                              className="gap-1 text-[#8ab4ff] border-[#8ab4ff]/30 hover:bg-[#8ab4ff]/10 h-8"
                            >
                              <Eye className="w-3.5 h-3.5" /> Përpuno
                            </Button>
                             <Button
                               size="sm"
                               variant="outline"
                               onClick={() => {
                                 const feedback = prompt('Shkruaj arsyen e refuzimit (do t\'i dërgohet autorit):');
                              if (feedback !== null) {
                                updateMutation.mutate({ id: job.id, status: "rejected", job, rejectionNote: feedback });
                              }
                             }}
                             className="gap-1 text-red-400 border-red-500/30 hover:bg-red-500/10 h-8"
                             >
                             <X className="w-3.5 h-3.5" /> Refuzo
                             </Button>
                          {isAdmin && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteMutation.mutate({ id: job.id, job })}
                              className="gap-1 text-red-500 border-red-600/30 hover:bg-red-600/10 h-8"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Fshi
                            </Button>
                          )}
                          {isAdmin && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApproveAndPublish(job.id)}
                              disabled={publishToFacebookMutation.isPending}
                              className="gap-1 text-blue-400 border-blue-500/30 hover:bg-blue-500/10 h-8 ml-auto"
                            >
                              {publishToFacebookMutation.isPending ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Share2 className="w-3.5 h-3.5" />
                              )}
                              Shpërnda
                            </Button>
                          )}
                        </>
                      )}
                      {job.status === "rejected" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateMutation.mutate({ id: job.id, status: "approved", job })}
                            className="gap-1 text-green-400 border-green-500/30 hover:bg-green-500/10 h-8"
                          >
                            <Check className="w-3.5 h-3.5" /> Miratoj
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.location.href = `/PostDetail?id=${job.id}`}
                              className="gap-1 text-[#8ab4ff] border-[#8ab4ff]/30 hover:bg-[#8ab4ff]/10 h-8"
                            >
                              <Eye className="w-3.5 h-3.5" /> Përpuno
                            </Button>
                             {isAdmin && (
                               <Button
                                 size="sm"
                                 variant="outline"
                                 onClick={() => deleteMutation.mutate({ id: job.id, job })}
                                 className="gap-1 text-red-500 border-red-600/30 hover:bg-red-600/10 h-8"
                               >
                                 <Trash2 className="w-3.5 h-3.5" /> Fshi
                               </Button>
                             )}
                            </>
                            )}
                            {job.status === "approved" && (
                            <>
                             <Button
                               size="sm"
                               variant="outline"
                               onClick={() => window.location.href = `/PostDetail?id=${job.id}`}
                            className="gap-1 text-[#8ab4ff] border-[#8ab4ff]/30 hover:bg-[#8ab4ff]/10 h-8"
                          >
                            <Eye className="w-3.5 h-3.5" /> Përpuno
                          </Button>
                          {isAdmin && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deleteMutation.mutate({ id: job.id, job })}
                                className="gap-1 text-red-500 border-red-600/30 hover:bg-red-600/10 h-8"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Fshi
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => publishToFacebookMutation.mutate(job.id)}
                                disabled={publishToFacebookMutation.isPending}
                                className="gap-1 text-blue-400 border-blue-500/30 hover:bg-blue-500/10 h-8"
                              >
                                {publishToFacebookMutation.isPending ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Share2 className="w-3.5 h-3.5" />
                                )}
                                Shpërnda në FB
                              </Button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )
      ) : (
        filteredEvents.length === 0 ? (
          <div className="text-center py-20">
            <Inbox className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/40">Nuk ka ngjarje {tab === "pending" ? "në pritje" : ""}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filteredEvents.map((event) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="rounded-lg border border-white/10 p-4 bg-white/5 hover:bg-white/8 transition-colors"
                >
                  <h3 className="text-white font-semibold text-sm mb-1">{event.title}</h3>
                  <p className="text-white/50 text-xs line-clamp-2 mb-2">{event.description}</p>
                  <div className="flex items-center gap-3 mb-3 text-xs text-white/40 flex-wrap">
                    <span>{event.created_by}</span>
                    <Badge variant="outline" className="text-[10px] border-white/20 text-white/50">{event.category}</Badge>
                    <span>{moment(event.created_date).fromNow()}</span>
                    {event.featured_day && <Badge className={`${isFeatureActive(event, "day") ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" : "bg-yellow-500/10 text-yellow-200/60 border-yellow-500/15"} text-[10px]`}>Ditës{!isFeatureActive(event, "day") ? " skaduar" : ""}</Badge>}
                    {event.featured_week && <Badge className={`${isFeatureActive(event, "week") ? "bg-blue-500/20 text-blue-300 border-blue-500/30" : "bg-blue-500/10 text-blue-200/60 border-blue-500/15"} text-[10px]`}>Javës{!isFeatureActive(event, "week") ? " skaduar" : ""}</Badge>}
                  </div>
                  {event.featured_request_status === "pending" && (
                    <div className="mb-3">
                      <Badge className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">
                        Kerkese per ngjarje {event.featured_request_type === "day" ? "dite" : "jave"}
                      </Badge>
                    </div>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    {hasAccess && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEventEditor(event)}
                        className="gap-1 text-[#8ab4ff] border-[#8ab4ff]/30 hover:bg-[#8ab4ff]/10 h-8"
                      >
                        <Edit className="w-3.5 h-3.5" /> Përpuno
                      </Button>
                    )}
                    {isAdmin && event.featured_request_status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => featureRequestDecisionMutation.mutate({ event, approve: true })}
                          disabled={featureRequestDecisionMutation.isPending}
                          className="gap-1 text-yellow-300 border-yellow-500/30 hover:bg-yellow-500/10 h-8"
                        >
                          <Check className="w-3.5 h-3.5" /> Mirato kerkesen
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => featureRequestDecisionMutation.mutate({ event, approve: false })}
                          disabled={featureRequestDecisionMutation.isPending}
                          className="gap-1 text-red-400 border-red-500/30 hover:bg-red-500/10 h-8"
                        >
                          <X className="w-3.5 h-3.5" /> Refuzo kerkesen
                        </Button>
                      </>
                    )}
                    {event.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateEventMutation.mutate({ id: event.id, status: "approved", organizerEmail: event.organizer_email, event })}
                          className="gap-1 text-green-400 border-green-500/30 hover:bg-green-500/10 h-8"
                        >
                          <Check className="w-3.5 h-3.5" /> Mirato
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateEventMutation.mutate({ id: event.id, status: "rejected", organizerEmail: event.organizer_email, event })}
                          className="gap-1 text-red-400 border-red-500/30 hover:bg-red-500/10 h-8"
                        >
                          <X className="w-3.5 h-3.5" /> Refuzo
                        </Button>
                      </>
                    )}
                    {event.status === "deletion_requested" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteEventMutation.mutate({ id: event.id, hardDelete: false, event })}
                        className="gap-1 text-red-400 border-red-500/30 hover:bg-red-500/10 h-8"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Konfirmo Fshirjen
                      </Button>
                    )}
                    {event.status === "approved" && isAdmin && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleFeaturedEvent(event, "day")}
                          className={`gap-1 h-8 text-xs ${isFeatureActive(event, "day") ? 'bg-yellow-500/30 text-yellow-300 border-yellow-500/50' : 'text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/10'}`}
                        >
                          {isFeatureActive(event, "day") ? 'Hiq Ditës' : event.featured_day ? 'Rivendos Ditës' : 'Ngjarje Ditës'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleFeaturedEvent(event, "week")}
                          className={`gap-1 h-8 text-xs ${isFeatureActive(event, "week") ? 'bg-blue-500/30 text-blue-300 border-blue-500/50' : 'text-blue-400 border-blue-500/30 hover:bg-blue-500/10'}`}
                        >
                          {isFeatureActive(event, "week") ? 'Hiq Javës' : event.featured_week ? 'Rivendos Javës' : 'Ngjarje Javës'}
                        </Button>
                      </>
                    )}
                    {isAdmin && event.status !== "deletion_requested" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteEventMutation.mutate({ id: event.id, hardDelete: false, event })}
                        className="text-white/40 hover:text-red-400 h-8 ml-auto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )
      )}

      {/* Event Edit Modal */}
      <Dialog open={!!editingEvent} onOpenChange={(open) => { if (!open) setEditingEvent(null); }}>
        <DialogContent className="bg-[#0b1020] border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Edit className="w-5 h-5 text-[#8ab4ff]" />
              Përpuno ngjarjen
            </DialogTitle>
            <DialogDescription className="text-white/50">
              Admini mund te perpunojne cdo ngjarje, pavaresisht kush e ka publikuar.
            </DialogDescription>
          </DialogHeader>

          {editingEvent && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-white/70">Titulli</Label>
                <Input value={eventForm.title || ""} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} className="bg-white/5 border-white/10 text-white" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-white/70">Pershkrimi</Label>
                <Textarea value={eventForm.description || ""} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} className="bg-white/5 border-white/10 text-white min-h-28" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-white/70">Data dhe ora</Label>
                  <Input type="datetime-local" value={eventForm.event_date || ""} onChange={(e) => setEventForm({ ...eventForm, event_date: e.target.value })} className="bg-white/5 border-white/10 text-white [color-scheme:dark]" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-white/70">Statusi</Label>
                  <select value={eventForm.status || "pending"} onChange={(e) => setEventForm({ ...eventForm, status: e.target.value })} className="h-10 w-full rounded-md border border-white/10 bg-[#10182d] px-3 text-sm text-white">
                    <option value="pending">Ne pritje</option>
                    <option value="approved">Aprovuar</option>
                    <option value="rejected">Refuzuar</option>
                    <option value="deletion_requested">Kerkese fshirjeje</option>
                    <option value="deleted_public">Fshire publikisht</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-white/70">Kategoria</Label>
                  <Input value={eventForm.category || ""} onChange={(e) => setEventForm({ ...eventForm, category: e.target.value })} className="bg-white/5 border-white/10 text-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-white/70">Lloji</Label>
                  <select value={eventForm.event_type || "in_person"} onChange={(e) => setEventForm({ ...eventForm, event_type: e.target.value })} className="h-10 w-full rounded-md border border-white/10 bg-[#10182d] px-3 text-sm text-white">
                    <option value="in_person">Prezence fizike</option>
                    <option value="online">Online</option>
                    <option value="hybrid">Te dyja</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-white/70">Vendi / lokacioni</Label>
                  <Input value={eventForm.location || ""} onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })} className="bg-white/5 border-white/10 text-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-white/70">Shteti</Label>
                  <Input value={eventForm.country || ""} onChange={(e) => setEventForm({ ...eventForm, country: e.target.value })} className="bg-white/5 border-white/10 text-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-white/70">Link online</Label>
                  <Input value={eventForm.meeting_link || ""} onChange={(e) => setEventForm({ ...eventForm, meeting_link: e.target.value })} className="bg-white/5 border-white/10 text-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-white/70">Maks. pjesemarres</Label>
                  <Input type="number" value={eventForm.max_participants || ""} onChange={(e) => setEventForm({ ...eventForm, max_participants: e.target.value })} className="bg-white/5 border-white/10 text-white" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-white/70">Foto / URL</Label>
                  {eventForm.image_url && (
                    <img src={eventForm.image_url} alt="Foto e ngjarjes" className="h-32 w-full rounded-lg object-cover border border-white/10" />
                  )}
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input value={eventForm.image_url || ""} onChange={(e) => setEventForm({ ...eventForm, image_url: e.target.value })} className="bg-white/5 border-white/10 text-white" />
                    <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-[#8ab4ff]/30 bg-[#8ab4ff]/10 px-3 text-sm font-semibold text-[#8ab4ff] hover:bg-[#8ab4ff]/20">
                      {uploadingEventImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      Ngarko foto
                      <input type="file" accept="image/*" onChange={uploadEventImage} disabled={uploadingEventImage} className="hidden" />
                    </label>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
                <p className="text-white font-semibold text-sm">Ngjarje e dites / javes</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 text-white/75 text-sm">
                    <input type="checkbox" checked={!!eventForm.featured_day} onChange={(e) => setEventForm({ ...eventForm, featured_day: e.target.checked })} />
                    Ngjarje e dites
                  </label>
                  <Input type="datetime-local" value={eventForm.featured_day_expires || ""} onChange={(e) => setEventForm({ ...eventForm, featured_day_expires: e.target.value })} className="bg-white/5 border-white/10 text-white [color-scheme:dark]" />
                  <label className="flex items-center gap-2 text-white/75 text-sm">
                    <input type="checkbox" checked={!!eventForm.featured_week} onChange={(e) => setEventForm({ ...eventForm, featured_week: e.target.checked })} />
                    Ngjarje e javes
                  </label>
                  <Input type="datetime-local" value={eventForm.featured_week_expires || ""} onChange={(e) => setEventForm({ ...eventForm, featured_week_expires: e.target.value })} className="bg-white/5 border-white/10 text-white [color-scheme:dark]" />
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => saveEventEdit(editingEvent)} disabled={editEventMutation.isPending} className="flex-1 bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] font-semibold hover:opacity-90">
                  {editEventMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                  Ruaj ndryshimet
                </Button>
                <Button variant="outline" onClick={() => setEditingEvent(null)} className="border-white/15 bg-white/5 text-white hover:bg-white/10">
                  Anulo
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Detail Modal */}
      <Dialog open={!!selectedAction} onOpenChange={() => setSelectedAction(null)}>
       <DialogContent className="bg-[#0b1020] border-white/10 max-w-lg">
         <DialogHeader>
           <DialogTitle className="text-white flex items-center gap-2">
             <Badge className={
               selectedAction?.action_type === 'approve' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
               selectedAction?.action_type === 'reject' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
               selectedAction?.action_type === 'delete' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
               selectedAction?.action_type === 'permanent_delete' ? 'bg-red-600/20 text-red-300 border-red-600/30' :
               selectedAction?.action_type === 'restore' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
               'bg-gray-500/20 text-gray-400 border-gray-500/30'
             }>
               {selectedAction?.action_type === 'approve' ? 'Aprovim' :
                selectedAction?.action_type === 'reject' ? 'Refuzim' :
                selectedAction?.action_type === 'delete' ? 'Fshirje' :
                selectedAction?.action_type === 'permanent_delete' ? 'Fshirje Përgjithmonë' :
                selectedAction?.action_type === 'restore' ? 'Rikthim' :
                selectedAction?.action_type}
             </Badge>
             {selectedAction?.entity_title}
           </DialogTitle>
         </DialogHeader>
         {selectedAction && (
           <div className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
               <div>
                 <p className="text-white/60 text-xs font-medium mb-1">Lloji i entitetit</p>
                 <Badge variant="outline" className="border-white/20 text-white/60">
                   {selectedAction.entity_type === 'job' ? 'Njoftim' :
                    selectedAction.entity_type === 'event' ? 'Ngjarje' :
                    selectedAction.entity_type === 'member' ? 'Anëtar' :
                    selectedAction.entity_type === 'company' ? 'Kompani' :
                    selectedAction.entity_type}
                 </Badge>
               </div>
               <div>
                 <p className="text-white/60 text-xs font-medium mb-1">Administratori</p>
                 <p className="text-white text-sm">{selectedAction.performed_by}</p>
               </div>
             </div>

             <div className="grid grid-cols-2 gap-4">
               <div>
                 <p className="text-white/60 text-xs font-medium mb-1">Data e veprimeve</p>
                 <p className="text-white text-sm">{moment(selectedAction.created_date).format('DD/MM/YYYY HH:mm')}</p>
               </div>
               <div>
                 <p className="text-white/60 text-xs font-medium mb-1">ID e entitetit</p>
                 <p className="text-white/40 text-xs font-mono">{selectedAction.entity_id}</p>
               </div>
             </div>

             {selectedAction.previous_status && selectedAction.new_status && (
               <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                 <p className="text-white/60 text-xs font-medium mb-2">Ndryshim Statusi</p>
                 <div className="flex items-center gap-2">
                   <Badge variant="outline" className="border-white/20 text-white/60">
                     {selectedAction.previous_status}
                   </Badge>
                   <span className="text-white/40">→</span>
                   <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                     {selectedAction.new_status}
                   </Badge>
                 </div>
               </div>
             )}

             {selectedAction.reason && (
               <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                 <p className="text-white/60 text-xs font-medium mb-1">Arsyeja</p>
                 <p className="text-white text-sm">{selectedAction.reason}</p>
               </div>
             )}

             <div className="bg-white/5 border border-white/10 rounded-lg p-3">
               <p className="text-white/60 text-xs font-medium mb-1">Përshkrimi i plotë i njoftimit</p>
               <p className="text-white text-sm break-words">{selectedAction.entity_title}</p>
             </div>

             <Button
               onClick={() => setSelectedAction(null)}
               className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
             >
               Mbyll
             </Button>
           </div>
         )}
       </DialogContent>
      </Dialog>
      </div>
      );
      }
