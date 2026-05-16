import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, RefreshCw, ExternalLink, AlertTriangle, Maximize2, Minimize2 } from "lucide-react";
import PlatformIcon from "./PlatformIcon";

const isMobile = () => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

export default function WebFramePanel({ platform, onClose }) {
  const mobile = isMobile();
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [fullscreen, setFullscreen] = useState(mobile);
  const iframeRef = useRef(null);
  const reloadKey = useRef(0);
  const [reloadCount, setReloadCount] = useState(0);

  // Platformat që dihet se bllokojnë iframe (vetëm desktop - jo mobile)
  const BLOCKED_PLATFORMS = ["signal"];
  const likelyBlocked = !mobile && BLOCKED_PLATFORMS.includes(platform.id);

  const handleLoad = () => {
    setLoading(false);
    // Shpesh platformat bllokojnë pa e shfaqur gabim — nëse pas 2s ende "loading" ish 
    // e kemi si fallback timeout
  };

  const handleError = () => {
    setLoading(false);
    setBlocked(true);
  };

  const handleReload = () => {
    setLoading(true);
    setBlocked(false);
    reloadKey.current += 1;
    setReloadCount(c => c + 1);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", zIndex: 999999 }}
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          className="flex flex-col rounded-2xl overflow-hidden"
          style={{
            width: fullscreen ? "100vw" : "min(900px, 95vw)",
            height: fullscreen ? "100vh" : "min(700px, 90vh)",
            background: "#0f1729",
            border: `1px solid ${platform.border}`,
            boxShadow: `0 30px 70px rgba(0,0,0,0.8), 0 0 60px ${platform.color}15`,
          }}
        >
          {/* Toolbar */}
          <div
            className="flex items-center gap-3 px-4 py-3 shrink-0"
            style={{ background: `${platform.color}12`, borderBottom: `1px solid ${platform.border}` }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: `${platform.color}25` }}
            >
              <PlatformIcon platformId={platform.id} size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-white font-bold text-sm">{platform.name}</span>
              <span className="text-white/40 text-xs ml-2 truncate hidden sm:inline">{platform.webUrl}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleReload}
                className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                title="Ringarko"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => window.open(platform.webUrl, "_blank", "noopener,noreferrer")}
                className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                title="Hap në tab të ri"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
              <button
                onClick={() => setFullscreen(f => !f)}
                className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                title={fullscreen ? "Minimizo" : "Zmadhо"}
              >
                {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                title="Mbyll"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Frame area */}
          <div className="flex-1 relative overflow-hidden">
            {/* Loading spinner */}
            {loading && !blocked && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10" style={{ background: "#0f1729" }}>
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: `${platform.color}20` }}
                >
                  <PlatformIcon platformId={platform.id} size={36} />
                </div>
                <div className="w-8 h-8 border-2 border-white/20 border-t-white/80 rounded-full animate-spin mb-3" />
                <p className="text-white/50 text-sm">Duke ngarkuar {platform.name}…</p>
              </div>
            )}

            {/* Blocked / error state */}
            {(blocked || (likelyBlocked && reloadCount === 0)) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-6 text-center" style={{ background: "#0f1729" }}>
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)" }}
                >
                  <AlertTriangle className="w-8 h-8 text-yellow-400" />
                </div>
                <p className="text-white font-bold text-base mb-2">Hap {platform.name}</p>
                <p className="text-white/50 text-sm max-w-sm leading-relaxed mb-6">
                  Kjo platformë ndalon integrimin iframe për arsye sigurie. Mund ta hapni direkt në browser.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 items-center">
                  <a
                    href={platform.webUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white"
                    style={{ background: `linear-gradient(135deg, ${platform.color}EE, ${platform.color}99)` }}
                  >
                    <ExternalLink className="w-4 h-4" />
                    Hap {platform.name}
                  </a>
                  <button
                    onClick={handleReload}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-white/50 hover:text-white transition-colors"
                    style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                  >
                    <RefreshCw className="w-4 h-4" />
                    Provo Iframe
                  </button>
                </div>
              </div>
            )}

            {/* The iframe — only show if not a known-blocked platform or user retried */}
            {(!likelyBlocked || reloadCount > 0) && !blocked && (
              <iframe
                key={reloadCount}
                ref={iframeRef}
                src={platform.webUrl}
                onLoad={handleLoad}
                onError={handleError}
                className="w-full h-full border-0"
                title={platform.name}
                allow="camera; microphone; clipboard-read; clipboard-write"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-storage-access-by-user-activation"
              />
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}