# System Architecture — Community Hero

## Overview

Community Hero follows a **three-tier architecture** augmented with a **governance layer** that wraps all external service calls for caching, rate limiting, quota protection, timeouts, and retry logic.

```
┌────────────────────────────────────────────────────────────────────┐
│                     FRONTEND (Next.js 15)                          │
│                                                                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────────┐ │
│  │   App    │ │   Hooks  │ │  Context │ │     Components       │ │
│  │  Router  │ │          │ │  (Auth)  │ │                      │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────────┘ │
│                          │                                        │
│                   HTTP REST (fetch)                                │
└──────────────────────────┬─────────────────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────────────────┐
│                   API GATEWAY (Express.js)                         │
│                                                                    │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ Helmet  │ │  CORS   │ │ Morgan   │ │ Rate     │ │ Auth     │  │
│  │ (Sec.   │ │ (Origin │ │ (Logging)│ │ Limiting │ │ (JWT)    │  │
│  │ Headers)│ │  Check) │ │          │ │ 600/min  │ │          │  │
│  └─────────┘ └─────────┘ └──────────┘ └──────────┘ └──────────┘  │
└──────────────────────────┬─────────────────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────────────────┐
│                   GOVERNANCE LAYER (Middleware)                    │
│                                                                    │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐              │
│  │   Request    │ │   Timed      │ │    Quota     │              │
│  │   Context    │ │   Cache      │ │   Manager    │              │
│  │  (ID, User,  │ │  (SHA-256    │ │ (Window +    │              │
│  │   IP, Path)  │ │   hash key)  │ │  Daily)      │              │
│  └──────────────┘ └──────────────┘ └──────────────┘              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐              │
│  │   Request    │ │   Timeout    │ │   In-Flight  │              │
│  │   Logger     │ │   Handler    │ │    Dedup     │              │
│  │  (Structured)│ │ (AbortCtrl)  │ │              │              │
│  └──────────────┘ └──────────────┘ └──────────────┘              │
└──────────────────────────┬─────────────────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────────────────┐
│                    CONTROLLERS (Route Handlers)                    │
│                                                                    │
│  Auth       Issues     Comments   Verification   Dashboard         │
│  Analytics  Chat       Notif.     Department    Worker             │
│  Admin      Leaderboard                                           │
└──────────────────────────┬─────────────────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────────────────┐
│                     SERVICES (Business Logic)                      │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                   Issue Service                             │  │
│  │  getIssues · getIssueById · createIssue · updateIssue      │  │
│  │  addTimelineEvent · getNearbyIssues · supportIssue          │  │
│  │  getUser · upsertUser · addPoints · getLeaderboard         │  │
│  │  getAnalytics · uploadMedia                                │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌──────────┐ ┌──────────────┐ ┌──────────────────────────────┐  │
│  │Escalation│ │ Gamification │ │        Ward Catalog          │  │
│  │  Service │ │   Service    │ │  parseWardEntries ·          │  │
│  │SLA check │ │Badge awards  │ │  resolveWardContext          │  │
│  │15min cron│ │              │ │  buildWardAwareIssue         │  │
│  └──────────┘ └──────────────┘ └──────────────────────────────┘  │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                   AI AGENTS (6)                              │  │
│  │  VisionAgent · LocationAgent · DuplicateAgent               │  │
│  │  PriorityAgent · VerificationAgent · NotificationAgent       │  │
│  └─────────────────────────────────────────────────────────────┘  │
└───────┬───────────────────┬──────────────────────┬────────────────┘
        │                   │                      │
┌───────▼───────┐   ┌───────▼───────┐   ┌──────────▼──────────┐
│   Firestore   │   │   Firebase    │   │     Groq AI         │
│   (NoSQL DB)  │   │  Auth/Storage │   │  Llama 3.3 70B     │
│               │   │              │   │  Llama 4 Scout 17B  │
└───────────────┘   └───────────────┘   └─────────────────────┘
        │
┌───────▼───────┐
│   Google      │
│   Maps API    │
└───────────────┘
```

## Component Interactions

### 1. Frontend → Backend Communication

The Next.js frontend communicates with the Express backend exclusively via **HTTP REST**. There are no WebSockets or server-sent events. Real-time-like behavior is achieved through polling and the Firebase client SDK for auth.

```
Client (Browser)                    Server (Express)
      │                                   │
      │  POST /api/auth/sync              │
      │  Authorization: Bearer <JWT>      │
      │  { displayName, photoURL, role }  │
      │──────────────────────────────────►│
      │                                   │ authenticate(req, res, next)
      │                                   │   ├─ verifyIdToken(idToken)
      │                                   │   └─ resolve user from token
      │                                   │ upsertUser() → Firestore
      │◄──────────────────────────────────│
      │  { user: { id, email, role, ... } │
```

### 2. Issue Creation Flow (Full Trace)

This is the most complex interaction, involving multiple agents and services.

```
Citizen (Frontend)          API Gateway         Governance       Controllers         Services          AI Agents          External
      │                          │                  │                │                  │                  │                  │
      │  POST /api/issues        │                  │                │                  │                  │                  │
      │  + files (multipart)     │                  │                │                  │                  │                  │
      │─────────────────────────►│                  │                │                  │                  │                  │
      │                          │ authenticate()  │                │                  │                  │                  │
      │                          │ rateLimit()      │                │                  │                  │                  │
      │                          │─────────────────►│ createRequestContext()           │                  │                  │
      │                          │◄─────────────────│                │                  │                  │                  │
      │                          │ createNewIssue()                 │                  │                  │                  │
      │                          │────────────────────────────────►│                  │                  │                  │
      │                          │                                  │   uploadMedia()  │                  │                  │
      │                          │                                  │─────────────────►│────────► Firebase Storage          │
      │                          │                                  │◄─────────────────│◄─────── url      │                  │
      │                          │                                  │                  │                  │                  │
      │                          │                                  │ analyzeImage()   │                  │                  │
      │                          │                                  │────────────────────────────────────►│ VisionAgent      │
      │                          │                                  │                  │                  │────────► Groq    │
      │                          │                                  │◄────────────────────────────────────│ {category,       │
      │                          │                                  │                  │                  │  severity, ...}  │
      │                          │                                  │                  │                  │                  │
      │                          │                                  │ analyzeLocation()│                  │                  │
      │                          │                                  │────────────────────────────────────►│ LocationAgent    │
      │                          │                                  │                  │                  │────────► GMaps   │
      │                          │                                  │◄────────────────────────────────────│ {address, ward,  │
      │                          │                                  │                  │                  │  nearbyPlaces}   │
      │                          │                                  │                  │                  │                  │
      │                          │                                  │ findDuplicates() │                  │                  │
      │                          │                                  │────────────────────────────────────►│ DuplicateAgent   │
      │                          │                                  │◄────────────────────────────────────│ {isDuplicate,    │
      │                          │                                  │                  │                  │  matches}        │
      │                          │                                  │                  │                  │                  │
      │                          │                                  │ calculatePriority()                │                  │
      │                          │                                  │────────────────────────────────────►│ PriorityAgent    │
      │                          │                                  │                  │                  │────────► Groq    │
      │                          │                                  │◄────────────────────────────────────│ {priority,       │
      │                          │                                  │                  │                  │  score,reasoning}│
      │                          │                                  │                  │                  │                  │
      │                          │                                  │ generateText()   │                  │                  │
      │                          │                                  │ (AI Summary)     │──────────────────►│────────► Groq    │
      │                          │                                  │◄─────────────────│◄─────────────────│                  │
      │                          │                                  │                  │                  │                  │
      │                          │                                  │ createIssue()    │                  │                  │
      │                          │                                  │─────────────────►│────────► Firestore                  │
      │                          │                                  │◄─────────────────│◄─────── {id, ...}│                  │
      │                          │                                  │                  │                  │                  │
      │                          │                                  │ addPoints()      │                  │                  │
      │                          │                                  │─────────────────►│ (gamification)   │                  │
      │                          │                                  │◄─────────────────│                  │                  │
      │                          │                                  │ notifyIssueReported()              │                  │
      │                          │                                  │────────────────────────────────────►│ NotificationAgent│
      │                          │                                  │                  │                  │────────► Firestore│
      │  ◄────────────────────────│──────────────────────────────────│                  │                  │                  │
      │  { issue, priority }     │                  │                │                  │                  │                  │
```

### 3. Governance Layer — `withGovernedRequest()`

Every external API call flows through this function, which provides:

```
withGovernedRequest({
  api: 'ai',          ← API namespace for quotas/logging
  operation: 'text',  ← Operation name
  cacheKey,            ← SHA-256 hash of inputs
  cacheTtlMs: 300000, ← Cache TTL in ms
  timeoutMs: 30000,   ← Request timeout
  retryOnce: true,    ← Auto-retry on transient errors
  appDailyLimit: 200, ← App-wide daily quota
  userDailyLimit: 60, ← Per-user daily quota
  requestFn: async () => { ... }
})
```

**Execution path:**

1. **Cache Check** — If `cacheKey` is provided and cached value exists (not expired), return immediately
2. **In-Flight Dedup** — If a request with the same `lookupKey` is already in-flight, join that promise instead of starting a new request
3. **Quota Checks** — Check application-wide daily quota, then per-user daily quota
4. **Execute with Timeout** — Run `requestFn` with `AbortController` timeout
5. **Retry on Failure** — If transient error (5xx, timeout, DNS failure) and `retryOnce` is true, retry once
6. **Cache Result** — On success, store in cache if caching is configured
7. **Log** — Log outcome (success/failure, duration, user, operation)
8. **Return Result**

### 4. Data Layer — Three-Tier Fallback

The data layer supports three backends that are tried in order:

```
getIssues():            ← Any service function
  │
  ├─ Firebase Admin SDK (firebase-admin)
  │   ├─ Direct Firestore access via Admin SDK
  │   ├─ Full query support (where, orderBy, limit)
  │   └─ Fallback to unordered query if composite index missing
  │
  ├─ Firestore REST API (custom client)
  │   ├─ Used when Admin SDK credentials not available
  │   ├─ Limited query support (equality filters only)
  │   └─ Client-side sorting and filtering
  │
  └─ In-Memory Store (development/demo)
      ├─ JavaScript Map-based storage
      ├─ Seeded with demo data
      └─ Full CRUD operations
```

### 5. Agent Architecture

Six specialized AI agents, each with a single responsibility:

```
                    ┌─────────────────────┐
                    │   Groq Cloud API    │
                    │  Llama 3.3 70B     │ (text)
                    │  Llama 4 Scout 17B │ (vision)
                    └──────┬──────────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
    ┌─────────▼──────┐  ┌──▼────────┐  ┌▼─────────────┐
    │  VisionAgent   │  │Priority   │  │Verification  │
    │  analyzeImage  │  │Agent      │  │Agent         │
    │  (vision)      │  │calcPrior. │  │verifyCompl.  │
    └────────────────┘  │(text)     │  │(vision)      │
                        └───────────┘  └──────────────┘

    ┌──────────────┐   ┌──────────────┐   ┌───────────────┐
    │ Location     │   │ Duplicate    │   │ Notification  │
    │ Agent        │   │ Agent        │   │ Agent         │
    │ reverseGeo.  │   │ findDup.     │   │ notify*()     │
    │ (Google Maps)│   │ (algorithmic)│   │ (Firestore)   │
    └──────────────┘   └──────────────┘   └───────────────┘
```

### 6. Escalation System

```
                   Every 15 minutes (setInterval)
                              │
                    checkAndEscalateIssues()
                              │
                    Fetch all active issues
                              │
                    ┌─────────┴─────────┐
                    │                   │
              isOverSla(issue)     Skip (not over SLA)
                    │
              Update status → ESCALATED
              Increment escalationLevel
              Add to escalationHistory
              Add timeline event
              Notify department + authority
```

---

## Request Lifecycle (Complete)

```
HTTP Request
    │
    ▼
helmet() — Security headers (X-Frame-Options, CSP, etc.)
    │
    ▼
cors() — CORS check against configured CLIENT_URL
    │
    ▼
morgan() — HTTP request logging
    │
    ▼
express.json() — Parse JSON body (10mb limit)
    │
    ▼
express.urlencoded() — Parse URL-encoded data
    │
    ▼
createRequestContextMiddleware() — Assign requestId, capture IP/path
    │
    ▼
createRequestLogger() — Log response on finish
    │
    ▼
createBurstRateLimit() — 600 requests/minute global burst limit
    │
    ▼
Route matching (/api/issues, /api/auth, etc.)
    │
    ▼
[Per-route middleware]: Quota guards, file upload (multer)
    │
    ▼
authenticate() — Verify JWT via Firebase Admin SDK or REST fallback
    │
    ▼
requireRole() — Check user role against required roles
    │
    ▼
Controller function — Handle business logic
    │
    ▼
Service functions — Call business logic, agents, data layer
    │
    ▼
Response — JSON response to client
```

---

## Deployment Configuration Architecture

The platform is designed for multi-city deployment via a single configuration file:

```
shared/config/deployment.ts
         │
         ├─► client/constants/index.ts        (DEPARTMENTS, DEFAULT_LOCATION)
         ├─► client/hooks/useDeployment.ts    (useDeployment hook)
         ├─► client/components/map/IssueMap.tsx (mapCenter, defaultZoom)
         ├─► client/lib/utils.ts              (deployment utility functions)
         │
         ├─► server/services/wardCatalog.js   (ward resolution)
         └─► shared/constants/departments.js  (DEPARTMENTS, SLA_HOURS, aliases)
```

All business logic reads from this centralized config. Adding a new city requires modifying only `deployment.ts` and `ward.md`.

---

## Data Flow: Analytics

```
GET /api/analytics
    │
    ▼
withGovernedRequest() — Cached for 2 minutes
    │
    ▼
Fetch ALL issues from Firestore
Fetch ALL users (count)
    │
    ▼
Apply filters (department, status, priority, ward, borough)
    │
    ▼
Compute:
  ├─ totalIssues, resolvedIssues, activeIssues
  ├─ resolutionRate, avgRepairTimeHours
  ├─ categoryBreakdown, priority distribution
  ├─ issueTrends (7d), resolutionTrends (30d)
  ├─ departmentPerformance (rate, avg hours)
  ├─ wardMetrics (counts, critical, SLA, per-ward stats)
  ├─ peakReportingHours (24h histogram)
  ├─ citizenSatisfaction %
  └─ aiInsights (auto-generated text)
    │
    ▼
Cache result for 2 minutes
    │
    ▼
Return JSON response