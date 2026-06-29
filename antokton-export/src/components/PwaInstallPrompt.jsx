import React, { useEffect, useMemo, useState } from "react";
import { Download, Smartphone, X } from "lucide-react";

const DISMISSED_KEY = "antoktonInstallPromptDismissedAt";
const REMIND_AFTER_MS = 24 * 60 * 60 * 1000;
const ANDROID_APK_URL = "/downloads/antokton-android.apk";

function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.matchMedia?.("(display-mode: fullscreen)")?.matches ||
    window.navigator.standalone === true ||
    document.referrer.startsWith("android-app://")
  );
}

function recentlyDismissed() {
  const raw = localStorage.getItem(DISMISSED_KEY);
  if (!raw) return false;
  const timestamp = Number(raw);
  return Number.isFinite(timestamp) && Date.now() - timestamp < REMIND_AFTER_MS;
}

export default function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] = useState(null);
  const [visible, setVisible] = useState(false);
  const [standalone, setStandalone] = useState(() => isStandaloneMode());
  const [installUnavailable, setInstallUnavailable] = useState(false);

  const canUseInstallPrompt = Boolean(installEvent);
  const isAppleDevice = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return /iphone|ipad|ipod/i.test(navigator.userAgent || "");
  }, []);
  const isAndroidDevice = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return /android/i.test(navigator.userAgent || "");
  }, []);

  useEffect(() => {
    const refreshStandalone = () => setStandalone(isStandaloneMode());
    window.addEventListener("appinstalled", refreshStandalone);

    const handleBeforeInstall = (event) => {
      event.preventDefault();
      setInstallEvent(event);
      setInstallUnavailable(false);
      if (!recentlyDismissed() && !isStandaloneMode()) {
        window.setTimeout(() => setVisible(true), 1200);
      }
    };

    const handleManualInstallRequest = () => {
      if (isStandaloneMode()) return;
      setInstallUnavailable(!installEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("antokton:install-app", handleManualInstallRequest);

    const reminder = window.setTimeout(() => {
      if (!isStandaloneMode() && !recentlyDismissed()) {
        setInstallUnavailable(!installEvent);
        setVisible(true);
      }
    }, 45000);

    return () => {
      window.clearTimeout(reminder);
      window.removeEventListener("appinstalled", refreshStandalone);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("antokton:install-app", handleManualInstallRequest);
    };
  }, [installEvent]);

  const close = () => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setVisible(false);
  };

  const install = async () => {
    if (!installEvent) {
      if (isAndroidDevice) {
        window.location.href = ANDROID_APK_URL;
        setVisible(false);
        localStorage.setItem(DISMISSED_KEY, String(Date.now()));
        return;
      }
      setInstallUnavailable(true);
      setVisible(true);
      return;
    }

    installEvent.prompt();
    try {
      await installEvent.userChoice;
    } finally {
      setInstallEvent(null);
      setVisible(false);
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    }
  };

  if (standalone || !visible) return null;

  return (
    <div
      className="fixed left-3 right-3 z-[70] mx-auto max-w-md rounded-2xl border border-[#8ab4ff]/25 bg-[#101827]/95 p-4 text-white shadow-2xl shadow-black/40 backdrop-blur md:left-auto md:right-6 md:w-[360px]"
      style={{ bottom: "calc(76px + env(safe-area-inset-bottom))" }}
      role="dialog"
      aria-label="Shkarko aplikacionin Antokton"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#8ab4ff] to-[#9bffd6] text-[#0b1020]">
          <Smartphone className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">Shkarko app Antokton</p>
          <p className="mt-1 text-xs leading-relaxed text-white/70">
            {canUseInstallPrompt
              ? "Instaloje si aplikacion që të hapet pa shirit browser-i dhe me hyrje më të shpejtë."
              : isAppleDevice
                ? "Në iPhone: Share -> Add to Home Screen. Në Android përdor menunë e browser-it ose provo përsëri pak më vonë."
                : isAndroidDevice
                  ? "Nëse instalimi automatik nuk shfaqet, butoni shkarkon APK-në zyrtare të Antokton."
                  : "Nëse butoni i instalimit nuk shfaqet ende, përdor menunë e browser-it: Install app / Add to Home screen."}
          </p>
          {installUnavailable && (
            <p className="mt-2 rounded-lg border border-yellow-400/20 bg-yellow-400/10 px-2 py-1 text-[11px] text-yellow-100">
              Prompt-i automatik nuk është i disponueshëm tani. Në Android mund të shkarkosh APK-në, ndërsa në iPhone përdor Add to Home Screen.
            </p>
          )}
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={install}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] px-3 py-2 text-xs font-bold text-[#0b1020]"
            >
              <Download className="h-3.5 w-3.5" />
              Shkarko app
            </button>
            <button
              type="button"
              onClick={close}
              className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white/65 hover:bg-white/10 hover:text-white"
            >
              Më vonë
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={close}
          className="shrink-0 rounded-lg p-1 text-white/45 hover:bg-white/10 hover:text-white"
          aria-label="Mbyll njoftimin e shkarkimit"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
