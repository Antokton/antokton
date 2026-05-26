# Antokton App Store Submission Checklist

Status: preparation in progress; do not submit until the manual account, signing, and device-review gates below are complete.

## Current App Readiness

- Production URL: `https://antokton.com`
- Android package name target: `com.antokton.app`
- PWA manifest path: `antokton-export/public/manifest.json`
- PWA icons: `antokton-export/public/icons/antokton-192.png`, `antokton-export/public/icons/antokton-512.png`
- Digital Asset Links path: `antokton-export/public/.well-known/assetlinks.json`
- Privacy policy route: `https://antokton.com/Privacy`
- Terms route: `https://antokton.com/Terms`
- Contact/support route: `https://antokton.com/Contact`

## Fixed In This Pass

- Set the document language to Albanian with `<html lang="sq">`.
- Updated the PWA manifest to use `start_url: "/"`, `lang: "sq"`, and a production-grade Albanian platform description.
- Bumped the service worker cache version so mobile/PWA clients can pick up the latest shell.
- Confirmed `/icons/antokton-512.png` is referenced only by project PWA files: `manifest.json` and `sw.js`.
- Added non-blocking authentication prompts for protected mobile tabs so Profile and Messages do not trap users in a full-screen login view.

## Android / Google Play Gate

- Confirm `https://antokton.com/manifest.json` is live after production deploy.
- Confirm manifest fields:
  - `name`: `Antokton`
  - `short_name`: `Antokton`
  - `start_url`: `/`
  - `scope`: `/`
  - `lang`: `sq`
  - `display`: `standalone`
  - 192px and 512px icons exist and render cleanly.
- Confirm `https://antokton.com/.well-known/assetlinks.json` is live and contains:
  - package name `com.antokton.app`
  - the final release/upload signing SHA-256 fingerprint.
- Build the TWA/AAB outside source-controlled secrets:
  - keep keystores outside git;
  - keep passwords in local shell variables or secure password manager;
  - increment `versionCode` for every upload;
  - use human-readable `versionName` such as `1.0.0`.
- Verify the installed Android build:
  - opens without URL bar/browser buttons;
  - no Chrome/Brave translation popup in normal use;
  - login/register works;
  - Profile and Mesazher unauthenticated prompts do not cover bottom navigation;
  - offline fallback opens;
  - uploads/assets work;
  - push/notification behavior is documented if enabled.

## Google Play Manual Steps

1. Create or open the Google Play Console developer account.
2. Create app:
   - app name: `Antokton`
   - default language: Albanian or English with Albanian listing text;
   - app type: App;
   - free/paid: Free.
3. Complete App content:
   - Privacy Policy URL: `https://antokton.com/Privacy`
   - Data Safety form based on real data collected: account, profile, messages, uploads, contact form, analytics/diagnostics if enabled.
   - Ads declaration: mark accurately.
   - Target audience/content rating.
4. Upload AAB to Internal testing first.
5. If this is a new personal developer account, prepare closed testing with at least 12 opted-in testers for 14 continuous days before production access.
6. Add store listing assets:
   - 512x512 app icon;
   - feature graphic 1024x500;
   - phone screenshots;
   - 7-inch/tablet screenshots if targeting tablets;
   - short and full descriptions;
   - support email.
7. Run internal test on real Android devices before requesting review.

## iOS / Apple App Store Gate

- Preferred route: native wrapper only after the web app feels app-like and not like a thin browser shell.
- Avoid App Store "webview-only" rejection risk by confirming:
  - standalone navigation feels native;
  - no visible browser chrome;
  - key flows work without redirect loops;
  - Profile, Mesazher, Pazar, uploads, and auth have useful in-app states;
  - support/contact/privacy links are functional.
- Required live URLs:
  - Privacy: `https://antokton.com/Privacy`
  - Support: `https://antokton.com/Contact`
  - Terms: `https://antokton.com/Terms`
- Prepare Apple assets:
  - app icon 1024x1024 PNG;
  - iPhone screenshots for required device sizes;
  - iPad screenshots if iPad is enabled;
  - promotional text, description, keywords;
  - support URL and marketing URL.

## App Store / TestFlight Manual Steps

1. Enroll/open Apple Developer Program.
2. Create bundle ID, for example `com.antokton.app`.
3. Create App Store Connect app record.
4. Build iOS shell with Capacitor or a native wrapper that preserves app-like navigation.
5. Configure signing in Xcode; keep certificates/profiles out of git.
6. Upload to TestFlight.
7. Test on real iPhone:
   - safe-area/notch;
   - login/register;
   - Profile and Mesazher auth prompt;
   - service worker/PWA cache behavior inside wrapper;
   - uploads and camera/photo permissions;
   - all footer legal links.
8. Submit for review only after TestFlight passes.

## Remaining Blockers

- Final production deploy must serve this commit before Play/App review.
- Real Android AAB source scaffold should be checked in cleanly or regenerated from documented Bubblewrap commands; current local `android/` build artifacts are not a clean source-control package.
- Final signing SHA-256 must match the published `assetlinks.json`.
- Store listing graphics/screenshots are still manual.
- Google Play closed testing may be mandatory for a new personal developer account.
- Apple native wrapper/TestFlight build has not been created in this pass.
