import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/antoktonClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { Award, Calendar, CheckCircle, Clock, FileText, Loader2, MapPin, Upload, User } from "lucide-react";
import { applicationStatusClasses, applicationStatusLabels, displayName, formatDate, formatMoney, normalizeList } from "@/lib/akademia";

const initialForm = {
  motivation: "",
  current_profession: "",
  desired_profession: "",
  phone: "",
  city: ""
};

export default function AkademiaCourseDetail() {
  const { courseId } = useParams();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [files, setFiles] = useState([]);
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    base44.auth.isAuthenticated().then((authenticated) => {
      if (authenticated) {
        base44.auth.me().then((me) => {
          setCurrentUser(me);
          setForm((prev) => ({
            ...prev,
            phone: me.phone || me.phone_number || prev.phone,
            city: me.city || me.birthplace || prev.city,
            current_profession: me.job_title || prev.current_profession
          }));
        }).catch(() => {});
      }
    });
  }, []);

  const { data: course, isLoading } = useQuery({
    queryKey: ["akademiaCourse", courseId],
    queryFn: () => base44.entities.AkademiaCourse.get(courseId),
    enabled: !!courseId
  });

  const { data: applications = [] } = useQuery({
    queryKey: ["akademiaApplications", currentUser?.email],
    queryFn: () => base44.entities.AkademiaApplication.list("-created_date", 500),
    enabled: !!currentUser?.email
  });

  const myApplication = useMemo(() => {
    if (!currentUser || !course) return null;
    return applications.find(app =>
      app.course_id === course.id &&
      (app.user_id === currentUser.id || app.user_email === currentUser.email)
    );
  }, [applications, course, currentUser]);

  const dailyProgram = normalizeList(course?.daily_program);
  const requirements = normalizeList(course?.requirements);

  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser) {
        base44.auth.redirectToLogin(window.location.href);
        return null;
      }

      const documentUrls = [];
      for (const file of files) {
        const uploaded = await base44.integrations.Core.UploadFile({ file });
        documentUrls.push(uploaded.file_url || uploaded.url);
      }

      return base44.entities.AkademiaApplication.create({
        course_id: course.id,
        user_id: currentUser.id,
        user_email: currentUser.email,
        user_name: displayName(currentUser),
        motivation: form.motivation,
        current_profession: form.current_profession,
        desired_profession: form.desired_profession,
        phone: form.phone,
        city: form.city,
        document_urls: documentUrls,
        status: "pending"
      });
    },
    onSuccess: (created) => {
      if (!created) return;
      queryClient.invalidateQueries({ queryKey: ["akademiaApplications"] });
      setFiles([]);
      setForm(initialForm);
      toast({ title: "Aplikimi u dergua", description: "Administratori do ta shqyrtoje aplikimin tuaj." });
    },
    onError: (error) => toast({ title: "Aplikimi deshtoi", description: error.message, variant: "destructive" })
  });

  const canApply = currentUser && !myApplication && (course?.status || "active") === "active";

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 text-white/30 animate-spin" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-white text-2xl font-bold mb-3">Kursi nuk u gjet</h1>
        <Button asChild><Link to="/akademia">Kthehu te Akademia</Link></Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <Link to="/akademia" className="text-[#8ab4ff] hover:text-[#9bffd6] text-sm">Akademia Antokton</Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-6">
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Badge className="bg-[#8ab4ff]/15 text-[#8ab4ff] border-[#8ab4ff]/30">{course.category || "Praktike"}</Badge>
                <Badge className="bg-[#9bffd6]/15 text-[#9bffd6] border-[#9bffd6]/30">
                  <Award className="w-3.5 h-3.5 mr-1" />
                  Certifikim
                </Badge>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">{course.title}</h1>
              <p className="text-white/70 leading-relaxed whitespace-pre-line">{course.description}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
                <div className="flex items-center gap-2 text-white/65"><MapPin className="w-4 h-4 text-[#9bffd6]" /> {[course.city, course.country].filter(Boolean).join(", ")}</div>
                <div className="flex items-center gap-2 text-white/65"><Clock className="w-4 h-4 text-[#9bffd6]" /> {course.duration_days || 5} dite</div>
                <div className="flex items-center gap-2 text-white/65"><Calendar className="w-4 h-4 text-[#9bffd6]" /> Fillon {formatDate(course.start_date)}</div>
                <div className="flex items-center gap-2 text-white/65"><FileText className="w-4 h-4 text-[#9bffd6]" /> {formatMoney(course.price, course.currency)}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Programi ditor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {dailyProgram.length === 0 ? (
                <p className="text-white/50 text-sm">Programi do te publikohet se shpejti.</p>
              ) : dailyProgram.map((item, index) => (
                <div key={index} className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-start gap-3">
                    <span className="w-9 h-9 rounded-full bg-[#8ab4ff]/15 text-[#8ab4ff] flex items-center justify-center text-sm font-semibold shrink-0">
                      {typeof item === "object" ? item.day || index + 1 : index + 1}
                    </span>
                    <div>
                      <h3 className="text-white font-semibold">{typeof item === "object" ? item.title || `Dita ${index + 1}` : `Dita ${index + 1}`}</h3>
                      <p className="text-white/60 text-sm mt-1">{typeof item === "object" ? item.description : item}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Kerkesat</CardTitle>
            </CardHeader>
            <CardContent>
              {requirements.length === 0 ? (
                <p className="text-white/50 text-sm">Nuk ka kerkesa te vecanta per kete kurs.</p>
              ) : (
                <div className="space-y-2">
                  {requirements.map((item, index) => (
                    <div key={index} className="flex items-start gap-2 text-white/70 text-sm">
                      <CheckCircle className="w-4 h-4 text-[#9bffd6] mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <User className="w-5 h-5 text-[#8ab4ff]" />
                Mentori
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-white font-semibold">{course.mentor_name || "Mentor caktohet nga Antokton"}</p>
              {course.mentor_email && <p className="text-white/50 text-sm mt-1">{course.mentor_email}</p>}
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Apliko per kete kurs</CardTitle>
            </CardHeader>
            <CardContent>
              {!currentUser ? (
                <Button onClick={() => base44.auth.redirectToLogin(window.location.href)} className="w-full bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] font-semibold hover:opacity-90">
                  Hyr per te aplikuar
                </Button>
              ) : myApplication ? (
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <p className="text-white font-semibold mb-2">Ju keni aplikuar per kete kurs.</p>
                  <Badge className={applicationStatusClasses[myApplication.status] || "bg-white/10 text-white/60 border-white/10"}>
                    {applicationStatusLabels[myApplication.status] || myApplication.status}
                  </Badge>
                </div>
              ) : (
                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    applyMutation.mutate();
                  }}
                >
                  <div>
                    <Label className="text-white/70">Motivimi</Label>
                    <Textarea value={form.motivation} onChange={(e) => setForm({ ...form, motivation: e.target.value })} required className="mt-1 bg-white/5 border-white/10 text-white min-h-28" />
                  </div>
                  <div>
                    <Label className="text-white/70">Profesioni aktual</Label>
                    <Input value={form.current_profession} onChange={(e) => setForm({ ...form, current_profession: e.target.value })} className="mt-1 bg-white/5 border-white/10 text-white" />
                  </div>
                  <div>
                    <Label className="text-white/70">Profesioni qe deshironi</Label>
                    <Input value={form.desired_profession} onChange={(e) => setForm({ ...form, desired_profession: e.target.value })} className="mt-1 bg-white/5 border-white/10 text-white" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                    <div>
                      <Label className="text-white/70">Telefoni</Label>
                      <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required className="mt-1 bg-white/5 border-white/10 text-white" />
                    </div>
                    <div>
                      <Label className="text-white/70">Qyteti</Label>
                      <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required className="mt-1 bg-white/5 border-white/10 text-white" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-white/70">Dokumente opsionale</Label>
                    <Input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} className="mt-1 bg-white/5 border-white/10 text-white file:text-white" />
                    {files.length > 0 && <p className="text-white/40 text-xs mt-1">{files.length} file te zgjedhura</p>}
                  </div>
                  <Button type="submit" disabled={!canApply || applyMutation.isPending} className="w-full bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] font-semibold hover:opacity-90">
                    {applyMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                    Apliko per kete kurs
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
