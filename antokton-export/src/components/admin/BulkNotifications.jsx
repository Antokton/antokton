import React, { useState, useMemo } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Send, Users, Filter, X, ChevronDown, ChevronUp } from "lucide-react";
import toast from "react-hot-toast";

export default function BulkNotifications({ allUsers }) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [selectedType, setSelectedType] = useState("system");
  const [sending, setSending] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const queryClient = useQueryClient();

  // Filters
  const [filterRole, setFilterRole] = useState("all");
  const [filterUserType, setFilterUserType] = useState("all");
  const [filterCountry, setFilterCountry] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [filterBirthCountry, setFilterBirthCountry] = useState("");
  const [filterWorkCountry, setFilterWorkCountry] = useState("");
  const [filterLanguage, setFilterLanguage] = useState("");
  const [filterIndustry, setFilterIndustry] = useState("");
  const [filterProfession, setFilterProfession] = useState("");
  const [filterGender, setFilterGender] = useState("all");
  const [filterReligion, setFilterReligion] = useState("all");
  const [filterVerified, setFilterVerified] = useState("all");
  const [filterPremium, setFilterPremium] = useState("all");
  const [filterMinExp, setFilterMinExp] = useState("");
  const [filterMinAge, setFilterMinAge] = useState("");
  const [filterMaxAge, setFilterMaxAge] = useState("");
  const [filterNameInitial, setFilterNameInitial] = useState("");
  const [filterActivity, setFilterActivity] = useState("all");

  const { data: activeSubs = [] } = useQuery({
    queryKey: ["activeSubscriptions"],
    queryFn: async () => {
      const subs = await base44.entities.PremiumSubscription.filter({ is_active: true });
      const now = new Date();
      return subs.filter(s => new Date(s.end_date) > now);
    }
  });

  const premiumEmails = useMemo(() => new Set(activeSubs.map(s => s.user_email)), [activeSubs]);

  const filteredUsers = useMemo(() => {
    const now = new Date();
    return allUsers.filter(u => {
      if (filterRole !== "all" && u.role !== filterRole) return false;
      if (filterUserType !== "all" && u.user_type !== filterUserType) return false;
      if (filterGender !== "all" && u.gender !== filterGender) return false;
      if (filterReligion !== "all" && u.religion !== filterReligion) return false;
      if (filterVerified === "yes" && !u.is_verified) return false;
      if (filterVerified === "no" && u.is_verified) return false;
      if (filterPremium === "yes" && !premiumEmails.has(u.email)) return false;
      if (filterPremium === "no" && premiumEmails.has(u.email)) return false;

      // Vendbanimi (ku jeton tani)
      if (filterCountry) {
        const q = filterCountry.toLowerCase();
        if (!(u.country || "").toLowerCase().includes(q)) return false;
      }
      if (filterCity) {
        const q = filterCity.toLowerCase();
        if (!(u.city || "").toLowerCase().includes(q)) return false;
      }
      // Vendlindja
      if (filterBirthCountry) {
        const q = filterBirthCountry.toLowerCase();
        if (!(u.birth_country || u.origin_country || "").toLowerCase().includes(q)) return false;
      }
      // Vendi i punës / zona e preferuar
      if (filterWorkCountry) {
        const q = filterWorkCountry.toLowerCase();
        const workFields = `${u.work_country || ""} ${u.preferred_work_location || ""} ${u.desired_location || ""}`.toLowerCase();
        if (!workFields.includes(q)) return false;
      }
      if (filterLanguage) {
        const q = filterLanguage.toLowerCase();
        const langs = (u.languages || []).map(l => `${l.language}`.toLowerCase()).join(" ");
        if (!langs.includes(q) && !(u.language || "").toLowerCase().includes(q)) return false;
      }
      if (filterIndustry) {
        const q = filterIndustry.toLowerCase();
        if (!(u.industry || "").toLowerCase().includes(q)) return false;
      }
      if (filterProfession) {
        const q = filterProfession.toLowerCase();
        const prof = `${u.job_title || ""} ${u.profession || ""} ${u.current_position || ""}`.toLowerCase();
        if (!prof.includes(q)) return false;
      }
      if (filterMinExp) {
        if ((u.years_of_experience || 0) < parseInt(filterMinExp)) return false;
      }
      // Filtrimi sipas moshës
      if ((filterMinAge || filterMaxAge) && u.birth_date) {
        const age = Math.floor((now - new Date(u.birth_date)) / (365.25 * 24 * 60 * 60 * 1000));
        if (filterMinAge && age < parseInt(filterMinAge)) return false;
        if (filterMaxAge && age > parseInt(filterMaxAge)) return false;
      }
      // Filtrimi sipas iniciales/emrit
      if (filterNameInitial) {
        const q = filterNameInitial.toLowerCase();
        const name = `${u.first_name || ""} ${u.surname || ""} ${u.full_name || ""}`.toLowerCase();
        if (!name.startsWith(q) && !name.split(" ").some(part => part.startsWith(q))) return false;
      }
      // Filtrimi sipas aktivitetit
      if (filterActivity !== "all" && u.last_seen) {
        const diffDays = (now - new Date(u.last_seen)) / (1000 * 60 * 60 * 24);
        if (filterActivity === "today" && diffDays > 1) return false;
        if (filterActivity === "week" && diffDays > 7) return false;
        if (filterActivity === "month" && diffDays > 30) return false;
        if (filterActivity === "inactive" && diffDays < 30) return false;
      }

      return true;
    });
  }, [allUsers, filterRole, filterUserType, filterGender, filterReligion, filterVerified, filterPremium,
      filterCountry, filterCity, filterBirthCountry, filterWorkCountry,
      filterLanguage, filterIndustry, filterProfession, filterMinExp,
      filterMinAge, filterMaxAge, filterNameInitial, filterActivity, premiumEmails]);

  const activeFilterCount = [
    filterRole !== "all", filterUserType !== "all", filterGender !== "all",
    filterReligion !== "all", filterVerified !== "all", filterPremium !== "all",
    filterActivity !== "all",
    filterCountry, filterCity, filterBirthCountry, filterWorkCountry,
    filterLanguage, filterIndustry, filterProfession,
    filterMinExp, filterMinAge, filterMaxAge, filterNameInitial
  ].filter(Boolean).length;

  const resetFilters = () => {
    setFilterRole("all"); setFilterUserType("all"); setFilterGender("all");
    setFilterReligion("all"); setFilterVerified("all"); setFilterPremium("all");
    setFilterActivity("all");
    setFilterCountry(""); setFilterCity(""); setFilterBirthCountry(""); setFilterWorkCountry("");
    setFilterLanguage(""); setFilterIndustry(""); setFilterProfession("");
    setFilterMinExp(""); setFilterMinAge(""); setFilterMaxAge(""); setFilterNameInitial("");
  };

  const sendNotifications = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error("Ju lutem plotësoni titullin dhe mesazhin");
      return;
    }
    if (filteredUsers.length === 0) {
      toast.error("Asnjë anëtar nuk përputhet me filtrat e zgjedhur");
      return;
    }
    if (!confirm(`Do të dërgosh njoftim për ${filteredUsers.length} anëtarë. Vazhdo?`)) return;

    setSending(true);
    let sentCount = 0;
    let errorCount = 0;

    for (const user of filteredUsers) {
      try {
        await base44.entities.Notification.create({
          user_email: user.email,
          type: selectedType,
          title,
          message,
          link: "/"
        });
        sentCount++;
      } catch {
        errorCount++;
      }
    }

    setSending(false);
    if (errorCount > 0) {
      toast.error(`Dërguar ${sentCount}, dështimet: ${errorCount}`);
    } else {
      toast.success(`✓ Njoftimet u dërguan për ${sentCount} anëtarë!`);
    }
    setTitle("");
    setMessage("");
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  return (
    <div className="rounded-xl border border-white/10 p-5 space-y-4" style={{ background: 'rgba(255, 255, 255, 0.06)' }}>

      {/* Audience selector */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-white/70 text-sm font-medium flex items-center gap-2">
            <Users className="w-4 h-4" /> Audienca
          </label>
          <button
            onClick={() => setShowFilters(f => !f)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              showFilters || activeFilterCount > 0
                ? "bg-[#8ab4ff]/15 border-[#8ab4ff]/40 text-[#8ab4ff]"
                : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
            }`}
          >
            <Filter className="w-3 h-3" />
            Filtrat
            {activeFilterCount > 0 && (
              <span className="bg-[#8ab4ff] text-[#0b1020] rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
                {activeFilterCount}
              </span>
            )}
            {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Audience badge */}
        <div className={`text-sm px-3 py-2 rounded-lg flex items-center gap-2 ${
          filteredUsers.length === allUsers.length
            ? "bg-blue-500/10 border border-blue-500/20 text-blue-300"
            : "bg-green-500/10 border border-green-500/20 text-green-300"
        }`}>
          <Users className="w-3.5 h-3.5 flex-shrink-0" />
          <span>
            <strong>{filteredUsers.length}</strong> anëtarë
            {filteredUsers.length === allUsers.length
              ? " — të gjithë"
              : ` nga ${allUsers.length} (të filtruar)`}
          </span>
          {activeFilterCount > 0 && (
            <button onClick={resetFilters} className="ml-auto text-white/40 hover:text-white/70 flex items-center gap-1 text-xs">
              <X className="w-3 h-3" /> Pastro
            </button>
          )}
        </div>

        {/* Filter grid */}
        {showFilters && (
          <div className="mt-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="h-8 text-xs bg-white/5 border-white/10 text-white"><SelectValue placeholder="Roli" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Të gjithë rolet</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                  <SelectItem value="user">Anëtar</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterUserType} onValueChange={setFilterUserType}>
                <SelectTrigger className="h-8 text-xs bg-white/5 border-white/10 text-white"><SelectValue placeholder="Lloji" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Të gjitha llojet</SelectItem>
                  <SelectItem value="job_seeker">Punëkërkues</SelectItem>
                  <SelectItem value="employer">Punëdhënës</SelectItem>
                  <SelectItem value="recruiter">Rekrutues</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterGender} onValueChange={setFilterGender}>
                <SelectTrigger className="h-8 text-xs bg-white/5 border-white/10 text-white"><SelectValue placeholder="Gjinia" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Të gjitha gjinitë</SelectItem>
                  <SelectItem value="male">Mashkull</SelectItem>
                  <SelectItem value="female">Femër</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterReligion} onValueChange={setFilterReligion}>
                <SelectTrigger className="h-8 text-xs bg-white/5 border-white/10 text-white"><SelectValue placeholder="Besimi fetar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Të gjitha besimet</SelectItem>
                  <SelectItem value="islam">Islam</SelectItem>
                  <SelectItem value="katolik">Katolik</SelectItem>
                  <SelectItem value="ortodoks">Ortodoks</SelectItem>
                  <SelectItem value="tjeter">Tjetër</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterVerified} onValueChange={setFilterVerified}>
                <SelectTrigger className="h-8 text-xs bg-white/5 border-white/10 text-white"><SelectValue placeholder="Verifikimi" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Verifikimi — të gjithë</SelectItem>
                  <SelectItem value="yes">Vetëm të verifikuarit ✓</SelectItem>
                  <SelectItem value="no">Jo të verifikuarit</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterPremium} onValueChange={setFilterPremium}>
                <SelectTrigger className="h-8 text-xs bg-white/5 border-white/10 text-white"><SelectValue placeholder="Premium" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Premium — të gjithë</SelectItem>
                  <SelectItem value="yes">Vetëm Premium 👑</SelectItem>
                  <SelectItem value="no">Jo Premium</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterActivity} onValueChange={setFilterActivity}>
                <SelectTrigger className="h-8 text-xs bg-white/5 border-white/10 text-white col-span-2"><SelectValue placeholder="Aktiviteti" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Aktiviteti — të gjithë</SelectItem>
                  <SelectItem value="today">Aktiv sot</SelectItem>
                  <SelectItem value="week">Aktiv këtë javë</SelectItem>
                  <SelectItem value="month">Aktiv këtë muaj</SelectItem>
                  <SelectItem value="inactive">Joaktiv +30 ditë</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Input value={filterNameInitial} onChange={e => setFilterNameInitial(e.target.value)}
                placeholder="Emri/inicialet fillon me..." className="h-8 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/30" />
              <Input value={filterProfession} onChange={e => setFilterProfession(e.target.value)}
                placeholder="Profesioni / titulli..." className="h-8 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/30" />
              <Input value={filterCountry} onChange={e => setFilterCountry(e.target.value)}
                placeholder="Vendbanimi — shteti..." className="h-8 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/30" />
              <Input value={filterCity} onChange={e => setFilterCity(e.target.value)}
                placeholder="Vendbanimi — qyteti..." className="h-8 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/30" />
              <Input value={filterBirthCountry} onChange={e => setFilterBirthCountry(e.target.value)}
                placeholder="Vendlindja..." className="h-8 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/30" />
              <Input value={filterWorkCountry} onChange={e => setFilterWorkCountry(e.target.value)}
                placeholder="Vendi i punës / zona e preferuar..." className="h-8 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/30" />
              <Input value={filterLanguage} onChange={e => setFilterLanguage(e.target.value)}
                placeholder="Gjuha (shqip, anglisht...)..." className="h-8 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/30" />
              <Input value={filterIndustry} onChange={e => setFilterIndustry(e.target.value)}
                placeholder="Industria..." className="h-8 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/30" />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Input value={filterMinAge} onChange={e => setFilterMinAge(e.target.value)}
                type="number" min="0" placeholder="Mosha min..." className="h-8 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/30" />
              <Input value={filterMaxAge} onChange={e => setFilterMaxAge(e.target.value)}
                type="number" min="0" placeholder="Mosha max..." className="h-8 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/30" />
              <Input value={filterMinExp} onChange={e => setFilterMinExp(e.target.value)}
                type="number" min="0" placeholder="Përvojë min (vite)..." className="h-8 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/30" />
            </div>
          </div>
        )}
      </div>

      {/* Message form */}
      <div>
        <label className="text-white/70 text-sm font-medium block mb-1.5">Lloji i Njoftimit</label>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="w-full bg-white/10 border border-white/20 text-white rounded-lg px-3 py-2 text-sm"
        >
          <option value="system" className="bg-[#0b1020]">Sistem</option>
          <option value="announcement" className="bg-[#0b1020]">Lajmërim</option>
          <option value="status_update" className="bg-[#0b1020]">Përditësim Statusi</option>
        </select>
      </div>

      <div>
        <label className="text-white/70 text-sm font-medium block mb-1.5">Titulli</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="p.sh. Mirëseruptur në Antokton 2026"
          disabled={sending}
        />
      </div>

      <div>
        <label className="text-white/70 text-sm font-medium block mb-1.5">Mesazhi</label>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Shkruaj mesazhin..."
          className="min-h-[100px]"
          disabled={sending}
        />
      </div>

      <Button
        onClick={sendNotifications}
        disabled={sending || filteredUsers.length === 0}
        className="bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] w-full font-semibold"
      >
        {sending ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Duke dërguar...</>
        ) : (
          <><Send className="w-4 h-4 mr-2" /> Dërgo për {filteredUsers.length} anëtarë</>
        )}
      </Button>
    </div>
  );
}