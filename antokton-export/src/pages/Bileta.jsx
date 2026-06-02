import React, { useEffect, useState } from "react";
import { base44 } from "@/api/antoktonClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PHONE_PLACEHOLDER, getInternationalPhoneError, isValidInternationalPhone, normalizeInternationalPhone } from "@/lib/phone";
import {
  Plane,
  Bus,
  Train,
  Truck,
  Send,
  Loader2,
  CheckCircle,
  Car,
  Ship,
  Map,
  Compass,
  Building2,
  Package,
  Info,
  FileText,
  ChevronDown
} from "lucide-react";
import { motion } from "framer-motion";

const transportTypes = [
  { value: "avion", label: "Avion", icon: Plane },
  { value: "autobus", label: "Autobus", icon: Bus },
  { value: "tren", label: "Tren", icon: Train },
  { value: "furgon", label: "Furgon", icon: Truck },
  { value: "taksi", label: "Taksi", icon: Car },
  { value: "traget", label: "Traget", icon: Ship },
  { value: "transport_mallrash", label: "Transport Mallrash", icon: Truck },
  { value: "transport_makinash", label: "Transport Makinash", icon: Car },
];

const serviceSections = [
  {
    title: "Bileta Udhëtimi",
    icon: Plane,
    items: ["Avion", "Tren", "Autobus", "Furgon", "Taksi", "Traget"],
  },
  {
    title: "Paketa turistike",
    icon: Map,
    items: ["Udhëtime të organizuara", "Fundjava turistike", "Pushime familjare", "Guida dhe ture"],
  },
  {
    title: "Pelegrinazh",
    icon: Compass,
    items: ["Umre", "Vizita fetare/edukative"],
  },
  {
    title: "Oferta nga agjenci partnere",
    icon: Building2,
    items: ["Agjenci turistike", "Operatorë transporti", "Guida lokale", "Organizatorë udhëtimesh"],
  },
  {
    title: "Transport mallrash",
    icon: Package,
    items: ["Transport mallrash", "Transport makinash"],
  },
];

const futureFields = [
  "lloji",
  "nisja",
  "destinacioni",
  "data e nisjes",
  "data e kthimit",
  "numri i personave",
  "çmimi",
  "agjencia/ofruesi",
  "kontakt",
  "status verifikimi",
  "përshkrim",
  "dokumente/foto opsionale",
];

const emptyForm = {
  transport_type: "", request_type: "udhetar",
  from: "", to: "", departure_date: "", return_date: "",
  passengers: "1", ages: "", preferred_vehicle: "",
  service_interest: "",
  // mallra
  cargo_type: "", cargo_weight: "", cargo_size: "",
  // kontakt
  contact_name: "", contact_email: "", contact_phone: "",
  contact_whatsapp: "", contact_other: "",
  notes: ""
};

const requestByType = {
  avion: { label: "Avion", transport_type: "avion", interest: "Bileta Udhëtimi - Avion", request_type: "udhetar" },
  autobus: { label: "Autobus", transport_type: "autobus", interest: "Bileta Udhëtimi - Autobus", request_type: "udhetar" },
  tren: { label: "Tren", transport_type: "tren", interest: "Bileta Udhëtimi - Tren", request_type: "udhetar" },
  furgon: { label: "Furgon", transport_type: "furgon", interest: "Bileta Udhëtimi - Furgon", request_type: "udhetar" },
  taksi: { label: "Taksi", transport_type: "taksi", interest: "Bileta Udhëtimi - Taksi", request_type: "udhetar" },
  traget: { label: "Traget", transport_type: "traget", interest: "Bileta Udhëtimi - Traget", request_type: "udhetar" },
  paketa: { label: "Paketa turistike", interest: "Paketa turistike", request_type: "udhetar" },
  umre: { label: "Umre", interest: "Pelegrinazh - Umre", request_type: "udhetar" },
  agjenci: { label: "Oferta nga agjenci partnere", interest: "Oferta nga agjenci partnere", request_type: "udhetar" },
  mallra: { label: "Transport mallrash", transport_type: "transport_mallrash", interest: "Transport mallrash - Transport mallrash", request_type: "mall" },
  makina: { label: "Transport makinash", transport_type: "transport_makinash", interest: "Transport mallrash - Transport makinash", request_type: "mall" }
};

export default function Bileta() {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [openSections, setOpenSections] = useState({ "Bileta Udhëtimi": true });

  const transportValueByItem = {
    Avion: "avion",
    Tren: "tren",
    Autobus: "autobus",
    Furgon: "furgon",
    Taksi: "taksi",
    Traget: "traget",
    "Transport mallrash": "transport_mallrash",
    "Transport makinash": "transport_makinash"
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const type = params.get("type");
    const request = requestByType[type];
    if (request) {
      setForm((prev) => ({
        ...prev,
        transport_type: request.transport_type || prev.transport_type,
        request_type: request.request_type || prev.request_type,
        preferred_vehicle: request.label,
        service_interest: request.interest,
        notes: prev.notes || `Interesim për: ${request.interest}`
      }));
    }
    if (window.location.hash === "#kerkese-bilete") {
      window.setTimeout(() => {
        document.getElementById("kerkese-bilete")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, []);

  const handleServicePick = (sectionTitle, item) => {
    const transportValue = transportValueByItem[item];
    const interest = `${sectionTitle} - ${item}`;
    setForm((prev) => ({
      ...prev,
      transport_type: transportValue || prev.transport_type,
      request_type: sectionTitle === "Transport mallrash" ? "mall" : "udhetar",
      preferred_vehicle: item,
      service_interest: interest,
      notes: prev.notes || `Interesim për: ${interest}`
    }));
    window.setTimeout(() => {
      document.getElementById("kerkese-bilete")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValidInternationalPhone(form.contact_phone)) {
      alert(getInternationalPhoneError("Telefoni"));
      return;
    }
    if (!isValidInternationalPhone(form.contact_whatsapp)) {
      alert(getInternationalPhoneError("WhatsApp"));
      return;
    }
    setLoading(true);
    const contactPhone = normalizeInternationalPhone(form.contact_phone);
    const contactWhatsApp = normalizeInternationalPhone(form.contact_whatsapp);

    // Dërgo email me të dhënat
    try {
      const isAuthenticated = await base44.auth.isAuthenticated();
      const user = isAuthenticated ? await base44.auth.me() : null;

      const details = form.request_type === "udhetar"
        ? `Udhëtar: ${form.passengers} persona, Moshat: ${form.ages || "N/A"}`
        : `Mall: ${form.cargo_type}, Pesha: ${form.cargo_weight}, Madhësia: ${form.cargo_size}`;

      await base44.integrations.Core.SendEmail({
        to: "info@antokton.com",
        subject: `Kërkesë Bilete - ${form.service_interest || form.transport_type} ${form.from} → ${form.to}`,
        body: `Kërkesë e re për biletë/transport:\n\nInteresi: ${form.service_interest || "N/A"}\nLloji/Mjeti: ${form.transport_type || form.preferred_vehicle || "N/A"}\nNga: ${form.from}\nDeri: ${form.to}\nData nisjes: ${form.departure_date}\nData kthimit: ${form.return_date || "Vetëm vajtje"}\n\n${details}\n\nKontakt:\nEmri: ${form.contact_name}\nEmail: ${form.contact_email}\nTelefon: ${contactPhone || "N/A"}\nWhatsApp: ${contactWhatsApp || "N/A"}\nKontakt tjetër: ${form.contact_other || "N/A"}\n\nShënime: ${form.notes || "Asnjë"}\n\nPërdoruesi: ${user?.email || "Jo i regjistruar"}`,
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8ab4ff]">Transport & Udhëtime</p>
        <h1 className="mt-2 text-2xl sm:text-4xl font-bold tracking-tight text-white">Bileta - Transport & Udhëtime</h1>
        <p className="mt-3 text-sm sm:text-base text-white/65">
          Moduli do të mundësojë shfaqjen e ofertave dhe kërkesave për bileta, paketa udhëtimi dhe oferta nga partnerë të verifikuar.
        </p>
        <a href="#kerkese-bilete" className="mt-5 inline-flex rounded-xl border border-[#8ab4ff]/25 bg-[#8ab4ff]/10 px-4 py-3 text-sm font-semibold text-[#cfe0ff] hover:bg-[#8ab4ff]/15 transition-colors">
          Kërko biletë ose paketë
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 mb-6">
        {serviceSections.map((section) => {
          const Icon = section.icon;
          const isOpen = openSections[section.title];
          return (
            <motion.section
              key={section.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setOpenSections((prev) => ({ ...prev, [section.title]: !prev[section.title] }))}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/[0.03] transition-colors"
              >
                <div className="w-11 h-11 rounded-xl bg-[#8ab4ff]/10 border border-[#8ab4ff]/20 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-[#8ab4ff]" />
                </div>
                <h2 className="text-base font-bold text-white leading-tight flex-1">{section.title}</h2>
                <ChevronDown className={`w-4 h-4 text-white/55 transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>
              {isOpen && (
                <ul className="px-4 pb-4 space-y-2">
                  {section.items.map((item) => (
                    <li key={item}>
                      <button
                        type="button"
                        onClick={() => handleServicePick(section.title, item)}
                        className="w-full flex items-start gap-2 rounded-lg px-2 py-2 text-left text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors"
                      >
                        <CheckCircle className="w-4 h-4 mt-0.5 text-[#9bffd6] shrink-0" />
                        <span>{item}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </motion.section>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-4 mb-8">
        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-[#9bffd6] mt-1 shrink-0" />
            <div>
              <h2 className="text-lg font-bold text-white">Si do të zgjerohet moduli</h2>
              <p className="mt-2 text-sm text-white/65">
                Rezervimi dhe pagesa direkte nuk premtohen derisa backend-i për këtë modul të jetë gati. Formulari ekzistues më poshtë mund të përdoret për kërkesa fillestare.
              </p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-3">
            <a href="#kerkese-bilete" className="rounded-xl border border-[#8ab4ff]/25 bg-[#8ab4ff]/10 px-4 py-3 text-sm font-semibold text-[#cfe0ff] hover:bg-[#8ab4ff]/15 transition-colors">
              Kërko biletë ose paketë udhëtimi
            </a>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-5 h-5 text-[#8ab4ff]" />
            <h2 className="text-lg font-bold text-white">Fushat e planifikuara</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {futureFields.map((field) => (
              <span key={field} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70">
                {field}
              </span>
            ))}
          </div>
          <p className="mt-4 text-xs text-white/45">
            Formulari i plotë për kërkesa dhe oferta udhëtimi do të aktivizohet së shpejti.
          </p>
        </section>
      </div>

      <motion.form id="kerkese-bilete" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSubmit}
        className="max-w-2xl mx-auto rounded-2xl p-6 sm:p-8 space-y-5"
        style={{ backgroundColor: 'var(--bg2)', borderColor: 'var(--line)', borderWidth: '1px' }}>

        {/* Lloji i transportit */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-white">Mjeti ose shërbimi i preferuar *</Label>
          {form.service_interest && (
            <p className="rounded-lg border border-[#9bffd6]/20 bg-[#9bffd6]/10 px-3 py-2 text-xs text-[#d8ffef]">
              Zgjedhur: {form.service_interest}
            </p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {transportTypes.map(t => {
              const Icon = t.icon;
              return (
                <button key={t.value} type="button"
                  onClick={() => setForm({ ...form, transport_type: t.value, preferred_vehicle: t.label, service_interest: `Bileta Udhëtimi - ${t.label}` })}
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
                placeholder={PHONE_PLACEHOLDER} className="h-11"
                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--line)', color: 'var(--text)' }} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-white">WhatsApp</Label>
              <Input value={form.contact_whatsapp} onChange={(e) => setForm({ ...form, contact_whatsapp: e.target.value })}
                placeholder={`${PHONE_PLACEHOLDER} (WhatsApp)`} className="h-11"
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

        <Button type="submit" disabled={loading || (!form.transport_type && !form.service_interest)} className="w-full h-12 text-sm font-semibold"
          style={{ backgroundImage: 'linear-gradient(135deg, #8ab4ff 0%, #9bffd6 100%)', color: '#0b1020', opacity: (loading || (!form.transport_type && !form.service_interest)) ? 0.7 : 1 }}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
          Dërgo Kërkesën
        </Button>
      </motion.form>
    </div>
  );
}
