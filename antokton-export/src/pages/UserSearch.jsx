import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Loader2, MapPin, Briefcase, Linkedin, Facebook, Instagram, Globe, Sparkles, Calendar, User, TrendingUp, ChevronDown, ChevronUp, Award } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import { isCertifiedUser } from "@/lib/akademia";

export default function UserSearch() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAISearch, setShowAISearch] = useState(false);
  const [user, setUser] = useState(null);
  const [certifiedOnly, setCertifiedOnly] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const authenticated = await base44.auth.isAuthenticated();
      if (authenticated) {
        const me = await base44.auth.me();
        setUser(me);
      }
    };
    loadUser();
  }, []);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["allUsers"],
    queryFn: () => base44.entities.User.list("-created_date", 500)
  });

  const { data: academyCertificates = [] } = useQuery({
    queryKey: ["academyCertificatesSearch"],
    queryFn: () => base44.entities.AkademiaCertificate.list("-issue_date", 1000)
  });

  const { data: recommendations, isLoading: isLoadingRecs } = useQuery({
    queryKey: ['recommendations', user?.email],
    queryFn: async () => {
      const response = await base44.functions.invoke('getRecommendations', {});
      return response.data;
    },
    enabled: !!user && showAISearch
  });

  const canUseCertifiedFilter = user?.role === "admin" || user?.user_type === "employer" || user?.user_type === "recruiter";

  const certifiedUsers = useMemo(
    () => users.filter(profile => isCertifiedUser(profile, academyCertificates)).length,
    [users, academyCertificates]
  );

  const filteredUsers = users.filter(profile => {
    const certified = isCertifiedUser(profile, academyCertificates);
    if (certifiedOnly && !certified) return false;
    if (!searchTerm.trim()) return certifiedOnly;
    
    const search = searchTerm.toLowerCase();
    const fullName = `${profile.first_name || ""} ${profile.surname || ""}`.toLowerCase();
    const skills = (profile.skills || "").toLowerCase();
    const jobTitle = (profile.job_title || "").toLowerCase();
    const jobDesc = (profile.job_description || "").toLowerCase();
    const bio = (profile.bio || "").toLowerCase();
    
    return fullName.includes(search) ||
           skills.includes(search) ||
           jobTitle.includes(search) ||
           jobDesc.includes(search) ||
           bio.includes(search);
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
          Kërko profesionistë
        </h1>
        <p className="text-white/50">
          Gjej ekspertë bazuar në aftësi, përvojë dhe profil profesional
        </p>
      </div>

      <Card className="bg-white/5 border-white/10 mb-4">
        <CardContent className="p-6">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Kërko sipas emrit, aftësive, titullit të punës..."
                className="pl-12 h-12 bg-white/5 border-white/10 text-white"
                onKeyPress={(e) => e.key === "Enter" && setSearchTerm(searchTerm)}
              />
            </div>
            <button
              onClick={() => setSearchTerm(searchTerm)}
              className="h-12 w-12 rounded-lg bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] font-semibold hover:opacity-90 transition-opacity flex items-center justify-center"
              aria-label="Kërko"
              title="Kërko"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </CardContent>
      </Card>

      {canUseCertifiedFilter && (
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#9bffd6]/15 flex items-center justify-center">
              <Award className="w-5 h-5 text-[#9bffd6]" />
            </div>
            <div>
              <p className="text-white font-semibold">Kandidate te certifikuar</p>
              <p className="text-white/50 text-sm">{certifiedUsers} profile me certifikate nga Akademia Antokton</p>
            </div>
          </div>
          <button
            onClick={() => setCertifiedOnly(!certifiedOnly)}
            className={`px-4 h-10 rounded-lg border text-sm font-semibold transition-all ${certifiedOnly ? "bg-[#9bffd6] text-[#0b1020] border-[#9bffd6]" : "bg-white/5 text-white border-white/15 hover:bg-white/10"}`}
          >
            {certifiedOnly ? "Shfaq te gjithe" : "Vetem te certifikuar"}
          </button>
        </div>
      )}

      {user && (
        <button
          onClick={() => setShowAISearch(!showAISearch)}
          className="w-full mb-8 p-4 rounded-xl bg-gradient-to-r from-[#8ab4ff]/10 to-[#9bffd6]/10 border border-[#8ab4ff]/30 hover:border-[#8ab4ff]/50 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[#0b1020]" />
            </div>
            <div className="text-left">
              <p className="text-white font-semibold">Kërkim më i thellë me AI</p>
              <p className="text-white/50 text-sm">Rekomandime të personalizuara bazuar në aktivitetin tuaj</p>
            </div>
          </div>
          {showAISearch ? (
            <ChevronUp className="w-5 h-5 text-white/40 group-hover:text-white/60 transition-colors" />
          ) : (
            <ChevronDown className="w-5 h-5 text-white/40 group-hover:text-white/60 transition-colors" />
          )}
        </button>
      )}

      <AnimatePresence>
        {showAISearch && user && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-8"
          >
            {isLoadingRecs ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-white/30 animate-spin" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Insights */}
                {recommendations?.insights && (
                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-white">
                        <TrendingUp className="w-5 h-5" />
                        Interesat tuaja
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {recommendations.insights.topCategory && (
                          <div>
                            <p className="text-white/40 text-xs mb-1">Kategoria më e kërkuar</p>
                            <p className="text-white font-semibold">{recommendations.insights.topCategory}</p>
                          </div>
                        )}
                        {recommendations.insights.topCountry && (
                          <div>
                            <p className="text-white/40 text-xs mb-1">Vendi më i kërkuar</p>
                            <p className="text-white font-semibold">{recommendations.insights.topCountry}</p>
                          </div>
                        )}
                        {recommendations.insights.topProfession && (
                          <div>
                            <p className="text-white/40 text-xs mb-1">Profesioni më i kërkuar</p>
                            <p className="text-white font-semibold">{recommendations.insights.topProfession}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Recommended Jobs */}
                {recommendations?.recommendedJobs?.length > 0 && (
                  <div>
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <Briefcase className="w-5 h-5" />
                      Njoftime për ju
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {recommendations.recommendedJobs.map(job => (
                        <Link key={job.id} to={createPageUrl("PostDetail") + `?id=${job.id}`}>
                          <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-all cursor-pointer">
                            <CardContent className="p-4">
                              <h3 className="text-white font-semibold mb-2">{job.title}</h3>
                              <p className="text-white/60 text-sm mb-2 line-clamp-2">{job.description}</p>
                              <div className="flex items-center gap-2 text-xs text-white/40">
                                <span>{job.country}</span>
                                {job.city && <span>• {job.city}</span>}
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommended Profiles */}
                {recommendations?.recommendedProfiles?.length > 0 && (
                  <div>
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Profile të ngjashme
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {recommendations.recommendedProfiles.map(profile => (
                        <Link key={profile.id} to={createPageUrl("Profile") + `?email=${profile.email}`}>
                          <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-all cursor-pointer">
                            <CardContent className="p-4">
                              <h3 className="text-white font-semibold mb-1">{profile.full_name}</h3>
                              {profile.job_title && <p className="text-white/60 text-sm mb-2">{profile.job_title}</p>}
                              {profile.skills && (
                                <div className="flex flex-wrap gap-1">
                                  {profile.skills.split(',').slice(0, 3).map((skill, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-white/10 text-white/70 text-xs rounded">
                                      {skill.trim()}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommended Events */}
                {recommendations?.recommendedEvents?.length > 0 && (
                  <div>
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Ngjarje për ju
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {recommendations.recommendedEvents.map(event => (
                        <Link key={event.id} to={createPageUrl("EventDetail") + `?id=${event.id}`}>
                          <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-all cursor-pointer">
                            <CardContent className="p-4">
                              <h3 className="text-white font-semibold mb-2">{event.title}</h3>
                              <p className="text-white/60 text-sm mb-2 line-clamp-2">{event.description}</p>
                              <div className="flex items-center gap-2 text-xs text-white/40">
                                <Calendar className="w-3 h-3" />
                                <span>{new Date(event.event_date).toLocaleDateString('sq')}</span>
                                {event.location && <span>• {event.location}</span>}
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {recommendations && 
                 !recommendations.recommendedJobs?.length && 
                 !recommendations.recommendedProfiles?.length && 
                 !recommendations.recommendedEvents?.length && (
                  <Card className="bg-white/5 border-white/10">
                    <CardContent className="p-8 text-center">
                      <Sparkles className="w-12 h-12 text-white/40 mx-auto mb-4" />
                      <h3 className="text-white font-semibold mb-2">Nuk ka rekomandime ende</h3>
                      <p className="text-white/60 text-sm">
                        Filloni të eksploroni njoftime, profile dhe ngjarje për të marrë rekomandime të personalizuara!
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-white/30 animate-spin" />
        </div>
      ) : searchTerm.trim() === "" && !certifiedOnly ? (
        <div className="text-center py-20">
          <Search className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/40">Filloni të shkruani për të kërkuar profesionistë</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-white/40">Nuk u gjet asnjë rezultat</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredUsers.map((user, i) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="bg-white/5 border-white/10 hover:bg-white/8 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#8ab4ff] to-[#9bffd6] flex items-center justify-center shrink-0">
                      <span className="text-[#0b1020] text-xl font-bold">
                        {(user.first_name || user.email || "U")[0].toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-white">
                          {user.first_name && user.surname 
                            ? `${user.first_name} ${user.surname}`
                            : user.first_name || user.full_name || user.email}
                        </h3>
                        {isCertifiedUser(user, academyCertificates) && (
                          <Badge className="bg-[#9bffd6]/15 text-[#9bffd6] border-[#9bffd6]/30">
                            <Award className="w-3 h-3 mr-1" />
                            I certifikuar
                          </Badge>
                        )}
                      </div>
                      
                      {user.job_title && (
                        <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
                          <Briefcase className="w-4 h-4" />
                          {user.job_title}
                        </div>
                      )}

                      {user.birthplace && (
                        <div className="flex items-center gap-2 text-white/50 text-sm mb-3">
                          <MapPin className="w-4 h-4" />
                          {user.birthplace}
                        </div>
                      )}

                      {user.bio && (
                        <p className="text-white/60 text-sm mb-3 line-clamp-2">
                          {user.bio}
                        </p>
                      )}

                      {user.skills && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {user.skills.split(",").slice(0, 5).map((skill, idx) => (
                            <Badge key={idx} className="bg-[#8ab4ff]/20 text-[#8ab4ff] border-[#8ab4ff]/30">
                              {skill.trim()}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-3">
                        {user.linkedin_url && (
                          <a
                            href={user.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white/40 hover:text-[#8ab4ff] transition-colors"
                          >
                            <Linkedin className="w-5 h-5" />
                          </a>
                        )}
                        {user.facebook_url && (
                          <a
                            href={user.facebook_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white/40 hover:text-[#8ab4ff] transition-colors"
                          >
                            <Facebook className="w-5 h-5" />
                          </a>
                        )}
                        {user.instagram_url && (
                          <a
                            href={user.instagram_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white/40 hover:text-[#8ab4ff] transition-colors"
                          >
                            <Instagram className="w-5 h-5" />
                          </a>
                        )}
                        {user.website_url && (
                          <a
                            href={user.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white/40 hover:text-[#8ab4ff] transition-colors"
                          >
                            <Globe className="w-5 h-5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
