# Quick Gig

Quick Gig is an Android-ready Expo app for short local jobs that usually last 2 to 3 days. It includes separate worker, poster, and admin flows, simple demo authentication, request-based messaging, and a cleaner mobile UI.

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

- Simple role-based login for workers, posters, and admins
- Worker gig discovery flow with search and category filters
- Gig posting flow for posters
- Request-based chat between workers and posters before accept/reject
- Admin overview for gigs and request activity
- Android-ready Expo configuration for local builds

## Build notes

This project was scaffolded with Expo and verified with:

```bash
npx tsc --noEmit
npx expo export --platform android
```
