import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BriefcaseBusiness, Handshake, Search, Wrench } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const serviceAreas = [
  {
    icon: Wrench,
    title: "Ofrues shërbimesh",
    text: "Hapësirë për profesionistë dhe subjekte që duan të prezantojnë shërbimet e tyre në mënyrë të rregullt.",
  },
  {
    icon: Search,
    title: "Kërkesa për shërbime",
    text: "Përdoruesit mund të kërkojnë ndihmë, punë profesionale ose zgjidhje praktike për nevoja konkrete.",
  },
  {
    icon: Handshake,
    title: "Besueshmëri dhe bashkëpunim",
    text: "Shërbimet synohet të lidhen me transparencë, reputacion dhe bashkëpunim të dobishëm për komunitetin.",
  },
];

export default function Sherbime() {
  return (
    <div className="min-h-screen px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-[#8ab4ff]/20 to-[#9bffd6]/20">
            <BriefcaseBusiness className="h-7 w-7 text-[#9bffd6]" />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-wide text-white sm:text-4xl">
            Shërbime
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/60 sm:text-base">
            Shërbimet në Antokton janë hapësirë për nevoja praktike,
            profesionale dhe komunitare. Faqja shërben si hyrje informuese,
            ndërsa njoftimet konkrete të shërbimeve mund të shfaqen në seksionin
            përkatës të njoftimeve.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {serviceAreas.map((area) => {
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

        <div className="mt-10 rounded-2xl border border-[#9bffd6]/20 bg-[#9bffd6]/5 p-7 text-center">
          <Wrench className="mx-auto mb-3 h-9 w-9 text-[#9bffd6]" />
          <h2 className="text-xl font-bold text-white">Shiko njoftimet e shërbimeve</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-white/60">
            Për oferta ose kërkesa konkrete, hap njoftimet e shërbimeve në platformë.
          </p>
          <Link
            to="/Feed?category=sherbime"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] px-5 py-2.5 text-sm font-semibold text-[#0b1020] transition-opacity hover:opacity-90"
          >
            Hap shërbimet
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
