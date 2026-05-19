import React, { useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { base44 } from "@/api/antoktonClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Mail, UserPlus, LogIn, AlertCircle, Eye, EyeOff, KeyRound } from "lucide-react";

export default function Login() {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", full_name: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
        await base44.auth.requestPasswordReset(email);
        setSuccessMessage("Nëse ky email ekziston, do të dërgohen udhëzimet për rivendosjen e fjalëkalimit.");
        return;
      }

      let authResult;
      if (mode === "register") {
        authResult = await base44.auth.register({
          email,
          password,
          full_name: form.full_name.trim()
        });
      } else {
        authResult = await base44.auth.loginViaEmailPassword(email, password);
      }
      window.location.replace(getPostLoginUrl(redirectTarget, authResult?.access_token));
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
          ) : mode === "reset" ? (
            <KeyRound className="w-7 h-7 text-blue-300" />
          ) : (
            <Lock className="w-7 h-7 text-blue-300" />
          )}
        </div>

        <h1 className="text-2xl font-bold text-white text-center mb-2">
          {mode === "register" ? "Krijo llogari" : mode === "reset" ? "Rivendos fjalëkalimin" : "Hyr në Antokton"}
        </h1>
        <p className="text-white/50 text-sm text-center mb-6">
          {mode === "register"
            ? "Regjistrohu për beta të kufizuar."
            : mode === "reset"
              ? "Shkruaj emailin e llogarisë për të kërkuar rivendosjen."
              : "Përdor emailin dhe fjalëkalimin tënd."}
        </p>

        <form onSubmit={submit} className="space-y-4">
          {mode === "register" && (
            <div className="space-y-1.5">
              <Label className="text-white/70 text-sm">Emri i plotë</Label>
              <Input
                value={form.full_name}
                onChange={(event) => setForm({ ...form, full_name: event.target.value })}
                className="border-white/10 h-11 text-white bg-white/10"
                autoComplete="name"
              />
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
                defaultValue={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                className="border-white/10 h-11 text-white bg-white/10 pl-9"
                autoComplete="email"
              />
            </div>
          </div>

          {mode !== "reset" && (
            <div className="space-y-1.5">
              <Label className="text-white/70 text-sm">Fjalëkalimi</Label>
              <div className="relative">
                <Input
                  ref={passwordRef}
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={10}
                  defaultValue={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  className="border-white/10 h-11 text-white bg-white/10 pr-24"
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#172237] px-2.5 py-1.5 text-xs font-semibold text-white/85 hover:bg-[#20304d] hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-300/60"
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

          {successMessage && (
            <div className="flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-200 text-sm">
              <Mail className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] font-semibold h-11"
          >
            {mode === "register" ? (
              <UserPlus className="w-4 h-4 mr-2" />
            ) : mode === "reset" ? (
              <KeyRound className="w-4 h-4 mr-2" />
            ) : (
              <LogIn className="w-4 h-4 mr-2" />
            )}
            {loading ? "Duke punuar..." : mode === "register" ? "Regjistrohu" : mode === "reset" ? "Dërgo kërkesën" : "Hyr"}
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
          onClick={() => switchMode(mode === "register" || mode === "reset" ? "login" : "register")}
          className="w-full mt-5 text-sm text-blue-200 hover:text-white"
        >
          {mode === "register" ? "Ke llogari? Hyr këtu" : mode === "reset" ? "Kthehu te hyrja" : "Nuk ke llogari? Regjistrohu"}
        </button>
      </div>
    </div>
  );
}
