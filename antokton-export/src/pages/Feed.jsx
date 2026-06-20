import React, { useState, useMemo } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery } from "@tanstack/react-query";
import FeedFilters from "../components/feed/FeedFilters";
import JobCard from "../components/feed/JobCard";
import PullToRefresh from "../components/PullToRefresh";
import { Loader2, Inbox, Bookmark, Bell, Send, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createPageUrl } from "../utils";
import { filterActivePosts, isExpiringSoon, isPostExpired } from "@/lib/expiry";

export default function Feed({ fixedCategory = null }) {
  const urlParams = new URLSearchParams(window.location.search);
  const initialCategory = fixedCategory || urlParams.get("category") || "all";
  const initialJobType = urlParams.get("job_type") || "all";
  const initialSub = urlParams.get("sub") || "all";
  const initialField = urlParams.get("field") || "all";

  const [user, setUser] = useState(null);
  const [showSaveSearch, setShowSaveSearch] = useState(false);
  const [searchName, setSearchName] = useState("");

  React.useEffect(() => {
    document.title = 'Njoftimet e Punës - Antokton Jobs';
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Kërko mes njoftimeve të punës për shqiptarët. Filtro sipas profesionit, rajonit dhe llojit.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Kërko mes njoftimeve të punës për shqiptarët. Filtro sipas profesionit, rajonit dhe llojit.';
      document.head.appendChild(meta);
    }
  }, []);

  React.useEffect(() => {
    const loadUser = async () => {
      const authenticated = await base44.auth.isAuthenticated();
      if (authenticated) {
        const me = await base44.auth.me();
        setUser(me);
      }
    };
    loadUser();
  }, []);

  const [filters, setFilters] = useState({
    search: "",
    category: initialCategory,
    job_type: initialJobType,
    sub: initialSub,
    service_field: initialField,
    country: "all",
    region: "all",
    city: "",
    subregion: "",
    profession: "all",
    skills: "",
    experienceLevel: "all",
    contractType: "all",
    workLocation: "all",
    dateFrom: "",
    dateTo: "",
    salaryMin: "",
    salaryMax: "",
    sortBy: "newest",
    property_subcategory: initialSub !== "all" && initialCategory === "prona" ? initialSub : "all",
    property_transaction: "all",
    expiry: "active",
  });
  const canImportPosts = user?.role === "admin" || user?.role === "moderator";

  const buildCategoryUrl = (nextFilters) => {
    const category = nextFilters.category || "all";
    if (category === "pune") return "/Pune";
    const params = new URLSearchParams();
    if (category !== "all") params.set("category", category);
    if (nextFilters.job_type && nextFilters.job_type !== "all") params.set("job_type", nextFilters.job_type);
    if (nextFilters.service_field && nextFilters.service_field !== "all") params.set("field", nextFilters.service_field);
    if (nextFilters.sub && nextFilters.sub !== "all") params.set("sub", nextFilters.sub);
    const query = params.toString();
    return `/Feed${query ? `?${query}` : ""}`;
  };

  const updateFilters = (nextFilters) => {
    const previousCategory = filters.category || "all";
    const nextCategory = nextFilters.category || "all";
    const categoryChanged = nextCategory !== previousCategory;

    if (categoryChanged && (fixedCategory || nextCategory === "pune")) {
      window.location.href = buildCategoryUrl(nextFilters);
      return;
    }

    setFilters(nextFilters);
  };

  const { data: jobs = [], isLoading, refetch } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => base44.entities.Job.filter({ status: "approved" }, "-created_date", 200),
  });

  const { data: charityCallsRaw = [] } = useQuery({
    queryKey: ["charityCallsFeed"],
    queryFn: () => base44.entities.CharityProject.filter({ is_charity_call: true, is_active: true }, "-created_date", 50),
  });

  const { data: savedSearches = [] } = useQuery({
    queryKey: ["savedSearches", user?.email],
    queryFn: () => base44.entities.SavedSearch.filter({ user_email: user.email }, "-created_date"),
    enabled: !!user
  });

  const handleRefresh = async () => {
    await refetch();
  };

  const saveSearchMutation = React.useMemo(() => ({
    mutateAsync: async (data) => {
      await base44.entities.SavedSearch.create(data);
    }
  }), []);

  const handleSaveSearch = async () => {
    if (!user) {
      base44.auth.redirectToLogin();
      return;
    }
    if (!searchName.trim()) {
      alert("Ju lutem jepni një emër për kërkimin");
      return;
    }

    await saveSearchMutation.mutateAsync({
      user_email: user.email,
      search_name: searchName,
      filters: {
        category: filters.category !== "all" ? filters.category : null,
        country: filters.country !== "all" ? filters.country : null,
        region: filters.region !== "all" ? filters.region : null,
        city: filters.city || null,
        profession: filters.profession !== "all" ? filters.profession : null,
        contract_type: filters.contractType !== "all" ? filters.contractType : null,
        experience_level: filters.experienceLevel !== "all" ? filters.experienceLevel : null,
        keywords: filters.search || null
      },
      notification_enabled: true
    });

    setShowSaveSearch(false);
    setSearchName("");
    alert("Kërkimi u ruajt me sukses! Do të merrni njoftime kur të postohen njoftime që përputhen.");
  };

  // Merge charity calls into feed when category is "bamiresi" or "all".
  // /Pune uses fixedCategory="pune" and must never show other post categories.
  const allFeedItems = useMemo(() => {
    const visibleJobs = canImportPosts && filters.expiry !== "active" ? jobs : filterActivePosts(jobs);
    if (fixedCategory === "pune") return visibleJobs.filter((job) => job.category === "pune");
    const charityCalls = charityCallsRaw.map(c => ({
      ...c,
      _isCharityCall: true,
      category: "bamiresi",
      status: "approved",
      title: c.title,
      description: c.description,
      job_type: "ofroj",
    }));
    if (filters.category === "bamiresi") return charityCalls;
    if (filters.category === "all") return [...visibleJobs, ...charityCalls];
    return visibleJobs;
  }, [jobs, charityCallsRaw, filters.category, fixedCategory, canImportPosts, filters.expiry]);

  const filteredJobs = useMemo(() => {
    let filtered = allFeedItems.filter(job => {
      if (fixedCategory && job.category !== fixedCategory) return false;
      if (!fixedCategory && filters.category !== "all" && job.category !== filters.category) return false;
      if (filters.profession !== "all" && job.profession !== filters.profession) return false;
      if (canImportPosts && filters.expiry && filters.expiry !== "active") {
        if (filters.expiry === "soon" && !isExpiringSoon(job)) return false;
        if (filters.expiry === "expired" && !isPostExpired(job)) return false;
        if (filters.expiry === "no_expiry" && job.expires_at) return false;
        if (filters.expiry === "renewed" && Number(job.renewal_count || 0) <= 0) return false;
      }

      // Job type filter (ofroj / kerkoj)
      if (filters.job_type && filters.job_type !== "all" && job.job_type !== filters.job_type) return false;

      // Service field filter
      if (filters.service_field && filters.service_field !== "all" && job.service_field !== filters.service_field) return false;

      // Country filter
      if (filters.country && filters.country !== "all" && job.country !== filters.country) return false;

      // Subregion filter (Länder, Kantone, Prefektura etj.)
      if (filters.subregion && filters.subregion !== "all") {
        const sr = filters.subregion.toLowerCase();
        const cityMatch = job.city?.toLowerCase().includes(sr);
        const descMatch = job.description?.toLowerCase().includes(sr);
        if (!cityMatch && !descMatch) return false;
      }

      // Region filter (Antokton)
      if (filters.region && filters.region !== "all") {
        const regionMatch = job.country?.toLowerCase().includes(filters.region.toLowerCase()) || 
                           job.city?.toLowerCase().includes(filters.region.toLowerCase());
        if (!regionMatch) return false;
      }

      // City filter
      if (filters.city && filters.city !== "all") {
        if (job.city !== filters.city && !job.city?.toLowerCase().includes(filters.city.toLowerCase())) return false;
      }
      
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const searchable = `${job.title} ${job.description} ${job.profession || ""} ${job.city || ""} ${job.required_skills || ""}`.toLowerCase();
        if (!searchable.includes(q)) return false;
      }

      // Skills filter
      if (filters.skills) {
        const searchSkills = filters.skills.toLowerCase().split(",").map(s => s.trim());
        const jobSkills = (job.required_skills || "").toLowerCase();
        const hasSkill = searchSkills.some(skill => jobSkills.includes(skill));
        if (!hasSkill) return false;
      }

      // Experience level filter
      if (filters.experienceLevel !== "all" && job.experience_level !== filters.experienceLevel) {
        return false;
      }

      // Contract type filter
      if (filters.contractType !== "all" && job.contract_type !== filters.contractType) {
        return false;
      }

      // Property sub-filters
      if (!fixedCategory && filters.category === "prona") {
        if (filters.property_subcategory && filters.property_subcategory !== "all" && job.property_subcategory !== filters.property_subcategory) return false;
        if (filters.property_transaction && filters.property_transaction !== "all" && job.property_transaction !== filters.property_transaction) return false;
      }

      // Work location filter
      if (filters.workLocation !== "all" && job.work_location !== filters.workLocation) {
        return false;
      }

      // Date range filter
      if (filters.dateFrom) {
        const jobDate = new Date(job.created_date);
        const fromDate = new Date(filters.dateFrom);
        if (jobDate < fromDate) return false;
      }
      if (filters.dateTo) {
        const jobDate = new Date(job.created_date);
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (jobDate > toDate) return false;
      }

      // Salary range filter
      if (job.salary_info && (filters.salaryMin || filters.salaryMax)) {
        const salaryText = job.salary_info.toLowerCase();
        const numbers = salaryText.match(/\d+/g);
        if (numbers && numbers.length > 0) {
          const salaryValue = parseInt(numbers[0]);
          if (filters.salaryMin && salaryValue < parseInt(filters.salaryMin)) return false;
          if (filters.salaryMax && salaryValue > parseInt(filters.salaryMax)) return false;
        }
      }

      return true;
    });

    // Apply sorting
    if (filters.sortBy === "popular") {
      filtered.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
    } else if (filters.sortBy === "discussed") {
      filtered.sort((a, b) => (b.comments_count || 0) - (a.comments_count || 0));
    } else {
      // newest (default)
      filtered.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    }

    return filtered;
  }, [allFeedItems, filters, fixedCategory]);

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="max-w-4xl mx-auto px-3 sm:px-6 py-3 sm:py-4">
      <div className="mb-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg sm:text-2xl font-black text-white tracking-wide uppercase">{fixedCategory === "pune" ? "Punë" : "Njoftime"}</h1>
            <p className="text-white/65 text-xs sm:text-sm">{fixedCategory === "pune" ? "Gjej mundësi pune dhe rekrutime" : "Gjej mundësi pune, shërbime dhe më shumë"}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {canImportPosts && (
              <Button
                onClick={() => window.location.href = createPageUrl("ImportPosts")}
                variant="outline"
                title="Importo njoftim"
                aria-label="Importo njoftim"
                className="border-[#8ab4ff]/30 bg-[#8ab4ff]/10 text-[#8ab4ff] font-bold text-sm h-9 px-3 hover:bg-[#8ab4ff]/20"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                <span className="hidden sm:inline">Importo njoftim</span>
                <span className="sm:hidden">Importo</span>
              </Button>
            )}
            <Button
              onClick={() => window.location.href = createPageUrl("CreatePost")}
              className="bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] font-bold text-sm h-9 px-4 hover:opacity-90 border-0"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              Njofto
            </Button>
          </div>
        </div>
        
        {/* Saved Searches Tags */}
        {savedSearches.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="text-white/60 text-xs">Kërkimet e ruajtura:</span>
            {savedSearches.map((search) => (
              <button
                key={search.id}
                onClick={() => {
                  const f = search.filters;
                  updateFilters({
                    ...filters,
                    category: f.category || "all",
                    country: f.country || "all",
                    region: f.region || "all",
                    city: f.city || "",
                    profession: f.profession || "all",
                    contractType: f.contract_type || "all",
                    experienceLevel: f.experience_level || "all",
                    search: f.keywords || ""
                  });
                }}
                className="px-2.5 py-0.5 rounded-full bg-[#8ab4ff]/20 border border-[#8ab4ff]/30 text-[#8ab4ff] text-xs hover:bg-[#8ab4ff]/30 transition-colors"
              >
                {search.search_name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mb-2">
        <FeedFilters filters={filters} setFilters={updateFilters} />

        {/* Row: Sort + Save Search */}
        <div className="flex gap-2 items-center flex-wrap">
          <Select value={filters.sortBy} onValueChange={(val) => updateFilters({...filters, sortBy: val})}>
            <SelectTrigger className="h-8 w-48 bg-white/10 border-white/20 text-white text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#0b1020] border-white/10 text-white">
              <SelectItem value="newest">Më të rejat</SelectItem>
              <SelectItem value="popular">Më të popullarizuarat</SelectItem>
              <SelectItem value="discussed">Më të diskutuarat</SelectItem>
            </SelectContent>
          </Select>

          {canImportPosts && (
            <Select value={filters.expiry} onValueChange={(val) => updateFilters({...filters, expiry: val})}>
              <SelectTrigger className="h-8 w-52 bg-white/10 border-white/20 text-white text-xs">
                <SelectValue placeholder="Afati" />
              </SelectTrigger>
              <SelectContent className="bg-[#0b1020] border-white/10 text-white">
                <SelectItem value="active">Aktive</SelectItem>
                <SelectItem value="soon">Skadojnë së shpejti</SelectItem>
                <SelectItem value="expired">Të skaduara</SelectItem>
                <SelectItem value="no_expiry">Pa afat</SelectItem>
                <SelectItem value="renewed">Rinovuar</SelectItem>
              </SelectContent>
            </Select>
          )}

          {user && (
            !showSaveSearch ? (
              <Button
                onClick={() => setShowSaveSearch(true)}
                variant="outline"
                size="sm"
                className="border-[#8ab4ff]/30 text-[#8ab4ff] hover:bg-[#8ab4ff]/10 h-8 text-xs"
              >
                <Bookmark className="w-3.5 h-3.5 mr-1.5" />
                Ruaj Kërkimin
              </Button>
            ) : (
              <div className="flex gap-2 p-3 rounded-lg bg-white/5 border border-white/10 flex-1 min-w-0">
                <Input
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  placeholder="Emri i kërkimit (p.sh. 'Pune IT në Gjermani')"
                  className="bg-white/5 border-white/10 text-white text-xs h-8"
                />
                <Button
                  onClick={handleSaveSearch}
                  size="sm"
                  className="bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] h-8 text-xs shrink-0"
                >
                  <Bell className="w-3.5 h-3.5 mr-1" />
                  Ruaj
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSaveSearch(false)}
                  className="border-white/10 text-white h-8 text-xs shrink-0"
                >
                  Anulo
                </Button>
              </div>
            )
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-white/70 animate-spin" />
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="text-center py-20">
          <Inbox className="w-12 h-12 text-white/50 mx-auto mb-4" />
          <p className="text-white/80 font-medium">Nuk u gjetën njoftime</p>
          <p className="text-white/65 text-sm mt-1">Provo të ndryshosh filtrat</p>
          {jobs.length === 0 && (
            <div className="mt-6">
              <p className="text-white font-semibold text-lg mb-3">Bëhu i pari që poston!</p>
              <Button
                onClick={() => window.location.href = createPageUrl("CreatePost")}
                className="bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] hover:opacity-90"
              >
                <Send className="w-4 h-4 mr-2" />
                Posto Njoftim
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {filteredJobs.map((job, i) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, delay: i * 0.02 }}
              >
                <JobCard job={job} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <div className="text-center py-6 text-white/60 text-xs">
        {filteredJobs.length} njoftime
      </div>
      </div>
    </PullToRefresh>
  );
}
