# Folder Structure — Community Hero

## Overview

The repository follows a **monorepo-style structure** with three main packages: `client` (Next.js frontend), `server` (Express.js API), and `shared` (common code). Root-level files provide configuration, documentation, and data files.

```
community-hero/
│
├── client/                     # Next.js 15 Frontend Application
├── server/                     # Express.js REST API
├── shared/                     # Shared between client and server
├── docs/                       # Documentation
├── scratch/                    # Development scratch files
├── logs/                       # Application logs
│
├── .env                        # Environment variables (gitignored)
├── .env.example                # Environment variable template
├── .gitignore                  # Git ignore rules
├── .vscode/                    # VS Code settings
│
├── package.json                # Root package.json (workspace config)
├── package-lock.json           # Lock file
│
├── firestore.rules             # Firestore security rules
├── storage.rules               # Cloud Storage security rules
│
├── ward.md                     # KMC ward catalog (parsed at runtime)
├── serviceAccountKey.json      # Firebase service account (gitignored)
│
├── README.md                   # Project README
├── API.MD                      # Legacy API documentation
├── UPDATE.MD                   # Update notes
├── implementation_plan.md      # Original implementation plan
│
└── ward.md                     # Ward catalog source data
```

---

## `client/` — Frontend Application

```
client/
├── app/                        # Next.js App Router Pages
│   ├── layout.tsx              # Root layout (providers, nav, auth)
│   ├── page.tsx                # Landing/home page
│   │
│   ├── admin/                  # Municipal Administrator Dashboard
│   │   └── page.tsx
│   ├── analytics/              # City Analytics & Insights
│   │   └── page.tsx
│   ├── auth/                   # Authentication Page
│   │   └── page.tsx
│   ├── dashboard/              # Authority Dashboard
│   │   └── page.tsx
│   ├── department/             # Department Views
│   │   ├── page.tsx            # Department list/dashboard
│   │   └── [id]/               # Dynamic issue detail
│   │       └── page.tsx
│   ├── issues/                 # Issue Views
│   │   ├── page.tsx            # Issue list
│   │   └── [id]/               # Dynamic issue detail
│   │       └── page.tsx
│   ├── leaderboard/            # Gamification Leaderboard
│   │   └── page.tsx
│   ├── map/                    # Interactive Issue Map
│   │   └── page.tsx
│   ├── report/                 # Issue Reporting Form
│   │   └── page.tsx
│   ├── unauthorized/           # Access Denied Page
│   │   └── page.tsx
│   └── worker/                 # Field Worker Views
│       ├── page.tsx            # Worker task list
│       └── tasks/
│           └── [id]/           # Dynamic task detail
│               └── page.tsx
│
├── components/                 # Reusable React Components
│   ├── chatbot/                # AI Chatbot Component
│   │   └── ChatBot.tsx
│   ├── dashboard/              # Authority Dashboard Components
│   │   ├── AuthorityIssueCard.tsx
│   │   └── StatCard.tsx
│   ├── home/                   # Home/Landing Page Component
│   │   └── HomePage.tsx
│   ├── issue/                  # Issue-Related Components
│   │   ├── IssueCard.tsx       # Issue summary card
│   │   ├── IssueTimeline.tsx   # Status timeline visualization
│   │   └── ReportIssueForm.tsx # Issue reporting form
│   ├── leaderboard/            # Leaderboard Component
│   │   └── Leaderboard.tsx
│   ├── map/                    # Google Maps Integration
│   │   └── IssueMap.tsx
│   ├── navbar/                 # Navigation Bar
│   │   └── Navbar.tsx
│   ├── notifications/          # Notification Bell
│   │   └── NotificationBell.tsx
│   ├── onboarding/             # User Onboarding Modal
│   │   └── OnboardingModal.tsx
│   └── ui/                     # shadcn/ui Primitives
│       ├── badge.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── empty-state.tsx
│       ├── input.tsx
│       └── skeleton.tsx
│
├── constants/                  # Application Constants
│   └── index.ts                # Labels, nav items, categories
│
├── context/                    # React Context Providers
│   └── AuthContext.tsx          # Authentication state context
│
├── hooks/                      # Custom React Hooks
│   ├── useDeployment.ts        # Access deployment config
│   ├── useGeolocation.ts       # Browser geolocation
│   ├── useIssues.ts            # Issue CRUD operations
│   ├── useNotifications.ts     # Notification management
│   ├── useRealtimeIssues.ts    # Real-time issue polling
│   └── useRoleGuard.ts         # Role-based route protection
│
├── lib/                        # Client Libraries
│   ├── api.ts                  # HTTP client with auth interceptor
│   ├── firebase.ts             # Firebase client SDK initialization
│   ├── storage.ts              # File upload utilities
│   └── utils.ts                # Shared utility functions
│
├── public/                     # Static Assets
│   ├── file.svg, globe.svg, next.svg, vercel.svg, window.svg
│
├── .env.local                  # Client environment variables
├── .gitignore
├── AGENTS.md                   # AI agents documentation
├── CLAUDE.md                   # Development notes
├── eslint.config.mjs           # ESLint configuration
├── next.config.ts              # Next.js configuration
├── package.json
├── postcss.config.mjs          # PostCSS configuration
└── tsconfig.json               # TypeScript configuration
```

**Why Each Folder Exists:**

| Folder | Purpose |
|--------|---------|
| `app/` | Next.js App Router — file-based routing with server components and client components |
| `components/` | Reusable UI components organized by domain (issue, map, dashboard, etc.) |
| `constants/` | Centralized constants imported by multiple components (avoids magic strings) |
| `context/` | React context providers for shared state (authentication) |
| `hooks/` | Custom React hooks encapsulating reusable stateful logic |
| `lib/` | Pure utility libraries with no React dependency |
| `ui/` (in components) | Generic UI primitives from shadcn/ui, not specific to any domain |

---

## `server/` — Backend API

```
server/
├── app.js                      # Express application entry point
├── package.json
│
├── config/                     # Server Configuration
│   └── index.js                # Environment variable loading & validation
│
├── controllers/                # Route Handlers (Business Logic Entry)
│   ├── adminController.js      # Admin dashboard & rankings
│   ├── analyticsController.js  # City analytics
│   ├── chatController.js       # AI chatbot
│   ├── commentController.js    # Public comments on issues
│   ├── dashboardController.js  # Authority dashboard
│   ├── departmentController.js # Department-specific operations
│   ├── issueController.js      # Issue CRUD, analysis, duplicates
│   ├── leaderboardController.js# Gamification leaderboard
│   ├── notificationController.js# User notifications
│   ├── verificationController.js# Community & AI verification
│   └── workerController.js     # Field worker task management
│
├── middleware/                  # Express Middleware
│   ├── index.js                # Auth (authenticate, requireRole), error handler
│   ├── governance.js           # Request context, logging, burst rate limiting, quotas
│   └── upload.js               # Multer file upload configuration
│
├── routes/                     # Express Route Definitions
│   ├── authRoutes.js           # POST /sync, GET /profile
│   ├── issueRoutes.js          # CRUD + analyze + duplicates
│   ├── commentRoutes.js        # Issue comments
│   ├── verificationRoutes.js   # Community + AI verification
│   ├── dashboardRoutes.js      # Authority dashboard
│   ├── leaderboardRoutes.js    # Leaderboard
│   ├── analyticsRoutes.js      # Analytics
│   ├── chatRoutes.js           # Chatbot
│   ├── notificationRoutes.js   # Notifications
│   ├── departmentRoutes.js     # Department operations
│   ├── workerRoutes.js         # Worker tasks
│   └── adminRoutes.js          # Admin operations
│
├── scripts/                    # Utility Scripts
│   └── seedProductionDemoData.js # Demo data seeding
│
├── services/                   # Business Logic Layer
│   │
│   ├── agents/                 # AI Agents (6 specialized agents)
│   │   ├── index.js            # Re-exports all agents
│   │   ├── VisionAgent.js      # Image analysis (Groq Llama 4 Scout)
│   │   ├── LocationAgent.js    # Reverse geocoding + places (Google Maps)
│   │   ├── DuplicateAgent.js   # Duplicate detection (algorithmic)
│   │   ├── PriorityAgent.js    # Urgency calculation (Groq Llama 3.3 + heuristic)
│   │   ├── VerificationAgent.js# Before/after comparison (Groq Llama 4 Scout)
│   │   └── NotificationAgent.js# In-app notification routing
│   │
│   ├── ai/                     # AI Integration
│   │   ├── index.js            # Groq client, generateText, generateFromImage, parseJsonResponse
│   │   └── prompts/
│   │       └── index.js        # AI prompt templates (VISION, PRIORITY, VERIFICATION, SUMMARY)
│   │
│   ├── firebase/               # Firebase Integration
│   │   ├── index.js            # Firebase Admin SDK initialization (db, auth, storage)
│   │   └── auth.js             # JWT token verification (Admin SDK + REST fallback)
│   │
│   ├── firestore/              # Firestore REST Client
│   │   └── restClient.js       # REST-based Firestore CRUD operations
│   │
│   ├── governance/             # Governance Layer
│   │   ├── index.js            # withGovernedRequest() — cache, quotas, timeout, retry
│   │   ├── cache.js            # TimedCache with SHA-256 key hashing
│   │   ├── logger.js           # Structured request logging
│   │   └── quotas.js           # Sliding window + daily quota enforcement
│   │
│   ├── escalationService.js    # SLA-based auto-escalation (15-min cron)
│   ├── gamificationService.js  # Points, badges, trust scores
│   ├── issueService.js         # Core data access layer (all collections)
│   ├── wardCatalog.js          # Ward catalog parser & resolver (from ward.md)
│   └── wardCatalog.test.js     # Tests for ward catalog
│
└── utils/                      # Server Utilities
    ├── inMemoryStore.js        # In-memory data store for demo mode
    └── requestContext.js       # Async context propagation (requestId, user, IP)
```

**Why Each Folder Exists:**

| Folder | Purpose |
|--------|---------|
| `config/` | Centralizes all configuration loading; validates required env vars at startup |
| `controllers/` | Thin layer — validates input, calls services, formats response. No business logic |
| `middleware/` | Request pipeline — auth, governance, error handling. Cross-cutting concerns |
| `routes/` | Defines HTTP method + path + middleware chain for each endpoint |
| `scripts/` | One-off utility scripts (seeding, migration, maintenance) |
| `services/` | All business logic. Controllers delegate here. Services call agents and data layer |
| `services/agents/` | One file per AI agent — each encapsulates a single capability |
| `services/ai/` | Groq API client — the only file that directly depends on the Groq library |
| `services/firebase/` | Firebase initialization — the only files that import `firebase-admin` |
| `services/firestore/` | REST fallback — used when Admin SDK is unavailable |
| `services/governance/` | Custom infrastructure — caching, rate limiting, quotas, logging |
| `utils/` | Non-business utilities: in-memory store, async context |

---

## `shared/` — Shared Code

```
shared/
├── package.json                # Package definition (name: @community-hero/shared)
│
├── config/                     # Centralized Deployment Configuration
│   └── deployment.ts           # Single-source-of-truth for city-specific config
│
├── constants/                  # Business Constants
│   └── departments.js          # DEPARTMENTS, DEPARTMENT_ALIASES, SLA_HOURS
│
├── enums/                      # Shared Enums
│   └── index.js                # UserRole, IssueStatus, IssueCategory, Severity, Priority,
│                               # VerificationStatus, ResolutionStatus, BadgeType,
│                               # NotificationType, PointAction, Labels
│
└── types/                      # TypeScript Type Definitions
    └── index.js                # Shared type interfaces
```

**Why Each Folder Exists:**

| Folder | Purpose |
|--------|---------|
| `config/` | Single file that defines an entire city deployment. Change this to support a new city |
| `constants/` | Business rules (departments, SLA hours) consumed by both client and server |
| `enums/` | Enum definitions shared across frontend and backend — ensures consistency |
| `types/` | TypeScript types for shared data structures |

---

## `docs/` — Documentation

```
docs/
├── 01_system_architecture.md       # Complete architecture with diagrams
├── 02_firestore_schema.md          # Database schema documentation
├── 03_api_flow.md                  # API endpoints, request/response, flows
├── 04_authentication_flow.md       # Auth, JWT, role-based access
├── 05_complaint_lifecycle.md       # Full complaint lifecycle from report to closure
├── 06_folder_structure.md          # This file — folder explanations
├── 07_tech_stack.md                # Technology choices and rationale
└── 08_future_scope.md              # Planned enhancements and roadmap
```

---

## `scratch/` — Development Scratch Files

```
scratch/
├── validateWardSeeding.mjs        # Script to validate ward data
└── wards.json                     # Ward data (development)
```

Temporary files used during development for testing and validation. Not part of the production application.

---

## `logs/` — Application Logs

```
logs/
├── requests.jsonl                 # Structured request logs (JSON Lines)
├── server.out.log                 # Server stdout
├── server.err.log                 # Server stderr
├── client.out.log                 # Client stdout
└── client.err.log                 # Client stderr
```

Runtime logs for debugging and monitoring. The governance layer writes structured request events to `requests.jsonl`.

---

## Root Files

| File | Purpose |
|------|---------|
| `.env` | Environment variables (gitignored — each deployment has its own) |
| `.env.example` | Template for environment variables |
| `package.json` | Root package.json (npm workspaces configuration) |
| `firestore.rules` | Firestore security rules for production |
| `storage.rules` | Cloud Storage security rules |
| `ward.md` | Ward catalog source data — parsed at runtime by `wardCatalog.js` |
| `serviceAccountKey.json` | Firebase service account key (gitignored) |
| `README.md` | Project documentation |
| `API.MD` | Legacy API documentation (replaced by `docs/03_api_flow.md`) |
| `UPDATE.MD` | Release notes |
| `implementation_plan.md` | Original development plan |