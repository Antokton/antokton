import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import moment from "moment";

export default function EventsCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [user, setUser] = useState(null);

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

  const { data: events = [] } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const allEvents = await base44.entities.Event.list("-event_date", 500);
      return allEvents.filter(e => e.status === 'approved');
    }
  });

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const monthName = moment(currentDate).format('MMMM YYYY');

  // Get events for each day
  const eventsPerDay = useMemo(() => {
    const map = {};
    events.forEach(event => {
      const eventDate = moment(event.event_date).format('YYYY-MM-DD');
      if (!map[eventDate]) map[eventDate] = [];
      map[eventDate].push(event);
    });
    return map;
  }, [events]);

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const categoryColors = {
    conference: "bg-red-500/20 text-red-400",
    meetup: "bg-yellow-500/20 text-yellow-400",
    networking: "bg-blue-500/20 text-blue-400",
    workshop: "bg-purple-500/20 text-purple-400",
    webinar: "bg-green-500/20 text-green-400"
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Kalendari i Ngjarjeve</h1>
          <p className="text-white/50 mt-1">Shikoni të gjitha ngjarjet në një pamje kalendarike</p>
        </div>
        {user && (
          <Link to={createPageUrl("Events")}>
            <Button className="bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] hover:opacity-90">
              <Plus className="w-4 h-4 mr-2" />
              Ngjarje e Re
            </Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-3">
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={prevMonth}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-white/60" />
                </button>
                <h2 className="text-xl font-bold text-white">{monthName}</h2>
                <button
                  onClick={nextMonth}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-white/60" />
                </button>
              </div>

              {/* Weekday Headers */}
              <div className="grid grid-cols-7 gap-2 mb-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-white/60 text-sm font-semibold py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-2">
                {emptyDays.map((_, i) => (
                  <div key={`empty-${i}`} className="h-24 bg-white/5 rounded-lg"></div>
                ))}

                {days.map(day => {
                  const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                  const dateStr = moment(date).format('YYYY-MM-DD');
                  const dayEvents = eventsPerDay[dateStr] || [];
                  const isToday = moment(date).format('YYYY-MM-DD') === moment().format('YYYY-MM-DD');

                  return (
                    <motion.div
                      key={day}
                      className={`min-h-24 p-2 rounded-lg border transition-all cursor-pointer ${
                        isToday
                          ? 'bg-[#8ab4ff]/20 border-[#8ab4ff]'
                          : dayEvents.length > 0
                          ? 'bg-white/10 border-white/20 hover:bg-white/15'
                          : 'bg-white/5 border-white/10 hover:bg-white/8'
                      }`}
                      whileHover={{ y: -2 }}
                    >
                      <div className={`text-sm font-semibold mb-1 ${isToday ? 'text-[#8ab4ff]' : 'text-white/80'}`}>
                        {day}
                      </div>
                      <div className="space-y-1 text-xs">
                        {dayEvents.slice(0, 2).map(event => (
                          <Link
                            key={event.id}
                            to={`${createPageUrl("EventDetail")}?id=${event.id}`}
                            className={`block p-1 rounded truncate ${
                              categoryColors[event.category] || 'bg-blue-500/20 text-blue-400'
                            } hover:opacity-80 transition-opacity`}
                          >
                            {event.title}
                          </Link>
                        ))}
                        {dayEvents.length > 2 && (
                          <div className="text-white/40 px-1">
                            +{dayEvents.length - 2} më shumë
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Events Sidebar */}
        <div className="lg:col-span-1">
          <Card className="bg-white/5 border-white/10 h-fit">
            <CardContent className="p-6">
              <h3 className="text-white font-semibold mb-4">Ngjarjet e Ardhshme</h3>
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {events
                  .filter(e => moment(e.event_date).isAfter(moment()))
                  .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
                  .slice(0, 10)
                  .map(event => (
                    <motion.div
                      key={event.id}
                      whileHover={{ x: 4 }}
                      className="p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
                    >
                      <Link
                        to={`${createPageUrl("EventDetail")}?id=${event.id}`}
                        className="block group"
                      >
                        <div className="text-white/80 text-sm font-medium group-hover:text-white truncate">
                          {event.title}
                        </div>
                        <div className="text-white/40 text-xs mt-1">
                          {moment(event.event_date).format('D MMM, HH:mm')}
                        </div>
                        <Badge className="mt-2 text-xs bg-blue-500/20 text-blue-400">
                          {event.category}
                        </Badge>
                      </Link>
                    </motion.div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}