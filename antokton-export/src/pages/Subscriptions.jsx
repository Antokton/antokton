import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/antoktonClient";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Check, Crown, Heart, Sparkles, Star } from "lucide-react";
import { motion } from "framer-motion";
import { createPageUrl } from "../utils";

const BETA_PAYMENT_MESSAGE =
  "Pagesa online nuk është ende aktive. Për momentin mund ta mbështesni Antoktonin me transfertë bankare ose të provoni përsëri më vonë.";

export default function Subscriptions() {
  const [user, setUser] = useState(null);
  const [supportAmount, setSupportAmount] = useState("");
  const [supportError, setSupportError] = useState("");
  const [checkoutLoadingPlan, setCheckoutLoadingPlan] = useState("");
  const [businessInterestOpen, setBusinessInterestOpen] = useState(false);
  const [supportInfoOpen, setSupportInfoOpen] = useState(false);
  const supportAmountRef = useRef(null);

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

  const { data: paymentConfig } = useQuery({
    queryKey: ["stripeSupportConfig"],
    queryFn: async () => {
      const response = await base44.functions.invoke("getStripeConfig", {});
      return response.data || {};
    },
    staleTime: 60 * 1000,
  });

  const supportInfo = paymentConfig?.support || {};
  const onlineSupportEnabled = Boolean(paymentConfig?.checkoutConfigured);
  const hasBankSupport = Boolean(
    supportInfo.iban ||
    supportInfo.contact ||
    supportInfo.bankName ||
    supportInfo.paymentReference ||
    supportInfo.transparencyNote
  );

  const handleSupportCheckout = async () => {
    if (!user) {
      base44.auth.redirectToLogin();
      return;
    }
    const parsedAmount = Number(String(supportAmount || "").replace(",", "."));
    if (!parsedAmount || parsedAmount <= 0) {
      setSupportError("Vendosni shumën që dëshironi të dhuroni.");
      supportAmountRef.current?.focus();
      return;
    }

    setSupportError("");
    setCheckoutLoadingPlan("support");
    try {
      const response = await base44.functions.invoke("createPremiumCheckout", {
        planType: "support",
        userEmail: user.email,
        amount: parsedAmount,
        currency: "eur",
      });

      if (response.data?.url) {
        window.location.href = response.data.url;
        return;
      }
      setSupportError(BETA_PAYMENT_MESSAGE);
    } catch (error) {
      setSupportError(error.message || BETA_PAYMENT_MESSAGE);
    } finally {
      setCheckoutLoadingPlan("");
    }
  };

  const plans = [
    {
      name: "Anëtar Standard",
      price: "FALAS",
      period: "",
      icon: Star,
      features: [
        "Akses bazë falas gjatë fazës beta publike",
        "Publikim dhe kërkim njoftimesh bazike",
        "Profil bazik",
        "Pjesëmarrje në ngjarje publike",
        "Përdorim i platformës pa pagesë të detyrueshme",
      ],
      current: true,
      cta: "Plani aktual",
      disabled: true,
    },
    {
      name: "Premium — së shpejti",
      subtitle: "Jo aktiv gjatë beta publike",
      price: "Së shpejti",
      period: "",
      icon: Sparkles,
      badge: "Beta Publike",
      comingSoon: true,
      features: [
        "Shërbimet Premium do të aktivizohen pas përfundimit të fazës testuese publike.",
        "Përfitimet e planifikuara do të publikohen para hapjes zyrtare.",
        "Asnjë pagesë Premium nuk kërkohet gjatë kësaj faze.",
      ],
      cta: "Njoftomë kur të hapet",
    },
    {
      name: "Mbështetje vullnetare",
      subtitle: "Kontribut vullnetar",
      price: "Mbështet Antoktonin",
      period: "",
      icon: Heart,
      planType: "support",
      badge: "Opsionale",
      customAmount: true,
      features: [
        "Antoktoni është në fazë beta publike. Kontributi vullnetar ndihmon zhvillimin, mirëmbajtjen dhe testimin publik të platformës.",
        "Kontribut vullnetar për zhvillimin, mirëmbajtjen dhe testimin publik të platformës Antokton.",
        "Ky kontribut është vullnetar, nuk kërkohet për përdorimin bazë falas dhe nuk jep akses apo shërbime shtesë.",
        onlineSupportEnabled ? "Kur pagesa online është aktive, shumën e vendosni vetë." : "Pagesa online nuk është ende aktive gjatë kësaj faze.",
      ],
      cta: onlineSupportEnabled ? "Mbështet vullnetarisht" : "Merr të dhënat e kontributit",
    },
    {
      name: "Biznes — së shpejti",
      subtitle: "Regjistrimet nuk janë hapur ende",
      price: "Së shpejti",
      period: "",
      icon: Building2,
      badge: "Për Kompani",
      comingSoon: true,
      businessInterest: true,
      features: [
        "Regjistrimet për bizneset do të hapen pas përfundimit të testimeve publike.",
        "Përfitimet e biznesit do të mbeten informuese deri në hapjen zyrtare.",
        "Nuk ka pagesë Biznes aktive gjatë fazës beta publike.",
      ],
      cta: "Regjistro interesin",
    },
  ];

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] px-4 py-2 rounded-full text-sm font-medium mb-4"
          >
            <Crown className="w-4 h-4" />
            Beta Publike
          </motion.div>
          <h1 className="text-4xl font-black text-white mb-4 uppercase tracking-wide">Planet e Antoktonit</h1>
          <p className="mx-auto max-w-3xl text-white/72 text-base leading-relaxed">
            Antoktoni është në fazë beta publike. Aksesi bazë është falas. Pagesat Premium dhe Biznes do të hapen më vonë.
            Për momentin mund të kontribuoni vetëm vullnetarisht për mirëmbajtjen dhe zhvillimin e platformës.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 rounded-xl border border-[#9bffd6]/30 bg-[#9bffd6]/10 p-4 text-center"
        >
          <p className="font-semibold text-[#d8fff1]">
            Përdorimi bazë i platformës është falas për të gjithë gjatë fazës beta publike.
          </p>
          <p className="mt-1 text-sm text-white/65">
            Nëse dëshironi, mund ta mbështesni vullnetarisht zhvillimin dhe mirëmbajtjen e projektit.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-12">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className={`relative h-full bg-white/5 ${plan.planType === "support" ? "border-2 border-[#9bffd6]/55 shadow-lg shadow-[#9bffd6]/10" : "border-white/10"} ${plan.comingSoon ? "opacity-85" : ""}`}>
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] border-0">
                      {plan.badge}
                    </Badge>
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <plan.icon className={`w-6 h-6 ${plan.planType === "support" ? "text-[#9bffd6]" : "text-white/80"}`} />
                    <CardTitle className="text-white text-lg">{plan.name}</CardTitle>
                  </div>
                  {plan.subtitle && (
                    <p className="text-white/62 text-xs mb-2 font-medium">{plan.subtitle}</p>
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
                        <span className="text-white/78 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {plan.customAmount && (
                    <div className="space-y-3">
                      {onlineSupportEnabled && (
                        <label className="block space-y-1.5">
                          <span className="text-xs font-medium text-white/60">Shuma vullnetare (EUR)</span>
                          <input
                            type="number"
                            min="1"
                            step="0.5"
                            value={supportAmount}
                            ref={supportAmountRef}
                            onChange={(event) => {
                              setSupportAmount(event.target.value);
                              if (supportError) setSupportError("");
                            }}
                            placeholder="p.sh. 3, 10, 25"
                            className={`h-10 w-full rounded-lg border bg-white/5 px-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-[#8ab4ff]/60 ${supportError ? "border-red-400/70" : "border-white/10"}`}
                          />
                        </label>
                      )}
                      {!onlineSupportEnabled && (
                        <div className="rounded-lg border border-[#9bffd6]/25 bg-[#9bffd6]/10 px-3 py-2 text-xs leading-relaxed text-[#d8fff1]">
                          Pagesat online nuk janë ende aktive. Nëse dëshironi ta mbështesni Antoktonin gjatë fazës beta, mund ta bëni me transfertë bankare ose duke na kontaktuar.
                        </div>
                      )}
                      {supportError && (
                        <div className="rounded-lg border border-yellow-400/30 bg-yellow-400/10 px-3 py-2 text-xs leading-relaxed text-yellow-100">
                          {supportError}
                        </div>
                      )}
                      {hasBankSupport && (
                        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs leading-relaxed text-white/70">
                          <p className="font-semibold text-white/85">Të dhënat e kontributit janë të disponueshme.</p>
                          <p className="mt-1">Kliko butonin për t'i parë mënyrat e mbështetjes gjatë fazës beta publike.</p>
                        </div>
                      )}
                    </div>
                  )}

                  <Button
                    onClick={() => {
                      if (plan.planType === "support") {
                        if (onlineSupportEnabled) handleSupportCheckout();
                        else setSupportInfoOpen(true);
                      }
                      else if (plan.businessInterest) setBusinessInterestOpen(true);
                    }}
                    disabled={plan.disabled || checkoutLoadingPlan === plan.planType || (plan.comingSoon && !plan.businessInterest)}
                    className={`w-full ${
                      plan.planType === "support"
                        ? "bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] hover:opacity-90"
                        : plan.current || plan.comingSoon
                        ? "bg-white/10 text-white/60 cursor-default"
                        : "bg-white/5 border border-white/10 text-white hover:bg-white/10"
                    }`}
                  >
                    {checkoutLoadingPlan === plan.planType ? "Duke hapur pagesën..." : plan.cta}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {businessInterestOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b1020] p-6 text-white shadow-2xl"
          >
            <h3 className="text-xl font-bold">Biznes — së shpejti</h3>
            <p className="mt-3 text-sm leading-relaxed text-white/70">
              Regjistrimet për bizneset do të hapen pas përfundimit të testimeve publike. Për interes të hershëm, mund të na shkruani nga faqja e kontaktit.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Button
                onClick={() => setBusinessInterestOpen(false)}
                variant="outline"
                className="flex-1 border-white/15 text-white hover:bg-white/10"
              >
                Mbyll
              </Button>
              <Button asChild className="flex-1 bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020]">
                <Link to={createPageUrl("Contact")}>Kontakto</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {supportInfoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0b1020] p-6 text-white shadow-2xl"
          >
            <h3 className="text-xl font-bold">Mbështetje vullnetare</h3>
            <p className="mt-3 text-sm leading-relaxed text-white/72">
              Pagesat online nuk janë ende aktive. Nëse dëshironi ta mbështesni Antoktonin gjatë fazës beta, mund ta bëni me transfertë bankare ose duke na kontaktuar.
            </p>

            {hasBankSupport ? (
              <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/75">
                {supportInfo.iban && <p className="break-all"><span className="font-semibold text-white">IBAN:</span> {supportInfo.iban}</p>}
                {supportInfo.bankName && <p className="mt-2 break-words"><span className="font-semibold text-white">Banka:</span> {supportInfo.bankName}</p>}
                {supportInfo.paymentReference && <p className="mt-2 break-words"><span className="font-semibold text-white">Referenca:</span> {supportInfo.paymentReference}</p>}
                {supportInfo.contact && <p className="mt-2 break-all"><span className="font-semibold text-white">Kontakt:</span> {supportInfo.contact}</p>}
                {supportInfo.accountHolder && <p className="mt-2 break-words"><span className="font-semibold text-white">Përfituesi:</span> {supportInfo.accountHolder}</p>}
                {supportInfo.transparencyNote && <p className="mt-3 border-t border-white/10 pt-3 text-xs leading-relaxed text-white/60">{supportInfo.transparencyNote}</p>}
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-yellow-400/25 bg-yellow-400/10 p-4 text-sm leading-relaxed text-yellow-100">
                Të dhënat e kontributit nuk janë publikuar ende. Mund të na kontaktoni për mënyrën e mbështetjes gjatë fazës beta publike.
              </div>
            )}

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Button
                onClick={() => setSupportInfoOpen(false)}
                variant="outline"
                className="flex-1 border-white/15 text-white hover:bg-white/10"
              >
                Mbyll
              </Button>
              <Button asChild className="flex-1 bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020]">
                <Link to={createPageUrl("Contact")}>Kontakto</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
