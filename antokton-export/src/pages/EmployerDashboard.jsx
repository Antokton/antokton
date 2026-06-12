import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, ChevronDown, ChevronUp, MessageCircle, Send, User, Phone, Mail, FileText, Briefcase } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import moment from "moment";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";

const statusConfig = {
  applied:     { label: "Në pritje",  color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  shortlisted: { label: "Pranuar",    color: "bg-green-500/20 text-green-400 border-green-500/30" },
  interviewing:{ label: "Intervistë", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  rejected:    { label: "Refuzuar",   color: "bg-red-500/20 text-red-400 border-red-500/30" },
  hired:       { label: "Punësuar",   color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
};

const profileName = (profile, fallbackEmail = "") => {
  const name = [profile?.first_name, profile?.surname].filter(Boolean).join(" ").trim()
    || profile?.full_name
    || profile?.display_name
    || profile?.public_name
    || "";
  return name || fallbackEmail.split("@")[0] || "Aplikues";
};

function ApplicationCard({ app, job, user, applicantProfile, onStatusChange }) {
  const [expanded, setExpanded] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const queryClient = useQueryClient();

  const { data: messages = [] } = useQuery({
    queryKey: ["app-messages", app.id],
    queryFn: () => base44.entities.ChatMessage.filter({ 
      sender_email: user.email,
      receiver_email: app.applicant_email 
    }, "-created_date", 50),
    enabled: expanded && !!user?.email,
    refetchInterval: expanded ? 10000 : false,
  });

  // Also get messages FROM applicant TO poster
  const { data: messagesFromApplicant = [] } = useQuery({
    queryKey: ["app-messages-from", app.id],
    queryFn: () => base44.entities.ChatMessage.filter({
      sender_email: app.applicant_email,
      receiver_email: user.email
    }, "-created_date", 50),
    enabled: expanded && !!user?.email && app.applicant_email !== user.email,
    refetchInterval: expanded ? 10000 : false,
  });

  // Merge and sort all messages
  const allMessages = Array.from(
    new Map([...messages, ...messagesFromApplicant].map((msg) => {
      const minuteBucket = msg.created_date ? moment(msg.created_date).format("YYYY-MM-DDTHH:mm") : "";
      return [
        `${msg.sender_email}-${msg.receiver_email}-${minuteBucket}-${String(msg.message || "").trim()}`,
        msg
      ];
    })).values()
  )
    .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

  const sendMessage = async () => {
    if (!message.trim() || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    try {
      await base44.entities.ChatMessage.create({
        sender_email: user.email,
        receiver_email: app.applicant_email,
        message: message.trim(),
        is_read: false,
      });
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["app-messages", app.id] });
      queryClient.invalidateQueries({ queryKey: ["app-messages-from", app.id] });
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const sc = statusConfig[app.status] || statusConfig.applied;
  const applicantName = profileName(applicantProfile, app.applicant_email) || app.applicant_name || "Aplikues";

  return (
    <motion.div
      layout
      className="rounded-xl border border-white/10 overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.04)' }}
    >
      {/* Header row */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #8ab4ff, #9bffd6)', color: '#0b1020' }}>
          {(applicantName || "?")[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-semibold text-sm">{applicantName}</span>
            <Badge className={`text-xs border ${sc.color}`}>{sc.label}</Badge>
          </div>
          <p className="text-white/40 text-xs mt-0.5 truncate">
            {job?.title || "Njoftim i fshirë"} · {moment(app.created_date).fromNow()}
          </p>
        </div>
        <div className="flex-shrink-0 text-white/40">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-white/10"
          >
            <div className="p-4 space-y-4">
              {/* Applicant details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-white/40 flex-shrink-0" />
                  <a href={`mailto:${app.applicant_email}`} className="text-[#8ab4ff] hover:text-[#9bffd6] truncate">
                    {app.applicant_email}
                  </a>
                </div>
                {app.applicant_phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-white/40 flex-shrink-0" />
                    <a href={`tel:${app.applicant_phone}`} className="text-[#8ab4ff] hover:text-[#9bffd6]">
                      {app.applicant_phone}
                    </a>
                  </div>
                )}
                {app.cv_url && (
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4 text-white/40 flex-shrink-0" />
                    <a href={app.cv_url} target="_blank" rel="noopener noreferrer" className="text-[#8ab4ff] hover:text-[#9bffd6]">
                      Shiko CV-në
                    </a>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-white/40 flex-shrink-0" />
                  <Link to={`/Member/${encodeURIComponent(app.applicant_email)}`} className="text-[#8ab4ff] hover:text-[#9bffd6]">
                    Shiko Profilin
                  </Link>
                </div>
              </div>

              {/* Cover letter */}
              {app.cover_letter && (
                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <p className="text-white/50 text-xs font-medium mb-1 uppercase tracking-wider">Letra motivuese</p>
                  <p className="text-white/80 text-sm leading-relaxed">{app.cover_letter}</p>
                </div>
              )}

              {/* Action buttons */}
              {app.status === "applied" && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => onStatusChange(app.id, "shortlisted")}
                    className="bg-green-500 hover:bg-green-600 text-white gap-1.5"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Prano
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onStatusChange(app.id, "interviewing")}
                    className="bg-blue-500 hover:bg-blue-600 text-white gap-1.5"
                  >
                    <Briefcase className="w-3.5 h-3.5" /> Thirrje Intervistë
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onStatusChange(app.id, "rejected")}
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10 gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Refuzo
                  </Button>
                </div>
              )}
              {app.status === "shortlisted" && (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => onStatusChange(app.id, "hired")} className="bg-purple-500 hover:bg-purple-600 text-white gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" /> Shëno si Punësuar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onStatusChange(app.id, "rejected")} className="border-red-500/30 text-red-400 hover:bg-red-500/10 gap-1.5">
                    <XCircle className="w-3.5 h-3.5" /> Refuzo
                  </Button>
                </div>
              )}

              {/* Messaging */}
              <div className="border-t border-white/10 pt-3">
                <p className="text-white/40 text-xs font-medium uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5" /> Komunikim me aplikuesin
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                  {allMessages.length === 0 ? (
                    <p className="text-white/30 text-xs text-center py-3">Nuk ka mesazhe ende. Filloni komunikimin!</p>
                  ) : (
                    allMessages.map(msg => (
                      <div key={msg.id} className={`flex ${msg.sender_email === user.email ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[80%] px-3 py-2 rounded-xl text-xs ${
                            msg.sender_email === user.email
                              ? "bg-[#8ab4ff]/20 text-white rounded-br-sm"
                              : "bg-white/10 text-white/80 rounded-bl-sm"
                          }`}
                        >
                          {msg.message}
                          <div className="text-white/30 text-[10px] mt-0.5">{moment(msg.created_date).format("D MMM, HH:mm")}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex gap-2">
                  <Textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder="Shkruaj mesazh tek aplikuesi..."
                    className="bg-white/5 border-white/10 text-white text-sm min-h-[60px] resize-none"
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!message.trim() || sending}
                    className="self-end bg-[#8ab4ff] hover:bg-[#9bffd6] text-[#0b1020] px-3"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function EmployerDashboard() {
  const [user, setUser] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkAuth = async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) { base44.auth.redirectToLogin(); return; }
      const me = await base44.auth.me();
      setUser(me);
    };
    checkAuth();
  }, []);

  const { data: myJobs = [] } = useQuery({
    queryKey: ["employer-jobs", user?.email],
    queryFn: () => base44.entities.Job.filter({ created_by: user?.email }),
    enabled: !!user?.email,
  });

  const { data: applications = [] } = useQuery({
    queryKey: ["employer-applications", user?.email],
    queryFn: async () => {
      const jobIds = myJobs.map(j => j.id);
      if (jobIds.length === 0) return [];
      const all = await base44.entities.JobApplication.list("-created_date", 500);
      return all.filter(app => jobIds.includes(app.job_id));
    },
    enabled: !!user?.email && myJobs.length > 0,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["employer-application-users"],
    queryFn: () => base44.entities.User.list("-updated_date", 1000),
    enabled: !!user?.email,
    staleTime: 60000,
  });
  const userByEmail = new Map(users.map((item) => [String(item.email || "").toLowerCase(), item]));

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.JobApplication.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employer-applications"] }),
  });

  const stats = {
    total: applications.length,
    pending: applications.filter(a => a.status === "applied").length,
    accepted: applications.filter(a => ["shortlisted","hired"].includes(a.status)).length,
    rejected: applications.filter(a => a.status === "rejected").length,
  };

  const filtered = filterStatus === "all"
    ? applications
    : applications.filter(a => a.status === filterStatus);

  if (!user) return null;

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Aplikimet për Njoftimet e mia</h1>
        <p className="text-white/50 text-sm">Menaxho aplikimet dhe komunikimi me aplikuesit</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        {[
          { key: "all",         label: "Gjithsej",  count: stats.total,    color: "text-white" },
          { key: "applied",     label: "Në pritje", count: stats.pending,  color: "text-yellow-400" },
          { key: "shortlisted", label: "Pranuar",   count: stats.accepted, color: "text-green-400" },
          { key: "rejected",    label: "Refuzuar",  count: stats.rejected, color: "text-red-400" },
        ].map(s => (
          <button
            key={s.key}
            onClick={() => setFilterStatus(s.key)}
            className={`rounded-xl p-3 text-center transition-all border ${
              filterStatus === s.key ? "border-[#8ab4ff]/50 bg-[#8ab4ff]/10" : "border-white/10 bg-white/5 hover:bg-white/8"
            }`}
          >
            <div className={`text-xl font-bold ${s.color}`}>{s.count}</div>
            <div className="text-white/50 text-xs mt-0.5">{s.label}</div>
          </button>
        ))}
      </div>

      {/* Applications */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-white/40">
          <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Nuk ka aplikime {filterStatus !== "all" ? "me këtë status" : "ende"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(app => (
            <ApplicationCard
              key={app.id}
              app={app}
              job={myJobs.find(j => j.id === app.job_id)}
              user={user}
              applicantProfile={userByEmail.get(String(app.applicant_email || "").toLowerCase())}
              onStatusChange={(id, status) => updateStatusMutation.mutate({ id, status })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
