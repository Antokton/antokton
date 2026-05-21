import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Cookie } from "lucide-react";

export default function CookiePolicy() {
  return (
    <div className="min-h-screen py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-[#8ab4ff] to-[#9bffd6] rounded-2xl flex items-center justify-center">
            <Cookie className="w-6 h-6 text-[#0b1020]" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white uppercase tracking-wide">Politika e Cookies</h1>
            <p className="text-white mt-1">Përditësuar më: Shkurt 2026</p>
          </div>
        </div>

        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-8 space-y-6 text-white">
            <section>
              <h2 className="text-2xl font-black text-white mb-3 uppercase tracking-wide">1. Çfarë janë cookies</h2>
              <p className="leading-relaxed">
                Cookies janë skedarë të vegjël që ruhen në pajisjen tuaj për të mbajtur mend preferencat,
                sesionin e hyrjes dhe konfigurime të nevojshme për funksionimin e platformës.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-white mb-3 uppercase tracking-wide">2. Cookies të domosdoshme</h2>
              <p className="leading-relaxed">
                Antokton përdor cookies ose ruajtje lokale të domosdoshme për hyrjen në llogari, sigurinë e
                sesionit, gjuhën, temën dhe funksione bazë të navigimit. Këto nuk mund të çaktivizohen pa
                ndikuar në funksionimin e platformës.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-white mb-3 uppercase tracking-wide">3. Analitika dhe përmirësimi</h2>
              <p className="leading-relaxed">
                Nëse aktivizohet analitikë, ajo përdoret vetëm për të kuptuar performancën, gabimet dhe
                përdorimin e përgjithshëm të shërbimit. Nuk përdorim cookies për shitjen e të dhënave personale.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-white mb-3 uppercase tracking-wide">4. Shërbime të palëve të treta</h2>
              <p className="leading-relaxed">
                Disa funksione, si pagesat, mediat e integruara ose shërbimet e hosting-ut, mund të vendosin
                cookies sipas politikave të tyre. Kur përdorni këto funksione, vlejnë edhe kushtet e ofruesve përkatës.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-white mb-3 uppercase tracking-wide">5. Si t'i kontrolloni cookies</h2>
              <p className="leading-relaxed">
                Mund të fshini ose bllokoni cookies nga cilësimet e shfletuesit tuaj. Disa pjesë të platformës,
                veçanërisht hyrja në llogari dhe preferencat, mund të mos funksionojnë siç duhet nëse cookies
                të domosdoshme bllokohen.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-white mb-3 uppercase tracking-wide">6. Kontakt</h2>
              <p className="leading-relaxed">
                Për pyetje rreth cookies dhe privatësisë, na kontaktoni në:
                <a href="mailto:privacy@antokton.com" className="text-[#8ab4ff] hover:underline ml-1">
                  privacy@antokton.com
                </a>
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
