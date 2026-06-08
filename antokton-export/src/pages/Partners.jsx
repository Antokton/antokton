import React from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ExternalLink, Loader2 } from "lucide-react";

const FALLBACK_MAIN = [
  { name: "Partner 1", logo_url: null, website_url: "#" },
  { name: "Partner 2", logo_url: null, website_url: "#" },
  { name: "Partner 3", logo_url: null, website_url: "#" },
];

export default function Partners() {
  const { data: partners = [], isLoading } = useQuery({
    queryKey: ["partners"],
    queryFn: () => base44.entities.Partner.list("order", 200),
  });

  const mainPartners = partners.length > 0 ? partners.filter(p => p.is_main !== false) : FALLBACK_MAIN;
  const otherPartners = partners.filter(p => p.is_main === false);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">Bashkëpunëtorët Tanë</h1>
        <p className="text-white/50 max-w-2xl mx-auto">Organizatat dhe kompanitë që na mbështesin në misionin tonë</p>
      </motion.div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-white/30 animate-spin" /></div>
      ) : (
        <>
          <div className="mb-16">
            <h2 className="text-xl font-semibold text-white mb-6">Bashkëpunëtorë Kryesorë</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {mainPartners.map((partner, i) => (
                <motion.a
                  key={partner.id || i}
                  href={partner.website_url || "#"}
                  target={partner.website_url && partner.website_url !== "#" ? "_blank" : "_self"}
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="group relative bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 hover:border-white/20 transition-all duration-300"
                >
                  <div className="aspect-[4/3] flex items-center justify-center">
                    {partner.logo_url ? (
                      <img src={partner.logo_url} alt={partner.name}
                        className="max-w-full max-h-full object-contain rounded-lg bg-white/90 p-2 opacity-90 group-hover:opacity-100 transition-opacity" />
                    ) : (
                      <span className="text-white/40 text-sm font-medium text-center">{partner.name}</span>
                    )}
                  </div>
                  {partner.website_url && partner.website_url !== "#" && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ExternalLink className="w-4 h-4 text-white/40" />
                    </div>
                  )}
                </motion.a>
              ))}
            </div>
          </div>

          {otherPartners.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Bashkëpunëtorë të Tjerë</h2>
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <div className="flex flex-wrap gap-3">
                  {otherPartners.map((partner, i) => (
                    <a
                      key={partner.id || i}
                      href={partner.website_url || "#"}
                      target={partner.website_url && partner.website_url !== "#" ? "_blank" : "_self"}
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-sm text-white/70 hover:bg-white/10 transition-colors"
                    >
                      {partner.name}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}

          {partners.length === 0 && (
            <div className="text-center py-12">
              <p className="text-white/30 text-sm">Bashkëpunëtorët do të shtohen së shpejti.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
