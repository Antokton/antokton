import React, { useEffect, useState } from "react";
import { base44 } from "@/api/antoktonClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, MapPin, TrendingUp, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../../utils";

export default function JobRecommendations() {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadRecommendations = async () => {
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('getJobRecommendations', {});
      
      if (data.success) {
        setRecommendations(data.recommendations);
      }
    } catch (error) {
      console.error('Error loading recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecommendations();
  }, []);

  if (loading) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-6 text-center">
          <Sparkles className="w-12 h-12 text-white/20 mx-auto mb-3" />
          <p className="text-white/60">Nuk ka rekomandime të disponueshme aktualisht</p>
          <p className="text-white/40 text-sm mt-2">Plotëso profilin tënd për rekomandime më të mira</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold text-lg flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#8ab4ff]" />
          Punë të rekomanduara për ty
        </h3>
        <Button
          onClick={loadRecommendations}
          variant="outline"
          size="sm"
          className="border-white/10"
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          Rifresko
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {recommendations.map(job => (
          <Card key={job.id} className="bg-white/5 border-white/10 hover:border-[#8ab4ff]/30 transition-all">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <Link 
                    to={createPageUrl("PostDetail") + `?id=${job.id}`}
                    className="text-white font-semibold hover:text-[#8ab4ff] transition-colors"
                  >
                    {job.title}
                  </Link>
                  <div className="flex items-center gap-2 mt-1 text-white/60 text-sm">
                    <MapPin className="w-3 h-3" />
                    {job.city}, {job.country}
                  </div>
                </div>
                <Badge className="bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020]">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {job.match_score}% match
                </Badge>
              </div>

              <p className="text-white/70 text-sm mb-3 line-clamp-2">
                {job.description}
              </p>

              {job.match_reason && (
                <div className="flex items-start gap-2 p-2 bg-[#8ab4ff]/10 rounded-lg mb-3">
                  <Sparkles className="w-4 h-4 text-[#8ab4ff] flex-shrink-0 mt-0.5" />
                  <p className="text-[#8ab4ff] text-xs">{job.match_reason}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-white/60">
                  {job.category}
                </Badge>
                {job.experience_level && (
                  <Badge variant="outline" className="text-white/60">
                    {job.experience_level}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}