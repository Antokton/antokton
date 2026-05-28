import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "./utils";
import { base44 } from "@/api/antoktonClient";
import { Menu, X, Home, Briefcase, PlusCircle, Shield, LogIn, LogOut, User, ChevronDown, ChevronUp, Users, Search, Calendar, Building2, Bell, MessageCircle, ArrowUp, GraduationCap, Wrench, Radio, Plane, Tv, Heart, ShoppingBag, Award } from "lucide-react";
import ChatButton from "./components/ChatButton";
import NotificationBell from "./components/NotificationBell";
import ChatNotificationSystem from "./components/notifications/ChatNotificationSystem";
import MobileBottomNav from "./components/mobile/MobileBottomNav";
import MobileHeader from "./components/mobile/MobileHeader";
import { MobileNavProvider } from "./components/mobile/MobileNavContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useSiteConfig } from "./lib/useSiteConfig";
import { t, getLanguage, setLanguage } from "./lib/translations";

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAuth, setIsAuth] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [language, setLanguageState] = useState(getLanguage());
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [promoBanner, setPromoBanner] = useState(true); // Gjithmonë shfaqet për vizitorët e paloguar
  // Mos shfaq promo banner në faqet funksionale ku bllokon ndërveprimet
  const noBannerPages = ["Pazar", "CreatePost", "Messages", "Feed", "Statuset"];
  const shouldShowBanner = promoBanner && !isAuth && !noBannerPages.includes(currentPageName);
  const [mobileSubmenuOpen, setMobileSubmenuOpen] = useState({
    jobs: false,
    pazar: false,
    sherbime: false,
    search: false,
    edukim: false,
    media: false,
    members: false,
    bileta: false,
    profili: false
  });
  const menuScrollRef = React.useRef(null);
  const [menuScrollState, setMenuScrollState] = useState({ canScrollUp: false, canScrollDown: false });
  const touchStartY = React.useRef(null);

  const handleMenuScroll = () => {
    const el = menuScrollRef.current;
    if (!el) return;
    setMenuScrollState({
      canScrollUp: el.scrollTop > 8,
      canScrollDown: el.scrollTop < el.scrollHeight - el.clientHeight - 8
    });
  };

  const scrollMenuBy = (amount) => {
    const el = menuScrollRef.current;
    if (!el) return;
    el.scrollBy({ top: amount, behavior: 'smooth' });
  };

  React.useEffect(() => {
    const el = menuScrollRef.current;
    if (!el || !menuOpen) return;
    setTimeout(() => handleMenuScroll(), 50);
  }, [menuOpen, mobileSubmenuOpen]);

  // Block body scroll when mobile menu is open + close on outside click
  const menuRef = React.useRef(null);
  const hamburgerRef = React.useRef(null);

  useEffect(() => {
    const handleOfflineExternalLink = (event) => {
      if (navigator.onLine) return;

      const link = event.target.closest?.('a[href]');
      if (!link) return;

      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

      const targetUrl = new URL(href, window.location.origin);
      const isExternalHttp = /^https?:$/.test(targetUrl.protocol) && targetUrl.origin !== window.location.origin;

      if (isExternalHttp) {
        event.preventDefault();
        window.alert('Ky link hap nje faqe/sherbim te jashtem dhe kerkon internet. Pjeset e brendshme te Antokton punojne lokalisht.');
      }
    };

    document.addEventListener('click', handleOfflineExternalLink, true);
    return () => document.removeEventListener('click', handleOfflineExternalLink, true);
  }, []);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
      const handleOutsideClick = (e) => {
        if (
          menuRef.current && !menuRef.current.contains(e.target) &&
          hamburgerRef.current && !hamburgerRef.current.contains(e.target)
        ) {
          setMenuOpen(false);
        }
      };
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
      return () => {
        document.removeEventListener('mousedown', handleOutsideClick);
        document.removeEventListener('touchstart', handleOutsideClick);
        document.body.style.overflow = '';
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [menuOpen]);

  useEffect(() => {
    const checkAuth = async () => {
      const authenticated = await base44.auth.isAuthenticated();
      setIsAuth(authenticated);
      if (authenticated) {
        const me = await base44.auth.me();
        setUser(me);
      }
    };
    checkAuth();
    
    setLanguageState('sq');
    setLanguage('sq');
    localStorage.setItem('theme', 'dark');
    document.documentElement.setAttribute('data-theme', 'dark');
    document.body.className = 'theme-dark';
  }, []);

  const toggleTheme = () => {
    // tema e vetme tani është dark, nuk ka çfarë të bëjë
  };

  const getThemeIcon = () => '🌙';

  const getDisplayName = (user) => {
    if (!user) return "";
    
    // Emër Mbiemër (custom fields)
    if (user.first_name && user.surname) {
      return `${user.first_name} ${user.surname}`;
    }
    
    // Fallback to first_name, full_name (built-in), or email
    return user.first_name || user.full_name || user.email?.split('@')[0] || user.email;
  };

  const { data: userJobsData } = useQuery({
    queryKey: ['userJobs', user?.email],
    queryFn: async () => {
      if (!user?.email) return { hasPostedJobs: false, hasActiveSubscription: false };
      
      const jobs = await base44.entities.Job.filter({ created_by: user.email }, "-created_date", 1);
      const subscriptions = await base44.entities.PremiumSubscription.filter({
        user_email: user.email,
        is_active: true
      });
      const now = new Date();
      const hasActive = subscriptions.some(sub => new Date(sub.end_date) > now);
      
      return {
        hasPostedJobs: jobs.length > 0,
        hasActiveSubscription: hasActive
      };
    },
    enabled: !!user?.email,
    staleTime: 60000,
    refetchOnWindowFocus: false
  });

  const hasPostedJobs = userJobsData?.hasPostedJobs || false;
  const hasActiveSubscription = userJobsData?.hasActiveSubscription || false;

  // Dynamic nav from SiteConfig
  const { get: getSiteConfig } = useSiteConfig();
  const dynNavRaw = getSiteConfig("nav_config", "");
  const dynNav = React.useMemo(() => {
    if (!dynNavRaw) return null;
    try { return JSON.parse(dynNavRaw); } catch { return null; }
  }, [dynNavRaw]);
  const dynNavHasStatus = React.useMemo(() => {
    if (!Array.isArray(dynNav)) return false;
    return dynNav.some((item) => {
      const page = String(item.page || "").toLowerCase();
      const url = String(item.url || "").toLowerCase();
      return item.visible !== false && (page === "statuset" || url.includes("/statuset"));
    });
  }, [dynNav]);

  const navItems = [
    { name: "Punë", page: "Feed", icon: Briefcase, hasSubmenu: true },
    { name: "Shërbime", page: "FeedSherbime", icon: Wrench, hasSubmenu: true, isSherbime: true },
    { name: "Pazar", page: "Pazar", icon: ShoppingBag },
    { name: "Edukim", page: "Edukim", icon: GraduationCap, hasSubmenu: true, isEdukim: true },
    { name: "Bileta", page: "Bileta", icon: Plane, hasSubmenu: true, isBileta: true },
    { name: "Ngjarje", page: "Events", icon: Calendar },
    { name: "Statuse", page: "Statuset", icon: Radio },
    { name: "", page: "Bamiresi", icon: Heart, isIconOnly: true },
    { name: "", page: "Search", icon: Search, isIconOnly: true },
  ];

  // Scroll to top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Update last_seen when user is active
  useEffect(() => {
    if (isAuth && user) {
      const updateLastSeen = async () => {
        try {
          await base44.auth.updateMe({ 
            last_seen: new Date().toISOString(),
            is_online: true 
          });
        } catch (error) {
          // Silently ignore activity update failures.
        }
      };
      updateLastSeen();
      const interval = setInterval(updateLastSeen, 30000); // Every 30 seconds
      
      // Mark as offline when leaving
      const handleBeforeUnload = async () => {
        try {
          await base44.auth.updateMe({ is_online: false });
        } catch (error) {
          // Ignore errors on page unload
        }
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      return () => {
        clearInterval(interval);
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [isAuth, user]);

  return (
    <MobileNavProvider>
      <div className="bg-[#0b1020] font-sans" style={{ minHeight: '100dvh', minHeight: '-webkit-fill-available' }}>
        <style>{`
        :root {
          --bg: #0f172a;
          --bg2: #1e293b;
          --panel: rgba(255,255,255,.08);
          --panel2: rgba(255,255,255,.12);
          --text: #e2e8f0;
          --muted: rgba(226,232,240,.75);
          --line: rgba(255,255,255,.14);
          --accent: #8ab4ff;
          --accent2: #9bffd6;
        }

        
        * { 
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }
        
        body.theme-dark {
          background: #000;
          color: #ffffff !important;
          min-height: 100vh;
        }
        
        body.theme-dark::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: url('/local-assets/57444094b_01.png');
          background-size: cover;
          background-position: center center;
          opacity: 0.55;
          pointer-events: none;
          z-index: -1;
        }

        @media (max-width: 767px) {
          body.theme-dark::before {
            background: url('/local-assets/cb9a35143_Antoktonteme9-16.png') center top / cover;
            opacity: 0.55;
            pointer-events: none;
            z-index: -1;
          }
        }
        


        /* Dark mode text contrast improvements */
        body.theme-dark input,
        body.theme-dark textarea,
        body.theme-dark select {
          color: #ffffff !important;
        }

        body.theme-dark input::placeholder,
        body.theme-dark textarea::placeholder {
          color: rgba(255,255,255,0.6) !important;
        }

        body.theme-dark .text-gray-900,
        body.theme-dark .bg-white {
          color: #1a202c !important;
        }

        body.theme-dark button[data-state="inactive"],
        body.theme-dark [role="tab"]:not([data-state="active"]) {
          color: rgba(255,255,255,0.7) !important;
        }

        body.theme-dark [role="tab"][data-state="active"] {
          color: #ffffff !important;
        }




        
        .nav-glass {
          background: linear-gradient(180deg, rgba(15,23,42,.95), rgba(15,23,42,0));
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }
        
        
        .accent-gradient {
          background: linear-gradient(135deg, var(--accent) 0%, var(--accent2) 100%);
        }

        /* Override global button background rule that breaks gradient buttons */
        /* Higher specificity (0,3,1) beats index.css rule (0,2,1) */
        button:not(.bg-primary):not(.bg-accent).bg-gradient-to-r,
        button:not(.bg-primary):not(.bg-accent).bg-gradient-to-br,
        button:not(.bg-primary):not(.bg-accent).bg-gradient-to-bl {
          background: var(--tw-gradient-stops, linear-gradient(to right, #8ab4ff, #9bffd6)) !important;
          background-image: linear-gradient(to right, var(--tw-gradient-from, #8ab4ff), var(--tw-gradient-to, #9bffd6)) !important;
          border: none !important;
        }
        button:not(.bg-primary):not(.bg-accent).bg-red-500 { background: rgb(239 68 68) !important; border: none !important; }
        button:not(.bg-primary):not(.bg-accent).bg-red-600 { background: rgb(220 38 38) !important; border: none !important; }
        button:not(.bg-primary):not(.bg-accent).bg-green-500 { background: rgb(34 197 94) !important; border: none !important; }
        button:not(.bg-primary):not(.bg-accent).bg-green-600 { background: rgb(22 163 74) !important; border: none !important; }
      `}</style>

      {/* Promo Banner - centered modal */}
      {shouldShowBanner && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setPromoBanner(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'linear-gradient(135deg, rgba(15,23,42,0.97), rgba(11,16,32,0.99))',
              border: '1px solid rgba(138,180,255,0.3)',
              borderRadius: '20px',
              padding: '32px 28px',
              maxWidth: '360px',
              width: '90%',
              textAlign: 'center',
              position: 'relative',
              boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 40px rgba(138,180,255,0.1)'
            }}
          >
            {/* Close */}
            <span
              onClick={() => setPromoBanner(false)}
              style={{ position: 'absolute', top: '12px', right: '14px', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '20px', lineHeight: 1, userSelect: 'none' }}
            >
              ×
            </span>

            {/* Icon */}
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>🤝</div>

            {/* Title */}
            <p style={{ color: '#9bffd6', fontWeight: 700, fontSize: '15px', marginBottom: '10px', lineHeight: 1.3 }}>
              {language === 'sq' ? 'Jeni ndër vizitorët e parë të Antokton!' : "You're one of the first Antokton visitors!"}
            </p>

            {/* Body */}
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '13px', lineHeight: 1.6, marginBottom: '8px' }}>
              {language === 'sq' ? 'Regjistrohuni falas, publikoni njoftime dhe ftoni miqtë tuaj.' : 'Register for free, post listings and invite your friends.'}
            </p>
            <p style={{ color: '#8ab4ff', fontSize: '12px', fontStyle: 'italic', marginBottom: '24px', lineHeight: 1.5 }}>
              {language === 'sq' ? 'Vllaznia që a n\'tok ton asht vlerAnTOKton.' : 'Brotherhood that is valued in our land is Antokton.'}
            </p>

            {/* CTA */}
            <span
              onClick={() => base44.auth.redirectToLogin()}
              style={{
                display: 'block',
                background: 'linear-gradient(to right, #8ab4ff, #9bffd6)',
                color: '#0b1020',
                fontWeight: 700,
                fontSize: '13px',
                padding: '10px 24px',
                borderRadius: '999px',
                cursor: 'pointer',
                userSelect: 'none',
                marginBottom: '10px'
              }}
            >
              {language === 'sq' ? 'Regjistrohu falas' : 'Register for free'}
            </span>

            <span
              onClick={() => setPromoBanner(false)}
              style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', cursor: 'pointer', userSelect: 'none' }}
            >
              {language === 'sq' ? 'Vazhdo pa u regjistruar' : 'Continue without registering'}
            </span>
          </div>
        </div>
      )}

      {/* Navbar */}
      <nav
        className="nav-glass fixed left-0 right-0 border-b border-white/10 top-0"
        style={{
          overflow: 'visible',
          pointerEvents: 'auto',
          zIndex: 99999,
          position: 'fixed',
          paddingTop: 'env(safe-area-inset-top)',
          minHeight: 'calc(64px + env(safe-area-inset-top))'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to={createPageUrl("Home")} className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg border border-white/10 flex items-center justify-center" style={{
                background: 'radial-gradient(16px 16px at 30% 30%, rgba(138,180,255,.35), transparent 60%), radial-gradient(16px 16px at 70% 70%, rgba(155,255,214,.25), transparent 60%), rgba(255,255,255,0.12)'
              }}>
                <span className="text-white font-black text-sm">A</span>
              </div>
              <div>
                <div className="text-white font-bold text-base tracking-tight leading-tight">Antokton</div>
                <div className="text-white text-[10px] font-medium leading-none">Platformë</div>
              </div>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-0.5 overflow-x-hidden flex-wrap">
              {dynNav ? (
                // ── Dynamic nav from SiteConfig ──
                <>
                {/* Dynamic nav from SiteConfig */}
                {dynNav.filter(item => item.visible !== false && (!item.authOnly || isAuth)).map(item => {
                  const visibleSubs = (item.submenu || []).filter(s => s.visible !== false);
                  if (!item.hasSubmenu || visibleSubs.length === 0) {
                    return (
                      <Link key={item.id} to={item.url || (item.page ? `/${item.page}` : '/')}
                        className={`px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap
                          ${currentPageName === item.page ? "text-white bg-white/10" : "text-white hover:text-white/60 hover:bg-white/5"}`}>
                          {item.label}
                          </Link>
                          );
                          }
                          return (
                          <DropdownMenu key={item.id}>
                          <DropdownMenuTrigger asChild>
                          <button className={`px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1 whitespace-nowrap
                            ${currentPageName === item.page ? "text-white bg-white/10" : "text-white hover:text-white/60 hover:bg-white/5"}`}>
                            {item.label} <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-52 bg-[#0b1020] border-white/10">
                        {visibleSubs.map(sub => (
                          <DropdownMenuItem key={sub.id} asChild>
                            <Link to={sub.url || '/'} className="cursor-pointer text-white/80 hover:text-white text-sm">{sub.label}</Link>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  );
                })}
                {!dynNavHasStatus && (
                  <Link to="/Statuset"
                    className={`px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap
                      ${currentPageName==="Statuset"?"text-white bg-white/10":"text-white hover:text-white/60 hover:bg-white/5"}`}>
                    Statuse
                  </Link>
                )}
                </>
              ) : (
                // ── Static fallback nav ──
                navItems.filter(item => !item.auth || isAuth).map(item => {
                  if (item.hasSubmenu && item.page === "Feed") {
                    return (
                      <DropdownMenu key={item.page}>
                        <DropdownMenuTrigger asChild>
                          <button className={`px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1 whitespace-nowrap
                            ${["Feed","CreatePost","ApplicationsDashboard"].includes(currentPageName) ? "text-white bg-white/10" : "text-white hover:text-white/60 hover:bg-white/5"}`}>
                            {item.name} <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48 bg-[#0b1020] border-white/10">
                          <DropdownMenuItem asChild><Link to="/Feed?category=pune&job_type=ofroj" className="flex items-center gap-2 cursor-pointer text-white/80 hover:text-white"><Briefcase className="w-4 h-4" /> Oferta pune</Link></DropdownMenuItem>
                          <DropdownMenuItem asChild><Link to="/Feed?category=pune&job_type=kerkoj" className="flex items-center gap-2 cursor-pointer text-white/80 hover:text-white"><Briefcase className="w-4 h-4" /> Kërkesa pune</Link></DropdownMenuItem>
                          {isAuth && (<><DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem asChild><Link to="/ApplicationsDashboard" className="flex items-center gap-2 cursor-pointer text-white/80 hover:text-white"><User className="w-4 h-4" /> {t("Aplikimet e mia","My Applications")}</Link></DropdownMenuItem>
                            {hasPostedJobs && <DropdownMenuItem asChild><Link to="/Feed?filter=my-jobs" className="flex items-center gap-2 cursor-pointer text-white/80 hover:text-white"><Briefcase className="w-4 h-4" /> {t("Njoftimet e mia","My Jobs")}</Link></DropdownMenuItem>}
                            <DropdownMenuItem asChild><Link to="/CreatePost" className="flex items-center gap-2 cursor-pointer text-white/80 hover:text-white"><PlusCircle className="w-4 h-4" /> {t("Posto Njoftim","Post Job")}</Link></DropdownMenuItem>
                          </>)}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    );
                  }
                  if (item.hasSubmenu && item.isProna) {
                    return (
                      <DropdownMenu key={item.page}>
                        <DropdownMenuTrigger asChild>
                          <button className={`px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1 whitespace-nowrap
                            ${currentPageName==="FeedProna" ? "text-white bg-white/10" : "text-white hover:text-white/60 hover:bg-white/5"}`}>
                            {item.name} <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48 bg-[#0b1020] border-white/10">
                          <DropdownMenuItem asChild><Link to="/Pazar" className="flex items-center gap-2 cursor-pointer text-[#8ab4ff] font-semibold text-white/80 hover:text-white">Të gjitha</Link></DropdownMenuItem>
                          {[{key:"makina",label:"Makina"},{key:"mobilje",label:"Mobilje"},{key:"shtepi",label:"Shtëpi & Kuzhinë"},{key:"elektronike",label:"Elektronikë"},{key:"veshje",label:"Veshje"},{key:"aksesore",label:"Aksesorë"},{key:"bicikleta",label:"Bicikleta & Sport"},{key:"mjete",label:"Mjete & Pajisje"},{key:"art",label:"Art & Koleksione"},{key:"dhurime",label:"Dhurime falas"}].map(c => (
                            <DropdownMenuItem key={c.key} asChild><Link to={`/Pazar?category=${c.key}`} className="cursor-pointer text-white/80 hover:text-white">{c.label}</Link></DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    );
                  }
                  if (item.hasSubmenu && item.isSherbime) {
                    return (
                      <DropdownMenu key={item.page}>
                        <DropdownMenuTrigger asChild>
                          <button className={`px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1 whitespace-nowrap
                            ${currentPageName==="FeedSherbime" ? "text-white bg-white/10" : "text-white hover:text-white/60 hover:bg-white/5"}`}>
                            {item.name} <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-52 bg-[#0b1020] border-white/10">
                          <DropdownMenuItem asChild><Link to="/Pazar" className="flex items-center gap-2 cursor-pointer text-[#8ab4ff] hover:text-white font-semibold"><ShoppingBag className="w-4 h-4" /> Pazar (Marketplace)</Link></DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/10" />
                          <DropdownMenuItem asChild><Link to="/Feed?category=sherbime&job_type=ofroj" className="cursor-pointer text-white/80 hover:text-white">Ofroj shërbim</Link></DropdownMenuItem>
                          <DropdownMenuItem asChild><Link to="/Feed?category=sherbime&job_type=kerkoj" className="cursor-pointer text-white/80 hover:text-white">Kërkoj shërbim</Link></DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/10" />
                          {[{key:"ndertim",label:"Ndërtim"},{key:"transport",label:"Transport"},{key:"perkthime",label:"Përkthime"},{key:"it_teknologji",label:"IT & Teknologji"},{key:"avokat",label:"Avokat"},{key:"financiare",label:"Financiare"},{key:"menaxheriale",label:"Menaxheriale"},{key:"tjeter",label:"Shërbime të tjera"}].map(f => (
                            <DropdownMenuItem key={f.key} asChild><Link to={`/Feed?category=sherbime&field=${f.key}`} className="cursor-pointer text-white/80 hover:text-white">{f.label}</Link></DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    );
                  }
                  if (item.hasSubmenu && item.page === "Members") {
                    return (
                      <DropdownMenu key={item.page}>
                        <DropdownMenuTrigger asChild>
                          <button className={`px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1 whitespace-nowrap ${["Members","Companies"].includes(currentPageName)?"text-white bg-white/10":"text-white hover:text-white/60 hover:bg-white/5"}`}>
                            {item.name} <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-52 bg-[#0b1020] border-white/10">
                          <DropdownMenuItem asChild><Link to="/Members" className="flex items-center gap-2 cursor-pointer text-white/80 hover:text-white"><Users className="w-4 h-4" />{t("Anëtarët","Members")}</Link></DropdownMenuItem>
                          <DropdownMenuItem asChild><Link to="/Companies" className="flex items-center gap-2 cursor-pointer text-white/80 hover:text-white"><Building2 className="w-4 h-4" />{t("Kompanitë","Companies")}</Link></DropdownMenuItem>
                          <DropdownMenuItem asChild><Link to="/FacebookGroups" className="flex items-center gap-2 cursor-pointer text-white/80 hover:text-white"><Users className="w-4 h-4" />{t("Grupet","Groups")}</Link></DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    );
                  }
                  if (item.hasSubmenu && item.isEdukim) {
                    return (
                      <DropdownMenu key={item.page}>
                        <DropdownMenuTrigger asChild>
                          <button className={`px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1 whitespace-nowrap ${["Edukim","Akademia"].includes(currentPageName)?"text-white bg-white/10":"text-white hover:text-white/60 hover:bg-white/5"}`}>
                            {item.name} <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-52 bg-[#0b1020] border-white/10">
                          <DropdownMenuItem asChild><Link to="/akademia" className="flex items-center gap-2 cursor-pointer text-[#9bffd6] hover:text-white font-semibold"><Award className="w-4 h-4" /> Akademia Antokton</Link></DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/10" />
                          <DropdownMenuItem asChild><Link to="/Feed?category=edukim&sub=trajnime" className="flex items-center gap-2 cursor-pointer text-white/80 hover:text-white"><GraduationCap className="w-4 h-4" /> Trajnime profesionale</Link></DropdownMenuItem>
                          <DropdownMenuItem asChild><Link to="/Feed?category=edukim&sub=shkolla" className="flex items-center gap-2 cursor-pointer text-white/80 hover:text-white"><GraduationCap className="w-4 h-4" /> Shkolla</Link></DropdownMenuItem>
                          <DropdownMenuItem asChild><Link to="/Feed?category=edukim&sub=kurse" className="flex items-center gap-2 cursor-pointer text-white/80 hover:text-white"><GraduationCap className="w-4 h-4" /> Kurse online</Link></DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    );
                  }
                  if (item.isIconOnly) {
                    const Icon = item.icon;
                    return (
                      <Link key={item.page} to={`/${item.page}`}
                        className={`p-2 rounded-lg transition-all duration-200 flex items-center justify-center
                          ${currentPageName === item.page ? "text-white bg-white/10" : "text-white hover:text-white/60 hover:bg-white/5"}`}
                        title={item.page}>
                        <Icon className="w-4 h-4" />
                      </Link>
                    );
                  }
                  if (item.hasSubmenu && item.isBileta) {
                    return (
                      <DropdownMenu key={item.page}>
                        <DropdownMenuTrigger asChild>
                          <button className={`px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1 whitespace-nowrap ${currentPageName==="Bileta"?"text-white bg-white/10":"text-white hover:text-white/60 hover:bg-white/5"}`}>
                            {item.name} <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-52 bg-[#0b1020] border-white/10">
                          {[{key:"avion",label:"Avion"},{key:"autobus",label:"Autobus"},{key:"tren",label:"Tren"},{key:"furgon",label:"Furgon"},{key:"mallra",label:"Transport mallrash"}].map(b => (
                            <DropdownMenuItem key={b.key} asChild><Link to={`/Bileta?type=${b.key}`} className="flex items-center gap-2 cursor-pointer text-white/80 hover:text-white"><Plane className="w-4 h-4" /> {b.label}</Link></DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    );
                  }
                  if (item.hasSubmenu && item.isMedia) {
                    return (
                      <DropdownMenu key={item.page}>
                        <DropdownMenuTrigger asChild>
                          <button className={`px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1 whitespace-nowrap ${currentPageName==="Media"?"text-white bg-white/10":"text-white hover:text-white/60 hover:bg-white/5"}`}>
                            {item.name} <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-52 bg-[#0b1020] border-white/10">
                          <DropdownMenuItem className="text-white/40 text-xs cursor-default"><Tv className="w-4 h-4" /> Antokton TV <span className="ml-1 text-[10px] opacity-60">(së shpejti)</span></DropdownMenuItem>
                          <DropdownMenuItem className="text-white/40 text-xs cursor-default"><Radio className="w-4 h-4" /> Antokton Radio <span className="ml-1 text-[10px] opacity-60">(së shpejti)</span></DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/10" />
                          {["tv","radio","revista","gazeta","shkrime"].map(sub => (
                            <DropdownMenuItem key={sub} asChild><Link to={`/Media?sub=${sub}`} className="cursor-pointer text-white/80 hover:text-white capitalize">{sub==="shkrime"?"Shkrime & Shkrimtarë":sub.charAt(0).toUpperCase()+sub.slice(1)}</Link></DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    );
                  }
                  return (
                    <Link key={item.page} to={`/${item.page}`}
                      className={`px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap
                        ${currentPageName===item.page?"text-white bg-white/10":"text-white hover:text-white/60 hover:bg-white/5"}`}>
                      {item.name}
                    </Link>
                  );
                })
              )}
            </div>

            {/* Auth + Mobile toggle */}
            <div className="flex items-center gap-1.5">

              {isAuth ? (
                <div className="hidden md:flex items-center gap-1">
                  {/* Cilësimet */}
                  <Link to={createPageUrl("NotificationSettings")}
                    className={`p-2 rounded-lg transition-all duration-200 flex items-center justify-center ${currentPageName==="NotificationSettings"?"text-white bg-white/10":"text-white hover:text-white/60 hover:bg-white/5"}`}
                    title="Cilësimet">
                    <Bell className="w-4 h-4" />
                  </Link>
                  {/* Anëtarët - vetëm admin */}
                  {user?.role === "admin" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className={`p-2 rounded-lg transition-all duration-200 flex items-center gap-1 ${["Members","Companies"].includes(currentPageName)?"text-white bg-white/10":"text-white hover:text-white/60 hover:bg-white/5"}`} title="Anëtarët">
                          <Users className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 bg-[#0b1020] border-white/10">
                        <DropdownMenuItem asChild><Link to="/Members" className="flex items-center gap-2 cursor-pointer text-white/80 hover:text-white"><Users className="w-4 h-4" /> Anëtarët</Link></DropdownMenuItem>
                        <DropdownMenuItem asChild><Link to="/Companies" className="flex items-center gap-2 cursor-pointer text-white/80 hover:text-white"><Building2 className="w-4 h-4" /> Kompanitë</Link></DropdownMenuItem>
                        <DropdownMenuItem asChild><Link to="/FacebookGroups" className="flex items-center gap-2 cursor-pointer text-white/80 hover:text-white"><Users className="w-4 h-4" /> Grupet</Link></DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  {/* Paneli Admin/Moderator */}
                  {(user?.role === "admin" || user?.role === "moderator") && (
                    <Link to={createPageUrl("Profile") + "?tab=admin"}
                      className="p-2 rounded-lg transition-all duration-200 flex items-center justify-center text-white hover:text-white/60 hover:bg-white/5"
                      title={user?.role === "admin" ? "Paneli i Adminit" : "Paneli i Moderatorit"}>
                      <Shield className="w-4 h-4" />
                    </Link>
                  )}
                  <NotificationBell />
                  <DropdownMenu>

                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all ml-1">
                        {user?.flag_color === "yellow" && <span className="text-yellow-500 text-sm">⚠️</span>}
                        {user?.flag_color === "red" && <span className="text-red-500 text-sm">🚩</span>}
                        <User className="w-3.5 h-3.5 text-[#9bffd6]" />
                        <span className="text-white text-xs font-medium max-w-[80px] truncate">
                          {getDisplayName(user)}
                        </span>
                        <ChevronDown className="w-3.5 h-3.5 text-white" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 bg-[#0b1020] border-white/10">
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl("Profile")} className="flex items-center gap-2 cursor-pointer text-white/80 hover:text-white">
                          <User className="w-4 h-4" /> Profili
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl("Messages")} className="flex items-center gap-2 cursor-pointer text-white/80 hover:text-white">
                          <MessageCircle className="w-4 h-4" /> Mesazhet
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/AkademiaMentor" className="flex items-center gap-2 cursor-pointer text-white/80 hover:text-white">
                          <Award className="w-4 h-4" /> Paneli Akademia
                        </Link>
                      </DropdownMenuItem>
                      {(user?.role === "admin" || user?.role === "moderator") && (
                        <DropdownMenuItem asChild>
                          <Link to="/AkademiaAdmin" className="flex items-center gap-2 cursor-pointer text-white/80 hover:text-white">
                            <Shield className="w-4 h-4" /> Admin Akademia
                          </Link>
                        </DropdownMenuItem>
                      )}
                      {(user?.user_type === 'employer' || user?.user_type === 'recruiter') && (
                        <DropdownMenuItem asChild>
                          <Link to={createPageUrl("EmployerDashboard")} className="flex items-center gap-2 cursor-pointer text-white/80 hover:text-white">
                            <Briefcase className="w-4 h-4" /> Paneli i Punëdhënësit
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator className="bg-white/10" />
                      <DropdownMenuItem onClick={() => base44.auth.logout()} className="text-red-400 hover:text-red-300 cursor-pointer">
                        <LogOut className="w-4 h-4 mr-2" /> Dil
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <div className="hidden md:flex items-center gap-1">
                  <Button
                    onClick={() => base44.auth.redirectToLogin()}
                    className="bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] font-semibold text-xs h-8 px-4 hover:opacity-90 border-0"
                  >
                    <LogIn className="w-3.5 h-3.5 mr-1.5" />
                    {t('hyr', language)}
                  </Button>
                </div>
              )}



              <Link to="/Search" className="md:hidden text-white hover:text-white/60 flex items-center justify-center w-10 h-10 rounded-lg hover:bg-white/5 transition-all">
                <Search className="w-5 h-5" />
              </Link>
              <button
                ref={hamburgerRef}
                onClick={() => setMenuOpen(!menuOpen)}
                className="md:hidden text-white hover:text-white/60 flex items-center justify-center w-10 h-10 rounded-lg hover:bg-white/5 transition-all"
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', cursor: 'pointer' }}
              >
                {menuOpen ? <X className="w-5 h-5 pointer-events-none" /> : <Menu className="w-5 h-5 pointer-events-none" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu - outside nav so touch scroll works natively */}
        {menuOpen && (
          <div
            ref={menuRef}
            data-swipe-back-ignore
            className="md:hidden fixed left-0 right-0 border-t border-white/10"
            style={{
              top: 'calc(64px + env(safe-area-inset-top))',
              bottom: '64px',
              zIndex: 9998,
              display: 'flex',
              flexDirection: 'column',
              background: 'rgba(11,16,32,0.98)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          >
            <div className="relative flex flex-col flex-1 overflow-hidden">
              {/* Scroll up indicator */}
              {menuScrollState.canScrollUp && (
                <div className="absolute top-2 left-0 right-0 z-10 flex justify-center pointer-events-none">
                  <button
                    onClick={() => scrollMenuBy(-120)}
                    className="w-8 h-8 rounded-full flex items-center justify-center pointer-events-auto"
                    style={{ background: 'rgba(138,180,255,0.15)', border: '1px solid rgba(138,180,255,0.3)' }}
                  >
                    <ChevronUp className="w-4 h-4 text-white/70" />
                  </button>
                </div>
              )}

              {/* Scrollable content wrapper */}
              <div className="relative flex-1" style={{ minHeight: 0, overflow: 'hidden' }}>

              {/* Scrollable content */}
              <div
                ref={menuScrollRef}
                onScroll={handleMenuScroll}
                className="px-4 space-y-0.5 [&::-webkit-scrollbar]:hidden"
                style={{
                  paddingTop: '8px',
                  paddingBottom: '8px',
                  position: 'absolute',
                  inset: 0,
                  overflowY: 'scroll',
                  WebkitOverflowScrolling: 'touch',
                  overscrollBehavior: 'contain',
                }}
              >

              {dynNav ? (
                // ── Dynamic mobile nav ──
                dynNav.filter(item => item.visible !== false && (!item.authOnly || isAuth)).map(item => {
                  const visibleSubs = (item.submenu || []).filter(s => s.visible !== false);
                  if (!item.hasSubmenu || visibleSubs.length === 0) {
                    return (
                      <Link key={item.id} to={item.url || (item.page ? `/${item.page}` : '/')} onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-white hover:text-white/60 hover:bg-white/5 transition-all">
                        <span className="text-xs font-medium">{item.label}</span>
                      </Link>
                    );
                  }
                  const isOpen = mobileSubmenuOpen[item.id];
                  return (
                    <div key={item.id}>
                      <button onClick={() => setMobileSubmenuOpen(p => ({ ...p, [item.id]: !p[item.id] }))}
                        className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-white hover:text-white/60 hover:bg-white/5 transition-all w-full">
                        <span className="text-xs font-medium">{item.label}</span>
                        <ChevronDown className={`w-3 h-3 ml-auto transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isOpen && (
                        <div className="ml-5 mt-0.5 space-y-0.5">
                          {visibleSubs.map(sub => (
                            <Link key={sub.id} to={sub.url || '/'} onClick={() => setMenuOpen(false)}
                              className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-white hover:text-white/60">
                              {sub.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                // ── Static fallback mobile nav ──
                <>
                  <div>
                    <button onClick={() => setMobileSubmenuOpen(p=>({...p,jobs:!p.jobs}))} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-white hover:text-white/60 hover:bg-white/5 transition-all w-full">
                     <Briefcase className="w-3.5 h-3.5" /><span className="text-sm font-medium">{t("Punë","Jobs")}</span>
                     <ChevronDown className={`w-3.5 h-3.5 ml-auto transition-transform ${mobileSubmenuOpen.jobs?'rotate-180':''}`} />
                    </button>
                    {mobileSubmenuOpen.jobs && (
                      <div className="ml-5 mt-0.5 space-y-0.5">
                        <Link to="/Feed?category=pune&job_type=ofroj" onClick={()=>setMenuOpen(false)} className="flex items-center gap-2 px-3 py-2.5 text-sm text-white hover:text-white/60"><Briefcase className="w-3.5 h-3.5" /> Oferta pune</Link>
                        <Link to="/Feed?category=pune&job_type=kerkoj" onClick={()=>setMenuOpen(false)} className="flex items-center gap-2 px-3 py-2.5 text-sm text-white hover:text-white/60"><Briefcase className="w-3.5 h-3.5" /> Kërkesa pune</Link>
                        {isAuth && <><Link to="/CreatePost" onClick={()=>setMenuOpen(false)} className="flex items-center gap-2 px-3 py-2.5 text-sm text-white hover:text-white/60"><PlusCircle className="w-3.5 h-3.5" /> {t("Posto Njoftim","Post Job")}</Link></>}
                      </div>
                    )}
                  </div>
                  <div>
                    <button onClick={() => setMobileSubmenuOpen(p=>({...p,sherbime:!p.sherbime}))} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-white hover:text-white/60 hover:bg-white/5 transition-all w-full">
                     <Wrench className="w-3.5 h-3.5" /><span className="text-sm font-medium">Shërbime</span>
                     <ChevronDown className={`w-3.5 h-3.5 ml-auto transition-transform ${mobileSubmenuOpen.sherbime?'rotate-180':''}`} />
                    </button>
                    {mobileSubmenuOpen.sherbime && (
                      <div className="ml-5 mt-0.5 space-y-0.5">
                        <Link to="/Feed?category=sherbime&job_type=ofroj" onClick={()=>setMenuOpen(false)} className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-white hover:text-white/60"><Wrench className="w-3 h-3" /> Ofroj shërbim</Link>
                        <Link to="/Feed?category=sherbime&job_type=kerkoj" onClick={()=>setMenuOpen(false)} className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-white hover:text-white/60"><Wrench className="w-3 h-3" /> Kërkoj shërbim</Link>
                        {[{key:"ndertim",label:"Ndërtim"},{key:"transport",label:"Transport"},{key:"perkthime",label:"Përkthime"},{key:"it_teknologji",label:"IT & Teknologji"},{key:"avokat",label:"Avokat"},{key:"financiare",label:"Financiare"},{key:"menaxheriale",label:"Menaxheriale"},{key:"tjeter",label:"Shërbime të tjera"}].map(f => (
                          <Link key={f.key} to={`/Feed?category=sherbime&field=${f.key}`} onClick={()=>setMenuOpen(false)} className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-white hover:text-white/60"><Wrench className="w-3 h-3" /> {f.label}</Link>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Pazar - nënmenu i veçantë */}
                  <div>
                    <button onClick={() => setMobileSubmenuOpen(p=>({...p,pazar:!p.pazar}))} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-white hover:text-white/60 hover:bg-white/5 transition-all w-full">
                     <ShoppingBag className="w-3.5 h-3.5" /><span className="text-sm font-medium">Pazar</span>
                     <ChevronDown className={`w-3.5 h-3.5 ml-auto transition-transform ${mobileSubmenuOpen.pazar?'rotate-180':''}`} />
                    </button>
                    {mobileSubmenuOpen.pazar && (
                      <div className="ml-5 mt-0.5 space-y-0.5">
                        <Link to="/Pazar" onClick={()=>setMenuOpen(false)} className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-[#8ab4ff] font-semibold hover:text-white"><ShoppingBag className="w-3 h-3" /> Të gjitha</Link>
                        {["shtepi","banesa","dyqane","restorante","hotele","magazina","toka","troje","ara","pemishte","pyje"].map(sub => (
                          <Link key={sub} to={`/Pazar?category=prona&sub=${sub}`} onClick={()=>setMenuOpen(false)} className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-white/60 hover:text-white capitalize">
                            <Home className="w-3 h-3" /> {sub.charAt(0).toUpperCase()+sub.slice(1)}
                          </Link>
                        ))}
                        {[{key:"makina",label:"Makina"},{key:"mobilje",label:"Mobilje"},{key:"shtepi",label:"Shtëpi & Kuzhinë"},{key:"elektronike",label:"Elektronikë"},{key:"veshje",label:"Veshje"},{key:"aksesore",label:"Aksesorë"},{key:"bicikleta",label:"Bicikleta & Sport"},{key:"mjete",label:"Mjete & Pajisje"},{key:"bujqesia",label:"Bujqësi"},{key:"libra",label:"Libra & Edukim"},{key:"art",label:"Art & Koleksione"},{key:"dhurime",label:"Dhurime falas"}].map(c => (
                          <Link key={c.key} to={`/Pazar?category=${c.key}`} onClick={()=>setMenuOpen(false)} className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-white/60 hover:text-white">
                            <ShoppingBag className="w-3 h-3" /> {c.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <button onClick={() => setMobileSubmenuOpen(p=>({...p,bileta:!p.bileta}))} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-white hover:text-white/60 hover:bg-white/5 transition-all w-full">
                     <Plane className="w-3.5 h-3.5" /><span className="text-sm font-medium">Bileta</span>
                     <ChevronDown className={`w-3.5 h-3.5 ml-auto transition-transform ${mobileSubmenuOpen.bileta?'rotate-180':''}`} />
                    </button>
                    {mobileSubmenuOpen.bileta && (
                      <div className="ml-5 mt-0.5 space-y-0.5">
                        {["avion","autobus","tren","furgon","mallra"].map(type => (
                          <Link key={type} to={`/Bileta?type=${type}`} onClick={()=>setMenuOpen(false)} className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-white/60 hover:text-white capitalize">
                            <Plane className="w-3 h-3" /> {type==="mallra"?"Transport mallrash":type.charAt(0).toUpperCase()+type.slice(1)}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <button onClick={() => setMobileSubmenuOpen(p=>({...p,edukim:!p.edukim}))} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-white hover:text-white/60 hover:bg-white/5 transition-all w-full">
                     <GraduationCap className="w-3.5 h-3.5" /><span className="text-sm font-medium">Edukim</span>
                     <ChevronDown className={`w-3.5 h-3.5 ml-auto transition-transform ${mobileSubmenuOpen.edukim?'rotate-180':''}`} />
                    </button>
                    {mobileSubmenuOpen.edukim && (
                      <div className="ml-5 mt-0.5 space-y-0.5">
                        <Link to="/akademia" onClick={()=>setMenuOpen(false)} className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-[#9bffd6] hover:text-white"><Award className="w-3 h-3" /> Akademia Antokton</Link>
                        <Link to="/Feed?category=edukim&sub=trajnime" onClick={()=>setMenuOpen(false)} className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-white hover:text-white/60"><GraduationCap className="w-3 h-3" /> Trajnime profesionale</Link>
                        <Link to="/Feed?category=edukim&sub=shkolla" onClick={()=>setMenuOpen(false)} className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-white hover:text-white/60"><GraduationCap className="w-3 h-3" /> Shkolla</Link>
                        <Link to="/Feed?category=edukim&sub=kurse" onClick={()=>setMenuOpen(false)} className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-white hover:text-white/60"><GraduationCap className="w-3 h-3" /> Kurse online</Link>
                      </div>
                    )}
                  </div>
                  <div>
                    <button onClick={() => setMobileSubmenuOpen(p=>({...p,media:!p.media}))} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-white hover:text-white/60 hover:bg-white/5 transition-all w-full">
                     <Tv className="w-3.5 h-3.5" /><span className="text-sm font-medium">Media</span>
                     <ChevronDown className={`w-3.5 h-3.5 ml-auto transition-transform ${mobileSubmenuOpen.media?'rotate-180':''}`} />
                    </button>
                    {mobileSubmenuOpen.media && (
                      <div className="ml-5 mt-0.5 space-y-0.5">
                        {["tv","radio","revista","gazeta","shkrime"].map(sub => (
                          <Link key={sub} to={`/Media?sub=${sub}`} onClick={()=>setMenuOpen(false)} className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-white/60 hover:text-white capitalize">
                            <Radio className="w-3 h-3" /> {sub==="shkrime"?"Shkrime & Shkrimtarë":sub.charAt(0).toUpperCase()+sub.slice(1)}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                  <Link to="/Events" onClick={()=>setMenuOpen(false)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-white hover:text-white/60 hover:bg-white/5 transition-all"><Calendar className="w-3.5 h-3.5" /><span className="text-sm font-medium">Ngjarje</span></Link>
                  <Link to="/Bamiresi" onClick={()=>setMenuOpen(false)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-white hover:text-white/60 hover:bg-white/5 transition-all"><Heart className="w-3.5 h-3.5" /><span className="text-sm font-medium">Bamirësi</span></Link>
                  <Link to="/Search" onClick={()=>setMenuOpen(false)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-white hover:text-white/60 hover:bg-white/5 transition-all"><Search className="w-3.5 h-3.5" /><span className="text-sm font-medium">Kërko</span></Link>
                  {isAuth && (
                    <>
                      <div className="border-t border-white/10 my-1" />
                      {user?.role === "admin" && (
                        <div>
                          <button onClick={() => setMobileSubmenuOpen(p=>({...p,members:!p.members}))} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-white hover:text-white/60 hover:bg-white/5 transition-all w-full">
                            <Users className="w-3.5 h-3.5" /><span className="text-sm font-medium">Anëtarët</span>
                            <ChevronDown className={`w-3.5 h-3.5 ml-auto transition-transform ${mobileSubmenuOpen.members?'rotate-180':''}`} />
                          </button>
                          {mobileSubmenuOpen.members && (
                            <div className="ml-5 mt-0.5 space-y-0.5">
                              <Link to="/Members" onClick={()=>setMenuOpen(false)} className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-white hover:text-white/60"><Users className="w-3 h-3" /> Anëtarët</Link>
                              <Link to="/Companies" onClick={()=>setMenuOpen(false)} className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-white hover:text-white/60"><Building2 className="w-3 h-3" /> Kompanitë</Link>
                              <Link to="/FacebookGroups" onClick={()=>setMenuOpen(false)} className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-white hover:text-white/60"><Users className="w-3 h-3" /> Grupet</Link>
                            </div>
                          )}
                        </div>
                      )}
                      <Link to="/AkademiaMentor" onClick={()=>setMenuOpen(false)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-white hover:text-white/60 hover:bg-white/5 transition-all">
                        <Award className="w-3.5 h-3.5" /><span className="text-sm font-medium">Paneli Akademia</span>
                      </Link>
                      {(user?.role === "admin" || user?.role === "moderator") && (
                        <Link to="/AkademiaAdmin" onClick={()=>setMenuOpen(false)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-white hover:text-white/60 hover:bg-white/5 transition-all">
                          <Shield className="w-3.5 h-3.5" /><span className="text-sm font-medium">Admin Akademia</span>
                        </Link>
                      )}
                    </>
                  )}
                </>
              )}

              </div>{/* end scrollable inner */}
              </div>{/* end scrollable content wrapper */}

              {/* Scroll down indicator */}
              {menuScrollState.canScrollDown && (
                <div className="absolute bottom-2 left-0 right-0 z-10 flex justify-center pointer-events-none">
                  <button
                    onClick={() => scrollMenuBy(120)}
                    className="w-8 h-8 rounded-full flex items-center justify-center pointer-events-auto"
                    style={{ background: 'rgba(138,180,255,0.15)', border: '1px solid rgba(138,180,255,0.3)' }}
                  >
                    <ChevronDown className="w-4 h-4 text-white/70" />
                  </button>
                </div>
              )}

              {/* User Menu */}
              <div className="px-4 pt-1.5 pb-3 border-t border-white/10 mt-0 shrink-0">
                {isAuth ? (
                  <button onClick={() => { base44.auth.logout(); setMenuOpen(false); }} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-red-400 hover:bg-white/5 w-full">
                    <LogOut className="w-3.5 h-3.5" /><span className="text-sm font-medium">{t('dil', language)}</span>
                  </button>
                ) : (
                  <button onClick={() => { base44.auth.redirectToLogin(); setMenuOpen(false); }} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[#8ab4ff] hover:bg-white/5 w-full">
                    <LogIn className="w-3.5 h-3.5" /><span className="text-sm font-medium">{t('hyr_regjistrohu', language)}</span>
                  </button>
                )}
              </div>{/* end user menu */}
            </div>
          </div>
        )}

        {/* Mobile Header */}
        <MobileHeader />

      {/* Main Content */}
      <main
        className="min-h-screen"
        style={{
          position: 'relative',
          zIndex: 10,
          paddingTop: 'calc(64px + env(safe-area-inset-top))',
          paddingBottom: 'calc(100px + env(safe-area-inset-bottom))'
        }}
      >
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav currentPageName={currentPageName} />

      {/* Chat Button */}
      <ChatButton />
      
      {/* Chat Notification System */}
      <ChatNotificationSystem />

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={scrollToTop}
          className="fixed bottom-20 right-6 z-40 w-12 h-12 rounded-full text-[#0b1020] flex items-center justify-center shadow-lg hover:opacity-90 transition-all hover:scale-110 scroll-top-btn"
          style={{ bottom: '80px', right: '24px', border: 'none', background: 'linear-gradient(to right, #8ab4ff, #9bffd6)', color: '#0b1020' }}
          aria-label="Scroll to top"
        >
          <ArrowUp className="w-6 h-6" style={{ color: '#ffffff', strokeWidth: 3 }} />
        </motion.button>
      )}

      {/* Footer */}
      <footer className="border-t transition-colors md:pb-0" style={{
        backgroundColor: '#0b1020',
        borderColor: 'rgba(255,255,255,.1)',
        paddingBottom: '0'
      }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <div className="flex flex-col gap-8">
            {/* Brand - full width row */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#8ab4ff] to-[#9bffd6] flex items-center justify-center">
                  <span className="text-[#0b1020] font-black text-xs">A</span>
                </div>
                <span style={{ color: '#ffffff' }} className="font-bold text-base">Antokton</span>
              </div>
              <p style={{ color: '#ffffff' }} className="text-sm leading-relaxed font-medium">
                Platformë komunitare & punësimi për diasporën shqiptare. Punë + komunitet + besueshmëri.
              </p>
              <p className="mt-3 inline-flex rounded-full border border-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/70">
                Beta publike
              </p>
            </div>

            {/* Categories grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">

            {/* Njoftime */}
            <div>
              <h4 style={{ color: '#ffffff' }} className="text-xs font-bold uppercase tracking-wider mb-4">Njoftime</h4>
              <div className="space-y-2.5">
                <Link to={createPageUrl("Feed") + "?category=pune"} className="block text-sm text-white hover:text-white/60 transition-colors">Punë</Link>
                <Link to={createPageUrl("Feed") + "?category=prona"} className="block text-sm text-white hover:text-white/60 transition-colors">Prona</Link>
                <Link to={createPageUrl("Feed") + "?category=sherbime"} className="block text-sm text-white hover:text-white/60 transition-colors">Shërbime</Link>
                <Link to="/Bamiresi" className="block text-sm text-white hover:text-white/60 transition-colors">Bamirësi</Link>
                <Link to={createPageUrl("Bileta")} className="block text-sm text-white hover:text-white/60 transition-colors">Bileta</Link>
                <Link to={createPageUrl("Events")} className="block text-sm text-white hover:text-white/60 transition-colors">Ngjarje</Link>
              </div>
            </div>

            {/* Komunitet */}
            <div>
              <h4 style={{ color: '#ffffff' }} className="text-xs font-bold uppercase tracking-wider mb-4">Komunitet</h4>
              <div className="space-y-2.5">
                <Link to={createPageUrl("Members")} className="block text-sm text-white hover:text-white/60 transition-colors">Anëtarët</Link>
                <Link to={createPageUrl("Companies")} className="block text-sm text-white hover:text-white/60 transition-colors">Kompanitë</Link>
                <Link to={createPageUrl("Partners")} className="block text-sm text-white hover:text-white/60 transition-colors">Bashkëpunëtorë</Link>
                <Link to={createPageUrl("Search")} className="block text-sm text-white hover:text-white/60 transition-colors">Kërko Anëtarë</Link>
              </div>
            </div>

            {/* Platforma */}
            <div>
              <h4 style={{ color: '#ffffff' }} className="text-xs font-bold uppercase tracking-wider mb-4">Platforma</h4>
              <div className="space-y-2.5">
                <Link to={createPageUrl("Subscriptions")} className="block text-sm text-white hover:text-white/60 transition-colors">Abonim Premium</Link>
                <Link to={createPageUrl("About")} className="block text-sm text-white hover:text-white/60 transition-colors">Rreth Nesh</Link>
                <Link to={createPageUrl("Contact")} className="block text-sm text-white hover:text-white/60 transition-colors">Kontakto</Link>
                <Link to={createPageUrl("Home")} className="block text-sm text-white hover:text-white/60 transition-colors">Faqja Kryesore</Link>
              </div>
            </div>

            {/* Kushte & Info */}
            <div>
              <h4 style={{ color: '#ffffff' }} className="text-xs font-bold uppercase tracking-wider mb-4">Kushte & Info</h4>
              <div className="space-y-2.5">
                <Link to={createPageUrl("Privacy")} className="block text-sm text-white hover:text-white/60 transition-colors">Politika e Privatësisë</Link>
                <Link to={createPageUrl("Terms")} className="block text-sm text-white hover:text-white/60 transition-colors">Termat e Përdorimit</Link>
                <a href="mailto:info@antokton.com" className="block text-sm text-white hover:text-white/60 transition-colors">📧 info@antokton.com</a>
                <a href="https://antokton.com" target="_blank" rel="noopener noreferrer" className="block text-sm text-white hover:text-white/60 transition-colors">🌐 antokton.com</a>
              </div>
            </div>

            </div>{/* end categories grid */}
          </div>{/* end flex col */}

          {/* Divider */}
          <div className="border-t mt-8 pt-8" style={{ borderColor: 'var(--line)', paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>
            <p style={{ color: '#ffffff' }} className="text-center text-xs">© 2026 Antokton. Të gjitha të drejtat e rezervuara.</p>
            <p style={{ color: '#ffffff' }} className="text-center text-xs mt-1">Bërë me ❤️ për diasporën shqiptare</p>
          </div>
        </div>
      </footer>
      </div>
    </MobileNavProvider>
  );
}
