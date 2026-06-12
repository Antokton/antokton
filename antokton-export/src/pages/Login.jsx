import React, { useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/antoktonClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Mail, UserPlus, LogIn, AlertCircle, Eye, EyeOff, KeyRound } from "lucide-react";

function passwordResetStatusMessage(result) {
  if (result?.delivered === true) {
    return `Emaili i rivendosjes u dërgua te ${result.to || "adresa e kërkuar"}. Kontrollo edhe Spam/Junk.`;
  }
  if (result?.reason === "no_active_account") {
    return "Emaili nuk u dërgua: kjo adresë nuk ka llogari aktive në Antokton.";
  }
  if (result?.reason === "inactive_auth_account") {
    return "Emaili nuk u dërgua: llogaria ekziston, por nuk është aktive për hyrje.";
  }
  if (result?.reason === "email_provider_not_configured") {
    return "Emaili nuk u dërgua: shërbimi i email-it nuk është konfiguruar në server.";
  }
  return "Kërkesa u pranua, por serveri nuk konfirmoi dërgimin e email-it.";
}

export default function Login() {
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get("token") || "";
  const resetEmail = searchParams.get("email") || "";
  const [mode, setMode] = useState(() => {
    if (searchParams.get("mode") === "reset" && resetToken) return "new-password";
    if (searchParams.get("mode") === "register") return "register";
    return "login";
  });
  const [form, setForm] = useState({ email: "", password: "", first_name: "", surname: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  const fromUrl = searchParams.get("from_url") || "/Home";
  const redirectTarget = fromUrl.includes("/Login") ? "/Home" : fromUrl;

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

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const email = (emailRef.current?.value || form.email).trim().toLowerCase();
      const password = passwordRef.current?.value ?? form.password;

      if (mode === "reset") {
        const result = await base44.auth.requestPasswordReset(email);
        const message = passwordResetStatusMessage({ ...result, to: email });
        if (result?.delivered === true) setSuccessMessage(message);
        else setError(message);
        return;
      }

      if (mode === "new-password") {
        await base44.auth.resetPassword({ email, token: resetToken, password });
        setSuccessMessage("Fjalëkalimi u rivendos. Tani mund të hysh me fjalëkalimin e ri.");
        setMode("login");
        return;
      }

      let authResult;
      if (mode === "register") {
        if (!acceptedLegal) {
          setError("Për regjistrim duhet të pranosh Kushtet e Përdorimit dhe Politikën e Privatësisë.");
          return;
        }
        if (!form.first_name.trim() || !form.surname.trim()) {
          setError("Për regjistrim duhet të vendosësh emrin dhe mbiemrin.");
          return;
        }
        authResult = await base44.auth.register({
          email,
          password,
          first_name: form.first_name.trim(),
          surname: form.surname.trim(),
          full_name: `${form.first_name.trim()} ${form.surname.trim()}`.trim()
        });
      } else {
        authResult = await base44.auth.loginViaEmailPassword(email, password);
      }
      window.location.replace(getPostLoginUrl(mode === "register" ? "/Profile?complete=1" : redirectTarget, authResult?.access_token));
    } catch (err) {
      setError(err.message || "Nuk u krye hyrja. Kontrollo të dhënat dhe provo përsëri.");
      if (err.status === 401) {
        setError("Emaili ose fjalëkalimi nuk është i saktë.");
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (nextMode) => {
    setError("");
    setSuccessMessage("");
    setMode(nextMode);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#07101f]">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.06] p-7 shadow-2xl">
        <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center mx-auto mb-5">
          {mode === "register" ? (
            <UserPlus className="w-7 h-7 text-blue-300" />
          ) : mode === "new-password" ? (
            <KeyRound className="w-7 h-7 text-blue-300" />
          ) : mode === "reset" ? (
            <KeyRound className="w-7 h-7 text-blue-300" />
          ) : (
            <Lock className="w-7 h-7 text-blue-300" />
          )}
        </div>

        <h1 className="text-2xl font-bold text-white text-center mb-2">
          {mode === "register" ? "Krijo llogari" : mode === "reset" ? "Rivendos fjalëkalimin" : mode === "new-password" ? "Vendos fjalëkalim të ri" : "Hyr në Antokton"}
        </h1>
        <p className="text-white/50 text-sm text-center mb-6">
          {mode === "register"
            ? "Regjistrohu për beta të kufizuar."
            : mode === "reset"
              ? "Shkruaj emailin e llogarisë për të kërkuar rivendosjen."
              : mode === "new-password"
                ? "Shkruaj fjalëkalimin e ri për llogarinë tënde."
              : "Përdor emailin dhe fjalëkalimin tënd."}
        </p>

        <form onSubmit={submit} className="space-y-4">
          {mode === "register" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-white/70 text-sm">Emri *</Label>
                <Input
                  value={form.first_name}
                  onChange={(event) => setForm({ ...form, first_name: event.target.value })}
                  className="border-white/10 h-11 text-white bg-white/10"
                  autoComplete="given-name"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-white/70 text-sm">Mbiemri *</Label>
                <Input
                  value={form.surname}
                  onChange={(event) => setForm({ ...form, surname: event.target.value })}
                  className="border-white/10 h-11 text-white bg-white/10"
                  autoComplete="family-name"
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-white/70 text-sm">Email</Label>
            <div className="relative">
              <Mail className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                ref={emailRef}
                type="email"
                required
                defaultValue={resetEmail || form.email}
                readOnly={mode === "new-password" && Boolean(resetEmail)}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                className="border-white/10 h-11 text-white bg-white/10 pl-9"
                autoComplete="email"
              />
            </div>
          </div>

          {mode !== "reset" && (
            <div className="space-y-1.5">
              <Label className="text-white/70 text-sm">{mode === "new-password" ? "Fjalëkalimi i ri" : "Fjalëkalimi"}</Label>
              <div className="flex items-stretch gap-2">
                <Input
                  ref={passwordRef}
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={10}
                  defaultValue={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  className="min-w-0 flex-1 border-white/10 h-11 text-white bg-white/10"
                  autoComplete={mode === "register" || mode === "new-password" ? "new-password" : "current-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="h-11 shrink-0 inline-flex items-center justify-center gap-1.5 rounded-lg border border-blue-300/35 bg-[#0f172a] px-3 text-xs font-semibold text-white shadow-sm hover:bg-[#1d2b47] focus:outline-none focus:ring-2 focus:ring-blue-300/60"
                  aria-label={showPassword ? "Fshih fjalëkalimin" : "Shfaq fjalëkalimin"}
                  title={showPassword ? "Fshih fjalëkalimin" : "Shfaq fjalëkalimin"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  <span>{showPassword ? "Fshih" : "Shfaq"}</span>
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-red-300 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {mode === "register" && (
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-sm leading-relaxed text-white/75 transition hover:bg-white/10">
              <input
                type="checkbox"
                checked={acceptedLegal}
                onChange={(event) => setAcceptedLegal(event.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer"
                required
              />
              <span>
                Pranoj{" "}
                <Link to="/terms" target="_blank" rel="noopener noreferrer" className="text-blue-200 hover:text-white underline" onClick={(event) => event.stopPropagation()}>Kushtet e Përdorimit</Link>
                {" "}dhe{" "}
                <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-200 hover:text-white underline" onClick={(event) => event.stopPropagation()}>Politikën e Privatësisë</Link>.
              </span>
            </label>
          )}

          {successMessage && (
            <div className="flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-200 text-sm">
              <Mail className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || (mode === "register" && !acceptedLegal)}
            className="w-full bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] font-semibold h-11 hover:opacity-90"
          >
            {mode === "register" ? (
              <UserPlus className="w-4 h-4 mr-2" />
            ) : mode === "reset" || mode === "new-password" ? (
              <KeyRound className="w-4 h-4 mr-2" />
            ) : (
              <LogIn className="w-4 h-4 mr-2" />
            )}
            {loading ? "Duke punuar..." : mode === "register" ? "Regjistrohu" : mode === "reset" ? "Dërgo kërkesën" : mode === "new-password" ? "Ruaj fjalëkalimin" : "Hyr"}
          </Button>
        </form>

        {mode === "login" && (
          <button
            type="button"
            onClick={() => switchMode("reset")}
            className="w-full mt-4 text-sm text-blue-200 hover:text-white"
          >
            Ke harruar fjalëkalimin?
          </button>
        )}

        <button
          type="button"
          onClick={() => switchMode(mode === "register" || mode === "reset" || mode === "new-password" ? "login" : "register")}
          className="w-full mt-5 text-sm text-blue-200 hover:text-white"
        >
          {mode === "register" ? "Ke llogari? Hyr këtu" : mode === "reset" || mode === "new-password" ? "Kthehu te hyrja" : "Nuk ke llogari? Regjistrohu"}
        </button>
      </div>
    </div>
  );
}
