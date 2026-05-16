import React, { useState, useEffect } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, CheckCircle2, Zap, Loader2, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ContentModeration() {
  const [user, setUser] = useState(null);
  const [selectedModeration, setSelectedModeration] = useState(null);
  const [adminNotes, setAdminNotes] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkAuth = async () => {
      const authenticated = await base44.auth.isAuthenticated();
      if (authenticated) {
        const me = await base44.auth.me();
        if (me?.role !== 'admin' && me?.role !== 'moderator') {
          window.location.href = '/';
        }
        setUser(me);
      } else {
        window.location.href = '/';
      }
    };
    checkAuth();
  }, []);

  const { data: moderations = [] } = useQuery({
    queryKey: ["moderations"],
    queryFn: () => base44.entities.ContentModeration?.list?.("-created_date", 200) || Promise.resolve([]),
    enabled: !!user
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, decision, notes }) =>
      base44.asServiceRole.entities.ContentModeration.update(id, {
        admin_decision: decision,
        admin_notes: notes,
        reviewed_by: user.email,
        reviewed_at: new Date().toISOString()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["moderations"] });
      setSelectedModeration(null);
      setAdminNotes("");
    }
  });

  const handleReview = (decision) => {
    if (selectedModeration) {
      reviewMutation.mutate({
        id: selectedModeration.id,
        decision,
        notes: adminNotes
      });
    }
  };

  const pendingModerations = moderations.filter(m => m.admin_decision === 'pending');
  const flaggedModerations = moderations.filter(m => m.ai_flag_status === 'flagged');
  const rejectedModerations = moderations.filter(m => m.ai_flag_status === 'rejected');

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high':
        return 'bg-red-500/20 text-red-400';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'low':
        return 'bg-blue-500/20 text-blue-400';
      default:
        return 'bg-green-500/20 text-green-400';
    }
  };

  if (!user?.role?.includes('admin') && user?.role !== 'moderator') {
    return <div className="text-center py-20 text-white">Nuk keni akses</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
          <Shield className="w-8 h-8" />
          Moderimi i Përmbajtjes
        </h1>
        <p className="text-white/50 mt-1">Shqyrtoni vendimin e AI dhe miratoni ose refuzoni përmbajtjen</p>
      </div>

      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList className="bg-white/5 border-white/10">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Në Pritje ({pendingModerations.length})
          </TabsTrigger>
          <TabsTrigger value="flagged" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Flamurisur ({flaggedModerations.length})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Refuzuar ({rejectedModerations.length})
          </TabsTrigger>
        </TabsList>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Moderation List */}
          <div className="lg:col-span-1">
            <Card className="bg-white/5 border-white/10 h-[600px] overflow-y-auto">
              <CardHeader>
                <CardTitle className="text-white text-lg">Përmbajtje</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <TabsContent value="pending" className="space-y-2 m-0">
                  {pendingModerations.map(m => (
                    <motion.button
                      key={m.id}
                      onClick={() => setSelectedModeration(m)}
                      className={`w-full text-left p-3 rounded-lg transition-all border ${
                        selectedModeration?.id === m.id
                          ? 'bg-white/10 border-white/20'
                          : 'hover:bg-white/5 border-white/10'
                      }`}
                    >
                      <div className="text-white/80 text-sm font-medium truncate">
                        {m.content_type === 'job_posting' ? '💼 Njoftim Pune' : '⭐ Rishikim'}
                      </div>
                      <Badge className="mt-1 text-xs bg-yellow-500/20 text-yellow-400">
                        Në pritje
                      </Badge>
                    </motion.button>
                  ))}
                </TabsContent>

                <TabsContent value="flagged" className="space-y-2 m-0">
                  {flaggedModerations.map(m => (
                    <motion.button
                      key={m.id}
                      onClick={() => setSelectedModeration(m)}
                      className={`w-full text-left p-3 rounded-lg transition-all border ${
                        selectedModeration?.id === m.id
                          ? 'bg-white/10 border-white/20'
                          : 'hover:bg-white/5 border-white/10'
                      }`}
                    >
                      <div className="text-white/80 text-sm font-medium truncate">
                        {m.content_type === 'job_posting' ? '💼 Njoftim Pune' : '⭐ Rishikim'}
                      </div>
                      <Badge className="mt-1 text-xs bg-orange-500/20 text-orange-400">
                        Flamurisur
                      </Badge>
                    </motion.button>
                  ))}
                </TabsContent>

                <TabsContent value="rejected" className="space-y-2 m-0">
                  {rejectedModerations.map(m => (
                    <motion.button
                      key={m.id}
                      onClick={() => setSelectedModeration(m)}
                      className={`w-full text-left p-3 rounded-lg transition-all border ${
                        selectedModeration?.id === m.id
                          ? 'bg-white/10 border-white/20'
                          : 'hover:bg-white/5 border-white/10'
                      }`}
                    >
                      <div className="text-white/80 text-sm font-medium truncate">
                        {m.content_type === 'job_posting' ? '💼 Njoftim Pune' : '⭐ Rishikim'}
                      </div>
                      <Badge className="mt-1 text-xs bg-red-500/20 text-red-400">
                        Refuzuar
                      </Badge>
                    </motion.button>
                  ))}
                </TabsContent>
              </CardContent>
            </Card>
          </div>

          {/* Moderation Details */}
          {selectedModeration && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2 space-y-6">
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex justify-between items-center">
                    <span>Përmbajtja</span>
                    <Badge className={getSeverityColor(selectedModeration.ai_violation_reasons?.length > 0 ? 'high' : 'low')}>
                      AI Flagged
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-white/40 text-xs">Lloji</label>
                    <div className="text-white mt-1">
                      {selectedModeration.content_type === 'job_posting' ? 'Njoftim Pune' : 'Rishikim Kompanie'}
                    </div>
                  </div>

                  <div>
                    <label className="text-white/40 text-xs">Përmbajtja</label>
                    <div className="mt-1 p-3 bg-white/5 rounded-lg border border-white/10 max-h-[200px] overflow-y-auto">
                      <p className="text-white text-sm">{selectedModeration.content_text}</p>
                    </div>
                  </div>

                  <div className="border-t border-white/10 pt-4">
                    <h4 className="text-white font-semibold mb-3">Analiza e AI</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-white/40 text-xs">Shkaku i Flamurit</label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {selectedModeration.ai_violation_reasons?.length > 0 ? (
                            selectedModeration.ai_violation_reasons.map((reason, i) => (
                              <Badge key={i} className="bg-red-500/20 text-red-400">
                                {reason}
                              </Badge>
                            ))
                          ) : (
                            <Badge className="bg-green-500/20 text-green-400">Asnjë shkak</Badge>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="text-white/40 text-xs">Sigurimi i AI</label>
                        <div className="text-white mt-1 font-semibold">
                          {selectedModeration.ai_confidence}%
                        </div>
                      </div>

                      <div>
                        <label className="text-white/40 text-xs">Statusi i AI</label>
                        <Badge className={`mt-1 ${
                          selectedModeration.ai_flag_status === 'approved' ? 'bg-green-500/20 text-green-400' :
                          selectedModeration.ai_flag_status === 'flagged' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {selectedModeration.ai_flag_status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {selectedModeration.admin_decision === 'pending' && (
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">Vendimi i Adminit</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-white/40 text-xs mb-2 block">Shënimet</label>
                      <Textarea
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        placeholder="Shkruani shënimet e juaja..."
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>

                    <div className="flex gap-3">
                      <Button
                        onClick={() => handleReview('approved')}
                        disabled={reviewMutation.isPending}
                        className="flex-1 bg-green-500/20 text-green-400 hover:bg-green-500/30"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Aprovo
                      </Button>
                      <Button
                        onClick={() => handleReview('rejected')}
                        disabled={reviewMutation.isPending}
                        className="flex-1 bg-red-500/20 text-red-400 hover:bg-red-500/30"
                      >
                        <AlertCircle className="w-4 h-4 mr-2" />
                        Refuzo
                      </Button>
                      <Button
                        onClick={() => handleReview('override_approved')}
                        disabled={reviewMutation.isPending}
                        className="flex-1 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                      >
                        Tejkalim
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}
        </div>
      </Tabs>
    </div>
  );
}