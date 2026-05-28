import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { base44 } from '@/api/antoktonClient';
import { pagesConfig } from '@/pages.config';

const TREE_PARENT_ROUTES = {
    "/about": "/Home",
    "/admin": "/Home",
    "/adminanalytics": "/Admin",
    "/adminsuggestions": "/Admin",
    "/advancedrecruitersearch": "/RecruiterTools",
    "/applicationsdashboard": "/Profile",
    "/bulkimport": "/ImportPosts",
    "/companies": "/Home",
    "/companydetail": "/Companies",
    "/contact": "/Home",
    "/contentmoderation": "/Admin",
    "/createpost": "/Feed",
    "/dashboard": "/Profile",
    "/edukim": "/Home",
    "/employerdashboard": "/Profile",
    "/eventdetail": "/Events",
    "/events": "/Home",
    "/eventscalendar": "/Events",
    "/facebookgroups": "/Home",
    "/feed": "/Home",
    "/importposts": "/Feed",
    "/jobmatches": "/Feed",
    "/media": "/Home",
    "/members": "/Home",
    "/messages": "/Home",
    "/notificationcenter": "/Profile",
    "/notificationsettings": "/Profile",
    "/partners": "/Home",
    "/paymenthistory": "/Profile",
    "/postdetail": "/Feed",
    "/premiumdashboard": "/Profile",
    "/privacy": "/Home",
    "/profile": "/Home",
    "/projectdetail": "/Home",
    "/recommendations": "/Home",
    "/recruitertools": "/Profile",
    "/referime": "/Home",
    "/search": "/Home",
    "/setup": "/Admin",
    "/staffchat": "/Admin",
    "/stateantokton": "/Home",
    "/subscriptions": "/Profile",
    "/terms": "/Home",
    "/userprofiles": "/Members",
    "/usersearch": "/Search",
    "/akademia": "/Home",
    "/akademiaadmin": "/Akademia",
    "/akademiamentor": "/Akademia",
    "/bamiresi": "/Home",
    "/bileta": "/Home",
    "/designerpage": "/Home",
    "/pazar": "/Home",
    "/statuset": "/Home",
    "/verify-certificate": "/Akademia",
};

const getTreeParentPath = (pathname, mainPageKey) => {
    const homePath = mainPageKey ? `/${mainPageKey}` : "/";
    const normalized = (pathname || "/").split("?")[0].replace(/\/+$/, "") || "/";
    const lower = normalized.toLowerCase();

    if (lower === "/" || lower === homePath.toLowerCase() || lower === "/login") return null;

    if (lower.startsWith("/akademia/")) return "/akademia";
    if (lower.startsWith("/designerpage/")) return homePath;
    if (lower.startsWith("/verify-certificate/")) return "/Akademia";

    const directParent = TREE_PARENT_ROUTES[lower];
    if (directParent) return directParent;

    const firstSegment = `/${lower.split("/").filter(Boolean)[0] || ""}`;
    if (TREE_PARENT_ROUTES[firstSegment]) return TREE_PARENT_ROUTES[firstSegment];

    const segments = normalized.split("/").filter(Boolean);
    if (segments.length > 1) return `/${segments.slice(0, -1).join("/")}`;

    return homePath;
};

export default function NavigationTracker() {
    const location = useLocation();
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const { Pages, mainPage } = pagesConfig;
    const mainPageKey = mainPage ?? Object.keys(Pages)[0];

    // Log user activity when navigating to a page
    // Scroll to top on every route change
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [location.pathname]);

    useEffect(() => {
        const pathname = location.pathname || "/";
        const parentPath = getTreeParentPath(pathname, mainPageKey);

        if (!parentPath) return undefined;
        if (!window.matchMedia("(pointer: coarse)").matches && window.innerWidth > 900) return undefined;

        const viewportWidth = () => Math.max(window.innerWidth || 0, 320);
        let startX = 0;
        let startY = 0;
        let startTime = 0;
        let currentX = 0;
        let tracking = false;
        let dragging = false;

        const clearLegacyRootTransform = () => {
            const root = document.getElementById("root");
            if (!root) return;
            root.style.transition = "";
            root.style.transform = "";
            root.style.opacity = "";
            root.style.boxShadow = "";
            root.style.willChange = "";
        };

        const resetSwipePreview = () => {
            clearLegacyRootTransform();
        };

        const isInteractiveTarget = (target) => {
            if (!(target instanceof Element)) return false;
            return Boolean(target.closest("input, textarea, select, button, a, [contenteditable='true'], [role='dialog'], [data-swipe-back-ignore]"));
        };

        const handleTouchStart = (event) => {
            const touch = event.touches?.[0];
            if (!touch || touch.clientX > 48 || isInteractiveTarget(event.target)) {
                tracking = false;
                return;
            }
            startX = touch.clientX;
            startY = touch.clientY;
            startTime = Date.now();
            currentX = startX;
            tracking = true;
            dragging = false;
            clearLegacyRootTransform();
            if (event.cancelable) event.preventDefault();
        };

        const handleTouchMove = (event) => {
            if (!tracking) return;
            const touch = event.touches?.[0];
            if (!touch) {
                tracking = false;
                return;
            }
            currentX = touch.clientX;
            const deltaX = currentX - startX;
            const deltaY = Math.abs(touch.clientY - startY);

            if (deltaX > 4 && deltaX > deltaY && event.cancelable) {
                event.preventDefault();
            }

            if (!dragging && deltaX > 18 && deltaX > deltaY * 1.4) {
                dragging = true;
            }

            if (dragging) {
                if (event.cancelable) event.preventDefault();
                return;
            }

            if (deltaY > 72) {
                tracking = false;
                resetSwipePreview();
            }
        };

        const handleTouchEnd = (event) => {
            if (!tracking) return;
            tracking = false;

            const touch = event.changedTouches?.[0];
            if (!touch) {
                resetSwipePreview();
                return;
            }

            const deltaX = touch.clientX - startX;
            const deltaY = Math.abs(touch.clientY - startY);
            const elapsed = Math.max(Date.now() - startTime, 1);
            const velocity = deltaX / elapsed;
            const halfWidth = viewportWidth() * 0.5;
            const shouldNavigate = dragging && deltaX >= halfWidth && deltaX > deltaY * 1.6;
            const fastIntent = dragging && deltaX >= 140 && velocity > 0.75 && deltaX > deltaY * 2;

            if (!shouldNavigate && !fastIntent) {
                resetSwipePreview();
                return;
            }

            resetSwipePreview();
            navigate(parentPath);
        };

        const handleTouchCancel = () => {
            tracking = false;
            dragging = false;
            resetSwipePreview();
        };

        window.addEventListener("touchstart", handleTouchStart, { passive: false });
        window.addEventListener("touchmove", handleTouchMove, { passive: false });
        window.addEventListener("touchend", handleTouchEnd, { passive: true });
        window.addEventListener("touchcancel", handleTouchCancel, { passive: true });

        return () => {
            window.removeEventListener("touchstart", handleTouchStart);
            window.removeEventListener("touchmove", handleTouchMove);
            window.removeEventListener("touchend", handleTouchEnd);
            window.removeEventListener("touchcancel", handleTouchCancel);
            resetSwipePreview();
            clearLegacyRootTransform();
        };
    }, [location.pathname, mainPageKey, navigate]);

    useEffect(() => {
        // Extract page name from pathname
        const pathname = location.pathname;
        let pageName;

        if (pathname === '/' || pathname === '') {
            pageName = mainPageKey;
        } else {
            // Remove leading slash and get the first segment
            const pathSegment = pathname.replace(/^\//, '').split('/')[0];

            // Try case-insensitive lookup in Pages config
            const pageKeys = Object.keys(Pages);
            const matchedKey = pageKeys.find(
                key => key.toLowerCase() === pathSegment.toLowerCase()
            );

            pageName = matchedKey || null;
        }

        if (isAuthenticated && pageName) {
            base44.appLogs.logUserInApp(pageName).catch(() => {
                // Silently fail - logging shouldn't break the app
            });
        }
    }, [location, isAuthenticated, Pages, mainPageKey]);

    return null;
}
