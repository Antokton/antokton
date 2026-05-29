import React, { useState, useEffect } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Save, Loader2, CheckCircle, Plus, Trash2, Star, Download, Upload, BarChart3, Eye, FileText, Briefcase, Crown, CreditCard, Bookmark, MessageCircle, Calendar, AlertTriangle } from "lucide-react";
import moment from "moment";
import { motion } from "framer-motion";
import UserRatingDisplay from "../components/user/UserRatingDisplay";
import AISuggestions from "../components/profile/AISuggestions";
import OnboardingTour from "../components/OnboardingTour";
import AIBioGenerator from "../components/profile/AIBioGenerator";
import UserReferences from "../components/profile/UserReferences";
import HijriCalendar from "../components/calendar/HijriCalendar";
import ProfileTabs from "../components/profile/ProfileTabs";
import AkademiaProfileSummary from "../components/akademia/AkademiaProfileSummary";
import AuthAccessBanner from "@/components/AuthAccessBanner";

function MyApplications({ userEmail }) {
  const { data: myApplications = [] } = useQuery({
    queryKey: ['myApplications', userEmail],
    queryFn: () => base44.entities.JobApplication.filter({ applicant_email: userEmail }, "-created_date"),
    enabled: !!userEmail
  });

  const { data: allJobs = [] } = useQuery({
    queryKey: ['allJobs'],
    queryFn: () => base44.entities.Job.list("-created_date", 500),
    enabled: myApplications.length > 0
  });

  if (myApplications.length === 0) return null;

  return (
    <Card className="bg-white/5 border-white/10 mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <FileText className="w-5 h-5 text-[#8ab4ff]" />
          Aplikimet e mia
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {myApplications.map((app) => {
            const job = allJobs.find(j => j.id === app.job_id);
            return (
              <div key={app.id} className="p-4 rounded-lg bg-white/10 border border-white/20">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="text-white font-semibold text-sm mb-1">
                      {job?.title || 'Njoftim i fshirë'}
                    </h4>
                    <p className="text-white text-xs mb-2">
                      Aplikuar: {moment(app.created_date).format('DD/MM/YYYY')}
                    </p>
                    {app.cover_letter && (
                      <p className="text-white text-xs line-clamp-2 mb-2">{app.cover_letter}</p>
                    )}
                  </div>
                  <Badge className={
                    app.status === 'applied' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                    app.status === 'shortlisted' || app.status === 'hired' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                    app.status === 'rejected' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                    'bg-gray-500/20 text-gray-400 border-gray-500/30'
                  }>
                    {app.status === 'applied' ? 'Në pritje' :
                     app.status === 'shortlisted' ? 'Pranuar' :
                     app.status === 'hired' ? 'Punësuar' :
                     app.status === 'rejected' ? 'Refuzuar' :
                     app.status}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function ProfilePanel({ title, description, children, defaultOpen = false, danger = false }) {
  return (
    <details
      open={defaultOpen}
      className={`group rounded-2xl border ${
        danger ? "border-red-500/20 bg-red-500/10" : "border-white/10 bg-white/5"
      }`}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-white">
        <span className="min-w-0">
          <span className="block text-sm font-semibold sm:text-base">{title}</span>
          {description && <span className="mt-0.5 block text-xs leading-relaxed text-white/50">{description}</span>}
        </span>
        <span className="shrink-0 text-lg text-white/45 transition-transform group-open:rotate-45">+</span>
      </summary>
      <div className="border-t border-white/10 p-0">
        {children}
      </div>
    </details>
  );
}

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [form, setForm] = useState({
    profile_photo_url: "",
    first_name: "",
    surname: "",
    phone: "",
    birthplace: "",
    location: "",
    gender: "",
    education_level: "",
    religious_belief: "",
    religious_belief_other: "",
    job_title: "",
    experience_years: 0,
    skills: "",
    bio: "",
    user_type: "job_seeker",
    linkedin: "",
    facebook: "",
    website: "",
    portfolio_links: [],
    certifications: [],
    languages: [],
    work_experience: [],
    education: [],
    company_name: "",
    company_size: "",
    industry_specialization: [],
    recruitment_team_size: 0,
    video_pitch_url: "",
    online_courses: [],
    professional_title: "none",
    custom_title: "",
    islam_relation: "",
    islam_knowledge_level: "",
    islam_content_preference: "",
    islam_learning_interest: "",
    member_faith_category: ""
  });

  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);

  const { data: currentUser, isLoading: isLoadingUser, isError: isUserError } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 300000, // Cache for 5 minutes
    retry: 1
  });

  useEffect(() => {
    if (!currentUser) return;
    
    setUser(currentUser);
    
    // Check if first time user
    const hasSeenOnboarding = localStorage.getItem(`onboarding_seen_${currentUser.email}`);
    if (!hasSeenOnboarding && (!currentUser.bio || !currentUser.skills)) {
      setShowOnboarding(true);
    }
    
    setForm({
      profile_photo_url: currentUser.profile_photo_url || "",
      first_name: currentUser.first_name || "",
      surname: currentUser.surname || "",
      phone: currentUser.phone || "",
      birthplace: currentUser.birthplace || "",
      location: currentUser.location || "",
      gender: currentUser.gender || "",
      education_level: currentUser.education_level || "",
      religious_belief: currentUser.religious_belief || "",
      religious_belief_other: currentUser.religious_belief_other || "",
      job_title: currentUser.job_title || "",
      experience_years: currentUser.experience_years || 0,
      skills: currentUser.skills || "",
      bio: currentUser.bio || "",
      user_type: currentUser.user_type || "job_seeker",
      linkedin: currentUser.linkedin || "",
      facebook: currentUser.facebook || "",
      website: currentUser.website || "",
      portfolio_links: currentUser.portfolio_links || [],
      certifications: currentUser.certifications || [],
      work_experience: currentUser.work_experience || [],
      education: currentUser.education || [],
      languages: currentUser.languages || [],
      company_name: currentUser.company_name || "",
      company_size: currentUser.company_size || "",
      industry_specialization: currentUser.industry_specialization || [],
      recruitment_team_size: currentUser.recruitment_team_size || 0,
      video_pitch_url: currentUser.video_pitch_url || "",
      online_courses: currentUser.online_courses || [],
      professional_title: currentUser.professional_title || "none",
      custom_title: currentUser.custom_title || "",
      islam_relation: currentUser.islam_relation || "",
      islam_knowledge_level: currentUser.islam_knowledge_level || "",
      islam_content_preference: currentUser.islam_content_preference || "",
      islam_learning_interest: currentUser.islam_learning_interest || "",
      member_faith_category: currentUser.member_faith_category || ""
    });
  }, [currentUser]);

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['subscriptions', currentUser?.email],
    queryFn: () => base44.entities.PremiumSubscription.filter({
      user_email: currentUser.email,
      is_active: true
    }),
    enabled: !!currentUser?.email,
    staleTime: 60000
  });

  useEffect(() => {
    if (subscriptions.length > 0) {
      const now = new Date();
      const hasActive = subscriptions.some(sub => new Date(sub.end_date) > now);
      setHasActiveSubscription(hasActive);
    }
  }, [subscriptions]);

  const { data: myRatings = [] } = useQuery({
    queryKey: ["myRatings", user?.email],
    queryFn: () => base44.entities.Rating.filter({ rated_user_email: user.email }),
    enabled: !!user
  });

  const { data: myDetailedRatings = [] } = useQuery({
    queryKey: ["myDetailedRatings", user?.email],
    queryFn: () => base44.entities.DetailedRating.filter({ rated_email: user.email }),
    enabled: !!user
  });

  const { data: paymentHistory = [] } = useQuery({
    queryKey: ["paymentHistory", user?.email],
    queryFn: () => base44.entities.PremiumSubscription.filter({ user_email: user?.email }, "-created_date"),
    enabled: !!user?.email
  });

  const { data: savedSearches = [] } = useQuery({
    queryKey: ["savedSearches", user?.email],
    queryFn: () => base44.entities.SavedSearch.filter({ user_email: user?.email }, "-created_date"),
    enabled: !!user?.email
  });

  const deleteSavedSearchMutation = React.useMemo(() => ({
    mutateAsync: async (id) => {
      await base44.entities.SavedSearch.delete(id);
    }
  }), []);

  const handleDeleteSavedSearch = async (id) => {
    if (confirm("Jeni i sigurt që dëshironi ta fshini këtë kërkim?")) {
      await deleteSavedSearchMutation.mutateAsync(id);
      window.location.reload();
    }
  };

  const avgRatings = React.useMemo(() => {
    if (!myDetailedRatings || myDetailedRatings.length === 0) return null;
    
    const sum = myDetailedRatings.reduce((acc, r) => ({
      overall: acc.overall + r.overall_rating,
      professionalism: acc.professionalism + (r.professionalism || 0),
      communication: acc.communication + (r.communication || 0),
      reliability: acc.reliability + (r.reliability || 0),
      work_quality: acc.work_quality + (r.work_quality || 0)
    }), { overall: 0, professionalism: 0, communication: 0, reliability: 0, work_quality: 0 });

    const count = myDetailedRatings.length;
    return {
      overall: sum.overall / count,
      professionalism: sum.professionalism / count,
      communication: sum.communication / count,
      reliability: sum.reliability / count,
      work_quality: sum.work_quality / count
    };
  }, [myDetailedRatings]);

  const { data: statistics } = useQuery({
    queryKey: ["userStatistics", user?.email],
    queryFn: async () => {
      const [applications, jobs, profileViews, messagesSent, eventRegistrations] = await Promise.all([
        base44.entities.JobApplication.filter({ applicant_email: user.email }),
        base44.entities.Job.filter({ created_by: user.email }),
        base44.entities.ProfileView.filter({ profile_email: user.email }),
        base44.entities.ChatMessage.filter({ sender_email: user.email }),
        base44.entities.EventRegistration.filter({ user_email: user.email, status: "registered" })
      ]);
      return {
        totalApplications: applications.length,
        totalJobsPosted: jobs.length,
        totalProfileViews: profileViews.length,
        totalMessagesSent: messagesSent.length,
        totalEventsJoined: eventRegistrations.length
      };
    },
    enabled: !!user
  });

  const handleDownloadCV = async () => {
    try {
      const response = await base44.functions.invoke('generateCV', {});
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CV_${user.full_name || user.email}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      alert('Gabim në shkarkimin e CV-së: ' + error.message);
    }
  };

  const handleGenerateAIBio = async () => {
    try {
      setLoading(true);
      const response = await base44.functions.invoke('generateAIDescription', { type: 'bio' });
      setForm({ ...form, bio: response.data.description });
      setLoading(false);
    } catch (error) {
      alert('Gabim në gjenerimin AI: ' + error.message);
      setLoading(false);
    }
  };

  const handleUploadProfilePhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      alert('Ju lutem zgjidhni një file image (jpg, png, etc.)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File-i është shumë i madh. Madhësia maksimale është 5MB.');
      return;
    }
    
    try {
      setLoading(true);
      const response = await base44.integrations.Core.UploadFile({ file });
      setForm({ ...form, profile_photo_url: response.file_url });
      setLoading(false);
    } catch (error) {
      alert('Gabim në ngarkimin e fotos: ' + error.message);
      setLoading(false);
    }
  };

  const handleRemoveProfilePhoto = async () => {
    if (confirm('Jeni i sigurt që dëshironi të fshini foton e profilit?')) {
      setForm({ ...form, profile_photo_url: "" });
    }
  };

  const handleUploadPortfolioFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      setLoading(true);
      const response = await base44.integrations.Core.UploadFile({ file });
      const newLink = { title: file.name, url: response.file_url };
      setForm({ ...form, portfolio_links: [...form.portfolio_links, newLink] });
      setLoading(false);
    } catch (error) {
      alert('Gabim në ngarkimin e file: ' + error.message);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await base44.auth.updateMe(form);
      const updated = await base44.auth.me();
      setUser(updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      alert("Gabim në ruajtje: " + error.message);
    }
    setLoading(false);
  };

  const addPortfolioLink = () => {
    setForm({
      ...form,
      portfolio_links: [...form.portfolio_links, { title: "", url: "" }]
    });
  };

  const removePortfolioLink = (index) => {
    setForm({
      ...form,
      portfolio_links: form.portfolio_links.filter((_, i) => i !== index)
    });
  };

  const updatePortfolioLink = (index, field, value) => {
    const updated = [...form.portfolio_links];
    updated[index][field] = value;
    setForm({ ...form, portfolio_links: updated });
  };

  const addCertification = () => {
    setForm({
      ...form,
      certifications: [...form.certifications, { name: "", issuer: "", date: "" }]
    });
  };

  const removeCertification = (index) => {
    setForm({
      ...form,
      certifications: form.certifications.filter((_, i) => i !== index)
    });
  };

  const updateCertification = (index, field, value) => {
    const updated = [...form.certifications];
    updated[index][field] = value;
    setForm({ ...form, certifications: updated });
  };

  const addLanguage = () => {
    setForm({
      ...form,
      languages: [...form.languages, { language: "", level: "intermediate" }]
    });
  };

  const removeLanguage = (index) => {
    setForm({
      ...form,
      languages: form.languages.filter((_, i) => i !== index)
    });
  };

  const updateLanguage = (index, field, value) => {
    const updated = [...form.languages];
    updated[index][field] = value;
    setForm({ ...form, languages: updated });
  };

  const addOnlineCourse = () => {
    setForm({
      ...form,
      online_courses: [...form.online_courses, { course_name: "", platform: "", completion_date: "", certificate_url: "" }]
    });
  };

  const removeOnlineCourse = (index) => {
    setForm({
      ...form,
      online_courses: form.online_courses.filter((_, i) => i !== index)
    });
  };

  const updateOnlineCourse = (index, field, value) => {
    const updated = [...form.online_courses];
    updated[index][field] = value;
    setForm({ ...form, online_courses: updated });
  };

  const handleUploadVideo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('video/')) {
      alert('Ju lutem zgjidhni një file video');
      return;
    }

    try {
      setLoading(true);
      const response = await base44.integrations.Core.UploadFile({ file });
      setForm({ ...form, video_pitch_url: response.file_url });
      setLoading(false);
    } catch (error) {
      alert('Gabim në ngarkimin e videos: ' + error.message);
      setLoading(false);
    }
  };

  const addWorkExperience = () => {
    setForm({
      ...form,
      work_experience: [...form.work_experience, { company: "", role: "", start_date: "", end_date: "", current: false, responsibilities: "" }]
    });
  };

  const removeWorkExperience = (index) => {
    setForm({
      ...form,
      work_experience: form.work_experience.filter((_, i) => i !== index)
    });
  };

  const updateWorkExperience = (index, field, value) => {
    const updated = [...form.work_experience];
    updated[index][field] = value;
    setForm({ ...form, work_experience: updated });
  };

  const addEducation = () => {
    setForm({
      ...form,
      education: [...form.education, { institution: "", degree: "", field: "", start_date: "", end_date: "", current: false }]
    });
  };

  const removeEducation = (index) => {
    setForm({
      ...form,
      education: form.education.filter((_, i) => i !== index)
    });
  };

  const updateEducation = (index, field, value) => {
    const updated = [...form.education];
    updated[index][field] = value;
    setForm({ ...form, education: updated });
  };

  const handleDownloadEnhancedProfile = async () => {
    try {
      const response = await base44.functions.invoke('downloadEnhancedProfile', {});
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Profile_${user.full_name || user.email}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      alert('Gabim në shkarkimin e profilit: ' + error.message);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setLoading(true);
      await base44.auth.deleteAccount();
      alert('Llogaria juaj u fshi përgjithmonë.');
      base44.auth.logout();
    } catch (error) {
      alert('Gabim: ' + error.message);
      setLoading(false);
    }
  };

  if (isLoadingUser) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 text-white/70 animate-spin" />
      </div>
    );
  }

  if (isUserError || !currentUser || !user) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 pb-28 pt-8">
        <AuthAccessBanner type="profile" className="w-full max-w-md" />
      </div>
    );
  }

  const isRecruiterOrEmployer = form.user_type === "recruiter" || form.user_type === "employer";

  const faithCategoryFromRelation = (relation) => {
    const map = {
      "Jam musliman praktikues": "Musliman praktikues",
      "Jam musliman dhe praktikoj pjesërisht": "Musliman në përmirësim",
      "Jam musliman, por dua të mësoj më shumë": "Musliman në fazë mësimi",
      "Jam i interesuar të mësoj më shumë për Islamin": "I interesuar për njohje islame",
      "Preferoj të mos përgjigjem": "Pa përcaktim"
    };
    return map[relation] || "";
  };

  const handleIslamRelationChange = (v) => {
    setForm({ ...form, islam_relation: v, member_faith_category: faithCategoryFromRelation(v) });
  };

  return (
    <div className="mx-auto w-full max-w-7xl overflow-hidden px-4 py-8 sm:px-6">
      <ProfileTabs user={user}>
      <div className="mb-8 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {(() => {
                  const displayName = (user.first_name && user.surname)
                    ? `${user.first_name} ${user.surname}`
                    : user.first_name || user.surname || user.full_name || 'Profili im';
                  if (user.professional_title && user.professional_title !== 'none') {
                    const prefix = user.professional_title === 'tjeter' && user.custom_title
                      ? user.custom_title
                      : user.professional_title.charAt(0).toUpperCase() + user.professional_title.slice(1);
                    return `${prefix}. ${displayName}`;
                  }
                  return displayName;
                })()}
              </h1>
              {user.is_verified && (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Verifikuar
                </Badge>
              )}
              {(user.user_type === 'employer' || user.user_type === 'recruiter') && (
                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 flex items-center gap-1">
                  <Briefcase className="w-3 h-3" />
                  Punëdhënës
                </Badge>
              )}
            </div>
            {user.member_category && user.member_category !== 'standard' && (
              <Badge className={
                user.member_category === 'privileged' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                user.member_category === 'leader' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                user.member_category === 'moderator' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                user.member_category === 'admin' ? 'bg-red-500/20 text-red-400 border-red-500/30' : ''
              }>
                {user.member_category === 'privileged' ? 'Anëtar i Privilegjuar' :
                 user.member_category === 'leader' ? 'Anëtar Udhëheqës' :
                 user.member_category === 'moderator' ? 'Moderator' :
                 user.member_category === 'admin' ? 'Administrator' : ''}
              </Badge>
            )}
          </div>
          <p className="mt-1 break-words text-sm text-white">
            {user.role === 'admin' ? 'Administrator' :
             user.role === 'moderator' ? 'Moderator' :
             user.member_category === 'leader' ? 'Anëtar Udhëheqës' :
             user.member_category === 'privileged' ? 'Anëtar i Privilegjuar' :
             'Anëtar'}
            {user.is_verified && ' · Verifikuar'}
            {' · '}Menaxho informacionin tënd personal dhe profesional
          </p>
        </div>
        {hasActiveSubscription && (
          <div className="flex w-fit shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 px-4 py-2 font-semibold text-white">
            <Crown className="w-4 h-4" />
            Premium
          </div>
        )}
      </div>

      {/* Spacer */}
      <div className="mb-2" />

      <ProfilePanel
        title="Përmbledhje"
        description="Aktiviteti, reputacioni, Akademia dhe shkarkimet e profilit."
        defaultOpen
      >
      <div className="space-y-6 p-0">
      {/* Statistics - Aktiviteti Im */}
      {statistics && (
        <Card className="bg-white/5 border-white/10 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <BarChart3 className="w-5 h-5" />
              Aktiviteti Im
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 sm:gap-4">
              <div className="min-w-0 rounded-lg border border-white/20 bg-white/10 p-2.5 sm:p-4">
                <div className="mb-1.5 flex min-w-0 items-center gap-1.5 sm:mb-2 sm:gap-2">
                  <Eye className="h-3.5 w-3.5 shrink-0 text-[#8ab4ff] sm:h-4 sm:w-4" />
                  <p className="min-w-0 break-words text-[10px] font-medium leading-tight text-white sm:text-xs">Shikime</p>
                </div>
                <p className="text-lg font-bold text-white sm:text-2xl">{statistics.totalProfileViews}</p>
              </div>
              <div className="min-w-0 rounded-lg border border-white/20 bg-white/10 p-2.5 sm:p-4">
                <div className="mb-1.5 flex min-w-0 items-center gap-1.5 sm:mb-2 sm:gap-2">
                  <FileText className="h-3.5 w-3.5 shrink-0 text-[#9bffd6] sm:h-4 sm:w-4" />
                  <p className="min-w-0 break-words text-[10px] font-medium leading-tight text-white sm:text-xs">Aplikime</p>
                </div>
                <p className="text-lg font-bold text-white sm:text-2xl">{statistics.totalApplications}</p>
              </div>
              <div className="min-w-0 rounded-lg border border-white/20 bg-white/10 p-2.5 sm:p-4">
                <div className="mb-1.5 flex min-w-0 items-center gap-1.5 sm:mb-2 sm:gap-2">
                  <MessageCircle className="h-3.5 w-3.5 shrink-0 text-[#8ab4ff] sm:h-4 sm:w-4" />
                  <p className="min-w-0 break-words text-[10px] font-medium leading-tight text-white sm:text-xs">Mesazhe</p>
                </div>
                <p className="text-lg font-bold text-white sm:text-2xl">{statistics.totalMessagesSent}</p>
              </div>
              <div className="min-w-0 rounded-lg border border-white/20 bg-white/10 p-2.5 sm:p-4">
                <div className="mb-1.5 flex min-w-0 items-center gap-1.5 sm:mb-2 sm:gap-2">
                  <Calendar className="h-3.5 w-3.5 shrink-0 text-[#9bffd6] sm:h-4 sm:w-4" />
                  <p className="min-w-0 break-words text-[10px] font-medium leading-tight text-white sm:text-xs">Ngjarje</p>
                </div>
                <p className="text-lg font-bold text-white sm:text-2xl">{statistics.totalEventsJoined}</p>
              </div>
              <div className="min-w-0 rounded-lg border border-white/20 bg-white/10 p-2.5 sm:p-4">
                <div className="mb-1.5 flex min-w-0 items-center gap-1.5 sm:mb-2 sm:gap-2">
                  <Briefcase className="h-3.5 w-3.5 shrink-0 text-[#8ab4ff] sm:h-4 sm:w-4" />
                  <p className="min-w-0 break-words text-[10px] font-medium leading-tight text-white sm:text-xs">Postime</p>
                </div>
                <p className="text-lg font-bold text-white sm:text-2xl">{statistics.totalJobsPosted}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Divider - Informacion Personal */}
      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-white/30 text-xs font-medium uppercase tracking-wider">Vlerësimet & Aktiviteti</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      {/* Rating Display */}
      <UserRatingDisplay user={user} ratings={myRatings} />

      {/* Detailed Ratings Summary */}
      {myDetailedRatings?.length > 0 && (
        <Card className="bg-white/5 border-white/10 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-400" />
              Vlerësimet e detajuara
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {avgRatings && Object.entries(avgRatings).map(([key, value]) => (
                <div key={key} className="bg-white/10 p-3 rounded-lg border border-white/20">
                  <p className="text-white text-xs mb-1 font-medium capitalize">{key.replace('_', ' ')}</p>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-white font-bold text-lg">{value.toFixed(1)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* User References */}
      <Card className="bg-white/5 border-white/10 mb-6">
        <CardContent className="p-6">
          <UserReferences userEmail={user.email} isOwnProfile={true} />
        </CardContent>
      </Card>

      <AkademiaProfileSummary user={user} />

      {/* CV Download */}
      <Card className="bg-white/5 border-white/10 mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h3 className="text-white font-semibold text-lg mb-1">Dokumentet e profilit</h3>
              <p className="text-white text-sm">Shkarko CV ose profilin e zgjeruar në PDF</p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Button onClick={handleDownloadCV} variant="outline" className="w-full bg-white/10 border-white/30 text-white hover:bg-white/15 hover:text-white sm:w-auto">
                <Download className="w-4 h-4 mr-2" />
                CV Standard
              </Button>
              <Button onClick={handleDownloadEnhancedProfile} className="w-full bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] hover:opacity-90 sm:w-auto">
                <Download className="w-4 h-4 mr-2" />
                Profil i plotë
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
      </ProfilePanel>

      {/* Profile Form */}
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        {/* Basic Info */}
        <ProfilePanel
          title="Të dhënat bazë"
          description="Foto, emër, kontakt, vendndodhje dhe lloji i përdoruesit."
          defaultOpen
        >
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-6 space-y-4">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-white font-semibold text-lg">Informacion bazë</h3>
              {user.member_category && user.member_category !== 'standard' && (
                <Badge className={
                  user.member_category === 'privileged' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                  user.member_category === 'leader' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                  user.member_category === 'moderator' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                  user.member_category === 'admin' ? 'bg-red-500/20 text-red-400 border-red-500/30' : ''
                }>
                  {user.member_category === 'privileged' ? 'Anëtar i Privilegjuar' :
                   user.member_category === 'leader' ? 'Anëtar Udhëheqës' :
                   user.member_category === 'moderator' ? 'Moderator' :
                   user.member_category === 'admin' ? 'Administrator' : ''}
                </Badge>
              )}
            </div>

            {/* Profile Photo Upload */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
              <div className="relative group">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/20 bg-gradient-to-br from-[#8ab4ff] to-[#9bffd6] flex items-center justify-center">
                  {form.profile_photo_url ? (
                    <img src={form.profile_photo_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl font-bold text-[#0b1020]">
                      {(form.first_name || form.surname || user.email || "?").charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                  <label className="cursor-pointer">
                    <input type="file" className="hidden" onChange={handleUploadProfilePhoto} accept="image/*" disabled={loading} />
                    <Upload className="w-6 h-6 text-white" />
                  </label>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-white font-semibold mb-2">Foto e profilit</h4>
                <div className="flex gap-2 flex-wrap">
                  <label className="cursor-pointer">
                    <input type="file" className="hidden" onChange={handleUploadProfilePhoto} accept="image/*" disabled={loading} />
                    <span className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md border border-white/20 bg-white/10 text-white hover:bg-white/20">
                      <Upload className="w-4 h-4 mr-2" /> {form.profile_photo_url ? 'Ndrysho foton' : 'Ngarko foto'}
                    </span>
                  </label>
                  {form.profile_photo_url && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleRemoveProfilePhoto}
                      className="border-red-400/50 text-red-400 hover:bg-red-400/10"
                    >
                      <Trash2 className="w-4 h-4 mr-1" /> Fshi
                    </Button>
                  )}
                </div>
                <p className="text-white/50 text-xs mt-2">Formatet e suportuara: JPG, PNG, GIF. Madhësia maksimale: 5MB</p>
              </div>
            </div>

            <div className="space-y-1.5 mb-4">
              <Label className="text-white">Titulli Profesional</Label>
              <Select value={user.professional_title || 'none'} onValueChange={(v) => setForm({ ...form, professional_title: v })}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Asnjë</SelectItem>
                  <SelectItem value="prof">Prof. (Profesor)</SelectItem>
                  <SelectItem value="dr">Dr. (Doktor)</SelectItem>
                  <SelectItem value="ing">Ing. (Inxhinier)</SelectItem>
                  <SelectItem value="mag">Mag. (Magjistrat)</SelectItem>
                  <SelectItem value="msc">Msc.</SelectItem>
                  <SelectItem value="phd">PhD.</SelectItem>
                  <SelectItem value="imam">Imam</SelectItem>
                  <SelectItem value="hoxhe">Hoxhë</SelectItem>
                  <SelectItem value="prift">Prift</SelectItem>
                  <SelectItem value="myezin">Myezin</SelectItem>
                  <SelectItem value="pastor">Pastor</SelectItem>
                  <SelectItem value="rabi">Rabi</SelectItem>
                  <SelectItem value="infermier">Infermier/e</SelectItem>
                  <SelectItem value="mjek">Mjek</SelectItem>
                  <SelectItem value="avokat">Avokat</SelectItem>
                  <SelectItem value="ekonomist">Ekonomist</SelectItem>
                  <SelectItem value="arkitekt">Arkitekt</SelectItem>
                  <SelectItem value="tjeter">Tjetër</SelectItem>
                </SelectContent>
              </Select>
              {form.professional_title === 'tjeter' && (
                <Input
                  placeholder="Specifikoni titullin"
                  value={form.custom_title || ''}
                  onChange={(e) => setForm({ ...form, custom_title: e.target.value })}
                  className="bg-white/5 border-white/10 text-white mt-2"
                />
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-white">Emri</Label>
                <Input
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-white">Mbiemri</Label>
                <Input
                  value={form.surname}
                  onChange={(e) => setForm({ ...form, surname: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-white">Email</Label>
                <Input value={user.email} disabled className="bg-white/10 border-white/10 text-white/50" />
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="border-blue-500/30 text-blue-400 text-xs">
                    Anëtar që nga: {new Date(user.created_date).toLocaleDateString('sq-AL', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </Badge>
                  <HijriCalendar gregorianDate={user.created_date} className="text-xs" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-white">Telefoni</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-white">Vendlindja</Label>
              <Input
                value={form.birthplace}
                onChange={(e) => setForm({ ...form, birthplace: e.target.value })}
                placeholder="P.sh. Shkodër - Antokton"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-white">Vendi ku ndodhesh / ku po jeton</Label>
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="P.sh. Bruksel, Belgjikë"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-white">Gjinia *</Label>
                <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })} required>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Zgjidh gjininë" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mashkull">Mashkull</SelectItem>
                    <SelectItem value="Femër">Femër</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-white">Arsimi *</Label>
                <Select value={form.education_level} onValueChange={(v) => setForm({ ...form, education_level: v })} required>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Zgjidh nivelin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bazë">Bazë</SelectItem>
                    <SelectItem value="E mesme">E mesme</SelectItem>
                    <SelectItem value="Bachelor">Bachelor</SelectItem>
                    <SelectItem value="Master">Master</SelectItem>
                    <SelectItem value="Doktoraturë">Doktoraturë</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-white">Besimi Fetar *</Label>
                <Select 
                  value={form.religious_belief} 
                  onValueChange={(v) => setForm({ ...form, religious_belief: v })} 
                  required
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Zgjidh besimin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Islam">Islam</SelectItem>
                    <SelectItem value="Krishterë Katolik">Krishterë Katolik</SelectItem>
                    <SelectItem value="Krishterë Ortodoks">Krishterë Ortodoks</SelectItem>
                    <SelectItem value="Tjetër (specifiko)">Tjetër (specifiko)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.religious_belief === "Tjetër (specifiko)" && (
                <div className="space-y-1.5">
                  <Label className="text-white">Specifiko besimin</Label>
                  <Input
                    value={form.religious_belief_other || ''}
                    onChange={(e) => setForm({ ...form, religious_belief_other: e.target.value })}
                    className="bg-white/5 border-white/10 text-white"
                    placeholder="Shkruaj këtu..."
                  />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-white">Lloji i përdoruesit</Label>
              <Select value={form.user_type} onValueChange={(v) => setForm({ ...form, user_type: v })}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0b1020] border-white/20">
                  <SelectItem value="job_seeker" className="text-white">Punëkërkues</SelectItem>
                  <SelectItem value="employer" className="text-white">Punëdhënës</SelectItem>
                  <SelectItem value="recruiter" className="text-white">Rekrutues</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        </ProfilePanel>

        {/* Job Seeker Specific */}
        {!isRecruiterOrEmployer && (
          <ProfilePanel
            title="Profesioni dhe CV"
            description="Aftësitë, portfolio, certifikatat, gjuhët, përvoja dhe arsimi."
          >
          <div className="space-y-6">
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6 space-y-4">
                <h3 className="text-white font-semibold text-lg mb-4">Informacion profesional</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-white">Titulli i punës</Label>
                    <Input
                      value={form.job_title}
                      onChange={(e) => setForm({ ...form, job_title: e.target.value })}
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-white">Vite përvoje</Label>
                    <Input
                      type="number"
                      value={form.experience_years}
                      onChange={(e) => setForm({ ...form, experience_years: parseInt(e.target.value) || 0 })}
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-white">Aftësitë (të ndara me presje)</Label>
                  </div>
                  <Input
                    value={form.skills}
                    onChange={(e) => setForm({ ...form, skills: e.target.value })}
                    placeholder="JavaScript, React, Node.js"
                    className="bg-white/5 border-white/10 text-white"
                  />
                  <AISuggestions
                    jobTitle={form.job_title}
                    skills={form.skills}
                    type="skills"
                    onApply={(suggestion) => setForm({ ...form, skills: suggestion })}
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-white">Bio</Label>
                  </div>
                  <Textarea
                    value={form.bio}
                    onChange={(e) => setForm({ ...form, bio: e.target.value })}
                    className="bg-white/5 border-white/10 text-white min-h-[100px]"
                    lang="sq"
                    spellCheck={true}
                  />
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked className="w-4 h-4" id="spellcheck-bio" />
                      <label htmlFor="spellcheck-bio" className="text-white/40 text-xs cursor-pointer">
                        Autocorrect në shqip
                      </label>
                    </div>
                    <AIBioGenerator
                      currentBio={form.bio}
                      jobTitle={form.job_title}
                      skills={form.skills}
                      onApply={(suggestion) => setForm({ ...form, bio: suggestion })}
                    />
                  </div>
                  <AISuggestions
                    jobTitle={form.job_title}
                    skills={form.skills}
                    currentBio={form.bio}
                    type="bio"
                    onApply={(suggestion) => setForm({ ...form, bio: suggestion })}
                  />
                </div>

                {/* Portfolio Links */}
                <div className="space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <Label className="text-white">Portfolio</Label>
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                      <label className="cursor-pointer">
                        <input type="file" className="hidden" onChange={handleUploadPortfolioFile} accept="image/*,video/*,.pdf" />
                        <span className="inline-flex w-full items-center justify-center px-3 py-1.5 text-sm font-medium rounded-md border border-white/20 bg-white/10 text-white hover:bg-white/20 sm:w-auto">
                          <Upload className="w-4 h-4 mr-1" /> Ngarko file
                        </span>
                      </label>
                      <Button type="button" size="sm" onClick={addPortfolioLink} variant="outline" className="w-full border-white/20 bg-white/10 text-white hover:bg-white/20 sm:w-auto">
                        <Plus className="w-4 h-4 mr-1" /> Shto link
                      </Button>
                    </div>
                  </div>
                  {(form.portfolio_links || []).map((link, i) => (
                    <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                      <Input
                        placeholder="Titulli"
                        value={link.title}
                        onChange={(e) => updatePortfolioLink(i, "title", e.target.value)}
                        className="bg-white/5 border-white/10 text-white flex-1"
                      />
                      <Input
                        placeholder="URL"
                        value={link.url}
                        onChange={(e) => updatePortfolioLink(i, "url", e.target.value)}
                        className="bg-white/5 border-white/10 text-white flex-1"
                      />
                      <Button type="button" size="sm" variant="ghost" onClick={() => removePortfolioLink(i)} className="text-red-400">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Video Pitch */}
                <div className="space-y-2">
                  <Label className="text-white">Video Prezantim (Elevator Pitch)</Label>
                  <p className="text-white text-xs mb-2">Ngarko një video të shkurtër (max 2 min) ku prezanton veten dhe aftësitë</p>
                  {form.video_pitch_url ? (
                    <div className="space-y-2">
                      <video 
                        src={form.video_pitch_url} 
                        controls 
                        className="w-full max-w-md rounded-lg"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setForm({ ...form, video_pitch_url: "" })}
                        className="text-red-400 border-red-400/50"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Fshi video
                      </Button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <input 
                        type="file" 
                        className="hidden" 
                        onChange={handleUploadVideo}
                        accept="video/*"
                        disabled={loading}
                      />
                      <span className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md border border-white/20 bg-white/10 text-white hover:bg-white/20">
                        <Upload className="w-4 h-4 mr-2" /> Ngarko video
                      </span>
                    </label>
                  )}
                </div>

                {/* Certifications */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-white">Certifikatat</Label>
                    <Button type="button" size="sm" onClick={addCertification} variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20">
                      <Plus className="w-4 h-4 mr-1" /> Shto
                    </Button>
                  </div>
                  {(form.certifications || []).map((cert, i) => (
                    <div key={i} className="p-3 bg-white/5 rounded-lg space-y-2 border border-white/10">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Input
                          placeholder="Emri"
                          value={cert.name}
                          onChange={(e) => updateCertification(i, "name", e.target.value)}
                          className="bg-white/5 border-white/10 text-white"
                        />
                        <Input
                          placeholder="Lëshuar nga"
                          value={cert.issuer}
                          onChange={(e) => updateCertification(i, "issuer", e.target.value)}
                          className="bg-white/5 border-white/10 text-white"
                        />
                      </div>
                      <div className="flex gap-2 items-center">
                        <Input
                          type="date"
                          value={cert.date}
                          onChange={(e) => updateCertification(i, "date", e.target.value)}
                          className="bg-white/5 border-white/10 text-white flex-1"
                        />
                        <Button type="button" size="sm" variant="ghost" onClick={() => removeCertification(i)} className="text-red-400 flex-shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Online Courses */}
                <div className="space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <Label className="text-white">Kurse Online</Label>
                    <Button type="button" size="sm" onClick={addOnlineCourse} variant="outline" className="w-full border-white/20 bg-white/10 text-white hover:bg-white/20 sm:w-auto">
                      <Plus className="w-4 h-4 mr-1" /> Shto kurs
                    </Button>
                  </div>
                  {(form.online_courses || []).map((course, i) => (
                    <div key={i} className="p-3 bg-white/5 rounded-lg space-y-2 border border-white/10">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <Input
                          placeholder="Emri i kursit"
                          value={course.course_name}
                          onChange={(e) => updateOnlineCourse(i, "course_name", e.target.value)}
                          className="bg-white/5 border-white/10 text-white flex-1"
                        />
                        <Input
                          placeholder="Platforma (Udemy, Coursera, etc.)"
                          value={course.platform}
                          onChange={(e) => updateOnlineCourse(i, "platform", e.target.value)}
                          className="bg-white/5 border-white/10 text-white flex-1"
                        />
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_auto]">
                        <Input
                          type="date"
                          placeholder="Data e përfundimit"
                          value={course.completion_date}
                          onChange={(e) => updateOnlineCourse(i, "completion_date", e.target.value)}
                          className="bg-white/5 border-white/10 text-white"
                        />
                        <Input
                          placeholder="URL e certifikatës (opsionale)"
                          value={course.certificate_url}
                          onChange={(e) => updateOnlineCourse(i, "certificate_url", e.target.value)}
                          className="bg-white/5 border-white/10 text-white flex-1"
                        />
                        <Button type="button" size="sm" variant="ghost" onClick={() => removeOnlineCourse(i)} className="text-red-400">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Languages */}
                <div className="space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <Label className="text-white">Gjuhët</Label>
                    <Button type="button" size="sm" onClick={addLanguage} variant="outline" className="w-full border-white/20 bg-white/10 text-white hover:bg-white/20 sm:w-auto">
                      <Plus className="w-4 h-4 mr-1" /> Shto
                    </Button>
                  </div>
                  {(form.languages || []).map((lang, i) => (
                    <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_10rem_auto]">
                      <Input
                        placeholder="Gjuha"
                        value={lang.language}
                        onChange={(e) => updateLanguage(i, "language", e.target.value)}
                        className="bg-white/5 border-white/10 text-white flex-1"
                      />
                      <Select value={lang.level} onValueChange={(v) => updateLanguage(i, "level", v)}>
                        <SelectTrigger className="w-full bg-white/5 border-white/10 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A1">A1 (Fillestar)</SelectItem>
                          <SelectItem value="A2">A2 (Bazë)</SelectItem>
                          <SelectItem value="B1">B1 (I mesëm)</SelectItem>
                          <SelectItem value="B2">B2 (I lartë mesëm)</SelectItem>
                          <SelectItem value="C1">C1 (I avancuar)</SelectItem>
                          <SelectItem value="C2">C2 (Aftësi të plota)</SelectItem>
                          <SelectItem value="Native">Amtare</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button type="button" size="sm" variant="ghost" onClick={() => removeLanguage(i)} className="text-red-400">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Work Experience */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6 space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-white font-semibold text-lg">Përvoja e punës</h3>
                  <Button type="button" size="sm" onClick={addWorkExperience} variant="outline" className="w-full border-white/20 bg-white/10 text-white hover:bg-white/20 sm:w-auto">
                    <Plus className="w-4 h-4 mr-1" /> Shto përvojë
                  </Button>
                </div>
                {(form.work_experience || []).map((exp, i) => (
                  <div key={i} className="p-4 bg-white/5 rounded-lg space-y-3 border border-white/10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input
                        placeholder="Kompania"
                        value={exp.company}
                        onChange={(e) => updateWorkExperience(i, "company", e.target.value)}
                        className="bg-white/5 border-white/10 text-white"
                      />
                      <Input
                        placeholder="Pozicioni"
                        value={exp.role}
                        onChange={(e) => updateWorkExperience(i, "role", e.target.value)}
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input
                        type="month"
                        placeholder="Data e fillimit"
                        value={exp.start_date}
                        onChange={(e) => updateWorkExperience(i, "start_date", e.target.value)}
                        className="bg-white/5 border-white/10 text-white"
                      />
                      {!exp.current && (
                        <Input
                          type="month"
                          placeholder="Data e përfundimit"
                          value={exp.end_date}
                          onChange={(e) => updateWorkExperience(i, "end_date", e.target.value)}
                          className="bg-white/5 border-white/10 text-white"
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={exp.current}
                        onChange={(e) => updateWorkExperience(i, "current", e.target.checked)}
                        className="w-4 h-4"
                      />
                      <Label className="text-white">Punoj aktualisht këtu</Label>
                    </div>
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Përgjegjësitë dhe arritjet"
                        value={exp.responsibilities}
                        onChange={(e) => updateWorkExperience(i, "responsibilities", e.target.value)}
                        className="bg-white/5 border-white/10 text-white min-h-[80px]"
                      />
                      <AISuggestions
                        jobTitle={exp.role}
                        skills={form.skills}
                        type="work_experience"
                        onApply={(suggestion) => updateWorkExperience(i, "responsibilities", suggestion)}
                      />
                    </div>
                    <Button type="button" size="sm" variant="ghost" onClick={() => removeWorkExperience(i)} className="text-red-400">
                      <Trash2 className="w-4 h-4 mr-1" /> Fshi
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Education */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6 space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-white font-semibold text-lg">Arsimi</h3>
                  <Button type="button" size="sm" onClick={addEducation} variant="outline" className="w-full border-white/20 bg-white/10 text-white hover:bg-white/20 sm:w-auto">
                    <Plus className="w-4 h-4 mr-1" /> Shto arsim
                  </Button>
                </div>
                {(form.education || []).map((edu, i) => (
                  <div key={i} className="p-4 bg-white/5 rounded-lg space-y-3 border border-white/10">
                    <Input
                      placeholder="Institucioni"
                      value={edu.institution}
                      onChange={(e) => updateEducation(i, "institution", e.target.value)}
                      className="bg-white/5 border-white/10 text-white"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input
                        placeholder="Diploma"
                        value={edu.degree}
                        onChange={(e) => updateEducation(i, "degree", e.target.value)}
                        className="bg-white/5 border-white/10 text-white"
                      />
                      <Input
                        placeholder="Fusha e studimit"
                        value={edu.field}
                        onChange={(e) => updateEducation(i, "field", e.target.value)}
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input
                        type="month"
                        placeholder="Data e fillimit"
                        value={edu.start_date}
                        onChange={(e) => updateEducation(i, "start_date", e.target.value)}
                        className="bg-white/5 border-white/10 text-white"
                      />
                      {!edu.current && (
                        <Input
                          type="month"
                          placeholder="Data e përfundimit"
                          value={edu.end_date}
                          onChange={(e) => updateEducation(i, "end_date", e.target.value)}
                          className="bg-white/5 border-white/10 text-white"
                        />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={edu.current}
                          onChange={(e) => updateEducation(i, "current", e.target.checked)}
                          className="w-4 h-4"
                        />
                        <Label className="text-white">Studime në vazhdim</Label>
                      </div>
                      <Button type="button" size="sm" variant="ghost" onClick={() => removeEducation(i)} className="text-red-400">
                        <Trash2 className="w-4 h-4 mr-1" /> Fshi
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
          </ProfilePanel>
        )}

        {/* Recruiter/Employer Specific */}
        {isRecruiterOrEmployer && (
          <ProfilePanel
            title="Kompania"
            description="Të dhënat e kompanisë dhe specializimi i rekrutimit."
          >
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-white font-semibold text-lg mb-4">Informacion për kompani</h3>
              
              <div className="space-y-1.5">
                <Label className="text-white">Emri i kompanisë</Label>
                <Input
                  value={form.company_name}
                  onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-white">Madhësia e kompanisë</Label>
                  <Select value={form.company_size} onValueChange={(v) => setForm({ ...form, company_size: v })}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-10">1-10 punonjës</SelectItem>
                      <SelectItem value="11-50">11-50 punonjës</SelectItem>
                      <SelectItem value="51-200">51-200 punonjës</SelectItem>
                      <SelectItem value="201-500">201-500 punonjës</SelectItem>
                      <SelectItem value="500+">500+ punonjës</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-white">Madhësia e ekipit të rekrutimit</Label>
                  <Input
                    type="number"
                    value={form.recruitment_team_size}
                    onChange={(e) => setForm({ ...form, recruitment_team_size: parseInt(e.target.value) || 0 })}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-white">Specializimi në industri (të ndara me presje)</Label>
                <Input
                  value={form.industry_specialization?.join(", ") || ""}
                  onChange={(e) => setForm({ 
                    ...form, 
                    industry_specialization: e.target.value.split(",").map(s => s.trim()).filter(Boolean)
                  })}
                  placeholder="Teknologji, Ndërtim, Shëndetësi"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
            </CardContent>
          </Card>
          </ProfilePanel>
        )}

        {/* Profili fetar dhe edukativ */}
        <ProfilePanel
          title="Besimi dhe edukimi"
          description="Preferenca personale për orientim dhe personalizim të përmbajtjes."
        >
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-6 space-y-5">
            <div>
              <h3 className="text-white font-semibold text-lg mb-1">Profili fetar dhe edukativ</h3>
              <p className="text-white/50 text-sm leading-relaxed">
                Ky informacion përdoret vetëm për orientim, vetë-reflektim dhe personalizim të përmbajtjes në platformë. Nuk përdoret për gjykim apo përjashtim.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-white">Si e përshkruan lidhjen tënde me Islamin?</Label>
              <Select value={form.islam_relation} onValueChange={handleIslamRelationChange}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Zgjidh një opsion..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Jam musliman praktikues">Jam musliman praktikues</SelectItem>
                  <SelectItem value="Jam musliman dhe praktikoj pjesërisht">Jam musliman dhe praktikoj pjesërisht</SelectItem>
                  <SelectItem value="Jam musliman, por dua të mësoj më shumë">Jam musliman, por dua të mësoj më shumë</SelectItem>
                  <SelectItem value="Jam i interesuar të mësoj më shumë për Islamin">Jam i interesuar të mësoj më shumë për Islamin</SelectItem>
                  <SelectItem value="Preferoj të mos përgjigjem">Preferoj të mos përgjigjem</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-white">Sa njohuri ke për bazat e Islamit?</Label>
              <Select value={form.islam_knowledge_level} onValueChange={(v) => setForm({ ...form, islam_knowledge_level: v })}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Zgjidh një opsion..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Të mira">Të mira</SelectItem>
                  <SelectItem value="Mesatare">Mesatare</SelectItem>
                  <SelectItem value="Të pakta">Të pakta</SelectItem>
                  <SelectItem value="Shumë të pakta">Shumë të pakta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-white">A dëshiron të të sugjerojmë materiale islame dhe edukative në Antokton?</Label>
              <Select value={form.islam_content_preference} onValueChange={(v) => setForm({ ...form, islam_content_preference: v })}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Zgjidh një opsion..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Po">Po</SelectItem>
                  <SelectItem value="Ndonjëherë">Ndonjëherë</SelectItem>
                  <SelectItem value="Jo">Jo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-white">Sa dëshirë ke për të mësuar më shumë rreth Islamit?</Label>
              <Select value={form.islam_learning_interest} onValueChange={(v) => setForm({ ...form, islam_learning_interest: v })}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Zgjidh një opsion..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Shumë">Shumë</SelectItem>
                  <SelectItem value="Mesatare">Mesatare</SelectItem>
                  <SelectItem value="Pak">Pak</SelectItem>
                  <SelectItem value="Për momentin jo">Për momentin jo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        </ProfilePanel>

        {/* Social Links */}
        <ProfilePanel
          title="Lidhjet publike"
          description="LinkedIn, Facebook dhe website personal ose profesional."
        >
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-6 space-y-4">
            <h3 className="text-white font-semibold text-lg mb-4">Rrjetet sociale</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-white">LinkedIn</Label>
                <Input
                  value={form.linkedin}
                  onChange={(e) => setForm({ ...form, linkedin: e.target.value })}
                  placeholder="https://linkedin.com/in/..."
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-white">Facebook</Label>
                <Input
                  value={form.facebook}
                  onChange={(e) => setForm({ ...form, facebook: e.target.value })}
                  placeholder="https://facebook.com/..."
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-white">Website</Label>
                <Input
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  placeholder="https://..."
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
            </div>
          </CardContent>
        </Card>
        </ProfilePanel>

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] font-semibold h-12 text-base"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
          Ruaj ndryshimet
        </Button>

        {success && (
          <div className="text-center">
            <span className="text-green-400 text-sm flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Profili u përditësua me sukses!
            </span>
          </div>
        )}

        {/* Account Deletion */}
        <ProfilePanel
          title="Siguria e llogarisë"
          description="Veprime të rralla dhe të ndjeshme për llogarinë."
          danger
        >
        <Card className="bg-red-500/10 border-red-500/20 mt-8">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-white font-semibold mb-1">Fshi llogarinë</h3>
                  <p className="text-white text-sm">Kjo veprim është permanent dhe nuk mund të rikuperohet. Do të fshihen të gjitha të dhënat tuaja.</p>
                </div>
              </div>
              <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full bg-red-600 hover:bg-red-700 sm:w-auto sm:whitespace-nowrap">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Fshi llogarinë
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-[#0b1020] border-red-500/30">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-red-400 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      Fshirja e llogarisë
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-white">
                      Jeni i sigurt? Kjo veprim është permanent dhe do të fshij të gjitha të dhënat tuaja përfshirë profilin, aplikime, mesazhe dhe historiun e pagesave.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="bg-white/5 p-3 rounded-lg border border-white/10 my-4">
                    <p className="text-white text-sm">Email: <span className="text-white font-mono">{user?.email}</span></p>
                  </div>
                  <div className="flex gap-3">
                    <AlertDialogCancel className="bg-white/10 border-white/20 text-white hover:bg-white/20">Anulo</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDeleteAccount}
                      disabled={loading}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Fshi përgjithmonë
                    </AlertDialogAction>
                  </div>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
        </ProfilePanel>

        <ProfilePanel
          title="Aktiviteti, aplikimet dhe pagesat"
          description="Kërkimet e ruajtura, aplikimet dhe historiku i pagesave."
        >
        <div className="space-y-6">
        {/* Saved Searches */}
        {savedSearches.length > 0 && (
          <Card className="bg-white/5 border-white/10 mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Bookmark className="w-5 h-5 text-[#8ab4ff]" />
                Kërkirmet e Ruajtura
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {savedSearches.map((search) => (
                  <div key={search.id} className="flex flex-col gap-3 rounded-lg border border-white/20 bg-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-white font-semibold">{search.search_name}</p>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {search.filters.category && (
                          <Badge variant="outline" className="border-white/30 text-white/80 text-xs">
                            {search.filters.category}
                          </Badge>
                        )}
                        {search.filters.profession && (
                          <Badge variant="outline" className="border-white/30 text-white/80 text-xs">
                            {search.filters.profession}
                          </Badge>
                        )}
                        {search.filters.region && (
                          <Badge variant="outline" className="border-white/30 text-white/80 text-xs">
                            {search.filters.region}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={search.notification_enabled ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-white/10 text-white/70 border border-white/20'}>
                        {search.notification_enabled ? 'Njoftime aktive' : 'Njoftime joaktive'}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteSavedSearch(search.id)}
                        className="text-red-400 hover:bg-red-400/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Aplikimet e mia */}
        <MyApplications userEmail={user?.email} />

        {/* Payment History */}
        {paymentHistory.length > 0 && (
          <Card className="bg-white/5 border-white/10 mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <CreditCard className="w-5 h-5 text-[#8ab4ff]" />
                Historiku i Pagesave
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {paymentHistory.map((payment) => (
                  <div key={payment.id} className="flex flex-col gap-3 rounded-lg border border-white/20 bg-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-white font-semibold">
                        {payment.plan_type === 'monthly' ? 'Premium Mujor' : 'Premium Vjetor'}
                      </p>
                      <p className="text-white text-sm">
                         {new Date(payment.created_date).toLocaleDateString('sq-AL', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                       </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-white font-bold text-lg">{payment.amount_paid} EUR</p>
                      <p className={`text-sm font-medium ${payment.is_active ? 'text-green-400' : 'text-white'}`}>
                        {payment.is_active ? 'Aktiv' : 'Përfunduar'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        {savedSearches.length === 0 && paymentHistory.length === 0 && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-sm text-white/55">
            Nuk ka ende kërkime të ruajtura ose pagesa për t'u shfaqur.
          </div>
        )}
        </div>
        </ProfilePanel>
      </motion.form>

      {/* Onboarding Tour */}
      {showOnboarding && (
        <OnboardingTour 
          onComplete={() => {
            setShowOnboarding(false);
            localStorage.setItem(`onboarding_seen_${user.email}`, 'true');
          }}
        />
      )}
      </ProfileTabs>
    </div>
  );
}
