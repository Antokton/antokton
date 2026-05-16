import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../../utils";
import { Briefcase, ShoppingBag, Scale, GraduationCap, Heart, Radio, Wrench } from "lucide-react";
import { motion } from "framer-motion";

const categories = [
  { key: "pune", label: "Punë", desc: "Njoftime punësimi", icon: Briefcase, color: "from-blue-500/20 to-blue-600/20", text: "text-blue-400" },
  { key: "pazar", label: "Pazar", desc: "Prona, mjete e vegla në tregtim dhe dhurime", icon: ShoppingBag, color: "from-emerald-500/20 to-emerald-600/20", text: "text-emerald-400", url: "/Pazar" },
  { key: "sherbime", label: "Shërbime", desc: "Shërbime të ndryshme", icon: Wrench, color: "from-orange-500/20 to-orange-600/20", text: "text-orange-400" },
  { key: "edukim", label: "Edukim", desc: "Kurse & trajnime", icon: GraduationCap, color: "from-amber-500/20 to-amber-600/20", text: "text-amber-400" },
  { key: "media", label: "Media", desc: "Lajme & informacion", icon: Radio, color: "from-cyan-500/20 to-cyan-600/20", text: "text-cyan-400" },
  { key: "bamiresi", label: "Bamirësi", desc: "Ndihma & solidaritet", icon: Heart, color: "from-rose-500/20 to-rose-600/20", text: "text-rose-400" },
];

export default function CategoryCards() {
  return (
    <section className="py-8 px-4 sm:px-6 bg-transparent">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-6">
          <h2 className="text-xl sm:text-3xl font-black text-white tracking-wide uppercase">
            Kategoritë
          </h2>
          <p className="text-white/70 mt-1.5 text-sm sm:text-base">Gjej atë që kërkon sipas kategorisë</p>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-4">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
            >
              <Link
                to={cat.url || (createPageUrl("Feed") + `?category=${cat.key}`)}
                className="group flex flex-col items-center p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-white/10 hover:border-white/25 transition-all duration-300 text-center"
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  backdropFilter: 'blur(12px)'
                }}
              >
                <div className={`w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center mb-2 sm:mb-3 group-hover:scale-110 transition-transform duration-300`}>
                  <cat.icon className={`w-4 h-4 sm:w-6 sm:h-6 ${cat.text}`} />
                </div>
                <h3 className="font-bold text-white text-xs sm:text-sm leading-tight">{cat.label}</h3>
                <p className="text-white/55 text-[10px] sm:text-xs mt-0.5 leading-tight hidden sm:block">{cat.desc}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}