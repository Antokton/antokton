import React, { useState, useEffect } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Search, MapPin, Users, Star, Briefcase, Loader2, Shield, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import { motion } from "framer-motion";

export default function Companies() {
  React.useEffect(() => {
    document.title = 'Kompanitë - Antokton Jobs';
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Zbulo kompanitë që punojnë me shqiptarë dhe shiko rishikimet e punonjësve.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Zbulo kompanitë që punojnë me shqiptarë dhe shiko rishikimet e punonjësve.';
      document.head.appendChild(meta);
    }
  }, []);

  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sizeFilter, setSizeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("rating");

  useEffect(() => {
    const loadUser = async () => {
      const authenticated = await base44.auth.isAuthenticated();
      if (!authenticated) {
        window.location.href = createPageUrl("Home");
        return;
      }
      const me = await base44.auth.me();
      if (me.role !== "admin" && me.role !== "moderator") {
        window.location.href = createPageUrl("Home");
        return;
      }
      setUser(me);
    };
    loadUser();
  }, []);

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const profiles = await base44.entities.CompanyProfile.list("-created_date", 100);
      return profiles;
    }
  });

  const { data: allRatings = [] } = useQuery({
    queryKey: ["companyRatings"],
    queryFn: async () => {
      const allRatings = await base44.entities.CompanyRating.list("-created_date", 500);
      return allRatings.filter(r => r.is_approved);
    }
  });

  const { data: professionalRatings = [] } = useQuery({
    queryKey: ["professionalRatings"],
    queryFn: () => base44.entities.Rating.filter({ rating_type: "professional_inspector" })
  });

  const getCompanyProfessionalRating = (ownerEmail) => {
    const ratings = professionalRatings.filter(r => r.rated_user_email === ownerEmail);
    if (ratings.length === 0) return 0;
    return ratings.reduce((sum, r) => sum + r.professionalism_score, 0) / ratings.length;
  };

  const getCompanySafetyRating = (ownerEmail) => {
    const ratings = professionalRatings.filter(r => r.rated_user_email === ownerEmail);
    if (ratings.length === 0) return 0;
    return ratings.reduce((sum, r) => sum + r.reliability_score, 0) / ratings.length;
  };

  const isHalalCompliant = (ownerEmail) => {
    const halalRatings = professionalRatings.filter(r => r.rated_user_email === ownerEmail && r.rating_type === "halal_compliance");
    return halalRatings.some(r => r.halal_compliant === true);
  };

  let filteredCompanies = companies.filter(company => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        company.company_name?.toLowerCase().includes(query) ||
        company.industry?.toLowerCase().includes(query) ||
        company.headquarters?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Category filter
    if (categoryFilter !== "all") {
      if (!company.service_categories?.includes(categoryFilter)) return false;
    }

    // Size filter
    if (sizeFilter !== "all") {
      if (company.company_size !== sizeFilter) return false;
    }

    return true;
  });

  // Sort companies
  filteredCompanies = filteredCompanies.sort((a, b) => {
    if (sortBy === "rating") {
      const ratingA = getCompanyRating(a.owner_email);
      const ratingB = getCompanyRating(b.owner_email);
      const avgA = ratingA ? parseFloat(ratingA.average) : 0;
      const avgB = ratingB ? parseFloat(ratingB.average) : 0;
      return avgB - avgA;
    } else if (sortBy === "professional") {
      return getCompanyProfessionalRating(b.owner_email) - getCompanyProfessionalRating(a.owner_email);
    } else if (sortBy === "safety") {
      return getCompanySafetyRating(b.owner_email) - getCompanySafetyRating(a.owner_email);
    } else if (sortBy === "size") {
      const sizeOrder = { "1-10": 1, "11-50": 2, "51-200": 3, "201-500": 4, "500+": 5 };
      return (sizeOrder[b.company_size] || 0) - (sizeOrder[a.company_size] || 0);
    }
    return 0;
  });

  const getCompanyRating = (ownerEmail) => {
    const ratings = allRatings.filter(r => r.company_id === ownerEmail);
    if (ratings.length === 0) return null;
    const avg = ratings.reduce((sum, r) => sum + r.overall_rating, 0) / ratings.length;
    return { average: avg.toFixed(1), count: ratings.length };
  };

  if (!user || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-white/30 animate-spin" />
      </div>
    );
  }

  const serviceCategories = [
    { value: "all", label: "Të gjitha kategoritë" },
    { value: "pune", label: "Punë" },
    { value: "shtepi", label: "Shtëpi" },
    { value: "juridike", label: "Juridike" },
    { value: "edukim", label: "Edukim" },
    { value: "bamiresi", label: "Bamirësi" },
    { value: "media", label: "Media" },
    { value: "sherbime", label: "Shërbime" },
    { value: "teknologji", label: "Teknologji" },
    { value: "shendetsore", label: "Shëndetësore" },
    { value: "ushqimore", label: "Ushqimore" },
    { value: "ndertim", label: "Ndërtim" },
    { value: "transport", label: "Transport" },
    { value: "financiare", label: "Financiare" }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Kompanitë</h1>
        <p className="text-white/50">Menaxho dhe eksploro kompanitë e regjistruara</p>
      </div>

      {/* Filters */}
      <Card className="bg-white/5 border-white/10 mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Kërko kompani..."
                className="pl-9 bg-white/5 border-white/10 text-white"
              />
            </div>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Kategoria" />
              </SelectTrigger>
              <SelectContent>
                {serviceCategories.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sizeFilter} onValueChange={setSizeFilter}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Madhësia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Të gjitha madhësitë</SelectItem>
                <SelectItem value="1-10">1-10 punonjës</SelectItem>
                <SelectItem value="11-50">11-50 punonjës</SelectItem>
                <SelectItem value="51-200">51-200 punonjës</SelectItem>
                <SelectItem value="201-500">201-500 punonjës</SelectItem>
                <SelectItem value="500+">500+ punonjës</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Rendit sipas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rating">Rating i përgjithshëm</SelectItem>
                <SelectItem value="professional">Rating profesional</SelectItem>
                <SelectItem value="safety">Rating sigurie</SelectItem>
                <SelectItem value="size">Madhësia</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {filteredCompanies.length === 0 ? (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-12 text-center">
            <Building2 className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Nuk u gjetën kompani</h3>
            <p className="text-white/50">Provo të ndryshosh termin e kërkimit</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCompanies.map((company, i) => {
            const rating = getCompanyRating(company.owner_email);
            return (
              <motion.div
                key={company.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link to={`${createPageUrl("CompanyDetail")}?slug=${company.slug || company.id}`}>
                  <Card className="bg-white/5 border-white/10 hover:bg-white/8 transition-all duration-300 h-full group cursor-pointer">
                    <CardContent className="p-0">
                      {company.cover_image_url && (
                        <div 
                          className="h-32 bg-cover bg-center rounded-t-xl"
                          style={{ backgroundImage: `url(${company.cover_image_url})` }}
                        />
                      )}
                      <div className="p-6">
                        <div className="flex items-start gap-4 mb-4">
                          {company.logo_url ? (
                            <img 
                              src={company.logo_url} 
                              alt={company.company_name}
                              className="w-16 h-16 rounded-lg object-cover border border-white/10"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-[#8ab4ff] to-[#9bffd6] flex items-center justify-center">
                              <Building2 className="w-8 h-8 text-[#0b1020]" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-white text-lg mb-1 group-hover:text-[#8ab4ff] transition-colors truncate">
                              {company.company_name}
                            </h3>
                            {company.industry && (
                              <p className="text-white/60 text-sm">{company.industry}</p>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2 mb-3">
                          {rating && (
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                <span className="text-white font-semibold">{rating.average}</span>
                              </div>
                              <span className="text-white/40 text-sm">({rating.count})</span>
                            </div>
                          )}

                          <div className="flex items-center gap-2 text-xs">
                            {getCompanyProfessionalRating(company.owner_email) > 0 && (
                              <Badge variant="outline" className="border-blue-400/30 text-blue-400 bg-blue-400/10">
                                Prof: {getCompanyProfessionalRating(company.owner_email).toFixed(1)}
                              </Badge>
                            )}
                            {getCompanySafetyRating(company.owner_email) > 0 && (
                              <Badge variant="outline" className="border-green-400/30 text-green-400 bg-green-400/10">
                                <Shield className="w-3 h-3 mr-1" />
                                {getCompanySafetyRating(company.owner_email).toFixed(1)}
                              </Badge>
                            )}
                            {isHalalCompliant(company.owner_email) && (
                              <Badge variant="outline" className="border-emerald-400/30 text-emerald-400 bg-emerald-400/10">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Halal
                              </Badge>
                            )}
                          </div>
                        </div>

                        {company.description && (
                          <p className="text-white/60 text-sm mb-4 line-clamp-2">
                            {company.description}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-2">
                          {company.company_size && (
                            <Badge variant="outline" className="border-white/20 text-white/60 text-xs">
                              <Users className="w-3 h-3 mr-1" />
                              {company.company_size}
                            </Badge>
                          )}
                          {company.headquarters && (
                            <Badge variant="outline" className="border-white/20 text-white/60 text-xs">
                              <MapPin className="w-3 h-3 mr-1" />
                              {company.headquarters}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}