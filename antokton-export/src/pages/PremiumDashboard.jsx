import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, Heart, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";

export default function PremiumDashboard() {
  return (
    <div className="min-h-screen px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <Badge className="mb-4 border-0 bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] px-4 py-2 text-[#0b1020]">
            Beta Publike
          </Badge>
          <h1 className="text-3xl font-black uppercase tracking-wide text-white sm:text-4xl">
            Premium — së shpejti
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
            Antoktoni është në fazë beta publike. Aksesi bazë është falas, ndërsa Premium dhe Biznes do të hapen pas përfundimit të testimeve publike.
          </p>
        </div>

        <Card className="border-white/10 bg-white/5">
          <CardContent className="space-y-5 p-6">
            <div className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#8ab4ff]/15">
                <Sparkles className="h-5 w-5 text-[#8ab4ff]" />
              </div>
              <div>
                <h2 className="font-semibold text-white">Shërbimet Premium nuk janë ende aktive</h2>
                <p className="mt-1 text-sm leading-relaxed text-white/65">
                  Përfitimet do të publikohen para hapjes zyrtare dhe nuk do të kërkohet pagesë Premium gjatë beta publike.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#9bffd6]/15">
                <CalendarClock className="h-5 w-5 text-[#9bffd6]" />
              </div>
              <div>
                <h2 className="font-semibold text-white">Biznes — së shpejti</h2>
                <p className="mt-1 text-sm leading-relaxed text-white/65">
                  Regjistrimet për bizneset do të hapen pas përfundimit të testimeve publike.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-400/15">
                <Heart className="h-5 w-5 text-rose-300" />
              </div>
              <div>
                <h2 className="font-semibold text-white">Mbështetje vullnetare</h2>
                <p className="mt-1 text-sm leading-relaxed text-white/65">
                  Nëse dëshironi, mund ta mbështesni vullnetarisht zhvillimin dhe mirëmbajtjen e Antoktonit pa marrë privilegje të veçanta.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <Button asChild className="w-full bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020]">
                <Link to={createPageUrl("Subscriptions")}>Shko te Mbështetja vullnetare</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
