import React, { useState, useEffect } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Loader2, Plus, MapPin, Users, Video, Clock, Edit, Trash2, X, Upload, Image as ImageIcon, Star, CalendarDays } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import moment from "moment";
import HijriCalendar, { gregorianToHijri, hijriMonths } from "../components/calendar/HijriCalendar";

const hijriToGregorian = (hijriYear, hijriMonth, hijriDay) => {
  const N = Math.ceil(10.646 * ((hijriYear) * 30 + hijriMonth) - 404) + hijriDay;
  let q = Math.floor(N / 146097);
  let r = N % 146097;
  let a = Math.floor(r / 36524);
  let w = r % 36524;
  
  let aCalc = Math.floor(w / 365) - Math.floor(w / 1461);
  let gregYear = 400 * q + 100 * a + 4 * Math.floor(w / 1461) + aCalc;
  let gregRemainder = w - 365 * aCalc - 1461 * Math.floor(w / 1461);
  
  let gregMonth = Math.floor((2 + 5 * gregRemainder) / 153);
  let gregDay = gregRemainder - Math.floor((153 * gregMonth + 2) / 5) + 1;
  
  if (gregMonth > 12) {
    gregYear += 1;
    gregMonth -= 12;
  }
  
  return new Date(gregYear, gregMonth - 1, gregDay);
};

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

export default function Events() {
  React.useEffect(() => {
    document.title = 'Ngjarjet Antokton - Networking dhe Aktivitete';
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Aktivitete, konferenca dhe evente për komunitetin Antokton.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Aktivitete, konferenca dhe evente për komunitetin Antokton.';
      document.head.appendChild(meta);
    }
  }, []);

  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("upcoming");
  const [countryFilter, setCountryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [featureTarget, setFeatureTarget] = useState(null);
  const autoEditHandled = React.useRef(false);
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    title: "",
    description: "",
    event_date: "",
    location: "",
    country: "",
    category: "meetup",
    max_participants: "",
    is_virtual: false,
    meeting_link: "",
    image_url: "",
    event_type: "in_person",
    visibility: "public",
    visible_to_countries: [],
    visible_to_cities: [],
    visible_to_age_min: null,
    visible_to_age_max: null,
    visible_to_genders: [],
    visible_to_religions: [],
    visible_to_education: [],
    is_recurring: false,
    recurrence_pattern: "weekly",
    recurrence_end_date: ""
  });

  const [uploadingImage, setUploadingImage] = useState(false);

  const [calendarType, setCalendarType] = useState("gregorian");
  const [hijriForm, setHijriForm] = useState({ day: "", month: "", monthName: "", year: "", time: "00:00" });

  const handleCalendarTypeChange = (val) => {
    setCalendarType(val);
    if (val === "hijri") {
      if (form.event_date) {
        const hijri = gregorianToHijri(form.event_date);
        const time = form.event_date.split("T")[1] || "00:00";
        setHijriForm({ 
          day: String(hijri.day), 
          month: String(hijri.month), 
          monthName: hijriMonths[hijri.month - 1],
          year: String(hijri.year), 
          time 
        });
      } else {
        const today = new Date();
        const hijri = gregorianToHijri(today.toISOString());
        setHijriForm({ 
          day: String(hijri.day), 
          month: String(hijri.month), 
          monthName: hijriMonths[hijri.month - 1],
          year: String(hijri.year), 
          time: "00:00" 
        });
      }
    }
  };

  useEffect(() => {
    const loadUser = async () => {
      const authenticated = await base44.auth.isAuthenticated();
      if (authenticated) {
        const me = await base44.auth.me();
        setUser(me);
      }
    };
    loadUser();
  }, []);

  const canAdminEvents = user?.role === "admin" || user?.role === "moderator" || user?.member_category === "admin" || user?.member_category === "moderator";

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events", user?.email, user?.role, user?.member_category],
    queryFn: async () => {
      const allEvents = await base44.entities.Event.list("-event_date", 200);
      if (canAdminEvents) {
        return allEvents;
      }
      return allEvents.filter(event => event.status === "approved" || (user?.email && event.organizer_email === user.email));
    },
    enabled: true
  });

  const { data: allParticipants = [] } = useQuery({
    queryKey: ["allEventParticipants"],
    queryFn: () => base44.entities.EventParticipant.list()
  });

  const isFeatureActive = (event, type) => {
    const flag = type === "day" ? event.featured_day : event.featured_week;
    const expires = type === "day" ? event.featured_day_expires : event.featured_week_expires;
    if (!flag) return false;
    if (!expires) return true;
    return new Date(expires) > new Date();
  };

  const canFeatureEvent = (event) => ["approved", "aktiv"].includes(event.status || "approved");

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
    mutationFn: async ({ event, type, enable, expires }) => {
      const flagKey = type === "day" ? "featured_day" : "featured_week";
      const expiresKey = type === "day" ? "featured_day_expires" : "featured_week_expires";
      const data = { featured_by: user.email };
      data[flagKey] = enable;
      data[expiresKey] = enable ? expires : null;

      if (enable) {
        const oldFeaturedEvents = events.filter(item => item.id !== event.id && item[flagKey]);
        await Promise.all(
          oldFeaturedEvents.map(item => base44.entities.Event.update(item.id, {
            [flagKey]: false,
            [expiresKey]: null
          }))
        );
      }

      return base44.entities.Event.update(event.id, data);
    },
    onSuccess: () => {
      setFeatureTarget(null);
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["adminEvents"] });
      queryClient.invalidateQueries({ queryKey: ["featuredDayNotif"] });
      queryClient.invalidateQueries({ queryKey: ["featuredWeekNotif"] });
    }
  });

  const toggleFeaturedEvent = (event, type) => {
    const active = isFeatureActive(event, type);
    if (active) {
      const message = type === "day" ? "Hiq si ngjarje e dites?" : "Hiq si ngjarje e javes?";
      if (!confirm(message)) return;
      featureMutation.mutate({ event, type, enable: false, expires: null });
      return;
    }

    setFeatureTarget({ event, type });
  };

  const applyFeaturedEvent = (days) => {
    if (!featureTarget) return;
    const expires = days ? new Date() : null;
    if (expires) expires.setDate(expires.getDate() + days);
    featureMutation.mutate({
      event: featureTarget.event,
      type: featureTarget.type,
      enable: true,
      expires: expires ? expires.toISOString() : null
    });
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Event.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["adminEvents"] });
      resetForm();
      alert("Ngarja u krijua me sukses! Do të shqyrtohet nga stafi.");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Event.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["adminEvents"] });
      queryClient.invalidateQueries({ queryKey: ["featuredDayNotif"] });
      queryClient.invalidateQueries({ queryKey: ["featuredWeekNotif"] });
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Event.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    }
  });

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      event_date: "",
      location: "",
      country: "",
      category: "meetup",
      max_participants: "",
      is_virtual: false,
      meeting_link: "",
      image_url: "",
      event_type: "in_person",
      visibility: "public",
      visible_to_countries: [],
      visible_to_cities: [],
      visible_to_age_min: null,
      visible_to_age_max: null,
      visible_to_genders: [],
      visible_to_religions: [],
      visible_to_education: [],
      is_recurring: false,
      recurrence_pattern: "weekly",
      recurrence_end_date: ""
    });
    setShowForm(false);
    setEditingEvent(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const data = {
      ...form,
      organizer_email: editingEvent?.organizer_email || user.email,
      status: editingEvent?.status || (canAdminEvents ? "approved" : "pending"),
      max_participants: form.max_participants ? Number(form.max_participants) : null
    };

    if (editingEvent) {
      updateMutation.mutate({ id: editingEvent.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (event) => {
    setEditingEvent(event);
    setForm({
      title: event.title,
      description: event.description,
      event_date: moment(event.event_date).format("YYYY-MM-DDTHH:mm"),
      location: event.location || "",
      country: event.country || "",
      category: event.category,
      max_participants: event.max_participants || "",
      is_virtual: event.is_virtual || false,
      meeting_link: event.meeting_link || "",
      image_url: event.image_url || "",
      event_type: event.event_type || "in_person",
      visibility: event.visibility || "public",
      visible_to_countries: event.visible_to_countries || [],
      visible_to_cities: event.visible_to_cities || [],
      visible_to_age_min: event.visible_to_age_min || null,
      visible_to_age_max: event.visible_to_age_max || null,
      visible_to_genders: event.visible_to_genders || [],
      visible_to_religions: event.visible_to_religions || [],
      visible_to_education: event.visible_to_education || [],
      is_recurring: event.is_recurring || false,
      recurrence_pattern: event.recurrence_pattern || "weekly",
      recurrence_end_date: event.recurrence_end_date ? moment(event.recurrence_end_date).format("YYYY-MM-DDTHH:mm") : ""
    });
    setShowForm(true);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const editId = params.get("edit");
    if (!editId || autoEditHandled.current || !events.length || !user) return;

    const target = events.find(item => item.id === editId);
    if (!target) return;
    if (target.organizer_email !== user.email && !canAdminEvents) return;

    autoEditHandled.current = true;
    handleEdit(target);
    window.history.replaceState({}, "", createPageUrl("Events"));
  }, [events, user, canAdminEvents]);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm({ ...form, image_url: file_url });
    } catch (error) {
      console.error("Gabim gjatë ngarkimit të fotos:", error);
      alert("Gabim gjatë ngarkimit të fotos");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDelete = (event) => {
    if (canAdminEvents) {
      if (!confirm("Deshironi ta hiqni kete ngjarje nga publikimi?")) return;
      updateMutation.mutate({
        id: event.id,
        data: {
          status: "deleted_public",
          deleted_by: user.email,
          deleted_at: new Date().toISOString()
        }
      });
      return;
    }
    if (confirm("Dëshironi të kërkoni fshirjen e kësaj ngjarjeje? Stafi do ta shqyrtojë.")) {
      updateMutation.mutate({ 
        id: event.id, 
        data: { 
          status: 'deletion_requested',
          deleted_by: user.email,
          deleted_at: new Date().toISOString()
        } 
      });
    }
  };

  const uniqueCountries = [...new Set(events.map(e => e.country).filter(Boolean))];

  const filteredEvents = events.filter(event => {
    const now = new Date();
    const eventDate = new Date(event.event_date);
    
    if (categoryFilter !== "all" && event.category !== categoryFilter) return false;
    
    if (dateFilter === "upcoming" && eventDate < now) return false;
    if (dateFilter === "past" && eventDate >= now) return false;
    if (dateFilter === "this_week") {
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      if (eventDate < now || eventDate > weekFromNow) return false;
    }
    if (dateFilter === "this_month") {
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      if (eventDate < now || eventDate > monthEnd) return false;
    }
    if (dateFilter === "next_month") {
      const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);
      if (eventDate < nextMonthStart || eventDate > nextMonthEnd) return false;
    }
    
    if (countryFilter !== "all" && event.country !== countryFilter) return false;
    if (typeFilter !== "all" && event.event_type !== typeFilter) return false;
    
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-xl font-black text-white tracking-wide uppercase">Kalendari i ngjarjeve</h1>
          <p className="text-white/75 text-xs">Organizoni dhe menaxhoni ngjarje komunitare</p>
        </div>
        {user && (
          <Button
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] hover:opacity-90 h-7 text-xs px-3"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Shto ngjarje
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-1.5 mb-3">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-xs">
            <SelectValue placeholder="Kategoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Të gjitha kategoritë</SelectItem>
            {Object.entries(categoryLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-xs">
            <SelectValue placeholder="Data" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Të gjitha datat</SelectItem>
            <SelectItem value="upcoming">Të ardhshme</SelectItem>
            <SelectItem value="this_week">Këtë javë</SelectItem>
            <SelectItem value="this_month">Këtë muaj</SelectItem>
            <SelectItem value="next_month">Muajin tjetër</SelectItem>
            <SelectItem value="past">Të kaluara</SelectItem>
          </SelectContent>
        </Select>

        <Select value={countryFilter} onValueChange={setCountryFilter}>
          <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-xs">
            <SelectValue placeholder="Vendi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Të gjitha vendet</SelectItem>
            {uniqueCountries.map(country => (
              <SelectItem key={country} value={country}>{country}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-xs">
            <SelectValue placeholder="Lloji" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Të gjitha llojet</SelectItem>
            <SelectItem value="online">Prezencë online</SelectItem>
            <SelectItem value="in_person">Prezencë Fizike</SelectItem>
            <SelectItem value="hybrid">Të dyja</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-white/70 animate-spin" />
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-20">
          <CalendarIcon className="w-12 h-12 text-white/50 mx-auto mb-4" />
          <p className="text-white/70">Nuk ka ngjarje</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {filteredEvents.map((event, i) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="bg-white/5 border-white/10 hover:bg-white/8 transition-colors">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between mb-1.5">
                    <div className="flex gap-1.5 flex-wrap">
                      <Badge className={`border text-[10px] py-0 px-1.5 ${categoryColors[event.category]}`}>
                        {categoryLabels[event.category]}
                      </Badge>
                      {event.status === 'pending' && (
                        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[10px] py-0 px-1.5">
                          Në pritje
                        </Badge>
                      )}
                      {event.status === 'rejected' && (
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px] py-0 px-1.5">
                          Refuzuar
                        </Badge>
                      )}
                      {event.featured_day && (
                        <Badge className={`${isFeatureActive(event, "day") ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" : "bg-yellow-500/10 text-yellow-200/60 border-yellow-500/15"} text-[10px] py-0 px-1.5`}>
                          Ditës{!isFeatureActive(event, "day") ? " skaduar" : ""}
                        </Badge>
                      )}
                      {event.featured_week && (
                        <Badge className={`${isFeatureActive(event, "week") ? "bg-blue-500/20 text-blue-300 border-blue-500/30" : "bg-blue-500/10 text-blue-200/60 border-blue-500/15"} text-[10px] py-0 px-1.5`}>
                          Javës{!isFeatureActive(event, "week") ? " skaduar" : ""}
                        </Badge>
                      )}
                    </div>
                    {(user?.email === event.organizer_email || canAdminEvents) && (
                      <div className="flex gap-1.5">
                        <button onClick={() => handleEdit(event)} className="text-white/65 hover:text-white transition-colors">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(event)} className="text-white/65 hover:text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <Link to={`${createPageUrl("EventDetail")}?id=${event.id}`} className="block group">
                    <h3 className="text-sm font-semibold text-white mb-1 group-hover:text-[#8ab4ff] transition-colors leading-tight">
                      {event.title}
                    </h3>
                  </Link>
                  <p className="text-white/80 text-xs mb-2 line-clamp-1">{event.description}</p>

                  <div className="space-y-1">
                   <div className="flex items-center gap-1.5 text-white/75 text-xs">
                     <Clock className="w-3 h-3 shrink-0 text-white/80" />
                      <span>{moment(event.event_date).format("D MMM YYYY, HH:mm")}</span>
                    </div>

                    {event.is_virtual ? (
                      <div className="flex items-center gap-1.5 text-white/75 text-xs">
                        <Video className="w-3 h-3 text-white/80" />
                        Virtual
                      </div>
                    ) : event.location && (
                      <div className="flex items-center gap-1.5 text-white/75 text-xs">
                        <MapPin className="w-3 h-3 shrink-0 text-white/80" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-white/75 text-xs">
                        <Users className="w-3 h-3 text-white/80" />
                        {allParticipants.filter(p => p.event_id === event.id).length}
                        {event.max_participants && ` / ${event.max_participants}`}
                      </div>
                      <Link to={`${createPageUrl("EventDetail")}?id=${event.id}`} className="text-[#8ab4ff] text-xs hover:underline">
                        Detajet →
                      </Link>
                    </div>

                    {canAdminEvents && canFeatureEvent(event) && (
                      <div className="grid grid-cols-2 gap-2 pt-2.5 mt-2.5 border-t border-white/10">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => toggleFeaturedEvent(event, "day")}
                          disabled={featureMutation.isPending}
                          className={`h-auto min-h-10 justify-start gap-2 rounded-lg px-2.5 text-left shadow-sm transition-all ${
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
                              {isFeatureActive(event, "day") ? "Hiq Dites" : event.featured_day ? "Rivendos Dites" : "Vendos Dites"}
                            </span>
                            <span className="truncate text-[9px] text-yellow-100/55">Mesazhi i dites</span>
                          </span>
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => toggleFeaturedEvent(event, "week")}
                          disabled={featureMutation.isPending}
                          className={`h-auto min-h-10 justify-start gap-2 rounded-lg px-2.5 text-left shadow-sm transition-all ${
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
                              {isFeatureActive(event, "week") ? "Hiq Javes" : event.featured_week ? "Rivendos Javes" : "Vendos Javes"}
                            </span>
                            <span className="truncate text-[9px] text-blue-100/55">Ngjarja e javes</span>
                          </span>
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={resetForm}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0b1020] border border-white/10 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">
                  {editingEvent ? "Modifiko ngjarjen" : "Shto ngjarje të re"}
                </h2>
                <button onClick={resetForm} className="text-white/40 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-white/70">Titulli *</Label>
                  <Input
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="bg-white/5 border-white/10 text-white hover:bg-white/8 hover:border-white/20 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                   <Label className="text-white/70">Përshkrimi</Label>
                   <Textarea
                     value={form.description}
                     onChange={(e) => setForm({ ...form, description: e.target.value })}
                     className="bg-white/5 border-white/10 text-white min-h-[100px] hover:bg-white/8 hover:border-white/20 transition-all"
                     lang="sq"
                     spellCheck={true}
                   />
                   <div className="flex items-center gap-2">
                     <input type="checkbox" defaultChecked className="w-4 h-4" id="spellcheck-desc" />
                     <label htmlFor="spellcheck-desc" className="text-white/40 text-xs cursor-pointer">
                       Autocorrect në shqip
                     </label>
                   </div>
                 </div>

                <div className="space-y-1.5">
                   <Label className="text-white/70">Foto e ngjarjes</Label>
                   {form.image_url ? (
                     <div className="space-y-2">
                       <img src={form.image_url} alt="Preview" className="w-full h-32 object-cover rounded-lg" />
                       <button
                         type="button"
                         onClick={() => setForm({ ...form, image_url: "" })}
                         className="text-red-400 text-xs hover:text-red-300"
                       >
                         Hiq foton
                       </button>
                     </div>
                   ) : (
                     <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/20 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-all">
                       <div className="flex flex-col items-center justify-center pt-5 pb-6">
                         <Upload className="w-5 h-5 text-white/50 mb-2" />
                         <p className="text-xs text-white/50">Ngarko një foto</p>
                       </div>
                       <input
                         type="file"
                         accept="image/*"
                         onChange={handleImageUpload}
                         disabled={uploadingImage}
                         className="hidden"
                       />
                     </label>
                   )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-white/70 flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-[#8ab4ff]" />
                      Data dhe ora
                    </Label>
                    <Select value={calendarType} onValueChange={handleCalendarTypeChange}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gregorian">Kalendari Gregorian</SelectItem>
                        <SelectItem value="hijri">Kalendari Hixhri</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {calendarType === "gregorian" ? (
                      <div>
                        <Input
                          type="datetime-local"
                          value={form.event_date}
                          onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                          className="bg-white/5 border-white/10 text-white [color-scheme:dark] hover:bg-white/8 hover:border-white/20 transition-all"
                        />
                        {form.event_date && (
                           <div className="mt-2 p-2 bg-white/5 rounded text-white/60 text-xs">
                             {(() => {
                               const hijri = gregorianToHijri(form.event_date);
                               return `${Math.floor(hijri.day)} ${hijriMonths[Math.floor(hijri.month) - 1]} ${Math.floor(hijri.year)} H.`;
                             })()}
                           </div>
                         )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="space-y-1.5">
                          <Label className="text-white/70 text-xs">Dita</Label>
                          <Input
                            type="number"
                            placeholder="Dita"
                            value={hijriForm.day}
                            onChange={(e) => {
                              const day = e.target.value;
                              setHijriForm({ ...hijriForm, day });
                              if (day && hijriForm.month && hijriForm.year) {
                                const greg = hijriToGregorian(parseInt(hijriForm.year), parseInt(hijriForm.month), parseInt(day));
                                const dateStr = greg.toISOString().split("T")[0];
                                setForm({ ...form, event_date: `${dateStr}T${hijriForm.time}` });
                              }
                            }}
                            min="1" max="30"
                            className="bg-white/5 border-white/10 text-white"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-white/70 text-xs">Muaji</Label>
                          <Select value={hijriForm.month} onValueChange={(month) => {
                            setHijriForm({ ...hijriForm, month, monthName: hijriMonths[parseInt(month) - 1] });
                            if (hijriForm.day && month && hijriForm.year) {
                              const greg = hijriToGregorian(parseInt(hijriForm.year), parseInt(month), parseInt(hijriForm.day));
                              const dateStr = greg.toISOString().split("T")[0];
                              setForm({ ...form, event_date: `${dateStr}T${hijriForm.time}` });
                            }
                          }}>
                            <SelectTrigger className="bg-white/5 border-white/10 text-white h-9">
                              <SelectValue placeholder="Zgjedhni muajin" />
                            </SelectTrigger>
                            <SelectContent>
                              {hijriMonths.map((name, idx) => (
                                <SelectItem key={idx} value={String(idx + 1)}>{name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-white/70 text-xs">Viti</Label>
                          <Input
                            type="number"
                            placeholder="Viti"
                            value={hijriForm.year}
                            onChange={(e) => {
                              const year = e.target.value;
                              setHijriForm({ ...hijriForm, year });
                              if (hijriForm.day && hijriForm.month && year) {
                                const greg = hijriToGregorian(parseInt(year), parseInt(hijriForm.month), parseInt(hijriForm.day));
                                const dateStr = greg.toISOString().split("T")[0];
                                setForm({ ...form, event_date: `${dateStr}T${hijriForm.time}` });
                              }
                            }}
                            min="1" max="2000"
                            className="bg-white/5 border-white/10 text-white"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-white/70 text-xs">Ora</Label>
                          <Input
                            type="time"
                            value={hijriForm.time}
                            onChange={(e) => {
                              const time = e.target.value;
                              setHijriForm({ ...hijriForm, time });
                              if (form.event_date) {
                                const dateStr = form.event_date.split("T")[0];
                                setForm({ ...form, event_date: `${dateStr}T${time}` });
                              }
                            }}
                            className="bg-white/5 border-white/10 text-white [color-scheme:dark]"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-white/70">Kategoria *</Label>
                    <Select value={form.category} onValueChange={(val) => setForm({ ...form, category: val })}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(categoryLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-white/70">Lloji i ngjarjes *</Label>
                  <Select value={form.event_type} onValueChange={(val) => setForm({ ...form, event_type: val })}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white hover:bg-white/8 hover:border-white/20 transition-all">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="online">Prezencë online</SelectItem>
                      <SelectItem value="in_person">Prezencë Fizike</SelectItem>
                      <SelectItem value="hybrid">Të dyja</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(form.event_type === "online" || form.event_type === "hybrid") && (
                  <div className="space-y-1.5">
                    <Label className="text-white/70">Link i takimit</Label>
                    <Input
                      value={form.meeting_link}
                      onChange={(e) => setForm({ ...form, meeting_link: e.target.value })}
                      placeholder="https://zoom.us/..."
                      className="bg-white/5 border-white/10 text-white hover:bg-white/8 hover:border-white/20 transition-all"
                    />
                  </div>
                )}
                
                {(form.event_type === "in_person" || form.event_type === "hybrid") && (
                  <div className="space-y-1.5">
                    <Label className="text-white/70">Vendi</Label>
                    <Input
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                      placeholder="Antokton, Shkodër, te kalaja e Drishtit, etj"
                      className="bg-white/5 border-white/10 text-white hover:bg-white/8 hover:border-white/20 transition-all"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-white/70">Numri maksimal i pjesëmarrësve</Label>
                  <Input
                    type="number"
                    value={form.max_participants}
                    onChange={(e) => setForm({ ...form, max_participants: e.target.value })}
                    placeholder="Opsionale"
                    className="bg-white/5 border-white/10 text-white hover:bg-white/8 hover:border-white/20 transition-all"
                  />
                </div>

                <div className="border-t border-white/10 pt-4 mt-4">
                  <Label className="text-white font-semibold mb-3 block">Përsëritje</Label>
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={form.is_recurring}
                        onChange={(e) => setForm({ ...form, is_recurring: e.target.checked })}
                        id="recurring"
                        className="w-4 h-4"
                      />
                      <Label htmlFor="recurring" className="text-white/70 font-normal cursor-pointer">
                        Ngjarje përsëritese
                      </Label>
                    </div>
                    {form.is_recurring && (
                      <div className="space-y-3 p-3 bg-white/5 rounded-lg">
                        <Select value={form.recurrence_pattern} onValueChange={(val) => setForm({ ...form, recurrence_pattern: val })}>
                          <SelectTrigger className="bg-white/5 border-white/10 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Çdo ditë</SelectItem>
                            <SelectItem value="weekly">Çdo javë</SelectItem>
                            <SelectItem value="biweekly">Çdo dy java</SelectItem>
                            <SelectItem value="monthly">Çdo muaj</SelectItem>
                            <SelectItem value="yearly">Çdo vit</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="space-y-1.5">
                          <Label className="text-white/70 text-xs">Përfundim Përsëritje</Label>
                          <Input
                            type="datetime-local"
                            value={form.recurrence_end_date}
                            onChange={(e) => setForm({ ...form, recurrence_end_date: e.target.value })}
                            className="bg-white/5 border-white/10 text-white [color-scheme:dark]"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-white/10 pt-4 mt-4">
                  <Label className="text-white font-semibold mb-3 block">Audienca</Label>
                  <div className="space-y-3">
                    <Select value={form.visibility} onValueChange={(val) => setForm({ ...form, visibility: val })}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Publike për të gjithë</SelectItem>
                        <SelectItem value="members_only">Vetëm anëtarë të regjistruar</SelectItem>
                        <SelectItem value="custom">Me kritere të veçanta</SelectItem>
                      </SelectContent>
                    </Select>

                    {form.visibility === "custom" && (
                      <div className="space-y-3 p-3 bg-white/5 rounded-lg">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-white/70 text-xs">Mosha min</Label>
                            <Input
                              type="number"
                              value={form.visible_to_age_min || ''}
                              onChange={(e) => setForm({ ...form, visible_to_age_min: e.target.value ? Number(e.target.value) : null })}
                              placeholder="18"
                              className="bg-white/5 border-white/10 text-white h-8"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-white/70 text-xs">Mosha max</Label>
                            <Input
                              type="number"
                              value={form.visible_to_age_max || ''}
                              onChange={(e) => setForm({ ...form, visible_to_age_max: e.target.value ? Number(e.target.value) : null })}
                              placeholder="65"
                              className="bg-white/5 border-white/10 text-white h-8"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-1.5">
                          <Label className="text-white/70 text-xs">Gjinia</Label>
                          <div className="flex gap-2">
                            {['M', 'F', 'Të gjitha'].map(g => (
                              <button
                                key={g}
                                type="button"
                                onClick={() => {
                                  if (g === 'Të gjitha') {
                                    setForm({ ...form, visible_to_genders: [] });
                                  } else {
                                    const genders = form.visible_to_genders?.includes(g)
                                      ? form.visible_to_genders.filter(x => x !== g)
                                      : [...(form.visible_to_genders || []), g];
                                    setForm({ ...form, visible_to_genders: genders });
                                  }
                                }}
                                className={`px-3 py-1 rounded text-xs ${
                                  (g === 'Të gjitha' && !form.visible_to_genders?.length) || form.visible_to_genders?.includes(g)
                                    ? 'bg-[#8ab4ff] text-white'
                                    : 'bg-white/5 text-white/60'
                                }`}
                              >
                                {g}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-white/70 text-xs">Besimi fetar</Label>
                          <div className="flex gap-2 flex-wrap">
                            {['Islam', 'Krishtere', 'Ortodoks', 'Judaizëm', 'Tjetër', 'Të gjitha'].map(r => (
                              <button
                                key={r}
                                type="button"
                                onClick={() => {
                                  if (r === 'Të gjitha') {
                                    setForm({ ...form, visible_to_religions: [] });
                                  } else {
                                    const religions = form.visible_to_religions?.includes(r)
                                      ? form.visible_to_religions.filter(x => x !== r)
                                      : [...(form.visible_to_religions || []), r];
                                    setForm({ ...form, visible_to_religions: religions });
                                  }
                                }}
                                className={`px-3 py-1 rounded text-xs ${
                                  (r === 'Të gjitha' && !form.visible_to_religions?.length) || form.visible_to_religions?.includes(r)
                                    ? 'bg-[#8ab4ff] text-white'
                                    : 'bg-white/5 text-white/60'
                                }`}
                              >
                                {r}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-white/70 text-xs">Arsimi</Label>
                          <div className="flex gap-2 flex-wrap">
                            {['Bazë', 'E mesme', 'Bachelor', 'Master', 'Doktoraturë', 'Të gjitha'].map(e => (
                              <button
                                key={e}
                                type="button"
                                onClick={() => {
                                  if (e === 'Të gjitha') {
                                    setForm({ ...form, visible_to_education: [] });
                                  } else {
                                    const education = form.visible_to_education?.includes(e)
                                      ? form.visible_to_education.filter(x => x !== e)
                                      : [...(form.visible_to_education || []), e];
                                    setForm({ ...form, visible_to_education: education });
                                  }
                                }}
                                className={`px-3 py-1 rounded text-xs ${
                                  (e === 'Të gjitha' && !form.visible_to_education?.length) || form.visible_to_education?.includes(e)
                                    ? 'bg-[#8ab4ff] text-white'
                                    : 'bg-white/5 text-white/60'
                                }`}
                              >
                                {e}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    className="flex-1 border-white/10 bg-white/5 text-white hover:bg-white/10"
                  >
                    Anulo
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="flex-1 bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] hover:opacity-90"
                  >
                    {(createMutation.isPending || updateMutation.isPending) ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : editingEvent ? (
                      "Ruaj"
                    ) : (
                      "Krijo"
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

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
                      {featureTarget.type === "day" ? "Ngjarje e dites" : "Ngjarje e javes"}
                    </h2>
                    <p className="text-white/55 text-xs mt-1 line-clamp-2">{featureTarget.event.title}</p>
                  </div>
                </div>
                <button onClick={() => setFeatureTarget(null)} className="text-white/40 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-white/65 text-sm mb-4">
                Zgjidh sa kohe do te shfaqet. Opsioni "Pa afat" rri aktiv derisa te vendosesh nje ngjarje tjeter ne vend te saj.
              </p>

              <div className="grid grid-cols-2 gap-2">
                {featureDurationOptions(featureTarget.type).map((option) => (
                  <Button
                    key={`${featureTarget.type}-${option.label}`}
                    type="button"
                    variant="outline"
                    onClick={() => applyFeaturedEvent(option.days)}
                    disabled={featureMutation.isPending}
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
                Kur vendos nje ngjarje te re si {featureTarget.type === "day" ? "ngjarje te dites" : "ngjarje te javes"}, e vjetra hiqet automatikisht nga ai pozicion.
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
