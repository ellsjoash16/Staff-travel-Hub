# DAFAGRAM — Staff Travel Hub

## Project Overview
Internal web app for DAF/Dial a Flight staff to share travel experiences, browse destinations, and register interest in upcoming group trips.

**Stack:** React + TypeScript + Vite + Tailwind CSS + shadcn/ui
**Auth:** Firebase Authentication (email/password + Microsoft SSO)
**Database:** Firestore
**Storage:** Firebase Storage
**Deployment:** Vercel (frontend) + Vercel serverless functions (`api/`)

## Key Files
- `src/App.tsx` — root shell, auth state, lazy view routing
- `src/context/AppContext.tsx` — all app state, Firestore read/write functions
- `src/lib/db.ts` — raw Firestore/Storage CRUD functions
- `src/lib/types.ts` — all TypeScript interfaces
- `src/lib/firebase.ts` — Firebase app/auth/db/storage init
- `src/components/AdminPanel.tsx` — full admin UI (posts, trips, locations, users, settings)
- `src/components/HomeView.tsx` — dashboard home with panel cards
- `src/components/LoginScreen.tsx` — login/signup screen
- `firestore.rules` — Firestore security rules (deploy via Firebase Console)
- `storage.rules` — Storage security rules
- `api/` — Vercel serverless functions (plain `.js`, not TypeScript)

## Architecture Rules
- All Firestore writes go through `src/lib/db.ts` functions — never write directly from components
- All app state lives in `AppContext` — components call context functions, not db functions directly
- Firestore writes must complete before dispatching to local state (no optimistic updates)
- `api/` serverless functions use plain `.js` — TypeScript fails with `"type": "module"`
- Images are uploaded to Firebase Storage before URLs are saved to Firestore
- Passport/medical data is AES-GCM encrypted via `src/lib/crypto.ts` before Firestore storage

## General Rules
- Never ask clarifying questions for straightforward requests — just implement it
- When I describe a UI change, implement the most sensible interpretation and note your assumption
- Run `npm run build` after changes and fix any errors before finishing
- Always use `git add [specific files]` — never `git add -A` or `git add .`
- Find files with Glob/Grep before editing — never guess file locations
- Implement ALL parts of a multi-part request in one pass — don't drop sub-features
- Don't add comments, docstrings, or type annotations to code you didn't change

## UI & Layout
- Use existing Tailwind classes and the established spacing scale
- Mobile-first; follow existing responsive patterns in the file you're editing
- When fixing a visual issue, list exactly what changed so I can verify without reading code
- Never swap image assignments between components without asking
- Keep `font-gilbert` only for the DAFAGRAM logo — all other headings use `font-semibold`
