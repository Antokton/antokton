import React, { useState, useEffect } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Briefcase, Mail, Phone, FileText, Download, ChevronDown, ChevronUp, MessageSquare, Send, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ChatWindow from "../components/ChatWindow";
import toast from "react-hot-toast";

const statusColors = {
  applied: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  shortlisted: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  interviewing: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  rejected: "bg-red-500/20 text-red-400 border-red-500/30",
  hired: "bg-green-500/20 text-green-400 border-green-500/30"
};

const statusLabels = {
  applied: "Aplikuar",
  shortlisted: "Në listë të shkurtër",
  interviewing: "Në intervistë",
  rejected: "Refuzuar",
  hired: "I punësuar"
};

export default function ApplicationsDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [expandedApp, setExpandedApp] = useState(null);
  const [chatWithApplicant, setChatWithApplicant] = useState(null);
  const [cvSummaries, setCvSummaries] = useState({});
  const [loadingSummary, setLoadingSummary] = useState(null);
  const queryClient = useQueryClient();

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

  const { data: allApplications = [] } = useQuery({
    queryKey: ["applications"],
    queryFn: () => base44.entities.JobApplication.list("-created_date", 500),
    enabled: !!user
  });

  const myJobIds = myJobs.map(j => j.id);
  const applications = allApplications.filter(app => myJobIds.includes(app.job_id));

  const filteredApplications = applications.filter(app => {
    if (selectedJob !== "all" && app.job_id !== selectedJob) return false;
    if (selectedStatus !== "all" && app.status !== selectedStatus) return false;
    return true;
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, notes }) => base44.entities.JobApplication.update(id, { status, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    }
  });

  const handleStatusChange = (appId, newStatus) => {
    const app = applications.find(a => a.id === appId);
    updateStatusMutation.mutate({ id: appId, status: newStatus, notes: app.notes });
  };

  const handleNotesUpdate = (appId, notes) => {
    const app = applications.find(a => a.id === appId);
    updateStatusMutation.mutate({ id: appId, status: app.status, notes });
  };

  const handleDownloadCV = (cvUrl, applicantName) => {
    const link = document.createElement("a");
    link.href = cvUrl;
    link.download = `CV_${applicantName.replace(/\s+/g, "_")}.pdf`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const { data: allUsers = [] } = useQuery({
    queryKey: ["allUsers"],
    queryFn: () => base44.entities.User.list("-created_date", 500),
    enabled: !!user
  });

  const handleSummarizeCV = async (app) => {
    if (!app.cv_url) {
      toast.error("Nuk ka CV për të analizuar");
      return;
    }

    setLoadingSummary(app.id);
    try {
      const { data } = await base44.functions.invoke("summarizeCV", { cvUrl: app.cv_url });
      setCvSummaries(prev => ({ ...prev, [app.id]: data }));
      toast.success("CV u analizua me sukses!");
    } catch (error) {
      toast.error("Gabim në analizë: " + error.message);
    }
    setLoadingSummary(null);
  };

  const getJobTitle = (jobId) => {
    const job = myJobs.find(j => j.id === jobId);
    return job?.title || "N/A";
  };

  const statusCounts = {
    all: applications.length,
    applied: applications.filter(a => a.status === "applied").length,
    shortlisted: applications.filter(a => a.status === "shortlisted").length,
    interviewing: applications.filter(a => a.status === "interviewing").length,
    rejected: applications.filter(a => a.status === "rejected").length,
    hired: applications.filter(a => a.status === "hired").length
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
        <h1 className="text-3xl font-bold text-white tracking-tight">Menaxhimi i aplikimeve</h1>
        <p className="text-white/50 mt-2">Shiko dhe menaxho aplikimet për njoftimet tuaja</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {Object.entries(statusCounts).map(([status, count]) => (
          <Card key={status} className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <p className="text-white/50 text-xs mb-1 capitalize">
                {status === "all" ? "Të gjitha" : statusLabels[status]}
              </p>
              <p className="text-2xl font-bold text-white">{count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <Select value={selectedJob} onValueChange={setSelectedJob}>
          <SelectTrigger className="bg-white/5 border-white/10 text-white">
            <SelectValue placeholder="Filtro sipas njoftimit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Të gjitha njoftimet</SelectItem>
            {myJobs.map(job => (
              <SelectItem key={job.id} value={job.id}>{job.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="bg-white/5 border-white/10 text-white">
            <SelectValue placeholder="Filtro sipas statusit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Të gjitha statuset</SelectItem>
            <SelectItem value="applied">Aplikuar</SelectItem>
            <SelectItem value="shortlisted">Në listë të shkurtër</SelectItem>
            <SelectItem value="interviewing">Në intervistë</SelectItem>
            <SelectItem value="rejected">Refuzuar</SelectItem>
            <SelectItem value="hired">I punësuar</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {filteredApplications.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/40">Nuk ka aplikime</p>
            </div>
          ) : (
            filteredApplications.map((app, i) => (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: i * 0.02 }}
              >
                <Card className="bg-white/5 border-white/10 overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-white text-lg mb-2">
                          {app.applicant_name}
                        </CardTitle>
                        <p className="text-white/50 text-sm mb-2">{getJobTitle(app.job_id)}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={`border ${statusColors[app.status]}`}>
                            {statusLabels[app.status]}
                          </Badge>
                          <span className="text-white/30 text-xs">
                            {new Date(app.created_date).toLocaleDateString("sq-AL")}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedApp(expandedApp === app.id ? null : app.id)}
                        className="text-white/40 hover:text-white"
                      >
                        {expandedApp === app.id ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </Button>
                    </div>
                  </CardHeader>

                  {expandedApp === app.id && (
                    <CardContent className="border-t border-white/10 pt-4">
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-white/60 text-sm">
                              <Mail className="w-4 h-4" />
                              {app.applicant_email}
                            </div>
                            {app.applicant_phone && (
                              <div className="flex items-center gap-2 text-white/60 text-sm">
                                <Phone className="w-4 h-4" />
                                {app.applicant_phone}
                              </div>
                            )}
                            <div className="flex flex-wrap gap-2">
                              {app.cv_url && (
                                <>
                                  <Button
                                    onClick={() => handleDownloadCV(app.cv_url, app.applicant_name)}
                                    variant="outline"
                                    size="sm"
                                    className="border-white/10 text-white hover:bg-white/5"
                                  >
                                    <Download className="w-4 h-4 mr-2" />
                                    Shkarko CV
                                  </Button>
                                  <Button
                                    onClick={() => handleSummarizeCV(app)}
                                    variant="outline"
                                    size="sm"
                                    disabled={loadingSummary === app.id}
                                    className="border-white/10 text-white hover:bg-white/5"
                                  >
                                    {loadingSummary === app.id ? (
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                      <Sparkles className="w-4 h-4 mr-2" />
                                    )}
                                    Analizo CV
                                  </Button>
                                </>
                              )}
                              <Button
                                onClick={() => {
                                  const applicantUser = allUsers.find(u => u.email === app.applicant_email);
                                  if (applicantUser) setChatWithApplicant(applicantUser);
                                }}
                                variant="outline"
                                size="sm"
                                className="border-white/10 text-white hover:bg-white/5"
                              >
                                <MessageSquare className="w-4 h-4 mr-2" />
                                Dërgo mesazh
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-white/50 text-xs">Ndrysho statusin</label>
                            <Select
                              value={app.status}
                              onValueChange={(value) => handleStatusChange(app.id, value)}
                            >
                              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="applied">Aplikuar</SelectItem>
                                <SelectItem value="shortlisted">Në listë të shkurtër</SelectItem>
                                <SelectItem value="interviewing">Në intervistë</SelectItem>
                                <SelectItem value="rejected">Refuzuar</SelectItem>
                                <SelectItem value="hired">I punësuar</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {app.cover_letter && (
                          <div className="space-y-2">
                            <label className="text-white/50 text-xs">Letra motivuese</label>
                            <div className="bg-white/5 rounded-lg p-3 text-white/70 text-sm">
                              {app.cover_letter}
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <label className="text-white/50 text-xs">Shënime (vetëm për ju)</label>
                          <Textarea
                            value={app.notes || ""}
                            onChange={(e) => handleNotesUpdate(app.id, e.target.value)}
                            placeholder="Shto shënime për këtë aplikim..."
                            className="bg-white/5 border-white/10 text-white min-h-[80px]"
                          />
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {chatWithApplicant && (
        <ChatWindow
          user={chatWithApplicant}
          onClose={() => setChatWithApplicant(null)}
        />
      )}
    </div>
  );
}