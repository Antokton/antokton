import React, { useState, useEffect } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery } from "@tanstack/react-query";
import JobRecommendations from "../components/job/JobRecommendations";
import SimilarCompanies from "../components/company/SimilarCompanies";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Briefcase, Calendar, Bell, TrendingUp, Users, FileText, CheckCircle, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import moment from "moment";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const authenticated = await base44.auth.isAuthenticated();
      if (authenticated) {
        const me = await base44.auth.me();
        setUser(me);
      }
      setLoading(false);
    };
    loadUser();
  }, []);

  const { data: myApplications = [] } = useQuery({
    queryKey: ["myApplications", user?.email],
    queryFn: () => base44.entities.JobApplication.filter({ applicant_email: user.email }, "-created_date", 50),
    enabled: !!user
  });

  const { data: myJobs = [] } = useQuery({
    queryKey: ["myJobs", user?.email],
    queryFn: () => base44.entities.Job.filter({ created_by: user.email }, "-created_date", 50),
    enabled: !!user && (user.user_type === "employer" || user.user_type === "recruiter")
  });

  const { data: allApplications = [] } = useQuery({
    queryKey: ["allApplicationsForDash"],
    queryFn: () => base44.entities.JobApplication.list("-created_date", 200),
    enabled: !!user && (user.user_type === "employer" || user.user_type === "recruiter")
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", user?.email],
    queryFn: () => base44.entities.Notification.filter({ user_email: user.email, is_read: false }, "-created_date", 10),
    enabled: !!user
  });

  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ["upcomingEvents"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const events = await base44.entities.Event.list("-event_date", 100);
      return events.filter(e => e.event_date >= now).slice(0, 5);
    },
    enabled: !!user
  });

  const { data: recentJobs = [] } = useQuery({
    queryKey: ["recentJobs"],
    queryFn: () => base44.entities.Job.filter({ status: "approved" }, "-created_date", 6),
    enabled: !!user
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-white/30 animate-spin" />
      </div>
    );
  }

  const myJobIds = myJobs.map(j => j.id);
  const applicationsForMyJobs = allApplications.filter(app => myJobIds.includes(app.job_id));

  const statusCounts = {
    applied: myApplications.filter(a => a.status === "applied").length,
    shortlisted: myApplications.filter(a => a.status === "shortlisted").length,
    interviewing: myApplications.filter(a => a.status === "interviewing").length,
    hired: myApplications.filter(a => a.status === "hired").length
  };

  const isRecruiterOrEmployer = user.user_type === "employer" || user.user_type === "recruiter";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight">
          Mirë se erdhe, {user.first_name || user.full_name || "Përdorues"}!
        </h1>
        <p className="text-white/50 mt-1">Dashboard</p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
        <Link to={createPageUrl("ApplicationsDashboard")}>
          <Button variant="outline" className="bg-white/5 border-white/10 text-white hover:bg-white/10">
            <Briefcase className="w-4 h-4 mr-2" />
            Aplikimet e mia
          </Button>
        </Link>
        <Link to={createPageUrl("NotificationSettings")}>
          <Button variant="outline" className="bg-white/5 border-white/10 text-white hover:bg-white/10">
            <Bell className="w-4 h-4 mr-2" />
            Njoftime & Cilësimet
          </Button>
        </Link>
        {(user.role === "admin" || user.role === "moderator") && (
          <Link to={createPageUrl("RecruiterTools")}>
            <Button variant="outline" className="bg-white/5 border-white/10 text-white hover:bg-white/10">
              <TrendingUp className="w-4 h-4 mr-2" />
              Mjetet
            </Button>
          </Link>
        )}
        <Link to={createPageUrl("Profile")}>
          <Button variant="outline" className="bg-white/5 border-white/10 text-white hover:bg-white/10">
            <Users className="w-4 h-4 mr-2" />
            Profili im
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {!isRecruiterOrEmployer ? (
          <>
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/50 text-sm mb-1">Aplikime aktive</p>
                    <p className="text-3xl font-bold text-white">{statusCounts.applied}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Briefcase className="w-6 h-6 text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/50 text-sm mb-1">Në intervistë</p>
                    <p className="text-3xl font-bold text-white">{statusCounts.interviewing}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-yellow-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/50 text-sm mb-1">Të punësuar</p>
                    <p className="text-3xl font-bold text-white">{statusCounts.hired}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/50 text-sm mb-1">Njoftime aktive</p>
                    <p className="text-3xl font-bold text-white">{myJobs.filter(j => j.status === "approved").length}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Briefcase className="w-6 h-6 text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/50 text-sm mb-1">Aplikime të reja</p>
                    <p className="text-3xl font-bold text-white">
                      {applicationsForMyJobs.filter(a => a.status === "applied").length}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <Users className="w-6 h-6 text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/50 text-sm mb-1">Në proces</p>
                    <p className="text-3xl font-bold text-white">
                      {applicationsForMyJobs.filter(a => a.status === "interviewing" || a.status === "shortlisted").length}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-yellow-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/50 text-sm mb-1">Njoftime të reja</p>
                <p className="text-3xl font-bold text-white">{notifications.length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <Bell className="w-6 h-6 text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recommendations Card */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Rekomandime për ju
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="text-center py-6">
              <TrendingUp className="w-12 h-12 text-[#8ab4ff]/50 mx-auto mb-3" />
              <p className="text-white/60 text-sm mb-4">
                Zbulo punë të rekomanduara bazuar në profilin tënd
              </p>
              <Link to={createPageUrl("Recommendations")}>
                <Button className="bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] hover:opacity-90">
                  Shiko rekomandimet
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recent Applications / Jobs */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {isRecruiterOrEmployer ? "Aplikimet e fundit" : "Aplikimet e mia"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {(isRecruiterOrEmployer ? applicationsForMyJobs.slice(0, 5) : myApplications.slice(0, 5)).length === 0 ? (
              <p className="text-white/40 text-sm text-center py-8">Nuk ka aplikime</p>
            ) : (
              <div className="space-y-3">
                {(isRecruiterOrEmployer ? applicationsForMyJobs.slice(0, 5) : myApplications.slice(0, 5)).map(app => (
                  <div key={app.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {isRecruiterOrEmployer ? app.applicant_name : `Aplikim për ${app.job_id}`}
                      </p>
                      <p className="text-white/40 text-xs mt-1">
                        {moment(app.created_date).fromNow()}
                      </p>
                    </div>
                    <Badge className={`ml-2 ${
                      app.status === "hired" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                      app.status === "interviewing" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
                      "bg-blue-500/20 text-blue-400 border-blue-500/30"
                    }`}>
                      {app.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Ngjarjet e ardhshme
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {upcomingEvents.length === 0 ? (
              <p className="text-white/40 text-sm text-center py-8">Nuk ka ngjarje të ardhshme</p>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map(event => (
                  <div key={event.id} className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <p className="text-white text-sm font-medium">{event.title}</p>
                    <p className="text-white/40 text-xs mt-1">
                      {moment(event.event_date).format("D MMM, HH:mm")}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <Link to={createPageUrl("Events")}>
              <Button variant="ghost" className="w-full mt-3 text-[#8ab4ff] hover:text-white">
                Shiko të gjitha →
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Job Posts */}
        {!isRecruiterOrEmployer && (
          <Card className="bg-white/5 border-white/10 lg:col-span-2">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Njoftime të reja pune
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {recentJobs.map(job => (
                  <Link key={job.id} to={`${createPageUrl("PostDetail")}?id=${job.id}`}>
                    <div className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                      <h4 className="text-white font-medium text-sm mb-1">{job.title}</h4>
                      <p className="text-white/60 text-xs mb-2 line-clamp-2">{job.description}</p>
                      <div className="flex items-center gap-2 text-white/40 text-xs">
                        <span>{job.country}</span>
                        <span>•</span>
                        <span>{moment(job.created_date).fromNow()}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}