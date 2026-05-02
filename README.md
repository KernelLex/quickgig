# QuickGig

QuickGig is an Android-ready Expo marketplace for trusted short-term local work. It includes separate worker, poster, and admin workspaces, request-based messaging, saved briefs, applicant decisions, and marketplace-quality checks designed for a production-style mobile experience.

## Run locally

```bash
npm install
npm run android
```

If you want to preview it in the browser first:

```bash
npm run web
```

## What is included

- Role-based login for workers, posters, and admins
- Worker gig discovery flow with search, category filters, saved briefs, and fit indicators
- Gig posting flow for posters
- Brief-readiness checks for stronger listings
- Request-based chat between workers and posters before accept/reject
- Duplicate request protection and automatic closure of competing requests after assignment
- Admin overview for gigs and request activity
- Android-ready Expo configuration for local builds

## Build notes

This project was scaffolded with Expo and verified with:

```powershell
npx tsc --noEmit
$exportDir = Join-Path $env:TEMP "quickgig-export"
npx expo export --platform android --output-dir $exportDir
```

For a local Windows test APK:

```powershell
cd android
$env:NODE_ENV = "production"
.\gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a
```
