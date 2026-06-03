import React from "react";

function initialsFromName(name = "", email = "") {
  const source = String(name || email || "?").trim();
  if (!source) return "?";
  const parts = source
    .replace(/@.*/, "")
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export default function UserAvatar({ name, email, photoUrl, size = 40, className = "" }) {
  const label = name || email || "Anëtar";
  const initials = initialsFromName(name, email);

  return (
    <div
      className={`shrink-0 overflow-hidden rounded-full border border-white/10 bg-gradient-to-br from-[#8ab4ff] to-[#9bffd6] ${className}`}
      style={{ width: size, height: size }}
      title={label}
      aria-label={label}
    >
      {photoUrl ? (
        <img src={photoUrl} alt={label} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs font-bold text-[#0b1020]">
          {initials}
        </div>
      )}
    </div>
  );
}
