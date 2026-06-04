import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Ban,
  Bell,
  FileClock,
  LayoutDashboard,
  MonitorSmartphone,
  Palette,
  RefreshCw,
  Search,
  Settings,
  Shield,
  Trash2,
  User as UserIcon,
  UserMinus,
  UserPlus,
  Wrench,
} from "lucide-react";
import { base44 } from "@/api/antoktonClient";
import DeletedPostsHistory from "./DeletedPostsHistory";
import Admin from "../../pages/Admin";
import InspectorPanel from "../../pages/InspectorPanel";
import RecruiterTools from "../../pages/RecruiterTools";
import NotificationCenter from "../../pages/NotificationCenter";
import NotificationSettings from "../../components/notifications/NotificationSettings";
import BottomNavEditor from "../../components/mobile/BottomNavEditor";
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

const displayName = (user) => {
  if (!user) return "Anëtar";
  const composed = [user.first_name, user.surname].filter(Boolean).join(" ").trim();
  return user.display_name || user.public_name || user.profile_name || composed || user.full_name || user.email || "Anëtar";
};

async function safeEntityList(entityName, sort = "-created_date", limit = 50) {
  try {
    const entity = base44.entities?.[entityName];
    if (!entity?.list) return [];
    return await entity.list(sort, limit);
  } catch {
    return [];
  }
}

function ActivityLogTools() {
  const { data, isFetching, refetch } = useQuery({
    queryKey: ["profile-admin-activity-tools"],
    queryFn: async () => {
      const [users, adminActions, userActivities, reports] = await Promise.all([
        safeEntityList("User", "-created_date", 60),
        safeEntityList("AdminAction", "-created_date", 80),
        safeEntityList("UserActivity", "-created_date", 80),
        safeEntityList("Report", "-created_date", 40),
      ]);

      const deletedUsers = users.filter((item) => item.is_deleted || item.status === "deleted" || item.account_status === "deleted");
      const disabledUsers = users.filter((item) => item.is_disabled || item.status === "disabled" || item.account_status === "disabled");
      const recentActivity = [
        ...adminActions.map((item) => ({ ...item, source: "Admin", label: item.action || item.action_type || "Veprim administrativ" })),
        ...userActivities.map((item) => ({ ...item, source: "Përdorues", label: item.activity_type || item.event_type || "Aktivitet" })),
        ...reports.map((item) => ({ ...item, source: "Raportim", label: item.reason || item.status || "Raportim" })),
      ]
        .sort((a, b) => new Date(b.created_date || b.updated_date || 0) - new Date(a.created_date || a.updated_date || 0))
        .slice(0, 80);

      return { users, deletedUsers, disabledUsers, recentActivity };
    },
    refetchInterval: 15000,
  });

  const registrations = data?.users || [];
  const removed = [...(data?.deletedUsers || []), ...(data?.disabledUsers || [])];
  const activity = data?.recentActivity || [];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">Monitorim i anëtarëve dhe aktivitetit</h3>
          <p className="text-sm text-white/55">Rifreskohet automatikisht çdo 15 sekonda pa prekur backend-in.</p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Rifresko
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="min-w-0 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="mb-3 flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-[#9bffd6]" />
            <h4 className="font-semibold text-white">Regjistrime të fundit</h4>
          </div>
          <div className="space-y-2">
            {registrations.slice(0, 12).map((member) => (
              <div key={member.id || member.email} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/15 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{displayName(member)}</p>
                  <p className="truncate text-xs text-white/45">{member.email}</p>
                </div>
                <span className="shrink-0 text-right text-[11px] text-white/45">{formatDate(member.created_date)}</span>
              </div>
            ))}
            {registrations.length === 0 && <p className="text-sm text-white/45">Nuk ka të dhëna regjistrimi për t'u shfaqur.</p>}
          </div>
        </section>

        <section className="min-w-0 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="mb-3 flex items-center gap-2">
            <UserMinus className="h-4 w-4 text-red-300" />
            <h4 className="font-semibold text-white">Çregjistrime / çaktivizime</h4>
          </div>
          <div className="space-y-2">
            {removed.slice(0, 12).map((member) => (
              <div key={member.id || member.email} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-red-500/15 bg-red-500/5 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{displayName(member)}</p>
                  <p className="truncate text-xs text-white/45">{member.email}</p>
                </div>
                <span className="shrink-0 text-right text-[11px] text-white/45">{formatDate(member.updated_date || member.created_date)}</span>
              </div>
            ))}
            {removed.length === 0 && <p className="text-sm text-white/45">Nuk ka çregjistrime ose çaktivizime të fundit.</p>}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Activity className="h-4 w-4 text-[#8ab4ff]" />
          <h4 className="font-semibold text-white">Activity log</h4>
        </div>
        <div className="max-h-[560px] space-y-2 overflow-y-auto pr-1">
          {activity.map((item, index) => (
            <div key={item.id || `${item.source}-${index}`} className="grid gap-2 rounded-xl border border-white/10 bg-black/15 p-3 sm:grid-cols-[110px_minmax(0,1fr)_140px]">
              <span className="text-xs font-semibold text-[#9bffd6]">{item.source}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{item.label}</p>
                <p className="truncate text-xs text-white/45">
                  {item.user_email || item.email || item.actor_email || item.reporter_email || item.path || item.entity_type || "Aktivitet në platformë"}
                </p>
              </div>
              <span className="text-left text-[11px] text-white/45 sm:text-right">{formatDate(item.created_date || item.updated_date)}</span>
            </div>
          ))}
          {activity.length === 0 && <p className="text-sm text-white/45">Nuk ka ende aktivitet për t'u shfaqur.</p>}
        </div>
      </section>
    </div>
  );
}

function WebAppDesignTools({ user, isAdmin, isPremium }) {
  return (
    <div className="max-w-3xl space-y-5">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="mb-3 flex items-center gap-2">
          <Palette className="h-4 w-4 text-[#9bffd6]" />
          <h3 className="font-semibold text-white">Pamje e web/app</h3>
        </div>
        <p className="text-sm leading-relaxed text-white/60">
          Veglat e pamjes mbeten të kufizuara sipas rolit. Administratori menaxhon pamjen globale, ndërsa përdoruesi premium mund të ruajë personalizime të veta aty ku lejohet.
        </p>
        {isAdmin && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Link to="/DesignerPage" className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/15">
              Hap veglat e dizajnit
            </Link>
            <Link to="/Admin?tab=webdesign" className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/15">
              Webdizajn në Admin
            </Link>
          </div>
        )}
      </div>

      {(isAdmin || isPremium) && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <BottomNavEditor isAdmin={false} userEmail={user?.email} />
        </div>
      )}
      {isAdmin && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <BottomNavEditor isAdmin={true} userEmail={user?.email} />
        </div>
      )}
    </div>
  );
}

export default function ProfileTabs({ user, children }) {
  const [activeTab, setActiveTab] = useState("profile");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab) setActiveTab(tab);
  }, []);

  const isAdmin = user?.role === "admin" || user?.member_category === "admin";
  const isModerator = user?.role === "moderator" || user?.member_category === "moderator";
  const isInspector = user?.member_category === "inspector" || isAdmin;
  const isRecruiterUser = user?.user_type === "recruiter" || user?.user_type === "employer";
  const isPremium = Boolean(user?.is_premium || (user?.premium_until && new Date(user.premium_until) > new Date()));

  const tabs = useMemo(() => ([
    { group: "Profili im", value: "profile", label: "Informacioni bazë", icon: <UserIcon className="h-3.5 w-3.5" />, show: true },
    { group: "Profili im", value: "my_statuses", label: "Statuset e mia", icon: <FileClock className="h-3.5 w-3.5" />, show: true },
    { group: "Profili im", value: "notifications", label: "Njoftimet", icon: <Bell className="h-3.5 w-3.5" />, show: true },
    { group: "Profili im", value: "blocked_users", label: "Përdorues të bllokuar", icon: <Ban className="h-3.5 w-3.5" />, show: true },
    { group: "Personalizime", value: "notification_settings", label: "Cilësimet e Njoftimeve", icon: <Settings className="h-3.5 w-3.5" />, show: true },
    { group: "Personalizime", value: "deleted_posts", label: "Historiku i fshirjeve", icon: <Trash2 className="h-3.5 w-3.5" />, show: true },
    { group: "Pamje e web/app", value: "webapp_view", label: "Veglat për dizajn", icon: <MonitorSmartphone className="h-3.5 w-3.5" />, show: isAdmin || isPremium },
    { group: "Admin", value: "admin", label: isAdmin ? "Paneli Admin" : "Paneli Moderator", icon: <Shield className="h-3.5 w-3.5" />, show: isAdmin || isModerator },
    { group: "Admin", value: "activity_log", label: "Regjistrime & activity log", icon: <Activity className="h-3.5 w-3.5" />, show: isAdmin || isModerator },
    { group: "Admin", value: "tools", label: "Mjetet e Rekrutimit", icon: <Wrench className="h-3.5 w-3.5" />, show: isAdmin || isModerator || isRecruiterUser },
    { group: "Inspektor", value: "inspector", label: "Paneli Inspektor", icon: <Search className="h-3.5 w-3.5" />, show: isInspector },
  ]).filter((tab) => tab.show), [isAdmin, isModerator, isInspector, isRecruiterUser, isPremium]);

  const groupedTabs = tabs.reduce((groups, tab) => {
    if (!groups[tab.group]) groups[tab.group] = [];
    groups[tab.group].push(tab);
    return groups;
  }, {});

  return (
    <div className="grid w-full max-w-full gap-5 overflow-hidden lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="w-full max-w-full pb-2 lg:pb-0" data-swipe-back-ignore>
          <div className="grid w-full max-w-full grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:flex lg:flex-col lg:rounded-2xl lg:border lg:border-white/10 lg:bg-white/5 lg:p-2">
            {Object.entries(groupedTabs).map(([group, groupTabs]) => (
              <div key={group} className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] p-2 lg:border-transparent lg:bg-transparent">
                <div className="mb-1.5 flex items-center gap-2 px-1.5 text-[11px] font-bold uppercase tracking-wide text-white/40">
                  {group === "Pamje e web/app" ? <LayoutDashboard className="h-3.5 w-3.5" /> : null}
                  <span>{group}</span>
                </div>
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
              </div>
            ))}
          </div>
        </div>
      </aside>

      <div className="min-w-0 max-w-full overflow-hidden">
        {activeTab === "profile" && children}
        {activeTab === "my_statuses" && <MyStatusHistory user={user} />}
        {activeTab === "notifications" && <NotificationCenter />}
        {activeTab === "notification_settings" && <div className="max-w-xl"><NotificationSettings /></div>}
        {activeTab === "blocked_users" && <BlockedUsersManager user={user} />}
        {activeTab === "webapp_view" && <WebAppDesignTools user={user} isAdmin={isAdmin} isPremium={isPremium} />}
        {(isAdmin || isModerator) && activeTab === "admin" && <Admin />}
        {(isAdmin || isModerator) && activeTab === "activity_log" && <ActivityLogTools />}
        {isInspector && activeTab === "inspector" && <InspectorPanel />}
        {(isAdmin || isModerator || isRecruiterUser) && activeTab === "tools" && <RecruiterTools />}
        {activeTab === "deleted_posts" && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="mb-5 flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-red-400" />
              <h3 className="text-sm font-semibold text-white">
                {isAdmin || isModerator ? "Historiku i Fshirjeve (të gjitha)" : "Njoftimet e Mia të Fshira"}
              </h3>
            </div>
            <DeletedPostsHistory userEmail={user?.email} isAdmin={isAdmin || isModerator} />
          </div>
        )}
      </div>
    </div>
  );
}
