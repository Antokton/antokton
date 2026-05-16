import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/antoktonClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { Award, CalendarDays, CheckCircle, ClipboardCheck, Loader2, Save, UserCheck, XCircle } from "lucide-react";
import {
  applicationStatusClasses,
  applicationStatusLabels,
  formatDate,
  issueAkademiaCertificate
} from "@/lib/akademia";

const scoreFields = [
  ["discipline_score", "Disiplina"],
  ["skill_score", "Aftesia praktike"],
  ["communication_score", "Komunikimi"],
  ["reliability_score", "Besueshmeria"]
];

export default function AkademiaMentor() {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [evaluationForms, setEvaluationForms] = useState({});

  useEffect(() => {
    base44.auth.isAuthenticated().then((authenticated) => {
      if (authenticated) base44.auth.me().then(setCurrentUser).catch(() => {});
    });
  }, []);

  const { data: courses = [], isLoading: loadingCourses } = useQuery({
    queryKey: ["akademiaCoursesMentor"],
    queryFn: () => base44.entities.AkademiaCourse.list("-created_date", 500)
  });

  const { data: applications = [], isLoading: loadingApplications } = useQuery({
    queryKey: ["akademiaApplicationsMentor"],
    queryFn: () => base44.entities.AkademiaApplication.list("-created_date", 1000)
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ["akademiaAttendanceMentor"],
    queryFn: () => base44.entities.AkademiaAttendance.list("-created_date", 2000)
  });

  const { data: evaluations = [] } = useQuery({
    queryKey: ["akademiaEvaluationsMentor"],
    queryFn: () => base44.entities.AkademiaEvaluation.list("-created_date", 1000)
  });

  const { data: certificates = [] } = useQuery({
    queryKey: ["akademiaCertificatesMentor"],
    queryFn: () => base44.entities.AkademiaCertificate.list("-created_date", 1000)
  });

  const assignedCourses = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === "admin" || currentUser.role === "moderator") return courses;
    return courses.filter(course => course.mentor_email === currentUser.email || course.mentor_id === currentUser.id);
  }, [courses, currentUser]);

  const courseIds = useMemo(() => new Set(assignedCourses.map(course => course.id)), [assignedCourses]);
  const candidates = useMemo(
    () => applications.filter(app => courseIds.has(app.course_id) && ["approved", "completed"].includes(app.status)),
    [applications, courseIds]
  );

  const attendanceByKey = useMemo(() => {
    const map = new Map();
    attendance.forEach(item => map.set(`${item.application_id}:${item.day_number}`, item));
    return map;
  }, [attendance]);

  const evaluationByApplication = useMemo(() => new Map(evaluations.map(item => [item.application_id, item])), [evaluations]);
  const certificateByApplication = useMemo(() => new Map(certificates.map(item => [item.application_id, item])), [certificates]);

  const markAttendanceMutation = useMutation({
    mutationFn: async ({ app, course, day, status }) => {
      const existing = attendanceByKey.get(`${app.id}:${day}`);
      const payload = {
        course_id: course.id,
        application_id: app.id,
        user_id: app.user_id,
        mentor_id: currentUser?.id,
        day_number: day,
        status,
        marked_at: new Date().toISOString()
      };
      return existing
        ? base44.entities.AkademiaAttendance.update(existing.id, payload)
        : base44.entities.AkademiaAttendance.create(payload);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["akademiaAttendanceMentor"] }),
    onError: (error) => toast({ title: "Prezenca nuk u ruajt", description: error.message, variant: "destructive" })
  });

  const saveEvaluationMutation = useMutation({
    mutationFn: async ({ app, course }) => {
      const existing = evaluationByApplication.get(app.id);
      const form = evaluationForms[app.id] || {};
      const payload = {
        course_id: course.id,
        application_id: app.id,
        user_id: app.user_id,
        mentor_id: currentUser?.id,
        discipline_score: Number(form.discipline_score ?? existing?.discipline_score ?? 0),
        skill_score: Number(form.skill_score ?? existing?.skill_score ?? 0),
        communication_score: Number(form.communication_score ?? existing?.communication_score ?? 0),
        reliability_score: Number(form.reliability_score ?? existing?.reliability_score ?? 0),
        final_comment: form.final_comment ?? existing?.final_comment ?? "",
        passed: Boolean(form.passed ?? existing?.passed ?? false),
        evaluated_at: new Date().toISOString()
      };
      const evaluation = existing
        ? await base44.entities.AkademiaEvaluation.update(existing.id, payload)
        : await base44.entities.AkademiaEvaluation.create(payload);

      if (payload.passed) {
        await issueAkademiaCertificate({ application: app, course, evaluation, issuerEmail: currentUser?.email });
      }

      return evaluation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["akademiaEvaluationsMentor"] });
      queryClient.invalidateQueries({ queryKey: ["akademiaApplicationsMentor"] });
      queryClient.invalidateQueries({ queryKey: ["akademiaCertificatesMentor"] });
      toast({ title: "Vleresimi u ruajt" });
    },
    onError: (error) => toast({ title: "Vleresimi nuk u ruajt", description: error.message, variant: "destructive" })
  });

  const setEvaluationValue = (applicationId, key, value) => {
    setEvaluationForms(prev => ({
      ...prev,
      [applicationId]: {
        ...prev[applicationId],
        [key]: value
      }
    }));
  };

  if (!currentUser || loadingCourses || loadingApplications) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 text-white/30 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
        <div>
          <Badge className="bg-[#9bffd6]/15 text-[#9bffd6] border-[#9bffd6]/30 mb-3">
            <ClipboardCheck className="w-3.5 h-3.5 mr-1" />
            Mentor
          </Badge>
          <h1 className="text-3xl font-bold text-white">Paneli i Mentorit</h1>
          <p className="text-white/55 mt-2">Prezenca ditore, vleresimi final dhe certifikimi i kandidateve.</p>
        </div>
        <Button asChild variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10">
          <Link to="/akademia">Shiko Akademine</Link>
        </Button>
      </div>

      {assignedCourses.length === 0 ? (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="py-14 text-center">
            <UserCheck className="w-12 h-12 text-white/25 mx-auto mb-4" />
            <h2 className="text-white font-semibold text-lg mb-2">Nuk keni kurse te caktuara</h2>
            <p className="text-white/50 text-sm">Admini duhet t'ju caktoje si mentor te nje kurs.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {assignedCourses.map((course) => {
            const courseCandidates = candidates.filter(app => app.course_id === course.id);
            const days = Array.from({ length: Number(course.duration_days || 5) }, (_, index) => index + 1);
            return (
              <Card key={course.id} className="bg-white/5 border-white/10">
                <CardHeader>
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                    <div>
                      <CardTitle className="text-white">{course.title}</CardTitle>
                      <p className="text-white/50 text-sm mt-1">{course.category} - {formatDate(course.start_date)} - {courseCandidates.length} kandidate</p>
                    </div>
                    <Badge className="bg-white/10 text-white/60 border-white/10">
                      <CalendarDays className="w-3.5 h-3.5 mr-1" />
                      {course.duration_days || 5} dite
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {courseCandidates.length === 0 ? (
                    <p className="text-white/50 text-sm">Nuk ka kandidate te aprovuar per kete kurs.</p>
                  ) : (
                    <div className="space-y-4">
                      {courseCandidates.map((app) => {
                        const evaluation = evaluationByApplication.get(app.id);
                        const certificate = certificateByApplication.get(app.id);
                        const form = evaluationForms[app.id] || {};
                        return (
                          <div key={app.id} className="rounded-lg border border-white/10 bg-white/5 p-4">
                            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                              <div>
                                <h3 className="text-white font-semibold">{app.user_name || app.user_email}</h3>
                                <p className="text-white/50 text-sm">{app.desired_profession || app.current_profession || "Kandidat Akademie"}</p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Badge className={applicationStatusClasses[app.status] || "bg-white/10 text-white/60 border-white/10"}>
                                  {applicationStatusLabels[app.status] || app.status}
                                </Badge>
                                {certificate && <Badge className="bg-green-500/20 text-green-300 border-green-500/30">Certifikuar</Badge>}
                              </div>
                            </div>

                            <div className="mt-4">
                              <p className="text-white/60 text-sm font-medium mb-2">Prezenca</p>
                              <div className="flex flex-wrap gap-2">
                                {days.map((day) => {
                                  const marked = attendanceByKey.get(`${app.id}:${day}`);
                                  return (
                                    <div key={day} className="rounded-lg border border-white/10 bg-[#0b1020]/40 p-2">
                                      <p className="text-white/45 text-xs mb-2 text-center">Dita {day}</p>
                                      <div className="flex gap-1">
                                        <Button size="sm" onClick={() => markAttendanceMutation.mutate({ app, course, day, status: "present" })} className={`h-8 px-2 ${marked?.status === "present" ? "bg-green-500/30 text-green-100" : "bg-white/5 text-white/70 hover:bg-white/10"}`}>
                                          <CheckCircle className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button size="sm" onClick={() => markAttendanceMutation.mutate({ app, course, day, status: "absent" })} className={`h-8 px-2 ${marked?.status === "absent" ? "bg-red-500/30 text-red-100" : "bg-white/5 text-white/70 hover:bg-white/10"}`}>
                                          <XCircle className="w-3.5 h-3.5" />
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="mt-5 rounded-lg border border-white/10 bg-[#0b1020]/35 p-4">
                              <p className="text-white font-medium mb-3">Vleresimi final</p>
                              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                {scoreFields.map(([key, label]) => (
                                  <div key={key}>
                                    <Label className="text-white/60 text-xs">{label}</Label>
                                    <Input
                                      type="number"
                                      min="1"
                                      max="5"
                                      value={form[key] ?? evaluation?.[key] ?? ""}
                                      onChange={(e) => setEvaluationValue(app.id, key, e.target.value)}
                                      className="mt-1 bg-white/5 border-white/10 text-white"
                                    />
                                  </div>
                                ))}
                              </div>
                              <div className="mt-3">
                                <Label className="text-white/60 text-xs">Komenti final</Label>
                                <Textarea
                                  value={form.final_comment ?? evaluation?.final_comment ?? ""}
                                  onChange={(e) => setEvaluationValue(app.id, "final_comment", e.target.value)}
                                  className="mt-1 bg-white/5 border-white/10 text-white min-h-20"
                                />
                              </div>
                              <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <label className="flex items-center gap-2 text-white/75 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(form.passed ?? evaluation?.passed ?? false)}
                                    onChange={(e) => setEvaluationValue(app.id, "passed", e.target.checked)}
                                    className="w-4 h-4"
                                  />
                                  Kandidati e kaloi kursin
                                </label>
                                <Button onClick={() => saveEvaluationMutation.mutate({ app, course })} disabled={saveEvaluationMutation.isPending} className="bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] font-semibold hover:opacity-90">
                                  {saveEvaluationMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                  Ruaj vleresimin
                                </Button>
                              </div>
                              {certificate && (
                                <Button asChild variant="outline" className="mt-3 border-white/15 bg-white/5 text-white hover:bg-white/10">
                                  <Link to={`/verify-certificate/${certificate.certificate_number}`}>
                                    <Award className="w-4 h-4 mr-2" />
                                    {certificate.certificate_number}
                                  </Link>
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
