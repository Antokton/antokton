import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  EyeOff,
  Eye,
  Flag,
  Heart,
  MessageCircle,
  MoreVertical,
  Share2,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function getDistance(touches) {
  if (!touches || touches.length < 2) return 0;
  const [a, b] = touches;
  const dx = a.clientX - b.clientX;
  const dy = a.clientY - b.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function truncateText(text = "", max = 180) {
  const clean = String(text || "").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).trim()}...`;
}

export default function PhotoLightbox({
  images = [],
  initialIndex = 0,
  open = false,
  onClose,
  title = "Foto",
  postText = "",
  authorName = "",
  authorHref = "",
  onLike,
  onComment,
  onShare,
  onReport,
  notificationKey = "",
}) {
  const safeImages = useMemo(() => (Array.isArray(images) ? images.filter(Boolean) : []), [images]);
  const [activeIndex, setActiveIndex] = useState(clamp(initialIndex, 0, Math.max(safeImages.length - 1, 0)));
  const [zoom, setZoom] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [expandedText, setExpandedText] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const dragStateRef = useRef(null);
  const pinchStateRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setActiveIndex(clamp(initialIndex, 0, Math.max(safeImages.length - 1, 0)));
    setZoom(1);
    setTranslate({ x: 0, y: 0 });
    setExpandedText(false);
  }, [open, initialIndex, safeImages.length]);

  useEffect(() => {
    if (!notificationKey) return;
    try {
      const saved = window.localStorage.getItem(`photo_notifications:${notificationKey}`) === "1";
      setNotificationsEnabled(saved);
    } catch {
      setNotificationsEnabled(false);
    }
  }, [notificationKey]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
      if (event.key === "ArrowLeft" && safeImages.length > 1) {
        setActiveIndex((current) => (current - 1 + safeImages.length) % safeImages.length);
        setZoom(1);
        setTranslate({ x: 0, y: 0 });
      }
      if (event.key === "ArrowRight" && safeImages.length > 1) {
        setActiveIndex((current) => (current + 1) % safeImages.length);
        setZoom(1);
        setTranslate({ x: 0, y: 0 });
      }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, safeImages.length]);

  if (!open || safeImages.length === 0 || typeof document === "undefined") return null;

  const currentImage = safeImages[activeIndex];
  const canGoPrev = safeImages.length > 1;
  const canGoNext = safeImages.length > 1;
  const canZoomOut = zoom > 0.4;
  const canZoomIn = zoom < 5;

  const resetView = () => {
    setZoom(1);
    setTranslate({ x: 0, y: 0 });
  };

  const setGradualZoom = (delta) => {
    setZoom((current) => clamp(Number((current + delta).toFixed(2)), 0.4, 5));
  };

  const goTo = (nextIndex) => {
    setActiveIndex(clamp(nextIndex, 0, safeImages.length - 1));
    resetView();
  };

  const goPrev = () => goTo((activeIndex - 1 + safeImages.length) % safeImages.length);
  const goNext = () => goTo((activeIndex + 1) % safeImages.length);

  const toggleNotifications = () => {
    const next = !notificationsEnabled;
    setNotificationsEnabled(next);
    if (!notificationKey) return;
    try {
      window.localStorage.setItem(`photo_notifications:${notificationKey}`, next ? "1" : "0");
    } catch {
      // ignore local storage errors
    }
  };

  const handleCopyImage = async () => {
    try {
      if (navigator.clipboard?.write) {
        const response = await fetch(currentImage);
        const blob = await response.blob();
        await navigator.clipboard.write([new ClipboardItem({ [blob.type || "image/png"]: blob })]);
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(currentImage);
      }
    } catch {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(currentImage);
    }
  };

  const handleSaveImage = () => {
    const anchor = document.createElement("a");
    anchor.href = currentImage;
    anchor.download = title || "foto";
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.click();
  };

  const handleShare = async () => {
    try {
      if (onShare) {
        await onShare();
        return;
      }
      if (navigator.share) {
        await navigator.share({ title, url: currentImage, text: title });
        return;
      }
      await navigator.clipboard.writeText(currentImage);
    } catch {
      // ignore cancel / fallback failures
    }
  };

  const onWheel = (event) => {
    event.preventDefault();
    setGradualZoom(event.deltaY > 0 ? -0.12 : 0.12);
  };

  const onMouseDown = (event) => {
    if (zoom <= 1) return;
    dragStateRef.current = {
      x: event.clientX,
      y: event.clientY,
      startTranslate: translate,
    };
  };

  const onMouseMove = (event) => {
    const dragState = dragStateRef.current;
    if (!dragState) return;
    const dx = event.clientX - dragState.x;
    const dy = event.clientY - dragState.y;
    setTranslate({
      x: dragState.startTranslate.x + dx,
      y: dragState.startTranslate.y + dy,
    });
  };

  const stopDragging = () => {
    dragStateRef.current = null;
  };

  const onTouchStart = (event) => {
    if (event.touches.length === 2) {
      pinchStateRef.current = {
        distance: getDistance(event.touches),
        startZoom: zoom,
      };
      return;
    }
    if (event.touches.length === 1 && zoom > 1) {
      const touch = event.touches[0];
      dragStateRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        startTranslate: translate,
      };
    }
  };

  const onTouchMove = (event) => {
    if (event.touches.length === 2 && pinchStateRef.current) {
      const nextDistance = getDistance(event.touches);
      const factor = nextDistance / Math.max(pinchStateRef.current.distance, 1);
      setZoom(clamp(Number((pinchStateRef.current.startZoom * factor).toFixed(2)), 0.4, 5));
      return;
    }
    if (event.touches.length === 1 && dragStateRef.current) {
      const touch = event.touches[0];
      const dx = touch.clientX - dragStateRef.current.x;
      const dy = touch.clientY - dragStateRef.current.y;
      setTranslate({
        x: dragStateRef.current.startTranslate.x + dx,
        y: dragStateRef.current.startTranslate.y + dy,
      });
    }
  };

  const onTouchEnd = () => {
    pinchStateRef.current = null;
    dragStateRef.current = null;
  };

  const overlay = (
    <div className="fixed inset-0 z-[99999] bg-black/95 text-white">
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="absolute left-3 z-[100001] md:left-5"
        style={{ top: "max(env(safe-area-inset-top), 12px)" }}
      >
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-white/20 bg-black/70 p-3 text-white shadow-lg backdrop-blur hover:bg-white/10"
          aria-label="Mbyll foton"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div
        className="absolute right-3 z-[100001] md:right-5"
        style={{ top: "max(env(safe-area-inset-top), 12px)" }}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="rounded-full border border-white/20 bg-black/70 p-3 text-white shadow-lg backdrop-blur hover:bg-white/10"
              aria-label="Më shumë mundësi për foton"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 border-white/10 bg-[#0b1020] text-white">
            <DropdownMenuItem onClick={handleSaveImage} className="cursor-pointer gap-2 text-white/85">
              <Download className="h-4 w-4" /> Ruaje si foto
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCopyImage} className="cursor-pointer gap-2 text-white/85">
              <Copy className="h-4 w-4" /> Kopjo foto
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleShare} className="cursor-pointer gap-2 text-white/85">
              <Share2 className="h-4 w-4" /> Shpërndaje
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onReport?.()} className="cursor-pointer gap-2 text-orange-200">
              <Flag className="h-4 w-4 text-orange-300" /> Raportoje
            </DropdownMenuItem>
            <DropdownMenuItem onClick={toggleNotifications} className="cursor-pointer gap-2 text-white/85">
              {notificationsEnabled ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {notificationsEnabled ? "Fik njoftimet" : "Ndiz njoftimet"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {canGoPrev && (
        <button
          type="button"
          onClick={goPrev}
          className="absolute left-3 top-1/2 z-[100000] -translate-y-1/2 rounded-full border border-white/15 bg-black/60 p-3 text-white shadow-lg backdrop-blur hover:bg-white/10 md:left-5"
          aria-label="Fotoja e mëparshme"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      {canGoNext && (
        <button
          type="button"
          onClick={goNext}
          className="absolute right-3 top-1/2 z-[100000] -translate-y-1/2 rounded-full border border-white/15 bg-black/60 p-3 text-white shadow-lg backdrop-blur hover:bg-white/10 md:right-5"
          aria-label="Fotoja tjetër"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      <div className="flex h-full flex-col">
        <div className="flex min-h-0 flex-1 items-center justify-center px-4 pb-52 pt-20 md:px-20 md:pb-48">
          <div
            className="relative flex h-full w-full items-center justify-center overflow-hidden"
            onWheel={onWheel}
            onMouseMove={onMouseMove}
            onMouseUp={stopDragging}
            onMouseLeave={stopDragging}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <img
              src={currentImage}
              alt={title}
              draggable={false}
              onMouseDown={onMouseDown}
              className="max-h-full max-w-full select-none object-contain"
              style={{
                transform: `translate(${translate.x}px, ${translate.y}px) scale(${zoom})`,
                transition: dragStateRef.current || pinchStateRef.current ? "none" : "transform 120ms ease-out",
                cursor: zoom > 1 ? "grab" : "zoom-in",
                touchAction: "none",
              }}
            />
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-[100000] border-t border-white/10 bg-[#0b1020]/94 backdrop-blur">
          <div className="pointer-events-auto mx-auto max-w-4xl px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-3">
            <div className="mb-3 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setGradualZoom(-0.12)}
                disabled={!canZoomOut}
                className="rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
              >
                -
              </button>
              <span className="min-w-16 rounded-xl border border-white/10 bg-black/30 px-3 py-1.5 text-center text-sm font-semibold text-white/80">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setGradualZoom(0.12)}
                disabled={!canZoomIn}
                className="rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
              >
                +
              </button>
              <button
                type="button"
                onClick={resetView}
                className="rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-semibold text-white"
              >
                Qendër
              </button>
            </div>

            <div className="space-y-3">
              <div className="text-sm text-white/85">
                {authorHref ? (
                  <a href={authorHref} className="font-semibold text-white hover:text-[#9bffd6]">
                    {authorName || "Postuesi"}
                  </a>
                ) : (
                  <span className="font-semibold text-white">{authorName || "Postuesi"}</span>
                )}
                {postText && (
                  <span className="ml-2 text-white/75">
                    {expandedText ? postText : truncateText(postText)}
                    {postText.length > 180 && (
                      <button
                        type="button"
                        onClick={() => setExpandedText((current) => !current)}
                        className="ml-1 font-medium text-[#9bffd6] hover:text-white"
                      >
                        {expandedText ? "mbyll" : "shih më shumë"}
                      </button>
                    )}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onLike?.()}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15"
                >
                  <Heart className="h-4 w-4" /> Pëlqej
                </button>
                <button
                  type="button"
                  onClick={() => onComment?.()}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15"
                >
                  <MessageCircle className="h-4 w-4" /> Koment
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15"
                >
                  <Share2 className="h-4 w-4" /> Shpërndaj
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
