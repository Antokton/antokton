import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Shield } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-[#8ab4ff] to-[#9bffd6] rounded-2xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-[#0b1020]" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white uppercase tracking-wide">Politika e Privatësisë</h1>
            <p className="text-white mt-1">Përditësuar më: Shkurt 2026</p>
          </div>
        </div>

        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-8 space-y-6 text-white">
            <section>
              <h2 className="text-2xl font-black text-white mb-3 uppercase tracking-wide">1. Të dhënat që mbledhim</h2>
              <p className="leading-relaxed">
                Antokton mbledh informacione personale që ju na jepni vullnetarisht, përfshirë emrin, email-in, 
                numrin e telefonit, vendndodhjen, dhe informacione profesionale si eksperienca e punës dhe aftësitë.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-white mb-3 uppercase tracking-wide">2. Si i përdorim të dhënat tuaja</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Për të ofruar dhe përmirësuar shërbimet tona</li>
                <li>Për të lidhur punëkërkuesit me punëdhënësit</li>
                <li>Për të dërguar njoftime relevante</li>
                <li>Për të siguruar sigurinë e platformës</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-black text-white mb-3 uppercase tracking-wide">3. Ndarja e të dhënave</h2>
              <p className="leading-relaxed">
                Ne nuk ndajmë informacionet tuaja personale me palë të treta pa lejen tuaj, përveç rasteve 
                kur kërkohet nga ligji ose për të ofruar shërbime të kërkuara (si procesorët e pagesave).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-white mb-3 uppercase tracking-wide">4. Siguría e të dhënave</h2>
              <p className="leading-relaxed">
                Ne përdorim masa të sigurta teknike dhe organizative për të mbrojtur të dhënat tuaja nga aksesi 
                i paautorizuar, humbja ose keqpërdorimi.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-white mb-3 uppercase tracking-wide">5. Të drejtat tuaja</h2>
              <p className="leading-relaxed mb-2">Ju keni të drejtë të:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Aksesoni dhe shkarkoni të dhënat tuaja</li>
                <li>Korrigjoni informacionet e pasakta</li>
                <li>Kërkoni fshirjen e të dhënave tuaja</li>
                <li>Tërhiqni pëlqimin për përpunimin e të dhënave</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-black text-white mb-3 uppercase tracking-wide">6. Cookies dhe teknologji të ngjashme</h2>
              <p className="leading-relaxed">
                Ne përdorim cookies për të përmirësuar përvojën tuaj në platformë, për analitikë dhe për të 
                ruajtur preferencat tuaja.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-white mb-3 uppercase tracking-wide">7. Ndryshimet në politikë</h2>
              <p className="leading-relaxed">
                Ne rezervojmë të drejtën për të përditësuar këtë politikë privatësie. Do t'ju njoftojmë për 
                çdo ndryshim të rëndësishëm përmes email-it ose njoftimeve në platformë.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-white mb-3 uppercase tracking-wide">8. Na kontaktoni</h2>
              <p className="leading-relaxed">
                Për pyetje rreth kësaj politike privatësie, na kontaktoni në: 
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