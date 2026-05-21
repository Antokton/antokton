# Android Packaging Readiness

Date: 2026-05-21

Status: preparation only. Do not build APK/AAB until the blockers below are closed.

Scope: Android packaging path for ANTOKTON after production is live on PostgreSQL and the PWA polish is deployed. This document does not change production, database, Render env vars, schema, or frontend code.

## Recommendation

Chosen route: Trusted Web Activity (TWA) using Bubblewrap or PWABuilder.

Why TWA fits ANTOKTON now:

- ANTOKTON is already a production PWA at `https://antokton.com`.
- The current manifest has `start_url="/"`, `display="standalone"`, `lang="sq"`, and 192/512 PNG icons.
- TWA runs the live web app through the user's browser engine and verifies ownership with Digital Asset Links.
- It avoids duplicating auth/session/cache logic inside a separate native shell.
- It keeps one production surface during public beta: the website and Android app both use the same deployed PWA.
- It is the lowest-risk route before ANTOKTON needs native-only APIs.

Routes not chosen for the first Android package:

- Capacitor: good later if ANTOKTON needs native push, background tasks, native file handling, or custom Android/iOS plugins. It adds a native project, release complexity, and more QA surface now.
- Plain WebView wrapper: not recommended. It creates more cookie, upload, service-worker, back-navigation, performance, and Play-review risk without the ownership and browser-quality benefits of TWA.

Decision: use TWA for the first Android internal test. Reassess Capacitor only after the web/PWA beta is stable and a real native requirement appears.

## Proposed Identity

- App name: `Antokton`
- Package name suggestion: `com.antokton.app`
- Production origin: `https://antokton.com`
- Privacy policy URL: `https://antokton.com/Privacy`
- Terms URL: `https://antokton.com/Terms`
- Contact URL: `https://antokton.com/Contact`
- Cookie policy URL: `https://antokton.com/CookiePolicy`

Package name warning: choose carefully before uploading to Play Console. Once an app bundle is uploaded, the package name is fixed for that Play Console app.

## Current PWA Baseline

Already present in repo:

- `antokton-export/public/manifest.json`
- `antokton-export/public/sw.js`
- `antokton-export/public/offline.html`
- `antokton-export/public/icons/antokton-192.png`
- `antokton-export/public/icons/antokton-512.png`
- `antokton-export/index.html` with `lang="sq"` and `viewport-fit=cover`

Known production baseline from previous validation:

- Production: `https://antokton.com`
- Database mode: PostgreSQL
- Schemas: 60
- Production smoke: 17/17 passed
- PWA cache version: `antokton-pwa-2026-05-21-1`

Recheck these immediately before Android build.

## Required Assets

App icon:

- Adaptive Android launcher icon foreground/background.
- Play Console hi-res icon: 512 x 512 PNG.
- Existing PWA icon can be a starting point, but verify safe-zone and maskable icon quality on Android.

Splash screen:

- Splash background color should match the PWA theme color: `#0b1020`.
- Splash logo should be readable on dark background.
- Use Android splash/adaptive icon safe-area rules; avoid tiny text in the splash asset.

Store listing graphics:

- Feature graphic: 1024 x 500 PNG or JPEG.
- At least 2 phone screenshots for the first internal/closed listing flow.
- Recommended screenshot set:
  - Home
  - Login/register
  - Statuset/feed
  - Pazar
  - Mesazheria authenticated state
  - Profile
  - Offline fallback
  - Contact/Privacy support screen

Screenshots must show the current Android app experience, not iPhone or desktop frames.

## Digital Asset Links Requirements

TWA requires website-to-app ownership verification.

Required file:

```text
https://antokton.com/.well-known/assetlinks.json
```

It must include:

- `namespace`: `android_app`
- `package_name`: `com.antokton.app`
- SHA-256 certificate fingerprint for the signing certificate used by the distributed app
- relation for handling URLs:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.antokton.app",
      "sha256_cert_fingerprints": ["<SHA-256 signing fingerprint>"]
    }
  }
]
```

Important:

- The fingerprint must match the key used for the build users install.
- If Google Play App Signing is enabled, confirm whether the asset link must use the Play app signing certificate fingerprint, not only the local upload key.
- Do not ship public testing until TWA opens full-screen without Custom Tab browser UI.

## Signing And Key Requirements

Before build:

- Decide whether to use Google Play App Signing.
- Generate and store the upload key in a private password manager or secure vault.
- Record:
  - keystore location
  - key alias
  - owner
  - creation date
  - recovery procedure
- Never commit keystores, passwords, signing configs with secrets, or generated release artifacts.

Required local/private commands later, not now:

```powershell
keytool -list -v -keystore <upload-key.keystore> -alias <alias>
```

Use the SHA-256 fingerprint from the actual release signing flow for `assetlinks.json`.

## Google Play Console Requirements

Required account/setup:

- Google Play Developer account.
- App created with final app name and package name.
- App category selected.
- Default language: Albanian or English, depending on launch strategy.
- Privacy Policy URL: `https://antokton.com/Privacy`
- Data Safety form completed based on real data collection and account behavior.
- Content rating questionnaire completed.
- Target audience and ads declarations completed.
- App access instructions provided if login is required for reviewer flows.
- Internal testing track configured.

Recommended first track:

- Internal testing with a small trusted tester group.
- Then closed testing only after internal Android QA passes.

## Internal Testing Checklist

Pre-build:

- Production `/health` OK.
- `dbMode=postgres`.
- Smoke test passes against `https://antokton.com`.
- `manifest.json` valid and reachable.
- `sw.js` reachable and cache version is current.
- `offline.html` reachable and Albanian.
- Privacy/Terms/Contact/Cookie pages reachable.
- iPhone/mobile auth modal fixes confirmed still live.

Install/open:

- App installs from internal track.
- App opens full-screen as TWA without browser address bar.
- No Custom Tab fallback after Digital Asset Links verification.
- Splash screen is branded and not stretched.
- App icon looks correct on light/dark launchers.

Core flows:

- Home loads quickly.
- Register works.
- Login works.
- Session survives app close/reopen.
- Logout works.
- `user/me` state is correct after relaunch.
- Entity CRUD works.
- Uploads/assets work.
- Pazar authenticated and unauthenticated states work.
- Mesazheria authenticated and unauthenticated states work.
- Profile authenticated and unauthenticated states work.
- Contact form works.

PWA behavior inside TWA:

- Offline fallback appears when offline.
- Returning online recovers without reinstall.
- Service worker update does not trap old UI.
- Back button behavior is natural.
- Bottom navigation remains usable.
- Keyboard does not hide critical buttons.
- Touch targets are comfortable.
- Long scroll pages do not freeze.

Devices:

- Android Chrome latest on Pixel-class device.
- Samsung Internet / Samsung device.
- Lower-memory Android device if available.
- Android 13, 14, or newer if available.

## Known Blockers Before APK/AAB

P0 before build:

- Final route decision accepted: TWA.
- Confirm `https://antokton.com/.well-known/assetlinks.json` deployment path.
- Choose final package name.
- Generate signing/upload key securely.
- Obtain SHA-256 signing fingerprint.
- Create or verify adaptive icon and Play icon assets.
- Create 1024 x 500 feature graphic.
- Capture Android screenshots.
- Confirm Play Developer account access.
- Confirm Privacy Policy, Terms, Contact, Cookie pages are final enough for Play review.

P0 before public Android listing:

- TWA Digital Asset Links verification passes.
- Internal testing install passes.
- Auth/session/upload/Pazar/Mesazheria/Profile pass on real Android.
- Data Safety form matches real app behavior.
- Production backup automation external setup is completed or explicitly risk-accepted for limited beta.
- Monitoring alerts are active.
- Support/moderation owner is assigned.

## First Build Plan Later

Do not run this yet. Use this only after the blockers are closed.

Suggested TWA path:

```powershell
npm install -g @bubblewrap/cli
bubblewrap init --manifest https://antokton.com/manifest.json
bubblewrap build
```

Alternative GUI path:

- Use PWABuilder to generate a TWA Android package from `https://antokton.com`.
- Review generated config and signing path before upload.

## References

- Android Trusted Web Activities: `https://developer.android.com/develop/ui/views/layout/webapps/trusted-web-activities`
- TWA quick start and Digital Asset Links setup: `https://developer.android.com/develop/ui/views/layout/webapps/guide-trusted-web-activities-version2`
- Capacitor overview: `https://capacitorjs.com/docs`
- Google Play internal testing: `https://support.google.com/googleplay/android-developer/answer/9845334`
- Google Play preview assets: `https://support.google.com/googleplay/android-developer/answer/9866151`
