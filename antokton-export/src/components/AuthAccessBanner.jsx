import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Lock, LogIn, UserPlus, X } from "lucide-react";
import { base44 } from "@/api/antoktonClient";

const COPY = {
  profile: {
    title: "Hyr për të parë profilin",
    body: "Profili yt, aplikimet dhe cilësimet ruhen vetëm kur je në llogarinë tënde.",
  },
  messages: {
    title: "Hyr për të parë mesazhet",
    body: "Mesazhet janë private. Hyr ose regjistrohu për të hapur bisedat e tua.",
  },
  default: {
    title: "Duhet të hysh në llogari",
    body: "Hyr ose regjistrohu falas për të vazhduar në këtë pjesë të Antokton.",
  },
};

export default function AuthAccessBanner({
  type = "default",
  variant = "page",
  onClose,
  className = "",
}) {
  const location = useLocation();
  const copy = COPY[type] || COPY.default;
  const isFloating = variant === "floating";
  const returnUrl = `${window.location.origin}${location.pathname}${location.search}`;

  const handleLogin = () => base44.auth.redirectToLogin(returnUrl);

  return (
    <div
      className={[
        "bg-gradient-to-br from-[#10192e]/95 to-[#0b1020]/98 border border-[#8ab4ff]/25 shadow-2xl shadow-black/40",
        isFloating ? "rounded-2xl p-4" : "rounded-[22px] p-5 sm:p-6",
        className,
      ].join(" ")}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#8ab4ff]/15 text-[#8ab4ff]">
          <Lock className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-base font-bold leading-tight text-white sm:text-lg">{copy.title}</h2>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="-mt-1 rounded-full p-1 text-white/50 transition hover:bg-white/10 hover:text-white"
                aria-label="Mbyll njoftimin"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-white/70">{copy.body}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleLogin}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-white text-sm font-bold text-[#0b1020] px-3 py-2.5 transition hover:bg-white/90"
        >
          <LogIn className="h-4 w-4" />
          Hyr
        </button>
        <button
          type="button"
          onClick={handleLogin}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 text-sm font-semibold text-white px-3 py-2.5 transition hover:bg-white/15"
        >
          <UserPlus className="h-4 w-4" />
          Regjistrohu
        </button>
      </div>

      {!isFloating && (
        <Link
          to="/"
          className="mt-3 block rounded-xl border border-white/10 px-3 py-2 text-center text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          Kthehu në kryefaqe
        </Link>
      )}
    </div>
  );
}
