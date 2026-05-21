import { Link } from "react-router-dom";
import { Home, LogIn, UserPlus } from "lucide-react";

function getSafeFromUrl() {
  if (typeof window === "undefined") return "/";
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export default function AuthRequiredState({
  title = "Duhet të hysh në llogari",
  message = "Ky seksion kërkon llogari për të vazhduar.",
  icon: Icon = LogIn,
  className = "",
  compact = false
}) {
  const fromUrl = encodeURIComponent(getSafeFromUrl());
  const wrapperClass = compact
    ? `px-4 py-4 text-left ${className}`
    : `min-h-[calc(100dvh-var(--app-header-height)-96px)] px-4 py-10 flex items-center justify-center text-center ${className}`;
  const cardClass = compact
    ? "w-full rounded-xl border border-white/10 bg-white/[0.06] p-4 shadow-sm"
    : "w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-xl";
  const iconClass = compact
    ? "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#8ab4ff]/15 text-[#8ab4ff]"
    : "mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#8ab4ff]/15 text-[#8ab4ff]";

  return (
    <div className={wrapperClass}>
      <div className={cardClass}>
        <div className={compact ? "flex items-start gap-3" : ""}>
          <div className={iconClass}>
            <Icon className={compact ? "h-5 w-5" : "h-6 w-6"} />
          </div>
          <div className={compact ? "min-w-0 flex-1" : ""}>
            <h1 className={compact ? "text-base font-bold text-white" : "text-xl font-bold text-white"}>{title}</h1>
            <p className={compact ? "mt-1 text-sm leading-5 text-white/55" : "mt-2 text-sm leading-6 text-white/55"}>{message}</p>
          </div>
        </div>

        <div className={compact ? "mt-4 grid grid-cols-3 gap-2" : "mt-5 grid gap-2"}>
          <Link
            to={`/Login?from_url=${fromUrl}`}
            className={compact
              ? "inline-flex h-10 items-center justify-center rounded-lg bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] px-2 text-xs font-bold text-[#0b1020]"
              : "inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] px-4 text-sm font-bold text-[#0b1020]"}
          >
            <LogIn className={compact ? "mr-1.5 h-3.5 w-3.5" : "mr-2 h-4 w-4"} />
            Hyr
          </Link>
          <Link
            to={`/Login?mode=register&from_url=${fromUrl}`}
            className={compact
              ? "inline-flex h-10 items-center justify-center rounded-lg border border-[#8ab4ff]/30 bg-[#8ab4ff]/10 px-2 text-xs font-semibold text-[#8ab4ff]"
              : "inline-flex h-11 items-center justify-center rounded-xl border border-[#8ab4ff]/30 bg-[#8ab4ff]/10 px-4 text-sm font-semibold text-[#8ab4ff]"}
          >
            <UserPlus className={compact ? "mr-1.5 h-3.5 w-3.5" : "mr-2 h-4 w-4"} />
            Regjistrohu
          </Link>
          <Link
            to="/"
            className={compact
              ? "inline-flex h-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-2 text-xs font-semibold text-white/80"
              : "inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white/80"}
          >
            <Home className={compact ? "mr-1.5 h-3.5 w-3.5" : "mr-2 h-4 w-4"} />
            {compact ? "Vazhdo" : "Vazhdo pa hyrë"}
          </Link>
        </div>
      </div>
    </div>
  );
}
