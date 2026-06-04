import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Ban,
  Bell,
  Briefcase,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Copy,
  Edit3,
  ExternalLink,
  FileClock,
  MoreVertical,
  Search,
  Settings,
  Shield,
  ShoppingBag,
  Trash2,
  User as UserIcon,
  Wrench,
} from "lucide-react";
import { base44 } from "@/api/antoktonClient";
import DeletedPostsHistory from "./DeletedPostsHistory";
import Admin from "../../pages/Admin";
import InspectorPanel from "../../pages/InspectorPanel";
import RecruiterTools from "../../pages/RecruiterTools";
import NotificationSettings from "../../components/notifications/NotificationSettings";
import MyStatusHistory from "./MyStatusHistory";
import BlockedUsersManager from "./BlockedUsersManager";

const formatDate = (value) => {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("sq-AL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(value);
  }
};

const getNoticeTitle = (item) => item?.title || item?.name || item?.subject || "Njoftim pa titull";

function NoticeActions({ notice }) {
  const [open, setOpen] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${notice.viewUrl}`);
      setOpen(false);
    } catch {
      setOpen(false);
    }
  };

  return (
    <div className="relative shrink-0" data-swipe-back-ignore>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/65 transition hover:bg-white/10 hover:text-white"
        aria-label="Veprimet e njoftimit"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-20 w-44 overflow-hidden rounded-xl border border-white/10 bg-[#101827] shadow-2xl">
          <a
            href={notice.viewUrl}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-white/75 transition hover:bg-white/10 hover:text-white"
            onClick={() => setOpen(false)}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Hap
          </a>
          <a
            href={notice.editUrl || notice.viewUrl}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-white/75 transition hover:bg-white/10 hover:text-white"
            onClick={() => setOpen(false)}
          >
            <Edit3 className="h-3.5 w-3.5" />
            Përpuno
          </a>
          <button
            type="button"
            onClick={copyLink}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-white/75 transition hover:bg-white/10 hover:text-white"
          >
            <Copy className="h-3.5 w-3.5" />
            Kopjo linkun
          </button>
        </div>
      )}
    </div>
  );
}

function MyNotices({ user, isStaff }) {
  const userEmail = user?.email;

  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ["profile-my-notice-jobs", userEmail],
    queryFn: () => base44.entities.Job.filter({ created_by: userEmail }, "-created_date", 120),
    enabled: !!userEmail,
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["profile-my-notice-events", userEmail],
    queryFn: async () => {
      const [byCreator, byOrganizer] = await Promise.all([
        base44.entities.Event.filter({ created_by: userEmail }, "-created_date", 80).catch(() => []),
        base44.entities.Event.filter({ organizer_email: userEmail }, "-created_date", 80).catch(() => []),
      ]);
      const merged = new Map();
      [...byCreator, ...byOrganizer].forEach((item) => {
        if (item?.id) merged.set(item.id, item);
      });
      return Array.from(merged.values());
    },
    enabled: !!userEmail,
  });

  const notices = useMemo(() => {
    const jobNotices = jobs.map((item) => ({
      ...item,
      sourceType: item.category === "pazar" || item.type === "pazar" ? "Pazar" : "Njoftim",
      icon: item.category === "pazar" || item.type === "pazar" ? ShoppingBag : Briefcase,
      viewUrl: `/PostDetail?id=${item.id}`,
      editUrl: `/CreatePost?edit=${item.id}`,
    }));
    const eventNotices = events.map((item) => ({
      ...item,
      sourceType: "Ngjarje",
      icon: CalendarDays,
      viewUrl: `/EventDetail?id=${item.id}`,
      editUrl: `/Events?edit=${item.id}`,
    }));
    return [...jobNotices, ...eventNotices].sort(
      (a, b) => new Date(b.created_date || b.updated_date || 0) - new Date(a.created_date || a.updated_date || 0)
    );
  }, [jobs, events]);

  const loading = jobsLoading || eventsLoading;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
        <div className="mb-4 flex items-start gap-3">
          <div className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#8ab4ff]/15 text-[#8ab4ff]">
            <Bell className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-white">Njoftimet e mia</h3>
            <p className="text-sm leading-relaxed text-white/55">
              Këtu shfaqen njoftimet e tua: punë, pazar, ngjarje dhe kategori të tjera njoftuese. Statuset mbeten te “Statuset e mia”.
            </p>
          </div>
        </div>

        {loading ? (
          <p className="rounded-xl border border-white/10 bg-black/15 p-4 text-sm text-white/50">Duke ngarkuar njoftimet...</p>
        ) : notices.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-black/15 p-4 text-sm text-white/50">Nuk ka ende njoftime për këtë profil.</p>
        ) : (
          <div className="space-y-3">
            {notices.map((notice) => {
              const Icon = notice.icon;
              return (
                <article key={`${notice.sourceType}-${notice.id}`} className="min-w-0 rounded-2xl border border-white/10 bg-black/15 p-3 sm:p-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white/75">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-[#9bffd6]/20 bg-[#9bffd6]/10 px-2 py-0.5 text-[11px] font-semibold text-[#9bffd6]">
                          {notice.sourceType}
                        </span>
                        {(notice.status || notice.approval_status) && (
                          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-medium text-white/55">
                            {notice.status || notice.approval_status}
                          </span>
                        )}
                      </div>
                      <h4 className="break-words text-sm font-semibold text-white sm:text-base">{getNoticeTitle(notice)}</h4>
                      <p className="mt-1 text-xs text-white/45">{formatDate(notice.created_date || notice.updated_date)}</p>
                    </div>
                    <NoticeActions notice={notice} />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <Trash2 className="h-4 w-4 text-red-300" />
          <h3 className="text-sm font-semibold text-white">
            {isStaff ? "Njoftimet e fshira" : "Njoftimet e mia të fshira"}
          </h3>
        </div>
        <DeletedPostsHistory userEmail={userEmail} isAdmin={isStaff} />
      </section>
    </div>
  );
}

export default function ProfileTabs({ user, children }) {
  const [activeTab, setActiveTab] = useState("profile");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab === "notifications" || tab === "deleted_posts") {
      setActiveTab("my_notices");
    } else if (tab === "webapp_view" || tab === "activity_log") {
      setActiveTab("admin");
    } else if (tab) {
      setActiveTab(tab);
    }
  }, []);

  const isAdmin = user?.role === "admin" || user?.member_category === "admin";
  const isModerator = user?.role === "moderator" || user?.member_category === "moderator";
  const isInspector = user?.member_category === "inspector" || isAdmin;
  const isRecruiterUser = user?.user_type === "recruiter" || user?.user_type === "employer";

  const tabs = useMemo(() => ([
    { group: "Profili im", value: "profile", label: "Informacioni bazë", icon: <UserIcon className="h-3.5 w-3.5" />, show: true },
    { group: "Profili im", value: "my_statuses", label: "Statuset e mia", icon: <FileClock className="h-3.5 w-3.5" />, show: true },
    { group: "Profili im", value: "my_notices", label: "Njoftimet e mia", icon: <Bell className="h-3.5 w-3.5" />, show: true },
    { group: "Profili im", value: "blocked_users", label: "Përdorues të bllokuar", icon: <Ban className="h-3.5 w-3.5" />, show: true },
    { group: "Personalizime", value: "notification_settings", label: "Cilësimet e zërit", icon: <Settings className="h-3.5 w-3.5" />, show: true },
    { group: "Admin", value: "admin", label: isAdmin ? "Paneli Admin" : "Paneli Moderator", icon: <Shield className="h-3.5 w-3.5" />, show: isAdmin || isModerator },
    { group: "Admin", value: "tools", label: "Mjetet e Rekrutimit", icon: <Wrench className="h-3.5 w-3.5" />, show: isAdmin || isModerator || isRecruiterUser },
    { group: "Inspektor", value: "inspector", label: "Paneli Inspektor", icon: <Search className="h-3.5 w-3.5" />, show: isInspector },
  ]).filter((tab) => tab.show), [isAdmin, isModerator, isInspector, isRecruiterUser]);

  const groupedTabs = tabs.reduce((groups, tab) => {
    if (!groups[tab.group]) groups[tab.group] = [];
    groups[tab.group].push(tab);
    return groups;
  }, {});

  const activeGroup = tabs.find((tab) => tab.value === activeTab)?.group || "Profili im";
  const [openGroups, setOpenGroups] = useState({ "Profili im": true });

  useEffect(() => {
    setOpenGroups((current) => ({ ...current, [activeGroup]: true }));
  }, [activeGroup]);

  const toggleGroup = (group) => {
    setOpenGroups((current) => ({ ...current, [group]: !current[group] }));
  };

  return (
    <div className="grid w-full max-w-full gap-5 overflow-hidden lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="w-full max-w-full pb-2 lg:pb-0" data-swipe-back-ignore>
          <div className="grid w-full max-w-full grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:flex lg:flex-col lg:rounded-2xl lg:border lg:border-white/10 lg:bg-white/5 lg:p-2">
            {Object.entries(groupedTabs).map(([group, groupTabs]) => {
              const isOpen = !!openGroups[group];
              return (
                <div key={group} className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] p-2 lg:border-transparent lg:bg-transparent">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group)}
                    className="mb-1.5 flex w-full items-center justify-between gap-2 rounded-xl px-1.5 py-1 text-left text-[11px] font-bold uppercase tracking-wide text-white/50 transition hover:bg-white/5 hover:text-white/75"
                    aria-expanded={isOpen}
                  >
                    <span>{group}</span>
                    {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </button>
                  {isOpen && (
                    <div className="space-y-1.5">
                      {groupTabs.map((tab) => (
                        <button
                          key={tab.value}
                          onClick={() => setActiveTab(tab.value)}
                          className={`flex w-full min-w-0 items-center justify-start gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-medium leading-tight transition-all sm:px-3 ${
                            activeTab === tab.value
                              ? "bg-white/20 text-white"
                              : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white lg:bg-transparent"
                          }`}
                        >
                          <span className="shrink-0">{tab.icon}</span>
                          <span className="min-w-0 break-words">{tab.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      <div className="min-w-0 max-w-full overflow-hidden">
        {activeTab === "profile" && children}
        {activeTab === "my_statuses" && <MyStatusHistory user={user} />}
        {activeTab === "my_notices" && <MyNotices user={user} isStaff={isAdmin || isModerator} />}
        {activeTab === "notification_settings" && (
          <div className="max-w-xl rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
            <h3 className="mb-4 text-base font-semibold text-white">Cilësimet e zërit</h3>
            <NotificationSettings />
          </div>
        )}
        {activeTab === "blocked_users" && <BlockedUsersManager user={user} />}
        {(isAdmin || isModerator) && activeTab === "admin" && <Admin />}
        {isInspector && activeTab === "inspector" && <InspectorPanel />}
        {(isAdmin || isModerator || isRecruiterUser) && activeTab === "tools" && <RecruiterTools />}
      </div>
    </div>
  );
}
