import React, { useState } from "react";
import { base44 } from "@/api/antoktonClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Mail, MessageCircle, Send, CheckCircle, Loader2, MapPin } from "lucide-react";
import { motion } from "framer-motion";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await base44.entities.ContactMessage.create({
        name: form.name,
        email: form.email,
        subject: form.subject,
        message: form.message,
        status: "new"
      });
      
      setSuccess(true);
      setForm({ name: "", email: "", subject: "", message: "" });
      setTimeout(() => setSuccess(false), 5000);
    } catch (error) {
      alert("Gabim në dërgim: " + error.message);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-16 h-16 bg-gradient-to-br from-[#8ab4ff] to-[#9bffd6] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-[#0b1020]" />
          </div>
          <h1 className="text-4xl font-black text-white mb-3 uppercase tracking-wide">Na kontaktoni</h1>
          <p className="text-white">Kemi pyetje? Na dërgoni një mesazh dhe do t'ju përgjigjemi sa më shpejt.</p>
        </motion.div>

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6 text-center"
          >
            <CheckCircle className="w-6 h-6 text-green-400 mx-auto mb-2" />
            <p className="text-green-300 font-medium">Mesazhi u dërgua me sukses!</p>
          </motion.div>
        )}

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Dërgoni një mesazh
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white">Emri i plotë *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({...form, name: e.target.value})}
                  required
                  placeholder="Emri dhe mbiemri"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white">Email *</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({...form, email: e.target.value})}
                  required
                  placeholder="email@example.com"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white">Subjekti *</Label>
                <Input
                  value={form.subject}
                  onChange={(e) => setForm({...form, subject: e.target.value})}
                  required
                  placeholder="Si mund t'ju ndihmojmë?"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white">Mesazhi *</Label>
                <Textarea
                  value={form.message}
                  onChange={(e) => setForm({...form, message: e.target.value})}
                  required
                  placeholder="Si mund t'ju ndihmojmë?"
                  rows={6}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] hover:opacity-90"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Send className="w-5 h-5 mr-2" />}
                Dërgo Mesazhin
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6 text-center">
              <Mail className="w-8 h-8 text-[#8ab4ff] mx-auto mb-3" />
              <h3 className="text-white font-semibold mb-1">Email</h3>
              <a href="mailto:info@antokton.com" className="text-[#8ab4ff] hover:text-[#9bffd6] text-sm transition-colors">
                info@antokton.com
              </a>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6 text-center">
              <MessageCircle className="w-8 h-8 text-[#9bffd6] mx-auto mb-3" />
              <h3 className="text-white font-semibold mb-1">Orari</h3>
              <p className="text-white text-sm">E Hënë - E Premte</p>
              <p className="text-white text-sm">09:00 - 18:00 CET</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6 text-center">
              <MapPin className="w-8 h-8 text-[#8ab4ff] mx-auto mb-3" />
              <h3 className="text-white font-semibold mb-1">Vendndodhja</h3>
              <p className="text-white text-sm">Brussels, BE</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}