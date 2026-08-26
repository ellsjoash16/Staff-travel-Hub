# DAF Adventures — Staff Travel Hub

An internal web app for DAF staff to share travel experiences, discover destinations, and register interest in upcoming group trips.

## Features

- **Home** — A dashboard with a live feed preview, an embedded interactive globe, and quick panels for upcoming trips, your registrations, the trip archive, and sharing a trip
- **Feed** — Browse approved staff travel posts with photos, reviews, and destination info
- **Map** — Interactive globe and map view of all destinations visited by staff
- **DAF Adventures** — Browse the archive of completed trips, split into FAM and External
- **Upcoming Trips** — See countdowns and register interest in upcoming group trips and events
- **My Registrations** — Track the status of your trip registrations (Requested → Pending → Confirmed)
- **Search** — Global search across destinations, trip reviews, trips & events, and courses
- **Submit** — Staff can share their own travel stories through a guided multi-step form
- **Admin Panel** — Manage posts, trips, locations, users, and settings

## Tech Stack

- **Frontend:** React + TypeScript + Vite
- **Styling:** Tailwind CSS + shadcn/ui
- **Auth:** Firebase Authentication (email/password + Microsoft SSO)
- **Database:** Firestore
- **Storage:** Firebase Storage
- **Serverless:** Vercel (API functions in `api/`)
- **Map:** Mapbox GL JS via react-map-gl (globe projection)

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

1. Sign in with your work email or Microsoft account
2. In Firestore, create `settings/main` with `adminUids: ["your-uid"]`
3. The Admin Panel will now be accessible from the header

## Security

- Passport and medical data is AES-GCM encrypted before being stored in Firestore
- Firestore rules enforce authentication and admin-only access to sensitive collections
- The `/api/list-users` function verifies Firebase ID tokens against Google's public certs and checks admin status before returning any data
