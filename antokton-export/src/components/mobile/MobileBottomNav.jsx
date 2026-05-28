import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Briefcase, MessageCircle, User, Radio, Bell, X, Star, Search, Calendar, Heart, Settings, Globe, Tv, GraduationCap, Wrench, Plane, Gift, Users, Building2, MapPin, Music, Video, BookOpen, ShoppingBag, Zap, Award, Flag, Layers } from 'lucide-react';

import { base44 } from '@/api/antoktonClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import moment from 'moment';

const ICON_MAP = {
  Home, Briefcase, MessageCircle, User, Radio, Bell, Search, Calendar,
  Heart, Star, Settings, Globe, Tv, GraduationCap, Wrench, Plane, Gift,
  Users, Building2, MapPin, Music, Video, BookOpen, ShoppingBag, Zap, Award, Flag, Layers
};

const DEFAULT_TABS = [
  { id: 'home', label: 'Kryefaqja', icon: 'Home', path: '/' },
  { id: 'feed', label: 'Njoftime', icon: 'Briefcase', path: '/Feed' },
  { id: 'pazar', label: 'Pazar', icon: 'ShoppingBag', path: '/Pazar' },
  { id: 'statuset', label: 'Statuse', icon: 'Radio', path: '/Statuset' },
  { id: 'messages', label: 'Mesazher', icon: 'MessageCircle', path: '/Messages' },
  { id: 'profile', label: 'Profili', icon: 'User', path: '/Profile' },
];

const typeColors = {
  application: "border-l-blue-500",
  status_update: "border-l-green-500",
  comment: "border-l-yellow-500",
  system: "border-l-purple-500"
};

export default function MobileBottomNav() {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [bellOpen, setBellOpen] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.isAuthenticated().then(auth => {
      if (auth) {
        base44.auth.me().then(setUser);
      } else {
        setUser(null);
      }
    }).catch(() => {
      setUser(null);
    });
  }, []);

  // Load bottom nav config from SiteConfig
  const { data: siteConfigs = [] } = useQuery({
    queryKey: ["siteConfig"],
    queryFn: () => base44.entities.SiteConfig.list(),
    staleTime: 60000
  });

  const bottomNavConfig = siteConfigs.find(c => c.key === "bottom_nav_config");
  const activeTabs = bottomNavConfig ? (() => { try { return JSON.parse(bottomNavConfig.value); } catch { return DEFAULT_TABS; } })() : DEFAULT_TABS;

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", user?.email],
    queryFn: () => base44.entities.Notification.filter({ user_email: user.email }, "-created_date", 10),
    enabled: !!user,
    refetchInterval: 15000
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { is_read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] })
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] })
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const { data: unreadMessages = [] } = useQuery({
    queryKey: ["unreadMessages", user?.email],
    queryFn: () => base44.entities.ChatMessage.filter({ receiver_email: user.email, is_read: false }, "-created_date", 50),
    enabled: !!user,
    refetchInterval: 10000
  });

  const unreadMsgCount = unreadMessages.length;

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const isEditable = (element) => {
      if (!(element instanceof Element)) return false;
      return Boolean(element.closest("input, textarea, select, [contenteditable='true']"));
    };

    const isMobileViewport = () => window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768;
    const viewport = window.visualViewport;
    const baselineHeight = viewport?.height || window.innerHeight;

    let focusTimer;

    const updateKeyboardState = () => {
      const focusedEditable = isEditable(document.activeElement);
      const visualHeight = viewport?.height || window.innerHeight;
      const keyboardByViewport = isMobileViewport() && baselineHeight - visualHeight > 120;
      const open = isMobileViewport() && (focusedEditable || keyboardByViewport);
      setKeyboardOpen(open);
      document.body.classList.toggle("keyboard-open", open);
    };

    const handleFocusIn = () => {
      window.clearTimeout(focusTimer);
      updateKeyboardState();
    };

    const handleFocusOut = () => {
      window.clearTimeout(focusTimer);
      focusTimer = window.setTimeout(updateKeyboardState, 120);
    };

    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);
    viewport?.addEventListener("resize", updateKeyboardState);
    window.addEventListener("resize", updateKeyboardState);
    updateKeyboardState();

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
      viewport?.removeEventListener("resize", updateKeyboardState);
      window.removeEventListener("resize", updateKeyboardState);
      document.body.classList.remove("keyboard-open");
    };
  }, []);

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.toLowerCase().startsWith(path.toLowerCase());
  };

  if (keyboardOpen) return null;

  return (
    <>
      {/* Notification Drawer */}
      <AnimatePresence>
        {bellOpen && (
          <>
            <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setBellOpen(false)} />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed left-0 right-0 z-50 bg-[#0b1020] border-t border-white/10 rounded-t-2xl max-h-[70vh] flex flex-col"
              style={{ bottom: 'calc(58px + env(safe-area-inset-bottom))' }}
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-white font-semibold">Njoftimet</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <span className="bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded-full border border-red-500/30">
                      {unreadCount} të palexuara
                    </span>
                  )}
                  <button onClick={() => setBellOpen(false)} className="text-white/40 hover:text-white p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="overflow-y-auto flex-1">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-white/40 text-sm">Nuk ka njoftime</div>
                ) : (
                  notifications.map(notif => (
                    <div
                      key={notif.id}
                      className={`p-4 border-b border-white/5 border-l-4 ${typeColors[notif.type] || 'border-l-white/20'} ${!notif.is_read ? 'bg-white/5' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-3 cursor-pointer"
                        onClick={() => {
                          if (!notif.is_read) markAsReadMutation.mutate(notif.id);
                          if (notif.link) { window.location.href = notif.link; setBellOpen(false); }
                        }}>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-white font-medium text-sm mb-1">{notif.title}</h4>
                          <p className="text-white/60 text-xs mb-1">{notif.message}</p>
                          <p className="text-white/30 text-xs">{moment(notif.created_date).fromNow()}</p>
                        </div>
                        <button onClick={e => { e.stopPropagation(); deleteNotificationMutation.mutate(notif.id); }}
                          className="text-white/40 hover:text-red-400 p-1 flex-shrink-0">
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

      <nav data-swipe-back-ignore data-mobile-bottom-nav className="bottom-nav fixed left-0 right-0 z-40 flex items-start justify-between overflow-hidden bg-[#0b1020] border-t border-white/10 px-1 md:hidden"
        style={{ bottom: 0, height: 'calc(58px + env(safe-area-inset-bottom))', paddingBottom: 'env(safe-area-inset-bottom)', paddingTop: 4, transform: 'translateZ(0)', willChange: 'transform', WebkitTransform: 'translateZ(0)' }}>
        {activeTabs.map(tab => {
          const Icon = ICON_MAP[tab.icon] || Star;
          const active = isActive(tab.path);
          return (
            <Link key={tab.id} to={tab.path}
              className={`relative flex h-[54px] min-w-0 flex-1 flex-col items-center justify-center rounded-lg px-0.5 transition-colors ${active ? 'text-[#8ab4ff]' : 'text-white'}`}
              aria-label={tab.label}>
              <div className="relative">
                <Icon className={`h-[clamp(17px,5vw,20px)] w-[clamp(17px,5vw,20px)] transition-all ${active ? 'drop-shadow-[0_0_8px_rgba(138,180,255,0.9)]' : ''}`} />
                {tab.path === '/Messages' && unreadMsgCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold px-0.5">
                    {unreadMsgCount > 9 ? '9+' : unreadMsgCount}
                  </span>
                )}
              </div>
              <span className={`mt-0.5 w-full truncate text-center text-[clamp(8px,2.6vw,10px)] font-medium leading-tight ${active ? 'text-[#8ab4ff]' : 'text-white'}`}>{tab.label}</span>
              {active && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#8ab4ff]" />}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
