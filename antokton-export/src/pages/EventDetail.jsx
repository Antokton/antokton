import React, { useState, useEffect } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MapPin, Users, Video, Clock, ArrowLeft, CheckCircle, UserPlus, Mail, Loader2, Copy, CalendarPlus, Download, Star, CalendarDays, Edit, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import moment from "moment";
import HijriCalendar from "../components/calendar/HijriCalendar";
import { PHONE_PLACEHOLDER, getInternationalPhoneError, isValidInternationalPhone, normalizeInternationalPhone } from "@/lib/phone";

const categoryLabels = {
  conference: "Konferencë",
  ekspedite: "Ekspeditë",
  ekspozite: "Ekspozitë",
  kampionat: "Kampionat",
  konkurs: "Konkurs",
  meetup: "Takim",
  networking: "Networking",
  panair: "Panair",
  perkujtim: "Përkujtim",
  prezantim: "Prezantim",
  promovim: "Promovim",
  social: "Sociale",
  turne: "Turne",
  vizite: "Vizitë",
  webinar: "Webinar",
  workshop: "Workshop"
};

const categoryColors = {
  conference: "bg-red-500/20 text-red-400 border-red-500/30",
  ekspedite: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  ekspozite: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  kampionat: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  konkurs: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  meetup: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  networking: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  panair: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  perkujtim: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  prezantim: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  promovim: "bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30",
  social: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  turne: "bg-teal-500/20 text-teal-400 border-teal-500/30",
  vizite: "bg-lime-500/20 text-lime-400 border-lime-500/30",
  webinar: "bg-green-500/20 text-green-400 border-green-500/30",
  workshop: "bg-purple-500/20 text-purple-400 border-purple-500/30"
};

export default function EventDetail() {
  const [user, setUser] = useState(null);
  const [eventId, setEventId] = useState(null);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [featureTarget, setFeatureTarget] = useState(null);
  const [activeTab, setActiveTab] = useState("details");
  const queryClient = useQueryClient();

  const [registerForm, setRegisterForm] = useState({
    bio: "",
    interests: "",
    networking_enabled: true
  });

  const [guestForm, setGuestForm] = useState({
    participant_name: "",
    participant_email: "",
    participant_phone: "",
    message: ""
  });

  useEffect(() => {
    const loadUser = async () => {
      const authenticated = await base44.auth.isAuthenticated();
      if (authenticated) {
        const me = await base44.auth.me();
        setUser(me);
      }
    };
    loadUser();

    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    setEventId(id);
  }, []);

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ["event", eventId],
    queryFn: async () => {
      const events = await base44.entities.Event.filter({ id: eventId });
      return events[0];
    },
    enabled: !!eventId
  });

  const isEventOrganizer = user?.email === event?.organizer_email;
  const isAdmin = user?.role === 'admin' || user?.role === 'moderator' || user?.member_category === "admin" || user?.member_category === "moderator";
  const canManageEvent = isEventOrganizer || isAdmin;
  const canViewEvent = event?.status === 'approved' || isEventOrganizer || isAdmin;

  const { data: registrations = [] } = useQuery({
    queryKey: ["eventRegistrations", eventId],
    queryFn: () => base44.entities.EventRegistration.filter({ event_id: eventId }),
    enabled: !!eventId
  });

  const { data: participants = [] } = useQuery({
    queryKey: ["eventParticipants", eventId],
    queryFn: () => base44.entities.EventParticipant.filter({ event_id: eventId }),
    enabled: !!eventId
  });

  const { data: myRegistration } = useQuery({
    queryKey: ["myRegistration", eventId, user?.email],
    queryFn: async () => {
      const regs = await base44.entities.EventRegistration.filter({ 
        event_id: eventId, 
        user_email: user.email 
      });
      return regs[0];
    },
    enabled: !!eventId && !!user
  });

  const registerMutation = useMutation({
    mutationFn: (data) => base44.entities.EventRegistration.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventRegistrations"] });
      queryClient.invalidateQueries({ queryKey: ["myRegistration"] });
      setShowRegisterForm(false);
    }
  });

  const guestRegisterMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.EventParticipant.create(data);
      // Send notification to organizer
      await base44.entities.Notification.create({
        user_email: event.organizer_email,
        type: 'system',
        title: 'Pjesëmarrës i ri në ngjarjen tuaj',
        message: `${data.participant_name} u regjistrua për ngjarjen "${event.title}"`,
        link: `/event-detail?id=${eventId}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventParticipants"] });
      setShowGuestForm(false);
      setGuestForm({
        participant_name: "",
        participant_email: "",
        participant_phone: "",
        message: ""
      });
      alert("U regjistruat me sukses! Organizatori do t'ju kontaktojë.");
    }
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => base44.entities.EventRegistration.update(id, { status: "cancelled" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventRegistrations"] });
      queryClient.invalidateQueries({ queryKey: ["myRegistration"] });
    }
  });

  const isFeatureActive = (item, type) => {
    const flag = type === "day" ? item?.featured_day : item?.featured_week;
    const expires = type === "day" ? item?.featured_day_expires : item?.featured_week_expires;
    if (!flag) return false;
    if (!expires) return true;
    return new Date(expires) > new Date();
  };

  const canFeatureEvent = (item) => !["rejected", "deleted_public", "deletion_requested"].includes(item?.status || "approved");

  const featureDurationOptions = (type) => type === "day"
    ? [
        { label: "1 dite", days: 1 },
        { label: "3 dite", days: 3 },
        { label: "7 dite", days: 7 },
        { label: "Pa afat", days: null, hint: "Derisa te vendoset nje tjeter" }
      ]
    : [
        { label: "1 jave", days: 7 },
        { label: "2 jave", days: 14 },
        { label: "4 jave", days: 28 },
        { label: "Pa afat", days: null, hint: "Derisa te vendoset nje tjeter" }
      ];

  const featureMutation = useMutation({
    mutationFn: async ({ type, enable, expires }) => {
      const flagKey = type === "day" ? "featured_day" : "featured_week";
      const expiresKey = type === "day" ? "featured_day_expires" : "featured_week_expires";
      const data = {
        featured_by: user.email,
        [flagKey]: enable,
        [expiresKey]: enable ? expires : null,
        ...(enable && event.status === "pending" ? { status: "approved" } : {}),
        ...(enable ? {
          featured_request_status: null,
          featured_request_type: null,
          featured_request_duration_days: null,
          featured_requested_by: null,
          featured_requested_at: null
        } : {})
      };

      if (enable) {
        const oldFeaturedEvents = await base44.entities.Event.filter({ [flagKey]: true }, "-updated_date", 50);
        await Promise.all(
          oldFeaturedEvents
            .filter(item => item.id !== event.id)
            .map(item => base44.entities.Event.update(item.id, {
              [flagKey]: false,
              [expiresKey]: null
            }))
        );
      }

      await base44.entities.Event.update(event.id, data);

      try {
        await base44.entities.AdminAction.create({
          action_type: enable ? `feature_${type}` : `unfeature_${type}`,
          entity_type: "event",
          entity_id: event.id,
          entity_title: event.title || "",
          performed_by: user.email
        });
      } catch {
        // Logging must not block the public action.
      }
    },
    onSuccess: () => {
      setFeatureTarget(null);
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["adminEvents"] });
      queryClient.invalidateQueries({ queryKey: ["featuredDayNotif"] });
      queryClient.invalidateQueries({ queryKey: ["featuredWeekNotif"] });
    }
  });

  const featureRequestMutation = useMutation({
    mutationFn: async ({ type, days }) => {
      const data = {
        featured_request_type: type,
        featured_request_duration_days: days,
        featured_request_status: "pending",
        featured_requested_by: user.email,
        featured_requested_at: new Date().toISOString()
      };
      await base44.entities.Event.update(event.id, data);

      try {
        await base44.entities.AdminAction.create({
          action_type: `request_feature_${type}`,
          entity_type: "event",
          entity_id: event.id,
          entity_title: event.title || "",
          performed_by: user.email,
          new_status: "pending"
        });
      } catch {
        // Logging must not block the request.
      }
    },
    onSuccess: () => {
      setFeatureTarget(null);
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      queryClient.invalidateQueries({ queryKey: ["adminEvents"] });
      alert("Kerkesa u dergua per miratim te administratori.");
    }
  });

  const openFeatureFlow = (type) => {
    if (!event || !user) return;
    if (isAdmin && isFeatureActive(event, type)) {
      const message = type === "day" ? "Hiq si ngjarje e dites?" : "Hiq si ngjarje e javes?";
      if (!confirm(message)) return;
      featureMutation.mutate({ type, enable: false, expires: null });
      return;
    }
    setFeatureTarget({ type, mode: isAdmin ? "direct" : "request" });
  };

  const applyFeatureChoice = (days) => {
    if (!featureTarget) return;
    if (featureTarget.mode === "request") {
      featureRequestMutation.mutate({ type: featureTarget.type, days });
      return;
    }
    const expires = days ? new Date() : null;
    if (expires) expires.setDate(expires.getDate() + days);
    featureMutation.mutate({
      type: featureTarget.type,
      enable: true,
      expires: expires ? expires.toISOString() : null
    });
  };

  const handleRegister = () => {
    if (!user) {
      setShowGuestForm(true);
      return;
    }
    setShowRegisterForm(true);
  };

  const handleGuestSubmit = (e) => {
    e.preventDefault();
    if (!isValidInternationalPhone(guestForm.participant_phone)) {
      alert(getInternationalPhoneError("Numri i telefonit"));
      return;
    }
    guestRegisterMutation.mutate({
      event_id: eventId,
      participant_name: guestForm.participant_name,
      participant_email: guestForm.participant_email,
      participant_phone: normalizeInternationalPhone(guestForm.participant_phone) || null,
      is_member: false
    });
  };

  const handleSubmitRegistration = (e) => {
    e.preventDefault();
    registerMutation.mutate({
      event_id: eventId,
      user_email: user.email,
      user_name: user.first_name && user.surname ? `${user.first_name} ${user.surname}` : user.full_name || user.email,
      ...registerForm
    });
  };

  const handleCancelRegistration = () => {
    if (confirm("Jeni të sigurt që doni të anuloni regjistrimin?")) {
      cancelMutation.mutate(myRegistration.id);
    }
  };

  const handleShare = (platform) => {
    const url = window.location.href;
    const text = `${event.title} - Antokton`;
    
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

  const handleAddToGoogleCalendar = () => {
    const startDate = new Date(event.event_date);
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // 2 hours duration
    
    const formatDate = (date) => {
      return date.toISOString().replace(/-|:|\.\d{3}/g, '');
    };
    
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${formatDate(startDate)}/${formatDate(endDate)}&details=${encodeURIComponent(event.description || '')}&location=${encodeURIComponent(event.location || event.meeting_link || '')}`;
    
    window.open(url, '_blank');
  };

  const handleDownloadICS = () => {
    const startDate = new Date(event.event_date);
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
    
    const formatDate = (date) => {
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      const hours = String(date.getUTCHours()).padStart(2, '0');
      const minutes = String(date.getUTCMinutes()).padStart(2, '0');
      const seconds = String(date.getUTCSeconds()).padStart(2, '0');
      return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
    };
    
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Antokton//Events//EN',
      'BEGIN:VEVENT',
      `UID:${event.id}@antokton.com`,
      `DTSTAMP:${formatDate(new Date())}`,
      `DTSTART:${formatDate(startDate)}`,
      `DTEND:${formatDate(endDate)}`,
      `SUMMARY:${event.title}`,
      `DESCRIPTION:${(event.description || '').replace(/\n/g, '\\n')}`,
      event.location ? `LOCATION:${event.location}` : event.meeting_link ? `LOCATION:${event.meeting_link}` : '',
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].filter(Boolean).join('\r\n');
    
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.title.replace(/[^a-z0-9]/gi, '_')}.ics`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  const networkingParticipants = registrations.filter(r => r.networking_enabled && r.status === "registered");
  const isRegistered = myRegistration && myRegistration.status === "registered";
  const totalRegistrations = registrations.filter(r => r.status === "registered").length + participants.length;
  const isFull = event?.max_participants && totalRegistrations >= event.max_participants;

  if (eventLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-white/30 animate-spin" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-white/40">Nuk u gjet ngjarje</p>
        <Link to={createPageUrl("Events")} className="text-[#8ab4ff] text-sm mt-2 inline-block">
          Kthehu te ngjarjet
        </Link>
      </div>
    );
  }

  if (!canViewEvent) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-white/40 text-lg">Kjo ngjarje nuk është e disponueshme</p>
        <Link to={createPageUrl("Events")} className="text-[#8ab4ff] text-sm mt-2 inline-block">
          Kthehu te ngjarjet
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto overflow-x-hidden px-4 sm:px-6 py-8">
      <Link to={createPageUrl("Events")} className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Kthehu te ngjarjet
      </Link>

      {isEventOrganizer && event.status === 'pending' && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
          <p className="text-yellow-400 font-medium">⏳ Kjo ngjarje është në pritje të aprovimit nga stafi</p>
        </div>
      )}

      {isEventOrganizer && event.status === 'rejected' && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
          <p className="text-red-400 font-medium">❌ Kjo ngjarje u refuzua nga stafi</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-transparent border-white/10">
            <CardContent className="p-6">
              <div className="flex min-w-0 flex-col gap-4 mb-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <Badge className={`border ${categoryColors[event.category]} mb-3`}>
                    {categoryLabels[event.category]}
                  </Badge>
                  
                  <h1 className="break-words text-2xl font-bold text-white sm:text-3xl">{event.title}</h1>
                </div>
                <div
                  data-swipe-back-ignore
                  className="flex max-w-full gap-1 overflow-x-auto pb-1 sm:w-auto sm:justify-end"
                  style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x pan-y' }}
                >
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleShare('facebook')}
                    className="h-8 w-8 shrink-0 p-0 text-white/60 hover:bg-transparent hover:text-blue-400"
                    title="Shpërndaj në Facebook"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleShare('linkedin')}
                    className="h-8 w-8 shrink-0 p-0 text-white/60 hover:bg-transparent hover:text-blue-500"
                    title="Shpërndaj në LinkedIn"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleShare('whatsapp')}
                    className="h-8 w-8 shrink-0 p-0 text-white/60 hover:bg-transparent hover:text-green-500"
                    title="Shpërndaj në WhatsApp"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleShare('twitter')}
                    className="h-8 w-8 shrink-0 p-0 text-white/60 hover:bg-transparent hover:text-sky-400"
                    title="Shpërndaj në Twitter/X"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleShare('copy')}
                    className="h-8 w-8 shrink-0 p-0 text-white/60 hover:bg-transparent hover:text-white"
                    title="Kopjo linkun"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-white/60">
                  <Clock className="w-5 h-5" />
                  <div className="flex flex-col gap-1">
                    <span>{moment(event.event_date).format("dddd, D MMMM YYYY · HH:mm")}</span>
                    <HijriCalendar gregorianDate={event.event_date} className="text-xs" />
                  </div>
                </div>

                {event.is_virtual ? (
                  <div className="flex items-center gap-3 text-white/60">
                    <Video className="w-5 h-5" />
                    <span>Ngjarje virtuale</span>
                  </div>
                ) : event.location && (
                  <div className="flex items-center gap-3 text-white/60">
                    <MapPin className="w-5 h-5" />
                    <span>{event.location}</span>
                  </div>
                )}

                <div className="flex items-center gap-3 text-white/60">
                  <Users className="w-5 h-5" />
                  <span>
                    {totalRegistrations}
                    {event.max_participants && ` / ${event.max_participants}`} të regjistruar
                  </span>
                </div>
              </div>

              <div className="border-t border-white/10 pt-6">
                <div
                  data-swipe-back-ignore
                  className="flex max-w-full gap-2 overflow-x-auto pb-1 mb-4"
                  style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x pan-y' }}
                >
                  <button
                    onClick={() => setActiveTab("details")}
                    className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === "details" 
                        ? "bg-white/10 text-white" 
                        : "text-white/50 hover:text-white"
                    }`}
                  >
                    Detajet
                  </button>
                  <button
                    onClick={() => setActiveTab("networking")}
                    className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === "networking" 
                        ? "bg-white/10 text-white" 
                        : "text-white/50 hover:text-white"
                    }`}
                  >
                    Networking ({networkingParticipants.length})
                  </button>
                </div>

                {activeTab === "details" ? (
                  <div className="prose prose-invert max-w-none">
                    <div className="text-white/70 leading-relaxed whitespace-pre-wrap">
                      {event.description.split(/(https?:\/\/[^\s]+)/g).map((part, i) => {
                        if (part.match(/https?:\/\/[^\s]+/)) {
                          return (
                            <a
                              key={i}
                              href={part}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#8ab4ff] hover:text-[#9bffd6] underline"
                            >
                              {part}
                            </a>
                          );
                        }
                        return <span key={i}>{part}</span>;
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {!isRegistered && (
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-yellow-200 text-sm">
                        Regjistrohuni për të parë pjesëmarrësit dhe për networking
                      </div>
                    )}

                    {isRegistered && networkingParticipants.length === 0 && (
                      <p className="text-white/40 text-center py-8">
                        Ende nuk ka pjesëmarrës që dëshirojnë networking
                      </p>
                    )}

                    {isRegistered && networkingParticipants.map((participant) => (
                      <Card key={participant.id} className="bg-transparent border-white/10">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-white mb-1">{participant.user_name}</h4>
                              {participant.bio && (
                                <p className="text-white/60 text-sm mb-2">{participant.bio}</p>
                              )}
                              {participant.interests && (
                                <p className="text-white/50 text-xs">
                                  <span className="font-medium">Interesat:</span> {participant.interests}
                                </p>
                              )}
                            </div>
                            {user?.email !== participant.user_email && (
                              <a
                                href={`mailto:${participant.user_email}`}
                                className="ml-4 p-2 rounded-lg bg-transparent hover:bg-white/10 transition-colors"
                              >
                                <Mail className="w-4 h-4 text-white/60" />
                              </a>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="bg-transparent border-white/10 sticky top-24">
            <CardContent className="p-6">
              {!user ? (
                <Button
                  onClick={handleRegister}
                  className="w-full bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] hover:opacity-90"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Regjistrohu
                </Button>
              ) : isRegistered ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-green-400 mb-4">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Jeni regjistruar</span>
                  </div>

                  {event.meeting_link && (
                    <a
                      href={event.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full text-center px-4 py-2 rounded-lg bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] font-medium hover:opacity-90 transition-opacity"
                    >
                      <Video className="w-4 h-4 inline mr-2" />
                      Hyr në takim
                    </a>
                  )}

                  <Button
                    variant="outline"
                    onClick={handleCancelRegistration}
                    className="w-full border-white/10 text-white/70 hover:bg-transparent"
                  >
                    Anulo regjistrimin
                  </Button>
                </div>
              ) : isFull ? (
                <Button
                  disabled
                  className="w-full bg-gray-500 text-gray-300 cursor-not-allowed"
                >
                  Plotësuar
                </Button>
              ) : (
                <Button
                  onClick={handleRegister}
                  className="w-full bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] hover:opacity-90"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Regjistrohu
                </Button>
              )}

              {canManageEvent && (
                <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-white font-semibold text-sm">Menaxhim</p>
                    {event.featured_request_status === "pending" && (
                      <Badge className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">
                        Kerkese ne pritje
                      </Badge>
                    )}
                  </div>

                  <Button
                    asChild
                    variant="outline"
                    className="w-full justify-start gap-2 bg-white/5 border-white/10 text-white hover:bg-white/10"
                  >
                    <Link to={`${createPageUrl("Events")}?edit=${event.id}`}>
                      <Edit className="w-4 h-4 text-[#8ab4ff]" />
                      Perpuno ngjarjen
                    </Link>
                  </Button>

                  {canFeatureEvent(event) && (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => openFeatureFlow("day")}
                        disabled={!isAdmin && event.featured_request_status === "pending"}
                        className={`h-auto min-h-12 justify-start gap-2 rounded-lg px-2.5 text-left ${
                          isFeatureActive(event, "day")
                            ? "bg-gradient-to-r from-yellow-500/25 to-orange-500/20 border-yellow-400/45 text-yellow-100 hover:from-yellow-500/30 hover:to-orange-500/25"
                            : "bg-gradient-to-r from-yellow-500/10 to-orange-500/5 border-yellow-500/25 text-yellow-100/85 hover:from-yellow-500/20 hover:to-orange-500/10"
                        }`}
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-yellow-300/15">
                          <Star className="h-3.5 w-3.5 text-yellow-200" />
                        </span>
                        <span className="flex min-w-0 flex-col leading-tight">
                          <span className="truncate text-[11px] font-semibold">
                            {isAdmin
                              ? (isFeatureActive(event, "day") ? "Hiq Dites" : "Vendos Dites")
                              : (isFeatureActive(event, "day") ? "Aktive" : "Kerko Dites")}
                          </span>
                          <span className="truncate text-[9px] text-yellow-100/55">Mesazhi i dites</span>
                        </span>
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => openFeatureFlow("week")}
                        disabled={!isAdmin && event.featured_request_status === "pending"}
                        className={`h-auto min-h-12 justify-start gap-2 rounded-lg px-2.5 text-left ${
                          isFeatureActive(event, "week")
                            ? "bg-gradient-to-r from-blue-500/25 to-cyan-500/20 border-blue-400/45 text-blue-100 hover:from-blue-500/30 hover:to-cyan-500/25"
                            : "bg-gradient-to-r from-blue-500/10 to-cyan-500/5 border-blue-500/25 text-blue-100/85 hover:from-blue-500/20 hover:to-cyan-500/10"
                        }`}
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-300/15">
                          <CalendarDays className="h-3.5 w-3.5 text-blue-200" />
                        </span>
                        <span className="flex min-w-0 flex-col leading-tight">
                          <span className="truncate text-[11px] font-semibold">
                            {isAdmin
                              ? (isFeatureActive(event, "week") ? "Hiq Javes" : "Vendos Javes")
                              : (isFeatureActive(event, "week") ? "Aktive" : "Kerko Javes")}
                          </span>
                          <span className="truncate text-[9px] text-blue-100/55">Ngjarja e javes</span>
                        </span>
                      </Button>
                    </div>
                  )}

                  {!isAdmin && event.featured_request_status === "pending" && (
                    <p className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-2 text-[11px] text-yellow-100/75">
                      Kerkesa per {event.featured_request_type === "day" ? "ngjarje te dites" : "ngjarje te javes"} po pret miratimin e administratorit.
                    </p>
                  )}
                </div>
              )}

              <div className="mt-4 space-y-2">
                <Button
                  onClick={handleAddToGoogleCalendar}
                  variant="outline"
                  className="bg-transparent border-white/30 text-white hover:bg-white/10"
                >
                  <CalendarPlus className="w-4 h-4 mr-2" />
                  Google Calendar
                </Button>
                <Button
                  onClick={handleDownloadICS}
                  variant="outline"
                  className="w-full bg-transparent border-white/30 text-white hover:bg-white/10"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Shkarko .ics
                </Button>
              </div>

              <div className="mt-6 pt-6 border-t border-white/10 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/50">Organizuar nga</span>
                  <span className="text-white">{event.organizer_email?.split("@")[0]}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/50">Kategoria</span>
                  <span className="text-white">{categoryLabels[event.category]}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AnimatePresence>
        {showRegisterForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowRegisterForm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0b1020] border border-white/10 rounded-2xl p-6 max-w-lg w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold text-white mb-4">Plotëso regjistrimin</h2>
              
              <form onSubmit={handleSubmitRegistration} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-white/70">Jetëshkrim (opsional)</Label>
                  <Textarea
                    value={registerForm.bio}
                    onChange={(e) => setRegisterForm({ ...registerForm, bio: e.target.value })}
                    placeholder="Trego pak për veten..."
                    className="bg-transparent border-white/30 text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-white/70">Interesat (opsionale)</Label>
                  <Input
                    value={registerForm.interests}
                    onChange={(e) => setRegisterForm({ ...registerForm, interests: e.target.value })}
                    placeholder="p.sh. Marketing, Teknologji, Startup"
                    className=""
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="networking_enabled"
                    checked={registerForm.networking_enabled}
                    onChange={(e) => setRegisterForm({ ...registerForm, networking_enabled: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="networking_enabled" className="text-white/70">
                    Dëshiroj të kontaktohem për networking
                  </Label>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowRegisterForm(false)}
                    className="flex-1 border-white/10 text-white hover:bg-transparent"
                  >
                    Anulo
                  </Button>
                  <Button
                    type="submit"
                    disabled={registerMutation.isPending}
                    className="flex-1 bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] hover:opacity-90"
                  >
                    {registerMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Regjistrohu"
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showGuestForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowGuestForm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0b1020] border border-white/10 rounded-2xl p-6 max-w-lg w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold text-white mb-4">Regjistrohu për ngjarjen</h2>
              
              <form onSubmit={handleGuestSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-white/70">Emri i plotë *</Label>
                  <Input
                    required
                    value={guestForm.participant_name}
                    onChange={(e) => setGuestForm({ ...guestForm, participant_name: e.target.value })}
                    placeholder="Emri Mbiemri"
                    className=""
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-white/70">Email *</Label>
                  <Input
                    required
                    type="email"
                    value={guestForm.participant_email}
                    onChange={(e) => setGuestForm({ ...guestForm, participant_email: e.target.value })}
                    placeholder="email@example.com"
                    className=""
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-white/70">Numri i telefonit (opsional)</Label>
                  <Input
                    value={guestForm.participant_phone}
                    onChange={(e) => setGuestForm({ ...guestForm, participant_phone: e.target.value })}
                    placeholder={PHONE_PLACEHOLDER}
                    className=""
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-white/70">Mesazh për organizatorin (opsional)</Label>
                  <Textarea
                    value={guestForm.message}
                    onChange={(e) => setGuestForm({ ...guestForm, message: e.target.value })}
                    placeholder="Pyetje ose komente..."
                    className=""
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowGuestForm(false)}
                    className="flex-1 border-white/10 text-white hover:bg-transparent"
                  >
                    Anulo
                  </Button>
                  <Button
                    type="submit"
                    disabled={guestRegisterMutation.isPending}
                    className="flex-1 bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] hover:opacity-90"
                  >
                    {guestRegisterMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Regjistrohu"
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {featureTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            onClick={() => setFeatureTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`bg-[#0b1020] border rounded-2xl p-5 max-w-md w-full shadow-2xl ${
                featureTarget.type === "day"
                  ? "border-yellow-500/25 shadow-yellow-950/30"
                  : "border-blue-500/25 shadow-blue-950/30"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex min-w-0 items-start gap-3">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
                    featureTarget.type === "day"
                      ? "border-yellow-400/30 bg-gradient-to-br from-yellow-500/25 to-orange-500/15 text-yellow-100"
                      : "border-blue-400/30 bg-gradient-to-br from-blue-500/25 to-cyan-500/15 text-blue-100"
                  }`}>
                    {featureTarget.type === "day"
                      ? <Star className="h-5 w-5" />
                      : <CalendarDays className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-white">
                      {featureTarget.mode === "request" ? "Dergo kerkese" : "Vendos ngjarjen"}
                    </h2>
                    <p className="text-white/55 text-xs mt-1 line-clamp-2">
                      {featureTarget.type === "day" ? "Ngjarje e dites" : "Ngjarje e javes"}: {event.title}
                    </p>
                  </div>
                </div>
                <button onClick={() => setFeatureTarget(null)} className="text-white/40 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-white/65 text-sm mb-4">
                {featureTarget.mode === "request"
                  ? 'Zgjidh afatin qe do t\'i dergohet administratorit per miratim.'
                  : 'Zgjidh sa kohe do te shfaqet. Opsioni "Pa afat" rri aktiv derisa te vendosesh nje ngjarje tjeter ne vend te saj.'}
              </p>

              <div className="grid grid-cols-2 gap-2">
                {featureDurationOptions(featureTarget.type).map((option) => (
                  <Button
                    key={`${featureTarget.type}-${featureTarget.mode}-${option.label}`}
                    type="button"
                    variant="outline"
                    onClick={() => applyFeatureChoice(option.days)}
                    disabled={featureMutation.isPending || featureRequestMutation.isPending}
                    className={`h-auto min-h-14 flex-col gap-0.5 rounded-xl border text-white shadow-sm transition-all ${
                      featureTarget.type === "day"
                        ? "bg-gradient-to-br from-yellow-500/20 to-orange-500/10 border-yellow-500/25 hover:from-yellow-500/30 hover:to-orange-500/20"
                        : "bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border-blue-500/25 hover:from-blue-500/30 hover:to-cyan-500/20"
                    }`}
                  >
                    <span className="text-sm font-semibold">{option.label}</span>
                    {option.hint && <span className="text-[10px] text-white/55">{option.hint}</span>}
                  </Button>
                ))}
              </div>

              <div className={`mt-4 rounded-xl border p-3 text-[11px] text-white/60 ${
                featureTarget.type === "day"
                  ? "border-yellow-500/20 bg-yellow-500/10"
                  : "border-blue-500/20 bg-blue-500/10"
              }`}>
                {featureTarget.mode === "request"
                  ? "Kjo nuk publikohet direkt; administratori e miraton ose e refuzon kerkesen."
                  : "Kur vendos nje ngjarje te re, e vjetra hiqet automatikisht nga ai pozicion."}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
