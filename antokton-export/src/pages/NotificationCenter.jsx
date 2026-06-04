import React, { useState, useEffect } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Trash2, CheckCircle2, Clock, AlertCircle, Mail, MoreHorizontal, ShieldCheck, MessageSquareX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import moment from "moment";
import { Link } from "react-router-dom";

const typeLabels = {
  application: "📝 Aplikim",
  status_update: "📊 Përditësim Statusi",
  comment: "💬 Koment",
  system: "⚙️ Sistem"
};

const typeColors = {
  application: "bg-blue-500/20 text-blue-400",
  status_update: "bg-green-500/20 text-green-400",
  comment: "bg-purple-500/20 text-purple-400",
  system: "bg-orange-500/20 text-orange-400"
};

export default function NotificationCenter() {
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
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
    queryFn: () => base44.entities.Notification.filter({ user_email: user?.email }, "-created_date", 500),
    enabled: !!user
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { is_read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.is_read);
      await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { is_read: true })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(notifications.map(n => base44.entities.Notification.delete(n.id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });

  const openNotification = (notification) => {
    if (!notification.is_read) markAsReadMutation.mutate(notification.id);
    if (notification.link) {
      window.location.href = notification.link;
    }
  };

  const notificationActionMutation = useMutation({
    mutationFn: async ({ notification, action }) => {
      if (action === "delete") return base44.entities.Notification.delete(notification.id);
      const patch = {
        is_read: true,
        action_status: action,
        action_at: new Date().toISOString(),
        action_by: user.email,
      };
      if (action === "rejected") {
        const feedback = window.prompt("Shkruaj arsyen e refuzimit për përdoruesin:");
        if (feedback === null) return null;
        patch.feedback = feedback.trim();
      }
      return base44.entities.Notification.update(notification.id, patch);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const filteredNotifications = notifications.filter(n => {
    const matchesSearch = !searchTerm || 
      n.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.message?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === "all" || n.type === typeFilter;
    
    let matchesDate = true;
    if (dateFilter !== "all") {
      const notifDate = moment(n.created_date);
      if (dateFilter === "today") {
        matchesDate = notifDate.isSame(moment(), 'day');
      } else if (dateFilter === "week") {
        matchesDate = notifDate.isAfter(moment().subtract(7, 'days'));
      } else if (dateFilter === "month") {
        matchesDate = notifDate.isAfter(moment().subtract(30, 'days'));
      }
    }
    
    return matchesSearch && matchesType && matchesDate;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const unreadFiltered = filteredNotifications.filter(n => !n.is_read);
  const readFiltered = filteredNotifications.filter(n => n.is_read);

  if (!user) {
    return <div className="text-center py-20 text-white">Nuk jeni i hyrë</div>;
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-3 py-4 sm:px-4">
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2">
            <Mail className="w-8 h-8" />
            Qendra e Njoftimeve
          </h1>
          <p className="text-white/50 mt-1">Menaxho të gjitha njoftimet tuaja në një vend</p>
        </div>

      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-white/40" />
          <Input
            placeholder="Kërko njoftimet..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 text-white"
          />
        </div>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="bg-white/5 border-white/10 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Të gjitha llojet</SelectItem>
            <SelectItem value="application">Aplikime</SelectItem>
            <SelectItem value="status_update">Përditësime</SelectItem>
            <SelectItem value="comment">Komente</SelectItem>
            <SelectItem value="system">Sistem</SelectItem>
          </SelectContent>
        </Select>

        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="bg-white/5 border-white/10 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Të gjitha datat</SelectItem>
            <SelectItem value="today">Sot</SelectItem>
            <SelectItem value="week">Këtë javë</SelectItem>
            <SelectItem value="month">Këtë muaj</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Action Buttons */}
      {filteredNotifications.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {unreadCount > 0 && (
            <Button
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              size="sm"
              variant="outline"
              className="border-white/10 bg-white/5 text-white hover:bg-white/10"
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Shënoji të gjitha si të lexuara
            </Button>
          )}
          <Button
            onClick={() => deleteAllMutation.mutate()}
            disabled={deleteAllMutation.isPending}
            size="sm"
            variant="outline"
            className="border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Fshi të gjitha
          </Button>
        </div>
      )}

      {/* Notifications Tabs */}
      <Tabs defaultValue="unread" className="space-y-6">
        <TabsList className="bg-white/5 border-white/10">
          <TabsTrigger value="unread" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Të pakryera ({unreadCount})
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Të gjitha ({filteredNotifications.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="unread" className="space-y-3">
          {unreadFiltered.length === 0 ? (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
                <p className="text-white/60">Nuk keni njoftimet e pakryera</p>
              </CardContent>
            </Card>
          ) : (
            <AnimatePresence>
              {unreadFiltered.map((notif, i) => (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <NotificationCard
                    notification={notif}
                    onMarkAsRead={() => markAsReadMutation.mutate(notif.id)}
                    onDelete={() => deleteMutation.mutate(notif.id)}
                    onAction={(action) => notificationActionMutation.mutate({ notification: notif, action })}
                    onOpen={() => openNotification(notif)}
                    isStaff={["admin", "moderator"].includes(String(user?.role || user?.member_category || "").toLowerCase())}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-3">
          {filteredNotifications.length === 0 ? (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="py-12 text-center">
                <AlertCircle className="w-12 h-12 text-white/40 mx-auto mb-3" />
                <p className="text-white/60">Nuk ka njoftimet me këto kritere</p>
              </CardContent>
            </Card>
          ) : (
            <AnimatePresence>
              {filteredNotifications.map((notif, i) => (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <NotificationCard
                    notification={notif}
                    onMarkAsRead={() => markAsReadMutation.mutate(notif.id)}
                    onDelete={() => deleteMutation.mutate(notif.id)}
                    onAction={(action) => notificationActionMutation.mutate({ notification: notif, action })}
                    onOpen={() => openNotification(notif)}
                    isStaff={["admin", "moderator"].includes(String(user?.role || user?.member_category || "").toLowerCase())}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function NotificationCard({ notification, onMarkAsRead, onDelete, onAction, onOpen, isStaff }) {
  const canModerate = isStaff && ["application", "moderation_request", "suggestion"].includes(notification.type);
  return (
    <Card className={`${notification.is_read ? 'bg-white/5 border-white/10' : 'bg-white/10 border-white/20'} transition-all hover:bg-white/15`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <button type="button" onClick={onOpen} className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className={`font-semibold ${notification.is_read ? 'text-white/80' : 'text-white'}`}>
                    {notification.title}
                  </h3>
                  <Badge className={typeColors[notification.type]}>
                    {typeLabels[notification.type]}
                  </Badge>
                </div>
                <p className={`text-sm ${notification.is_read ? 'text-white/60' : 'text-white/80'}`}>
                  {notification.message}
                </p>
                <div className="text-white/40 text-xs mt-2">
                  {moment(notification.created_date).fromNow()}
                </div>
              </button>
              <div className="flex gap-2 flex-shrink-0">
                {!notification.is_read && (
                  <Button
                    onClick={onMarkAsRead}
                    size="sm"
                    variant="ghost"
                    className="text-white/60 hover:text-white"
                    title="Shënoji si të lexuar"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  onClick={onDelete}
                  size="sm"
                  variant="ghost"
                  className="text-white/60 hover:text-red-400"
                  title="Fshi njoftimin"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                <div className="relative group">
                  <Button size="sm" variant="ghost" className="text-white/60 hover:text-white" title="Veprime">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                  <div className="hidden group-focus-within:block group-hover:block absolute right-0 top-9 z-50 w-64 rounded-lg border border-white/10 bg-[#0b1020] py-1 shadow-2xl">
                    <button onClick={() => onAction("delete")} className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-red-300 hover:bg-white/5">
                      <Trash2 className="w-3.5 h-3.5" /> Fshije këtë njoftim
                    </button>
                    {canModerate && (
                      <>
                        <button onClick={() => onAction("approved")} className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-green-300 hover:bg-white/5">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Mirato kërkesën
                        </button>
                        <button onClick={() => onAction("trusted_auto_approval")} className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-[#9bffd6] hover:bg-white/5">
                          <ShieldCheck className="w-3.5 h-3.5" /> Klasifiko si person të sigurt
                        </button>
                        <button onClick={() => onAction("rejected")} className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-orange-300 hover:bg-white/5">
                          <MessageSquareX className="w-3.5 h-3.5" /> Refuzo me feedback
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
            {notification.link && (
              <Link
                to={notification.link}
                onClick={onMarkAsRead}
                className="text-[#8ab4ff] text-xs hover:underline mt-2 inline-block"
              >
                Shiko detajet →
              </Link>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
