import React, { useState, useEffect } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery } from "@tanstack/react-query";
import { X, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";

const styles = `
  @keyframes marquee {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  
  .marquee-container {
    overflow: hidden;
    position: relative;
  }
  
  .marquee-content {
    display: inline-flex;
    white-space: nowrap;
  }
  
  .marquee-content.animate {
    animation: marquee 120s linear infinite;
  }
  
  .marquee-item {
    padding-right: 3rem;
  }
  
  .marquee-container:hover .marquee-content {
    animation-play-state: paused;
  }
  
  .marquee-content:hover {
    animation: none;
    transform: translateX(0);
  }
`;

export default function EventNotifications() {
  const [dismissed, setDismissed] = useState({
    daily: false,
    weekly: false
  });
  const [shouldAnimateDaily, setShouldAnimateDaily] = useState(false);
  const [shouldAnimateWeekly, setShouldAnimateWeekly] = useState(false);
  const dailyRef = React.useRef(null);
  const weeklyRef = React.useRef(null);

  const { data: featuredDayEvent } = useQuery({
    queryKey: ["featuredDayNotif"],
    queryFn: async () => {
      const events = await base44.entities.Event.filter({ 
        featured_day: true
      }, "-created_date", 20);
      const now = new Date();
      const filtered = events.filter(e => {
        if (!e.featured_day_expires) return true;
        return new Date(e.featured_day_expires) > now;
      }).sort((a, b) => new Date(b.updated_date || b.created_date || 0) - new Date(a.updated_date || a.created_date || 0));
      return filtered[0] || null;
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60 * 1000
  });

  const { data: featuredWeekEvent } = useQuery({
    queryKey: ["featuredWeekNotif"],
    queryFn: async () => {
      const events = await base44.entities.Event.filter({ 
        featured_week: true
      }, "-created_date", 20);
      const now = new Date();
      const filtered = events.filter(e => {
        if (!e.featured_week_expires) return true;
        return new Date(e.featured_week_expires) > now;
      }).sort((a, b) => new Date(b.updated_date || b.created_date || 0) - new Date(a.updated_date || a.created_date || 0));
      return filtered[0] || null;
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60 * 1000
  });

  useEffect(() => {
    if (!featuredDayEvent && !featuredWeekEvent) return;
    const stored = localStorage.getItem("dismissedEventNotifs");
    if (stored) {
      const parsed = JSON.parse(stored);
      const dailyKey = featuredDayEvent
        ? `${featuredDayEvent.id}:${featuredDayEvent.featured_day_expires || ""}`
        : null;
      const weeklyKey = featuredWeekEvent
        ? `${featuredWeekEvent.id}:${featuredWeekEvent.featured_week_expires || ""}`
        : null;
      // Dismiss only if the same event promotion was dismissed.
      const dailyDismissed = featuredDayEvent && (parsed.dailyKey === dailyKey || (!parsed.dailyKey && parsed.dailyId === featuredDayEvent.id && !featuredDayEvent.featured_day_expires));
      const weeklyDismissed = featuredWeekEvent && (parsed.weeklyKey === weeklyKey || (!parsed.weeklyKey && parsed.weeklyId === featuredWeekEvent.id && !featuredWeekEvent.featured_week_expires));
      setDismissed({ daily: !!dailyDismissed, weekly: !!weeklyDismissed });
    }
  }, [featuredDayEvent, featuredWeekEvent]);

  useEffect(() => {
    const checkOverflow = () => {
      if (dailyRef.current) {
        const container = dailyRef.current;
        const firstItem = container.querySelector('.marquee-item');
        if (firstItem) {
          setShouldAnimateDaily(firstItem.offsetWidth > container.clientWidth);
        }
      }
      if (weeklyRef.current) {
        const container = weeklyRef.current;
        const firstItem = container.querySelector('.marquee-item');
        if (firstItem) {
          setShouldAnimateWeekly(firstItem.offsetWidth > container.clientWidth);
        }
      }
    };

    setTimeout(checkOverflow, 100);
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [featuredDayEvent, featuredWeekEvent]);

  const handleDismiss = (type) => {
    const newDismissed = { ...dismissed, [type]: true };
    setDismissed(newDismissed);
    
    const stored = localStorage.getItem("dismissedEventNotifs");
    const existing = stored ? JSON.parse(stored) : {};
    const toStore = {
      ...existing,
      ...(type === "daily" && featuredDayEvent ? {
        dailyId: featuredDayEvent.id,
        dailyKey: `${featuredDayEvent.id}:${featuredDayEvent.featured_day_expires || ""}`
      } : {}),
      ...(type === "weekly" && featuredWeekEvent ? {
        weeklyId: featuredWeekEvent.id,
        weeklyKey: `${featuredWeekEvent.id}:${featuredWeekEvent.featured_week_expires || ""}`
      } : {}),
    };
    localStorage.setItem("dismissedEventNotifs", JSON.stringify(toStore));
  };

  if (!featuredDayEvent && !featuredWeekEvent) return null;

  return (
    <>
      <style>{styles}</style>
      <div
        data-event-notifications
        className="fixed left-0 right-0 z-40 max-w-5xl mx-auto px-4 sm:px-6 space-y-0.5"
        style={{ top: 'calc(64px + env(safe-area-inset-top))' }}
      >
        <AnimatePresence>
          {!dismissed.daily && featuredDayEvent && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-gradient-to-r from-yellow-500/8 to-orange-500/8 border border-yellow-500/15 rounded-md px-2 py-0.5 shadow-md backdrop-blur-sm"
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 md:w-4 md:h-4 w-3 h-3 text-yellow-400/70 flex-shrink-0" />
                <div ref={dailyRef} className="flex-1 min-w-0 marquee-container">
                  <Link 
                    to={`${createPageUrl("EventDetail")}?id=${featuredDayEvent.id}`}
                    className="text-[10px] md:text-xs text-white/70 hover:text-yellow-300 block"
                  >
                    <span className={`marquee-content ${shouldAnimateDaily ? 'animate' : ''}`}>
                      {[...Array(shouldAnimateDaily ? 10 : 1)].map((_, i) => (
                        <span key={i} className="marquee-item">
                          <span className="font-semibold text-yellow-300/80">⭐ Mesazhi i Ditës:</span> {featuredDayEvent.title}
                        </span>
                      ))}
                    </span>
                  </Link>
                </div>
                <button
                  onClick={() => handleDismiss("daily")}
                  className="text-white/30 hover:text-white/60 transition-colors flex-shrink-0"
                >
                  <X className="w-3 h-3 md:w-3.5 md:h-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {!dismissed.weekly && featuredWeekEvent && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-gradient-to-r from-blue-500/8 to-cyan-500/8 border border-blue-500/15 rounded-md px-2 py-0.5 shadow-md backdrop-blur-sm"
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 md:w-4 md:h-4 w-3 h-3 text-blue-400/70 flex-shrink-0" />
                <div ref={weeklyRef} className="flex-1 min-w-0 marquee-container">
                  <Link 
                    to={`${createPageUrl("EventDetail")}?id=${featuredWeekEvent.id}`}
                    className="text-[10px] md:text-xs text-white/70 hover:text-blue-300 block"
                  >
                    <span className={`marquee-content ${shouldAnimateWeekly ? 'animate' : ''}`}>
                      {[...Array(shouldAnimateWeekly ? 10 : 1)].map((_, i) => (
                        <span key={i} className="marquee-item">
                          <span className="font-semibold text-blue-300/80">🌟 Ngjarja e Javës:</span> {featuredWeekEvent.title}
                        </span>
                      ))}
                    </span>
                  </Link>
                </div>
                <button
                  onClick={() => handleDismiss("weekly")}
                  className="text-white/30 hover:text-white/60 transition-colors flex-shrink-0"
                >
                  <X className="w-3 h-3 md:w-3.5 md:h-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
