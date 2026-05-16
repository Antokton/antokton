import React, { useState, useEffect } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Crown, Check, Calendar, CreditCard, TrendingUp, 
  MessageCircle, Sparkles, Shield, Users, Star,
  ArrowRight, Lock, Unlock
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";

export default function PremiumDashboard() {
  const [user, setUser] = useState(null);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const authenticated = await base44.auth.isAuthenticated();
      setIsAuth(authenticated);
      if (authenticated) {
        const me = await base44.auth.me();
        setUser(me);
      }
    };
    loadUser();
  }, []);

  const { data: activeSubscription } = useQuery({
    queryKey: ["activeSubscription", user?.email],
    queryFn: async () => {
      const subs = await base44.entities.PremiumSubscription.filter({
        user_email: user.email,
        is_active: true
      });
      const now = new Date();
      return subs.find(s => new Date(s.end_date) > now) || null;
    },
    enabled: !!user
  });

  const { data: paymentHistory = [] } = useQuery({
    queryKey: ["paymentHistory", user?.email],
    queryFn: () => base44.entities.PremiumSubscription.filter(
      { user_email: user.email },
      "-created_date",
      10
    ),
    enabled: !!user
  });

  const isPremium = !!activeSubscription;

  const premiumBenefits = [
    {
      icon: Unlock,
      title: "Akses i Plotë në Kontakte",
      description: "Shiko të gjitha kontaktet e punëdhënësve dhe kompanive pa kufizime",
      locked: !isPremium
    },
    {
      icon: MessageCircle,
      title: "Mesazhe Direkte",
      description: "Komuniko direkt me punëdhënësit dhe anëtarët e tjerë",
      locked: !isPremium
    },
    {
      icon: Star,
      title: "Aplikime të Pakufizuara",
      description: "Apliko për sa të duash punë pa kufizime mujore",
      locked: !isPremium
    },
    {
      icon: TrendingUp,
      title: "Profil i Theksuar",
      description: "Profili juaj shfaqet më lart në rezultatet e kërkimit",
      locked: !isPremium
    },
    {
      icon: Crown,
      title: "Badge Premium",
      description: "Dallohuni me një badge ekskluziv Premium në profilin tuaj",
      locked: !isPremium
    },
    {
      icon: Calendar,
      title: "Ngjarje Ekskluzive",
      description: "Akses në ngjarje networking vetëm për anëtarë Premium",
      locked: !isPremium
    },
    {
      icon: Shield,
      title: "Prioritet në Mbështetje",
      description: "Përgjigjje më të shpejta nga ekipi ynë i mbështetjes",
      locked: !isPremium
    },
    {
      icon: Users,
      title: "Shiko Kush Ka Vizituar",
      description: "Shiko kush ka vizituar profilin tënd dhe interesohet për ty",
      locked: !isPremium
    }
  ];

  const usageStats = {
    applications: isPremium ? "∞" : "2/javë",
    messages: isPremium ? "∞" : "0",
    contacts: isPremium ? "Të gjitha" : "1 javë",
    events: isPremium ? "Të gjitha" : "Publike"
  };

  if (!isAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="bg-white/5 border-white/10 max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8">
            <Lock className="w-16 h-16 text-white/40 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">Hyni për të vazhduar</h2>
            <p className="text-white/60 mb-6">
              Duhet të hyni në llogarinë tuaj për të parë dashboard-in Premium
            </p>
            <Button
              onClick={() => base44.auth.redirectToLogin()}
              className="bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020]"
            >
              Hyr në llogari
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Crown className="w-4 h-4" />
            Premium Dashboard
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">
            {isPremium ? "Mirë se vini, Anëtar Premium" : "Bëhu Premium Sot"}
          </h1>
          <p className="text-white/60 text-lg">
            {isPremium 
              ? "Menaxho abonimi tuaj dhe shfrytëzo të gjitha përfitimet" 
              : "Zhblloko të gjitha funksionalitetet dhe përshpejto karrierën tënde"}
          </p>
        </motion.div>

        {/* Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card className={`${isPremium ? 'bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/30' : 'bg-white/5 border-white/10'}`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-white flex items-center gap-2 mb-2">
                    {isPremium ? (
                      <>
                        <Crown className="w-6 h-6 text-yellow-400" />
                        Anëtar Premium Aktiv
                      </>
                    ) : (
                      <>
                        <Star className="w-6 h-6 text-white/60" />
                        Anëtar Standard
                      </>
                    )}
                  </CardTitle>
                  <CardDescription className="text-white/60">
                    {isPremium 
                      ? `Abonimet skadon më ${new Date(activeSubscription.end_date).toLocaleDateString('sq-AL')}`
                      : "Upgrade në Premium për më shumë përfitime"}
                  </CardDescription>
                </div>
                {!isPremium && (
                  <Link to={createPageUrl("Subscriptions")}>
                    <Button className="bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020]">
                      Bëhu Premium
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-white/60 text-sm mb-1">Aplikime</p>
                  <p className="text-2xl font-bold text-white">{usageStats.applications}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-white/60 text-sm mb-1">Mesazhe</p>
                  <p className="text-2xl font-bold text-white">{usageStats.messages}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-white/60 text-sm mb-1">Kontakte</p>
                  <p className="text-2xl font-bold text-white">{usageStats.contacts}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-white/60 text-sm mb-1">Ngjarje</p>
                  <p className="text-2xl font-bold text-white">{usageStats.events}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="benefits" className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="benefits" className="data-[state=active]:bg-white/10">
              <Sparkles className="w-4 h-4 mr-2" />
              Përfitimet
            </TabsTrigger>
            <TabsTrigger value="billing" className="data-[state=active]:bg-white/10">
              <CreditCard className="w-4 h-4 mr-2" />
              Faturat
            </TabsTrigger>
          </TabsList>

          {/* Benefits Tab */}
          <TabsContent value="benefits">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {premiumBenefits.map((benefit, i) => (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className={`${benefit.locked ? 'bg-white/5 border-white/10' : 'bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30'} h-full`}>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-xl ${benefit.locked ? 'bg-white/5' : 'bg-green-500/20'}`}>
                          <benefit.icon className={`w-6 h-6 ${benefit.locked ? 'text-white/40' : 'text-green-400'}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-white">{benefit.title}</h3>
                            {!benefit.locked && (
                              <Badge className="bg-green-500/20 text-green-400 border-0 text-xs">
                                Aktiv
                              </Badge>
                            )}
                            {benefit.locked && (
                              <Lock className="w-4 h-4 text-white/40" />
                            )}
                          </div>
                          <p className="text-white/60 text-sm">{benefit.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {!isPremium && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-8 text-center"
              >
                <Card className="bg-gradient-to-r from-[#8ab4ff]/10 to-[#9bffd6]/10 border-[#8ab4ff]/30">
                  <CardContent className="pt-8 pb-8">
                    <Crown className="w-16 h-16 text-[#8ab4ff] mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-white mb-2">
                      Zhblloko të gjitha përfitimet
                    </h3>
                    <p className="text-white/60 mb-6">
                      Bëhu Premium sot dhe fillo të përdorësh të gjitha funksionalitetet
                    </p>
                    <Link to={createPageUrl("Subscriptions")}>
                      <Button className="bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] text-lg px-8 py-6">
                        Shiko Planët
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing">
            {activeSubscription && (
              <Card className="bg-white/5 border-white/10 mb-6">
                <CardHeader>
                  <CardTitle className="text-white">Abonimet Aktual</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-white/60 text-sm mb-1">Plani</p>
                      <p className="text-white font-semibold capitalize">{activeSubscription.plan_type}</p>
                    </div>
                    <div>
                      <p className="text-white/60 text-sm mb-1">Paguar</p>
                      <p className="text-white font-semibold">{activeSubscription.amount_paid} EUR</p>
                    </div>
                    <div>
                      <p className="text-white/60 text-sm mb-1">Skadon më</p>
                      <p className="text-white font-semibold">
                        {new Date(activeSubscription.end_date).toLocaleDateString('sq-AL')}
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 flex gap-3">
                    <Link to={createPageUrl("Subscriptions")} className="flex-1">
                      <Button variant="outline" className="w-full border-white/10 text-white hover:bg-white/5">
                        Ndrysho Planin
                      </Button>
                    </Link>
                    <Link to={createPageUrl("Subscriptions")} className="flex-1">
                      <Button variant="outline" className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10">
                        Anulo Abonimin
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Historiku i Pagesave</CardTitle>
                <CardDescription className="text-white/60">
                  Shiko të gjitha pagesat e mëparshme
                </CardDescription>
              </CardHeader>
              <CardContent>
                {paymentHistory.length > 0 ? (
                  <div className="space-y-3">
                    {paymentHistory.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                            <Check className="w-5 h-5 text-green-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium capitalize">
                              {payment.plan_type} Plan
                            </p>
                            <p className="text-white/60 text-sm">
                              {new Date(payment.created_date).toLocaleDateString('sq-AL')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-semibold">{payment.amount_paid} EUR</p>
                          <Badge className={`${payment.is_active ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/60'} border-0 text-xs`}>
                            {payment.is_active ? 'Aktiv' : 'I Skaduar'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <CreditCard className="w-16 h-16 text-white/20 mx-auto mb-4" />
                    <p className="text-white/40">Nuk ka histori pagesash</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
