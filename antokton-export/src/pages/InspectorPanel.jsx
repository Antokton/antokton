import React, { useState, useEffect } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Shield, Loader2, Search, CheckCircle, AlertCircle, Award, Upload, Users, Building2 } from "lucide-react";
import toast from "react-hot-toast";

export default function InspectorPanel() {
  const [user, setUser] = useState(null);
  const [searchEmail, setSearchEmail] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchType, setSearchType] = useState("individual");
  const [certificationForm, setCertificationForm] = useState({
    certification_type: "professional",
    level: 2,
    score: 40,
    notes: "",
    report_file: null,
    valid_for_months: 12
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const me = await base44.auth.me();
      if (me.role !== "admin" && me.role !== "inspector") {
        window.location.href = "/";
        return;
      }
      setUser(me);
    };
    loadUser();
  }, []);

  const { data: allUsers = [] } = useQuery({
    queryKey: ["allUsersInspector"],
    queryFn: () => base44.entities.User.list("-created_date", 1000),
    enabled: !!user
  });

  const { data: allCompanies = [] } = useQuery({
    queryKey: ["allCompanies"],
    queryFn: () => base44.entities.CompanyProfile.list("-created_date", 500),
    enabled: !!user
  });

  const { data: certifications = [] } = useQuery({
    queryKey: ["certifications", selectedUser?.email],
    queryFn: () => base44.entities.Certification.filter({ certified_entity_email: selectedUser.email }),
    enabled: !!selectedUser
  });

  const createCertificationMutation = useMutation({
    mutationFn: async (data) => {
      let report_url = null;
      
      if (certificationForm.report_file) {
        const { file_url } = await base44.integrations.Core.UploadFile({
          file: certificationForm.report_file
        });
        report_url = file_url;
      }

      const validUntil = new Date();
      validUntil.setMonth(validUntil.getMonth() + certificationForm.valid_for_months);

      const badgeType = certificationForm.level === 5 ? "diamond" : 
                       certificationForm.level === 4 ? "platinum" :
                       certificationForm.level === 3 ? "gold" :
                       certificationForm.level === 2 ? "silver" : "bronze";

      const inspectorName = user.first_name || user.surname
        ? `${user.first_name || ''} ${user.surname || ''}`.trim()
        : user.full_name || user.email;

      return base44.entities.Certification.create({
        ...data,
        badge_type: badgeType,
        report_url,
        valid_until: validUntil.toISOString(),
        inspector_name: inspectorName
      });
    },
    onSuccess: () => {
      toast.success("Certifikimi u krijua me sukses!");
      queryClient.invalidateQueries({ queryKey: ["certifications"] });
      setCertificationForm({
        certification_type: "professional",
        level: 2,
        score: 40,
        notes: "",
        report_file: null,
        valid_for_months: 12
      });
    }
  });

  const handleSearch = () => {
    if (searchType === "individual") {
      const found = allUsers.find(u => u.email.toLowerCase() === searchEmail.toLowerCase());
      if (found) {
        setSelectedUser({ ...found, entity_type: "individual" });
      } else {
        toast.error("Përdoruesi nuk u gjet");
      }
    } else {
      const found = allCompanies.find(c => c.owner_email.toLowerCase() === searchEmail.toLowerCase());
      if (found) {
        setSelectedUser({ ...found, entity_type: "company", email: found.owner_email });
      } else {
        toast.error("Kompania nuk u gjet");
      }
    }
  };

  const handleSubmitCertification = () => {
    if (!selectedUser) return;

    createCertificationMutation.mutate({
      certified_entity_email: selectedUser.email,
      entity_type: selectedUser.entity_type,
      certification_type: certificationForm.certification_type,
      level: certificationForm.level,
      score: certificationForm.score,
      inspector_email: user.email,
      notes: certificationForm.notes
    });
  };

  const getBadgeColor = (level) => {
    const colors = {
      1: "bg-amber-700 text-white",
      2: "bg-gray-400 text-gray-900",
      3: "bg-yellow-400 text-yellow-900",
      4: "bg-purple-400 text-purple-900",
      5: "bg-blue-400 text-blue-900"
    };
    return colors[level] || colors[1];
  };

  const getBadgeIcon = (level) => {
    if (level === 5) return "💎";
    if (level === 4) return "🏆";
    if (level === 3) return "🥇";
    if (level === 2) return "🥈";
    return "🥉";
  };

  if (!user) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2">
          <Shield className="w-8 h-8 text-[#8ab4ff]" />
          Paneli i Inspektorit
        </h1>
        <p className="text-white/50 mt-1">Certifiko anëtarë dhe firma për standarte profesionale, morale, halal dhe besueshmëri</p>
        {user && (
          <Badge className={
            user.role === 'admin' ? 'bg-red-500/20 text-red-400 border-red-500/30 mt-2' :
            user.role === 'inspector' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30 mt-2' :
            'bg-blue-500/20 text-blue-400 border-blue-500/30 mt-2'
          }>
            {user.role === 'admin' ? 'Administrator' :
             user.role === 'inspector' ? 'Inspektor' :
             'Moderator'}
          </Badge>
        )}
      </div>

      {/* All Members List */}
      {!selectedUser && (
        <Card className="bg-white/5 border-white/10 mb-6">
          <CardHeader>
            <CardTitle className="text-white">Lista e Anëtarëve</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {allUsers.map(u => (
                <button
                  key={u.id}
                  onClick={() => setSelectedUser({ ...u, entity_type: "individual" })}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all text-left border border-white/10"
                >
                  <div>
                    <p className="text-white font-medium">{u.first_name && u.surname ? `${u.first_name} ${u.surname}` : u.full_name || u.email}</p>
                    <p className="text-white/50 text-xs">{u.email}</p>
                  </div>
                  <Badge className="bg-white/10 text-white/70 border-white/20">{u.user_type || "job_seeker"}</Badge>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Entity */}
      <Card className="bg-white/5 border-white/10 mb-6">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex flex-col gap-2 mb-2">
              <p className="text-white/60 text-sm font-medium">Zgjedh kategorinë:</p>
              <div className="flex gap-4">
                <button
                  onClick={() => setSearchType("individual")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    searchType === "individual" 
                      ? "bg-[#8ab4ff] text-[#0b1020]" 
                      : "bg-white/5 text-white/60 hover:text-white"
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Anëtarë individualë
                </button>
                <button
                  onClick={() => setSearchType("company")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    searchType === "company" 
                      ? "bg-[#8ab4ff] text-[#0b1020]" 
                      : "bg-white/5 text-white/60 hover:text-white"
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  Kompani
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                placeholder={searchType === "individual" ? "Email i anëtarit..." : "Email i pronarit të kompanisë..."}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/60 flex-1"
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} className="bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020]">
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Entity Info */}
      {selectedUser && (
        <>
          <Card className="bg-white/5 border-white/10 mb-6">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="text-white flex items-center gap-2">
                {selectedUser.entity_type === "individual" ? <Users className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                {selectedUser.entity_type === "individual" ? "Anëtari i zgjedhur" : "Kompania e zgjedhur"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-white/60 text-sm">Emri:</span>
                  <span className="text-white font-medium">
                    {selectedUser.entity_type === "individual" 
                      ? `${selectedUser.first_name || ""} ${selectedUser.surname || ""}`
                      : selectedUser.company_name
                    }
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60 text-sm">Email:</span>
                  <span className="text-white">{selectedUser.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60 text-sm">Lloji:</span>
                  <Badge className="bg-white/10 text-white border-white/20">
                    {selectedUser.entity_type === "individual" 
                      ? (selectedUser.user_type === 'job_seeker' ? 'Punëkërkues' :
                         selectedUser.user_type === 'employer' ? 'Punëdhënës' :
                         selectedUser.user_type === 'recruiter' ? 'Rekrutues' : 'Anëtar')
                      : "Kompani"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Existing Certifications */}
          {certifications.length > 0 && (
            <Card className="bg-white/5 border-white/10 mb-6">
              <CardHeader className="border-b border-white/10">
                <CardTitle className="text-white flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Certifikimet ekzistuese
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {certifications.map(cert => (
                   <div key={cert.id} className="bg-white/5 p-4 rounded-lg border border-white/10">
                     <div className="flex items-center justify-between mb-2">
                       <div className="flex items-center gap-2">
                         <span className="text-2xl">{getBadgeIcon(cert.level)}</span>
                         <Badge className={getBadgeColor(cert.level)}>
                           Niveli {cert.level}
                         </Badge>
                       </div>
                       <Badge variant="outline" className="text-white/60 border-white/20">
                         {cert.certification_type}
                       </Badge>
                     </div>
                     <div className="text-white/60 text-sm">
                       Pikët: {cert.score}/100
                     </div>
                     {cert.valid_until && (
                       <div className="text-white/40 text-xs mt-1">
                         Skadenca: {new Date(cert.valid_until).toLocaleDateString()}
                       </div>
                     )}
                     {(user.role === 'admin' || user.role === 'inspector') && (
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setCertificationForm({
                                certification_type: cert.certification_type,
                                level: cert.level,
                                score: cert.score,
                                notes: cert.notes || "",
                                report_file: null,
                                valid_for_months: 12
                              });
                            }}
                            className="text-blue-400 border-blue-400/50 hover:bg-blue-400/10 text-xs"
                          >
                            Përpuno
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (confirm('A jeni të sigurt që dëshironi ta revokoni këtë certifikim?')) {
                                base44.entities.Certification.update(cert.id, {
                                  is_active: false,
                                  revoked_at: new Date().toISOString(),
                                  revoked_by: user.email
                                }).then(() => {
                                  queryClient.invalidateQueries({ queryKey: ["certifications"] });
                                  toast.success("Certifikimi u revokua!");
                                });
                              }
                            }}
                            className="text-red-400 border-red-400/50 hover:bg-red-400/10 text-xs"
                          >
                            Revoko
                          </Button>
                        </div>
                      )}
                      <p className="text-white/40 text-xs mt-2">
                        Lëshuar nga: {(() => {
                          if (cert.inspector_name) return cert.inspector_name;
                          const inspector = allUsers.find(u => u.email === cert.inspector_email);
                          if (!inspector) return cert.inspector_email;
                          const name = [inspector.first_name, inspector.surname].filter(Boolean).join(' ');
                          return name || inspector.full_name || cert.inspector_email;
                        })()}
                      </p>
                   </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Certification Form */}
      {selectedUser && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <Award className="w-5 h-5" />
              Krijo certifikim të ri
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Certification Type */}
              <div className="space-y-2">
                <Label className="text-white/70">Lloji i certifikimit</Label>
                <Select
                  value={certificationForm.certification_type}
                  onValueChange={(v) => setCertificationForm({ ...certificationForm, certification_type: v })}
                >
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0b1020] border-white/20">
                    <SelectItem value="professional" className="text-white">Profesional</SelectItem>
                    <SelectItem value="moral" className="text-white">Moral</SelectItem>
                    <SelectItem value="halal" className="text-white">Halal</SelectItem>
                    <SelectItem value="trustworthiness" className="text-white">Besueshmëri</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Level */}
              <div className="space-y-2">
                <Label className="text-white/70">Niveli</Label>
                <Select
                  value={certificationForm.level.toString()}
                  onValueChange={(v) => setCertificationForm({ ...certificationForm, level: parseInt(v) })}
                >
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0b1020] border-white/20">
                    {certificationForm.certification_type === "professional" && (
                      <>
                        <SelectItem value="2" className="text-white">Fillestar</SelectItem>
                        <SelectItem value="3" className="text-white">Mesatar</SelectItem>
                        <SelectItem value="4" className="text-white">Profesional</SelectItem>
                        <SelectItem value="5" className="text-white">Ekspert</SelectItem>
                      </>
                    )}
                    {certificationForm.certification_type === "moral" && (
                      <>
                        <SelectItem value="2" className="text-white">Bazë</SelectItem>
                        <SelectItem value="3" className="text-white">Mbi bazë</SelectItem>
                        <SelectItem value="4" className="text-white">Moral i lartë</SelectItem>
                        <SelectItem value="5" className="text-white">Udhëheqës në morale</SelectItem>
                      </>
                    )}
                    {certificationForm.certification_type === "halal" && (
                      <>
                        <SelectItem value="2" className="text-white">I përzier</SelectItem>
                        <SelectItem value="3" className="text-white">I pastër</SelectItem>
                      </>
                    )}
                    {certificationForm.certification_type === "trustworthiness" && (
                      <>
                        <SelectItem value="2" className="text-white">Me pak referenca</SelectItem>
                        <SelectItem value="3" className="text-white">Me referenca të përziera</SelectItem>
                        <SelectItem value="4" className="text-white">Me shumë referenca të mira e fare pak tjera</SelectItem>
                        <SelectItem value="5" className="text-white">Me referenca vetëm të mira</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Score */}
              <div className="space-y-2">
                <Label className="text-white/70">Pikët (0-100)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={certificationForm.score}
                  onChange={(e) => setCertificationForm({ ...certificationForm, score: parseInt(e.target.value) || 0 })}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                />
              </div>

              {/* Validity */}
              <div className="space-y-2">
                <Label className="text-white/70">Vlefshmëria (muaj)</Label>
                <Input
                  type="number"
                  min="1"
                  max="60"
                  value={certificationForm.valid_for_months}
                  onChange={(e) => setCertificationForm({ ...certificationForm, valid_for_months: parseInt(e.target.value) || 12 })}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-white/70">Shënime nga inspektori</Label>
              <Textarea
                value={certificationForm.notes}
                onChange={(e) => setCertificationForm({ ...certificationForm, notes: e.target.value })}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                placeholder="Shënime të brendshme për certifikimin..."
                rows={3}
              />
            </div>

            {/* Report Upload */}
            <div className="space-y-2">
              <Label className="text-white/70">Ngarko raport mbështetës (opsional)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  onChange={(e) => setCertificationForm({ ...certificationForm, report_file: e.target.files?.[0] })}
                  className="bg-white/10 border-white/20 text-white"
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                />
                <Upload className="w-5 h-5 text-white/40" />
              </div>
              <p className="text-white/40 text-xs">Formatet e pranuara: PDF, DOC, DOCX, TXT, JPG, PNG</p>
            </div>

            {/* Preview Badge */}
            <div className="p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{getBadgeIcon(certificationForm.level)}</span>
                  <div>
                    <div className="text-white font-medium">Paraparje e badge-it</div>
                    <Badge className={getBadgeColor(certificationForm.level)}>
                      Niveli {certificationForm.level}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white/60 text-sm">{certificationForm.certification_type}</div>
                  <div className="text-white font-medium">{certificationForm.score}/100</div>
                </div>
              </div>
            </div>

            <Button
              onClick={handleSubmitCertification}
              disabled={createCertificationMutation.isPending}
              className="w-full bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] font-semibold"
            >
              {createCertificationMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Krijo certifikimin
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}