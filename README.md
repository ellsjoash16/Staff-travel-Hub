# DAF Adventures — Staff Travel Hub

An internal web app for DAF staff to share travel experiences, discover destinations, and register interest in upcoming group trips.

## Features

- **Feed** — Browse approved staff travel posts with photos, reviews, and destination info
- **Map** — Interactive globe and map view of all destinations visited by staff
- **Years** — Browse posts filtered by year
- **Upcoming Trips** — View and register interest in upcoming group trips
- **Submit** — Staff can submit their own travel stories for admin review
- **Admin Panel** — Manage posts, trips, locations, users, and settings

## Tech Stack

- **Frontend:** React + TypeScript + Vite
- **Styling:** Tailwind CSS + shadcn/ui
- **Auth:** Firebase Authentication (Google Sign-In)
- **Database:** Firestore
- **Storage:** Firebase Storage
- **Serverless:** Vercel (API functions in `api/`)
- **Map:** Mapbox GL JS + react-globe.gl

## Getting Started

### Prerequisites

- Node.js 18+
- A Firebase project with Authentication and Firestore enabled
- A Vercel account (for deployment)

### Environment Variables

Create a `.env.local` file:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_MAPBOX_TOKEN=
VITE_ENCRYPTION_KEY=        # 32-char hex string for encrypting passport/medical data
```

For the Vercel serverless functions, set in Vercel project settings:

```env
FIREBASE_SERVICE_ACCOUNT_JSON=  # Full service account JSON (from Firebase Console → Project Settings → Service Accounts)
```

### Install & Run

```bash
npm install
npm run dev
```

### Deploy

```bash
vercel --prod
```

## Project Structure

```
api/              # Vercel serverless functions (plain .js — TypeScript fails with "type":"module")
src/
  components/     # React components
  context/        # App-wide state (AppContext)
  lib/            # Firebase config, Firestore helpers (db.ts), types, crypto utilities
firestore.rules   # Firestore security rules
```

## Admin Setup

1. Sign in with your Google account
2. In Firestore, create `settings/main` with `adminUids: ["your-uid"]`
3. The Admin Panel will now be accessible from the header

## Security

- Passport and medical data is AES-GCM encrypted before being stored in Firestore
- Firestore rules enforce authentication and admin-only access to sensitive collections
- The `/api/list-users` function verifies Firebase ID tokens against Google's public certs and checks admin status before returning any data
