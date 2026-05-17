import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { base44 } from "@/api/antoktonClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Mail, UserPlus, LogIn, AlertCircle } from "lucide-react";

export default function Login() {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", full_name: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fromUrl = searchParams.get("from_url") || "/Home";
  const redirectTarget = fromUrl.includes("/Login") ? "/Home" : fromUrl;

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (mode === "register") {
        await base44.auth.register({
          email: form.email,
          password: form.password,
          full_name: form.full_name
        });
      } else {
        await base44.auth.loginViaEmailPassword(form.email, form.password);
      }
      window.location.href = redirectTarget;
    } catch (err) {
      setError(err.message || "Nuk u krye kyçja. Kontrollo të dhënat dhe provo përsëri.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#07101f]">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.06] p-7 shadow-2xl">
        <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center mx-auto mb-5">
          {mode === "register" ? <UserPlus className="w-7 h-7 text-blue-300" /> : <Lock className="w-7 h-7 text-blue-300" />}
        </div>

        <h1 className="text-2xl font-bold text-white text-center mb-2">
          {mode === "register" ? "Krijo llogari" : "Hyr në Antokton"}
        </h1>
        <p className="text-white/50 text-sm text-center mb-6">
          {mode === "register" ? "Regjistrohu për beta të kufizuar." : "Përdor emailin dhe fjalëkalimin tënd."}
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
                type="email"
                required
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                className="border-white/10 h-11 text-white bg-white/10 pl-9"
                autoComplete="email"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-white/70 text-sm">Fjalëkalimi</Label>
            <Input
              type="password"
              required
              minLength={10}
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              className="border-white/10 h-11 text-white bg-white/10"
              autoComplete={mode === "register" ? "new-password" : "current-password"}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-red-300 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] font-semibold h-11"
          >
            {mode === "register" ? <UserPlus className="w-4 h-4 mr-2" /> : <LogIn className="w-4 h-4 mr-2" />}
            {loading ? "Duke punuar..." : mode === "register" ? "Regjistrohu" : "Hyr"}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => {
            setError("");
            setMode(mode === "register" ? "login" : "register");
          }}
          className="w-full mt-5 text-sm text-blue-200 hover:text-white"
        >
          {mode === "register" ? "Ke llogari? Hyr këtu" : "Nuk ke llogari? Regjistrohu"}
        </button>
      </div>
    </div>
  );
}
