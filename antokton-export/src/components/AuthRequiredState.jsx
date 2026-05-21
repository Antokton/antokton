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
  className = ""
}) {
  const fromUrl = encodeURIComponent(getSafeFromUrl());

  return (
    <div className={`min-h-[calc(100dvh-var(--app-header-height)-96px)] px-4 py-10 flex items-center justify-center text-center ${className}`}>
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-xl">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#8ab4ff]/15 text-[#8ab4ff]">
          <Icon className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold text-white">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-white/55">{message}</p>

        <div className="mt-5 grid gap-2">
          <Link
            to={`/Login?from_url=${fromUrl}`}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] px-4 text-sm font-bold text-[#0b1020]"
          >
            <LogIn className="mr-2 h-4 w-4" />
            Hyr
          </Link>
          <Link
            to={`/Login?mode=register&from_url=${fromUrl}`}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-[#8ab4ff]/30 bg-[#8ab4ff]/10 px-4 text-sm font-semibold text-[#8ab4ff]"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Regjistrohu
          </Link>
          <Link
            to="/"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white/80"
          >
            <Home className="mr-2 h-4 w-4" />
            Vazhdo pa hyrë
          </Link>
        </div>
      </div>
    </div>
  );
}
