# QuickGig

QuickGig is an Expo and React Native marketplace for trusted short-term local work. Workers can discover and save briefs, posters can publish and manage requests, and admins can review marketplace health from a polished dark mobile interface.

## Highlights

- Worker, poster, and admin workspaces
- Search, category filters, saved briefs, and fit indicators
- Brief-readiness scoring before a poster publishes
- Request-based chat between workers and posters
- Duplicate request protection
- Applicant accept/reject decisions with automatic closure of competing pending requests
- Backend-style marketplace rules in `src/backend/marketplace.ts`
- Admin operational audit and status sync for mismatches, duplicate requests, and assignment issues
- Android-ready Expo configuration with dark system UI support

## Seed Accounts

Choose a workspace on the sign-in screen, then enter the matching seed credentials:

| Role | Username | Password |
| --- | --- | --- |
| Worker | `riya.worker` | `QuickGig123` |
| Worker | `karan.worker` | `QuickGig456` |
| Worker | `maya.worker` | `QuickGig789` |
| Poster | `aarav.poster` | `PosterPass123` |
| Admin | `admin.quickgig` | `AdminPass123` |

## Project Structure

```text
App.tsx                         Main app shell and role workspaces
src/backend/marketplace.ts      Business rules and data consistency logic
src/data/mockData.ts            Seed users, briefs, and requests
src/theme.ts                    Dark Material-style design tokens
assets/                         Expo app icons and splash assets
```

## Local Development

```powershell
npm install
npm run web
```

Run on Android:

```powershell
npm run android
```

## Verification

```powershell
npm run typecheck
$exportDir = Join-Path $env:TEMP "quickgig-export"
npx expo export --platform android --output-dir $exportDir
```

## Build A Test APK

The local Windows APK build is most reliable outside OneDrive or with the Android output generated fresh. This project currently builds a modern Android test APK for `arm64-v8a`.

```powershell
npm run prebuild:android
cd android
$env:NODE_ENV = "production"
.\gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a
```

The generated release APK is signed with the debug certificate for device testing. For Play Store release, replace the debug signing config with a production keystore.

## Notes

- `newArchEnabled` is disabled in `app.json` to avoid a Windows/Gradle hardlink snapshot issue in native CMake outputs.
- `expo-system-ui` is installed so the Android dark interface style is applied consistently.
- Local APKs, native build folders, logs, screenshots, and Expo output are ignored by git.
