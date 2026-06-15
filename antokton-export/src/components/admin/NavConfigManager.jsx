import React, { useState, useEffect } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import {
  Save, Loader2, Plus, Trash2, ChevronDown, ChevronRight,
  GripVertical, Eye, EyeOff, Menu, LayoutGrid, Smartphone
} from "lucide-react";
import toast from "react-hot-toast";

// Available icons for bottom nav
const BOTTOM_NAV_ICONS = [
  "Home","Briefcase","MessageCircle","User","Radio","Bell","Search","Calendar",
  "Heart","Star","ShoppingBag","Zap","Award","Flag","Layers","Globe","Tv",
  "GraduationCap","Wrench","Plane","Gift","Users","Building2","Music","BookOpen"
];

const DEFAULT_NAV = [
  {
    id: "jobs", label: "Punë në Europë", page: "Feed", hasSubmenu: true, visible: true,
    submenu: [
      { id: "jobs-ofroj", label: "Ofroj punë", url: "/Pune?job_type=ofroj", visible: true },
      { id: "jobs-kerkoj", label: "Kërkoj punë", url: "/Pune?job_type=kerkoj", visible: true },
      { id: "sherbime-ofroj", label: "Ofroj shërbim", url: "/Feed?category=sherbime&job_type=ofroj", visible: true },
      { id: "sherbime-kerkoj", label: "Kërkoj shërbim", url: "/Feed?category=sherbime&job_type=kerkoj", visible: true },
      { id: "juridike", label: "Ndihmë Juridike", url: "/Feed?category=juridike", visible: true },
      { id: "events", label: "Ngjarje", url: "/Events", visible: true },
    ]
  },
  {
    id: "pazar", label: "Pazar", page: "Pazar", hasSubmenu: true, visible: true,
    submenu: [
      { id: "pazar-all", label: "Të gjitha", url: "/Pazar", visible: true },
      { id: "pazar-prona", label: "Prona", url: "/Pazar?category=prona", visible: true },
      { id: "pazar-makina", label: "Makina", url: "/Pazar?category=makina", visible: true },
      { id: "pazar-mobilje", label: "Mobilje & Shtëpi", url: "/Pazar?category=mobilje_shtepi", visible: true },
      { id: "pazar-elektronike", label: "Elektronikë", url: "/Pazar?category=elektronike", visible: true },
      { id: "pazar-veshje", label: "Veshje", url: "/Pazar?category=veshje", visible: true },
    ]
  },
  {
    id: "edukim", label: "Edukim", page: "Edukim", hasSubmenu: true, visible: true,
    submenu: [
      { id: "trajnime", label: "Trajnime profesionale", url: "/Feed?category=edukim&sub=trajnime", visible: true },
      { id: "shkolla", label: "Shkolla", url: "/Feed?category=edukim&sub=shkolla", visible: true },
      { id: "kurse", label: "Kurse online", url: "/Feed?category=edukim&sub=kurse", visible: true },
    ]
  },
  {
    id: "bileta", label: "Bileta", page: "Bileta", hasSubmenu: true, visible: true,
    submenu: [
      { id: "avion", label: "Avion", url: "/Bileta?type=avion#kerkese-bilete", visible: true },
      { id: "tren", label: "Tren", url: "/Bileta?type=tren#kerkese-bilete", visible: true },
      { id: "autobus", label: "Autobus", url: "/Bileta?type=autobus#kerkese-bilete", visible: true },
      { id: "furgon", label: "Furgon", url: "/Bileta?type=furgon#kerkese-bilete", visible: true },
      { id: "taksi", label: "Taksi", url: "/Bileta?type=taksi#kerkese-bilete", visible: true },
      { id: "traget", label: "Traget", url: "/Bileta?type=traget#kerkese-bilete", visible: true },
      { id: "paketa", label: "Paketa turistike", url: "/Bileta?type=paketa#kerkese-bilete", visible: true },
      { id: "umre", label: "Umre", url: "/Bileta?type=umre#kerkese-bilete", visible: true },
      { id: "agjenci", label: "Oferta agjencish", url: "/Bileta?type=agjenci#kerkese-bilete", visible: true },
      { id: "mallra", label: "Transport mallrash", url: "/Bileta?type=mallra#kerkese-bilete", visible: true },
      { id: "makina", label: "Transport makinash", url: "/Bileta?type=makina#kerkese-bilete", visible: true },
    ]
  },
  { id: "messages", label: "Mesazhet", page: "Messages", hasSubmenu: false, visible: true, authOnly: true, submenu: [] },
  {
    id: "members", label: "Anëtarët", page: "Members", hasSubmenu: true, visible: true, authOnly: true,
    submenu: [
      { id: "members-list", label: "Anëtarët", url: "/Members", visible: true },
      { id: "companies", label: "Kompanitë", url: "/Companies", visible: true },
      { id: "groups", label: "Grupet", url: "/FacebookGroups", visible: true },
    ]
  },
  { id: "partners", label: "Bashkëpunëtorë", page: "Partners", hasSubmenu: false, visible: true, submenu: [] },
  { id: "search", label: "Kërko", page: "Search", hasSubmenu: false, visible: true, submenu: [] },
  { id: "about", label: "Rreth Nesh", page: "About", hasSubmenu: false, visible: true, submenu: [] },
];

const DEFAULT_BOTTOM_TABS = [
  { id: 'home', label: 'Home', icon: 'Home', path: '/' },
  { id: 'feed', label: 'Njoftime', icon: 'Briefcase', path: '/Feed' },
  { id: 'pazar', label: 'Pazar', icon: 'ShoppingBag', path: '/Pazar' },
  { id: 'statuset', label: 'Statuse', icon: 'Radio', path: '/Statuset' },
  { id: 'profile', label: 'Profili', icon: 'User', path: '/Profile' },
];

function genId() {
  return Math.random().toString(36).slice(2, 9);
}

export default function NavConfigManager() {
  const queryClient = useQueryClient();
  const [navItems, setNavItems] = useState(DEFAULT_NAV);
  const [bottomTabs, setBottomTabs] = useState(DEFAULT_BOTTOM_TABS);
  const [expanded, setExpanded] = useState({});
  const [saving, setSaving] = useState(false);
  const [savingBottom, setSavingBottom] = useState(false);
  const [existingId, setExistingId] = useState(null);
  const [existingBottomId, setExistingBottomId] = useState(null);
  const [activeTab, setActiveTab] = useState("hamburger");

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ["siteConfig"],
    queryFn: () => base44.entities.SiteConfig.list(),
  });

  useEffect(() => {
    const navConfig = configs.find(c => c.key === "nav_config");
    if (navConfig) {
      try { setNavItems(JSON.parse(navConfig.value)); setExistingId(navConfig.id); } catch {}
    }
    const bottomConfig = configs.find(c => c.key === "bottom_nav_config");
    if (bottomConfig) {
      try { setBottomTabs(JSON.parse(bottomConfig.value)); setExistingBottomId(bottomConfig.id); } catch {}
    }
  }, [configs]);

  // -- Save hamburger nav --
  const save = async () => {
    setSaving(true);
    try {
      const val = JSON.stringify(navItems);
      if (existingId) {
        await base44.entities.SiteConfig.update(existingId, { value: val });
      } else {
        const created = await base44.entities.SiteConfig.create({ key: "nav_config", value: val, label: "Konfigurimi i Menusë", group: "nav" });
        setExistingId(created.id);
      }
      queryClient.invalidateQueries({ queryKey: ["siteConfig"] });
      toast.success("Menuja u ruajt! Ringarko faqen.");
    } catch { toast.error("Gabim gjatë ruajtjes"); }
    finally { setSaving(false); }
  };

  // -- Save bottom nav --
  const saveBottom = async () => {
    setSavingBottom(true);
    try {
      const val = JSON.stringify(bottomTabs);
      if (existingBottomId) {
        await base44.entities.SiteConfig.update(existingBottomId, { value: val });
      } else {
        const created = await base44.entities.SiteConfig.create({ key: "bottom_nav_config", value: val, label: "Konfigurimi i Menusë Fundore", group: "nav" });
        setExistingBottomId(created.id);
      }
      queryClient.invalidateQueries({ queryKey: ["siteConfig"] });
      toast.success("Menuja fundore u ruajt! Ringarko faqen.");
    } catch { toast.error("Gabim gjatë ruajtjes"); }
    finally { setSavingBottom(false); }
  };

  const reset = () => {
    if (confirm("A jeni i sigurt? Do të ktheni menunë në gjendjen fillestare.")) setNavItems(DEFAULT_NAV);
  };

  const resetBottom = () => {
    if (confirm("A jeni i sigurt?")) setBottomTabs(DEFAULT_BOTTOM_TABS);
  };

  // -- Hamburger item updates --
  const updateItem = (id, field, value) => setNavItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  const toggleVisible = (id) => setNavItems(prev => prev.map(item => item.id === id ? { ...item, visible: !item.visible } : item));
  const toggleSubmenu = (id) => setNavItems(prev => prev.map(item => item.id === id ? { ...item, hasSubmenu: !item.hasSubmenu } : item));
  const deleteItem = (id) => setNavItems(prev => prev.filter(item => item.id !== id));
  const addItem = () => setNavItems(prev => [...prev, { id: genId(), label: "Lidhje e re", page: "", hasSubmenu: false, visible: true, submenu: [] }]);
  const updateSubItem = (parentId, subId, field, value) => setNavItems(prev => prev.map(item => {
    if (item.id !== parentId) return item;
    return { ...item, submenu: item.submenu.map(sub => sub.id === subId ? { ...sub, [field]: value } : sub) };
  }));
  const toggleSubVisible = (parentId, subId) => setNavItems(prev => prev.map(item => {
    if (item.id !== parentId) return item;
    return { ...item, submenu: item.submenu.map(sub => sub.id === subId ? { ...sub, visible: !sub.visible } : sub) };
  }));
  const deleteSubItem = (parentId, subId) => setNavItems(prev => prev.map(item => {
    if (item.id !== parentId) return item;
    return { ...item, submenu: item.submenu.filter(s => s.id !== subId) };
  }));
  const addSubItem = (parentId) => setNavItems(prev => prev.map(item => {
    if (item.id !== parentId) return item;
    return { ...item, submenu: [...item.submenu, { id: genId(), label: "Nënlidhje e re", url: "/", visible: true }] };
  }));

  // -- Bottom nav updates --
  const updateBottomTab = (id, field, value) => setBottomTabs(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  const deleteBottomTab = (id) => setBottomTabs(prev => prev.filter(t => t.id !== id));
  const addBottomTab = () => setBottomTabs(prev => [...prev, { id: genId(), label: "Lidhje", icon: "Star", path: "/" }]);

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 text-white/30 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      {/* Tab selector */}
      <div className="flex gap-2">
        <button onClick={() => setActiveTab("hamburger")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${activeTab === "hamburger" ? "bg-[#8ab4ff]/20 text-[#8ab4ff] border border-[#8ab4ff]/40" : "bg-white/5 border border-white/10 text-white/50 hover:text-white"}`}>
          <Menu className="w-3.5 h-3.5" /> Menyja Hamburger
        </button>
        <button onClick={() => setActiveTab("bottom")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${activeTab === "bottom" ? "bg-[#8ab4ff]/20 text-[#8ab4ff] border border-[#8ab4ff]/40" : "bg-white/5 border border-white/10 text-white/50 hover:text-white"}`}>
          <Smartphone className="w-3.5 h-3.5" /> Menyja Fundore
        </button>
      </div>

      {/* HAMBURGER NAV */}
      {activeTab === "hamburger" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                <Menu className="w-4 h-4 text-[#8ab4ff]" /> Konfigurimi i Menusë Kryesore
              </h3>
              <p className="text-white/40 text-xs mt-0.5">Shto, fshij, riemërto ose fsheh menu dhe nënmenu.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={reset} className="px-3 py-1.5 rounded text-xs bg-white/5 border border-white/10 text-white/60 hover:text-white">Rivendos</button>
              <button onClick={save} disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] font-semibold">
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Ruaj
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {navItems.map((item) => (
              <div key={item.id} className={`rounded-lg border ${item.visible ? 'border-white/10 bg-white/5' : 'border-white/5 bg-white/[0.02] opacity-60'}`}>
                <div className="flex items-center gap-2 p-3">
                  <GripVertical className="w-3.5 h-3.5 text-white/20 shrink-0" />
                  {item.hasSubmenu ? (
                    <button onClick={() => setExpanded(e => ({ ...e, [item.id]: !e[item.id] }))} className="text-white/40 hover:text-white">
                      {expanded[item.id] ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </button>
                  ) : <div className="w-3.5 h-3.5" />}
                  <Input value={item.label} onChange={e => updateItem(item.id, "label", e.target.value)}
                    className="h-7 text-xs bg-white/5 border-white/10 text-white flex-1 min-w-0" placeholder="Emërtimi" />
                  <Input value={item.url || (item.page ? `/${item.page}` : "")} onChange={e => updateItem(item.id, "url", e.target.value)}
                    className="h-7 text-xs bg-white/5 border-white/10 text-white/60 w-32 shrink-0" placeholder="/faqja" />
                  <button onClick={() => toggleSubmenu(item.id)} title="Ka nënmenu"
                    className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] border transition-all ${item.hasSubmenu ? 'border-[#8ab4ff]/40 text-[#8ab4ff] bg-[#8ab4ff]/10' : 'border-white/10 text-white/30 bg-white/5'}`}>
                    <LayoutGrid className="w-3 h-3" />
                  </button>
                  <button onClick={() => toggleVisible(item.id)} className={`p-1.5 rounded ${item.visible ? 'text-[#9bffd6]' : 'text-white/20'}`}>
                    {item.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => deleteItem(item.id)} className="p-1.5 rounded text-red-400/60 hover:text-red-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {item.hasSubmenu && expanded[item.id] && (
                  <div className="border-t border-white/5 px-3 pb-3 pt-2 space-y-1.5">
                    <p className="text-white/30 text-[10px] uppercase tracking-wider mb-2">Nënmenu</p>
                    {item.submenu.map(sub => (
                      <div key={sub.id} className={`flex items-center gap-2 pl-4 ${!sub.visible ? 'opacity-50' : ''}`}>
                        <Input value={sub.label} onChange={e => updateSubItem(item.id, sub.id, "label", e.target.value)}
                          className="h-7 text-xs bg-white/5 border-white/10 text-white w-36 shrink-0" placeholder="Emërtimi" />
                        <Input value={sub.url} onChange={e => updateSubItem(item.id, sub.id, "url", e.target.value)}
                          className="h-7 text-xs bg-white/5 border-white/10 text-white/70 flex-1 min-w-0" placeholder="/Feed?category=..." />
                        <button onClick={() => toggleSubVisible(item.id, sub.id)} className={`p-1.5 rounded shrink-0 ${sub.visible ? 'text-[#9bffd6]' : 'text-white/20'}`}>
                          {sub.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        </button>
                        <button onClick={() => deleteSubItem(item.id, sub.id)} className="p-1.5 rounded text-red-400/60 hover:text-red-400 shrink-0">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <button onClick={() => addSubItem(item.id)} className="flex items-center gap-1.5 text-[#8ab4ff] text-xs mt-2 pl-4 hover:text-[#9bffd6]">
                      <Plus className="w-3 h-3" /> Shto nënlidhje
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <button onClick={addItem}
            className="flex items-center gap-2 w-full justify-center py-2.5 rounded-lg border border-dashed border-white/20 text-white/40 hover:text-white hover:border-white/40 text-xs transition-all">
            <Plus className="w-3.5 h-3.5" /> Shto menu të re
          </button>
        </div>
      )}

      {/* BOTTOM NAV */}
      {activeTab === "bottom" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#8ab4ff]" /> Konfigurimi i Menusë Fundore (Mobile)
              </h3>
              <p className="text-white/40 text-xs mt-0.5">Max 5 ikona. Ndrysho tekstin, ikonën dhe lidhjen.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={resetBottom} className="px-3 py-1.5 rounded text-xs bg-white/5 border border-white/10 text-white/60 hover:text-white">Rivendos</button>
              <button onClick={saveBottom} disabled={savingBottom}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] font-semibold">
                {savingBottom ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Ruaj
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {bottomTabs.map((tab) => (
              <div key={tab.id} className="flex items-center gap-2 p-3 rounded-lg border border-white/10 bg-white/5">
                <GripVertical className="w-3.5 h-3.5 text-white/20 shrink-0" />
                {/* Label */}
                <Input value={tab.label} onChange={e => updateBottomTab(tab.id, "label", e.target.value)}
                  className="h-7 text-xs bg-white/5 border-white/10 text-white w-28 shrink-0" placeholder="Teksti" />
                {/* Icon select */}
                <select value={tab.icon} onChange={e => updateBottomTab(tab.id, "icon", e.target.value)}
                  className="h-7 text-xs bg-[#1c2333] border border-white/10 text-white rounded px-2 w-36 shrink-0 outline-none">
                  {BOTTOM_NAV_ICONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                </select>
                {/* Path */}
                <Input value={tab.path} onChange={e => updateBottomTab(tab.id, "path", e.target.value)}
                  className="h-7 text-xs bg-white/5 border-white/10 text-white/70 flex-1 min-w-0" placeholder="/faqja" />
                <button onClick={() => deleteBottomTab(tab.id)} className="p-1.5 rounded text-red-400/60 hover:text-red-400 shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {bottomTabs.length < 6 && (
            <button onClick={addBottomTab}
              className="flex items-center gap-2 w-full justify-center py-2.5 rounded-lg border border-dashed border-white/20 text-white/40 hover:text-white hover:border-white/40 text-xs transition-all">
              <Plus className="w-3.5 h-3.5" /> Shto ikonë
            </button>
          )}
        </div>
      )}
    </div>
  );
}
