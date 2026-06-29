# Community Hero — Full Feature & UI Workflow Reference

This document is a comprehensive record of every feature, page, component, interaction, and backend behaviour in the application as of the current build.

---

## Table of Contents

1. [Application Entry & Onboarding](#1-application-entry--onboarding)
2. [Navigation](#2-navigation)
3. [Home Page](#3-home-page)
4. [Report an Issue](#4-report-an-issue)
5. [Issue Detail Page](#5-issue-detail-page)
6. [My Issues](#6-my-issues)
7. [Map Page](#7-map-page)
8. [Leaderboard](#8-leaderboard)
9. [Analytics Page](#9-analytics-page)
10. [Authority Dashboard](#10-authority-dashboard)
11. [AI Chatbot](#11-ai-chatbot)
12. [Authentication](#12-authentication)
13. [Notification System](#13-notification-system)
14. [Gamification System](#14-gamification-system)
15. [Issue Lifecycle — Full State Machine](#15-issue-lifecycle--full-state-machine)
16. [AI Pipeline — Step by Step](#16-ai-pipeline--step-by-step)
17. [Location System](#17-location-system)
18. [Rate Limiting & Governance](#18-rate-limiting--governance)
19. [Role-Based Access Control](#19-role-based-access-control)
20. [Realtime Data](#20-realtime-data)
21. [Demo Mode](#21-demo-mode)
22. [Backend Route Map](#22-backend-route-map)

---

## 1. Application Entry & Onboarding

### First Visit
When a user opens the app for the first time (no `ch_user_locality` key in `localStorage`), a full-screen **Onboarding Modal** appears before any content loads.

**Modal UI:**
- Branded header with gradient icon and welcome message
- Two choices presented as tall buttons:
  1. **Use my live location** — triggers `navigator.geolocation.getCurrentPosition`, reverse geocodes the coordinates via Google Maps Geocoding API, stores `{ lat, lng, address }` as JSON in `localStorage` under key `ch_user_locality`
  2. **Enter my locality** — opens a text input with 600ms debounce forward geocoding; as the user types (e.g. "Park Street, Kolkata"), the Maps API resolves it to coordinates; a confirmation card shows the full formatted address; user clicks Confirm to save

**After onboarding:**
- Modal closes, home page renders normally
- All "Nearby Issues" queries use the stored locality at **2 km radius**
- A **"Change locality"** link appears in the home page section header to re-trigger the modal at any time

**Returning Visits:**
- Locality is loaded from `localStorage` instantly, modal is skipped entirely

---

## 2. Navigation

The sticky top navbar (`Navbar.tsx`) is visible on all pages.

**Left:** Logo ("Community Hero" with gradient text + shield icon), links to `/`

**Centre (desktop):** Navigation links with active state highlighting:
- Home (`/`)
- Map (`/map`)
- Report (`/report`)
- My Issues (`/issues`)
- Leaderboard (`/leaderboard`)
- Dashboard (`/dashboard`) — authority/admin only
- Analytics (`/analytics`) — authority/admin only

**Right:**
- If not signed in: "Sign In" button (triggers Google popup auth); shows "Signing in..." while in progress; disabled during the attempt to prevent double-clicks
- If signed in: display name + points on desktop, Logout icon button

**Mobile:** Hamburger menu expands a vertical list of the same nav links

---

## 3. Home Page

**Route:** `/`  
**Component:** `HomePage.tsx`

### Sections

**Hero Banner**
- Headline: "Your Community, Powered by AI"
- Two CTA buttons: "Report Issue" → `/report`, "View Map" → `/map`

**Stats Row**
- 4 stat cards: Total Issues, Resolved, Resolution Rate %, Active Users
- Data fetched from `GET /api/analytics` (requires auth token)
- Shows skeleton placeholders while loading

**Nearby Issues**
- Fetches `GET /api/issues/nearby?lat=...&lng=...&radius=2` using the **onboarding locality**
- Shows up to 5 `IssueCard` components
- Below the section title: locality name + "2 km radius" label
- "Change locality" link (clears `localStorage` → reopens onboarding modal)
- "View all on map" link → `/map`
- If no issues found: empty state card "No issues found within 2 km of your locality"

**Top Contributors**
- Right column, `Leaderboard` component showing top 5 users
- No auth required

---

## 4. Report an Issue

**Route:** `/report`  
**Component:** `ReportIssueForm.tsx`

### Auth Gate
If not signed in: shows a sign-in prompt with "Sign In with Google" button. Errors (including popup-closed) are silently swallowed.

### Layout
Two-column grid on desktop (media upload left, form fields right).

### Left Column

**Media Upload Card**
- Click anywhere on the card to open file picker (`accept="image/*,video/mp4"`)
- After selection: shows image preview
- While AI analyses: overlay with animated checklist:
  - Detecting objects → Identifying issue → Estimating severity → Finding hazards → Suggesting department → Calculating confidence
- Each step appears with a staggered animation (0.4s delay per step)

**Location Card**
Two-tab toggle: **Live GPS** / **Manual**

*Live GPS mode (default):*
- Auto-requests browser geolocation via `watchPosition`
- On location grant: reverse geocodes via Google Maps Geocoding API (client-side fetch), displays readable address
- Shows "Resolving address..." pulse while geocoding
- Editable: once address resolves, an **"Edit"** link appears inline
  - Clicking Edit shows an input pre-filled with the current address
  - User can correct discrepancies (e.g. GPS places you on wrong street)
  - Note shown: "GPS pin stays at your detected position. Only the address label is changed."
  - "Done" button confirms
- "Use my live location" button re-triggers geolocation

*Manual mode:*
- Single text input: `placeholder="e.g. Park Street, Kolkata"`
- 600ms debounce forward geocoding via Google Maps API
- Spinner inside input while geocoding
- Below input: full formatted address shown in primary color as non-intrusive extension (e.g. "Tower 6, Genexx Valley, D.H. Road, Kolkata 700104")
- User's typed text is **never replaced** — formatted address is stored separately for submission
- "Location not found" warning if geocoding returns no result

**Map Preview**
- Live GPS mode: shows map when location is available
- Manual mode: shows map as soon as coordinates resolve from geocoding
- Uses `IssueMap` at zoom 15, height 200px, no issue markers (user location pin only)

### Right Column

**AI Analysis Card** (appears after successful media analysis)
- "AI Analysis Complete" header with confidence percentage badge
- Grid: Inferred Category / Suggested Department
- Hazard badges (red, destructive style) if any identified

**Duplicate Warning Card** (appears if duplicates detected)
- Yellow warning card listing similar nearby reports
- Each match: title, similarity %, distance in meters
- "Support" button → calls `supportIssue` on the existing issue and redirects to its detail page

**Form Fields**
- Title (text input, pre-filled by AI)
- Description (textarea, pre-filled by AI)
- Category (select, pre-filled by AI) — dark-themed dropdown
- Severity (select, pre-filled by AI) — dark-themed dropdown

**Submit Button**
- Disabled while: submitting, no title, AI still analyzing, or (manual mode) no address entered
- Label shows "Resolving location..." if geocoding is still in progress
- On success: transitions to success screen

### Success Screen
- Party popper icon animation
- Issue title, priority badge, location address
- "View Issue" → `/issues/:id`
- "Report Another" → resets all form state

---

## 5. Issue Detail Page

**Route:** `/issues/:id`  
**Components:** `IssueDetailPage`, `IssueTimeline`, `IssueMap`

Data strategy: uses Firestore realtime listener (`useRealtimeIssue`) if Firebase is configured, falls back to REST API (`useIssue`).

### Top Section
- Priority badge, category badge, status badge (all colour-coded)
- Title (h1)
- Location address + relative time (e.g. "3 hours ago")

### Two-Column Grid

**Left: Issue Info + Actions**

*Description card:*
- Full issue description
- AI Summary (smaller text, separated by divider) if present

*Action buttons (role-aware):*

| User type | Buttons shown |
|-----------|---------------|
| Other users (not reporter) | Support (thumbs up + count), Confirm ✓, Reject ✗ (only when status is `reported` or `ai_categorized`) |
| Reporter (own issue) | Mark Resolved ✓, Cancel Report ✗ (hidden once completed/verified/rejected) |

**Right: Map**
- `IssueMap` centred on issue coordinates, zoom 16, no user location pin, shows the issue marker

### Timeline Section
7-step timeline: Reported → AI Categorized → Community Verified → Assigned → In Progress → Completed → AI Verified
- Completed steps show green checkmark, current step shows primary colour
- Each step shows label, optional description, and timestamp if available

### Comments Section
- Textarea + send button
- Comment list (max height 160px, scrollable)
- Shows author name and content
- "No comments yet" empty state
- Load errors are silently ignored (index may still be building)

### Verification History
- Community trust score percentage
- List of verifications with status and relative time
- Load errors are silently ignored

---

## 6. My Issues

**Route:** `/issues`  
**Page:** `MyIssuesPage`

- Fetches `GET /api/issues?reporterId=<uid>` with auth token
- Waits for auth to fully resolve before fetching (prevents "Authentication required" error on load)
- Firestore fallback: if composite index isn't ready yet, queries without `orderBy` and sorts in memory
- Shows `IssueCard` list (full size, not compact)
- Empty state: list icon + "You haven't reported any issues yet."
- Skeleton loading (3 cards)

---

## 7. Map Page

**Route:** `/map`

### Controls
- Category filter dropdown (top right) — filters visible markers and sidebar list

### Map (`IssueMap`)
- `APIProvider` from `@vis.gl/react-google-maps` wraps a `<Map>` component
- `gestureHandling="greedy"` — single-finger scroll/zoom on mobile
- Custom `mapId="community-hero-map"`
- **Marker colours:**
  - 🔴 Red — Critical priority
  - 🟠 Orange — Medium priority
  - 🟢 Green — Resolved / AI verified
  - 🔵 Blue — Needs verification
  - Blue dot — User's current position
- Clicking a marker opens an `InfoWindow` with: title, category label, priority badge
- Requires `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`; shows fallback list if key missing

### Sidebar
- Scrollable list of `IssueCard` (compact mode) filtered to match map
- Selected issue (clicked on map) highlighted with primary ring

### Map Legend
- Colour key for Critical / Medium / Resolved / Needs Verification

### Location Handling
- Uses `useGeolocation` hook (watchPosition)
- If location denied: shows prompt to enable with "Use my live location" button
- Issues fetched at 10 km radius from live location

---

## 8. Leaderboard

**Route:** `/leaderboard`

- Fetches `GET /api/leaderboard?limit=10` (no auth required)
- Each row: rank icon (🏆🥈🥉 for top 3, # number for rest), avatar initial, display name, badges, points
- Top 3 get special rank colours (gold, silver, bronze)
- Skeleton loading (5 rows)
- Empty state with trophy icon

---

## 9. Analytics Page

**Route:** `/analytics`  
**Auth:** Required (redirects to null if no token)

### Metrics Row
- Total Issues, Resolution Rate %, Average Repair Time (hours), Active Users

### Charts
**Issues by Category** — horizontal bar chart with gradient fill, percentage of max

**Priority Distribution** — vertical list with coloured dots (red/orange/green) and counts; Most Common Issue label below

**Issue Trends (7 days)** — bar chart: one bar per day for last 7 days, height proportional to issue count, date label below each bar

**Top Contributors** — rank number, display name, trust score, points

---

## 10. Authority Dashboard

**Route:** `/dashboard`  
**Auth:** Required  
**Role:** authority or admin (role check done client-side via user.role)

### Stats Row
Total Active, Critical, In Progress, Pending Verification

### Issue Sections (3)
Issues grouped by priority: Critical / Medium / Low

Each **AuthorityIssueCard** shows:
- Priority + category badges
- Title (links to issue detail)
- AI summary (truncated 2 lines)
- Location street, verification %, support count

**Context-aware action buttons:**

| Issue status | Button shown |
|--------------|-------------|
| `community_verified` | Assign |
| `assigned` | Start Work |
| `in_progress` | Mark Resolved + After Photo upload |
| `completed` | AI Verify (triggers before/after comparison) |
| Any | View Details |

After each action, dashboard data is re-fetched automatically.

---

## 11. AI Chatbot

**Component:** `ChatBot.tsx`  
**Trigger:** Floating button (bottom-right, always visible)

### UI
- 380px wide × 480px tall card, bottom-right fixed
- Header: "Community Hero AI — Powered by Groq" with bot icon
- Message list (scrollable, auto-scrolls to latest)
- User messages: right-aligned, primary colour background
- Assistant messages: left-aligned, semi-transparent
- "Thinking..." spinner with Loader2 animation while waiting

### Behaviour
- Opening message pre-loaded: "Hi! I'm your Community Hero assistant..."
- User types message, presses Enter or clicks Send
- Request: `POST /api/chat` with `{ message, lat?, lng?, issueId? }`
- Location context (`lat`/`lng`) is included if user has granted geolocation
- Server builds dynamic context:
  - If `issueId` provided: fetches that issue's title and status
  - If `lat`/`lng` provided: fetches up to 5 nearby issues within 2 km
  - If authenticated: fetches user's own reported issues
- AI generates a contextual reply using the full CHAT_PROMPT system prompt
- Fallback message shown if API call fails

### Rate Limiting
- 60 requests/day per user or IP on `/api/chat`

---

## 12. Authentication

**Provider:** Firebase Google Auth  
**Component:** `AuthContext.tsx`

### Sign-In Flow
1. User clicks "Sign In" in navbar or on report/my-issues gated pages
2. `signInWithPopup` opens Google OAuth popup
3. On success: Firebase returns user + ID token
4. `syncProfile` calls `GET /auth/profile` with the token; if 404, calls `POST /auth/sync` to create the profile
5. User object stored in context, token stored for API calls
6. `auth/popup-closed-by-user` and `auth/cancelled-popup-request` errors are silently swallowed

### Token Refresh
Firebase automatically refreshes ID tokens. `onAuthStateChanged` fires on each refresh — debounced 300ms before calling the backend to prevent rapid duplicate requests.

### Sign-Out
Calls `firebaseSignOut`, clears user and token from context.

---

## 13. Notification System

Notifications are stored in Firestore's `notifications` collection.

**Triggered automatically by:**
| Event | Recipients |
|-------|-----------|
| Issue reported | Authority (generic) |
| Issue community-verified (≥60% score) | Reporter |
| Issue assigned to worker | Reporter + Worker |
| Work started (in_progress) | Reporter |
| Issue resolved (completed) | Reporter |
| Badge earned | User |

**Fetched via:** `GET /api/notifications` (requires auth)  
**Mark read:** `PATCH /api/notifications/:id/read`

---

## 14. Gamification System

### Points
| Action | Points |
|--------|--------|
| Report an issue | +10 |
| Verify an issue | +15 |
| Support an issue | +5 |
| Helpful comment | +3 |
| Issue resolution | +20 |

Points are stored on the user document and update via `addPoints()` in `issueService.js`.

**Trust Score:** `min(100, trustScore + floor(points / 5))` — increases with activity, reflects credibility.

### Badges
| Badge | Key |
|-------|-----|
| Community Hero | `community_hero` |
| Top Volunteer | `top_volunteer` |
| Problem Solver | `problem_solver` |
| Early Reporter | `early_reporter` |
| Verification Champion | `verification_champion` |

Badges are stored as a string array on the user document.

---

## 15. Issue Lifecycle — Full State Machine

```
[Citizen uploads photo]
        ↓
   POST /issues/analyze
   → VisionAgent analyses image
   → LocationAgent reverse geocodes GPS
        ↓
   Form pre-filled with AI data
        ↓
   DuplicateAgent checks nearby issues
   → If duplicate found: show warning, offer "Support" button
        ↓
   POST /issues (create)
   → PriorityAgent scores priority
   → generateText() creates AI summary
   → Timeline: [reported, ai_categorized]
   → NotificationAgent notifies authority
        ↓
Status: ai_categorized
        ↓
[Other citizens visit issue detail page]
   → POST /verification/:id (confirmed/rejected)
   → verificationScore = confirmed/total × 100
   → If score ≥ 60%: status → community_verified
   → Timeline: [community_verified]
   → NotificationAgent notifies reporter
        ↓
Status: community_verified
        ↓
[Authority clicks Assign in dashboard]
   → PATCH /issues/:id/status { status: assigned }
   → Timeline: [assigned]
   → NotificationAgent notifies reporter + worker
        ↓
Status: assigned
        ↓
[Authority clicks Start Work]
   → PATCH /issues/:id/status { status: in_progress }
   → Timeline: [in_progress]
   → NotificationAgent notifies reporter
        ↓
Status: in_progress
        ↓
[Authority uploads after photo + clicks Mark Resolved]
   → POST /issues/:id/resolution-images (after photo)
   → PATCH /issues/:id/status { status: completed }
   → Timeline: [completed]
   → NotificationAgent notifies reporter
        ↓
Status: completed
        ↓
[Authority clicks AI Verify]
   → POST /verification/:id/verify-resolution
   → VerificationAgent fetches before/after images
   → LLaMA 4 Scout compares images
   → If resolved: status → ai_verified
   → If unresolved: status stays completed
   → Timeline: [ai_verified] with AI analysis text
        ↓
Status: ai_verified  ✓ (terminal)

Alternative exits:
  - Reporter clicks "Cancel Report" → status: rejected
  - Community rejects (low verification score, no auto-promote) → stays ai_categorized
```

---

## 16. AI Pipeline — Step by Step

### Image Analysis (`POST /issues/analyze`)
1. `multer` receives file, stores in memory buffer
2. Quota guard: 40 requests/day per user/IP
3. `VisionAgent.analyzeImage(buffer, mimeType)`:
   - Converts buffer → base64
   - Calls `generateFromImage(VISION_PROMPT, base64, mimeType)`
   - `generateFromImage` → Groq `meta-llama/llama-4-scout-17b-16e-instruct` with multimodal content
   - Response cached 24h (keyed by SHA-256 hash of image + prompt)
   - Parses JSON response: `{ category, title, description, severity, department, hazards[], confidence }`
4. If `lat`/`lng` provided: `LocationAgent.analyzeLocation(lat, lng)`
   - Calls Google Maps Geocoding API (cached 24h)
   - Calls Google Maps Places API (cached 6h)
   - Returns `{ address, ward, road, landmark, nearbyPlaces[] }`
5. Returns `{ analysis, location }` to client

### Issue Creation (`POST /issues`)
1. Auth middleware verifies Firebase token
2. Parses form data + files
3. LocationAgent enriches location
4. DuplicateAgent checks for nearby duplicates → returns 409 if found
5. PriorityAgent calculates priority:
   - Formula: severity weight + category weight + support count + age factor + hospital/school proximity
   - AI refines with reasoning (Groq text model)
6. `generateText(SUMMARY_PROMPT + issue details)` → short authority-facing AI summary
7. Issue created in Firestore with full timeline
8. `addPoints(reporterId, 10)` → awards report points
9. `NotificationAgent.notifyIssueReported(issue)` → creates authority notification

### Chat (`POST /api/chat`)
1. Optional auth (works signed out with limited context)
2. Quota: 60/day per user/IP
3. Context building:
   - `issueId` → fetch specific issue title/status
   - `lat`/`lng` → fetch up to 5 nearby issues within 2 km
   - Authenticated → fetch user's own reports
4. Constructs prompt: `CHAT_PROMPT + context + "User: {message}\nAssistant:"`
5. Groq `llama-3.3-70b-versatile` generates reply (text cached 5 min)
6. If Groq fails: fallback message with platform navigation tips

---

## 17. Location System

### Client-Side

**`useGeolocation` hook:**
- Uses `navigator.geolocation.watchPosition` for continuous updates
- High accuracy mode, 10s timeout, 5s max cache age
- `refresh()` method triggers `getCurrentPosition` for immediate update
- Provides: `{ lat, lng, hasLocation, loading, error, refresh }`

**Reverse geocoding (client):**
- `reverseGeocodeClient(lat, lng)` — direct fetch to Google Maps Geocoding API from the browser
- Called in ReportIssueForm and OnboardingModal immediately when coordinates are available
- Falls back to `"lat, lng"` string if API key missing

**Forward geocoding (client):**
- `forwardGeocodeClient(address)` — converts typed address to `{ lat, lng, formatted }`
- Used in manual address mode (ReportIssueForm) and OnboardingModal
- 600ms debounce to avoid excessive API calls while typing
- User's input is preserved; only the resolved coordinates and formatted address are stored separately

**Onboarding locality (`ch_user_locality`):**
- Stored in `localStorage` as JSON: `{ lat, lng, address }`
- Used for 2 km radius nearby issues on home page
- Can be cleared + reset at any time via "Change locality" link

### Server-Side (LocationAgent)
- `analyzeLocation(lat, lng)`:
  1. Normalise coordinates to 5 decimal places for cache key
  2. Reverse geocode → extract `address`, `ward` (sublocality), `road` (route)
  3. Places nearby search (radius 500m) → extract `landmark`, `nearbyPlaces[]`
- Results used in issue creation to enrich location metadata
- Both APIs gated by `ENABLE_MAPS` flag; returns raw coords if disabled

---

## 18. Rate Limiting & Governance

All external calls and HTTP routes go through `server/services/governance/`:

### HTTP Burst Limiter
- **Limit:** 600 requests / minute per IP
- Applied to all `/api/*` routes

### Auth Route Quota
- 120 requests / hour per IP on `/api/auth/*`

### AI Quotas (per `withGovernedRequest`)
| API | App daily limit | User daily limit | Cache TTL | Timeout |
|-----|----------------|-----------------|-----------|---------|
| Groq text | 200 | 60 | 5 min | 30s |
| Groq image | 200 | 60 | 24h | 30s |
| Geocoding | 400 | — | 24h | 10s |
| Places | 200 | — | 6h | 10s |

### Route-Level Quotas
| Route | Limit |
|-------|-------|
| `POST /api/issues/analyze` | 40/day per user/IP |
| `POST /api/chat` | 60/day per user/IP |

### In-Flight Deduplication
The `inFlight` map in governance prevents parallel identical requests — if the same cache key is being fetched, all concurrent callers wait for the same Promise.

---

## 19. Role-Based Access Control

### Backend
All routes require `authenticate` middleware (Firebase token verification). The `optionalAuthenticate` middleware is used only for `/api/chat`.

### Frontend — Issue Detail Page
| User | Support button | Confirm/Reject buttons | Mark Resolved / Cancel |
|------|---------------|----------------------|------------------------|
| Stranger (not reporter) | ✅ | ✅ (if status is reported/ai_categorized) | ❌ |
| Reporter (own issue) | ❌ | ❌ | ✅ (if not already terminal status) |

### Frontend — Dashboard & Analytics
Only rendered for users with `role === 'authority' || role === 'admin'`. Nav items are conditionally shown via `AUTHORITY_NAV` constant.

---

## 20. Realtime Data

### Firestore Realtime Listeners
Used on the issue detail page (`useRealtimeIssue`) and optionally on issue lists (`useRealtimeIssues`).

`useRealtimeIssue(id)`:
- Subscribes to `doc(db, 'issues', id)` via `onSnapshot`
- Automatically updates the UI when issue status, comments, or verification score changes

`useRealtimeIssues(filters?)`:
- Subscribes to `collection('issues')` with optional `reporterId` filter
- Used for live-updating issue lists

Both hooks clean up subscriptions on unmount.

---

## 21. Demo Mode

Activated when `DEMO_MODE=true` or Firebase is not configured.

- `inMemoryStore` is seeded with sample issues, users, comments, verifications
- All CRUD operations work against in-memory arrays
- Firebase Auth unavailable — sign-in button shows error
- All AI features still work (Groq API key still required)
- Data resets on server restart

---

## 22. Backend Route Map

```
GET  /api/health                              → health check

GET  /api/auth/profile                        → get user profile
POST /api/auth/sync                           → create/update user

GET  /api/issues                              → list (filter: status, category, priority, reporterId)
GET  /api/issues/nearby                       → issues within radius (lat, lng, radius)
GET  /api/issues/:id                          → single issue
POST /api/issues/analyze                      → AI vision analysis (media upload)
POST /api/issues/check-duplicates             → duplicate check
POST /api/issues                              → create issue (full AI pipeline)
POST /api/issues/:id/support                  → upvote
PATCH /api/issues/:id/status                  → update status
POST /api/issues/:id/resolution-images        → upload before/after photos

GET  /api/verification/:issueId               → get verifications
POST /api/verification/:issueId               → submit verification + evidence
POST /api/verification/:issueId/verify-resolution  → AI before/after comparison

GET  /api/comments/:issueId                   → get comments
POST /api/comments/:issueId                   → add comment

GET  /api/dashboard                           → authority dashboard (issues grouped by priority)
GET  /api/dashboard/:id                       → issue + comments + verifications

GET  /api/leaderboard                         → top users by points
GET  /api/analytics                           → full analytics (cached 2 min)

POST /api/chat                                → AI chatbot (optional auth)

GET  /api/notifications                       → user notifications
PATCH /api/notifications/:id/read             → mark as read
```
