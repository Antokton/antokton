import React, { useState, useEffect } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Save, RotateCcw, Star, Home, Briefcase, MessageCircle, User, Radio, Bell, Search, Calendar, Heart, Settings, Globe, Tv, GraduationCap, Wrench, Plane, Gift, Users, Building2, MapPin, Music, Video, BookOpen, ShoppingBag, Zap, Award, Flag, Layers } from "lucide-react";

const ICON_MAP = {
  Home, Briefcase, MessageCircle, User, Radio, Bell, Search, Calendar,
  Heart, Star, Settings, Globe, Tv, GraduationCap, Wrench, Plane, Gift,
  Users, Building2, MapPin, Music, Video, BookOpen, ShoppingBag, Zap, Award, Flag, Layers
};

const AVAILABLE_ICONS = Object.keys(ICON_MAP);

const AVAILABLE_PATHS = [
  { label: "Kryefaqja", path: "/" },
  { label: "Njoftime (Feed)", path: "/Feed" },
  { label: "Statuse", path: "/Statuset" },
  { label: "Mesazhe", path: "/Messages" },
  { label: "Profili", path: "/Profile" },
  { label: "Ngjarje", path: "/Events" },
  { label: "Media", path: "/Media" },
  { label: "Bamirësi", path: "/Bamiresi" },
  { label: "Kërko", path: "/Search" },
  { label: "Anëtarë", path: "/Members" },
  { label: "Kompani", path: "/Companies" },
  { label: "Bileta", path: "/Bileta" },
  { label: "Edukim", path: "/Edukim" },
  { label: "Partnerë", path: "/Partners" },
  { label: "Njoftimet", path: "/NotificationCenter" },
  { label: "Cilësimet", path: "/NotificationSettings" },
  { label: "Pazar", path: "/Pazar" },
  { label: "Punë (Feed)", path: "/Feed?category=pune" },
  { label: "Prona (Feed)", path: "/Feed?category=prona" },
  { label: "Shërbime (Feed)", path: "/Feed?category=sherbime" },
  { label: "Posto Njoftim", path: "/CreatePost" },
  { label: "Aplikime të mia", path: "/ApplicationsDashboard" },
  { label: "Facebook Grupet", path: "/FacebookGroups" },
  { label: "Rekrutues (Mjetet)", path: "/RecruiterTools" },
  { label: "Panel Admin", path: "/Admin" },
  { label: "Rreth Nesh", path: "/About" },
  { label: "Kontakt", path: "/Contact" },
  { label: "Abonimet", path: "/Subscriptions" },
  { label: "Histori Pagesash", path: "/PaymentHistory" },
  { label: "Ngjarje Kalendarike", path: "/EventsCalendar" },
  { label: "Bamirësi (detaje)", path: "/Bamiresi" },
  { label: "Referime", path: "/Referime" },
  { label: "Çmime", path: "/Subscriptions" },
];

const DEFAULT_TABS = [
  { id: "home", label: "Home", icon: "Home", path: "/" },
  { id: "feed", label: "Njoftime", icon: "Briefcase", path: "/Feed" },
  { id: "statuset", label: "Statuse", icon: "Radio", path: "/Statuset" },
  { id: "messages", label: "Chat", icon: "MessageCircle", path: "/Messages" },
  { id: "profile", label: "Profili", icon: "User", path: "/Profile" },
];

export default function BottomNavEditor({ isAdmin = false, userEmail = null }) {
  const queryClient = useQueryClient();
  const [tabs, setTabs] = useState(DEFAULT_TABS);
  const [existingId, setExistingId] = useState(null);
  const [saved, setSaved] = useState(false);

  const { data: configs = [] } = useQuery({
    queryKey: ["navConfig", userEmail, isAdmin],
    queryFn: async () => {
      if (isAdmin) {
        return base44.entities.NavConfig.filter({ is_global: true });
      } else {
        return base44.entities.NavConfig.filter({ owner_email: userEmail });
      }
    },
    enabled: isAdmin || !!userEmail
  });

  useEffect(() => {
    if (configs.length > 0) {
      setTabs(configs[0].tabs || DEFAULT_TABS);
      setExistingId(configs[0].id);
    }
  }, [configs]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = {
        tabs,
        is_global: isAdmin,
        owner_email: isAdmin ? null : userEmail
      };
      if (existingId) {
        return base44.entities.NavConfig.update(existingId, data);
      } else {
        return base44.entities.NavConfig.create(data);
      }
    },
    onSuccess: (result) => {
      if (!existingId && result?.id) setExistingId(result.id);
      queryClient.invalidateQueries({ queryKey: ["navConfig"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  });

  const addTab = () => {
    if (tabs.length >= 7) return;
    setTabs([...tabs, { id: Date.now().toString(), label: "Tab i ri", icon: "Star", path: "/" }]);
  };

  const removeTab = (idx) => {
    if (tabs.length <= 2) return;
    setTabs(tabs.filter((_, i) => i !== idx));
  };

  const updateTab = (idx, field, value) => {
    const updated = [...tabs];
    updated[idx] = { ...updated[idx], [field]: value };
    setTabs(updated);
  };

  const moveTab = (idx, dir) => {
    const newTabs = [...tabs];
    const target = idx + dir;
    if (target < 0 || target >= newTabs.length) return;
    [newTabs[idx], newTabs[target]] = [newTabs[target], newTabs[idx]];
    setTabs(newTabs);
  };

  const resetToDefault = () => {
    setTabs(DEFAULT_TABS);
    setExistingId(null);
  };

  // Preview vizual i menusë fundore
  const MenuPreview = () => (
    <div className="rounded-2xl border border-white/10 bg-[#0b1020] overflow-hidden">
      <p className="text-white/40 text-[10px] text-center py-1 border-b border-white/10">📱 Pamja live e menusë fundore</p>
      <div className="flex items-center justify-around px-2 py-3">
        {tabs.map((tab, idx) => {
          const Icon = ICON_MAP[tab.icon] || Star;
          return (
            <div key={idx} className="flex flex-col items-center gap-1 min-w-0 flex-1">
              <div className="w-6 h-6 flex items-center justify-center">
                <Icon className="w-4 h-4 text-[#8ab4ff]" />
              </div>
              <span className="text-[9px] text-white/60 truncate w-full text-center">{tab.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-semibold text-sm">
            {isAdmin ? "🌐 Menu Globale (për të gjithë)" : "📱 Menu Personale"}
          </h3>
          <p className="text-white/40 text-xs mt-0.5">
            {isAdmin
              ? "Konfigurimi global zbatohet për të gjithë pa konfigurim personal"
              : "Konfigurimi personal zëvendëson menunë globale"}
          </p>
        </div>
        <button onClick={resetToDefault}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/10 text-white/50 hover:text-white text-xs transition-all">
          <RotateCcw className="w-3 h-3" /> Reset
        </button>
      </div>

      {/* Preview */}
      <MenuPreview />

      {/* Tabs editor */}
      <div className="space-y-2">
        {tabs.map((tab, idx) => {
          const Icon = ICON_MAP[tab.icon] || Star;
          return (
            <div key={tab.id || idx}
              className="flex items-center gap-2 p-3 rounded-xl border border-white/10 bg-white/5">
              {/* Move */}
              <div className="flex flex-col gap-0.5 shrink-0">
                <button onClick={() => moveTab(idx, -1)} disabled={idx === 0}
                  className="text-white/30 hover:text-white disabled:opacity-20 transition-colors text-xs leading-none">▲</button>
                <button onClick={() => moveTab(idx, 1)} disabled={idx === tabs.length - 1}
                  className="text-white/30 hover:text-white disabled:opacity-20 transition-colors text-xs leading-none">▼</button>
              </div>

              {/* Icon Preview */}
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-[#8ab4ff]" />
              </div>

              {/* Label */}
              <input
                value={tab.label}
                onChange={e => updateTab(idx, "label", e.target.value)}
                maxLength={12}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white text-xs min-w-0"
                placeholder="Etiketa"
                style={{ minWidth: 0 }}
              />

              {/* Icon Select */}
              <select
                value={tab.icon}
                onChange={e => updateTab(idx, "icon", e.target.value)}
                className="bg-[#0b1020] border border-white/10 rounded-lg px-2 py-1 text-white text-xs shrink-0"
                style={{ width: 110 }}>
                {AVAILABLE_ICONS.map(ic => (
                  <option key={ic} value={ic}>{ic}</option>
                ))}
              </select>

              {/* Path Select */}
              <select
                value={tab.path}
                onChange={e => updateTab(idx, "path", e.target.value)}
                className="bg-[#0b1020] border border-white/10 rounded-lg px-2 py-1 text-white text-xs shrink-0"
                style={{ width: 140 }}>
                {AVAILABLE_PATHS.map(p => (
                  <option key={p.path} value={p.path}>{p.label}</option>
                ))}
              </select>

              {/* Remove */}
              <button onClick={() => removeTab(idx)}
                disabled={tabs.length <= 2}
                className="text-white/30 hover:text-red-400 disabled:opacity-20 transition-colors shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {tabs.length < 7 && (
        <button onClick={addTab}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-white/20 text-white/40 hover:text-white hover:border-white/40 text-xs transition-all">
          <Plus className="w-3.5 h-3.5" /> Shto tab ({tabs.length}/7 max)
        </button>
      )}

      <button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-[#0b1020] transition-all"
        style={{ background: saved ? "#9bffd6" : "linear-gradient(135deg,#8ab4ff,#9bffd6)" }}>
        <Save className="w-4 h-4" />
        {saved ? "✓ U ruajt!" : saveMutation.isPending ? "Po ruhet..." : "Ruaj Menunë"}
      </button>
    </div>
  );
}
