import React from "react";

// ── SVG inline icons per platform — always crisp, no external URLs ────────────

const icons = {
  whatsapp: (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="16" fill="#25D366"/>
      <path d="M22.5 9.5C20.8 7.8 18.5 6.9 16 6.9C10.9 6.9 6.8 11 6.8 16.1C6.8 17.8 7.3 19.4 8.1 20.8L6.7 25.3L11.3 23.9C12.7 24.7 14.3 25.1 16 25.1C21.1 25.1 25.2 21 25.2 15.9C25.2 13.4 24.2 11.2 22.5 9.5Z" fill="white"/>
      <path d="M16 23.5C14.5 23.5 13 23.1 11.8 22.4L11.4 22.2L8.6 23L9.4 20.3L9.1 19.9C8.3 18.6 7.9 17.1 7.9 15.5C7.9 11.5 11.1 8.3 15.1 8.3C17 8.3 18.8 9.1 20.1 10.4C21.4 11.7 22.2 13.5 22.2 15.4C22.2 19.4 18.9 23.5 16 23.5Z" fill="#25D366"/>
      <path d="M20.5 17.5C20.3 17.4 19.2 16.9 19 16.8C18.8 16.7 18.7 16.7 18.6 16.9C18.5 17.1 18.1 17.5 18 17.6C17.9 17.7 17.8 17.7 17.6 17.6C17.4 17.5 16.8 17.3 16.1 16.7C15.5 16.1 15.1 15.4 15 15.2C14.9 15 15 14.9 15.1 14.8C15.2 14.7 15.3 14.6 15.4 14.5C15.5 14.4 15.5 14.3 15.6 14.2C15.7 14.1 15.6 14 15.6 13.9C15.5 13.8 15.1 12.7 15 12.4C14.8 12.1 14.7 12.1 14.6 12.1C14.5 12.1 14.3 12.1 14.2 12.1C14.1 12.1 13.9 12.2 13.8 12.4C13.6 12.6 13.1 13.1 13.1 14.2C13.1 15.3 13.8 16.4 13.9 16.5C14 16.6 15.1 18.3 16.8 19.1C18.5 19.9 18.5 19.7 18.8 19.6C19.1 19.5 19.9 19.1 20.1 18.6C20.3 18.1 20.3 17.7 20.2 17.6C20.6 17.6 20.6 17.6 20.5 17.5Z" fill="white"/>
    </svg>
  ),

  telegram: (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="16" fill="url(#tg_grad)"/>
      <defs>
        <linearGradient id="tg_grad" x1="16" y1="0" x2="16" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#37AEE2"/>
          <stop offset="1" stopColor="#1E96C8"/>
        </linearGradient>
      </defs>
      <path d="M6.5 15.5L24.5 8.5L21.5 24.5L14.5 20L11.5 23L12 18L20.5 10.5L11 17L6.5 15.5Z" fill="white"/>
    </svg>
  ),

  messenger: (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="16" fill="url(#msg_grad)"/>
      <defs>
        <linearGradient id="msg_grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00B2FF"/>
          <stop offset="1" stopColor="#006AFF"/>
        </linearGradient>
      </defs>
      <path d="M16 6C10.477 6 6 10.145 6 15.263C6 18.121 7.308 20.672 9.42 22.394V26L13.053 23.941C13.989 24.2 14.978 24.342 16 24.342C21.523 24.342 26 20.197 26 15.079C26 10.145 21.523 6 16 6Z" fill="url(#msg_grad2)"/>
      <defs>
        <linearGradient id="msg_grad2" x1="6" y1="6" x2="26" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00B2FF"/>
          <stop offset="1" stopColor="#006AFF"/>
        </linearGradient>
      </defs>
      <path d="M8 18.5L12.5 13.5L15 16L19.5 13.5L24 18.5L19.5 16L17 18.5L15 16L12.5 18.5L8 18.5Z" fill="white"/>
    </svg>
  ),

  viber: (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="16" fill="#7360F2"/>
      <path d="M22 9.5C20.1 7.9 17.2 7 16 7C10.5 7 6 11.2 6 16.5C6 18.8 6.9 20.9 8.4 22.4L7.5 25.5L11 24.5C12.5 25.3 14.2 25.8 16 25.8C21.5 25.8 26 21.3 26 15.8C26 13.3 24.9 10.9 22 9.5Z" fill="white" fillOpacity="0.9"/>
      <path d="M20.5 18.5C20.2 18.8 19.8 19 19.3 19C18.3 19 16 18 14.3 16.3C12.6 14.6 11.5 12.2 11.5 11.2C11.5 10.7 11.7 10.3 12 10C12.3 9.7 12.7 9.5 13.1 9.5C13.2 9.5 13.3 9.5 13.4 9.5C13.8 9.6 14.2 9.9 14.5 10.5C14.8 11.1 15.4 12.2 15.5 12.4C15.6 12.6 15.6 12.8 15.5 13C15.4 13.2 15.3 13.3 15.2 13.5C15.1 13.7 14.9 13.8 14.8 14C14.7 14.2 14.8 14.4 14.9 14.6C15.3 15.3 16 16 16.8 16.6C17.2 16.9 17.5 17 17.7 16.9C17.9 16.8 18 16.6 18.2 16.4C18.4 16.2 18.5 16 18.7 15.9C18.9 15.8 19.1 15.8 19.3 15.9C19.5 16 20.6 16.6 21.2 16.9C21.5 17.1 21.7 17.2 21.8 17.3C21.9 17.8 21.5 18.3 20.5 18.5Z" fill="#7360F2"/>
    </svg>
  ),

  signal: (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="16" fill="#3A76F0"/>
      <path d="M16 7C11.029 7 7 11.029 7 16C7 20.971 11.029 25 16 25C20.971 25 25 20.971 25 16C25 11.029 20.971 7 16 7Z" fill="white"/>
      <path d="M16 10C12.686 10 10 12.686 10 16C10 19.314 12.686 22 16 22C19.314 22 22 19.314 22 16C22 12.686 19.314 10 16 10Z" fill="#3A76F0"/>
      <circle cx="16" cy="16" r="3" fill="white"/>
      <path d="M8 13.5L6 12" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M8 18.5L6 20" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M13.5 8L12 6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M18.5 8L20 6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M24 13.5L26 12" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M24 18.5L26 20" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M18.5 24L20 26" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M13.5 24L12 26" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),

  instagram: (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="ig_bg" cx="30%" cy="107%" r="120%">
          <stop offset="0%" stopColor="#ffd600"/>
          <stop offset="25%" stopColor="#ff7a00"/>
          <stop offset="50%" stopColor="#ff0069"/>
          <stop offset="75%" stopColor="#d300c5"/>
          <stop offset="100%" stopColor="#7638fa"/>
        </radialGradient>
      </defs>
      <circle cx="16" cy="16" r="16" fill="url(#ig_bg)"/>
      <rect x="9" y="9" width="14" height="14" rx="4" stroke="white" strokeWidth="1.5" fill="none"/>
      <circle cx="16" cy="16" r="3.5" stroke="white" strokeWidth="1.5" fill="none"/>
      <circle cx="21" cy="11" r="1" fill="white"/>
    </svg>
  ),

  discord: (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="16" fill="#5865F2"/>
      <path d="M22.5 10.5C21.2 9.9 19.8 9.5 18.3 9.2L18.1 9.6C19.5 9.9 20.7 10.4 21.9 11.1C20 10.1 17.8 9.5 15.5 9.5C13.2 9.5 11 10.1 9.1 11.1C10.3 10.4 11.6 9.9 13 9.6L12.8 9.2C11.3 9.5 9.9 9.9 8.6 10.5C6.5 13.9 5.7 17.1 6 20.3C7.6 21.5 9.2 22.3 10.8 22.8L11.3 22.1C10.3 21.7 9.3 21.2 8.4 20.5C9.5 21.2 10.8 21.7 12.2 22L12.7 21.2C11 20.8 9.4 20.1 8 19C8.2 18 8.9 14.5 10.5 12.5C11.4 12 12.4 11.6 13.5 11.4L14 12.4C13 12.6 12.1 13 11.2 13.5C12.5 12.8 14 12.4 15.5 12.4C17 12.4 18.5 12.8 19.8 13.5C18.9 13 18 12.6 17 12.4L17.5 11.4C18.6 11.6 19.6 12 20.5 12.5C22.1 14.5 22.8 18 23 19C21.6 20.1 20 20.8 18.3 21.2L18.8 22C20.2 21.7 21.5 21.2 22.6 20.5C21.7 21.2 20.7 21.7 19.7 22.1L20.2 22.8C21.8 22.3 23.4 21.5 25 20.3C25.3 17.1 24.5 13.9 22.5 10.5Z" fill="white"/>
      <ellipse cx="13" cy="17.5" rx="1.5" ry="2" fill="white"/>
      <ellipse cx="19" cy="17.5" rx="1.5" ry="2" fill="white"/>
    </svg>
  ),

  bip: (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="16" fill="url(#bip_grad)"/>
      <defs>
        <linearGradient id="bip_grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00D4FF"/>
          <stop offset="1" stopColor="#007AAD"/>
        </linearGradient>
      </defs>
      <path d="M10 10H16C17.6 10 19 11.4 19 13C19 14.6 17.6 16 16 16H10V10Z" fill="white"/>
      <path d="M10 16H17C18.7 16 20 17.3 20 19C20 20.7 18.7 22 17 22H10V16Z" fill="white" fillOpacity="0.8"/>
      <circle cx="22" cy="11" r="2" fill="white"/>
      <rect x="21" y="14" width="2" height="8" rx="1" fill="white"/>
    </svg>
  ),
};

export default function PlatformIcon({ platformId, size = 28, className = "" }) {
  const icon = icons[platformId];
  if (!icon) {
    // Fallback: colored circle with first letter
    return (
      <div
        className={`flex items-center justify-center rounded-full font-bold text-white ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {platformId?.[0]?.toUpperCase()}
      </div>
    );
  }
  return (
    <div
      className={`shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {React.cloneElement(icon, { width: size, height: size })}
    </div>
  );
}