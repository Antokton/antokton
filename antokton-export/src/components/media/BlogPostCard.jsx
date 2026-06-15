import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Clock, User, Tag, ExternalLink, ChevronDown, ChevronUp, X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";

export default function BlogPostCard({ post }) {
  const [expanded, setExpanded] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const [imageZoom, setImageZoom] = useState(1);
  const isLong = (post.description || "").length > 300;
  const canZoomOut = imageZoom > 1;

  const openImage = () => {
    setImageZoom(1);
    setImageOpen(true);
  };

  useEffect(() => {
    if (!imageOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setImageOpen(false);
      if (event.key === "+" || event.key === "=") setImageZoom((current) => Math.min(5, Number((current + 0.25).toFixed(2))));
      if (event.key === "-") setImageZoom((current) => Math.max(1, Number((current - 0.25).toFixed(2))));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [imageOpen]);

  const imageViewer = imageOpen && post.image_url ? (
    <div
      className="fixed inset-0 z-[99999] flex flex-col bg-black/95"
      role="dialog"
      aria-modal="true"
      aria-label="Foto e plotë"
    >
      <button
        type="button"
        onClick={() => setImageOpen(false)}
        className="fixed right-3 top-3 z-[100001] rounded-full border border-white/25 bg-black/80 p-3 text-white shadow-xl hover:bg-white/10 sm:right-5 sm:top-5"
        aria-label="Mbyll foton"
      >
        <X className="h-6 w-6" />
      </button>

      <div className="min-h-0 flex-1 overflow-auto overscroll-contain px-3 pb-24 pt-16 sm:px-5 sm:pb-28 sm:pt-20">
        <div className="mx-auto flex min-h-full w-fit min-w-full items-start justify-center">
          <img
            src={post.image_url}
            alt={post.title}
            draggable={false}
            className="select-none rounded-xl border border-white/10 bg-black/40 object-contain shadow-2xl"
            style={{
              width: imageZoom === 1 ? "auto" : `${imageZoom * 100}vw`,
              maxWidth: imageZoom === 1 ? "100%" : "none",
              maxHeight: imageZoom === 1 ? "calc(100dvh - 128px)" : "none",
            }}
          />
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-[100000] border-t border-white/10 bg-[#0b1020]/95 px-3 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setImageZoom((current) => Math.max(1, Number((current - 0.25).toFixed(2))))}
            disabled={!canZoomOut}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
            aria-label="Zvogëlo"
          >
            <ZoomOut className="h-4 w-4" />
            -
          </button>
          <span className="min-w-16 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-center text-sm font-semibold text-white/80">
            {Math.round(imageZoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setImageZoom((current) => Math.min(5, Number((current + 0.25).toFixed(2))))}
            disabled={imageZoom >= 5}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
            aria-label="Zmadho"
          >
            <ZoomIn className="h-4 w-4" />
            +
          </button>
          <button
            type="button"
            onClick={() => setImageZoom(1)}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-semibold text-white"
            aria-label="Rikthe madhësinë"
          >
            <RotateCcw className="h-4 w-4" />
            100%
          </button>
          <button
            type="button"
            onClick={() => setImageOpen(false)}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-semibold text-white"
            aria-label="Mbyll"
          >
            <X className="h-4 w-4" />
            Mbyll
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-white/10 overflow-hidden hover:border-white/20 transition-all"
        style={{ background: "rgba(255,255,255,0.04)" }}>
        {post.image_url && (
          <button type="button" onClick={openImage} className="relative block h-48 w-full overflow-hidden text-left" aria-label="Hap foton e plotë">
            <img src={post.image_url} alt={post.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 50%, rgba(11,16,32,0.9))" }} />
            <span className="absolute right-3 top-3 rounded-full border border-white/15 bg-black/60 px-2 py-1 text-[11px] font-medium text-white/80">
              Hape foton
            </span>
          </button>
        )}
        <div className="p-5 flex flex-col gap-3">
          {/* Author row */}
          <div className="flex items-center gap-2">
            {post.author_photo_url ? (
              <img src={post.author_photo_url} alt={post.author_name} className="w-8 h-8 rounded-full object-cover border border-white/10" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-white/40" />
              </div>
            )}
            <div>
              <p className="text-white text-xs font-medium">{post.author_name || "Anonim"}</p>
              {post.author_bio && <p className="text-white/35 text-[10px] leading-tight truncate max-w-[180px]">{post.author_bio}</p>}
            </div>
            {post.reading_time_min && (
              <span className="ml-auto text-white/30 text-[10px] flex items-center gap-1">
                <Clock className="w-3 h-3" />{post.reading_time_min} min
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="text-white font-semibold text-base leading-tight">{post.title}</h3>

          {/* Content */}
          {post.description && (
            <div>
              <p className={`text-white/55 text-sm leading-relaxed ${!expanded && isLong ? "line-clamp-4" : ""}`}>
                {post.description}
              </p>
              {isLong && (
                <button onClick={() => setExpanded(e => !e)}
                  className="mt-2 flex items-center gap-1 text-[#8ab4ff] text-xs hover:text-[#9bffd6] transition-colors">
                  {expanded ? <><ChevronUp className="w-3.5 h-3.5" />Mbyll</> : <><ChevronDown className="w-3.5 h-3.5" />Lexo më shumë</>}
                </button>
              )}
            </div>
          )}

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {post.tags.slice(0, 4).map(tag => (
                <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/40 flex items-center gap-1">
                  <Tag className="w-2.5 h-2.5" />{tag}
                </span>
              ))}
            </div>
          )}

          {/* External link */}
          {post.link_url && (
            <a href={post.link_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[#8ab4ff] text-xs font-medium hover:text-[#9bffd6] transition-colors">
              <ExternalLink className="w-3.5 h-3.5" /> Lexo origjinalin
            </a>
          )}
        </div>
      </motion.div>

      {imageViewer && typeof document !== "undefined" ? createPortal(imageViewer, document.body) : null}
    </>
  );
}
