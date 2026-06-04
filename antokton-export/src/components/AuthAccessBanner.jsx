import React, { useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AlertCircle, Eye, EyeOff, KeyRound, Lock, LogIn, Mail, UserPlus, X } from "lucide-react";
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
  const [mode, setMode] = useState("prompt");
  const [form, setForm] = useState({ email: "", password: "", full_name: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  const getPostLoginUrl = (target, accessToken) => {
    let url;
    try {
      url = new URL(target || "/Home", window.location.origin);
    } catch {
      url = new URL("/Home", window.location.origin);
    }

    if (url.origin !== window.location.origin || url.pathname.toLowerCase() === "/login") {
      url = new URL("/Home", window.location.origin);
    }

    if (accessToken) url.searchParams.set("access_token", accessToken);
    return url.toString();
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError("");
    setSuccessMessage("");
  };

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const email = (emailRef.current?.value || form.email).trim().toLowerCase();
      const password = passwordRef.current?.value ?? form.password;

      if (mode === "reset") {
        await base44.auth.requestPasswordReset(email);
        setSuccessMessage("Nëse ky email ekziston, do të dërgohen udhëzimet për rivendosjen e fjalëkalimit.");
        return;
      }

      if (mode === "register" && !acceptedLegal) {
        setError("Për regjistrim duhet të pranosh Kushtet e Përdorimit dhe Politikën e Privatësisë.");
        return;
      }

      const authResult = mode === "register"
        ? await base44.auth.register({ email, password, full_name: form.full_name.trim() })
        : await base44.auth.loginViaEmailPassword(email, password);

      window.location.replace(getPostLoginUrl(returnUrl, authResult?.access_token));
    } catch (err) {
      setError(err.status === 401 ? "Emaili ose fjalëkalimi nuk është i saktë." : err.message || "Nuk u krye hyrja. Kontrollo të dhënat dhe provo përsëri.");
    } finally {
      setLoading(false);
    }
  };

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

      {mode === "prompt" ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => switchMode("login")}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#8ab4ff] text-sm font-bold text-[#06111f] px-3 py-2.5 transition hover:bg-[#a6c6ff]"
          >
            <LogIn className="h-4 w-4" />
            Hyr
          </button>
          <button
            type="button"
            onClick={() => switchMode("register")}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 text-sm font-semibold text-white px-3 py-2.5 transition hover:bg-white/15"
          >
            <UserPlus className="h-4 w-4" />
            Regjistrohu
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-3">
          {mode === "register" && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/70">Emri i plotë</label>
              <input
                value={form.full_name}
                onChange={(event) => setForm({ ...form, full_name: event.target.value })}
                className="h-11 w-full rounded-xl border border-white/10 bg-white/10 px-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-[#8ab4ff]/70"
                autoComplete="name"
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/70">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <input
                ref={emailRef}
                type="email"
                required
                defaultValue={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                className="h-11 w-full rounded-xl border border-white/10 bg-white/10 pl-9 pr-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-[#8ab4ff]/70"
                autoComplete="email"
              />
            </div>
          </div>

          {mode !== "reset" && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/70">Fjalëkalimi</label>
              <div className="flex gap-2">
                <input
                  ref={passwordRef}
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={10}
                  defaultValue={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  className="h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-white/10 px-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-[#8ab4ff]/70"
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 text-xs font-semibold text-white transition hover:bg-white/15"
                  aria-label={showPassword ? "Fshih fjalëkalimin" : "Shfaq fjalëkalimin"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  <span className="hidden min-[360px]:inline">{showPassword ? "Fshih" : "Shfaq"}</span>
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/10 p-2.5 text-xs text-red-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-start gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-2.5 text-xs text-emerald-100">
              <Mail className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {mode === "register" && (
            <label className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs text-white/70">
              <input
                type="checkbox"
                checked={acceptedLegal}
                onChange={(event) => setAcceptedLegal(event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0"
                required
              />
              <span>
                Pranoj <Link to="/terms" className="text-blue-200 underline hover:text-white">Kushtet e Përdorimit</Link>
                {" "}dhe <Link to="/privacy" className="text-blue-200 underline hover:text-white">Politikën e Privatësisë</Link>.
              </span>
            </label>
          )}

          <button
            type="submit"
            disabled={loading || (mode === "register" && !acceptedLegal)}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#8ab4ff] text-sm font-bold text-[#06111f] transition hover:bg-[#a6c6ff] disabled:opacity-70"
          >
            {mode === "register" ? <UserPlus className="h-4 w-4" /> : mode === "reset" ? <KeyRound className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
            {loading ? "Duke punuar..." : mode === "register" ? "Regjistrohu" : mode === "reset" ? "Dërgo kërkesën" : "Hyr"}
          </button>

          <div className="grid gap-2 min-[360px]:grid-cols-2">
            <button
              type="button"
              onClick={() => switchMode(mode === "reset" ? "login" : "reset")}
              className="rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-white/75 transition hover:bg-white/10 hover:text-white"
            >
              {mode === "reset" ? "Kthehu te hyrja" : "Ke harruar fjalëkalimin?"}
            </button>
            <button
              type="button"
              onClick={() => switchMode(mode === "register" ? "login" : "register")}
              className="rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-white/75 transition hover:bg-white/10 hover:text-white"
            >
              {mode === "register" ? "Ke llogari? Hyr" : "Nuk ke llogari? Regjistrohu"}
            </button>
          </div>

          <button
            type="button"
            onClick={() => switchMode("prompt")}
            className="w-full text-center text-xs font-medium text-white/45 transition hover:text-white"
          >
            Mbyll fushat
          </button>
        </form>
      )}

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
