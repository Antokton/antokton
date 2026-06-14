import React, { useState, useEffect } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Briefcase, User, Calendar, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";

export default function Recommendations() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const authenticated = await base44.auth.isAuthenticated();
      if (authenticated) {
        const me = await base44.auth.me();
        setUser(me);
      } else {
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, []);

  const { data: recommendations, isLoading } = useQuery({
    queryKey: ['recommendations', user?.email],
    queryFn: async () => {
      const response = await base44.functions.invoke('getRecommendations', {});
      return response.data;
    },
    enabled: !!user
  });

  if (!user || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[#0b1020]" />
            </div>
            <h1 className="text-3xl font-bold text-white">Rekomandimet për ju</h1>
          </div>
          <p className="text-white/60">Bazuar në aktivitetin dhe interesat tuaja</p>
        </div>

        {/* Insights */}
        {recommendations?.insights && (
          <Card className="mb-6 bg-white/5 border-white/10">
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
          <div className="mb-8">
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
          <div className="mb-8">
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
          <div className="mb-8">
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
    </div>
  );
}
