# Mobile And PWA QA Checklist

Date: 2026-05-21

Status: required before broad public beta.

Scope: real-device validation for ANTOKTON web, mobile browser behavior, installability, service worker behavior, login, uploads, and core flows.

## Automated Polish Completed

Completed on 2026-05-21:

- App HTML language set to Albanian with mobile safe-area viewport support.
- Manifest language, description, and start URL aligned with the routed app shell.
- Offline page copy corrected and safe-area viewport support added.
- Service worker cache version bumped for the next release.
- Service worker update handling now asks the new worker to activate and refreshes the app once after controller change.
- Local preview keeps service worker cleanup behavior, so development and preview sessions do not get stuck on stale caches.

Automated checks completed:

- `node --check antokton-export\public\sw.js`
- `node --check antokton-export\src\lib\registerServiceWorker.js`
- Manifest JSON parse check
- `npm --prefix antokton-export run build`
- `npm --prefix antokton-export audit`
- Local preview HTTP 200 checks for `/`, `/manifest.json`, `/sw.js`, `/offline.html`, and `/CookiePolicy`

## Devices

Minimum device matrix:

- iPhone with Safari.
- Android phone with Chrome.
- Desktop Chrome.
- Desktop Safari or Edge if available.

Record:

- Device model.
- OS version.
- Browser version.
- Tester.
- Date.

## Installability

Check on Android Chrome:

- Open `https://antokton.com`.
- Confirm install prompt or browser install option is available.
- Install app.
- Launch installed app.
- Confirm home page loads.
- Confirm navigation works.

Check on iOS Safari:

- Open `https://antokton.com`.
- Add to Home Screen.
- Launch from Home Screen.
- Confirm home page loads.
- Confirm navigation works.

## Service Worker And Offline

Check:

- `https://antokton.com/manifest.json` returns HTTP 200.
- `https://antokton.com/sw.js` returns HTTP 200.
- `https://antokton.com/offline.html` returns HTTP 200.
- Offline page appears when expected.
- After a new deploy, app updates without trapping users on stale UI.

Manual update test:

1. Load app.
2. Close app.
3. Reopen app.
4. Confirm current navigation and footer are visible.
5. Log out and log in again after update.

## Auth

Check:

- Register or login.
- `/User/me` backed flow works through UI.
- Logout works.
- Login persists after refresh.
- Secure cookie behavior does not break mobile Safari.
- No development auth path is visible.

## Core Flows

Check on iOS and Android:

- View listings/feed.
- Search.
- Create a post or test listing in a safe beta category.
- Edit/delete own test content if available.
- Upload a small image.
- Open uploaded asset.
- Open Contact page.
- Open Privacy, Terms, and Cookie Policy pages.

## Moderation And Support

Check with admin or moderator account:

- Admin/moderator login works.
- Report or moderation queue is visible.
- ContentModeration page loads.
- Admin notes field accepts text.
- ContactMessage triage path is known.

Do not use production users for destructive tests without consent.

## Pass Criteria

Mobile/PWA QA passes only if:

- iOS and Android can load, login, navigate, and upload.
- Installed PWA launches successfully on both platforms where supported.
- Service worker does not block updates.
- Legal/contact pages are reachable.
- No P0 or P1 mobile-specific bug remains open.

## Result Log

Use this table when the test is executed:

| Date | Device | Browser | Tester | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| TBD | TBD | TBD | TBD | Pending |  |
