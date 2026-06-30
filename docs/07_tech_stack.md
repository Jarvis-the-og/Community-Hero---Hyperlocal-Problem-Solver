# Tech Stack — Community Hero

## Overview

Community Hero uses a carefully chosen technology stack that balances developer productivity, production reliability, cost-effectiveness, and scalability. Every technology decision is driven by the requirements of a hyperlocal civic grievance platform deployed in emerging-market municipal environments.

---

## Frontend

### Next.js 15 (App Router)

**Why:** Next.js provides server-side rendering (SSR), static site generation (SSG), and client-side rendering (CSR) in a single framework. The App Router (introduced in Next.js 13+) provides file-based routing with nested layouts, loading states, and error boundaries built-in.

**How it integrates:** All pages in `client/app/` use the App Router pattern. The root `layout.tsx` wraps the entire application with authentication context, navigation, and global providers. Each route (admin, analytics, dashboard, issues, map, report, worker, etc.) is a standalone page that fetches data from the Express API.

### TypeScript

**Why:** Type safety prevents an entire class of runtime bugs, improves IDE experience with autocomplete and refactoring, and serves as living documentation for data structures.

**How it integrates:** Used throughout the client (`*.tsx` files) and shared package (`*.ts` files). The server uses plain JavaScript for flexibility with dynamic imports and ES module features.

### Tailwind CSS

**Why:** Utility-first CSS framework that enables rapid UI development without writing custom CSS. The small bundle size is achieved through purging unused styles at build time.

**How it integrates:** Configured via `postcss.config.mjs` and `tailwind.config.js`. All components use Tailwind utility classes directly in JSX. No custom CSS files exist in the project.

### shadcn/ui

**Why:** Provides accessible, unstyled UI primitives (button, card, badge, input, skeleton, dialog, etc.) that can be themed via Tailwind classes. Unlike component libraries, shadcn/ui components are copied into the project and fully customizable.

**How it integrates:** Components live in `client/components/ui/`. Each primitive is a single file with full TypeScript types, ARIA attributes, and Tailwind styling.

### Lucide React

**Why:** Lightweight, consistent, and tree-shakeable SVG icon library with a comprehensive set of icons.

**How it integrates:** Imported directly in components (e.g., `import { Map, Plus, Trophy } from 'lucide-react'`).

### React Context (AuthContext)

**Why:** Firebase Authentication state needs to be available across all components without prop drilling. React Context provides this without external dependencies.

**How it integrates:** `AuthContext.tsx` wraps the root layout, provides `user`, `loading`, `signIn`, `signOut`, and `idToken` values. All pages and hooks access auth state via `useContext(AuthContext)`.

### Custom Hooks

| Hook | Purpose |
|------|---------|
| `useIssues` | Fetch, create, update issues with loading/error states |
| `useNotifications` | Fetch and mark notifications as read |
| `useGeolocation` | Browser geolocation API wrapper |
| `useRoleGuard` | Redirect unauthorized users based on role |
| `useDeployment` | Access city-specific configuration |
| `useRealtimeIssues` | Poll for issue updates at configurable intervals |

---

## Backend

### Node.js (Express.js)

**Why:** Express is the most widely adopted Node.js web framework with a vast ecosystem of middleware. It provides the flexibility needed for a custom governance layer (quotas, caching, retry logic) that would be difficult to implement in more opinionated frameworks.

**How it integrates:** `server/app.js` creates the Express application, registers middleware in order (security → parsing → logging → governance → auth → routes → error handling), and starts the HTTP server.

### Helmet

**Why:** Sets HTTP security headers (Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, etc.) to protect against common web vulnerabilities.

**How it integrates:** Applied as the first middleware in the chain: `app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))`.

### CORS

**Why:** Restricts API access to only the configured frontend origin, preventing unauthorized cross-origin requests.

**How it integrates:** Configured with `CLIENT_URL` environment variable: `app.use(cors({ origin: config.clientUrl, credentials: true }))`.

### Morgan

**Why:** HTTP request logging middleware that provides structured or dev-formatted logs for debugging and monitoring.

**How it integrates:** Used in `'dev'` mode for development readability. In production, request logging is handled by the governance layer's `createRequestLogger()`.

### Multer

**Why:** Handles `multipart/form-data` for file uploads. The only Express middleware that handles file parsing.

**How it integrates:** Configured in `server/middleware/upload.js` with memory storage (files available as `req.file.buffer`). Used in issue creation and image upload endpoints.

---

## Database

### Firebase Firestore

**Why:** Firestore provides a serverless, scalable NoSQL document database with real-time synchronization, automatic multi-region replication, and strong consistency. For a civic platform with variable load patterns, serverless eliminates capacity planning.

**How it integrates:** Data access goes through the `issueService.js` layer which provides a consistent API regardless of which backend (Admin SDK, REST, or in-memory) is active.

### Firestore REST API (Fallback)

**Why:** When the Firebase Admin SDK is unavailable (development, CI/CD environments without service account credentials), the REST API provides an alternative without local emulators.

**How it integrates:** `server/services/firestore/restClient.js` implements CRUD operations using Firestore's REST API directly. All service functions check `isFirebaseAdminReady()` first, then fall back to this client.

### In-Memory Store (Demo Mode)

**Why:** Enables development and testing without any cloud dependencies. The in-memory store is seeded with realistic demo data so the full application can be demonstrated offline.

**How it integrates:** `server/utils/inMemoryStore.js` implements all data operations using JavaScript Maps. When `DEMO_MODE=true` or Firebase is not configured, all data operations use this store.

---

## Authentication

### Firebase Authentication

**Why:** Firebase Auth provides a complete identity platform with email/password, Google, and other OAuth providers. It handles token generation, refresh, and revocation — eliminating the need to build and secure a custom auth system.

**How it integrates:**
- **Client-side:** Firebase Auth SDK (`client/lib/firebase.ts`) handles sign-in, token retrieval, and token refresh via `onAuthStateChanged`
- **Server-side:** Firebase Admin SDK verifies ID tokens and extracts user identity

### Firebase Admin SDK

**Why:** The Admin SDK provides privileged access to Firebase services (Auth, Firestore, Storage) from the server environment. It can verify tokens without making additional HTTP calls.

**How it integrates:** Initialized in `server/services/firebase/index.js` with service account credentials. The `verifyIdToken()` function in `auth.js` decodes and validates JWTs.

### Identity Toolkit REST API

**Why:** When the Admin SDK is not available (e.g., development without service account file), this REST API provides token verification using just the Web API Key.

**How it integrates:** Fallback in `server/services/firebase/auth.js`: if Admin SDK is not initialized, tokens are verified by calling Google's `identitytoolkit.googleapis.com`.

### JWT Bearer Tokens

**Why:** Stateless authentication — the server verifies tokens without session storage. Bearer tokens are the industry standard for REST API authentication.

**How it integrates:** Client sends `Authorization: Bearer <token>` header. Server extracts and verifies in `authenticate()` middleware.

### Role-Based Access Control (Custom)

**Why:** Six distinct user roles (citizen, volunteer, department, worker, authority, admin) require granular access control that standard JWT claims cannot fully express (roles are stored in Firestore, not in the token).

**How it integrates:** `requireRole()` middleware (in `server/middleware/index.js`) fetches the user's Firestore profile, checks the `role` field against allowed roles, and returns 403 if unauthorized.

---

## Storage

### Firebase Cloud Storage

**Why:** Scalable, secure object storage integrated with Firebase Authentication for access control. No server-side file handling needed for uploads.

**How it integrates:** The server uses `admin.storage().bucket()` to upload files. Files are made publicly readable via `file.makePublic()`. URLs are stored in issue documents (`mediaUrls`, `beforeImages`, `afterImages`).

### Base64 Fallback

**Why:** When Cloud Storage is unavailable, files can be embedded as base64 data URLs. This ensures the application works in demo/development mode without cloud dependencies.

**How it integrates:** In `uploadMedia()`, if storage is not initialized, files are encoded as `data:{mimeType};base64,{data}` URLs.

---

## AI (Groq Cloud)

**Why:** Groq provides the fastest LLM inference in the industry (up to 1,000+ tokens/second) with a simple OpenAI-compatible API. For real-time civic applications, latency matters — Groq's LPU (Language Processing Unit) architecture delivers sub-second responses for most queries.

### Llama 3.3 70B (Text)

**Used by:**
- **PriorityAgent** — Contextual priority assessment with natural language reasoning
- **AI Summary** — Generating human-readable summaries of reported issues
- **Analytics Insights** — Generating actionable textual insights from city-wide data
- **Chatbot** — Conversational AI for citizen queries

**Why Llama 3.3 70B:** Balances quality (70B parameters) with speed (Groq's LPU). Outperforms larger models on reasoning tasks while maintaining low latency.

### Llama 4 Scout 17B (Vision)

**Used by:**
- **VisionAgent** — Analyzing uploaded photos to detect issue category, severity, hazards
- **VerificationAgent** — Comparing before/after photos to validate resolution quality

**Why Llama 4 Scout:** Native multimodal (text + image) understanding in a single model. Eliminates the need for separate object detection and classification pipelines.

### AI Integration Layer

The `server/services/ai/index.js` module provides:

| Function | Purpose |
|----------|---------|
| `generateText()` | Text-only completions with optional JSON mode |
| `generateFromImage()` | Single image + text prompt analysis |
| `generateFromImages()` | Multiple image comparison (before/after) |
| `parseJsonResponse()` | Extract JSON from model output |
| `getGroqClient()` | Singleton Groq SDK client |

All AI calls go through the **governance layer** (`withGovernedRequest()`) which provides:
- **Caching** — Identical prompts are cached (text: 5min, images: 24h)
- **Quotas** — App-wide (200/day) and per-user (60/day) limits
- **Timeouts** — 30-second timeout for all AI operations
- **Retry** — Automatic retry on transient errors

---

## Maps (Google Maps Platform)

**Why:** Google Maps provides the most comprehensive geocoding, places, and mapping APIs with global coverage and high accuracy.

### Geocoding API

**Used by:** `LocationAgent.analyzeLocation()`

Converts coordinates to human-readable addresses with ward-level detail. Cached for 24 hours with a 400/day app-wide quota.

### Places API (Nearby Search)

**Used by:** `LocationAgent.analyzeLocation()`

Finds nearby points of interest (hospitals, schools, landmarks) within 500m. This data feeds the priority calculation engine. Cached for 6 hours with a 200/day app-wide quota.

### JavaScript Maps API

**Used by:** `client/components/map/IssueMap.tsx`

Renders interactive maps with color-coded issue markers (critical=red, medium=yellow, low=green). Supports click-to-detail interactions.

---

## Governance Layer (Custom)

The governance layer is a **custom-built infrastructure** that wraps all external API calls. It is not a third-party library — it was purpose-built for Community Hero's specific requirements.

### Components

| Component | File | Purpose |
|-----------|------|---------|
| `TimedCache` | `services/governance/cache.js` | LRU cache with configurable TTL (max 1,000 entries) |
| `QuotaManager` | `services/governance/quotas.js` | Sliding window rate limiter + daily quota counter |
| `RequestLogger` | `services/governance/logger.js` | Structured JSON logging to file |
| `withGovernedRequest()` | `services/governance/index.js` | Orchestrator: cache → quota → execute → retry → log |
| `hashBuffer()` | `services/governance/index.js` | SHA-256 hashing for image cache keys |
| `stableStringify()` | `services/governance/cache.js` | Deterministic JSON serialization for cache keys |

### Why Build Custom?

- **No single library** provides all required features (caching + quotas + retry + timeout + dedup + logging)
- **Tight integration** with the application's architecture (request context propagation, user identity resolution)
- **No external dependencies** — works without npm packages that may have conflicting versions or security vulnerabilities
- **Complete control** over quota algorithms (app-wide + per-user dual enforcement)

---

## Libraries & Tools

### ESLint

**Why:** Enforces code quality and consistency standards. Catches potential bugs before they reach production.

**How it integrates:** Configured in `client/eslint.config.mjs` with Next.js and TypeScript-specific rules.

### PostCSS

**Why:** CSS transformation pipeline that enables Tailwind CSS and autoprefixer.

**How it integrates:** Configured in `client/postcss.config.mjs` with `tailwindcss` and `autoprefixer` plugins.

### Turbopack

**Why:** Incremental bundler for Next.js that provides fast refresh during development. Significantly faster than webpack for development builds.

**How it integrates:** Used automatically by Next.js 15 in development mode via `next.config.ts`.

### dotenv

**Why:** Loads environment variables from `.env` files without additional configuration.

**How it integrates:** `server/config/index.js` calls `dotenv.config()` at startup for both root and server-specific `.env` files.

---

## Technology Decision Summary

| Requirement | Choice | Key Reason |
|-------------|--------|------------|
| Frontend framework | Next.js 15 | SSR + file-based routing + ecosystem |
| UI styling | Tailwind CSS | Rapid development + small bundle |
| UI components | shadcn/ui | Accessible + customizable + lightweight |
| Backend framework | Express.js | Flexible middleware architecture |
| Database | Firestore | Serverless + scalable + Firebase integration |
| Authentication | Firebase Auth | Complete identity platform + JWT |
| AI inference | Groq Cloud | Fastest LLM latency + Llama models |
| Maps | Google Maps | Best geocoding accuracy + places data |
| File storage | Firebase Storage | Integrated with auth + scalable |
| Architecture pattern | Clean architecture | Separation of concerns + testability |
| Deployment | Single config file | Multi-city support without code changes |