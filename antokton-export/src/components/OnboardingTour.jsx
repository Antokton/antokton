import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, User, Search, Crown, Calendar } from "lucide-react";

export default function OnboardingTour({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      icon: User,
      title: "Plotëso profilin tënd",
      description: "Shto foto, bio, aftësi dhe përvojë pune për të rritur shanset e punësimit",
      highlight: "Profili i kompletuar të dallon nga të tjerët"
    },
    {
      icon: Search,
      title: "Kërko punë",
      description: "Përdor filtrat në Feed për të gjetur njoftimet që përputhen me aftësitë dhe vendndodhjen tënde",
      highlight: "Ruaj kërkimet për njoftime automatike"
    },
    {
      icon: Crown,
      title: "Bëhu Premium",
      description: "Hap të gjitha kontaktet, apliko pa limit, mesazhe direkte dhe badge Premium",
      highlight: "Vetëm 2 EUR/muaj ose 15 EUR/vit"
    },
    {
      icon: Calendar,
      title: "Bashkohu me ngjarjet",
      description: "Networking events, workshops dhe konferenca për të zgjeruar rrjetin profesional",
      highlight: "Krijoni lidhje të reja dhe mundësi karriere"
    }
  ];

  const handleNext = () => {
    if (currentStep === steps.length - 1) {
      onComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const step = steps[currentStep];
  const Icon = step.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex w-[100dvw] max-w-[100dvw] items-center justify-center overflow-hidden bg-black/70 px-4 py-4 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative w-full max-w-[320px] rounded-2xl border border-white/10 bg-[#0b1020] p-5 sm:max-w-lg sm:p-8"
        >
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#8ab4ff] to-[#9bffd6] flex items-center justify-center">
              <Icon className="w-8 h-8 text-[#0b1020]" />
            </div>
            <h2 className="mb-2 break-words text-xl font-bold text-white sm:text-2xl">{step.title}</h2>
            <p className="break-words text-sm leading-relaxed text-white/70 sm:text-base">{step.description}</p>
          </div>

          <div className="mb-6 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
            <p className="break-words text-sm font-medium leading-relaxed text-blue-300">💡 {step.highlight}</p>
          </div>

          <div className="flex items-center justify-center gap-2 mb-6">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === currentStep 
                    ? 'w-8 bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6]' 
                    : 'w-1.5 bg-white/20'
                }`}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Button
              onClick={handleSkip}
              className="w-full bg-white/10 border border-white/20 text-white hover:bg-white/15"
            >
              Kalo
            </Button>
            <Button
              onClick={handleNext}
              className="w-full bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] hover:opacity-90 border-0"
            >
              {currentStep === steps.length - 1 ? 'Fillo' : 'Vazhdo'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          <p className="text-center text-white/40 text-xs mt-4">
            Hapi {currentStep + 1} nga {steps.length}
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
