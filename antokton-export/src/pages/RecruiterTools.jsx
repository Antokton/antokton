import React, { useState, useEffect } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, Trash2, FileQuestion, Sparkles, TrendingUp, X, BarChart3 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

export default function RecruiterTools() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showQuestionnaireForm, setShowQuestionnaireForm] = useState(false);
  const [rankingResults, setRankingResults] = useState(null);
  const [rankingJobId, setRankingJobId] = useState(null);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [analyzingQuestionnaire, setAnalyzingQuestionnaire] = useState(null);
  const queryClient = useQueryClient();

  const [questionnaireForm, setQuestionnaireForm] = useState({
    title: "",
    questions: [{ question: "", type: "text", options: [] }]
  });

  useEffect(() => {
    const loadUser = async () => {
      const authenticated = await base44.auth.isAuthenticated();
      if (!authenticated) {
        base44.auth.redirectToLogin();
        return;
      }
      const me = await base44.auth.me();
      if (me.user_type !== "employer" && me.user_type !== "recruiter" && me.role !== "admin") {
        window.location.href = "/";
        return;
      }
      setUser(me);
      setLoading(false);
    };
    loadUser();
  }, []);

  const { data: myJobs = [] } = useQuery({
    queryKey: ["myJobs", user?.email],
    queryFn: () => base44.entities.Job.filter({ created_by: user.email }),
    enabled: !!user
  });

  const { data: questionnaires = [] } = useQuery({
    queryKey: ["questionnaires"],
    queryFn: () => base44.entities.Questionnaire.list("-created_date", 100),
    enabled: !!user
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["jobTemplates"],
    queryFn: () => base44.entities.JobTemplate.filter({ created_by: user?.email }),
    enabled: !!user
  });

  const createQuestionnaireMutation = useMutation({
    mutationFn: (data) => base44.entities.Questionnaire.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questionnaires"] });
      setShowQuestionnaireForm(false);
      setQuestionnaireForm({ title: "", questions: [{ question: "", type: "text", options: [] }] });
    }
  });

  const deleteQuestionnaireMutation = useMutation({
    mutationFn: (id) => base44.entities.Questionnaire.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questionnaires"] });
    }
  });

  const rankApplicationsMutation = useMutation({
    mutationFn: async (jobId) => {
      const { data } = await base44.functions.invoke("rankApplications", { jobId });
      return data;
    },
    onSuccess: (data) => {
      setRankingResults(data);
    }
  });

  const handleAddQuestion = () => {
    setQuestionnaireForm({
      ...questionnaireForm,
      questions: [...questionnaireForm.questions, { question: "", type: "text", options: [] }]
    });
  };

  const handleRemoveQuestion = (index) => {
    const newQuestions = questionnaireForm.questions.filter((_, i) => i !== index);
    setQuestionnaireForm({ ...questionnaireForm, questions: newQuestions });
  };

  const handleQuestionChange = (index, field, value) => {
    const newQuestions = [...questionnaireForm.questions];
    newQuestions[index][field] = value;
    setQuestionnaireForm({ ...questionnaireForm, questions: newQuestions });
  };

  const handleSubmitQuestionnaire = () => {
    if (!selectedJob || !questionnaireForm.title.trim()) return;
    
    createQuestionnaireMutation.mutate({
      job_id: selectedJob,
      title: questionnaireForm.title,
      questions: questionnaireForm.questions.filter(q => q.question.trim())
    });
  };

  const handleRankApplications = (jobId) => {
    setRankingJobId(jobId);
    rankApplicationsMutation.mutate(jobId);
  };

  const handleAnalyzeQuestionnaire = async (questionnaireId) => {
    setAnalyzingQuestionnaire(questionnaireId);
    try {
      const { data } = await base44.functions.invoke("analyzeQuestionnaireResponses", { 
        questionnaireId 
      });
      setAnalysisResults(data);
      toast.success("Analiza u krye me sukses!");
    } catch (error) {
      toast.error("Gabim në analizë: " + error.message);
    }
    setAnalyzingQuestionnaire(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-white/30 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight">Mjetet e rekrutimit</h1>
        <p className="text-white/50 mt-1">Menaxho pyetësorët dhe përdor AI për të analizuar kandidatët</p>
      </div>

      <Tabs defaultValue="ranking" className="space-y-6">
        <TabsList className="bg-white/10 border border-white/20">
          <TabsTrigger value="ranking" className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white">Renditje AI</TabsTrigger>
          <TabsTrigger value="questionnaires" className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white">Pyetësorët</TabsTrigger>
        </TabsList>

        {/* AI Ranking */}
        <TabsContent value="ranking">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#8ab4ff]" />
                Renditje automatike e kandidatëve
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-white/70 text-sm">Zgjidh pozicionin</label>
                <Select onValueChange={(val) => handleRankApplications(val)}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Zgjidh një pozicion..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0b1020] border-white/20">
                    {myJobs.map(job => (
                      <SelectItem key={job.id} value={job.id} className="text-white">{job.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {rankApplicationsMutation.isPending && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-white/30 animate-spin" />
                  <span className="ml-3 text-white/60">Po analizon kandidatët...</span>
                </div>
              )}

              {rankingResults && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-semibold">Rezultatet</h3>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setRankingResults(null)}
                      className="text-white/40 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  {rankingResults.rankings?.map((rank, i) => (
                    <Card key={rank.application_id} className="bg-white/5 border-white/10">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8ab4ff] to-[#9bffd6] flex items-center justify-center">
                              <span className="text-[#0b1020] font-bold text-sm">#{i + 1}</span>
                            </div>
                            <div>
                              <p className="text-white font-medium">Kandidati {i + 1}</p>
                              <p className="text-white/40 text-xs">ID: {rank.application_id}</p>
                            </div>
                          </div>
                          <Badge className={`${
                            rank.score >= 80 ? "bg-green-500/20 text-green-400 border-green-500/30" :
                            rank.score >= 60 ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
                            "bg-red-500/20 text-red-400 border-red-500/30"
                          }`}>
                            {rank.score}/100
                          </Badge>
                        </div>

                        <p className="text-white/70 text-sm mb-3">{rank.reasoning}</p>

                        {rank.strengths && rank.strengths.length > 0 && (
                          <div className="mb-2">
                            <p className="text-green-400 text-xs font-medium mb-1">Pikat e forta:</p>
                            <ul className="space-y-1">
                              {rank.strengths.map((s, idx) => (
                                <li key={idx} className="text-white/60 text-xs flex items-start gap-2">
                                  <span className="text-green-400">•</span>
                                  {s}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {rank.concerns && rank.concerns.length > 0 && (
                          <div>
                            <p className="text-yellow-400 text-xs font-medium mb-1">Shqetësime:</p>
                            <ul className="space-y-1">
                              {rank.concerns.map((c, idx) => (
                                <li key={idx} className="text-white/60 text-xs flex items-start gap-2">
                                  <span className="text-yellow-400">•</span>
                                  {c}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </motion.div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Questionnaires */}
        <TabsContent value="questionnaires">
          <div className="flex justify-end mb-4">
            <Button
              onClick={() => setShowQuestionnaireForm(true)}
              className="bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] hover:opacity-90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Krijo pyetësor
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {questionnaires.map(q => (
              <Card key={q.id} className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-white font-semibold">{q.title}</h3>
                      <p className="text-white/40 text-xs mt-1">
                        {q.questions?.length || 0} pyetje
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleAnalyzeQuestionnaire(q.id)}
                        disabled={analyzingQuestionnaire === q.id}
                        className="text-[#8ab4ff] hover:text-white"
                        title="Analizo përgjigjet"
                      >
                        {analyzingQuestionnaire === q.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <BarChart3 className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteQuestionnaireMutation.mutate(q.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {q.is_active && (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      Aktiv
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {analysisResults && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6"
            >
              <Card className="bg-gradient-to-br from-[#8ab4ff]/10 to-[#9bffd6]/10 border-[#8ab4ff]/30">
                <CardHeader className="border-b border-white/10">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-[#8ab4ff]" />
                      Analiza e pyetësorit: {analysisResults.questionnaire_title}
                    </CardTitle>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setAnalysisResults(null)}
                      className="text-white/40 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-white/50 text-sm mt-1">
                    {analysisResults.total_responses} përgjigje të analizuara
                  </p>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {analysisResults.analysis && (
                    <>
                      <div>
                        <h4 className="text-white font-semibold mb-2">Përmbledhje:</h4>
                        <p className="text-white/70 text-sm">{analysisResults.analysis.overall_summary}</p>
                      </div>

                      {analysisResults.analysis.top_performers && analysisResults.analysis.top_performers.length > 0 && (
                        <div>
                          <h4 className="text-white font-semibold mb-2">Kandidatët më të mirë:</h4>
                          <div className="space-y-2">
                            {analysisResults.analysis.top_performers.map((perf, i) => (
                              <div key={i} className="p-3 rounded-lg bg-white/5">
                                <p className="text-white text-sm font-medium">
                                  Kandidati #{perf.applicant_index + 1}
                                </p>
                                <p className="text-white/60 text-xs mt-1">{perf.strengths}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {analysisResults.analysis.common_themes && analysisResults.analysis.common_themes.length > 0 && (
                        <div>
                          <h4 className="text-white font-semibold mb-2">Tendencat kryesore:</h4>
                          <ul className="space-y-1">
                            {analysisResults.analysis.common_themes.map((theme, i) => (
                              <li key={i} className="text-white/70 text-sm flex items-start gap-2">
                                <span className="text-[#9bffd6]">•</span>
                                {theme}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {analysisResults.analysis.recommendations && (
                        <div>
                          <h4 className="text-white font-semibold mb-2">Rekomandime:</h4>
                          <p className="text-white/70 text-sm">{analysisResults.analysis.recommendations}</p>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          <AnimatePresence>
            {showQuestionnaireForm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={() => setShowQuestionnaireForm(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-[#0b1020] border border-white/10 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h2 className="text-xl font-bold text-white mb-4">Krijo pyetësor të ri</h2>

                  <div className="space-y-4">
                    <div>
                      <label className="text-white/70 text-sm mb-1.5 block">Pozicioni</label>
                      <Select value={selectedJob} onValueChange={setSelectedJob}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue placeholder="Zgjidh pozicionin" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0b1020] border-white/20">
                          {myJobs.map(job => (
                            <SelectItem key={job.id} value={job.id} className="text-white">{job.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-white/70 text-sm mb-1.5 block">Titulli</label>
                      <Input
                        value={questionnaireForm.title}
                        onChange={(e) => setQuestionnaireForm({ ...questionnaireForm, title: e.target.value })}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/70"
                        placeholder="P.sh. Pyetësor për Developer"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-white/70 text-sm">Pyetjet</label>
                        <Button
                          size="sm"
                          onClick={handleAddQuestion}
                          variant="outline"
                          className="border-white/10 text-white hover:bg-white/5"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Shto pyetje
                        </Button>
                      </div>

                      {questionnaireForm.questions.map((q, i) => (
                        <Card key={i} className="bg-white/5 border-white/10">
                          <CardContent className="p-3 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <Input
                                value={q.question}
                                onChange={(e) => handleQuestionChange(i, "question", e.target.value)}
                                placeholder="Shkruaj pyetjen..."
                                className="bg-white/10 border-white/20 text-white text-sm flex-1 placeholder:text-white/70"
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRemoveQuestion(i)}
                                className="text-red-400 hover:text-red-300 shrink-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                            <Select
                              value={q.type}
                              onValueChange={(val) => handleQuestionChange(i, "type", val)}
                            >
                              <SelectTrigger className="bg-white/10 border-white/20 text-white text-sm h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-[#0b1020] border-white/20">
                                <SelectItem value="text" className="text-white">Tekst i lirë</SelectItem>
                                <SelectItem value="multiple_choice" className="text-white">Zgjedhje e shumtë</SelectItem>
                                <SelectItem value="rating" className="text-white">Vlerësim</SelectItem>
                              </SelectContent>
                            </Select>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => setShowQuestionnaireForm(false)}
                        className="flex-1 border-white/10 text-white hover:bg-white/5"
                      >
                        Anulo
                      </Button>
                      <Button
                        onClick={handleSubmitQuestionnaire}
                        disabled={!selectedJob || !questionnaireForm.title.trim() || createQuestionnaireMutation.isPending}
                        className="flex-1 bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] hover:opacity-90"
                      >
                        {createQuestionnaireMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Ruaj"
                        )}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>
      </Tabs>
    </div>
  );
}