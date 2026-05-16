import React, { useState } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { GraduationCap, ExternalLink, MapPin, Star, Loader2, BadgeCheck, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const TYPE_LABELS = {
  universitet: "Universitet",
  kurs_online: "Kurs Online",
  akademi: "Akademi",
  shkolla: "Shkollë",
  trajnim: "Trajnim Profesional",
  tjeter: "Tjetër",
};

const TYPE_COLORS = {
  universitet: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  kurs_online: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  akademi: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  shkolla: "bg-teal-500/20 text-teal-300 border-teal-500/30",
  trajnim: "bg-green-500/20 text-green-300 border-green-500/30",
  tjeter: "bg-white/10 text-white/60 border-white/20",
};

const ALL_TYPES = ["all", ...Object.keys(TYPE_LABELS)];

function InstitutionCard({ inst, featured }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border border-white/10 overflow-hidden flex flex-col transition-all hover:border-white/20 ${
        featured ? "bg-white/8" : "bg-white/5"
      }`}
      style={{ background: featured ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)" }}
    >
      {inst.image_url && (
        <img src={inst.image_url} alt={inst.name} className="w-full h-36 object-cover" />
      )}
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start gap-3 mb-3">
          {inst.logo_url ? (
            <img src={inst.logo_url} alt={inst.name} className="w-12 h-12 object-contain rounded-xl border border-white/10 bg-white/5 p-1 flex-shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-6 h-6 text-white/30" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-base leading-tight">{inst.name}</h3>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <Badge className={`text-xs border ${TYPE_COLORS[inst.type] || TYPE_COLORS.tjeter}`}>
                {TYPE_LABELS[inst.type] || inst.type}
              </Badge>
              {inst.is_featured && (
                <Badge className="text-xs bg-[#9bffd6]/10 text-[#9bffd6] border-[#9bffd6]/30">
                  <Star className="w-2.5 h-2.5 mr-1" />I veçuar
                </Badge>
              )}
            </div>
          </div>
        </div>

        {(inst.country || inst.city) && (
          <p className="text-xs text-white/40 flex items-center gap-1 mb-2">
            <MapPin className="w-3 h-3" />
            {[inst.city, inst.country].filter(Boolean).join(", ")}
          </p>
        )}

        {inst.description && (
          <p className="text-white/55 text-sm leading-relaxed mb-3 line-clamp-3">{inst.description}</p>
        )}

        {inst.fields && inst.fields.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {inst.fields.slice(0, 4).map((f, i) => (
              <span key={i} className="px-2 py-0.5 text-xs rounded-full bg-white/5 border border-white/10 text-white/50">{f}</span>
            ))}
            {inst.fields.length > 4 && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-white/5 border border-white/10 text-white/30">+{inst.fields.length - 4}</span>
            )}
          </div>
        )}

        {/* Antokton Benefit */}
        {inst.antokton_discount && (
          <div className="mb-3 p-3 rounded-xl border border-[#9bffd6]/25 bg-[#9bffd6]/5">
            <div className="flex items-center gap-1.5 mb-1">
              <BadgeCheck className="w-4 h-4 text-[#9bffd6]" />
              <span className="text-[#9bffd6] text-xs font-semibold">Përfitim Antokton</span>
            </div>
            <p className="text-white/70 text-xs leading-relaxed">{inst.antokton_benefit_description || inst.antokton_discount}</p>
          </div>
        )}

        <div className="mt-auto flex gap-2">
          {inst.registration_link && (
            <a
              href={inst.registration_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-[#0b1020]"
              style={{ background: "linear-gradient(135deg, #8ab4ff, #9bffd6)" }}
            >
              Regjistrohu
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          {inst.website_url && !inst.registration_link && (
            <a
              href={inst.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-all"
            >
              Vizito faqen
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function Edukim() {
  const [activeType, setActiveType] = useState("all");

  const { data: institutions = [], isLoading } = useQuery({
    queryKey: ["educationPartners"],
    queryFn: () => base44.entities.EducationPartner.filter({ is_active: true }, "order", 100),
  });

  const filtered = activeType === "all"
    ? institutions
    : institutions.filter(i => i.type === activeType);

  const featured = filtered.filter(i => i.is_featured);
  const rest = filtered.filter(i => !i.is_featured);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#8ab4ff]/20 to-[#9bffd6]/20 border border-white/10 mb-4">
          <GraduationCap className="w-7 h-7 text-[#9bffd6]" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">Edukim & Partnerët Arsimor</h1>
        <p className="text-white/50 max-w-2xl mx-auto text-sm leading-relaxed">
          Institucione arsimore dhe kurse me të cilat Antokton ka marrëveshje. Anëtarët e referuar nga Antokton
          gëzojnë kushte të veçanta dhe zbritje ekskluzive.
        </p>
      </motion.div>

      {/* Antokton Benefit Banner */}
      <div className="mb-8 p-5 rounded-2xl border border-[#9bffd6]/25 bg-[#9bffd6]/5 flex items-start gap-3">
        <BadgeCheck className="w-6 h-6 text-[#9bffd6] flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-[#9bffd6] font-semibold text-sm mb-1">Si funksionon bashkëpunimi Antokton × Institucionet</p>
          <p className="text-white/60 text-sm leading-relaxed">
            Çdo institucion ka kushte të veçanta për anëtarët e Antokton. Kur regjistroheni përmes linkut tonë,
            Antokton merr një komision të vogël (pa kosto shtesë për ju) — i cili mbështet funksionimin e platformës.
          </p>
        </div>
      </div>

      {/* Type Filter */}
      <div className="flex flex-wrap gap-2 mb-8">
        {ALL_TYPES.map(type => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all border ${
              activeType === type
                ? "bg-[#8ab4ff]/20 border-[#8ab4ff]/50 text-[#8ab4ff]"
                : "bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10"
            }`}
          >
            {type === "all" ? "Të gjitha" : TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-white/30 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <GraduationCap className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/40">Nuk ka institucione aktualisht.</p>
          <p className="text-white/25 text-sm mt-2">Antokton po ndërton marrëveshje me institucione arsimore.</p>
        </div>
      ) : (
        <>
          {featured.length > 0 && (
            <div className="mb-8">
              <p className="text-xs text-white/40 uppercase tracking-wider mb-3">Partnerë të veçuar</p>
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {featured.map(inst => <InstitutionCard key={inst.id} inst={inst} featured />)}
              </div>
            </div>
          )}
          {rest.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {rest.map(inst => <InstitutionCard key={inst.id} inst={inst} />)}
            </div>
          )}
        </>
      )}

      {/* CTA for institutions */}
      <div className="mt-16 text-center p-8 rounded-2xl border border-white/10 bg-white/5">
        <BookOpen className="w-10 h-10 text-white/20 mx-auto mb-3" />
        <p className="text-white/50 text-sm font-medium mb-1">Jeni institucion arsimor?</p>
        <p className="text-white/30 text-xs mb-4">Na kontaktoni për të bërë pjesë të rrjetit tonë edukativ.</p>
        <a
          href="mailto:info@antokton.com"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-all"
        >
          Na shkruani
        </a>
      </div>
    </div>
  );
}