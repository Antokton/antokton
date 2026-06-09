import React, { useState, useEffect } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Star, Sparkles, AlertCircle, Building2 } from "lucide-react";
import { motion } from "framer-motion";
import { hasEarlyMemberPremiumAccess } from "@/utils/premiumAccess";

export default function Subscriptions() {
  const [user, setUser] = useState(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const authenticated = await base44.auth.isAuthenticated();
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

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (activeSubscription) {
        await base44.entities.PremiumSubscription.update(activeSubscription.id, {
          is_active: false
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activeSubscription"] });
      setCancelDialogOpen(false);
      alert("Abonimet u anulua. Do të mbeteni Premium deri në fund të periudhës.");
    }
  });

  const handleCheckout = async (planType) => {
    if (!user) {
      base44.auth.redirectToLogin();
      return;
    }
    
    try {
      const response = await base44.functions.invoke('createPremiumCheckout', {
        planType,
        userEmail: user.email
      });
      
      if (response.data?.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      alert("Ka ndodhur një gabim. Ju lutemi provoni përsëri.");
    }
  };

  const plans = [
    {
      name: "Anëtar Standard",
      price: "FALAS",
      period: "",
      icon: Star,
      features: [
        "1 javë shfaqje e kontakteve",
        "2 aplikime për javë",
        "Profil bazik",
        "Pjesëmarrje në ngjarje publike",
        "Komentime të kufizuara"
      ],
      current: !activeSubscription,
      cta: "Plani aktual",
      disabled: true
    },
    {
      name: "Anëtar Premium",
      subtitle: "10 EUR/muaj",
      price: "10 EUR",
      period: "/muaj",
      icon: Sparkles,
      planType: "monthly",
      popular: true,
      features: [
        "Shiko të gjitha kontaktet",
        "9 aplikime në muaj",
        "Mesazhe direkte me punëdhënësit",
        "Profil i theksuar në kërkime",
        "Komentim në njoftime",
        "Badge 'Premium'",
        "Akses në ngjarje ekskluzive për anëtarë"
      ],
      current: activeSubscription?.plan_type === "monthly" || activeSubscription?.plan_type === "yearly",
      cta: (activeSubscription?.plan_type === "monthly" || activeSubscription?.plan_type === "yearly") ? "Plani aktual" : "Zgjidh Planin"
    },
    {
      name: "Anëtar Biznesi",
      subtitle: "10 EUR/muaj ose 80 EUR/vit",
      price: "10-80 EUR",
      period: "/muaj ose /vit",
      icon: Building2,
      planType: "business",
      badge: "Për Kompani",
      features: [
        "Të gjitha benefitet e Premium +",
        "Postim njoftimesh të pakufizuara",
        "Profil kompanie i zgjeruar",
        "Statistika të avancuara të postimeve",
        "Etiketë 'Biznes Verifikuar'",
        "Prioritet në kërkime",
        "Akses në Rekrutim AI të Avancuar"
      ],
      current: activeSubscription?.plan_type === "business",
      cta: activeSubscription?.plan_type === "business" ? "Plani aktual" : "Zgjidh Planin"
    }
  ];

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] px-4 py-2 rounded-full text-sm font-medium mb-4"
          >
            <Crown className="w-4 h-4" />
            Plane Antokton
          </motion.div>
          <h1 className="text-4xl font-black text-white mb-4 uppercase tracking-wide">Zgjidh planin tënd</h1>
          <p className="text-white text-lg">Gjej planin perfekt për karrierën tënde profesionale</p>
        </div>

        {activeSubscription && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-8 text-center"
          >
            <p className="text-blue-300 font-medium">
              ✓ Ju keni një abonim aktiv deri më {new Date(activeSubscription.end_date).toLocaleDateString('sq-AL')}
            </p>
          </motion.div>
        )}

        {user && hasEarlyMemberPremiumAccess(user) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 rounded-xl border border-[#9bffd6]/30 bg-[#9bffd6]/10 p-4 text-center"
          >
            <p className="font-semibold text-[#d8fff1]">
              Si anëtar i parë i Antokton, ke akses falas në shërbimet Premium gjatë periudhës hyrëse.
            </p>
            <p className="mt-1 text-sm text-white/65">
              Nëse dëshiron të mbështesësh platformën për bamirësi/test, mund të zgjedhësh një pagesë vullnetare më poshtë.
            </p>
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className={`relative bg-white/5 ${plan.popular ? 'border-2 border-[#8ab4ff] shadow-lg shadow-[#8ab4ff]/20' : 'border-white/10'} h-full`}>
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] border-0">
                      {plan.badge}
                    </Badge>
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <plan.icon className={`w-6 h-6 ${plan.popular ? 'text-[#8ab4ff]' : 'text-white'}`} />
                    <CardTitle className="text-white text-lg">{plan.name}</CardTitle>
                  </div>
                  {plan.subtitle && (
                    <p className="text-white text-xs mb-2 font-medium">{plan.subtitle}</p>
                  )}
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-white">{plan.price}</span>
                    <span className="text-white text-sm">{plan.period}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                        <span className="text-white text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    onClick={() => plan.planType && handleCheckout(plan.planType)}
                    disabled={plan.disabled || plan.current}
                    className={`w-full ${
                      plan.popular
                        ? 'bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] hover:opacity-90'
                        : plan.current
                        ? 'bg-white/10 text-white/50 cursor-not-allowed'
                        : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                    }`}
                  >
                    {plan.cta}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {activeSubscription && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(true)}
              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              Anulo Abonimin
            </Button>
          </motion.div>
        )}

        {cancelDialogOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-[#0b1020] border border-white/10 rounded-2xl p-6 max-w-md w-full"
            >
              <h3 className="text-xl font-bold text-white mb-4">Anulo Abonimin?</h3>
              <p className="text-white mb-6">
                A jeni i sigurt? Abonimet mbeten aktive deri në fund të periudhës së paguar.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setCancelDialogOpen(false)}
                  className="flex-1 border-white/10 text-white hover:bg-white/5"
                >
                  Jo, kthehu
                </Button>
                <Button
                  onClick={() => cancelMutation.mutate()}
                  disabled={cancelMutation.isPending}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                >
                  Po, anulo
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
