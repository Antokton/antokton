import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/antoktonClient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Tv, Radio, BookOpen, Newspaper, Mic, Play,
  Filter, X, PenLine, Globe, Edit2, EyeOff, Trash2, Plus, Check
} from "lucide-react";
import MediaPlayerModal from "@/components/media/MediaPlayerModal";
import BlogPostCard from "@/components/media/BlogPostCard";

// ─── Static data ────────────────────────────────────────────────────────────
const STATIC_TV = [
  { id: "tv1", name: "TV Klan",     type: "tv", flag: "🇦🇱", color: "#e63946", stream: "https://tvklan.al/live",            site: "https://tvklan.al",       credibility: "e larte",   programming_type: ["lajme","argëtim"], target_age: "te_gjitha",   religious_orientation: "laik" },
  { id: "tv2", name: "Top Channel", type: "tv", flag: "🇦🇱", color: "#e76f51", stream: "https://top-channel.tv/livestream", site: "https://top-channel.tv",  credibility: "e larte",   programming_type: ["lajme","argëtim"], target_age: "te_gjitha",   religious_orientation: "laik" },
  { id: "tv3", name: "Vizion Plus", type: "tv", flag: "🇦🇱", color: "#2196f3", stream: null,                                site: "https://vizionplus.tv",   credibility: "mesatare",  programming_type: ["lajme","argëtim"], target_age: "te_gjitha",   religious_orientation: "laik" },
  { id: "tv4", name: "Syri TV",     type: "tv", flag: "🇦🇱", color: "#6a4c93", stream: "https://syri.tv/live",              site: "https://syri.tv",         credibility: "mesatare",  programming_type: ["lajme","politike"],target_age: "te_rritur",   religious_orientation: "laik" },
  { id: "tv5", name: "ABC News AL", type: "tv", flag: "🇦🇱", color: "#1b4332", stream: null,                                site: "https://abcnews.al",      credibility: "mesatare",  programming_type: ["lajme"],           target_age: "te_gjitha",   religious_orientation: "laik" },
  { id: "tv6", name: "RTK",         type: "tv", flag: "🇽🇰", color: "#d62828", stream: "https://www.rtklive.com/live",      site: "https://rtklive.com",     credibility: "e larte",   programming_type: ["lajme","kulture"], target_age: "te_gjitha",   religious_orientation: "laik" },
  { id: "tv7", name: "KTV Kosovë",  type: "tv", flag: "🇽🇰", color: "#3a86ff", stream: null,                                site: "https://ktv-info.com",    credibility: "mesatare",  programming_type: ["lajme","argëtim"], target_age: "te_gjitha",   religious_orientation: "laik" },
  { id: "tv8", name: "Alsat-M",     type: "tv", flag: "🇲🇰", color: "#f4a261", stream: null,                                site: "https://alsat-m.tv",      credibility: "mesatare",  programming_type: ["lajme"],           target_age: "te_gjitha",   religious_orientation: "laik" },
];
const STATIC_RADIO = [
  { id: "r1", name: "Radio Tirana",  type: "radio", flag: "🇦🇱", color: "#2d6a4f", stream: "https://www.radiotirana.com/live", site: "https://radiotirana.com", credibility: "e larte",  programming_type: ["muzike","lajme"], target_age: "te_gjitha",  religious_orientation: "laik" },
  { id: "r2", name: "Radio Klan",    type: "radio", flag: "🇦🇱", color: "#7209b7", stream: null,                               site: "https://radioklan.al",    credibility: "mesatare", programming_type: ["muzike"],         target_age: "te_rinj",    religious_orientation: "laik" },
  { id: "r3", name: "Radio Koha",    type: "radio", flag: "🇽🇰", color: "#e63946", stream: null,                               site: "https://radiokoha.net",   credibility: "mesatare", programming_type: ["muzike","lajme"], target_age: "te_gjitha",  religious_orientation: "laik" },
  { id: "r4", name: "RrokumRoll",    type: "radio", flag: "🇦🇱", color: "#f77f00", stream: null,                               site: "https://rrokum.al",       credibility: "mesatare", programming_type: ["muzike"],         target_age: "te_rinj",    religious_orientation: "laik" },
];
const STATIC_GAZETA = [
  { id: "g1", type: "gazeta", name: "Gazeta Shqip",   flag: "🇦🇱", desc: "Lajme të përditshme nga Shqipëria",           url: "https://www.gazeta-shqip.com", site: "https://www.gazeta-shqip.com",  credibility: "mesatare", target_age: "te_rritur",  religious_orientation: "laik" },
  { id: "g2", type: "gazeta", name: "Panorama",        flag: "🇦🇱", desc: "Lajme, komente dhe analiza",                  url: "https://www.panorama.com.al",  site: "https://www.panorama.com.al",   credibility: "e larte",  target_age: "te_rritur",  religious_orientation: "laik" },
  { id: "g3", type: "gazeta", name: "Koha Ditore",     flag: "🇽🇰", desc: "Gazeta kryesore kosovare",                    url: "https://www.koha.net",         site: "https://www.koha.net",          credibility: "e larte",  target_age: "te_rritur",  religious_orientation: "laik" },
  { id: "g4", type: "gazeta", name: "Bota Sot",        flag: "🇲🇰", desc: "Gazeta shqipe e Maqedonisë",                  url: "https://www.botasot.info",     site: "https://www.botasot.info",      credibility: "mesatare", target_age: "te_rritur",  religious_orientation: "laik" },
  { id: "g5", type: "gazeta", name: "Shqiptarja.com",  flag: "🇦🇱", desc: "Portal lajmesh dhe analiza politike",         url: "https://shqiptarja.com",       site: "https://shqiptarja.com",        credibility: "mesatare", target_age: "te_rritur",  religious_orientation: "laik" },
  { id: "g6", type: "gazeta", name: "Zëri i Amerikës", flag: "🇺🇸", desc: "Lajme ndërkombëtare në shqip",               url: "https://www.zeriamerikes.com", site: "https://www.zeriamerikes.com",  credibility: "e larte",  target_age: "te_gjitha",  religious_orientation: "laik" },
  { id: "g7", type: "gazeta", name: "Drita Islame",    flag: "🇦🇱", desc: "Lajme fetare dhe kulturore islame",           url: "https://dritaislame.al",       site: "https://dritaislame.al",        credibility: "mesatare", target_age: "te_gjitha",  religious_orientation: "islamik" },
];
const STATIC_REVISTA = [
  { id: "rv1", type: "revista", name: "Mapo",    flag: "🇦🇱", desc: "Revista kulturore dhe analitike", url: "https://mapo.al",          site: "https://mapo.al",          credibility: "e larte",  target_age: "te_rritur",  religious_orientation: "laik" },
  { id: "rv2", type: "revista", name: "Monitor", flag: "🇦🇱", desc: "Revista ekonomike kryesore",      url: "https://www.monitor.al",   site: "https://www.monitor.al",   credibility: "e larte",  target_age: "te_rritur",  religious_orientation: "laik" },
];

const ALL_STATIC = [...STATIC_TV, ...STATIC_RADIO, ...STATIC_GAZETA, ...STATIC_REVISTA];
const STATIC_MEDIA_CONFIG_KEY = "media_static_items";

function parseStaticMedia(value) {
  if (!value) return ALL_STATIC;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : ALL_STATIC;
  } catch {
    return ALL_STATIC;
  }
}

// ─── Filter config ───────────────────────────────────────────────────────────
const MEDIA_CATS = [
  { key: "all",     label: "Të gjitha", icon: null },
  { key: "tv",      label: "TV",         icon: Tv },
  { key: "radio",   label: "Radio",      icon: Radio },
  { key: "gazeta",  label: "Gazeta",     icon: Newspaper },
  { key: "revista", label: "Revista",    icon: BookOpen },
  { key: "podcast", label: "Podcast",    icon: Mic },
  { key: "blog",    label: "Blog & Opinione", icon: PenLine },
];

const CREDIBILITY_OPTS = [
  { key: "all", label: "Çdo nivel" },
  { key: "e larte", label: "🟢 E lartë" },
  { key: "mesatare", label: "🟡 Mesatare" },
  { key: "e ulet", label: "🔴 E ulët" },
];

// SVG face icons for age groups
const ChildFace = () => (
  <svg width="16" height="16" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="16" r="14" fill="#fde68a" stroke="#f59e0b" strokeWidth="1.5"/>
    <circle cx="11.5" cy="14" r="2" fill="#1e293b"/>
    <circle cx="20.5" cy="14" r="2" fill="#1e293b"/>
    <path d="M11 21 Q16 25 21 21" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    <circle cx="12.5" cy="15.5" r="0.7" fill="white"/>
    <circle cx="21.5" cy="15.5" r="0.7" fill="white"/>
  </svg>
);
const YoungFace = () => (
  <svg width="16" height="16" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="15" r="13" fill="#fcd9b0" stroke="#d97706" strokeWidth="1.5"/>
    <circle cx="11.5" cy="13" r="2" fill="#1e293b"/>
    <circle cx="20.5" cy="13" r="2" fill="#1e293b"/>
    <path d="M12 20 Q16 23.5 20 20" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    {/* light stubble */}
    <ellipse cx="16" cy="22" rx="5" ry="2.5" fill="#c8a06a" opacity="0.45"/>
    <path d="M13 22.5 Q16 23.8 19 22.5" stroke="#b07d3a" strokeWidth="0.8" strokeLinecap="round" fill="none" opacity="0.6"/>
  </svg>
);
const AdultFace = () => (
  <svg width="16" height="16" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="15" r="13" fill="#fcd9b0" stroke="#b45309" strokeWidth="1.5"/>
    <circle cx="11.5" cy="13" r="2" fill="#1e293b"/>
    <circle cx="20.5" cy="13" r="2" fill="#1e293b"/>
    <path d="M12 20 Q16 23 20 20" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    {/* full beard */}
    <path d="M9 20 Q9 27 16 28 Q23 27 23 20 Q20 23 16 23.5 Q12 23 9 20Z" fill="#8b5e3c" opacity="0.75"/>
    <path d="M11 19.5 Q13 21.5 16 22 Q19 21.5 21 19.5" stroke="#5c3a1e" strokeWidth="0.8" fill="none" opacity="0.5"/>
  </svg>
);

const AGE_OPTS = [
  { key: "all",         label: "Çdo moshë",    icon: null },
  { key: "femije",      label: "Fëmijë",        icon: ChildFace },
  { key: "te_rinj",     label: "Të rinj",       icon: YoungFace },
  { key: "te_rritur",   label: "Të rritur",     icon: AdultFace },
  { key: "te_moshuarit",label: "Të moshuarit",  icon: null },
  { key: "te_gjitha",   label: "Të gjitha",     icon: null },
];

const PROGRAM_OPTS = [
  { key: "all",       label: "Çdo program" },
  { key: "lajme",     label: "📰 Lajme" },
  { key: "sport",     label: "⚽ Sport" },
  { key: "argëtim",   label: "🎭 Argëtim" },
  { key: "muzike",    label: "🎵 Muzikë" },
  { key: "kulture",   label: "🎨 Kulturë" },
  { key: "feja",      label: "☪️ Feja" },
  { key: "ekonomi",   label: "💼 Ekonomi" },
  { key: "teknologji",label: "💻 Teknologji" },
  { key: "politike",  label: "🏛️ Politikë" },
  { key: "film",      label: "🎬 Film" },
  { key: "dokumentar",label: "🎞️ Dokumentar" },
  { key: "edukativ",  label: "📚 Edukativ" },
];
const IslamIcon = () => (
  <span style={{
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: 18, height: 18, borderRadius: "50%", background: "#16a34a",
    fontSize: 9, color: "#fff", fontFamily: "serif", lineHeight: 1, flexShrink: 0
  }}>الله</span>
);

const NonIslamIcon = () => (
  <span style={{
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: 18, height: 18, borderRadius: "50%", background: "#f97316",
    fontSize: 11, color: "#dc2626", lineHeight: 1, flexShrink: 0
  }}>↓</span>
);

const RELIGION_OPTS = [
  { key: "all",      label: "Çdo orientim", icon: null },
  { key: "islamik",  label: "Islame",        icon: IslamIcon },
  { key: "laik",     label: "Jo-islame",     icon: NonIslamIcon },
];

// ─── Credibility badge ────────────────────────────────────────────────────────
function CredBadge({ level }) {
  const map = { "e larte": ["🟢", "#22c55e"], "mesatare": ["🟡", "#f59e0b"], "e ulet": ["🔴", "#ef4444"], "e panjohur": ["⚪", "#6b7280"] };
  const [icon, color] = map[level] || ["⚪", "#6b7280"];
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
      style={{ background: `${color}18`, color, border: `1px solid ${color}33` }}>
      <span className="text-white/55">Besueshmëria:</span> {icon} {level}
    </span>
  );
}

// ─── TV / Radio card ─────────────────────────────────────────────────────────
function ChannelCard({ ch, onPlay, isAdmin, onEdit, onHide, onDelete }) {
  const isRadio = ch.type === "radio";
  const siteUrl = ch.site || ch.website_url;
  const logoUrl = ch.logo_url || ch.image_url;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="group relative flex flex-col rounded-2xl overflow-hidden border border-white/10 hover:border-white/25 transition-all"
      style={{ background: "rgba(255,255,255,0.05)" }}>
      {/* Banner */}
      <div className="h-20 flex items-center justify-center relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${ch.color || "#8ab4ff"}33, ${ch.color || "#8ab4ff"}55)` }}>
        {logoUrl ? (
          <img src={logoUrl} alt={ch.name} className="relative z-10 max-h-14 max-w-[70%] rounded-lg object-contain bg-white/85 p-1.5" />
        ) : (
          <span className="text-4xl relative z-10">{ch.flag || "📡"}</span>
        )}
        {(ch.stream || ch.stream_url) && (
          <span className="absolute top-2 left-2 text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/80 text-white font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />LIVE
          </span>
        )}
        {ch.credibility && ch.credibility !== "e panjohur" && (
          <span className="absolute top-2 right-2"><CredBadge level={ch.credibility} /></span>
        )}
        {isAdmin && (
          <div className="absolute bottom-2 right-2 z-20 flex gap-1">
            <button onClick={(event) => { event.stopPropagation(); onEdit(ch); }} className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white/70 hover:text-white" title="Përpuno">
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button onClick={(event) => { event.stopPropagation(); onHide(ch); }} className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-yellow-300 hover:text-yellow-200" title="Fshihe">
              <EyeOff className="h-3.5 w-3.5" />
            </button>
            <button onClick={(event) => { event.stopPropagation(); onDelete(ch); }} className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-red-400 hover:text-red-300" title="Fshi">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
      {/* Info */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        <p className="text-white font-semibold text-sm">{ch.name}</p>
        {ch.description && <p className="text-white/40 text-[11px] leading-relaxed line-clamp-2">{ch.description}</p>}
        {/* Action buttons */}
        <div className="flex gap-2 mt-auto pt-1">
          <button onClick={() => onPlay(ch)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#0b1020] transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg,#8ab4ff,#9bffd6)" }}>
            <Play className="w-3.5 h-3.5" />
            {isRadio ? "Dëgjo" : "Shiko"}
          </button>
          {siteUrl && (
            <a href={siteUrl} target="_blank" rel="noopener noreferrer"
              className="p-2 rounded-xl border border-white/10 text-white/40 hover:text-white hover:border-white/25 transition-all flex items-center justify-center"
              title="Vizito faqen">
              <Globe className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Publication card (gazeta/revista) ───────────────────────────────────────
function PubCard({ item, onPlay, isAdmin, onEdit, onHide, onDelete }) {
  const siteUrl = item.site || item.url;
  const logoUrl = item.logo_url || item.image_url;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="group relative flex flex-col p-5 rounded-2xl border border-white/10 hover:border-white/25 transition-all"
      style={{ background: "rgba(255,255,255,0.05)" }}>
      {isAdmin && (
        <div className="absolute right-2 top-2 z-20 flex gap-1">
          <button onClick={(event) => { event.stopPropagation(); onEdit(item); }} className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white/70 hover:text-white" title="Përpuno">
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button onClick={(event) => { event.stopPropagation(); onHide(item); }} className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-yellow-300 hover:text-yellow-200" title="Fshihe">
            <EyeOff className="h-3.5 w-3.5" />
          </button>
          <button onClick={(event) => { event.stopPropagation(); onDelete(item); }} className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-red-400 hover:text-red-300" title="Fshi">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 bg-white/5 border border-white/10">
          {logoUrl ? <img src={logoUrl} alt={item.name || item.title} className="h-8 w-8 object-contain rounded bg-white/85 p-1" /> : item.flag}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm leading-tight">{item.name || item.title}</p>
          {item.credibility && item.credibility !== "e panjohur" && (
            <div className="mt-1"><CredBadge level={item.credibility} /></div>
          )}
        </div>
      </div>
      <p className="text-white/50 text-xs leading-relaxed flex-1">{item.desc || item.description}</p>
      <div className="flex gap-2 mt-4">
        <button onClick={() => onPlay(item)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#0b1020]"
          style={{ background: "linear-gradient(135deg,#8ab4ff,#9bffd6)" }}>
          <Play className="w-3.5 h-3.5" /> Shfleto brenda
        </button>
        {siteUrl && (
          <a href={siteUrl} target="_blank" rel="noopener noreferrer"
            className="p-2 rounded-xl border border-white/10 text-white/40 hover:text-white hover:border-white/25 transition-all flex items-center justify-center"
            title="Hap faqen">
            <Globe className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </motion.div>
  );
}

// ─── Section header ─────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, dot }) {
  return (
    <div className="flex items-center gap-2.5 mb-5">
      {dot ? <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" /> : Icon ? <Icon className="w-4 h-4 text-white/40" /> : null}
      <h2 className="text-white font-semibold text-base">{title}</h2>
      <div className="flex-1 h-px bg-white/8" />
    </div>
  );
}

// ─── Compact select filter ───────────────────────────────────────────────────
function FilterSelect({ label, value, options, onChange }) {
  const active = value !== "all";
  const selected = options.find(o => o.key === value);
  const Icon = selected?.icon;
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-white/35 text-xs whitespace-nowrap">{label}:</span>
      <div className="relative flex items-center">
        {Icon && <span className="absolute left-2 pointer-events-none z-10"><Icon /></span>}
        <select value={value} onChange={e => onChange(e.target.value)}
          className="appearance-none pl-7 pr-6 py-1 rounded-lg text-xs font-medium border outline-none cursor-pointer"
          style={{
            background: active ? "rgba(138,180,255,0.12)" : "rgba(255,255,255,0.05)",
            borderColor: active ? "rgba(138,180,255,0.4)" : "rgba(255,255,255,0.12)",
            color: active ? "#8ab4ff" : "rgba(255,255,255,0.5)",
            paddingLeft: Icon ? "28px" : "10px",
          }}>
          {options.map(o => (
            <option key={o.key} value={o.key} style={{ background: "#0b1020", color: "#fff" }}>{o.label}</option>
          ))}
        </select>
        <span className="absolute right-1.5 pointer-events-none text-white/30 text-[9px]">▾</span>
      </div>
    </div>
  );
}

function AdminAddButton({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="mb-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#8ab4ff]/30 bg-[#8ab4ff]/10 px-4 py-2 text-xs font-bold text-[#8ab4ff] hover:bg-[#8ab4ff]/15 sm:w-auto"
    >
      <Plus className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

function MediaItemModal({ item, defaultType = "tv", onClose, onSave }) {
  const itemType = item?.type || item?.category || defaultType;
  const [form, setForm] = useState({
    id: item?.id || `media_${Date.now()}`,
    name: item?.name || item?.title || "",
    type: itemType,
    flag: item?.flag || "📡",
    color: item?.color || "#8ab4ff",
    site: item?.site || item?.website_url || item?.url || item?.link_url || "",
    stream: item?.stream || item?.stream_url || item?.embed_url || "",
    image_url: item?.image_url || "",
    logo_url: item?.logo_url || "",
    desc: item?.desc || item?.description || "",
    credibility: item?.credibility || "e panjohur",
    target_age: item?.target_age || "te_gjitha",
    religious_orientation: item?.religious_orientation || "laik",
    programmingText: (item?.programming_type || []).join(", "),
    is_active: item?.is_active !== false,
  });
  const [metadataLoading, setMetadataLoading] = useState(false);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const fetchWebsiteMetadata = async () => {
    const targetUrl = (form.site || form.stream || "").trim();
    if (!targetUrl) return;
    setMetadataLoading(true);
    try {
      const res = await base44.functions.invoke("extractWebsiteMetadata", { url: targetUrl });
      const meta = res.data || {};
      if (!meta.success) throw new Error(meta.error || "Nuk u gjetën të dhëna.");
      setForm(prev => ({
        ...prev,
        name: prev.name || meta.site_name || meta.title || "",
        desc: prev.desc || meta.description || "",
        logo_url: prev.logo_url || meta.logo_url || "",
        image_url: prev.image_url || meta.image_url || meta.logo_url || "",
        site: prev.site || meta.site_url || targetUrl,
      }));
    } catch (error) {
      window.alert(error.message || "Nuk u mor dot logo/foto nga website.");
    } finally {
      setMetadataLoading(false);
    }
  };

  const save = () => {
    const name = form.name.trim();
    if (!name) return;
    const programming_type = form.programmingText
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    onSave({
      ...item,
      ...form,
      name,
      title: name,
      category: form.type,
      url: form.site,
      site: form.site,
      website_url: form.site,
      link_url: form.site,
      logo_url: form.logo_url,
      stream: form.stream,
      stream_url: form.stream,
      embed_url: form.stream,
      desc: form.desc,
      description: form.desc,
      programming_type,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+112px)] pt-[calc(env(safe-area-inset-top)+88px)] sm:items-center sm:p-4"
      style={{ background: "rgba(0,0,0,0.8)", WebkitOverflowScrolling: "touch" }}
      onClick={onClose}
    >
      <div
        className="flex max-h-[calc(100dvh-220px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 shadow-2xl sm:max-h-[90vh]"
        style={{ background: "#1a2640" }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4">
          <h3 className="font-bold text-white">{item?.id ? "Përpuno median" : "Shto media"}</h3>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-white/50 hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-5" style={{ WebkitOverflowScrolling: "touch" }}>
          <div>
            <label className="mb-1 block text-xs text-white/50">Emri*</label>
            <input
              value={form.name}
              onChange={(event) => update("name", event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#8ab4ff]/50"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-white/50">Kategoria</label>
              <select
                value={form.type}
                onChange={(event) => update("type", event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#1a2640] px-3 py-2 text-sm text-white outline-none focus:border-[#8ab4ff]/50"
              >
                {MEDIA_CATS.filter((cat) => cat.key !== "all").map((cat) => (
                  <option key={cat.key} value={cat.key}>{cat.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-white/50">Besueshmëria</label>
              <select
                value={form.credibility}
                onChange={(event) => update("credibility", event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#1a2640] px-3 py-2 text-sm text-white outline-none focus:border-[#8ab4ff]/50"
              >
                <option value="e panjohur">E panjohur</option>
                {CREDIBILITY_OPTS.filter((opt) => opt.key !== "all").map((opt) => (
                  <option key={opt.key} value={opt.key}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-white/50">Simboli/flamuri</label>
              <input value={form.flag} onChange={(event) => update("flag", event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#8ab4ff]/50" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-white/50">Ngjyra</label>
              <input value={form.color} onChange={(event) => update("color", event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#8ab4ff]/50" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/50">Faqja / linku</label>
            <input value={form.site} onChange={(event) => update("site", event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#8ab4ff]/50" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/50">Stream / embed URL</label>
            <input value={form.stream} onChange={(event) => update("stream", event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#8ab4ff]/50" />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <label className="block text-xs text-white/50">Foto / logo (URL)</label>
              <button type="button" onClick={fetchWebsiteMetadata} disabled={metadataLoading || !(form.site || form.stream)}
                className="rounded-md border border-[#8ab4ff]/25 px-2 py-1 text-[10px] text-[#8ab4ff] hover:bg-[#8ab4ff]/10 disabled:opacity-50">
                {metadataLoading ? "Duke kërkuar..." : "Gjej nga website"}
              </button>
            </div>
            <input value={form.image_url} onChange={(event) => update("image_url", event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#8ab4ff]/50" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/50">Logo (URL, opsionale)</label>
            <input value={form.logo_url} onChange={(event) => update("logo_url", event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#8ab4ff]/50" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-white/50">Grupmosha</label>
              <select value={form.target_age} onChange={(event) => update("target_age", event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#1a2640] px-3 py-2 text-sm text-white outline-none focus:border-[#8ab4ff]/50">
                {AGE_OPTS.filter((opt) => opt.key !== "all").map((opt) => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-white/50">Orientimi</label>
              <select value={form.religious_orientation} onChange={(event) => update("religious_orientation", event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#1a2640] px-3 py-2 text-sm text-white outline-none focus:border-[#8ab4ff]/50">
                {RELIGION_OPTS.filter((opt) => opt.key !== "all").map((opt) => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/50">Programet, të ndara me presje</label>
            <input value={form.programmingText} onChange={(event) => update("programmingText", event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#8ab4ff]/50" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/50">Përshkrimi</label>
            <textarea value={form.desc} onChange={(event) => update("desc", event.target.value)} rows={4}
              className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#8ab4ff]/50" />
          </div>
          <label className="flex items-center gap-2 text-sm text-white">
            <input type="checkbox" checked={!!form.is_active} onChange={(event) => update("is_active", event.target.checked)} className="h-4 w-4 rounded" />
            Shfaqe publikisht
          </label>
        </div>

        <div className="flex shrink-0 justify-end gap-3 border-t border-white/10 px-5 py-4">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-white/60 hover:bg-white/5">Anulo</button>
          <button onClick={save} className="rounded-lg px-5 py-2 text-sm font-bold text-[#0b1020]" style={{ background: "linear-gradient(to right, #8ab4ff, #9bffd6)" }}>
            <Check className="mr-1 inline h-4 w-4" /> Ruaj
          </button>
        </div>
      </div>
    </div>
  );
}

export function MediaSection() {
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const [user, setUser] = useState(null);
  const [activeCategory, setActiveCategory] = useState(urlParams.get("sub") || "all");
  const [filterCredibility, setFilterCredibility] = useState("all");
  const [filterAge, setFilterAge] = useState("all");
  const [filterReligion, setFilterReligion] = useState("all");
  const [filterProgram, setFilterProgram] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [playerItem, setPlayerItem] = useState(null);
  const [mediaModalItem, setMediaModalItem] = useState(null);

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (authenticated) => {
      if (authenticated) setUser(await base44.auth.me());
    });
  }, []);

  const isAdmin = user?.role === "admin" || user?.role === "moderator";
  const canAddContent = user?.role === "admin";

  const { data: dbChannels = [] } = useQuery({
    queryKey: ["mediaChannels"],
    queryFn: () => base44.entities.MediaChannel.list("order", 100),
  });
  const { data: dbPosts = [] } = useQuery({
    queryKey: ["mediaPosts"],
    queryFn: () => base44.entities.MediaPost.list("order", 100),
  });

  const { data: siteConfigs = [] } = useQuery({
    queryKey: ["siteConfig"],
    queryFn: () => base44.entities.SiteConfig.list(),
  });

  const staticMediaConfig = siteConfigs.find((config) => config.key === STATIC_MEDIA_CONFIG_KEY);
  const staticMediaItems = useMemo(() => parseStaticMedia(staticMediaConfig?.value), [staticMediaConfig?.value]);

  const updateChannelMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MediaChannel.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mediaChannels"] }),
  });

  const deleteChannelMutation = useMutation({
    mutationFn: (id) => base44.entities.MediaChannel.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mediaChannels"] }),
  });

  const updatePostMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MediaPost.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mediaPosts"] }),
  });

  const createPostMutation = useMutation({
    mutationFn: (data) => base44.entities.MediaPost.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mediaPosts"] }),
  });

  const deletePostMutation = useMutation({
    mutationFn: (id) => base44.entities.MediaPost.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mediaPosts"] }),
  });

  const staticMediaMutation = useMutation({
    mutationFn: async (nextItems) => {
      const value = JSON.stringify(nextItems, null, 2);
      if (staticMediaConfig) {
        return base44.entities.SiteConfig.update(staticMediaConfig.id, { value });
      }
      return base44.entities.SiteConfig.create({
        key: STATIC_MEDIA_CONFIG_KEY,
        value,
        label: "Mediat statike",
        group: "media",
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["siteConfig"] }),
  });

  const visibleDbChannels = useMemo(
    () => (isAdmin ? dbChannels : dbChannels.filter((channel) => channel.is_active !== false)),
    [dbChannels, isAdmin]
  );

  const visibleDbPosts = useMemo(
    () => (isAdmin ? dbPosts : dbPosts.filter((post) => post.is_active !== false)),
    [dbPosts, isAdmin]
  );

  // Merge static + DB channels
  const allChannels = useMemo(() => {
    const dbMapped = visibleDbChannels.map(ch => ({ ...ch, _fromDB: true }));
    return [...staticMediaItems, ...dbMapped];
  }, [staticMediaItems, visibleDbChannels]);

  const saveStaticMediaItem = (item) => {
    const nextItems = staticMediaItems.some((media) => media.id === item.id)
      ? staticMediaItems.map((media) => (media.id === item.id ? item : media))
      : staticMediaItems.concat(item);
    staticMediaMutation.mutate(nextItems);
  };

  const handleEditMediaItem = (channel) => {
    setMediaModalItem(channel);
  };

  const handleAddMediaItem = (type) => {
    setMediaModalItem({
      _isNew: true,
      _fromPostDB: type === "podcast" || type === "blog",
      type,
      category: type,
      is_active: true,
    });
  };

  const handleSaveMediaItem = (item) => {
    const shared = {
      name: item.name,
      type: item.type,
      category: item.type,
      flag: item.flag,
      color: item.color,
      site: item.site,
      url: item.site,
      website_url: item.site,
      stream: item.stream,
      stream_url: item.stream,
      embed_url: item.stream,
      image_url: item.image_url,
      logo_url: item.logo_url,
      desc: item.desc,
      description: item.description,
      credibility: item.credibility,
      target_age: item.target_age,
      religious_orientation: item.religious_orientation,
      programming_type: item.programming_type,
      is_active: item.is_active,
    };

    if (item._fromPostDB) {
      const postData = {
        title: item.name,
        category: item.type,
        channel_name: item.name,
        link_url: item.site,
        embed_url: item.stream,
        image_url: item.image_url,
        logo_url: item.logo_url,
        description: item.description,
        is_active: item.is_active,
      };
      if (item._isNew) createPostMutation.mutate(postData);
      else updatePostMutation.mutate({ id: item.id, data: postData });
      setMediaModalItem(null);
      return;
    }

    if (item._fromDB) {
      updateChannelMutation.mutate({ id: item.id, data: shared });
      setMediaModalItem(null);
      return;
    }

    saveStaticMediaItem({
      ...shared,
      id: item.id,
    });
    setMediaModalItem(null);
  };

  const handleHideMediaItem = (channel) => {
    if (confirm(`Fshihe "${channel.name}" nga Media?`)) {
      if (!channel._fromDB) {
        staticMediaMutation.mutate(staticMediaItems.filter((media) => media.id !== channel.id));
        return;
      }
      updateChannelMutation.mutate({ id: channel.id, data: { is_active: false } });
    }
  };

  const handleDeleteMediaItem = (channel) => {
    if (confirm(`Fshi përgjithmonë "${channel.name}"?`)) {
      if (!channel._fromDB) {
        staticMediaMutation.mutate(staticMediaItems.filter((media) => media.id !== channel.id));
        return;
      }
      deleteChannelMutation.mutate(channel.id);
    }
  };

  const handleEditPost = (post) => {
    setMediaModalItem({
      ...post,
      _fromPostDB: true,
      name: post.title || "",
      type: post.category || "podcast",
      site: post.link_url || "",
      stream: post.embed_url || "",
      desc: post.description || "",
    });
  };

  const handleHidePost = (post) => {
    if (confirm(`Fshihe "${post.title}" nga Media?`)) {
      updatePostMutation.mutate({ id: post.id, data: { is_active: false } });
    }
  };

  const handleDeletePost = (post) => {
    if (confirm(`Fshi përgjithmonë "${post.title}"?`)) {
      deletePostMutation.mutate(post.id);
    }
  };

  const hasActiveFilter = filterCredibility !== "all" || filterAge !== "all" || filterReligion !== "all" || filterProgram !== "all";

  const filterChannel = (ch) => {
    if (filterCredibility !== "all" && ch.credibility !== filterCredibility) return false;
    if (filterAge !== "all" && ch.target_age && ch.target_age !== filterAge && ch.target_age !== "te_gjitha") return false;
    if (filterReligion === "islamik" && ch.religious_orientation !== "islamik") return false;
    if (filterReligion === "laik" && ch.religious_orientation === "islamik") return false;
    if (filterProgram !== "all") {
      const pt = ch.programming_type || [];
      if (!pt.includes(filterProgram)) return false;
    }
    return true;
  };

  const show = (key) => activeCategory === "all" || activeCategory === key;

  const tvList     = allChannels.filter(ch => ch.type === "tv"     && filterChannel(ch));
  const radioList  = allChannels.filter(ch => ch.type === "radio"  && filterChannel(ch));
  const gazetaList = allChannels.filter(ch => ch.type === "gazeta" && filterChannel(ch));
  const revistaList= allChannels.filter(ch => ch.type === "revista"&& filterChannel(ch));

  const blogPosts  = visibleDbPosts.filter(p => p.category === "blog");
  const otherDbPosts = visibleDbPosts.filter(p => p.category !== "blog" && (activeCategory === "all" || p.category === activeCategory));

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10">

      {/* ── Hero ── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="relative rounded-3xl overflow-hidden p-8 sm:p-12 text-center"
          style={{ background: "linear-gradient(135deg, rgba(138,180,255,0.12) 0%, rgba(155,255,214,0.08) 50%, rgba(138,180,255,0.06) 100%)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <div className="absolute inset-0 opacity-30"
            style={{ backgroundImage: "radial-gradient(circle at 20% 50%, rgba(138,180,255,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(155,255,214,0.2) 0%, transparent 50%)" }} />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/50 text-xs mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-[#9bffd6]" />
              Media Shqiptare
            </div>
            <h1 className="text-3xl sm:text-5xl font-bold text-white mb-3">
              Media
            </h1>
            <div className="flex flex-wrap justify-center gap-1.5 mt-3">
              {[{key:"tv",label:"📺 TV"},{key:"radio",label:"📻 Radio"},{key:"gazeta",label:"📰 Gazeta"},{key:"podcast",label:"🎙️ Çaste"},{key:"blog",label:"✍️ Shkrime"}].map(item => (
                <button key={item.key} onClick={() => setActiveCategory(item.key)}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-all ${activeCategory === item.key ? "text-[#0b1020] border-transparent" : "bg-white/5 border-white/15 text-white/55 hover:text-white hover:bg-white/10"}`}
                  style={activeCategory === item.key ? { background: "linear-gradient(135deg,#8ab4ff,#9bffd6)" } : {}}>
                  {item.label}
                </button>
              ))}
            </div>
            {isAdmin && (
              <p className="mt-4 text-xs text-white/35">
                Admin: përdor butonat mbi kartat për të përpunuar ose fshehur mediat.
              </p>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Advanced filters toggle ── */}
      {activeCategory !== "blog" && (
        <div className="mb-8">
          <button onClick={() => setShowFilters(f => !f)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium border transition-all ${hasActiveFilter ? "border-[#8ab4ff]/40 text-[#8ab4ff] bg-[#8ab4ff]/10" : "border-white/10 text-white/40 bg-white/5 hover:text-white/70"}`}>
            <Filter className="w-3.5 h-3.5" />
            Filtro sipas kategorisë
            {hasActiveFilter && (
              <span onClick={(e) => { e.stopPropagation(); setFilterCredibility("all"); setFilterAge("all"); setFilterReligion("all"); }}
                className="ml-1 text-white/40 hover:text-red-400 transition-colors">
                <X className="w-3.5 h-3.5" />
              </span>
            )}
          </button>
          {showFilters && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="mt-3 flex flex-wrap gap-x-4 gap-y-2 p-3 rounded-2xl border border-white/10 items-center"
              style={{ background: "rgba(255,255,255,0.04)" }}>
              <FilterSelect label="Besueshmëria" value={filterCredibility} options={CREDIBILITY_OPTS} onChange={setFilterCredibility} />
              <FilterSelect label="Grupmosha" value={filterAge} options={AGE_OPTS} onChange={setFilterAge} />
              <FilterSelect label="Programi" value={filterProgram} options={PROGRAM_OPTS} onChange={setFilterProgram} />
              <FilterSelect label="Orientimi" value={filterReligion} options={RELIGION_OPTS} onChange={setFilterReligion} />
            </motion.div>
          )}
        </div>
      )}

      {activeCategory === "blog" && <div className="mb-8" />}

      <div className="space-y-12">

        {/* ── TV ── */}
        {show("tv") && (tvList.length > 0 || canAddContent) && (
          <section>
            <SectionHeader icon={Tv} title="Televizion" dot />
            {canAddContent && <AdminAddButton label="Shto TV" onClick={() => handleAddMediaItem("tv")} />}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {tvList.map(ch => <ChannelCard key={ch.id} ch={ch} onPlay={setPlayerItem} isAdmin={isAdmin} onEdit={handleEditMediaItem} onHide={handleHideMediaItem} onDelete={handleDeleteMediaItem} />)}
            </div>
          </section>
        )}

        {/* ── Radio ── */}
        {show("radio") && (radioList.length > 0 || canAddContent) && (
          <section>
            <SectionHeader icon={Radio} title="Radio" dot />
            {canAddContent && <AdminAddButton label="Shto radio" onClick={() => handleAddMediaItem("radio")} />}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {radioList.map(ch => <ChannelCard key={ch.id} ch={ch} onPlay={setPlayerItem} isAdmin={isAdmin} onEdit={handleEditMediaItem} onHide={handleHideMediaItem} onDelete={handleDeleteMediaItem} />)}
            </div>
          </section>
        )}

        {/* ── Gazeta ── */}
        {show("gazeta") && (gazetaList.length > 0 || canAddContent) && (
          <section>
            <SectionHeader icon={Newspaper} title="Gazeta" />
            {canAddContent && <AdminAddButton label="Shto gazetë" onClick={() => handleAddMediaItem("gazeta")} />}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {gazetaList.map(item => <PubCard key={item.id} item={item} onPlay={setPlayerItem} isAdmin={isAdmin} onEdit={handleEditMediaItem} onHide={handleHideMediaItem} onDelete={handleDeleteMediaItem} />)}
            </div>
          </section>
        )}

        {/* ── Revista ── */}
        {show("revista") && (revistaList.length > 0 || canAddContent) && (
          <section>
            <SectionHeader icon={BookOpen} title="Revista" />
            {canAddContent && <AdminAddButton label="Shto revistë" onClick={() => handleAddMediaItem("revista")} />}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {revistaList.map(item => <PubCard key={item.id} item={item} onPlay={setPlayerItem} isAdmin={isAdmin} onEdit={handleEditMediaItem} onHide={handleHideMediaItem} onDelete={handleDeleteMediaItem} />)}
            </div>
          </section>
        )}

        {/* ── Podcast ── */}
        {show("podcast") && (
          <section>
            <SectionHeader icon={Mic} title="Podcast" />
            {canAddContent && <AdminAddButton label="Shto podcast" onClick={() => handleAddMediaItem("podcast")} />}
            {otherDbPosts.filter(p => p.category === "podcast").length === 0 ? (
              <div className="text-center py-16 rounded-2xl border border-white/10 bg-white/5">
                <Mic className="w-10 h-10 text-white/20 mx-auto mb-3" />
                <p className="text-white/40 font-medium">Podcast — Së shpejti</p>
                <p className="text-white/25 text-xs mt-1">Ekipi po punon për këtë kategori.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {otherDbPosts.filter(p => p.category === "podcast").map(p => (
                  <div key={p.id} className="relative rounded-2xl border border-white/10 p-4 flex flex-col gap-3 bg-white/5 hover:border-white/20 transition-all">
                    {isAdmin && (
                      <div className="absolute right-2 top-2 z-20 flex gap-1">
                        <button onClick={() => handleEditPost(p)} className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white/70 hover:text-white" title="Përpuno">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleHidePost(p)} className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-yellow-300 hover:text-yellow-200" title="Fshihe">
                          <EyeOff className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDeletePost(p)} className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-red-400 hover:text-red-300" title="Fshi">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                    {p.image_url && <img src={p.image_url} alt={p.title} className="w-full h-36 object-cover rounded-xl" />}
                    <h3 className="text-white font-semibold text-sm">{p.title}</h3>
                    {p.channel_name && <p className="text-white/40 text-xs">{p.channel_name}</p>}
                    {(p.embed_url || p.link_url) && (
                      <button onClick={() => setPlayerItem({ ...p, site: p.link_url, embed_url: p.embed_url })}
                        className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-[#0b1020]"
                        style={{ background: "linear-gradient(135deg,#8ab4ff,#9bffd6)" }}>
                        <Play className="w-3.5 h-3.5" /> Dëgjo
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Blog & Opinione ── */}
        {show("blog") && (
          <section>
            <SectionHeader icon={PenLine} title="Blog & Opinione — Autorë të pavarur" />
            {canAddContent && <AdminAddButton label="Shto shkrim/blog" onClick={() => handleAddMediaItem("blog")} />}
            <p className="text-white/35 text-sm mb-6 max-w-2xl">
              Shkrimtarë dhe publicistë të pavarur ndajnë analiza, opinion dhe ese kulturore jashtë mediave tradicionale.
            </p>
            {blogPosts.length === 0 ? (
              <div className="text-center py-16 rounded-2xl border border-white/10 bg-white/5">
                <PenLine className="w-10 h-10 text-white/20 mx-auto mb-3" />
                <p className="text-white/40 font-medium">Blog — Autorë të pavarur</p>
                <p className="text-white/25 text-xs mt-2">
                  Jeni shkrimtar ose publicist? Na kontaktoni në{" "}
                  <a href="mailto:info@antokton.com" className="text-[#8ab4ff]">info@antokton.com</a>
                </p>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {blogPosts.map(p => <BlogPostCard key={p.id} post={p} />)}
              </div>
            )}
          </section>
        )}

        {/* ── Other DB posts ── */}
        {otherDbPosts.filter(p => p.category !== "podcast" && p.category !== "blog").length > 0 && (
          <section>
            <SectionHeader icon={Tv} title="Nga Antokton" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {otherDbPosts.filter(p => p.category !== "podcast" && p.category !== "blog").map(p => (
                <div key={p.id}
                  className="relative rounded-2xl border border-white/10 overflow-hidden flex flex-col hover:border-white/20 transition-all"
                  style={{ background: "rgba(255,255,255,0.05)" }}>
                  {isAdmin && (
                    <div className="absolute right-2 top-2 z-20 flex gap-1">
                      <button onClick={() => handleEditPost(p)} className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white/70 hover:text-white" title="Përpuno">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleHidePost(p)} className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-yellow-300 hover:text-yellow-200" title="Fshihe">
                        <EyeOff className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDeletePost(p)} className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-red-400 hover:text-red-300" title="Fshi">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  {p.image_url && <img src={p.image_url} alt={p.title} className="w-full h-40 object-cover" />}
                  <div className="p-4 flex flex-col flex-1 gap-2">
                    {p.channel_name && <p className="text-white/35 text-xs">{p.channel_name}</p>}
                    <h3 className="text-white font-semibold text-sm leading-tight flex-1">{p.title}</h3>
                    {p.description && <p className="text-white/50 text-xs leading-relaxed line-clamp-3">{p.description}</p>}
                    <div className="flex gap-2 mt-1">
                      {(p.embed_url || p.link_url) && (
                        <button onClick={() => setPlayerItem({ ...p, site: p.link_url, embed_url: p.embed_url })}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#0b1020]"
                          style={{ background: "linear-gradient(135deg, #8ab4ff, #9bffd6)" }}>
                          <Play className="w-3.5 h-3.5" /> Shiko
                        </button>
                      )}
                      {p.link_url && (
                        <a href={p.link_url} target="_blank" rel="noopener noreferrer"
                          className="p-2 rounded-xl border border-white/10 text-white/40 hover:text-white hover:border-white/25 transition-all flex items-center justify-center">
                          <Globe className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Coming soon ── */}
        <div className="rounded-2xl border border-white/10 p-8 text-center"
          style={{ background: "linear-gradient(135deg, rgba(138,180,255,0.05), rgba(155,255,214,0.03))" }}>
          <div className="flex items-center justify-center gap-3 mb-2">
            <Tv className="w-5 h-5 text-[#8ab4ff]" />
            <Radio className="w-5 h-5 text-[#9bffd6]" />
          </div>
          <p className="text-white/50 font-semibold text-sm">Antokton TV & Radio — Së shpejti</p>
          <p className="text-white/25 text-xs mt-1">Kanale të dedikuara për komunitetin shqiptar në diasporë</p>
        </div>

      </div>

      {/* ── Player Modal ── */}
      {playerItem && <MediaPlayerModal item={playerItem} onClose={() => setPlayerItem(null)} />}
      {mediaModalItem && (
        <MediaItemModal
          item={mediaModalItem}
          defaultType={mediaModalItem.type || mediaModalItem.category || "tv"}
          onClose={() => setMediaModalItem(null)}
          onSave={handleSaveMediaItem}
        />
      )}

    </section>
  );
}

export default function Media() {
  return <MediaSection />;
}
