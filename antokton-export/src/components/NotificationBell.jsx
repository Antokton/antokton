import React, { useState, useEffect } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, X, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import moment from "moment";

export default function NotificationBell() {
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);
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

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", user?.email],
    queryFn: () => base44.entities.Notification.filter({ user_email: user.email }, "-created_date", 10),
    enabled: !!user,
    refetchInterval: 60000,
    refetchIntervalInBackground: false
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { is_read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (!user) return null;

  const typeColors = {
    application: "border-l-blue-500",
    status_update: "border-l-green-500",
    comment: "border-l-yellow-500",
    system: "border-l-purple-500"
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-white/60 hover:text-white transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute right-0 top-12 w-96 max-w-[calc(100vw-2rem)] bg-[#0b1020] border border-white/10 rounded-xl shadow-xl z-50 max-h-[500px] overflow-hidden"
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-white font-semibold">Njoftime</h3>
                {unreadCount > 0 && (
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                    {unreadCount} të palexuara
                  </Badge>
                )}
              </div>

              <div className="overflow-y-auto max-h-[400px]">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-white/40">
                    Nuk ka njoftime
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-4 border-b border-white/5 hover:bg-white/5 transition-colors border-l-4 ${typeColors[notif.type]} ${
                        !notif.is_read ? "bg-white/5" : ""
                      }`}
                    >
                      <div 
                       className="flex items-start justify-between gap-3 cursor-pointer"
                       onClick={() => {
                         if (!notif.is_read) markAsReadMutation.mutate(notif.id);
                         if (notif.link) {
                           window.location.href = notif.link;
                           setOpen(false);
                         }
                       }}
                      >
                       <div className="flex-1 min-w-0">
                         <h4 className="text-white font-medium text-sm mb-1">
                           {notif.title}
                         </h4>
                         <p className="text-white/60 text-xs mb-2">
                           {notif.message}
                         </p>
                         <p className="text-white/30 text-xs">
                           {moment(notif.created_date).fromNow()}
                         </p>
                       </div>
                       <button
                         onClick={(e) => {
                           e.stopPropagation();
                           deleteNotificationMutation.mutate(notif.id);
                         }}
                         className="text-white/40 hover:text-red-400 transition-colors p-1 flex-shrink-0"
                       >
                         <X className="w-4 h-4" />
                       </button>
                      </div>

                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
