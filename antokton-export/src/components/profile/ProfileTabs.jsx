import React, { useState, useEffect } from "react";
import { Shield, User as UserIcon, Wrench, Search, Bell, Settings, Smartphone, Trash2 } from "lucide-react";
import DeletedPostsHistory from "./DeletedPostsHistory";
import Admin from "../../pages/Admin";
import InspectorPanel from "../../pages/InspectorPanel";
import RecruiterTools from "../../pages/RecruiterTools";
import NotificationCenter from "../../pages/NotificationCenter";
import NotificationSettings from "../../components/notifications/NotificationSettings";
import BottomNavEditor from "../../components/mobile/BottomNavEditor";

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
  const isPremium = user?.is_premium || user?.premium_until ? new Date(user.premium_until) > new Date() : false;
  
  const hasTabs = true; // always show tabs for notifications
  
  if (!hasTabs) {
    return children;
  }

  const tabs = [
    { value: "profile", label: "Profili im", icon: <UserIcon className="w-3.5 h-3.5" />, show: true },
    { value: "notifications", label: "Njoftimet", icon: <Bell className="w-3.5 h-3.5" />, show: true },
    { value: "notification_settings", label: "Cilësimet", icon: <Settings className="w-3.5 h-3.5" />, show: true },
    { value: "nav_editor", label: "📱 Menu Fundore", icon: <Smartphone className="w-3.5 h-3.5" />, show: isAdmin || isPremium },
    { value: "admin", label: isAdmin ? "⚙️ Admin" : "🛡️ Moderator", icon: <Shield className="w-3.5 h-3.5" />, show: isAdmin || isModerator },
    { value: "inspector", label: "🔍 Inspektor", icon: <Search className="w-3.5 h-3.5" />, show: isInspector },
    { value: "tools", label: "🧰 Mjetet e Rekrutimit", icon: <Wrench className="w-3.5 h-3.5" />, show: isAdmin || isModerator || isRecruiterUser },
    { value: "deleted_posts", label: "Fshirjet", icon: <Trash2 className="w-3.5 h-3.5" />, show: true },
  ].filter(t => t.show);

  return (
    <div className="grid w-full max-w-full gap-5 overflow-hidden lg:grid-cols-[230px_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="w-full max-w-full pb-2 lg:pb-0" data-swipe-back-ignore>
          <div className="grid w-full max-w-full grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:flex lg:flex-col lg:rounded-2xl lg:border lg:border-white/10 lg:bg-white/5 lg:p-2">
            {tabs.map(tab => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`flex min-w-0 items-center justify-start gap-1.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium leading-tight transition-all sm:px-3 ${
                  activeTab === tab.value
                    ? "bg-white/20 text-white"
                    : "bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 lg:border-transparent lg:bg-transparent"
                }`}
              >
                <span className="shrink-0">{tab.icon}</span>
                <span className="min-w-0 break-words">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </aside>

      <div className="min-w-0 max-w-full overflow-hidden">
        {activeTab === "profile" && children}
        {activeTab === "notifications" && <NotificationCenter />}
        {activeTab === "notification_settings" && <div className="max-w-xl"><NotificationSettings /></div>}
        {activeTab === "nav_editor" && (
          <div className="max-w-2xl space-y-8">
            {isAdmin && (
              <div className="rounded-2xl border border-white/10 p-5 bg-white/3">
                <BottomNavEditor isAdmin={true} userEmail={user?.email} />
              </div>
            )}
            {(isAdmin || isPremium) && (
              <div className="rounded-2xl border border-white/10 p-5 bg-white/3">
                <BottomNavEditor isAdmin={false} userEmail={user?.email} />
              </div>
            )}
          </div>
        )}
        {(isAdmin || isModerator) && activeTab === "admin" && <Admin />}
        {isInspector && activeTab === "inspector" && <InspectorPanel />}
        {(isAdmin || isModerator || isRecruiterUser) && activeTab === "tools" && <RecruiterTools />}
        {activeTab === "deleted_posts" && (
          <div className="rounded-2xl border border-white/10 p-5 bg-white/3">
            <div className="flex items-center gap-2 mb-5">
              <Trash2 className="w-4 h-4 text-red-400" />
              <h3 className="text-white font-semibold text-sm">
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
