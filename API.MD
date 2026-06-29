# API Reference — Community Hero

This document covers all external API integrations in the project: **Gemini AI** and **Google Maps Platform**. It includes parent platform details, configuration, SDK usage, backend route mapping, and frontend integration.

---

## Table of Contents

1. [Gemini API](#1-gemini-api)
2. [Google Maps API](#2-google-maps-api)
3. [Environment Variables](#3-environment-variables)
4. [Feature Flags](#4-feature-flags)
5. [Rate Limiting & Governance](#5-rate-limiting--governance)
6. [Route Summary](#6-route-summary)

---

## 1. Gemini API

### Parent Platform
**Google AI for Developers** (Google AI Studio)
- Product page: https://ai.google.dev
- Part of Google's AI/ML ecosystem, distinct from Vertex AI (enterprise) though both expose Gemini models.

### SDK
| Location | Package | Version |
|---|---|---|
| Backend (`server/`) | `@google/generative-ai` | 0.21.0 |

Also installed but not actively used in source: `@google-cloud/vertexai` v1.12.0 (Vertex AI alternative SDK — present as a potential enterprise fallback).

### Configuration
- **API key env var:** `GEMINI_API_KEY` (server-side only, never exposed to client)
- **Feature flag:** `ENABLE_GEMINI=true`
- **Config module:** `server/config/index.js` → `config.geminiApiKey`, `config.flags.enableGemini`
- **Client init:** `server/services/gemini/index.js` — lazy singleton via `new GoogleGenerativeAI(config.geminiApiKey)`

### Models
| Role | Model | Fallback |
|---|---|---|
| Primary | `gemini-2.0-flash` | `gemini-1.5-flash` (on 404 errors) |

JSON-mode responses are requested via `generationConfig: { responseMimeType: 'application/json' }`.

### Core Service: `server/services/gemini/index.js`

Two exported async functions power all Gemini calls:

#### `generateText(prompt, options)`
Text-only generation. Used for chat replies, summaries, priority scoring, and duplicate detection.

```js
const response = await generateText(prompt);
// → string (raw model output)
```

#### `generateFromImage(prompt, imageData, mimeType, options)`
Multimodal generation — sends a text prompt alongside a base64-encoded image. Used for media analysis and resolution verification.

```js
const response = await generateFromImage(VISION_PROMPT, base64, 'image/jpeg');
// → string (JSON-formatted model output)
```

Both functions wrap calls in a governance layer (`withGovernedRequest`) that handles caching, rate limiting, retries, and timeouts. Model fallback (gemini-2.0-flash → gemini-1.5-flash) is attempted automatically on 404.

### Prompts: `server/services/gemini/prompts/index.js`

| Constant | Purpose | Output Format |
|---|---|---|
| `VISION_PROMPT` | Analyzes uploaded image of a community issue | JSON: `category`, `title`, `description`, `severity`, `department`, `hazards[]`, `confidence` |
| `PRIORITY_PROMPT` | Calculates issue priority score | JSON: `priority`, `score`, `reasoning` |
| `VERIFICATION_PROMPT` | Compares before/after images to verify resolution | JSON: `status`, `confidence`, `analysis` |
| `CHAT_PROMPT` | System prompt for the AI chatbot assistant | Plain text reply |
| `DUPLICATE_PROMPT` | Checks if a new report duplicates an existing one | JSON: `isDuplicate`, `matches[]` |
| `SUMMARY_PROMPT` | Generates a short authority-facing issue summary | Plain text (≤150 words) |

### Backend Routes Using Gemini

| HTTP Method | Route | Controller | Gemini Call |
|---|---|---|---|
| `POST` | `/api/issues/analyze` | `issueController` → `VisionAgent` | `generateFromImage()` with `VISION_PROMPT` — analyzes uploaded photo/video frame |
| `POST` | `/api/issues` | `issueController` | `generateText()` with `SUMMARY_PROMPT` — generates issue AI summary on creation |
| `POST` | `/api/issues/check-duplicates` | `issueController` → `DuplicateAgent` | `generateText()` with `DUPLICATE_PROMPT` — compares against nearby open reports |
| `POST` | `/api/verification/:id/verify-resolution` | `verificationController` | `generateFromImage()` with `VERIFICATION_PROMPT` — compares before/after resolution images |
| `POST` | `/api/chat` | `chatController` | `generateText()` with `CHAT_PROMPT` + dynamic context — chatbot reply |

### Route File: `server/routes/chatRoutes.js`
```
POST /api/chat
  → middleware: optionalAuthenticate, quota guard (60/day per user/IP)
  → chatController.chat
```

The chat controller builds context dynamically before calling Gemini:
- If `issueId` provided → fetches that issue's title and status
- If `lat`/`lng` provided → fetches up to 5 nearby issues within 2 km
- If authenticated → includes the user's own reported issues

### Frontend: `client/components/chatbot/ChatBot.tsx`
- Float button triggers a chat window labeled **"Community Hero AI — Powered by Gemini"**
- Sends `POST /api/chat` via `api.chat(message, context, token)` in `client/lib/api.ts`
- Passes geolocation context (`lat`, `lng`) from `useGeolocation` hook when available
- Falls back to a helpful static message if the API is unavailable

---

## 2. Google Maps API

### Parent Platform
**Google Maps Platform**
- Product page: https://developers.google.com/maps
- Billing and key management via **Google Cloud Console** → APIs & Services

### SDKs / Libraries
| Location | Package | Usage |
|---|---|---|
| Frontend (`client/`) | `@vis.gl/react-google-maps` v1.8.3 | React components wrapping Maps JS API v3 |
| Backend (`server/`) | None (direct REST) | Raw `fetch()` calls to Maps REST endpoints |
| Backend (`server/`) | `@types/google.maps` | TypeScript type definitions only |

### Configuration
| Env Var | Where Used | Purpose |
|---|---|---|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Client (Next.js) | Loaded in browser to initialize the Maps JS API |
| `GOOGLE_MAPS_API_KEY` | Server | Used in backend REST calls to Geocoding & Places APIs |
| `ENABLE_MAPS=true` | Server feature flag | Gates all server-side Maps calls |

Both keys are set in the root `.env`. The client key is also in `client/.env.local` as `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.

### Frontend Integration: `client/components/map/IssueMap.tsx`

Uses `@vis.gl/react-google-maps` which wraps the Google Maps JavaScript API v3.

**Components used:**

| Component | Purpose |
|---|---|
| `<APIProvider apiKey={key}>` | Loads the Maps JS SDK and provides React context |
| `<Map>` | Renders the interactive map with `gestureHandling="greedy"` and a custom `mapId="community-hero-map"` |
| `<AdvancedMarker>` | Renders color-coded circular markers for issue locations and user location |
| `<InfoWindow>` | Popup on marker click showing issue title, category badge, and priority |

**IssueMap is used in two places:**
- `client/app/map/page.tsx` — full-page map showing all nearby issues with filtering
- `client/components/issue/ReportIssueForm.tsx` — mini embedded map (height 200px, zoom 15) showing user location during issue reporting

If `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is not set, the component renders a fallback card listing issues as text buttons instead.

### Backend Integration: `server/services/agents/LocationAgent.js`

Makes direct HTTP REST calls to two Google Maps APIs. Both go through the `withGovernedRequest` governance wrapper (caching + rate limiting).

#### Geocoding API — Reverse Geocode
- **Endpoint:** `GET https://maps.googleapis.com/maps/api/geocode/json`
- **Params:** `latlng={lat},{lng}&key={GOOGLE_MAPS_API_KEY}`
- **Purpose:** Converts GPS coordinates into a human-readable address, extracting:
  - `address` — full formatted address
  - `ward` — neighborhood or sublocality
  - `road` — street name
- **Cache TTL:** 24 hours
- **App daily limit:** 400 requests

#### Places API — Nearby Search
- **Endpoint:** `GET https://maps.googleapis.com/maps/api/place/nearbysearch/json`
- **Params:** `location={lat},{lng}&radius=500&type=point_of_interest&key={GOOGLE_MAPS_API_KEY}`
- **Purpose:** Finds nearby landmarks to add context to the issue location:
  - `landmark` — name of the closest point of interest
  - `nearbyPlaces[]` — up to 5 nearby places with name and type
- **Cache TTL:** 6 hours
- **App daily limit:** 200 requests

**Coordinate normalization:** Coordinates are rounded to 5 decimal places before building cache keys, grouping near-identical requests together.

### Backend Routes Using Maps

| HTTP Method | Route | When Maps Is Called |
|---|---|---|
| `POST` | `/api/issues/analyze` | `analyzeLocation(lat, lng)` called if coordinates are provided in the form data |
| `POST` | `/api/issues` | `analyzeLocation(lat, lng)` called to enrich location metadata on issue creation |

---

## 3. Environment Variables

All variables are defined in the root `.env` (and `.env.example` as a template).

```bash
# Google AI — Gemini
GEMINI_API_KEY=your-gemini-api-key          # Server only

# Google Maps Platform
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-key    # Client (browser-exposed)
GOOGLE_MAPS_API_KEY=your-key                # Server-side REST calls
```

Client-side variables must be prefixed with `NEXT_PUBLIC_` to be included in Next.js browser builds.

---

## 4. Feature Flags

Both APIs can be disabled without code changes using environment flags. Defaults are `true`.

| Flag | Default | Effect when `false` |
|---|---|---|
| `ENABLE_GEMINI` | `true` | Disables all Gemini calls; affected routes return errors or skip AI steps |
| `ENABLE_MAPS` | `true` | Disables backend Maps calls; location data returned with raw coordinates only |
| `ENABLE_CHATBOT` | `true` | Can be used to disable the chat endpoint independently |

Flags are evaluated in `server/config/index.js` via the `envFlag()` helper which treats `false`, `0`, `off`, and `no` as disabled.

---

## 5. Rate Limiting & Governance

All external API calls go through `server/services/governance/index.js` (`withGovernedRequest`), which provides:

- **In-memory caching** — avoids redundant API calls within TTL windows
- **Daily quota tracking** — per-app and per-user/IP limits
- **Timeouts** — all calls have hard timeouts to prevent hanging
- **Retry logic** — single retry on transient failures; model fallback for Gemini

### Gemini Limits
| Limit | Value |
|---|---|
| App daily limit | 200 requests |
| User/IP daily limit | 60 requests |
| Request timeout | 30 seconds |
| Text cache TTL | 5 minutes |
| Image cache TTL | 24 hours |

### Google Maps Limits
| API | App daily limit | Cache TTL | Timeout |
|---|---|---|---|
| Geocoding (reverse) | 400 requests | 24 hours | 10 seconds |
| Places (nearby) | 200 requests | 6 hours | 10 seconds |

The chat route (`/api/chat`) has its own independent quota guard: **60 requests/day per user or IP**.
The media analysis route (`/api/issues/analyze`) has a quota guard: **40 requests/day per user or IP**.

---

## 6. Route Summary

All routes are mounted under `/api` in `server/app.js`.

| Mount Point | Route File | Gemini | Maps |
|---|---|---|---|
| `/api/chat` | `chatRoutes.js` | ✅ `generateText` (chat) | ❌ |
| `/api/issues` | `issueRoutes.js` | ✅ vision, summary, duplicate | ✅ reverse geocode, places |
| `/api/verification` | `verificationRoutes.js` | ✅ `generateFromImage` (before/after) | ❌ |
| `/api/auth` | `authRoutes.js` | ❌ | ❌ |
| `/api/dashboard` | `dashboardRoutes.js` | ❌ | ❌ |
| `/api/leaderboard` | `leaderboardRoutes.js` | ❌ | ❌ |
| `/api/analytics` | `analyticsRoutes.js` | ❌ | ❌ |
| `/api/notifications` | `notificationRoutes.js` | ❌ | ❌ |
| `/api/comments` | `commentRoutes.js` | ❌ | ❌ |

The frontend client (`client/lib/api.ts`) communicates with all of these via a shared `request()` helper that targets `NEXT_PUBLIC_API_URL` (default: `http://localhost:5000/api`) and attaches Firebase JWT tokens in the `Authorization: Bearer` header.
