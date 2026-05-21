# Mobile And PWA Real-Device QA Checklist

Date: 2026-05-21

Status: required before broad public beta.

Production baseline:

- URL: `https://antokton.com`
- Database mode: `postgres`
- Schema count: `60`
- Manifest `start_url`: `/`
- Manifest language: `sq`
- Service worker cache: `antokton-pwa-2026-05-21-1`
- Production smoke: `17/17` passed

Scope: real-device validation for ANTOKTON mobile web, PWA installability, service worker behavior, login/session behavior, uploads, forms, navigation, safe-area handling, and core beta workflows.

Strict limits:

- Do not change production code during QA unless a critical bug is confirmed.
- Do not deploy production during QA without a separate GO/NO-GO.
- Do not change database env vars, database schema, or Render production settings.
- Use dedicated beta test accounts and clearly named test records.

## Automated Checks Completed

Completed by Codex on 2026-05-21:

- App HTML language set to Albanian with mobile safe-area viewport support.
- Manifest language, description, and start URL aligned with the routed app shell.
- Offline page copy corrected and safe-area viewport support added.
- Service worker cache version bumped for the production release.
- Service worker update handling activates the new worker and refreshes once after controller change.
- Local preview keeps service worker cleanup behavior, so development and preview sessions do not get stuck on stale caches.
- Production PWA endpoints return HTTP 200:
  - `/manifest.json`
  - `/sw.js`
  - `/offline.html`
  - `/CookiePolicy`
- Production smoke test passed `17/17`.

Automated commands already used:

```powershell
node --check antokton-export\public\sw.js
node --check antokton-export\src\lib\registerServiceWorker.js
node -e "const fs=require('fs'); JSON.parse(fs.readFileSync('antokton-export/public/manifest.json','utf8')); console.log('manifest ok')"
npm --prefix antokton-export run build
npm --prefix antokton-export audit
node backend\scripts\smoke-test.js --base https://antokton.com
```

## Device Matrix

Required before broad beta:

| Platform | Browser/App Mode | Required |
| --- | --- | --- |
| Android | Chrome browser | Yes |
| Android | Chrome installed app / Add to Home Screen | Yes |
| Android | Samsung Internet browser | Yes |
| Android | Samsung Internet Add to Home Screen if available | Recommended |
| iPhone | Safari browser | Yes |
| iPhone | Safari Add to Home Screen app mode | Yes |
| Desktop | Chrome or Edge sanity check | Recommended |

Record for every run:

- Device model.
- OS version.
- Browser name and version.
- Network: Wi-Fi, cellular, or both.
- Tester.
- Date/time.

## Shared Test Account Rules

- Use only beta test accounts owned by the QA tester.
- Do not test destructive flows using real user accounts.
- Prefix test posts/uploads with `QA Mobile`.
- Delete test content after the run when the workflow supports deletion.
- If a test creates records that cannot be deleted through UI, record the record title and timestamp for admin cleanup.

## Android Chrome Checklist

Browser mode:

- Open `https://antokton.com`.
- Confirm homepage loads without horizontal scrolling.
- Confirm footer/legal links are reachable.
- Confirm bottom navigation is visible and not covered by Android gesture/nav bar.
- Confirm touch targets are comfortable and do not require precision taps.
- Open Feed, Pazar, Statuset, Search, Contact, Privacy, Terms, and Cookie Policy.
- Register or login.
- Refresh the page and confirm session persists.
- Confirm user/me-backed profile/session area still works.
- Create a safe test entity or post if available.
- Edit/update the test record if available.
- Delete the test record if available.
- Upload a small image.
- Open the uploaded asset.
- Open forms and dialogs; confirm buttons and labels fit.
- Focus text inputs; confirm Android keyboard does not hide the active field or submit button.
- Scroll long pages; confirm scrolling is smooth and the bottom nav remains usable.

Install mode:

- Use Chrome menu: Install app or Add to Home Screen.
- Launch Antokton from the home screen.
- Confirm standalone display opens without browser chrome where supported.
- Confirm homepage loads.
- Confirm login state is either preserved or can log in normally.
- Confirm navigation and uploads still work in installed mode.
- Confirm legal pages open in installed mode.

Offline/service worker:

- Load homepage and one or two key pages while online.
- Enable airplane mode.
- Reopen the installed app or browser tab.
- Confirm offline fallback appears when uncached navigation cannot load.
- Disable airplane mode.
- Confirm app recovers without clearing browser data.

## Samsung Internet Checklist

Browser mode:

- Open `https://antokton.com`.
- Confirm homepage loads.
- Confirm text, buttons, and cards fit the viewport.
- Confirm bottom navigation is not covered by Samsung navigation controls.
- Open Feed, Pazar, Statuset, Search, Contact, Privacy, Terms, and Cookie Policy.
- Register or login.
- Refresh and confirm session persistence.
- Upload a small image and open it.
- Test at least one form with keyboard open.
- Confirm dialogs and sheets remain usable with keyboard and small viewport.
- Confirm scrolling does not trap the user inside fixed panels.

Add to Home Screen if available:

- Add Antokton to Home Screen from Samsung Internet.
- Launch from the home screen.
- Confirm homepage, login, navigation, and legal pages work.

Offline/service worker:

- Repeat the offline fallback test from Android Chrome.
- Confirm recovery after network returns.

## iPhone Safari Checklist

Safari browser mode:

- Open `https://antokton.com`.
- Confirm homepage loads.
- Confirm no horizontal scrolling.
- Confirm notch/safe-area spacing works in portrait.
- Confirm bottom navigation is above the iOS home indicator.
- Confirm Safari address bar position does not cover primary controls.
- Open Feed, Pazar, Statuset, Search, Contact, Privacy, Terms, and Cookie Policy.
- Register or login.
- Refresh the page and confirm session persists.
- Lock/unlock the phone and confirm session still behaves normally.
- Upload a small image from Photos.
- Open the uploaded asset.
- Open forms and dialogs; confirm iOS keyboard does not hide the active field or submit button.
- Test back/forward navigation.
- Rotate to landscape only if the device/user commonly uses it; note layout issues.

Add to Home Screen mode:

- In Safari, choose Share -> Add to Home Screen.
- Launch Antokton from the home screen icon.
- Confirm app opens in standalone mode.
- Confirm homepage loads.
- Confirm login state is either preserved or login works normally.
- Confirm bottom navigation, forms, uploads, and legal pages work.
- Close and reopen from the home screen.
- Confirm no blank screen after reopening.

Offline/service worker:

- Load homepage and one key route while online.
- Enable airplane mode.
- Reopen the home screen app.
- Confirm offline fallback appears when needed.
- Disable airplane mode.
- Confirm the app recovers and can navigate again.

## Service Worker Update Behavior

This test should be done after the next production deploy that changes `sw.js`.

Steps:

1. Open the app before deploy.
2. Keep the tab/app installed.
3. Deploy a new version during a controlled window.
4. Reopen or refresh the app.
5. Confirm it refreshes at most once after the new worker takes control.
6. Confirm the app is not stuck on stale assets.
7. Confirm login still works.
8. Confirm `/sw.js` exposes the expected new cache version.

Pass criteria:

- No infinite reload loop.
- No blank screen.
- No stale footer/nav/legal pages after refresh.
- Login and upload still work after update.

## Forms, Dialogs, Keyboard, And Touch Targets

Test on Android Chrome, Samsung Internet, and iPhone Safari:

- Login form.
- Register form.
- Contact form.
- Search/filter input.
- Create/edit post form if available to the tester.
- Upload picker.
- Any modal/dialog reached during the test.

Pass criteria:

- Active input stays visible above keyboard.
- Submit/cancel buttons stay reachable.
- No text overlaps buttons.
- Touch targets feel tappable with thumb.
- Validation errors are readable.
- Dialogs can be closed without browser reload.

## Safe-Area And Scrolling

Test on devices with notches/home indicators:

- Top nav is not hidden under notch/status bar.
- Bottom nav is not hidden behind home indicator.
- Scroll-to-top button does not cover primary nav.
- Footer legal links are reachable.
- Long pages scroll to the bottom.
- Fixed drawers or panels do not trap scroll.

## QA Results Template

Use one row per device/browser/app-mode combination:

| Date | Device | OS Version | Browser/App Mode | Tester | Pass/Fail | Issue | Screenshot/Video Needed | Severity | Follow-Up |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TBD | Android model | Android version | Chrome browser | TBD | Pending |  | No |  |  |
| TBD | Android model | Android version | Chrome installed app | TBD | Pending |  | No |  |  |
| TBD | Samsung model | Android version | Samsung Internet | TBD | Pending |  | No |  |  |
| TBD | iPhone model | iOS version | Safari browser | TBD | Pending |  | No |  |  |
| TBD | iPhone model | iOS version | Safari home screen app | TBD | Pending |  | No |  |  |

Severity guide:

- P0: site unusable, auth broken, uploads broken, data loss, privacy/security risk.
- P1: core mobile workflow broken, installed app unusable, persistent blank screen, serious layout blocker.
- P2: visible layout issue with workaround, minor keyboard annoyance, non-critical browser-specific bug.
- P3: cosmetic issue, typo, minor spacing issue.

## Pass Criteria

Mobile/PWA real-device QA passes only if:

- Android Chrome browser passes.
- Android installed app mode passes.
- Samsung Internet browser passes or issues are documented as non-blocking.
- iPhone Safari browser passes.
- iPhone Add to Home Screen mode passes.
- Login/register/session persistence works.
- Uploads/assets work.
- Offline fallback works.
- Service worker update behavior has no reload loop or stale app trap.
- No P0 or P1 mobile-specific issue remains open.

## Manual Tester Notes

What the user/tester must verify manually:

- Install prompts and Add to Home Screen flows.
- iOS standalone mode behavior.
- Android installed app behavior.
- Real keyboard/viewport behavior.
- Photo picker/upload permissions.
- Notch/home-indicator safe area.
- Touch target comfort.
- Real offline/airplane-mode recovery.

What Codex can verify automatically:

- Production `/health`.
- Production smoke test.
- Manifest JSON content.
- Service worker version.
- Offline page availability and copy.
- Build/audit/syntax checks.
- Local preview route availability.
