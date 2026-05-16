import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-screen py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-[#8ab4ff] to-[#9bffd6] rounded-2xl flex items-center justify-center">
            <FileText className="w-6 h-6 text-[#0b1020]" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white uppercase tracking-wide">Termat e Përdorimit</h1>
            <p className="text-white mt-1">Përditësuar më: Shkurt 2026</p>
          </div>
        </div>

        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-8 space-y-6 text-white">
            <section>
              <h2 className="text-2xl font-black text-white mb-3 uppercase tracking-wide">1. Pranimi i termave</h2>
              <p className="leading-relaxed">
                Duke përdorur platformën Antokton, ju pranoni këta terma dhe kushte. Nëse nuk jeni dakord, 
                ju lutemi mos e përdorni platformën.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-white mb-3 uppercase tracking-wide">2. Përdorimi i platformës</h2>
              <p className="leading-relaxed mb-2">Ju pranoni të:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Jepni informacione të sakta dhe të përditësuara</li>
                <li>Mos publikoni përmbajtje të rreme, ofenduese ose ilegale</li>
                <li>Mos keqpërdorni platformën për qëllime spam ose mashtrim</li>
                <li>Respektoni të drejtat e përdoruesve të tjerë</li>
                <li>Mbani konfidenciale kredencialet tuaja të hyrjes</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-black text-white mb-3 uppercase tracking-wide">3. Përmbajtja e përdoruesve</h2>
              <p className="leading-relaxed">
                Ju jeni përgjegjës për përmbajtjen që publikoni. Ne rezervojmë të drejtën për të moderuar, 
                edituar ose fshirë çdo përmbajtje që shkel këta terma ose politikat tona.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-white mb-3 uppercase tracking-wide">4. Abonimet dhe pagesat</h2>
              <p className="leading-relaxed">
                Abonimet Premium janë të pagueshme dhe rinovohen automatikisht nëse nuk anulohen. 
                Të gjitha pagesat janë përfundimtare dhe të pa-rikthyeshme, përveç rasteve të garantuara nga ligji.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-white mb-3 uppercase tracking-wide">5. Pronësia intelektuale</h2>
              <p className="leading-relaxed">
                Të gjitha materialet në platformë, përfshirë logot, dizajnin dhe përmbajtjen, janë pronë e 
                Antokton ose licensuesve tanë dhe mbrohen nga ligjet e pronësisë intelektuale.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-white mb-3 uppercase tracking-wide">6. Kufizimi i përgjegjësisë</h2>
              <p className="leading-relaxed">
                Antokton nuk është përgjegjës për marrëdhëniet mes punëdhënësve dhe punëkërkuesve. 
                Ne nuk garantojmë saktësinë e informacioneve të postuara nga përdoruesit.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-white mb-3 uppercase tracking-wide">7. Pezullimi i llogarisë</h2>
              <p className="leading-relaxed">
                Ne rezervojmë të drejtën për të pezulluar ose mbyllur llogaritë që shkelin këta terma, 
                pa paralajmërim dhe pa kompensim.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-white mb-3 uppercase tracking-wide">8. Ligji aplikues</h2>
              <p className="leading-relaxed">
                Këta terma rregullohen nga ligjet e Bashkimit Europian dhe të vendit ku operojmë. 
                Çdo mosmarrëveshje do të zgjidhet në gjykatat kompetente.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-white mb-3 uppercase tracking-wide">9. Kontakt</h2>
              <p className="leading-relaxed">
                Për pyetje rreth këtyre termave, na kontaktoni në: 
                <a href="mailto:legal@antokton.com" className="text-[#8ab4ff] hover:underline ml-1">
                  legal@antokton.com
                </a>
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}