import React, { useState } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Upload, FileText, CheckCircle, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import moment from "moment";

export default function UserReferences({ userEmail, isOwnProfile }) {
  const [showForm, setShowForm] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    referee_name: "",
    referee_email: "",
    relationship: "colleague",
    relationship_description: "",
    work_description: "",
    rating: 5,
    professionalism: 5,
    reliability: 5,
    communication: 5,
    supporting_documents: []
  });

  const { data: references = [] } = useQuery({
    queryKey: ["userReferences", userEmail],
    queryFn: () => base44.entities.UserReference.filter({ referenced_user_email: userEmail }),
    enabled: !!userEmail
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.UserReference.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userReferences"] });
      setShowForm(false);
      setForm({
        referee_name: "",
        referee_email: "",
        relationship: "colleague",
        relationship_description: "",
        work_description: "",
        rating: 5,
        professionalism: 5,
        reliability: 5,
        communication: 5,
        supporting_documents: []
      });
      alert("Referenca u shtua me sukses!");
    }
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingDoc(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm({
      ...form,
      supporting_documents: [
        ...(form.supporting_documents || []),
        { title: file.name, url: file_url }
      ]
    });
    setUploadingDoc(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      ...form,
      referenced_user_email: userEmail
    });
  };

  const verifiedRefs = references.filter(r => r.is_verified);
  const avgRating = verifiedRefs.length > 0
    ? (verifiedRefs.reduce((sum, r) => sum + r.rating, 0) / verifiedRefs.length).toFixed(1)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Referenca të Verifikuara</h3>
          {avgRating && (
            <p className="text-white/60 text-sm mt-1">
              Vlerësim mesatar: {avgRating} ⭐ ({verifiedRefs.length} referenca)
            </p>
          )}
        </div>
        <Button
          onClick={() => setShowForm(true)}
          variant="outline"
          size="sm"
          className="bg-white/10 border-white/30 text-white hover:bg-white/15 hover:text-white"
        >
          Shto Referencë
        </Button>
      </div>

      {references.length === 0 ? (
        <p className="text-white/40 text-center py-8 text-sm">Nuk ka ende referenca</p>
      ) : (
        <div className="space-y-3">
          {references.map((ref) => (
            <Card key={ref.id} className="bg-white/5 border-white/10">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-white font-medium">{ref.referee_name}</h4>
                    <p className="text-white/60 text-xs">{ref.relationship_description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-yellow-500/20 text-yellow-400">
                      {ref.rating} ⭐
                    </Badge>
                    {ref.is_verified && (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Verifikuar
                      </Badge>
                    )}
                  </div>
                </div>

                <p className="text-white/70 text-sm mb-3">{ref.work_description}</p>

                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="text-center p-2 rounded-lg bg-white/5">
                    <p className="text-white/40 text-xs">Profesionalizëm</p>
                    <p className="text-white font-medium text-sm">{ref.professionalism}⭐</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-white/5">
                    <p className="text-white/40 text-xs">Besueshmëri</p>
                    <p className="text-white font-medium text-sm">{ref.reliability}⭐</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-white/5">
                    <p className="text-white/40 text-xs">Komunikim</p>
                    <p className="text-white font-medium text-sm">{ref.communication}⭐</p>
                  </div>
                </div>

                {ref.supporting_documents?.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-white/50 text-xs font-medium">Dokumente:</p>
                    {ref.supporting_documents.map((doc, i) => (
                      <a
                        key={i}
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-[#8ab4ff] hover:text-[#9bffd6] text-xs"
                      >
                        <FileText className="w-3 h-3" />
                        {doc.title}
                      </a>
                    ))}
                  </div>
                )}

                <p className="text-white/30 text-xs mt-3">
                  {moment(ref.created_date).fromNow()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0b1020] border border-white/10 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Shto Referencë</h2>
                <button onClick={() => setShowForm(false)} className="text-white/40 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-white/70">Emri i plotë *</Label>
                    <Input
                      required
                      value={form.referee_name}
                      onChange={(e) => setForm({ ...form, referee_name: e.target.value })}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-white/70">Email</Label>
                    <Input
                      type="email"
                      value={form.referee_email}
                      onChange={(e) => setForm({ ...form, referee_email: e.target.value })}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-white/70">Marrëdhënia *</Label>
                    <Select value={form.relationship} onValueChange={(v) => setForm({ ...form, relationship: v })}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0b1020] border-white/20">
                        <SelectItem value="colleague" className="text-white">Kolegu</SelectItem>
                        <SelectItem value="supervisor" className="text-white">Mbikqyrës</SelectItem>
                        <SelectItem value="employee" className="text-white">Punonjës</SelectItem>
                        <SelectItem value="client" className="text-white">Klient</SelectItem>
                        <SelectItem value="other" className="text-white">Tjetër</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-white/70">Si e njihni? *</Label>
                    <Input
                      required
                      value={form.relationship_description}
                      onChange={(e) => setForm({ ...form, relationship_description: e.target.value })}
                      placeholder="P.sh. Punuam së bashku 2 vjet"
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-white/70">Përshkrimi i punës së bërë *</Label>
                  <Textarea
                    required
                    value={form.work_description}
                    onChange={(e) => setForm({ ...form, work_description: e.target.value })}
                    placeholder="Përshkruani punën e bërë së bashku..."
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/60 min-h-[100px]"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {['rating', 'professionalism', 'reliability', 'communication'].map(field => (
                    <div key={field} className="space-y-1.5">
                      <Label className="text-white/70 text-xs">
                        {field === 'rating' ? 'Vlerësim' :
                         field === 'professionalism' ? 'Profesionalizëm' :
                         field === 'reliability' ? 'Besueshmëri' : 'Komunikim'}
                      </Label>
                      <Select value={String(form[field])} onValueChange={(v) => setForm({ ...form, [field]: Number(v) })}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0b1020] border-white/20">
                          {[1, 2, 3, 4, 5].map(n => (
                            <SelectItem key={n} value={String(n)} className="text-white">{n} ⭐</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label className="text-white/70 text-sm">Dokumente mbështetëse (opsionale)</Label>
                  <div className="flex items-center gap-2">
                    <label className="flex-1 cursor-pointer">
                      <div className="border border-dashed border-white/20 rounded-lg p-3 text-center hover:bg-white/5 transition-colors">
                        {uploadingDoc ? (
                          <Loader2 className="w-5 h-5 mx-auto text-white/40 animate-spin" />
                        ) : (
                          <>
                            <Upload className="w-5 h-5 mx-auto text-white/40 mb-1" />
                            <p className="text-white/50 text-xs">Ngarko dokument</p>
                          </>
                        )}
                      </div>
                      <input
                        type="file"
                        onChange={handleFileUpload}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      />
                    </label>
                  </div>
                  {form.supporting_documents?.length > 0 && (
                    <div className="space-y-1">
                      {form.supporting_documents.map((doc, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                          <span className="text-white/70 text-xs flex items-center gap-2">
                            <FileText className="w-3 h-3" />
                            {doc.title}
                          </span>
                          <button
                            type="button"
                            onClick={() => setForm({
                              ...form,
                              supporting_documents: form.supporting_documents.filter((_, idx) => idx !== i)
                            })}
                            className="text-red-400 hover:text-red-300"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                    className="flex-1 border-white/10 text-white hover:bg-white/5"
                  >
                    Anulo
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="flex-1 bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] hover:opacity-90"
                  >
                    {createMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Ruaj Referencën"
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}