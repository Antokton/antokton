# ANTOKTON Android TWA Build Prep

Status: scaffold only. No APK/AAB has been published, no production deploy is required, and no signing key belongs in this repo.

Chosen route: Trusted Web Activity using Bubblewrap.

App identity:

- App name: `Antokton`
- Package name: `com.antokton.app`
- Domain: `antokton.com`
- Start URL: `https://antokton.com/`
- Manifest URL: `https://antokton.com/manifest.json`
- Privacy policy: `https://antokton.com/Privacy`

## Folder Contents

- `twa-manifest.template.json`: Bubblewrap/TWA configuration template for ANTOKTON.
- `twa-manifest.json`: Bubblewrap/TWA configuration for `com.antokton.app`.
- `assetlinks.template.json`: Digital Asset Links file generated for the current local upload key fingerprint.
- `build.windows.ps1`: local helper that checks prerequisites and runs Bubblewrap commands.
- `.gitignore`: excludes Android outputs, release artifacts, keystores, and local signing config.

## Prerequisites On Windows

Install outside the repo:

```powershell
node --version
npm --version
java -version
adb version
```

Required tools:

- Node.js supported by Bubblewrap.
- JDK 17.
- Android Studio or Android command-line tools.
- Android SDK Platform Tools.
- Android SDK Build Tools.
- Bubblewrap CLI:

```powershell
npm install -g @bubblewrap/cli
```

Bubblewrap can install JDK/Android SDK dependencies interactively. Prefer installing tools explicitly with Android Studio if the automated setup prompts are unclear.

## Safe First-Time Bubblewrap Init

Use a temporary working directory first so no signing material is generated into the repo by accident:

```powershell
$work = "$env:TEMP\antokton-twa-init"
Remove-Item -Recurse -Force $work -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force $work | Out-Null
bubblewrap init --manifest "https://antokton.com/manifest.json" --directory "$work"
```

Use these values when prompted:

```text
Application name: Antokton
Launcher name: Antokton
Host/domain: antokton.com
Start URL: https://antokton.com/
Package ID/Application ID: com.antokton.app
Theme color: #0b1020
Background color: #0b1020
Orientation: portrait-primary
```

The current local upload key is expected outside the repo:

```text
C:\AntoktonAndroidKeys\antokton-upload-key.jks
```

The password note is also outside the repo:

```text
C:\AntoktonAndroidKeys\antokton-upload-key-password.txt
```

Do not copy `.jks`, `.keystore`, passwords, generated release APKs, or generated AABs into git.

To check the active fingerprint:

```powershell
cd android\twa
.\build.windows.ps1 -Mode Fingerprint
```

## Debug Build

Debug build is for device smoke only. It is not for Play Console upload.

```powershell
cd android\twa
.\build.windows.ps1 -Mode Debug
```

Equivalent manual flow after a real Bubblewrap project exists:

```powershell
cd android\twa
bubblewrap build --manifest .\twa-manifest.json --signingKeyPath "C:\AntoktonAndroidKeys\antokton-upload-key.jks" --signingKeyAlias antokton
adb install -r .\app-release-signed.apk
```

Note: Bubblewrap typically produces signed release artifacts from its build flow. Keep generated artifacts untracked and outside commits.

## Release AAB Build

Do this only after the upload key is stored outside the repo and Play Console identity is ready:

```powershell
cd android\twa
.\build.windows.ps1 -Mode ReleaseAab
```

Expected output from Bubblewrap when configured correctly:

```text
app-release-bundle.aab
```

Do not commit the AAB. Upload it only to Google Play Console internal testing.

## Digital Asset Links

TWA full-screen mode requires:

```text
https://antokton.com/.well-known/assetlinks.json
```

The current committed frontend file is:

```text
antokton-export/public/.well-known/assetlinks.json
```

It currently uses this local upload-key fingerprint:

```text
A0:FA:98:A2:2B:89:AD:73:81:5D:9D:C6:CE:9E:B9:8B:B8:4C:DE:E7:22:0C:73:1D:FE:E3:1C:AF:BF:B6:79:9F
```

The fingerprint must match the certificate used for the app users install. With Google Play App Signing, replace the web file with the Play app signing certificate fingerprint from Play Console before public/closed testing.

Useful command for a local upload key:

```powershell
keytool -list -v -keystore "C:\AntoktonAndroidKeys\antokton-upload-key.jks" -alias antokton
```

## Play Console Internal Testing Path

1. Create the app in Play Console.
2. Use package name `com.antokton.app` only if no conflict exists.
3. Enable Google Play App Signing if that is the chosen release path.
4. Fill app category, contact email, Privacy Policy URL, Data Safety, target audience, and content rating.
5. Create an internal testing track.
6. Add tester email list.
7. Upload the first `.aab`.
8. Copy the Play app signing SHA-256 fingerprint.
9. Publish `assetlinks.json` on `https://antokton.com/.well-known/assetlinks.json`.
10. Wait for the internal testing link to become available.
11. Install on real Android devices and verify TWA opens without browser UI.

## Internal Test Smoke Checklist

- App installs from Play internal testing.
- TWA opens full-screen, not as Custom Tab fallback.
- Home loads.
- Login/register work.
- Session persists after app close/reopen.
- Entity CRUD works.
- Uploads/assets work.
- Pazar works authenticated and unauthenticated.
- Mesazheria works authenticated and unauthenticated.
- Profile works authenticated and unauthenticated.
- Offline fallback appears when offline.
- Back button behavior is natural.
- Keyboard does not hide login or form buttons.
- Production `/health` remains OK with `dbMode=postgres`.

## Current Blockers Before Real APK/AAB

- JDK/Android SDK/Bubblewrap setup must be completed on the build machine.
- Bubblewrap init still needs interactive confirmation.
- Final upload key must be generated and stored outside repo.
- Play Console app/package availability must be confirmed.
- SHA-256 signing fingerprint is known for the local upload key.
- `assetlinks.json` must be deployed to production before the signed local build opens as verified full-screen TWA.
- If Google Play App Signing changes the installed signing certificate, update `assetlinks.json` with the Play app signing fingerprint.
- Store graphics and screenshots are still needed.
- Android real-device QA is still needed after internal test install.

## References

- Android TWA overview: `https://developer.android.com/develop/ui/views/layout/webapps/trusted-web-activities`
- TWA quick start: `https://developer.android.com/develop/ui/views/layout/webapps/guide-trusted-web-activities-version2`
- Bubblewrap CLI: `https://www.npmjs.com/package/@bubblewrap/cli`
- Play internal testing: `https://support.google.com/googleplay/android-developer/answer/9845334`
