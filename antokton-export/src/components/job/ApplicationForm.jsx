import React, { useState } from "react";
import { base44 } from "@/api/antoktonClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, X } from "lucide-react";
import { motion } from "framer-motion";

export default function ApplicationForm({ job, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [cvFile, setCvFile] = useState(null);
  const [form, setForm] = useState({
    applicant_name: "",
    applicant_email: "",
    applicant_phone: "",
    cover_letter: ""
  });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Madhësia e CV-së nuk duhet të kalojë 5MB");
        return;
      }
      setCvFile(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let cvUrl = null;
      
      if (cvFile) {
        const { data } = await base44.integrations.Core.UploadFile({ file: cvFile });
        cvUrl = data.file_url;
      }

      await base44.entities.JobApplication.create({
        job_id: job.id,
        applicant_email: form.applicant_email,
        applicant_name: form.applicant_name,
        applicant_phone: form.applicant_phone,
        cover_letter: form.cover_letter,
        cv_url: cvUrl,
        status: "applied"
      });

      onSuccess();
    } catch (error) {
      console.error("Application error:", error);
      alert("Gabim gjatë dërgimit të aplikimit. Ju lutem provoni përsëri.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-[#0b1020] border border-white/10 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Apliko për punë</h2>
            <p className="text-white/50 text-sm mt-1">{job.title}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-white/70">Emri dhe mbiemri *</Label>
            <Input
              required
              value={form.applicant_name}
              onChange={(e) => setForm({ ...form, applicant_name: e.target.value })}
              placeholder="Emri juaj i plotë"
              className="bg-white/5 border-white/10 text-white"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-white/70">Email *</Label>
            <Input
              required
              type="email"
              value={form.applicant_email}
              onChange={(e) => setForm({ ...form, applicant_email: e.target.value })}
              placeholder="email@example.com"
              className="bg-white/5 border-white/10 text-white"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-white/70">Telefon</Label>
            <Input
              value={form.applicant_phone}
              onChange={(e) => setForm({ ...form, applicant_phone: e.target.value })}
              placeholder="+355 69 123 4567"
              className="bg-white/5 border-white/10 text-white"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-white/70">Letra motivuese</Label>
            <Textarea
              value={form.cover_letter}
              onChange={(e) => setForm({ ...form, cover_letter: e.target.value })}
              placeholder="Trego pse je kandidati ideal për këtë pozicion..."
              className="bg-white/5 border-white/10 text-white min-h-[120px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-white/70">CV (PDF, DOC, DOCX - max 5MB)</Label>
            <div className="relative">
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                className="hidden"
                id="cv-upload"
              />
              <label
                htmlFor="cv-upload"
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 cursor-pointer transition-colors"
              >
                <Upload className="w-4 h-4" />
                {cvFile ? cvFile.name : "Ngarko CV"}
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-white/10 text-white hover:bg-white/5"
            >
              Anulo
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] hover:opacity-90"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Dërgo aplikimin"
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}