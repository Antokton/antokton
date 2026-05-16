# Antokton Mobile Readiness Report

Date: 2026-05-16
Scope: mobile readiness audit only. No Capacitor implementation, no backend changes, and no business logic refactor.

## Executive Summary

Antokton is partially ready for mobile web/PWA use, but it is not ready yet for Android/iOS packaging.

The React/Vite frontend already has responsive structure, a mobile header/menu, a bottom navigation bar, PWA manifest files, app icons, an offline page, and a service worker. Core pages load in a phone viewport without immediate console errors.

Before native packaging, the project still needs a mobile polish pass, production-safe auth/API/storage, service worker cache hardening, icon/splash asset completion, and app-store compliance preparation.

## Mobile Viewport Checks

Checked in the in-app browser using mobile viewport sizes:

- 390 x 844:
  - `/Home` loaded, no console errors observed.
  - `/Statuset` loaded, no console errors observed.
  - `/Profile` loaded, no console errors observed.
  - `/Admin` loaded, no console errors observed.
  - `/akademia` loaded, no console errors observed.
- 320 x 640:
  - `/Home` loaded, no console errors observed.
  - Bottom navigation remained visible, but it is dense on narrow screens.

Note: visual edit mode was active during the screenshots, so the admin-only edit overlay was visible and consumed mobile screen space. That overlay should be tested separately from normal user mobile flow.

## Responsive Frontend Status

### What Looks Mobile-Ready

- `antokton-export/src/Layout.jsx` contains mobile-aware layout behavior, mobile menu handling, and bottom padding for the fixed mobile nav.
- `antokton-export/src/components/mobile/MobileBottomNav.jsx` provides a dedicated mobile bottom nav for core areas.
- `antokton-export/src/pages/Home.jsx` includes mobile/tablet hero logic and responsive sections.
- `antokton-export/src/pages/Statuset.jsx` is strongly mobile-oriented with a narrow feed layout and hidden desktop sidebars on small screens.
- Many pages use Tailwind responsive classes such as `sm:`, `md:`, `lg:`, `grid-cols-1`, `overflow-x-auto`, and mobile-friendly max widths.
- Several forms and dialogs use `max-h-[90vh] overflow-y-auto`, which is important for phones.

### Pages/Components That Need Mobile QA Or Fixes

1. `antokton-export/src/components/mobile/MobileBottomNav.jsx`
   - Six default tabs are shown at the bottom: Kryefaqja, Njoftime, Pazar, Statuse, Mesazher, Profili.
   - At 320px width it fits visually, but it is crowded and labels are very small.
   - Before packaging, test with real Android/iPhone safe areas and consider a compact mode if more tabs are added.

2. `antokton-export/src/components/ChatWindow.jsx`
   - Uses `fixed bottom-4 right-4 w-full m-4 sm:w-96`.
   - On mobile, `w-full` plus margin/right offset can overflow horizontally.
   - It may also conflict with the mobile bottom navigation and keyboard.

3. `antokton-export/src/Layout.jsx`
   - Mobile header, dropdown menu, notification layers, scroll-to-top button, visual edit mode, and bottom nav all use fixed/sticky positioning.
   - Needs z-index and tap-target QA on real devices.

4. `antokton-export/src/pages/Admin.jsx` and admin components
   - The admin dashboard is usable at 390px, but it is dense.
   - Tables, tabs, and admin action groups need manual testing on smaller screens.
   - Admin mobile support can be lower priority than public user flows, but it should not block scrolling or actions.

5. `antokton-export/src/pages/AkademiaAdmin.jsx` and `antokton-export/src/pages/AkademiaMentor.jsx`
   - Layout uses responsive grids, but course/application/evaluation panels are content-heavy.
   - Needs real mobile QA for long forms, attendance buttons, and certificate actions.

6. `antokton-export/src/pages/Profile.jsx`
   - Very large form surface with many sections.
   - Needs keyboard, upload, long-scroll, and tab testing on phones.

7. `antokton-export/src/pages/Events.jsx`, `EventDetail.jsx`, `Pazar.jsx`, `PostDetail.jsx`, `CreatePost.jsx`
   - Mostly responsive patterns are present.
   - Risk areas are dialogs, image rows, select controls, and sticky/fixed action areas.

8. `antokton-export/src/components/admin/VisualEditMode.jsx`
   - Admin-only edit mode works in mobile viewport but overlays a help bubble and control button over page content.
   - Needs a separate mobile editor UX decision before relying on it as a serious phone-based design tool.

## PWA Manifest And Icons

Manifest exists:

- `antokton-export/public/manifest.json`

Manifest includes:

- `name`: Antokton
- `short_name`: Antokton
- `start_url`: `/Home`
- `scope`: `/`
- `display`: `standalone`
- `orientation`: `portrait-primary`
- `theme_color`: `#0b1020`
- shortcuts for Statuset, Pazar, and Profili

Icons exist:

- `antokton-export/public/icons/antokton-192.png`
- `antokton-export/public/icons/antokton-512.png`

Index includes mobile/PWA metadata:

- `antokton-export/index.html`
  - viewport meta tag
  - theme-color meta tag
  - manifest link
  - apple-touch-icon
  - mobile web app capable tags

PWA gap:

- Only 192px and 512px app icons are present.
- Before Android/iOS packaging, create a full icon/splash set for Android adaptive icons and iOS required sizes.

## Service Worker Status

Service worker exists:

- `antokton-export/public/sw.js`

Registration exists:

- `antokton-export/src/lib/registerServiceWorker.js`
- `antokton-export/src/main.jsx` imports and calls `registerServiceWorker()`.

Current behavior:

- Service worker is disabled/unregistered on local preview hosts: `localhost`, `127.0.0.1`, `::1`.
- Service worker registers on non-local hosts.
- Core assets, local hero assets, icons, manifest, and offline page are precached.
- Navigations use network-first behavior with `/offline.html` fallback.
- `/api/` GET requests are cached network-first.
- `/assets/`, `/icons/`, `/local-assets/`, `/uploads/`, and `/manifest.json` use cache-first behavior.

PWA risk:

- Caching `/api/` GET responses may cache user-specific data. Before production/mobile packaging, API caching must be reviewed and made safe for auth/logout/private data.
- Cache clearing on logout should be part of the production auth migration.

## Global CSS Mobile Risks

Files checked:

- `antokton-export/src/index.css`
- `antokton-export/src/globals.css`

Findings:

- Safe-area utility classes exist.
- `100dvh` and `-webkit-fill-available` are used for mobile viewport handling.
- Global scrollbars are hidden across the app. This can look clean, but it can also hide scroll affordance and make debugging mobile overflow harder.
- `globals.css` repeats Tailwind directives after earlier directives. This should be cleaned later, but not during this audit.
- Aggressive global button styling overrides exist and may affect mobile controls, especially custom admin/editor buttons.

## Native Packaging Blockers

Do not package with Capacitor yet until these are addressed:

1. Production auth is still not final.
   - Dev-token auth must not be used in production/native app builds.

2. Backend/API needs a stable HTTPS deployment target.
   - Mobile app builds must know whether API calls are relative web URLs or a configured production API base URL.

3. SQLite/local uploads are not production mobile-ready.
   - PostgreSQL/Supabase-compatible database and cloud/object storage should be in place first.

4. Service worker/API cache policy needs hardening.
   - Avoid stale private data and ensure logout clears private caches.

5. Mobile UI polish is still needed.
   - Chat window overflow.
   - Bottom nav density on 320px screens.
   - Dialog scrolling and keyboard behavior on iOS/Android.
   - Admin visual editor overlay on mobile.

6. App icon and splash assets are incomplete.
   - Need Android adaptive icons and iOS app icon/splash sizes.

7. Native permissions are not planned yet.
   - File upload, camera/gallery, notifications, location, and external links need decisions before packaging.

8. Store compliance is not documented yet.
   - Privacy policy, account deletion, data safety, moderation/reporting, and user-generated content rules are needed.

9. Push notifications are not implemented/planned for native.
   - Decide whether PWA notifications are enough or whether native push is required.

10. Deep links/app links are not configured.
   - Important for certificate verification, post detail links, messages, and shared listings.

## Recommendation

Recommended next step before Capacitor:

1. Fix the small mobile UI risks first: chat window, bottom nav density, modal/keyboard behavior, and visual editor overlay behavior.
2. Deploy a first HTTPS web beta.
3. Run Lighthouse PWA/mobile checks on the deployed beta.
4. Test core user flows on real Android and iPhone browsers.
5. Only then add Capacitor configuration.

## Files Created Or Changed

Created:

- `MOBILE_READINESS_REPORT.md`

Changed:

- None.
