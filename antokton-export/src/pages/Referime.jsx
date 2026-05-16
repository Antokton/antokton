import React, { useState, useEffect } from "react";
import { base44 } from "@/api/antoktonClient";
import { Gift, Copy, Share2, Users, CheckCircle, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

export default function Referime() {
  const [user, setUser] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) {
        base44.auth.redirectToLogin();
        return;
      }
      const me = await base44.auth.me();
      setUser(me);
    };
    checkAuth();
  }, []);

  const { data: referrals = [] } = useQuery({
    queryKey: ['referrals', user?.email],
    queryFn: () => base44.entities.UserReference.filter({ referrer_email: user?.email }),
    enabled: !!user?.email,
    initialData: []
  });

  const referralCode = user?.id ? `ANT-${user.id.substring(0, 8).toUpperCase()}` : '';
  const referralLink = `${window.location.origin}?ref=${referralCode}`;
  const registeredReferrals = referrals.filter(r => r.status === 'registered').length;
  const earnedRewards = Math.floor(registeredReferrals / 3);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const message = encodeURIComponent(`Bashkohu me Antokton dhe gjej punë në Europë! 🚀\n\nPërdor kodin tim të referimit: ${referralCode}\n${referralLink}`);
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#8ab4ff]/20 to-[#9bffd6]/20 flex items-center justify-center mx-auto mb-4 border border-white/10">
            <Gift className="w-8 h-8 text-[#8ab4ff]" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Programi i Referimeve</h1>
          <p className="text-white/60 text-sm">Fto miqtë dhe fito shpërblime ekskluzive</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6 text-center">
              <Users className="w-8 h-8 text-[#8ab4ff] mx-auto mb-2" />
              <div className="text-3xl font-bold text-white mb-1">{referrals.length}</div>
              <p className="text-white/60 text-sm">Ftesa të Dërguara</p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6 text-center">
              <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <div className="text-3xl font-bold text-white mb-1">{registeredReferrals}</div>
              <p className="text-white/60 text-sm">Miq të Regjistruar</p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6 text-center">
              <Crown className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
              <div className="text-3xl font-bold text-white mb-1">{earnedRewards}</div>
              <p className="text-white/60 text-sm">Muaj Premium Fituar</p>
            </CardContent>
          </Card>
        </div>

        {/* Referral Code */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Kodi juaj i Referimit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                value={referralCode}
                readOnly
                className="bg-white/5 border-white/10 text-white font-mono text-lg"
              />
              <Button
                onClick={handleCopyLink}
                className="bg-white/10 hover:bg-white/20 text-white border-white/10"
                variant="outline"
              >
                {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>

            <div className="space-y-2">
              <Button
                onClick={handleCopyLink}
                className="w-full bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] hover:opacity-90"
              >
                <Copy className="w-4 h-4 mr-2" />
                {copied ? 'U Kopjua!' : 'Kopjo Linkun e Referimit'}
              </Button>
              <Button
                onClick={handleWhatsAppShare}
                variant="outline"
                className="w-full border-white/20 text-white hover:bg-white/10"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Ndaj në WhatsApp
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Rewards Info */}
        <Card className="bg-gradient-to-br from-[#8ab4ff]/10 to-[#9bffd6]/10 border-[#8ab4ff]/20">
          <CardHeader>
            <CardTitle className="text-white">Si Funksionon?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-white/70 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white font-bold">1</span>
              </div>
              <div>
                <p className="font-medium text-white">Ndaj kodin tënd të referimit</p>
                <p className="text-white/60">Dërgo linkun miqve dhe familjes</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white font-bold">2</span>
              </div>
              <div>
                <p className="font-medium text-white">Miqtë regjistrohen me kodin</p>
                <p className="text-white/60">Çdo regjistrim i suksesshëm numërohet</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white font-bold">3</span>
              </div>
              <div>
                <p className="font-medium text-white">Fito shpërblime</p>
                <p className="text-white/60">Për çdo 3 miq të regjistruar, fito 1 muaj Premium FALAS!</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Referral List */}
        {referrals.length > 0 && (
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Historiku i Referimeve</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {referrals.slice(0, 10).map((ref, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-white/10 last:border-0">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                        <Users className="w-4 h-4 text-white/60" />
                      </div>
                      <div>
                        <p className="text-white text-sm">{ref.referred_email || 'Anonime'}</p>
                        <p className="text-white/40 text-xs">{new Date(ref.created_date).toLocaleDateString('sq-AL')}</p>
                      </div>
                    </div>
                    {ref.status === 'registered' ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : (
                      <span className="text-white/40 text-xs">Në pritje</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
}