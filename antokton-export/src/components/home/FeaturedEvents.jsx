import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/antoktonClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../../utils";
import moment from "moment";
import { motion } from "framer-motion";

const categoryColors = {
  conference: "bg-red-500/20 text-red-400 border-red-500/30",
  ekspedite: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  ekspozite: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  kampionat: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  konkurs: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  meetup: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  networking: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  panair: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  perkujtim: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  prezantim: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  promovim: "bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30",
  social: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  turne: "bg-teal-500/20 text-teal-400 border-teal-500/30",
  vizite: "bg-lime-500/20 text-lime-400 border-lime-500/30",
  webinar: "bg-green-500/20 text-green-400 border-green-500/30",
  workshop: "bg-purple-500/20 text-purple-400 border-purple-500/30"
};

export default function FeaturedEvents() {
  const { data: featuredDay = [] } = useQuery({
    queryKey: ["featuredDay"],
    queryFn: async () => {
      const now = new Date();
      const [events, charities] = await Promise.all([
        base44.entities.Event.filter({ featured_day: true }, "-created_date", 10),
        base44.entities.CharityProject.filter({ featured_day: true }, "-created_date", 10),
      ]);
      const filteredEvents = events.filter(e => !e.featured_day_expires || new Date(e.featured_day_expires) > now);
      const filteredCharities = charities.filter(c => !c.featured_day_expires || new Date(c.featured_day_expires) > now)
        .map(c => ({ ...c, _type: "charity" }));
      return [...filteredEvents, ...filteredCharities];
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60 * 1000,
  });

  const { data: featuredWeek = [] } = useQuery({
    queryKey: ["featuredWeek"],
    queryFn: async () => {
      const now = new Date();
      const [events, charities] = await Promise.all([
        base44.entities.Event.filter({ featured_week: true }, "-created_date", 10),
        base44.entities.CharityProject.filter({ featured_week: true }, "-created_date", 10),
      ]);
      const filteredEvents = events.filter(e => !e.featured_week_expires || new Date(e.featured_week_expires) > now);
      const filteredCharities = charities.filter(c => !c.featured_week_expires || new Date(c.featured_week_expires) > now)
        .map(c => ({ ...c, _type: "charity" }));
      return [...filteredEvents, ...filteredCharities];
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60 * 1000,
  });

  if (featuredDay.length === 0 && featuredWeek.length === 0) return null;

  const t = (sq, en) => {
    const lang = localStorage.getItem('language') || 'sq';
    return lang === 'sq' ? sq : en;
  };

  return (
    <section className="py-12 px-4 sm:px-6" style={{ position: 'relative', zIndex: 20 }}>
      <div className="max-w-7xl mx-auto space-y-12" style={{ position: 'relative', zIndex: 20 }}>
        {featuredDay.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-6">
              <span className="text-3xl">⭐</span>
              <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wide">Ngjarjet e Ditës</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredDay.map((event, i) => (
                <motion.div key={event.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                  {event._type === "charity" ? (
                    <Link to="/Bamiresi">
                      <Card className="bg-white/5 border-white/10 hover:bg-white/8 transition-all hover:border-red-500/30">
                        <CardContent className="p-5">
                          <Badge className="border bg-red-500/20 text-red-400 border-red-500/30 mb-3 flex items-center gap-1 w-fit"><Heart className="w-3 h-3" /> Bamirësi</Badge>
                          <h3 className="text-white font-semibold mb-2">{event.title}</h3>
                          <p className="text-white text-sm mb-4 line-clamp-2">{event.short_description || event.description}</p>
                          {event.organizer && <div className="text-xs text-white/50">{event.organizer}</div>}
                          {event.country && <div className="flex items-center gap-1 text-xs text-white/50 mt-1"><MapPin className="w-3.5 h-3.5" />{event.country}</div>}
                        </CardContent>
                      </Card>
                    </Link>
                  ) : (
                    <Link to={`${createPageUrl("EventDetail")}?id=${event.id}`}>
                      <Card className="bg-white/5 border-white/10 hover:bg-white/8 transition-all hover:border-yellow-500/30">
                        <CardContent className="p-5">
                          <Badge className={`border ${categoryColors[event.category]} mb-3`}>{event.category}</Badge>
                          <h3 className="text-white font-semibold mb-2">{event.title}</h3>
                          <p className="text-white text-sm mb-4 line-clamp-2">{event.description}</p>
                          <div className="space-y-2 text-xs text-white">
                            <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-white" />{moment(event.event_date).format("D MMM, HH:mm")}</div>
                            {event.location && <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-white" />{event.location}</div>}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {featuredWeek.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-6">
              <span className="text-3xl">🌟</span>
              <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wide">Ngjarjet e Javës</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredWeek.map((event, i) => (
                <motion.div key={event.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                  {event._type === "charity" ? (
                    <Link to="/Bamiresi">
                      <Card className="bg-white/5 border-white/10 hover:bg-white/8 transition-all hover:border-red-500/30">
                        <CardContent className="p-5">
                          <Badge className="border bg-red-500/20 text-red-400 border-red-500/30 mb-3 flex items-center gap-1 w-fit"><Heart className="w-3 h-3" /> Bamirësi</Badge>
                          <h3 className="text-white font-semibold mb-2">{event.title}</h3>
                          <p className="text-white text-sm mb-4 line-clamp-2">{event.short_description || event.description}</p>
                          {event.organizer && <div className="text-xs text-white/50">{event.organizer}</div>}
                          {event.country && <div className="flex items-center gap-1 text-xs text-white/50 mt-1"><MapPin className="w-3.5 h-3.5" />{event.country}</div>}
                        </CardContent>
                      </Card>
                    </Link>
                  ) : (
                    <Link to={`${createPageUrl("EventDetail")}?id=${event.id}`}>
                      <Card className="bg-white/5 border-white/10 hover:bg-white/8 transition-all hover:border-blue-500/30">
                        <CardContent className="p-5">
                          <Badge className={`border ${categoryColors[event.category]} mb-3`}>{event.category}</Badge>
                          <h3 className="text-white font-semibold mb-2">{event.title}</h3>
                          <p className="text-white text-sm mb-4 line-clamp-2">{event.description}</p>
                          <div className="space-y-2 text-xs text-white">
                            <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-white" />{moment(event.event_date).format("D MMM, HH:mm")}</div>
                            {event.location && <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-white" />{event.location}</div>}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}