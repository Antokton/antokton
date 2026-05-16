import React, { useState } from "react";
import { X, Maximize2, Minimize2, ExternalLink, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function MediaPlayerModal({ item, onClose }) {
  const [maximized, setMaximized] = useState(false);

  if (!item) return null;

  const isRadio = item.type === "radio";
  const isTV = item.type === "tv";
  const embedUrl = item.embed_url || item.stream_url || item.stream;

  // Try to get embed-friendly URL
  const getEmbedSrc = () => {
    if (!embedUrl) return null;
    // YouTube
    const ytMatch = embedUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (ytMatch) return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=1`;
    // Spotify
    if (embedUrl.includes("spotify.com")) return embedUrl.replace("open.spotify.com", "open.spotify.com").replace("/track/", "/embed/track/").replace("/playlist/", "/embed/playlist/").replace("/episode/", "/embed/episode/");
    // SoundCloud  
    if (embedUrl.includes("soundcloud.com")) return `https://w.soundcloud.com/player/?url=${encodeURIComponent(embedUrl)}&auto_play=true&color=%238ab4ff`;
    // Generic iframe-able
    return embedUrl;
  };

  const embedSrc = getEmbedSrc();
  const siteUrl = item.site || item.website_url || item.url;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative flex flex-col rounded-2xl overflow-hidden border border-white/15"
          style={{
            background: "#0b1020",
            width: maximized ? "100vw" : "min(800px, 95vw)",
            height: maximized ? "100vh" : "auto",
            maxHeight: maximized ? "100vh" : "90vh",
          }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-all flex items-center gap-1.5 text-xs font-medium" title="Kthehu">
                <ArrowLeft className="w-4 h-4" /> Kthehu
              </button>
              {item.color && (
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg flex-shrink-0 border border-white/10"
                  style={{ background: `${item.color}22` }}>
                  {item.flag || (isRadio ? "📻" : isTV ? "📺" : "🎵")}
                </div>
              )}
              <div>
                <p className="text-white font-semibold text-sm">{item.name || item.title}</p>
                {item.stream && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />LIVE</span>}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {siteUrl && (
                <a href={siteUrl} target="_blank" rel="noopener noreferrer"
                  className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-all"
                  title="Vizito faqen">
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
              <button onClick={() => setMaximized(m => !m)}
                className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-all"
                title={maximized ? "Minimizo" : "Maksimizo"}>
                {maximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button onClick={onClose}
                className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Player content */}
          <div className="flex-1 overflow-auto">
            {embedSrc ? (
              <div style={{ position: "relative", width: "100%", paddingBottom: isRadio ? "80px" : "56.25%", background: "#000" }}>
                <iframe
                  src={embedSrc}
                  title={item.name || item.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  style={{ position: "absolute", inset: 0, width: "100%", height: isRadio ? "80px" : "100%", border: "none" }}
                />
              </div>
            ) : (
              // No embed - show iframe with site
              siteUrl ? (
                <div style={{ height: maximized ? "calc(100vh - 60px)" : "500px" }}>
                  <iframe
                    src={siteUrl}
                    title={item.name || item.title}
                    style={{ width: "100%", height: "100%", border: "none", background: "#000" }}
                    sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="text-5xl">{isRadio ? "📻" : isTV ? "📺" : "🌐"}</div>
                  <p className="text-white/50 text-sm text-center">Ky kanal nuk ka streaming direkt.<br />Mund ta vizitoni në faqen e tyre.</p>
                  {siteUrl && (
                    <a href={siteUrl} target="_blank" rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-[#0b1020]"
                      style={{ background: "linear-gradient(135deg,#8ab4ff,#9bffd6)" }}>
                      <ExternalLink className="w-4 h-4" /> Hap {item.name}
                    </a>
                  )}
                </div>
              )
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}