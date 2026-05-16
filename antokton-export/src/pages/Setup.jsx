import React, { useState, useEffect } from "react";
import { base44 } from "@/api/antoktonClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function Setup() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [credentials, setCredentials] = useState({
    email: "antokton321@gmail.com",
    password: "Antokton@2026"
  });

  useEffect(() => {
    const checkAuth = async () => {
      const authenticated = await base44.auth.isAuthenticated();
      if (authenticated) {
        const me = await base44.auth.me();
        setUser(me);
      }
    };
    checkAuth();
  }, []);

  const setupAdmin = async () => {
    setLoading(true);
    setError("");
    
    try {
      // Invite admin user
      await base44.users.inviteUser(credentials.email, "admin");
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Gabim në krijimin e administratorit");
    }
    
    setLoading(false);
  };

  const upgradeToAdmin = async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    
    try {
      // Update current user to admin
      await base44.auth.updateMe({ role: "admin" });
      setSuccess(true);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setError(err.message || "Gabim në ndryshimin e rolit");
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="rounded-2xl border border-white/10 p-8" style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(12px)'
        }}>
          <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8 text-blue-400" />
          </div>

          <h1 className="text-2xl font-bold text-white text-center mb-2">
            Konfigurimi i Administratorit
          </h1>
          <p className="text-white/40 text-sm text-center mb-8">
            Krijo administratorin e parë të platformës
          </p>

          {success ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <p className="text-white font-medium mb-2">U krijua me sukses!</p>
              <p className="text-white/40 text-sm">
                {user ? "Roli yt u ndryshua në Administrator." : "Ftesa u dërgua në email."}
              </p>
            </div>
          ) : user ? (
            // If logged in, just upgrade role
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <p className="text-blue-300 text-sm">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  Ti je i kyçur si <strong>{user.email}</strong>
                </p>
              </div>

              {user.email === "antokton321@gmail.com" ? (
                <>
                  <p className="text-white/60 text-sm text-center">
                    Kliko butonin më poshtë për t'u bërë Administrator
                  </p>
                  <Button
                    onClick={upgradeToAdmin}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] font-semibold h-12"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Shield className="w-5 h-5 mr-2" />
                        Aktivizo Administrator
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-yellow-400 text-sm">
                    Ky email nuk është i autorizuar për administrator.
                  </p>
                </div>
              )}
            </div>
          ) : (
            // Not logged in - show invite form
            <div className="space-y-6">
              <div className="space-y-1.5">
                <Label className="text-white/70 text-sm">Email Administratori</Label>
                <Input
                  type="email"
                  value={credentials.email}
                  onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                  className="border-white/10 h-11 text-white bg-white/10"
                  disabled
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-white/70 text-sm">Fjalëkalimi (përkohshëm)</Label>
                <Input
                  type="text"
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  className="border-white/10 h-11 text-white"
                  style={{ background: 'rgba(255, 255, 255, 0.08)' }}
                />
                <p className="text-white/30 text-xs">
                  Do të kërkosh të ndryshosh fjalëkalimin në login të parë
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-white/60 text-xs leading-relaxed">
                  <strong className="text-white">Kredencialet:</strong><br />
                  Email: {credentials.email}<br />
                  Password: {credentials.password}
                </p>
              </div>

              <Button
                onClick={setupAdmin}
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] font-semibold h-12"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Shield className="w-5 h-5 mr-2" />
                    Krijo Administratorin
                  </>
                )}
              </Button>

              <p className="text-white/30 text-xs text-center">
                Pas krijimit, hyr me emailin dhe fjalëkalimin e mësipërm
              </p>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-red-400 text-xs">{error}</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}