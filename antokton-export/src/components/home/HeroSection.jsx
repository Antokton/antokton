import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../../utils";
import { ArrowRight, Briefcase, Users, Shield } from "lucide-react";
import { motion } from "framer-motion";

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-transparent min-h-[85vh] flex items-center pt-8">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 w-full py-8">
        <div className="text-center max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="mb-2 flex justify-center"
          >
            <img 
              src="/local-assets/icons/6f2cf9c8b_Untitled-1.png"
              alt="Antokton"
              className="w-full max-w-xl h-auto"
              style={{ filter: 'drop-shadow(0 10px 30px rgba(255,90,70,0.3))' }}
            />
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-white/50 text-base sm:text-lg max-w-2xl mx-auto mb-4 leading-relaxed font-light"
          >
            Antokton bashkon diasporën shqiptare me mundësi pune, shërbime dhe komunitet. 
            Transparencë, besueshmëri dhe bashkëpunim.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              to={createPageUrl("Feed")}
              className="hero-primary-btn group flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] font-semibold text-sm hover:opacity-90 transition-all duration-300 shadow-lg shadow-[#8ab4ff]/20 text-[#0b1020]"
            >
              Shiko Njoftimet
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-[#0b1020]" />
            </Link>
            <Link
              to={createPageUrl("CreatePost")}
              className="flex items-center gap-2 px-8 py-3.5 rounded-xl border-2 border-white/20 text-white font-medium text-sm hover:bg-white/5 transition-all duration-300 shadow-lg"
            >
              Posto Njoftim
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
