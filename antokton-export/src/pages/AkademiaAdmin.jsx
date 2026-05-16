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
import { Archive, Award, CheckCircle, Edit, Loader2, Plus, Save, Shield, UserCheck, XCircle } from "lucide-react";
import {
  applicationStatusClasses,
  applicationStatusLabels,
  courseStatusLabels,
  displayName,
  formatDate,
  formatMoney,
  issueAkademiaCertificate,
  programToText,
  textToLines,
  textToProgram
} from "@/lib/akademia";

const blankCourse = {
  title: "",
  category: "",
  description: "",
  daily_program_text: "",
  requirements_text: "",
  city: "",
  country: "",
  duration_days: 5,
  price: 0,
  currency: "EUR",
  mentor_email: "",
  start_date: "",
  capacity: 12,
  status: "active"
};

export default function AkademiaAdmin() {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [courseForm, setCourseForm] = useState(blankCourse);

  useEffect(() => {
    base44.auth.isAuthenticated().then((authenticated) => {
      if (authenticated) base44.auth.me().then(setCurrentUser).catch(() => {});
    });
  }, []);

  const { data: courses = [], isLoading: loadingCourses } = useQuery({
    queryKey: ["akademiaCoursesAdmin"],
    queryFn: () => base44.entities.AkademiaCourse.list("-created_date", 500)
  });

  const { data: applications = [], isLoading: loadingApplications } = useQuery({
    queryKey: ["akademiaApplicationsAdmin"],
    queryFn: () => base44.entities.AkademiaApplication.list("-created_date", 1000)
  });

  const { data: users = [] } = useQuery({
    queryKey: ["akademiaUsersAdmin"],
    queryFn: () => base44.entities.User.list("-created_date", 1000)
  });

  const { data: evaluations = [] } = useQuery({
    queryKey: ["akademiaEvaluationsAdmin"],
    queryFn: () => base44.entities.AkademiaEvaluation.list("-created_date", 1000)
  });

  const { data: certificates = [] } = useQuery({
    queryKey: ["akademiaCertificatesAdmin"],
    queryFn: () => base44.entities.AkademiaCertificate.list("-created_date", 1000)
  });

  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "moderator";
  const courseById = useMemo(() => new Map(courses.map(course => [course.id, course])), [courses]);
  const certificateByApplication = useMemo(() => new Map(certificates.map(cert => [cert.application_id, cert])), [certificates]);

  const resetForm = () => {
    setEditingId(null);
    setCourseForm(blankCourse);
  };

  const editCourse = (course) => {
    setEditingId(course.id);
    setCourseForm({
      title: course.title || "",
      category: course.category || "",
      description: course.description || "",
      daily_program_text: programToText(course.daily_program),
      requirements_text: textToLines(course.requirements).join("\n"),
      city: course.city || "",
      country: course.country || "",
      duration_days: course.duration_days || 5,
      price: course.price || 0,
      currency: course.currency || "EUR",
      mentor_email: course.mentor_email || "",
      start_date: course.start_date ? String(course.start_date).slice(0, 10) : "",
      capacity: course.capacity || 12,
      status: course.status || "active"
    });
  };

  const saveCourseMutation = useMutation({
    mutationFn: async () => {
      const mentor = users.find(item => item.email === courseForm.mentor_email);
      const payload = {
        title: courseForm.title,
        category: courseForm.category,
        description: courseForm.description,
        daily_program: textToProgram(courseForm.daily_program_text),
        requirements: textToLines(courseForm.requirements_text),
        city: courseForm.city,
        country: courseForm.country,
        duration_days: Number(courseForm.duration_days || 5),
        price: Number(courseForm.price || 0),
        currency: courseForm.currency || "EUR",
        mentor_id: mentor?.id || "",
        mentor_email: mentor?.email || courseForm.mentor_email,
        mentor_name: mentor ? displayName(mentor) : "",
        start_date: courseForm.start_date,
        capacity: Number(courseForm.capacity || 12),
        status: courseForm.status || "active"
      };
      return editingId
        ? base44.entities.AkademiaCourse.update(editingId, payload)
        : base44.entities.AkademiaCourse.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["akademiaCoursesAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["akademiaCourses"] });
      resetForm();
      toast({ title: "Kursi u ruajt" });
    },
    onError: (error) => toast({ title: "Nuk u ruajt kursi", description: error.message, variant: "destructive" })
  });

  const updateApplicationMutation = useMutation({
    mutationFn: ({ app, status }) => base44.entities.AkademiaApplication.update(app.id, {
      status,
      reviewed_by: currentUser?.email,
      reviewed_at: new Date().toISOString()
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["akademiaApplicationsAdmin"] }),
    onError: (error) => toast({ title: "Ndryshimi deshtoi", description: error.message, variant: "destructive" })
  });

  const archiveCourseMutation = useMutation({
    mutationFn: (course) => base44.entities.AkademiaCourse.update(course.id, { status: "archived" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["akademiaCoursesAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["akademiaCourses"] });
    }
  });

  const issueCertificateMutation = useMutation({
    mutationFn: async (app) => {
      const course = courseById.get(app.course_id);
      const evaluation = evaluations.find(item => item.application_id === app.id && item.passed);
      return issueAkademiaCertificate({ application: app, course, evaluation, issuerEmail: currentUser?.email });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["akademiaApplicationsAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["akademiaCertificatesAdmin"] });
      toast({ title: "Certifikata u leshua" });
    },
    onError: (error) => toast({ title: "Certifikata nuk u leshua", description: error.message, variant: "destructive" })
  });

  if (!currentUser) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 text-white/30 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <Shield className="w-14 h-14 text-white/25 mx-auto mb-4" />
        <h1 className="text-white text-2xl font-bold mb-2">Vetem admin</h1>
        <p className="text-white/50 mb-6">Ky panel eshte per menaxhimin e Akademise Antokton.</p>
        <Button asChild><Link to="/akademia">Kthehu te Akademia</Link></Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
        <div>
          <Badge className="bg-[#8ab4ff]/15 text-[#8ab4ff] border-[#8ab4ff]/30 mb-3">
            <Shield className="w-3.5 h-3.5 mr-1" />
            Admin
          </Badge>
          <h1 className="text-3xl font-bold text-white">Akademia Antokton</h1>
          <p className="text-white/55 mt-2">Krijo kurse, shqyrto aplikime dhe lesho certifikata.</p>
        </div>
        <Button asChild variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10">
          <Link to="/akademia">Shiko faqen publike</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6">
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              {editingId ? <Edit className="w-5 h-5 text-[#8ab4ff]" /> : <Plus className="w-5 h-5 text-[#8ab4ff]" />}
              {editingId ? "Ndrysho kursin" : "Kurs i ri"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                saveCourseMutation.mutate();
              }}
            >
              <div>
                <Label className="text-white/70">Titulli</Label>
                <Input value={courseForm.title} onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })} required className="mt-1 bg-white/5 border-white/10 text-white" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-white/70">Kategoria</Label>
                  <Input value={courseForm.category} onChange={(e) => setCourseForm({ ...courseForm, category: e.target.value })} required className="mt-1 bg-white/5 border-white/10 text-white" />
                </div>
                <div>
                  <Label className="text-white/70">Statusi</Label>
                  <select value={courseForm.status} onChange={(e) => setCourseForm({ ...courseForm, status: e.target.value })} className="mt-1 h-10 w-full rounded-md border border-white/10 bg-[#10182d] px-3 text-sm text-white">
                    {Object.entries(courseStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <Label className="text-white/70">Pershkrimi</Label>
                <Textarea value={courseForm.description} onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })} required className="mt-1 bg-white/5 border-white/10 text-white min-h-28" />
              </div>
              <div>
                <Label className="text-white/70">Programi ditor</Label>
                <Textarea value={courseForm.daily_program_text} onChange={(e) => setCourseForm({ ...courseForm, daily_program_text: e.target.value })} placeholder="1 | Hyrje | Praktike dhe orientim" className="mt-1 bg-white/5 border-white/10 text-white min-h-28" />
              </div>
              <div>
                <Label className="text-white/70">Kerkesat</Label>
                <Textarea value={courseForm.requirements_text} onChange={(e) => setCourseForm({ ...courseForm, requirements_text: e.target.value })} placeholder="Nje kerkese per rresht" className="mt-1 bg-white/5 border-white/10 text-white min-h-20" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-white/70">Qyteti</Label>
                  <Input value={courseForm.city} onChange={(e) => setCourseForm({ ...courseForm, city: e.target.value })} required className="mt-1 bg-white/5 border-white/10 text-white" />
                </div>
                <div>
                  <Label className="text-white/70">Shteti</Label>
                  <Input value={courseForm.country} onChange={(e) => setCourseForm({ ...courseForm, country: e.target.value })} required className="mt-1 bg-white/5 border-white/10 text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-white/70">Ditet</Label>
                  <Input type="number" min="1" value={courseForm.duration_days} onChange={(e) => setCourseForm({ ...courseForm, duration_days: e.target.value })} required className="mt-1 bg-white/5 border-white/10 text-white" />
                </div>
                <div>
                  <Label className="text-white/70">Kapaciteti</Label>
                  <Input type="number" min="1" value={courseForm.capacity} onChange={(e) => setCourseForm({ ...courseForm, capacity: e.target.value })} className="mt-1 bg-white/5 border-white/10 text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-white/70">Cmimi</Label>
                  <Input type="number" min="0" value={courseForm.price} onChange={(e) => setCourseForm({ ...courseForm, price: e.target.value })} className="mt-1 bg-white/5 border-white/10 text-white" />
                </div>
                <div>
                  <Label className="text-white/70">Valuta</Label>
                  <Input value={courseForm.currency} onChange={(e) => setCourseForm({ ...courseForm, currency: e.target.value })} className="mt-1 bg-white/5 border-white/10 text-white" />
                </div>
              </div>
              <div>
                <Label className="text-white/70">Data e nisjes</Label>
                <Input type="date" value={courseForm.start_date} onChange={(e) => setCourseForm({ ...courseForm, start_date: e.target.value })} required className="mt-1 bg-white/5 border-white/10 text-white" />
              </div>
              <div>
                <Label className="text-white/70">Mentori</Label>
                <select value={courseForm.mentor_email} onChange={(e) => setCourseForm({ ...courseForm, mentor_email: e.target.value })} className="mt-1 h-10 w-full rounded-md border border-white/10 bg-[#10182d] px-3 text-sm text-white">
                  <option value="">Pa mentor</option>
                  {users.filter(item => item.email).map(item => (
                    <option key={item.id || item.email} value={item.email}>{displayName(item)} - {item.email}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saveCourseMutation.isPending} className="flex-1 bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] font-semibold hover:opacity-90">
                  {saveCourseMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Ruaj
                </Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={resetForm} className="border-white/15 bg-white/5 text-white hover:bg-white/10">
                    Anulo
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Kurset</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingCourses ? (
                <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
              ) : courses.length === 0 ? (
                <p className="text-white/50 text-sm">Nuk ka kurse ende.</p>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {courses.map((course) => (
                    <div key={course.id} className="rounded-lg border border-white/10 bg-white/5 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-white font-semibold">{course.title}</h3>
                          <p className="text-white/50 text-sm">{course.category} - {formatDate(course.start_date)}</p>
                          <p className="text-white/45 text-xs mt-1">{[course.city, course.country].filter(Boolean).join(", ")} - {formatMoney(course.price, course.currency)}</p>
                        </div>
                        <Badge className="bg-white/10 text-white/65 border-white/10">{courseStatusLabels[course.status] || course.status}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-4">
                        <Button size="sm" onClick={() => editCourse(course)} variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10">
                          <Edit className="w-3.5 h-3.5 mr-1" /> Ndrysho
                        </Button>
                        <Button size="sm" onClick={() => archiveCourseMutation.mutate(course)} variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10">
                          <Archive className="w-3.5 h-3.5 mr-1" /> Arkivo
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Aplikimet</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingApplications ? (
                <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
              ) : applications.length === 0 ? (
                <p className="text-white/50 text-sm">Nuk ka aplikime ende.</p>
              ) : (
                <div className="space-y-3">
                  {applications.map((app) => {
                    const course = courseById.get(app.course_id);
                    const cert = certificateByApplication.get(app.id);
                    const passedEvaluation = evaluations.find(item => item.application_id === app.id && item.passed);
                    return (
                      <div key={app.id} className="rounded-lg border border-white/10 bg-white/5 p-4">
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="text-white font-semibold">{app.user_name || app.user_email}</h3>
                            <p className="text-white/55 text-sm">{course?.title || app.course_id}</p>
                            <p className="text-white/45 text-xs mt-1">{app.current_profession || "Pa profesion aktual"} -> {app.desired_profession || "Pa profesion te synuar"}</p>
                            {app.motivation && <p className="text-white/60 text-sm mt-2 line-clamp-2">{app.motivation}</p>}
                          </div>
                          <div className="flex flex-wrap gap-2 lg:justify-end">
                            <Badge className={applicationStatusClasses[app.status] || "bg-white/10 text-white/60 border-white/10"}>
                              {applicationStatusLabels[app.status] || app.status}
                            </Badge>
                            {cert && <Badge className="bg-green-500/20 text-green-300 border-green-500/30">Certifikuar</Badge>}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-4">
                          <Button size="sm" onClick={() => updateApplicationMutation.mutate({ app, status: "approved" })} disabled={app.status === "approved" || app.status === "completed"} className="bg-blue-500/20 text-blue-100 hover:bg-blue-500/30 border border-blue-500/30">
                            <CheckCircle className="w-3.5 h-3.5 mr-1" /> Prano
                          </Button>
                          <Button size="sm" onClick={() => updateApplicationMutation.mutate({ app, status: "rejected" })} disabled={app.status === "rejected" || app.status === "completed"} className="bg-red-500/20 text-red-100 hover:bg-red-500/30 border border-red-500/30">
                            <XCircle className="w-3.5 h-3.5 mr-1" /> Refuzo
                          </Button>
                          <Button size="sm" onClick={() => issueCertificateMutation.mutate(app)} disabled={!!cert || (!passedEvaluation && app.status !== "completed")} className="bg-green-500/20 text-green-100 hover:bg-green-500/30 border border-green-500/30">
                            <Award className="w-3.5 h-3.5 mr-1" /> Lesho certifikate
                          </Button>
                          {cert && (
                            <Button asChild size="sm" variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10">
                              <Link to={`/verify-certificate/${cert.certificate_number}`}>{cert.certificate_number}</Link>
                            </Button>
                          )}
                          <span className="flex items-center gap-1 text-white/40 text-xs ml-auto">
                            <UserCheck className="w-3.5 h-3.5" /> {app.phone || "Pa telefon"} {app.city ? `- ${app.city}` : ""}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
