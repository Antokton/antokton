import React, { useState, useCallback, useMemo } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import UserAvatar from "@/components/ui/UserAvatar";
import { Search as SearchIcon, Loader2, MapPin, Briefcase, ShoppingBag, Radio, Calendar, Users, X, GraduationCap, Wrench, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";

const CATEGORY_PRIORITY = ["anetare", "pune", "edukim", "sherbime", "pazar", "status", "prona", "bamiresi", "tjeter"];

const CATEGORY_LABELS = {
  anetare: { label: "Anëtarë", icon: Users, color: "#9bffd6" },
  pune: { label: "Punë", icon: Briefcase, color: "#8ab4ff" },
  edukim: { label: "Edukim", icon: GraduationCap, color: "#9bffd6" },
  sherbime: { label: "Shërbime", icon: Wrench, color: "#ffd6a5" },
  pazar: { label: "Pazar", icon: ShoppingBag, color: "#ffb3c6" },
  status: { label: "Statuse", icon: Radio, color: "#c8b6ff" },
  prona: { label: "Prona", icon: MapPin, color: "#b5ead7" },
  bamiresi: { label: "Bamirësi", icon: Heart, color: "#ff9aa2" },
  tjeter: { label: "Tjera", icon: Briefcase, color: "#ffffff" },
};

function highlight(text, term) {
  if (!text || !term) return text;
  const idx = text.toLowerCase().indexOf(term.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-[#8ab4ff]/30 text-[#8ab4ff] rounded px-0.5">{text.slice(idx, idx + term.length)}</mark>
      {text.slice(idx + term.length)}
    </>
  );
}

export default function Search() {
  const [searchTerm, setSearchTerm] = useState("");
  const [inputValue, setInputValue] = useState("");

  // Fetch all data sources
  const { data: jobs = [], isLoading: loadingJobs } = useQuery({
    queryKey: ["searchJobs"],
    queryFn: () => base44.entities.Job.filter({ status: "approved" }, "-created_date", 500),
    staleTime: 60000,
  });

  const { data: statuses = [], isLoading: loadingStatuses } = useQuery({
    queryKey: ["searchStatuses"],
    queryFn: () => base44.entities.Status.list("-created_date", 300),
    staleTime: 60000,
  });

  const { data: events = [], isLoading: loadingEvents } = useQuery({
    queryKey: ["searchEvents"],
    queryFn: () => base44.entities.Event.filter({ status: "approved" }, "-event_date", 200),
    staleTime: 60000,
  });

  const { data: importedPosts = [], isLoading: loadingImported } = useQuery({
    queryKey: ["searchImported"],
    queryFn: () => base44.entities.ImportedPost.list("-created_date", 300),
    staleTime: 60000,
  });

  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["searchMembers"],
    queryFn: () => base44.entities.User.list("-created_date", 500),
    staleTime: 60000,
  });

  const isLoading = loadingJobs || loadingStatuses || loadingEvents || loadingImported || loadingUsers;

  const handleSearch = useCallback(() => {
    setSearchTerm(inputValue.trim());
  }, [inputValue]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  // Build combined results
  const results = useMemo(() => {
    if (!searchTerm) return [];
    const q = searchTerm.toLowerCase();

    const matches = [];

    // Members
    users
      .filter(member => !member.is_deleted && member.is_active !== false)
      .forEach(member => {
        const fullName = [member.first_name, member.surname].filter(Boolean).join(" ") || member.full_name || member.email || "Anëtar";
        const text = [
          fullName,
          member.email,
          member.job_title,
          member.profession,
          member.skills,
          member.bio,
          member.city,
          member.country,
          member.birthplace,
          member.location,
          member.member_category,
        ].filter(Boolean).join(" ").toLowerCase();

        if (text.includes(q)) {
          matches.push({
            id: member.id || member.email,
            type: "member",
            category: "anetare",
            title: fullName,
            description: member.bio || member.skills || member.job_description || "",
            meta: [member.job_title || member.profession, member.birthplace || member.city || member.country].filter(Boolean).join(" • "),
            link: member.email ? `/Member/${encodeURIComponent(member.email)}` : createPageUrl("Members"),
            photoUrl: member.profile_photo_url,
            email: member.email,
            badge: member.role === "moderator" ? "Moderator" : member.role === "admin" ? "Admin" : member.member_category === "privileged" ? "I privilegjuar" : "Anëtar",
            badgeColor: member.role === "admin" ? "#8ab4ff" : member.role === "moderator" ? "#c8b6ff" : "#9bffd6",
          });
        }
      });

    // Jobs
    jobs.forEach(job => {
      const text = `${job.title || ""} ${job.description || ""} ${job.profession || ""} ${job.country || ""} ${job.city || ""} ${job.required_skills || ""}`.toLowerCase();
      if (text.includes(q)) {
        matches.push({
          id: job.id,
          type: "job",
          category: job.category || "pune",
          title: job.title,
          description: job.description,
          meta: [job.country, job.city].filter(Boolean).join(", "),
          link: createPageUrl("PostDetail") + `?id=${job.id}`,
          badge: job.job_type === "kerkoj" ? "Kërkoj" : "Ofroj",
          badgeColor: job.job_type === "kerkoj" ? "#9bffd6" : "#8ab4ff",
        });
      }
    });

    // Imported posts (pazar/sherbime/tjera)
    importedPosts.forEach(post => {
      const text = `${post.title || ""} ${post.description || ""} ${post.category || ""} ${post.location || ""}`.toLowerCase();
      if (text.includes(q)) {
        matches.push({
          id: post.id,
          type: "imported",
          category: post.category || "tjeter",
          title: post.title,
          description: post.description,
          meta: post.location || "",
          link: createPageUrl("PostDetail") + `?id=${post.id}`,
        });
      }
    });

    // Statuses
    statuses.forEach(st => {
      const text = `${st.content || ""} ${st.author_name || ""}`.toLowerCase();
      if (text.includes(q)) {
        matches.push({
          id: st.id,
          type: "status",
          category: "status",
          title: st.author_name || "Status",
          description: st.content,
          meta: "",
          link: "/Statuset",
        });
      }
    });

    // Events
    events.forEach(ev => {
      const text = `${ev.title || ""} ${ev.description || ""} ${ev.location || ""} ${ev.country || ""}`.toLowerCase();
      if (text.includes(q)) {
        matches.push({
          id: ev.id,
          type: "event",
          category: "tjeter",
          title: ev.title,
          description: ev.description,
          meta: [ev.location, ev.country].filter(Boolean).join(", "),
          link: createPageUrl("EventDetail") + `?id=${ev.id}`,
          isEvent: true,
        });
      }
    });

    // Sort by category priority
    matches.sort((a, b) => {
      const pa = CATEGORY_PRIORITY.indexOf(a.category) === -1 ? 99 : CATEGORY_PRIORITY.indexOf(a.category);
      const pb = CATEGORY_PRIORITY.indexOf(b.category) === -1 ? 99 : CATEGORY_PRIORITY.indexOf(b.category);
      return pa - pb;
    });

    return matches;
  }, [searchTerm, users, jobs, statuses, events, importedPosts]);

  // Group by category
  const grouped = useMemo(() => {
    const groups = {};
    results.forEach(r => {
      const cat = r.isEvent ? "event" : r.category;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(r);
    });
    return groups;
  }, [results]);

  const groupOrder = [...CATEGORY_PRIORITY, "event"];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight mb-1">Kërko</h1>
        <p className="text-white/50 text-sm">Kërko anëtarë, njoftime, shërbime, pazar, statuse dhe ngjarje</p>
      </div>

      {/* Search Input */}
      <div className="flex gap-2 mb-8">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Shkruaj çdo fjalë për të kërkuar..."
            className="pl-11 h-12 bg-white/5 border-white/10 text-white placeholder:text-white/40"
            autoFocus
          />
          {inputValue && (
            <button onClick={() => { setInputValue(""); setSearchTerm(""); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={handleSearch}
          className="px-5 h-12 rounded-lg bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 text-sm"
        >
          <SearchIcon className="w-4 h-4" />
          Kërko
        </button>
      </div>

      {/* States */}
      {!searchTerm ? (
        <div className="text-center py-20">
          <SearchIcon className="w-12 h-12 text-white/10 mx-auto mb-4" />
          <p className="text-white/30 text-sm">Shkruaj një fjalë dhe shtyp Kërko</p>
        </div>
      ) : isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-7 h-7 text-white/30 animate-spin" />
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-20">
          <SearchIcon className="w-10 h-10 text-white/10 mx-auto mb-3" />
          <p className="text-white/40 text-sm">Nuk u gjet asnjë rezultat për "<span className="text-white/60">{searchTerm}</span>"</p>
        </div>
      ) : (
        <div className="space-y-8">
          <p className="text-white/40 text-xs">{results.length} rezultate për "<span className="text-white/60">{searchTerm}</span>"</p>

          {groupOrder.map(cat => {
            const items = grouped[cat];
            if (!items?.length) return null;
            const catInfo = cat === "event"
              ? { label: "Ngjarje", icon: Calendar, color: "#ffd6a5" }
              : (CATEGORY_LABELS[cat] || { label: cat, icon: Briefcase, color: "#ffffff" });
            const Icon = catInfo.icon;

            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="w-4 h-4" style={{ color: catInfo.color }} />
                  <h2 className="text-sm font-semibold" style={{ color: catInfo.color }}>{catInfo.label}</h2>
                  <span className="text-white/30 text-xs">({items.length})</span>
                </div>
                <div className="space-y-2">
                  {items.map((item, i) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <Link to={item.link}>
                        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 hover:bg-white/8 transition-all">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start gap-3">
                                {item.type === "member" && (
                                  <UserAvatar name={item.title} email={item.email} photoUrl={item.photoUrl} size={42} />
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <h3 className="text-white text-sm font-semibold truncate">
                                      {highlight(item.title, searchTerm)}
                                    </h3>
                                    {item.badge && (
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${item.badgeColor}20`, color: item.badgeColor }}>
                                        {item.badge}
                                      </span>
                                    )}
                                  </div>
                                  {item.description && (
                                    <p className="text-white/50 text-xs line-clamp-2 mb-1">
                                      {highlight(item.description.slice(0, 200), searchTerm)}
                                    </p>
                                  )}
                                  {item.meta && (
                                    <p className="text-white/30 text-xs flex items-center gap-1">
                                      <MapPin className="w-3 h-3" />{item.meta}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
