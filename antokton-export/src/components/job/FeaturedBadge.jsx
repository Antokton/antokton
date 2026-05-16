import React from "react";
import { Star, Zap, TrendingUp } from "lucide-react";

export default function FeaturedBadge({ type }) {
  const config = {
    homepage: {
      icon: Star,
      label: "I veçantë",
      gradient: "from-yellow-400 to-orange-500",
      glow: "shadow-yellow-500/50"
    },
    urgent: {
      icon: Zap,
      label: "Urgjent",
      gradient: "from-red-400 to-pink-500",
      glow: "shadow-red-500/50"
    },
    priority: {
      icon: TrendingUp,
      label: "Përparësi",
      gradient: "from-blue-400 to-cyan-500",
      glow: "shadow-blue-500/50"
    }
  };

  const { icon: Icon, label, gradient, glow } = config[type] || config.priority;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r ${gradient} text-white text-xs font-bold shadow-lg ${glow} animate-pulse`}>
      <Icon className="w-3 h-3" />
      {label}
    </div>
  );
}