import React, { useState } from "react";
import { base44 } from "@/api/antoktonClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plane, Bus, Train, Truck, Send, Loader2, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

const transportTypes = [
  { value: "avion", label: "Avion", icon: Plane },
  { value: "autobus", label: "Autobus", icon: Bus },
  { value: "tren", label: "Tren", icon: Train },
  { value: "furgon", label: "Furgon", icon: Truck },
  { value: "transport_mallrash", label: "Transport Mallrash", icon: Truck },
];

const emptyForm = {
  transport_type: "", request_type: "udhetar",
  from: "", to: "", departure_date: "", return_date: "",
  passengers: "1", ages: "", preferred_vehicle: "",
  // mallra
  cargo_type: "", cargo_weight: "", cargo_size: "",
  // kontakt
  contact_name: "", contact_email: "", contact_phone: "",
  contact_whatsapp: "", contact_other: "",
  notes: ""
};

export default function Bileta() {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Dërgo email me të dhënat
    try {
      const isAuthenticated = await base44.auth.isAuthenticated();
      const user = isAuthenticated ? await base44.auth.me() : null;

      const details = form.request_type === "udhetar"
        ? `Udhëtar: ${form.passengers} persona, Moshat: ${form.ages || "N/A"}`
        : `Mall: ${form.cargo_type}, Pesha: ${form.cargo_weight}, Madhësia: ${form.cargo_size}`;

      await base44.integrations.Core.SendEmail({
        to: "info@antokton.com",
        subject: `Kërkesë Bilete - ${form.transport_type} ${form.from} → ${form.to}`,
        body: `Kërkesë e re për biletë/transport:\n\nLloji: ${form.transport_type}\nNga: ${form.from}\nDeri: ${form.to}\nData nisjes: ${form.departure_date}\nData kthimit: ${form.return_date || "Vetëm vajtje"}\n\n${details}\n\nKontakt:\nEmri: ${form.contact_name}\nEmail: ${form.contact_email}\nTelefon: ${form.contact_phone}\nWhatsApp: ${form.contact_whatsapp || "N/A"}\nKontakt tjetër: ${form.contact_other || "N/A"}\n\nShënime: ${form.notes || "Asnjë"}\n\nPërdoruesi: ${user?.email || "Jo i regjistruar"}`,
      });
    } catch (err) {
      console.error("Email error:", err);
    }

    setLoading(false);
    setSuccess(true);
  };

  if (success) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Kërkesa u dërgua!</h2>
        <p className="text-white/60 mb-2">Po gjenerojmë çmimin dhe do t'ju kontaktojmë së shpejti.</p>
        <p className="text-white/40 text-sm mb-6">Nëse nuk doni të prisni, na kontaktoni direkt në <span className="text-[#8ab4ff]">info@antokton.com</span></p>
        <Button onClick={() => { setSuccess(false); setForm(emptyForm); }}
          className="bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] hover:opacity-90 border-0">
          Kërkesë e re
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Bileta & Transport</h1>
        <p className="mt-1 text-sm text-white/60">Plotëso të dhënat dhe ne do të gjenerojmë çmimin për ju</p>
      </div>

      <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSubmit}
        className="rounded-2xl p-6 sm:p-8 space-y-5"
        style={{ backgroundColor: 'var(--bg2)', borderColor: 'var(--line)', borderWidth: '1px' }}>

        {/* Lloji i transportit */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-white">Mjeti i transportit *</Label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {transportTypes.map(t => {
              const Icon = t.icon;
              return (
                <button key={t.value} type="button"
                  onClick={() => setForm({ ...form, transport_type: t.value })}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-xs font-medium ${
                    form.transport_type === t.value
                      ? "border-[#8ab4ff] bg-[#8ab4ff]/10 text-[#8ab4ff]"
                      : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                  }`}>
                  <Icon className="w-5 h-5" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Lloji i kërkesës */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-white">Lloji i kërkesës *</Label>
          <Select value={form.request_type} onValueChange={(v) => setForm({ ...form, request_type: v })}>
            <SelectTrigger className="h-11" style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--line)', color: 'var(--text)' }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="udhetar">Për udhëtar / persona</SelectItem>
              <SelectItem value="mall">Për mall / ngarkesë</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Nisja → Destinacioni */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-white">Nisja (qyteti/vendi) *</Label>
            <Input required value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })}
              placeholder="P.sh. Prishtinë" className="h-11"
              style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--line)', color: 'var(--text)' }} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-white">Destinacioni *</Label>
            <Input required value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })}
              placeholder="P.sh. Frankfurt" className="h-11"
              style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--line)', color: 'var(--text)' }} />
          </div>
        </div>

        {/* Datat */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-white">Data e nisjes *</Label>
            <Input required type="date" value={form.departure_date}
              onChange={(e) => setForm({ ...form, departure_date: e.target.value })} className="h-11"
              style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--line)', color: 'var(--text)' }} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-white">Data e kthimit (opsionale)</Label>
            <Input type="date" value={form.return_date}
              onChange={(e) => setForm({ ...form, return_date: e.target.value })} className="h-11"
              style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--line)', color: 'var(--text)' }} />
          </div>
        </div>

        {/* Udhëtar ose Mall */}
        {form.request_type === "udhetar" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-white">Numri i personave *</Label>
              <Select value={form.passengers} onValueChange={(v) => setForm({ ...form, passengers: v })}>
                <SelectTrigger className="h-11" style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--line)', color: 'var(--text)' }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => <SelectItem key={n} value={String(n)}>{n} person{n > 1 ? "a" : ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-white">Moshat e udhëtarëve</Label>
              <Input value={form.ages} onChange={(e) => setForm({ ...form, ages: e.target.value })}
                placeholder="P.sh. 35, 32, 8" className="h-11"
                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--line)', color: 'var(--text)' }} />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-white">Lloji i mallit *</Label>
              <Input required value={form.cargo_type} onChange={(e) => setForm({ ...form, cargo_type: e.target.value })}
                placeholder="P.sh. Mobilje" className="h-11"
                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--line)', color: 'var(--text)' }} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-white">Pesha (kg)</Label>
              <Input value={form.cargo_weight} onChange={(e) => setForm({ ...form, cargo_weight: e.target.value })}
                placeholder="P.sh. 500 kg" className="h-11"
                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--line)', color: 'var(--text)' }} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-white">Madhësia</Label>
              <Input value={form.cargo_size} onChange={(e) => setForm({ ...form, cargo_size: e.target.value })}
                placeholder="P.sh. 2x1x1.5m" className="h-11"
                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--line)', color: 'var(--text)' }} />
            </div>
          </div>
        )}

        {/* Kontakti */}
        <div className="pt-2 border-t border-white/10 space-y-4">
          <p className="text-sm font-medium text-white/60">Të dhënat e kontaktit</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-white">Emri *</Label>
              <Input required value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                placeholder="Emri juaj" className="h-11"
                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--line)', color: 'var(--text)' }} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-white">Email *</Label>
              <Input required type="email" value={form.contact_email}
                onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                placeholder="email@juaj.com" className="h-11"
                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--line)', color: 'var(--text)' }} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-white">Telefon</Label>
              <Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                placeholder="+383..." className="h-11"
                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--line)', color: 'var(--text)' }} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-white">WhatsApp</Label>
              <Input value={form.contact_whatsapp} onChange={(e) => setForm({ ...form, contact_whatsapp: e.target.value })}
                placeholder="+383... (WhatsApp)" className="h-11"
                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--line)', color: 'var(--text)' }} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-white">Kontakt tjetër online (Viber, Telegram, etj.)</Label>
            <Input value={form.contact_other} onChange={(e) => setForm({ ...form, contact_other: e.target.value })}
              placeholder="P.sh. @username në Telegram" className="h-11"
              style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--line)', color: 'var(--text)' }} />
          </div>
        </div>

        {/* Shënime */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-white">Shënime shtesë</Label>
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Çdo kërkesë ose informacion shtesë..." className="min-h-[80px] resize-none"
            style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--line)', color: 'var(--text)' }} />
        </div>

        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <p className="text-xs text-blue-300">ℹ️ Po gjenerojmë çmimin bazuar në të dhënat tuaja. Nëse nuk doni të prisni, dërgojini kërkesën dhe ne do t'ju kontaktojmë me ofertën sapo të jetë gati.</p>
        </div>

        <Button type="submit" disabled={loading || !form.transport_type} className="w-full h-12 text-sm font-semibold"
          style={{ backgroundImage: 'linear-gradient(135deg, #8ab4ff 0%, #9bffd6 100%)', color: '#0b1020', opacity: (loading || !form.transport_type) ? 0.7 : 1 }}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
          Dërgo Kërkesën
        </Button>
      </motion.form>
    </div>
  );
}