import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { base44 } from "@/api/antoktonClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Bell, X, MoreHorizontal, CheckCircle2, ShieldCheck, MessageSquareX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import moment from "moment";

export default function NotificationBell() {
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
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
    queryFn: () => base44.entities.Notification.filter({ user_email: user.email }, "-created_date", 120),
    enabled: !!user,
    refetchInterval: 60000,
    refetchIntervalInBackground: false
  });

  const isStaff = ["admin", "moderator"].includes(String(user?.role || user?.member_category || "").toLowerCase());
  const hasJobLinkedNotifications = notifications.some((item) => (
    item.related_id && (
      item.link?.includes("/PostDetail")
      || ["application", "moderation_request", "status_update"].includes(item.type)
    )
  ));

  const { data: jobsForNotifications = [], isFetched: jobsFetched } = useQuery({
    queryKey: ["notification-linked-jobs", user?.email, isStaff],
    queryFn: () => base44.entities.Job.list("-created_date", 1000),
    enabled: !!user && (isStaff || hasJobLinkedNotifications),
    staleTime: 30000,
    refetchInterval: isStaff ? 60000 : false,
    refetchIntervalInBackground: false,
  });

  const jobById = useMemo(() => new Map(jobsForNotifications.map((job) => [job.id, job])), [jobsForNotifications]);

  const staleNotifications = useMemo(() => {
    if (!jobsFetched && hasJobLinkedNotifications) return [];
    return notifications.filter((notif) => {
      const isJobLinked = notif.related_id && (
        notif.link?.includes("/PostDetail")
        || ["application", "moderation_request", "status_update"].includes(notif.type)
      );
      if (!isJobLinked) return false;
      return !jobById.has(notif.related_id);
    });
  }, [hasJobLinkedNotifications, jobById, jobsFetched, notifications]);

  const displayNotifications = useMemo(() => {
    const filtered = notifications.filter((notif) => {
      const isJobLinked = notif.related_id && (
        notif.link?.includes("/PostDetail")
        || ["application", "moderation_request", "status_update"].includes(notif.type)
      );
      if (!isJobLinked) return true;
      if (!jobsFetched && hasJobLinkedNotifications) return true;
      const linkedJob = jobById.get(notif.related_id);
      if (!linkedJob) return false;
      if (notif.type === "moderation_request") return linkedJob.status === "pending";
      return true;
    });

    if (!isStaff) return filtered;

    const existingPendingIds = new Set(
      filtered
        .filter((item) => item.type === "moderation_request" && item.related_id)
        .map((item) => item.related_id)
    );
    const virtualPending = jobsForNotifications
      .filter((job) => job.status === "pending" && !existingPendingIds.has(job.id))
      .map((job) => ({
        id: `virtual-pending-job-${job.id}`,
        type: "moderation_request",
        title: "Njoftim në pritje për miratim",
        message: `"${job.title || "Njoftim"}" pret kontroll nga stafi.`,
        link: `/Admin?section=jobs&tab=pending&job=${encodeURIComponent(job.id)}`,
        related_id: job.id,
        created_date: job.created_date || job.updated_date || new Date().toISOString(),
        is_read: false,
        is_virtual: true,
      }));

    return [...virtualPending, ...filtered].sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));
  }, [hasJobLinkedNotifications, isStaff, jobById, jobsFetched, jobsForNotifications, notifications]);

  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { is_read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async (items) => {
      await Promise.all(items.filter((item) => !item.is_read).map((item) => (
        base44.entities.Notification.update(item.id, { is_read: true })
      )));
    },
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

  const unreadCount = displayNotifications.filter(n => !n.is_read).length;
  const visibleUnreadCount = open ? 0 : unreadCount;
  const badgeLabel = visibleUnreadCount > 99 ? "99+" : String(visibleUnreadCount);

  useEffect(() => {
    if (!open) return;
    const unreadItems = displayNotifications.filter((item) => !item.is_read && !item.is_virtual);
    if (unreadItems.length && !markAllAsReadMutation.isPending) {
      markAllAsReadMutation.mutate(unreadItems);
    }
    const closeOnOutside = (event) => {
      const target = event.target;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutside, true);
    return () => document.removeEventListener("pointerdown", closeOnOutside, true);
  }, [open, displayNotifications]);

  useEffect(() => {
    if (!staleNotifications.length || deleteNotificationMutation.isPending) return;
    staleNotifications.forEach((notif) => deleteNotificationMutation.mutate(notif.id));
  }, [staleNotifications]);

  const openNotification = (notif) => {
    if (!notif.is_virtual && !notif.is_read) markAsReadMutation.mutate(notif.id);
    if (notif.link) {
      setOpen(false);
      window.setTimeout(() => {
        window.location.href = notif.link;
      }, 0);
    }
  };

  const actOnNotification = async (notif, action) => {
    if (action === "delete") {
      deleteNotificationMutation.mutate(notif.id);
      return;
    }
    const patch = {
      is_read: true,
      action_status: action,
      action_at: new Date().toISOString(),
      action_by: user.email,
    };
    if (action === "rejected") {
      const feedback = window.prompt("Shkruaj arsyen e refuzimit për përdoruesin:");
      if (feedback === null) return;
      patch.feedback = feedback.trim();
    }
    await base44.entities.Notification.update(notif.id, patch);
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  if (!user) return null;

  const typeColors = {
    application: "border-l-blue-500",
    status_update: "border-l-green-500",
    comment: "border-l-yellow-500",
    system: "border-l-purple-500"
  };

  const notificationPanel = (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed left-3 right-3 top-[calc(72px+env(safe-area-inset-top))] bottom-[calc(86px+env(safe-area-inset-bottom))] z-[99999] flex flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0b1020] shadow-xl md:left-auto md:right-6 md:top-16 md:bottom-auto md:max-h-[500px] md:w-96 md:max-w-[calc(100vw-2rem)]"
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-white font-semibold">Njoftime</h3>
              <div className="flex items-center gap-2">
                {!open && unreadCount > 0 && (
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                    {unreadCount} të palexuara
                  </Badge>
                )}
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1 text-white/45 hover:bg-white/10 hover:text-white" aria-label="Mbyll njoftimet">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto md:max-h-[400px]">
              {displayNotifications.length === 0 ? (
                <div className="p-8 text-center text-white/40">
                  Nuk ka njoftime
                </div>
              ) : (
                displayNotifications.map((notif) => {
                  const canModerate = isStaff && ["application", "moderation_request", "suggestion"].includes(notif.type);
                  return (
                    <div
                      key={notif.id}
                      className={`p-4 border-b border-white/5 hover:bg-white/5 transition-colors border-l-4 ${typeColors[notif.type] || "border-l-white/20"} ${
                        !notif.is_read ? "bg-white/5" : ""
                      }`}
                    >
                      <div
                        className="flex items-start justify-between gap-3 cursor-pointer"
                        onClick={() => openNotification(notif)}
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
                        {!notif.is_virtual && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotificationMutation.mutate(notif.id);
                            }}
                            className="text-white/40 hover:text-red-400 transition-colors p-1 flex-shrink-0"
                            aria-label="Fshije njoftimin"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                        <div className="relative group">
                          <button
                            type="button"
                            onClick={(e) => e.stopPropagation()}
                            className="text-white/40 hover:text-white transition-colors p-1 flex-shrink-0"
                            title="Veprime"
                            aria-label="Veprime për njoftimin"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                          <div className="hidden group-focus-within:block group-hover:block absolute right-0 top-7 z-[100000] w-64 rounded-lg border border-white/10 bg-[#0b1020] py-1 shadow-2xl">
                            <button type="button" onClick={(e) => { e.stopPropagation(); actOnNotification(notif, "delete"); }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-red-300 hover:bg-white/5">
                              <X className="w-3.5 h-3.5" /> Fshije këtë njoftim
                            </button>
                            {canModerate && (
                              <>
                                <button type="button" onClick={(e) => { e.stopPropagation(); actOnNotification(notif, "approved"); }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-green-300 hover:bg-white/5">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Mirato kërkesën
                                </button>
                                <button type="button" onClick={(e) => { e.stopPropagation(); actOnNotification(notif, "trusted_auto_approval"); }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-[#9bffd6] hover:bg-white/5">
                                  <ShieldCheck className="w-3.5 h-3.5" /> Klasifiko si person të sigurt
                                </button>
                                <button type="button" onClick={(e) => { e.stopPropagation(); actOnNotification(notif, "rejected"); }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-orange-300 hover:bg-white/5">
                                  <MessageSquareX className="w-3.5 h-3.5" /> Refuzo me feedback
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(current => !current)}
        className="relative p-2 text-white/60 hover:text-white transition-colors"
        aria-label="Hap njoftimet"
        aria-expanded={open}
      >
        <Bell className="w-5 h-5" />
        {visibleUnreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
            {badgeLabel}
          </span>
        )}
      </button>
      {typeof document !== "undefined" ? createPortal(notificationPanel, document.body) : notificationPanel}
    </div>
  );
}
