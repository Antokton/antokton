import React, { useEffect, useState } from "react";
import { base44 } from "@/api/antoktonClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Mail, MessageCircle, Send, CheckCircle, Loader2, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

const chatCategories = [
  "Edukim",
  "Media",
  "Certifikim",
  "Bamirësi",
  "Biletat & Udhëtime",
  "Punë në Europë",
  "Shërbime",
  "Probleme teknike",
  "Administrata"
];

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", category: "support", subject: "", message: "" });
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [chatCategory, setChatCategory] = useState("Administrata");
  const [chatMessage, setChatMessage] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSuccess, setChatSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    base44.auth.isAuthenticated()
      .then((auth) => (auth ? base44.auth.me() : null))
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const categoryLabels = {
    support: "Ndihmë / pyetje",
    abuse: "Raportim abuzimi ose sigurie",
    privacy: "Privatësi / të dhëna personale",
    legal: "Terma / çështje ligjore"
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      const target = `${window.location.origin}/Contact?chat=1&category=${encodeURIComponent(chatCategory)}`;
      base44.auth.redirectToLogin(target);
      return;
    }

    setChatLoading(true);
    try {
      await base44.entities.StaffMessage.create({
        sender_email: user.email,
        category: chatCategory,
        message: `[${chatCategory}] ${chatMessage || "Kërkesë për kontakt nga faqja Kontakt."}`,
        is_resolved: false
      });
      setChatMessage("");
      setChatSuccess(true);
      setTimeout(() => setChatSuccess(false), 5000);
    } catch (error) {
      alert("Gabim në hapjen e chat-it: " + error.message);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await base44.entities.ContactMessage.create({
        name: form.name,
        email: form.email,
        subject: `[${categoryLabels[form.category]}] ${form.subject}`,
        message: `Kategoria: ${categoryLabels[form.category]}\n\n${form.message}`,
        status: "new"
      });
      
      setSuccess(true);
      setForm({ name: "", email: "", category: "support", subject: "", message: "" });
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
          <p className="text-white">Na shkruaj direkt në chat-in e brendshëm ose dërgo një mesazh me email.</p>
        </motion.div>

        <Card id="antokton-chat" className="bg-white/5 border-[#9bffd6]/25 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-[#9bffd6]" />
              Na shkruaj direkt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChatSubmit} className="space-y-4">
              <div>
                <p className="text-sm text-white/65 mb-3">
                  Zgjidh kategorinë që biseda t'i drejtohet ekipit përkatës. Kanali kryesor i kontaktit është chat-i brenda Antokton.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {chatCategories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setChatCategory(category)}
                      className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                        chatCategory === category
                          ? "border-[#9bffd6]/50 bg-[#9bffd6]/15 text-white"
                          : "border-white/10 bg-white/5 text-white/65 hover:bg-white/10"
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Mesazhi</Label>
                <Textarea
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="Shkruaj shkurt çfarë të duhet..."
                  rows={4}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              {chatSuccess && (
                <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-300">
                  Biseda u hap me sukses. Mund ta ndiqni te Mesazher.
                </div>
              )}

              {!user && (
                <div className="flex items-start gap-2 rounded-xl border border-[#8ab4ff]/20 bg-[#8ab4ff]/10 p-3 text-sm text-white/70">
                  <ShieldCheck className="w-4 h-4 text-[#8ab4ff] mt-0.5 shrink-0" />
                  Për të hapur chat-in e brendshëm duhet të hysh në llogari. Pas hyrjes kthehesh te kjo faqe.
                </div>
              )}

              <Button
                type="submit"
                disabled={chatLoading}
                className="w-full bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] hover:opacity-90"
              >
                {chatLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <MessageCircle className="w-5 h-5 mr-2" />}
                Na shkruaj direkt
              </Button>
            </form>
          </CardContent>
        </Card>

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
                <Label className="text-white">Kategoria *</Label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  required
                  className="h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white"
                >
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <option key={value} value={value} className="bg-[#0b1020] text-white">
                      {label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-white/50">
                  Për raportime urgjente zgjidhni abuzim/siguri që mesazhi të identifikohet qartë nga stafi.
                </p>
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

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <h3 className="text-white font-semibold mb-1">Chat brenda Antokton</h3>
              <a href="#antokton-chat" className="text-[#9bffd6] hover:text-[#8ab4ff] text-sm transition-colors">
                Na shkruaj direkt
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
