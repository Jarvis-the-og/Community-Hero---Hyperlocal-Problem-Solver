# Community Hero

**AI-Powered Hyperlocal Problem Solver** — a civic engagement platform that enables citizens to report, verify, track, prioritize, and resolve local community issues using Google technologies and Gemini AI.

![Tech Stack](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![Express](https://img.shields.io/badge/Express-4-green?style=flat-square)
![Firebase](https://img.shields.io/badge/Firebase-Firestore-orange?style=flat-square&logo=firebase)
![Gemini](https://img.shields.io/badge/Gemini-AI-blue?style=flat-square&logo=google)

## Features

- **AI Issue Analysis** — Upload a photo; Gemini Vision categorizes, titles, and prioritizes automatically
- **Google Maps Integration** — GPS capture, reverse geocoding, interactive issue map with color-coded markers
- **Community Verification** — Nearby citizens confirm or reject reports; trust scores build over time
- **Duplicate Detection** — AI checks for similar nearby reports before creating duplicates
- **Authority Dashboard** — Assign workers, track progress, upload before/after images
- **AI Resolution Verification** — Gemini compares before/after photos to verify repairs
- **AI Chatbot** — Floating Gemini-powered assistant for natural language queries
- **Gamification** — Points, badges, and leaderboard for community contributors
- **Analytics Dashboard** — Issue trends, resolution rates, category breakdowns

## Architecture

```
community-hero/
├── client/          # Next.js 16 (App Router) + Tailwind + Framer Motion
├── server/          # Express API + Gemini AI Agents
├── shared/          # Shared enums and types
└── docs/
```

### AI Agents

| Agent | Purpose |
|-------|---------|
| VisionAgent | Analyze uploaded media (category, severity, hazards) |
| LocationAgent | GPS, reverse geocode, nearby landmarks |
| DuplicateAgent | Find similar nearby reports in Firestore |
| PriorityAgent | Calculate priority from severity, votes, proximity |
| NotificationAgent | Notify authorities, citizens, reporters |
| VerificationAgent | Compare before/after images for resolution |

## Quick Start

### Prerequisites

- Node.js 18+
- Google Cloud project with Firebase, Maps, and Gemini API enabled

### Setup

```bash
# Clone and install
git clone <repo-url>
cd community-hero
npm install

# Configure environment
cp .env.example .env
# Fill in Firebase, Gemini, and Google Maps API keys

# Start development (client + server)
npm run dev
```

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

### Demo Mode

Without Firebase credentials, the app runs in **demo mode** with seeded sample data. Sign in works without Google Auth configuration.

## Environment Variables

See [`.env.example`](.env.example) for all required variables:

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google AI Gemini API key |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps JavaScript API |
| `FIREBASE_*` | Firebase Admin SDK credentials |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase Web SDK config |

## API Routes

| Route | Description |
|-------|-------------|
| `GET /api/issues` | List issues |
| `POST /api/issues` | Create issue with AI pipeline |
| `POST /api/issues/analyze` | AI media analysis |
| `POST /api/verification/:id` | Community verification |
| `GET /api/dashboard` | Authority dashboard |
| `GET /api/leaderboard` | Top contributors |
| `GET /api/analytics` | Community analytics |
| `POST /api/chat` | AI chatbot |

## Tech Stack

**Frontend:** Next.js, React, Tailwind CSS, shadcn/ui patterns, Framer Motion

**Backend:** Node.js, Express, Firebase Admin, Gemini 2.0 Flash

**Google Cloud:** Firestore, Firebase Auth, Firebase Storage, Maps API, Geocoding API, Gemini AI

## Deployment

### Firebase Hosting + Cloud Run

```bash
# Build client
npm run build --workspace=client

# Deploy server to Cloud Run
# Deploy client to Firebase Hosting
```

## License

MIT
