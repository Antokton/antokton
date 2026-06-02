import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Building2, GraduationCap, Handshake, LibraryBig } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const plannedAreas = [
  {
    icon: BookOpen,
    title: "Njohuri dhe materiale formuese",
    text: "Hapësirë e planifikuar për materiale edukative dhe përmbajtje që ndihmon zhvillimin personal ose profesional.",
  },
  {
    icon: GraduationCap,
    title: "Kurse dhe trajnime",
    text: "Në të ardhmen mund të prezantohen kurse ose trajnime vetëm pasi ato të shtohen realisht në platformë.",
  },
  {
    icon: Building2,
    title: "Qendra dhe shkolla partnere",
    text: "Platforma synon të mundësojë profile për shkolla, qendra edukimi ose bashkëpunëtorë të verifikuar.",
  },
];

export default function Edukim() {
  return (
    <div className="min-h-screen px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-[#8ab4ff]/20 to-[#9bffd6]/20">
            <GraduationCap className="h-7 w-7 text-[#9bffd6]" />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-wide text-white sm:text-4xl">
            Edukim
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/60 sm:text-base">
            Edukimi në Antokton është një hapësirë e planifikuar për njohuri,
            formim dhe zhvillim personal ose profesional. Faqja është informuese
            dhe do të zgjerohet vetëm kur modulet, partnerët ose materialet
            konkrete të shtohen realisht në platformë.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {plannedAreas.map((area) => {
            const Icon = area.icon;
            return (
              <Card key={area.title} className="border-white/10 bg-white/5">
                <CardContent className="p-6">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
                    <Icon className="h-5 w-5 text-[#8ab4ff]" />
                  </div>
                  <h2 className="mb-2 text-lg font-bold text-white">{area.title}</h2>
                  <p className="text-sm leading-relaxed text-white/60">{area.text}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="mt-8 border-white/10 bg-white/[0.04]">
          <CardContent className="space-y-4 p-7 text-white/70">
            <div className="flex items-start gap-3">
              <LibraryBig className="mt-1 h-5 w-5 flex-shrink-0 text-[#9bffd6]" />
              <div>
                <h2 className="mb-2 text-xl font-bold text-white">Si synon të funksionojë</h2>
                <p className="text-sm leading-relaxed">
                  Antokton synon që në të ardhmen të lejojë prezantimin e
                  qendrave edukative, shkollave partnere, kurseve, trajnimeve
                  ose materialeve formuese. Çdo përmbajtje konkrete duhet të
                  shtohet dhe verifikohet përpara se të paraqitet si ofertë
                  reale në platformë.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-10 rounded-2xl border border-[#9bffd6]/20 bg-[#9bffd6]/5 p-7 text-center">
          <Handshake className="mx-auto mb-3 h-9 w-9 text-[#9bffd6]" />
          <h2 className="text-xl font-bold text-white">
            Dëshiron të bashkëpunosh në fushën e edukimit?
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-white/60">
            Na kontakto për të propozuar qendër edukimi, kurs, trajnim ose
            material formues. Propozimet shqyrtohen para se të shfaqen në
            platformë.
          </p>
          <Link
            to="/Contact"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] px-5 py-2.5 text-sm font-semibold text-[#0b1020] transition-opacity hover:opacity-90"
          >
            Na kontakto
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
