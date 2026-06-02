import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BadgeCheck, ClipboardCheck, FileSearch, Scale, ShieldCheck, UserCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const evaluationAreas = [
  "Profesionalizmi dhe cilësia e punës",
  "Korrektësia dhe respektimi i marrëveshjeve",
  "Morali publik dhe sjellja ndaj komunitetit",
  "Transparenca dhe reputacioni",
  "Përputhja me parimet hallall kur kjo është e aplikueshme",
];

const processSteps = [
  "I interesuari paraqet kërkesë për vlerësim.",
  "Administrata shqyrton të dhënat fillestare.",
  "Mund të kërkohen dokumente, prova pune, referenca ose inspektim.",
  "Në fund jepet vlerësim/certifikim, refuzim ose kërkesë për plotësim.",
];

export default function Certifikim() {
  return (
    <div className="min-h-screen px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-[#8ab4ff]/20 to-[#9bffd6]/20">
            <ShieldCheck className="h-7 w-7 text-[#9bffd6]" />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-wide text-white sm:text-4xl">
            Çertifikim Cilësie
          </h1>
          <p className="mx-auto mt-4 max-w-3xl text-sm leading-relaxed text-white/60 sm:text-base">
            Certifikimi në Antokton është një modul që platforma synon ta
            zhvillojë për verifikim, transparencë dhe besueshmëri. Ai nuk
            paraqitet si sistem plotësisht funksional derisa proceset teknike
            dhe administrative të aktivizohen realisht.
          </p>
        </div>

        <Card className="border-white/10 bg-white/5">
          <CardContent className="p-7">
            <div className="flex items-start gap-4">
              <BadgeCheck className="mt-1 h-6 w-6 flex-shrink-0 text-[#8ab4ff]" />
              <div>
                <h2 className="mb-3 text-2xl font-bold text-white">Çfarë është certifikimi?</h2>
                <p className="text-sm leading-relaxed text-white/65">
                  Është një proces vlerësimi ose verifikimi për persona,
                  profesionistë, punëdhënës, shërbime ose subjekte që duan të
                  paraqiten si të besueshëm brenda platformës Antokton.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Card className="border-white/10 bg-white/[0.04]">
            <CardContent className="p-6">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
                <Scale className="h-5 w-5 text-[#9bffd6]" />
              </div>
              <h2 className="mb-3 text-xl font-bold text-white">Fushat e vlerësimit</h2>
              <ul className="space-y-2 text-sm text-white/65">
                {evaluationAreas.map((area) => (
                  <li key={area} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#9bffd6]" />
                    <span>{area}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.04]">
            <CardContent className="p-6">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
                <UserCheck className="h-5 w-5 text-[#8ab4ff]" />
              </div>
              <h2 className="mb-3 text-xl font-bold text-white">Kush e bën vlerësimin?</h2>
              <p className="text-sm leading-relaxed text-white/65">
                Vlerësimi mund të kryhet nga administrata e Antoktonit dhe/ose
                nga profili/roli i posaçëm “Inspektori Profesional Hallall”,
                kur ky rol të aktivizohet në platformë.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6 border-white/10 bg-white/[0.04]">
          <CardContent className="p-7">
            <div className="mb-5 flex items-center gap-3">
              <ClipboardCheck className="h-6 w-6 text-[#9bffd6]" />
              <h2 className="text-2xl font-bold text-white">Si funksionon procesi?</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {processSteps.map((step, index) => (
                <div key={step} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#8ab4ff]">
                    Hapi {index + 1}
                  </p>
                  <p className="text-sm leading-relaxed text-white/65">{step}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6 border-white/10 bg-white/[0.04]">
          <CardContent className="p-7">
            <div className="mb-4 flex items-center gap-3">
              <FileSearch className="h-6 w-6 text-[#8ab4ff]" />
              <h2 className="text-2xl font-bold text-white">Për kë shërben?</h2>
            </div>
            <p className="text-sm leading-relaxed text-white/65">
              Ky modul mund t’u shërbejë punëkërkuesve, punëdhënësve,
              zejtarëve, kompanive, ofruesve të shërbimeve, qendrave të
              edukimit, mediave ose subjekteve të tjera që duan të rrisin
              besueshmërinë para komunitetit.
            </p>
          </CardContent>
        </Card>

        <div className="mt-10 rounded-2xl border border-[#9bffd6]/20 bg-[#9bffd6]/5 p-7 text-center">
          <ShieldCheck className="mx-auto mb-3 h-9 w-9 text-[#9bffd6]" />
          <h2 className="text-xl font-bold text-white">Apliko për certifikim</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-white/60">
            Formulari i aplikimit do të aktivizohet së shpejti. Deri atëherë,
            për interes ose pyetje mund të përdorni faqen e kontaktit.
          </p>
          <Link
            to="/Contact"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] px-5 py-2.5 text-sm font-semibold text-[#0b1020] transition-opacity hover:opacity-90"
          >
            Kontakto administratën
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
