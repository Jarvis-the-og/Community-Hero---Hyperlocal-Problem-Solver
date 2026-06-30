# Community Hero — AI-Powered Hyperlocal Problem Solver

A full-stack civic engagement platform that enables citizens to report, verify, track, prioritize, and resolve local community issues. Powered by Groq AI (LLaMA models), Google Maps Platform, and Firebase.

![Next.js](https://img.shields.io/badge/Next.js-16.2.9-black?style=flat-square&logo=next.js)
![Express](https://img.shields.io/badge/Express-4.x-green?style=flat-square)
![Firebase](https://img.shields.io/badge/Firebase-Firestore%20%2B%20Auth%20%2B%20Storage-orange?style=flat-square&logo=firebase)
![Groq](https://img.shields.io/badge/Groq-LLaMA%203.3%20%2B%204%20Scout-purple?style=flat-square)
![Google Maps](https://img.shields.io/badge/Google%20Maps-Geocoding%20%2B%20Places-blue?style=flat-square&logo=googlemaps)

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [AI Agents](#ai-agents)
- [User Roles](#user-roles)
- [Data Models](#data-models)
- [Firestore Indexes Required](#firestore-indexes-required)
- [Deployment](#deployment)

---

## Overview

Community Hero lets citizens photograph a civic problem (pothole, broken streetlight, garbage, etc.), upload it, and have AI automatically classify, title, prioritize, and route it to the right department. Other citizens nearby can verify, support, or comment on reports. Authorities get a dedicated dashboard to assign workers, upload before/after photos, and trigger AI-based resolution verification.

---

## Architecture

```
community-hero/
├── client/          # Next.js 16 App Router — frontend
├── server/          # Express.js — REST API + AI pipeline
├── shared/          # Shared enums and constants (ESM)
├── firestore.rules  # Firestore security rules
├── storage.rules    # Firebase Storage security rules
└── .env             # Root environment variables
```

The monorepo uses **npm workspaces**. A single `npm run dev` starts both the client (port 3000) and server (port 5000) via `concurrently`.

---

## Tech Stack

### Frontend
| Package | Version | Purpose |
|---------|---------|---------|
| Next.js | 16.2.9 | App Router, SSR, routing |
| React | 19.2.4 | UI framework |
| Tailwind CSS | 4.x | Utility-first styling |
| Framer Motion | 12.x | Animations and transitions |
| @vis.gl/react-google-maps | 1.8.3 | Google Maps React components |
| Firebase (Web SDK) | 12.x | Auth, Firestore realtime, Storage |
| Lucide React | 1.22.0 | Icon library |

### Backend
| Package | Version | Purpose |
|---------|---------|---------|
| Express | 4.x | HTTP server and routing |
| groq-sdk | 1.3.0 | Groq AI API (LLaMA text + vision) |
| firebase-admin | 13.x | Firestore, Storage server-side |
| multer | 1.4.5 | File upload handling |
| helmet, cors, morgan | latest | Security and logging |

### Google Services
| Service | Usage |
|---------|-------|
| Firebase Auth | Google Sign-In, JWT token verification |
| Firestore | Primary database for all data |
| Firebase Storage | Issue photo and video storage |
| Maps JavaScript API | Interactive map with markers |
| Geocoding API | Reverse geocode GPS → address, forward geocode address → coordinates |
| Places API | Nearby landmark lookup for issue context |

### AI
| Model | Provider | Usage |
|-------|----------|-------|
| `llama-3.3-70b-versatile` | Groq | Chat, summaries, priority scoring, duplicate detection |
| `meta-llama/llama-4-scout-17b-16e-instruct` | Groq | Vision — image analysis and before/after verification |

---

## Features

### For Citizens
- **Onboarding locality picker** — on first visit, set your neighbourhood via live GPS or manual address search; all nearby issues are scoped to 2 km from this location
- **AI-powered issue reporting** — upload a photo and AI auto-fills title, category, severity, department, and hazards
- **Manual address entry** — type any address or landmark with live geocoding and map preview
- **Live location editing** — GPS-detected address can be manually corrected before submitting
- **Duplicate detection** — before creating a report, the system checks for similar nearby open issues
- **Issue tracking** — My Issues page shows all your reports with live status
- **Community verification** — other users can confirm or reject issues with evidence photos
- **Support voting** — upvote issues to boost their priority
- **Comments** — discuss issues with other community members
- **Notifications** — receive updates when your issue is verified, assigned, worked on, or resolved
- **Leaderboard** — earn points for reporting (10 pts), verifying (15 pts), supporting (5 pts)
- **Badges** — Community Hero, Top Volunteer, Problem Solver, Early Reporter, Verification Champion

### For Authorities (role: authority / admin)
- **Authority Dashboard** — view issues grouped by priority (critical / medium / low) with AI summaries
- **Workflow management** — Assign → Start Work → Mark Resolved in one click
- **Before/after photo upload** — document work in progress and completion
- **AI resolution verification** — trigger AI comparison of before/after images; auto-updates status
- **Analytics** — issue trends (7-day chart), category breakdown, priority distribution, top contributors, resolution rate, average repair time

### AI Features
- **Vision analysis** — LLaMA 4 Scout analyzes uploaded photos to identify issue type, write a human-quality description, estimate severity, suggest department, and list hazards
- **Priority scoring** — hybrid: formula-based score (severity weights + category + support + age + proximity to hospitals/schools) refined by AI
- **Duplicate detection** — text similarity + geo-proximity check before submission (no AI needed, pure JS)
- **AI summary** — short authority-facing summary generated at issue creation
- **Resolution verification** — AI compares before and after images, returns resolved / possibly_unresolved / need_manual_review with confidence and analysis
- **AI Chatbot** — floating assistant (bottom-right) that answers questions about your issues, nearby problems, and how to use the platform; context-aware with your location and recent reports

---

## Project Structure

```
client/
├── app/
│   ├── page.tsx              # Home — nearby issues, stats, leaderboard
│   ├── map/page.tsx          # Interactive map with category filter
│   ├── report/page.tsx       # Report an issue (AI analysis form)
│   ├── issues/page.tsx       # My Issues list
│   ├── issues/[id]/page.tsx  # Issue detail — timeline, comments, verification
│   ├── leaderboard/page.tsx  # Full leaderboard
│   ├── dashboard/page.tsx    # Authority dashboard (role-gated)
│   └── analytics/page.tsx    # Analytics charts (role-gated)
├── components/
│   ├── onboarding/OnboardingModal.tsx   # First-visit locality picker
│   ├── home/HomePage.tsx                # Home page content
│   ├── issue/
│   │   ├── IssueCard.tsx               # Compact/full issue card
│   │   ├── IssueTimeline.tsx           # Status timeline component
│   │   └── ReportIssueForm.tsx         # Full report form with AI
│   ├── dashboard/
│   │   ├── AuthorityIssueCard.tsx      # Authority action card
│   │   └── StatCard.tsx               # Metric stat card
│   ├── map/IssueMap.tsx                # Google Maps component
│   ├── navbar/Navbar.tsx               # Top navigation
│   ├── leaderboard/Leaderboard.tsx     # Leaderboard component
│   └── chatbot/ChatBot.tsx             # Floating AI chatbot
├── context/AuthContext.tsx             # Firebase auth + user profile
├── hooks/
│   ├── useGeolocation.ts               # Browser GPS with watch
│   ├── useIssues.ts                    # API-based issue hooks
│   └── useRealtimeIssues.ts            # Firestore realtime hooks
└── lib/
    ├── api.ts                          # All API client calls + TypeScript interfaces
    ├── firebase.ts                     # Firebase SDK init
    ├── storage.ts                      # Firebase Storage upload helpers
    └── utils.ts                        # Formatting and color utilities

server/
├── app.js                              # Express app, middleware, route mounts
├── config/index.js                     # Env var loading and feature flags
├── controllers/
│   ├── issueController.js
│   ├── chatController.js
│   ├── verificationController.js
│   ├── dashboardController.js
│   ├── notificationController.js
│   └── (auth, comment, leaderboard, analytics)
├── routes/                             # Express routers (one per domain)
├── services/
│   ├── Groq/index.js                 # Groq AI client (generateText, generateFromImage)
│   ├── Groq/prompts/index.js         # All AI prompt constants
│   ├── agents/
│   │   ├── VisionAgent.js              # Image → issue classification
│   │   ├── LocationAgent.js            # GPS → address + landmarks (Google Maps REST)
│   │   ├── PriorityAgent.js            # Priority scoring (formula + AI)
│   │   ├── DuplicateAgent.js           # Duplicate detection (pure JS)
│   │   ├── VerificationAgent.js        # Before/after image comparison
│   │   └── NotificationAgent.js        # In-app notification creation
│   ├── firebase/index.js               # Firebase Admin SDK init
│   ├── governance/                     # Rate limiting, caching, quotas, logging
│   └── firestore/restClient.js         # REST fallback when Admin SDK not configured
└── middleware/
    ├── index.js                        # authenticate, optionalAuthenticate, errorHandler
    ├── governance.js                   # Burst limiter, route quota guards
    └── upload.js                       # Multer config

shared/
└── enums/index.js                      # UserRole, IssueStatus, IssueCategory, Severity,
                                        # Priority, VerificationStatus, BadgeType,
                                        # NotificationType, PointAction
```

---

## Quick Start

### Prerequisites
- Node.js 18+
- A Google Cloud / Firebase project
- Groq API key (free at [console.groq.com](https://console.groq.com))

### 1. Install dependencies
```bash
git clone <repo-url>
cd "Community Hero - Hyperlocal Problem Solver"
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env with your keys (see Environment Variables section below)
```

### 3. Start development servers
```bash
npm run dev
# Frontend: http://localhost:3000
# Backend:  http://localhost:5000
```

### Demo Mode
If Firebase credentials are not configured, the app runs with seeded in-memory sample data. All features work except real persistence and Google Auth.

---

## Environment Variables

Create a `.env` file in the project root. All variables are documented in `.env.example`.

```env
# Server
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# Feature flags (set to false to disable)
ENABLE_Groq=true
ENABLE_MAPS=true
ENABLE_CHATBOT=true
ENABLE_FIREBASE=true
DEMO_MODE=false

# Firebase Admin SDK (Server)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json

# Firebase Web SDK (Client)
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Groq AI
GROQ_API_KEY=gsk_...

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...   # Client (browser)
GOOGLE_MAPS_API_KEY=AIza...               # Server (REST calls)

# Client
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

---

## API Reference

All routes are prefixed with `/api`. Authentication uses Firebase JWT tokens in the `Authorization: Bearer <token>` header.

### Health
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/health` | None | Server health check |

### Auth
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/auth/profile` | Required | Get current user profile |
| POST | `/auth/sync` | Required | Create or update user profile |

### Issues
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/issues` | Required | List issues (filter by `status`, `category`, `priority`, `reporterId`) |
| GET | `/issues/nearby` | Required | Issues within radius (`lat`, `lng`, `radius` km) |
| GET | `/issues/:id` | Required | Single issue by ID |
| POST | `/issues/analyze` | Required | AI media analysis — returns `VisionAnalysis` + `GeoLocation` |
| POST | `/issues/check-duplicates` | Required | Check for nearby duplicates |
| POST | `/issues` | Required | Create issue (runs full AI pipeline) |
| POST | `/issues/:id/support` | Required | Upvote an issue |
| PATCH | `/issues/:id/status` | Required | Update issue status |
| POST | `/issues/:id/resolution-images` | Required | Upload before/after photos |

### Verification
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/verification/:issueId` | Required | Get all verifications for an issue |
| POST | `/verification/:issueId` | Required | Submit verification (confirmed/rejected + optional evidence photos) |
| POST | `/verification/:issueId/verify-resolution` | Required | Trigger AI before/after comparison |

### Comments
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/comments/:issueId` | Required | Get comments for an issue |
| POST | `/comments/:issueId` | Required | Add a comment |

### Dashboard
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/dashboard` | Required | Authority dashboard data (grouped by priority) |
| GET | `/dashboard/:id` | Required | Single issue with comments and verifications |

### Leaderboard & Analytics
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/leaderboard` | None | Top users by points (default limit 10) |
| GET | `/analytics` | Required | Full analytics summary |

### Chat & Notifications
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/chat` | Optional | Send message to AI chatbot |
| GET | `/notifications` | Required | Get user notifications |
| PATCH | `/notifications/:id/read` | Required | Mark notification as read |

---

## AI Agents

### VisionAgent
- **Model:** `meta-llama/llama-4-scout-17b-16e-instruct` (Groq vision)
- **Input:** Base64 image + VISION_PROMPT
- **Output:** `{ category, title, description, severity, department, hazards[], confidence }`
- **Used by:** `POST /issues/analyze`

### LocationAgent
- **Input:** GPS coordinates
- **Output:** `{ lat, lng, address, ward, road, landmark, nearbyPlaces[] }`
- **APIs called:** Google Maps Geocoding API (reverse geocode), Places API (nearby search)
- **Caching:** Geocode results cached 24h, Places cached 6h (keyed by coordinates rounded to 5 decimal places)

### PriorityAgent
- **Model:** `llama-3.3-70b-versatile` (Groq text)
- **Logic:** Formula base score (severity + category weights + support count + age + proximity to hospital/school) → AI refines with reasoning
- **Output:** `{ priority: critical|medium|low, score: 0-100, reasoning }`
- **Fallback:** Pure formula if AI unavailable

### DuplicateAgent
- **No AI** — pure JavaScript
- **Logic:** Haversine distance (0.5 km radius) + word-set Jaccard similarity on title/description + category match
- **Threshold:** 0.7 similarity score triggers duplicate flag
- **Output:** `{ isDuplicate: bool, matches: [{ issueId, title, similarity, distance, category, status }] }`

### VerificationAgent
- **Model:** `meta-llama/llama-4-scout-17b-16e-instruct` (Groq vision)
- **Input:** Before image URL + after image URL
- **Output:** `{ status: resolved|possibly_unresolved|need_manual_review, confidence, analysis }`
- **Used by:** `POST /verification/:id/verify-resolution`

### NotificationAgent
- **No AI** — creates Firestore notification documents
- **Events:** issue reported, verification needed, issue verified, issue assigned, work started, issue resolved, badge earned

---

## User Roles

| Role | Capabilities |
|------|-------------|
| `citizen` | Report issues, support, comment, verify others' issues, mark own issues resolved/cancelled |
| `volunteer` | Same as citizen |
| `authority` | All citizen actions + access to Dashboard and Analytics, assign workers, upload before/after photos, trigger AI verification |
| `admin` | Same as authority |

**Client-side enforcement:** Reporter cannot see Support/Confirm/Reject buttons on their own issues. They see Mark Resolved and Cancel Report instead.

---

## Data Models

### Issue
```typescript
{
  id: string
  title: string
  description: string
  category: IssueCategory
  severity: 'critical' | 'medium' | 'low'
  priority: 'critical' | 'medium' | 'low'
  status: IssueStatus
  reporterId: string
  reporterName: string
  mediaUrls: string[]
  location: {
    lat: number
    lng: number
    address?: string
    ward?: string
    landmark?: string
    road?: string
  }
  department?: string
  hazards?: string[]
  aiConfidence: number
  aiSummary?: string
  supportCount: number
  verificationScore: number          // 0–100, % of confirmed verifications
  assignedTo?: string
  assignedWorkerName?: string
  beforeImages?: string[]
  afterImages?: string[]
  resolutionStatus?: string
  duplicateOf?: string
  timeline: TimelineEvent[]
  createdAt: string                  // ISO 8601
  updatedAt: string
}
```

### User
```typescript
{
  id: string                         // Firebase UID
  email: string
  displayName: string
  photoURL?: string
  role: 'citizen' | 'volunteer' | 'authority' | 'admin'
  points: number
  trustScore: number                 // 0–100
  badges: string[]
  createdAt: string
  updatedAt: string
}
```

### Comment
```typescript
{
  id: string
  issueId: string
  userId: string
  userName: string
  content: string
  isHelpful: boolean
  createdAt: string
}
```

### Verification
```typescript
{
  id: string
  issueId: string
  userId: string
  status: 'confirmed' | 'rejected'
  comment?: string
  evidenceUrls?: string[]
  createdAt: string
}
```

### Notification
```typescript
{
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  issueId?: string
  read: boolean
  createdAt: string
}
```

### Issue Status Lifecycle
```
reported → ai_categorized → community_verified → assigned → in_progress → completed → ai_verified
                                                                                     ↘ need_manual_review
                          ↘ rejected (by community or reporter)
```

---

## Firestore Indexes Required

These composite indexes must be created in Firebase Console → Firestore → Indexes:

| Collection | Fields | Order |
|------------|--------|-------|
| `issues` | `reporterId ASC`, `createdAt DESC` | Required for My Issues page |
| `comments` | `issueId ASC`, `createdAt DESC` | Required for issue comments |

Direct links to create them are printed in server logs when the index is missing.

---

## Deployment

### Frontend (Firebase Hosting or Vercel)
```bash
cd client
npm run build
# Deploy .next/ to your host of choice
```

### Backend (Cloud Run or any Node host)
```bash
cd server
node app.js
# Requires all environment variables to be set
```

### Firebase Rules
Deploy `firestore.rules` and `storage.rules` via Firebase Console or CLI:
```bash
firebase deploy --only firestore:rules,storage
```
