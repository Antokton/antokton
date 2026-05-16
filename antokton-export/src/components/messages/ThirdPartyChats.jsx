import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogIn } from "lucide-react";
import PlatformIcon from "./PlatformIcon";
import WebFramePanel from "./WebFramePanel";

const PLATFORMS = [
  {
    id: "whatsapp",
    name: "WhatsApp",
    tagline: "Mesazhim i sigurt",
    webUrl: "https://web.whatsapp.com",
    color: "#25D366",
    bg: "rgba(37,211,102,0.08)",
    border: "rgba(37,211,102,0.25)",
    loginMethod: "QR / Numër telefoni",
  },
  {
    id: "telegram",
    name: "Telegram",
    tagline: "I shpejtë & i sigurt",
    webUrl: "https://web.telegram.org/k/",
    color: "#2AABEE",
    bg: "rgba(42,171,238,0.08)",
    border: "rgba(42,171,238,0.25)",
    loginMethod: "Numër telefoni / SMS",
  },
  {
    id: "messenger",
    name: "Messenger",
    tagline: "Nga Facebook",
    webUrl: "https://www.messenger.com",
    color: "#0084FF",
    bg: "rgba(0,132,255,0.08)",
    border: "rgba(0,132,255,0.25)",
    loginMethod: "Llogari Facebook",
  },
  {
    id: "viber",
    name: "Viber",
    tagline: "Thirrje & mesazhe",
    webUrl: "https://web.viber.com",
    color: "#7360F2",
    bg: "rgba(115,96,242,0.08)",
    border: "rgba(115,96,242,0.25)",
    loginMethod: "Numër telefoni / SMS",
  },
];

function PlatformCard({ platform, onOpen }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl overflow-hidden"
      style={{ background: platform.bg, border: `1px solid ${platform.border}` }}
    >
      <div className="h-1 w-full" style={{ background: platform.color }} />
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: platform.bg, border: `1.5px solid ${platform.border}` }}
          >
            <PlatformIcon platformId={platform.id} size={30} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-white font-bold text-sm block">{platform.name}</span>
            <span className="text-white/50 text-xs block mt-0.5">{platform.tagline}</span>
          </div>
        </div>

        <div className="mb-3">
          <div
            className="flex flex-col items-center justify-center py-2 px-2 rounded-lg text-center"
            style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)" }}
          >
            <span className="text-[10px] font-bold text-green-400 leading-tight">✅ Pa pajisje të dytë</span>
            <span className="text-white/40 text-[9px] mt-0.5 leading-tight">{platform.loginMethod}</span>
          </div>
        </div>

        <button
          onClick={() => onOpen(platform)}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-white"
          style={{ background: platform.color }}
        >
          <LogIn className="w-3.5 h-3.5" />
          Hap &amp; Kycu
        </button>
      </div>
    </motion.div>
  );
}

export default function ThirdPartyChats() {
  const [openPlatform, setOpenPlatform] = useState(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: "linear-gradient(135deg, rgba(138,180,255,0.08), rgba(155,255,214,0.04))",
          border: "1px solid rgba(138,180,255,0.2)",
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">💬</span>
          <h2 className="text-white font-black text-lg leading-tight">Antokton Hub — Çdo mesazh, një vend</h2>
        </div>
        <p className="text-white/60 text-sm leading-relaxed">
          Shkurtore të shpejta për platformat e mesazhimit. Çdo buton e hap platformën direkt brenda Antokton.
        </p>
      </div>

      {/* Platform Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {PLATFORMS.map(p => (
          <PlatformCard key={p.id} platform={p} onOpen={setOpenPlatform} />
        ))}
      </div>

      {/* Web Frame Panel */}
      <AnimatePresence>
        {openPlatform && (
          <WebFramePanel
            platform={openPlatform}
            onClose={() => setOpenPlatform(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}