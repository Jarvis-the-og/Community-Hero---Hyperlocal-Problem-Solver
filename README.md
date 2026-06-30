# Community Hero — Hyperlocal Civic Grievance Management Platform

**Pilot Deployment:** Kolkata Municipal Corporation (KMC), West Bengal, India

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
![Status: Production-Ready](https://img.shields.io/badge/Status-Production--Ready-success)

---

## Overview

### The Problem

Urban civic grievance management in Indian cities faces systemic challenges:

- **No unified reporting channel** — Citizens navigate multiple disconnected helplines, department websites, and ward offices
- **No visibility** — Once a complaint is filed, citizens have no way to track its progress
- **No intelligence** — Departmental silos prevent coordinated response; there is no city-wide analytics
- **No accountability** — Complaints languish without SLA enforcement or escalation
- **Duplicate reports** — The same pothole is reported dozens of times, wasting resources
- **Verification gap** — No mechanism to confirm whether work was actually completed

### The Solution

Community Hero is a **hyperlocal civic grievance management platform** purpose-built for Indian municipal corporations. It transforms the entire complaint lifecycle — from citizen report through AI categorization, department assignment, field worker dispatch, AI-powered verification, citizen confirmation, and analytics.

The platform is currently deployed as a **pilot with the Kolkata Municipal Corporation (KMC)**, covering all 30 wards across multiple boroughs with 7 municipal departments.

---

## Key Features

### Citizen Module

- **Report Issues** — Submit grievances with title, description, category, severity, location (map picker or geolocation), and optional photo evidence
- **AI-Assisted Reporting** — Vision AI analyzes uploaded photos to auto-detect category, severity, and hazards; AI generates a summary
- **Duplicate Detection** — Before submission, the system checks for existing nearby reports to prevent duplicate complaints
- **Issue Tracking** — Real-time timeline showing every status change from report through resolution
- **Support & Amplify** — Citizens can support (upvote) existing issues to signal community priority
- **Citizen Confirmation** — After resolution, citizens confirm whether the fix is satisfactory; feedback triggers reopening if needed
- **Map View** — Interactive Google Maps view of all reported issues with status and priority markers
- **Leaderboard & Gamification** — Earn points for reporting, verifying, and supporting issues; unlock badges (Community Hero, Top Volunteer, Problem Solver, etc.)

### Department Module

- **Department Dashboard** — Filter, search, and manage all issues assigned to a specific municipal department
- **Issue Actions** — Accept, reject, assign to field worker, mark in-progress, pause, complete, or escalate
- **Worker Management** — View all field workers within the department and their current workloads
- **Internal Comments** — Department-only notes on issues for inter-officer coordination
- **Similar Issues** — See nearby similar issues for context before taking action

### Field Worker Module

- **Task List** — See assigned tasks for the day with status counts (assigned, in-progress, completed)
- **Task Actions** — Start work, pause, mark complete with optional notes
- **Photo Upload** — Upload before/after photos directly from the field
- **AI Verification** — After uploading "after" images, AI compares before/after photos to verify completion quality
- **Gamification** — Earn resolution points and badges for completing tasks

### Municipal Administrator Module

- **City-Wide Dashboard** — Real-time overview of all issues with filtering by ward, borough, department, priority, and status
- **Analytics Engine** — Comprehensive analytics including:
  - Issue trends (7-day, 30-day)
  - Department performance rankings by resolution rate and average time
  - Ward-level metrics (complaint count, critical issues, SLA compliance)
  - Peak reporting hours
  - Citizen satisfaction scores
  - AI-generated insights and recommendations
- **Map View** — All issues plotted on map with color-coded priority and status
- **Department Rankings** — Performance leaderboard across departments

### Maps

- **Interactive Issue Map** — All issues plotted with color-coded markers (red=critical, yellow=medium, green=low)
- **Location Picker** — Citizens can drop a pin or use current location when reporting
- **Reverse Geocoding** — Google Maps API resolves coordinates to human-readable addresses
- **Nearby Places** — Detects proximity to hospitals, schools, and landmarks for priority scoring
- **Ward & Borough Resolution** — Coordinates are mapped to municipal ward boundaries using the KMC ward catalog

### AI System (Powered by Groq)

The platform uses **six specialized AI agents** powered by Groq's LLama models:

| Agent | Function | Model |
|-------|----------|-------|
| **Vision Agent** | Analyzes uploaded photos to detect issue category, severity, hazards | `llama-4-scout-17b-16e-instruct` |
| **Location Agent** | Reverse geocodes coordinates via Google Maps API | N/A (Maps API) |
| **Duplicate Agent** | Detects duplicate reports within 500m radius using text similarity | Algorithmic |
| **Priority Agent** | Calculates urgency based on severity, category, proximity to hospitals/schools, age | `llama-3.3-70b-versatile` |
| **Verification Agent** | Compares before/after photos to validate completion | `llama-4-scout-17b-16e-instruct` |
| **Notification Agent** | Routes real-time notifications to relevant stakeholders | Service-based |

### Notifications

- **Real-Time Alerts** — Auto-generated notifications for: new issue reported, assigned, work started, resolved, escalated, reopened
- **Role-Based Routing** — Notifications are routed to the correct department, worker, citizen, and administrators
- **Badge Alerts** — Citizens receive notifications when they earn new badges

### Analytics

- **Summary Statistics** — Total issues, resolved, active, resolution rate, average repair time
- **Category Breakdown** — Distribution of issues across categories
- **Priority Distribution** — Count of critical, medium, and low priority issues
- **Trends** — 7-day issue trends and 30-day resolution trends
- **Department Performance** — Resolution rate, average hours per department
- **Ward Metrics** — Per-ward complaint counts, critical counts, SLA compliance percentages
- **Citizen Satisfaction** — Percentage of citizens who confirmed resolution as satisfactory
- **AI Insights** — Auto-generated textual insights (e.g., "Complaint frequency increasing in last 7 days")

### Gamification

- **Points System** — Report (+10), Verify (+15), Support (+5), Helpful Comment (+3), Resolution (+20)
- **Badge Tiers** — Early Reporter (10pts), Community Hero (50pts), Verification Champion (75pts), Problem Solver (100pts), Top Volunteer (200pts)
- **Leaderboard** — Top contributors ranked by points
- **Trust Score** — Points contribute to a trust score (0-100) that increases with verified contributions

### Verification System

- **Community Verification** — Nearby citizens can verify issue existence
- **AI Verification** — After work completion, AI compares before/after photos to validate resolution
- **Citizen Confirmation** — Final confirmation from the reporter that the issue is resolved
- **Resolution Status** — AI classifies as: resolved, possibly unresolved, or needs manual review

### Escalation System

- **SLA Enforcement** — Configurable SLA hours per priority level (critical: 24h, medium: 72h, low: 168h)
- **Auto-Escalation** — Cron job runs every 15 minutes checking all active issues against SLA
- **Escalation History** — Full audit trail of every escalation with level, reason, and timestamp
- **Notification Cascade** — Escalated issues notify department and authority-level users

### Role-Based Authentication

- **Six Roles** — Citizen, Volunteer, Department, Worker, Authority, Admin
- **Firebase Auth** — JWT-based authentication with Firebase identity platform
- **Role Guards** — Middleware enforces role-based access on every protected endpoint
- **Demo Mode** — Built-in demo accounts for development and testing

---

## Architecture Overview

Community Hero follows a **three-tier architecture** with a governance layer wrapping all external service calls.

```
┌─────────────────────────────────────────────────┐
│                Frontend (Next.js)                │
│  Pages · Components · Context · Hooks · UI       │
└──────────────────┬──────────────────────────────┘
                   │ HTTP (REST API)
┌──────────────────▼──────────────────────────────┐
│            API Gateway (Express.js)              │
│  Helmet · CORS · Rate Limiting · Auth Middleware │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│           Governance Layer (Middleware)          │
│  Request Context · Logging · Quotas · Cache     │
│  Timeouts · Retry Logic · In-Flight Dedup       │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│             Controllers (Route Handlers)         │
│  Auth · Issues · Comments · Verification ·       │
│  Dashboard · Analytics · Chat · Notifications    │
│  Department · Worker · Admin · Leaderboard       │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│              Services (Business Logic)           │
│  Issue Service · Escalation · Gamification ·     │
│  Ward Catalog · AI Agents (6) · Notification     │
└──────┬───────────────┬───────────────┬──────────┘
       │               │               │
┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
│  Firestore  │ │  Firebase   │ │   Groq AI   │
│  (NoSQL DB) │ │  Auth/Stor. │ │  (LLaMA)    │
└─────────────┘ └─────────────┘ └─────────────┘
       │
┌──────▼──────┐
│   Google    │
│   Maps API  │
└─────────────┘
```

### Key Architectural Decisions

1. **Centralized Deployment Config** — A single `shared/config/deployment.ts` file configures the entire city deployment. Adding a new city requires changing only this file.
2. **Governance Layer** — Every external API call (Firestore, Google Maps, Groq) goes through `withGovernedRequest()` which provides caching, rate limiting, quotas, timeouts, and retry logic.
3. **Multi-Backend Data Layer** — The system gracefully degrades: Firebase Admin SDK → Firestore REST API → In-Memory Store (demo mode), allowing development without cloud dependencies.
4. **AI Agent Architecture** — Six specialized agents each encapsulate a single AI capability; agents can operate independently or be composed into workflows.
5. **Ward Catalog** — The KMC ward structure is defined in `ward.md` and parsed into a lookup table, enabling coordinate-to-ward resolution without additional API calls.

---

## Tech Stack

### Frontend

| Technology | Purpose |
|------------|---------|
| **Next.js 15** (App Router) | React framework with server components, file-based routing |
| **TypeScript** | Type safety across the frontend |
| **Tailwind CSS** | Utility-first styling |
| **shadcn/ui** | Accessible UI primitives (button, card, badge, input, skeleton, etc.) |
| **Lucide React** | Icon library |
| **React Context** | Auth state management via `AuthContext` |
| **Custom Hooks** | `useIssues`, `useNotifications`, `useGeolocation`, `useRoleGuard`, `useDeployment`, `useRealtimeIssues` |

### Backend

| Technology | Purpose |
|------------|---------|
| **Node.js** (Express) | REST API server |
| **Helmet** | HTTP security headers |
| **CORS** | Cross-origin resource sharing |
| **Morgan** | HTTP request logging |
| **Multer** | Multipart file upload handling |
| **dotenv** | Environment variable loading |

### Database

| Technology | Purpose |
|------------|---------|
| **Firebase Firestore** | NoSQL document database (primary persistence layer) |
| **Firestore REST API** | Fallback when Admin SDK is unavailable |
| **In-Memory Store** | Development/demo mode fallback (no cloud dependencies) |

### Authentication

| Technology | Purpose |
|------------|---------|
| **Firebase Authentication** | Identity platform — handles sign-up, sign-in, token generation |
| **Firebase Admin SDK** | Server-side token verification |
| **Identity Toolkit API** | Fallback token verification via REST |
| **JWT** | Bearer token authentication for all API requests |
| **Role-Based Access Control** | Custom middleware enforcing six user roles |

### Storage

| Technology | Purpose |
|------------|---------|
| **Firebase Cloud Storage** | Issue photo/video uploads (before/after images) |
| **Base64 Fallback** | In-memory fallback when cloud storage is unavailable |

### AI

| Technology | Purpose |
|------------|---------|
| **Groq Cloud** | High-speed LLM inference provider |
| **Llama 3.3 70B** | Text generation (priority calculation, summaries, insights) |
| **Llama 4 Scout 17B** | Vision model (image analysis, before/after verification) |

### Maps

| Technology | Purpose |
|------------|---------|
| **Google Maps Geocoding API** | Reverse geocoding coordinates to addresses |
| **Google Maps Places API** | Nearby places lookup for priority calculation |
| **Google Maps JavaScript API** | Interactive map component in the frontend |

### Governance Layer (Custom)

| Component | Purpose |
|-----------|---------|
| **Request Context** | Per-request metadata propagation (request ID, user, IP) |
| **Timed Cache** | In-memory LRU cache with TTL for external API responses |
| **Quota Manager** | Sliding window (burst) + daily quotas per API and per user |
| **Request Logger** | Structured logging of every external API call |
| **Timeout Handler** | Configurable timeouts with AbortController |
| **Retry Logic** | Automatic retry on transient errors |
| **In-Flight Dedup** | Deduplicates concurrent identical requests |

### Libraries & Tools

| Tool | Purpose |
|------|---------|
| **ESLint** | Code linting (frontend) |
| **PostCSS** | CSS transformations |
| **Turbopack** | Next.js bundler (development) |
| **Git** | Version control |

---

## Folder Structure

```
community-hero/
├── client/                     # Next.js frontend application
│   ├── app/                    # App Router pages (file-based routing)
│   │   ├── admin/              # Municipal administrator dashboard
│   │   ├── analytics/          # Analytics and insights
│   │   ├── auth/               # Authentication page
│   │   ├── dashboard/          # Authority dashboard
│   │   ├── department/         # Department views (list + detail)
│   │   ├── issues/             # Issue list + detail views
│   │   ├── leaderboard/        # Gamification leaderboard
│   │   ├── map/                # Interactive issue map
│   │   ├── report/             # Issue reporting form
│   │   ├── worker/             # Field worker task views
│   │   └── unauthorized/       # Access denied page
│   ├── components/             # Reusable React components
│   │   ├── chatbot/            # AI chatbot component
│   │   ├── dashboard/          # Dashboard cards (StatCard, IssueCard)
│   │   ├── home/               # Landing page component
│   │   ├── issue/              # Issue card, timeline, report form
│   │   ├── leaderboard/        # Leaderboard table
│   │   ├── map/                # Google Maps integration
│   │   ├── navbar/             # Navigation bar
│   │   ├── notifications/      # Notification bell
│   │   ├── onboarding/         # User onboarding modal
│   │   └── ui/                 # shadcn/ui primitives
│   ├── constants/              # App constants (labels, nav items)
│   ├── context/                # React contexts (AuthContext)
│   ├── hooks/                  # Custom React hooks
│   └── lib/                    # Utilities (API client, Firebase, storage)
│
├── server/                     # Express.js REST API
│   ├── config/                 # Environment configuration
│   ├── controllers/            # Route handlers (business logic entry)
│   ├── middleware/              # Auth, governance, file upload
│   ├── routes/                 # Express route definitions
│   ├── scripts/                # Utility scripts (seed data)
│   ├── services/               # Business logic layer
│   │   ├── agents/             # AI agents (6 specialized agents)
│   │   ├── ai/                 # Groq AI client + prompts
│   │   ├── firebase/           # Firebase Admin SDK init + auth
│   │   ├── firestore/          # Firestore REST API client
│   │   └── governance/         # Governance layer (cache, quotas, logger)
│   └── utils/                  # In-memory store, request context
│
├── shared/                     # Shared between client and server
│   ├── config/                 # Centralized deployment configuration
│   ├── constants/              # Departments, SLA hours, aliases
│   ├── enums/                  # Shared enums (roles, statuses, categories)
│   └── types/                  # TypeScript type definitions
│
├── docs/                       # Documentation
├── scratch/                    # Development utilities
└── logs/                       # Application logs
```

---

## Installation

### Prerequisites

- **Node.js** >= 18.x
- **npm** >= 9.x
- A **Firebase** project (Firestore + Authentication + Storage)
- A **Groq** API key (for AI features)
- A **Google Maps** API key (for mapping features)
- **Git**

### Clone & Install

```bash
# Clone the repository
git clone https://github.com/Jarvis-the-og/Community-Hero---Hyperlocal-Problem-Solver.git
cd Community-Hero---Hyperlocal-Problem-Solver

# Install root dependencies
npm install

# Install server dependencies
cd server && npm install && cd ..

# Install client dependencies
cd client && npm install && cd ..
```

### Environment Variables

Copy the example environment file and configure:

```bash
cp .env.example .env
```

Then edit `.env` with your credentials. See [Environment Variables](#environment-variables) for details.

---

## Environment Variables

### Server Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | API server port (default: `5000`) |
| `NODE_ENV` | No | Environment: `development`, `production`, `test` |
| `CLIENT_URL` | No | Frontend URL for CORS (default: `http://localhost:3000`) |

### Feature Flags

| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_AI` | `true` | Enable Groq AI features |
| `ENABLE_MAPS` | `true` | Enable Google Maps integration |
| `ENABLE_CHATBOT` | `true` | Enable AI chatbot |
| `ENABLE_FIREBASE` | `true` | Enable Firebase persistence |
| `DEMO_MODE` | `false` | Run with in-memory data (no cloud dependencies) |

### Firebase (Server — Admin SDK)

| Variable | Description |
|----------|-------------|
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | Service account email |
| `FIREBASE_PRIVATE_KEY` | Service account private key |
| `FIREBASE_STORAGE_BUCKET` | Cloud Storage bucket name |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Path to service account JSON file |
| `FIREBASE_WEB_API_KEY` | Web API key (for Identity Toolkit fallback) |

### Firebase (Client — Web SDK)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Auth domain (e.g., `your-project.firebaseapp.com`) |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Messaging sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | App ID |

### External Services

| Variable | Description |
|----------|-------------|
| `GROQ_API_KEY` | Groq API key for LLM inference |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps JavaScript API key (client-side) |
| `GOOGLE_MAPS_API_KEY` | Google Maps Geocoding/Places API key (server-side) |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | (Optional) VAPID key for push notifications |

---

## Running the Project

### Development

```bash
# Start the backend API server (from root)
cd server && npm run dev

# In a separate terminal, start the frontend
cd client && npm run dev

# The API runs on http://localhost:5000
# The frontend runs on http://localhost:3000
```

### Production

```bash
# Build the client
cd client && npm run build && cd ..

# Start the server (serves client build in production)
cd server && NODE_ENV=production npm start
```

### Seeding Demo Data

```bash
cd server && node scripts/seedProductionDemoData.js
```

### Building

```bash
# Build the client for production
cd client && npm run build
```

### Testing

```bash
# Run server tests
cd server && npm test

# Run ward catalog tests
cd server && node --test services/wardCatalog.test.js
```

---

## User Roles

| Role | Permissions | Responsibilities |
|------|-------------|------------------|
| **Citizen** | Report issues, support issues, view map, view leaderboard, confirm resolution | Submit grievances, track progress, provide feedback |
| **Volunteer** | All citizen permissions + can verify nearby issues | Community verification of reported issues |
| **Department** | View department issues, accept/reject issues, assign workers, add internal comments, escalate | Manage issue queue for assigned department |
| **Worker** | View assigned tasks, update task status, upload before/after photos | Field work — physical resolution of issues |
| **Authority** | View city-wide dashboard, filter by ward/borough/department, view analytics, view rankings | Municipal oversight and decision-making |
| **Admin** | All authority permissions + system administration | Full system access for deployment management |

---

## Complete Complaint Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        COMPLAINT LIFECYCLE                              │
└─────────────────────────────────────────────────────────────────────────┘

CITIZEN
  │
  ▼
REPORT ──────────────────► AI CATEGORIZED ─────► COMMUNITY VERIFIED
  │                           │                          │
  │  Vision AI analyzes       │  Priority Agent          │  Nearby citizens
  │  photos, detects          │  calculates urgency      │  verify existence
  │  category, severity,      │  (critical/medium/low)   │
  │  hazards                  │                          │
  │                           │                          │
  ▼                           ▼                          ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      DEPARTMENT ASSIGNMENT                             │
│                                                                        │
│  AI suggests department based on category (e.g., "pothole" → Roads)   │
│  Department officer reviews → Accepts, Rejects, or Escalates           │
└────────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        WORKER ASSIGNMENT                               │
│                                                                        │
│  Department assigns to field worker                                    │
│  Worker receives notification with task details                        │
└────────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        FIELD WORK                                      │
│                                                                        │
│  Worker starts work → Uploads "before" photos                         │
│  Worker completes work → Uploads "after" photos                       │
│  AI Verification Agent compares before/after photos                    │
│  Resolution status determined (resolved / needs review)               │
└────────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     CITIZEN CONFIRMATION                               │
│                                                                        │
│  Citizen receives notification → Reviews result                        │
│  Confirms: Issue is resolved ✓                                         │
│  OR                                                                    │
│  Rejects: Issue still exists → Reopened with department notified       │
└────────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          CLOSURE                                       │
│                                                                        │
│  Issue marked AI_VERIFIED or COMPLETED                                 │
│  Analytics updated (resolution time, satisfaction score)               │
│  Reporter earns points toward badges                                   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## API Overview

The API is organized into 12 endpoint groups under `/api`:

| Group | Base Path | Purpose |
|-------|-----------|---------|
| **Auth** | `/api/auth` | User sync, profile retrieval |
| **Issues** | `/api/issues` | CRUD for issues, nearby query, duplicate check, media analysis |
| **Comments** | `/api/comments` | Public comments on issues |
| **Verification** | `/api/verification` | Community + AI verification |
| **Dashboard** | `/api/dashboard` | Authority city-wide dashboard |
| **Leaderboard** | `/api/leaderboard` | Gamification leaderboard |
| **Analytics** | `/api/analytics` | City analytics and insights |
| **Chat** | `/api/chat` | AI chatbot |
| **Notifications** | `/api/notifications` | User notification management |
| **Department** | `/api/department` | Department-specific operations |
| **Worker** | `/api/worker` | Field worker task management |
| **Admin** | `/api/admin` | Admin dashboard and rankings |

Each endpoint is protected by authentication middleware and role-based guards. See [API Flow Documentation](/docs/03_api_flow.md) for complete details.

---

## Security

### Authentication
- **Firebase Authentication** manages user identity and JWT token generation
- All API requests (except health check) require a `Bearer` token in the `Authorization` header
- Tokens are verified server-side using Firebase Admin SDK or Identity Toolkit REST API
- Demo mode provides automatic fallback authentication for development

### Authorization
- Role-based middleware (`requireRole`) enforces access control on every protected endpoint
- Six hierarchical roles with distinct permission sets
- Department-level data isolation (department users can only access their department's issues)
- Worker-level data isolation (workers can only access tasks assigned to them)

### Rate Limiting
- **Burst Rate Limit**: 600 requests per minute per IP across all `/api` routes
- **Per-Route Quotas**: Configurable window and daily limits per route group (e.g., auth: 120/hour)
- **AI Quotas**: Application-wide (200/day) and per-user (60/day) limits for Groq API calls
- **Maps Quotas**: Application-wide limits for Google Maps API (geocoding: 400/day, places: 200/day)

### Governance Layer
- **Request Context**: Every request is tagged with a unique ID, user identity, and IP for traceability
- **Caching**: In-memory timed cache reduces external API calls (Firestore analytics: 2min TTL, AI text: 5min TTL, Maps geocoding: 24h TTL)
- **Timeouts**: Configurable timeouts per service (AI: 30s, Maps: 10s, Firestore: 15s)
- **Quota Protection**: Dual-layer quota enforcement (application-wide + per-user) prevents abuse
- **Retry Logic**: Automatic one-retry on transient errors (500, 502, 503, 504, timeouts)
- **In-Flight Dedup**: Concurrent identical requests share a single in-flight promise

### Data Protection
- **Helmet** applies HTTP security headers
- **CORS** restricts API access to configured client origin
- **Input Validation**: Request body parsing with size limits (10mb JSON, file uploads via Multer)
- **Firestore Security Rules**: Document-level access control in production

---

## Deployment

### Current Deployment: Kolkata Municipal Corporation

The platform is deployed as a pilot for the **Kolkata Municipal Corporation (KMC)**, covering:

- **City**: Kolkata, West Bengal, India
- **Authority**: Kolkata Municipal Corporation (KMC)
- **Wards**: 30 wards across multiple boroughs
- **Departments**: Roads, Water Supply, Solid Waste Management, Street Lighting, Drainage, Parks & Gardens, Public Health
- **Localities**: 20 predefined localities with coordinates for optimized map experience

### Supporting Another City

Community Hero is designed for multi-city deployment from the ground up. To support a new city:

1. **Edit `shared/config/deployment.ts`** — Change the `deployment` object with the new city's name, departments, wards, localities, and department aliases. This is the **only** file that needs modification.
2. **Update `ward.md`** — Replace the KMC ward catalog with the new city's ward structure (boroughs and ward mappings).
3. **Configure Environment** — Set up Firebase project, Groq API key, and Google Maps API key for the new deployment.
4. **Deploy** — Build and deploy the server and client.

All business logic, AI agents, verification workflows, gamification, and analytics read from the centralized deployment configuration — **no code changes required**.

---

## Future Scope

- **Real-Time Notifications** — WebSocket/FCM push notifications for instant updates
- **ML Analytics** — Predictive models for issue forecasting and resource allocation
- **Predictive Maintenance** — ML-driven identification of infrastructure at risk of failure
- **IoT Sensor Integration** — Smart sensors for real-time environmental monitoring (air quality, water levels, structural integrity)
- **CCTV Integration** — Computer vision analysis of municipal camera feeds for automatic issue detection
- **Drone Inspection** — Automated aerial inspection of large infrastructure (roads, drainage, construction sites)
- **Citizen Reputation System** — Weighted voting based on historical verification accuracy
- **Mobile Application** — Native mobile apps (Android/iOS) with offline support
- **Offline Mode** — Complete offline functionality with sync when connectivity is restored
- **Real-Time Collaboration** — Live multi-user coordination for emergency response
- **AI-Based Resource Allocation** — Intelligent routing of workers and equipment based on priority, proximity, and skills
- **Emergency Response Integration** — Integration with municipal emergency services for crisis management
- **Multi-Language Support** — Regional language interfaces for broader accessibility
- **Payment Integration** — Digital payment for municipal services and fines

---

## Credits

Community Hero was built as a civic technology initiative to improve urban governance through technology. The platform leverages open-source libraries and cloud services:

- **Frontend**: Next.js, TypeScript, Tailwind CSS, shadcn/ui, Lucide Icons
- **Backend**: Node.js, Express, Helmet, Multer
- **AI**: Groq Cloud, Llama 3.3 70B, Llama 4 Scout 17B
- **Infrastructure**: Firebase (Auth, Firestore, Storage), Google Maps Platform
- **Design & Architecture**: Clean architecture with governance layer, AI agent system, and centralized deployment configuration

---

<div align="center">
  <strong>Community Hero</strong> — Bridging citizens and municipalities through technology.
  <br>
  <a href="https://github.com/Jarvis-the-og/Community-Hero---Hyperlocal-Problem-Solver">GitHub Repository</a>
</div>