import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Users } from "lucide-react";

export default function FacebookGroups() {
  const groups = [
    { country: "Angli", url: "https://t.ly/a5AVR" },
    { country: "Belgjikë", url: "https://t.ly/8tNJi" },
    { country: "Francë", url: "https://t.ly/a-0xf" },
    { country: "Gjermani", url: "https://t.ly/G0iO_" },
    { country: "Itali", url: "https://t.ly/zK-FM" },
    { country: "Mal të Zi", url: "https://t.ly/3RGRO" }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight">Grupet në Facebook</h1>
        <p className="text-white/50 mt-1">Vizito grupet tona sipas shteteve</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {groups.map((group) => (
          <Card key={group.country} className="bg-white/5 border-white/10 hover:bg-white/10 transition-all">
            <CardContent className="p-6">
              <a
                href={group.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#8ab4ff] to-[#9bffd6] flex items-center justify-center">
                    <Users className="w-6 h-6 text-[#0b1020]" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-lg">Punë në {group.country}</h3>
                    <p className="text-white/40 text-sm">Bashkohu me grupin</p>
                  </div>
                </div>
                <ExternalLink className="w-5 h-5 text-white/40 group-hover:text-[#8ab4ff] transition-colors" />
              </a>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 p-6 rounded-xl bg-white/5 border border-white/10">
        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
          <Users className="w-5 h-5 text-[#8ab4ff]" />
          Rreth grupeve
        </h3>
        <p className="text-white/70 text-sm leading-relaxed">
          Këto janë grupet tona zyrtare në Facebook ku publikojmë mundësi pune për diasporën shqiptare. 
          Bashkohu me grupin e vendit ku jeton për të marrë njoftimet më të reja për punë.
        </p>
      </div>
    </div>
  );
}