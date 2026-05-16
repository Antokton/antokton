import React, { useState, useEffect } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, ThumbsDown, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import toast from "react-hot-toast";

export default function JobMatches() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const me = await base44.auth.me();
      setUser(me);
    };
    loadUser();
  }, []);

  const { data: matches = [], isLoading } = useQuery({
    queryKey: ["jobMatches", user?.email],
    queryFn: () => base44.entities.JobMatch.filter({ 
      user_email: user.email,
      is_dismissed: false
    }, "-match_score"),
    enabled: !!user
  });

  const dismissMutation = useMutation({
    mutationFn: (matchId) => base44.entities.JobMatch.update(matchId, { is_dismissed: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobMatches"] });
      toast.success("Puna u largua nga lista");
    }
  });

  const handleRunMatching = async () => {
    setLoading(true);
    try {
      await base44.functions.invoke('aiJobMatching', {});
      queryClient.invalidateQueries({ queryKey: ["jobMatches"] });
      toast.success("Përputhjet u përditësuan!");
    } catch (error) {
      toast.error("Gabim: " + error.message);
    }
    setLoading(false);
  };

  if (!user || isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-[#8ab4ff]" />
            Punët e përshtatshme
          </h1>
          <p className="text-white/50 mt-1">AI gjeti këto punë që përputhen me profilin tënd</p>
        </div>
        <Button
          onClick={handleRunMatching}
          disabled={loading}
          className="bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] font-semibold"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
          Përditëso
        </Button>
      </div>

      {matches.length === 0 ? (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-12 text-center">
            <Sparkles className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/50 mb-4">Nuk ka përputhje ende</p>
            <Button onClick={handleRunMatching} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Kërko punë të përshtatshme
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {matches.map((match) => (
            <Card key={match.id} className="bg-white/5 border-white/10 hover:bg-white/8 transition-all">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Link 
                        to={createPageUrl(`PostDetail?jobId=${match.job_id}`)}
                        className="text-white font-semibold text-lg hover:text-[#8ab4ff] transition-colors"
                      >
                        Job #{match.job_id.slice(0, 8)}
                      </Link>
                      <Badge 
                        className="font-semibold"
                        style={{
                          background: match.match_score > 80 ? 'rgba(34,197,94,0.2)' : 
                                     match.match_score > 60 ? 'rgba(59,130,246,0.2)' : 'rgba(251,191,36,0.2)',
                          color: match.match_score > 80 ? '#22c55e' : 
                                 match.match_score > 60 ? '#3b82f6' : '#fbbf24',
                          border: `1px solid ${match.match_score > 80 ? 'rgba(34,197,94,0.3)' : 
                                               match.match_score > 60 ? 'rgba(59,130,246,0.3)' : 'rgba(251,191,36,0.3)'}`
                        }}
                      >
                        {match.match_score}% përputhje
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 mt-3">
                      <p className="text-white/60 text-sm font-medium">Arsyet e përputhjes:</p>
                      <ul className="space-y-1">
                        {match.match_reasons?.map((reason, i) => (
                          <li key={i} className="text-white/70 text-sm flex items-start gap-2">
                            <span className="text-[#8ab4ff] mt-1">•</span>
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Link to={createPageUrl(`PostDetail?jobId=${match.job_id}`)}>
                      <Button size="sm" className="bg-[#8ab4ff] hover:bg-[#7aa3ef] text-[#0b1020]">
                        <Eye className="w-4 h-4 mr-1" />
                        Shiko
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/10 text-white/60 hover:text-red-400 hover:border-red-400/30"
                      onClick={() => dismissMutation.mutate(match.id)}
                    >
                      <ThumbsDown className="w-4 h-4 mr-1" />
                      Largo
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}