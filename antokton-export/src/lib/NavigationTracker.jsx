import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { base44 } from '@/api/antoktonClient';
import { pagesConfig } from '@/pages.config';

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
        const homePath = mainPageKey ? `/${mainPageKey}`.toLowerCase() : "/";
        const isHomeRoute = pathname === "/" || pathname.toLowerCase() === homePath;
        const isLoginRoute = pathname.toLowerCase() === "/login";

        if (isHomeRoute || isLoginRoute) return undefined;
        if (!window.matchMedia("(pointer: coarse)").matches && window.innerWidth > 900) return undefined;

        let startX = 0;
        let startY = 0;
        let tracking = false;

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
            tracking = true;
        };

        const handleTouchMove = (event) => {
            if (!tracking) return;
            const touch = event.touches?.[0];
            if (!touch) {
                tracking = false;
                return;
            }
            if (Math.abs(touch.clientY - startY) > 72) {
                tracking = false;
            }
        };

        const handleTouchEnd = (event) => {
            if (!tracking) return;
            tracking = false;

            const touch = event.changedTouches?.[0];
            if (!touch) return;

            const deltaX = touch.clientX - startX;
            const deltaY = Math.abs(touch.clientY - startY);
            if (deltaX < 84 || deltaX < deltaY * 1.6) return;

            if (window.history.length > 1) {
                navigate(-1);
            } else {
                navigate(mainPageKey ? `/${mainPageKey}` : "/");
            }
        };

        window.addEventListener("touchstart", handleTouchStart, { passive: true });
        window.addEventListener("touchmove", handleTouchMove, { passive: true });
        window.addEventListener("touchend", handleTouchEnd, { passive: true });

        return () => {
            window.removeEventListener("touchstart", handleTouchStart);
            window.removeEventListener("touchmove", handleTouchMove);
            window.removeEventListener("touchend", handleTouchEnd);
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
