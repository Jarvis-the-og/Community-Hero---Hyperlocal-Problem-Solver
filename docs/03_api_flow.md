# API Flow — Community Hero

## Overview

The Express.js REST API exposes 12 endpoint groups under `/api`. Every endpoint (except health check) requires authentication. The API follows a consistent pattern:

```
Request → Middleware Stack → Controller → Service(s) → Response
```

### Middleware Stack (Applied Per-Route Group)

1. **Route Quota Guard** — Configurable window/daily limits per route group
2. **File Upload** (Multer) — For endpoints accepting multipart data
3. **Authentication** — JWT Bearer token verification
4. **Role Authorization** — Role-based access control

---

## Health Check

```
GET /api/health
```

**Auth:** None

**Response:**
```json
{ "status": "ok", "service": "Community Hero API", "version": "1.0.0" }
```

---

## Auth Routes (`/api/auth`)

**Quota:** 120 requests/hour per IP

### POST /api/auth/sync

Create or update user profile after authentication.

**Auth:** Required
**Roles:** Any authenticated user

**Request:**
```json
{
  "displayName": "John Doe",
  "photoURL": "https://...",
  "role": "citizen"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "abc123",
    "email": "john@example.com",
    "displayName": "John Doe",
    "role": "citizen",
    "points": 0,
    "badges": [],
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  }
}
```

**Flow:**
1. `authenticate()` middleware verifies JWT → extracts user UID, email, name
2. `syncUser()` controller calls `upsertUser()` with role data
3. User is stored/updated in Firestore `users` collection
4. Returns user profile

### GET /api/auth/profile

Get current user's profile.

**Auth:** Required
**Roles:** Any authenticated user

**Response (200):**
```json
{
  "user": { "id": "...", "email": "...", "role": "citizen", "points": 50, "badges": ["community_hero"], ... }
}
```

---

## Issue Routes (`/api/issues`)

### GET /api/issues

List issues with optional filters.

**Auth:** Required
**Roles:** Any authenticated user

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status (e.g., `reported`, `assigned`) |
| `category` | string | Filter by category (e.g., `pothole`) |
| `priority` | string | Filter by priority (`critical`, `medium`, `low`) |
| `reporterId` | string | Filter by reporter |
| `department` | string | Filter by department |
| `assignedTo` | string | Filter by assigned worker |
| `ward` | string | Filter by ward name/number |
| `wardNumber` | string | Filter by ward number |
| `borough` | string | Filter by borough |
| `dateFrom` | string | Filter by created date (ISO 8601) |
| `dateTo` | string | Filter by created date (ISO 8601) |

**Response (200):**
```json
{
  "issues": [
    {
      "id": "issue001",
      "title": "Large pothole on Park Street",
      "description": "Deep pothole causing traffic disruption",
      "category": "pothole",
      "severity": "critical",
      "priority": "critical",
      "status": "ai_categorized",
      "reporterId": "user001",
      "reporterName": "John Doe",
      "department": "Roads Department",
      "location": {
        "lat": 22.5510,
        "lng": 88.3517,
        "address": "Park Street, Kolkata",
        "ward": "Ward 11 • Park Street",
        "wardNumber": 11,
        "borough": "Borough VI",
        "locality": "Park Street"
      },
      "supportCount": 5,
      "aiSummary": "Road damage issue reported: Large pothole on Park Street",
      "timeline": [
        { "status": "reported", "label": "Reported", "timestamp": "..." },
        { "status": "ai_categorized", "label": "AI Categorized", "description": "Priority: critical. ...", "timestamp": "..." }
      ],
      "createdAt": "2025-01-01T10:00:00.000Z",
      "updatedAt": "2025-01-01T10:00:00.000Z"
    }
  ]
}
```

**Flow:**
1. Query Firestore `issues` collection with optional filters
2. Fallback to unordered query if composite index missing
3. Apply client-side filters (ward, borough, date range)
4. Enrich each issue with ward data via `buildWardAwareIssue()`

### GET /api/issues/:id

Get a single issue by ID.

**Auth:** Required

**Response (200):**
```json
{ "issue": { ... } }
```

**Response (404):**
```json
{ "error": "Issue not found" }
```

### GET /api/issues/nearby

Find issues near coordinates.

**Auth:** Required

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `lat` | number | Latitude (required) |
| `lng` | number | Longitude (required) |
| `radius` | number | Radius in km (default: 5) |

**Response (200):**
```json
{ "issues": [ ... ] }
```

**Flow:**
1. Fetch all issues
2. Filter using Haversine distance formula
3. Return issues within radius

### POST /api/issues/analyze

Analyze uploaded media for issue classification.

**Auth:** Required

**Request:** Multipart form data with `file` (image) + optional `lat`, `lng`

**Response (200):**
```json
{
  "analysis": {
    "category": "pothole",
    "title": "Large pothole",
    "description": "Deep pothole on main road",
    "severity": "critical",
    "department": "Roads Department",
    "hazards": ["traffic_hazard"],
    "confidence": 0.92
  },
  "location": {
    "lat": 22.5510,
    "lng": 88.3517,
    "address": "Park Street, Kolkata",
    "ward": "Ward 11 • Park Street",
    "landmark": "Indian Museum"
  }
}
```

**Flow:**
1. Multer parses uploaded file
2. `VisionAgent.analyzeImage()` sends image to Groq Llama 4 Scout → returns classification
3. If coordinates provided, `LocationAgent.analyzeLocation()` reverse geocodes
4. Returns combined analysis

### POST /api/issues/check-duplicates

Check for potential duplicate issues.

**Auth:** Required

**Request:**
```json
{
  "lat": 22.5510,
  "lng": 88.3517,
  "category": "pothole",
  "title": "Large pothole on Park Street",
  "description": "Deep pothole..."
}
```

**Response (200):**
```json
{
  "isDuplicate": true,
  "matches": [
    {
      "issueId": "issue001",
      "title": "Pothole on Park Street near museum",
      "similarity": 0.85,
      "distance": 50,
      "category": "pothole",
      "status": "assigned"
    }
  ]
}
```

**Flow:**
1. Fetch nearby open issues within 500m radius
2. Compute text similarity using Jaccard index on title + description
3. Score: category match (+0.4), title similarity (+0.3), description similarity (+0.3), proximity bonus (+0.2 if <100m)
4. Return matches above 0.7 threshold

### POST /api/issues

Create a new issue.

**Auth:** Required

**Request:** Multipart form data (or JSON with `mediaUrls`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | ✓ | Issue title |
| `description` | string | ✓ | Issue description |
| `category` | string | ✓ | Issue category |
| `severity` | string | ✓ | Severity level |
| `lat` | number | ✓ | Latitude |
| `lng` | number | ✓ | Longitude |
| `department` | string | - | Assigned department |
| `hazards` | string | - | JSON array of hazards |
| `aiConfidence` | number | - | AI analysis confidence |
| `duplicateOf` | string | - | Parent issue ID if duplicate |
| `mediaUrls` | string | - | JSON array of URLs or single URL |
| `files` | file[] | - | Uploaded image files |

**Response (201):**
```json
{
  "issue": { ... },
  "priority": { "priority": "critical", "score": 75, "reasoning": "..." }
}
```

**Response (409):**
```json
{
  "error": "Potential duplicate detected",
  "duplicates": { "isDuplicate": true, "matches": [...] }
}
```

**Flow (Complete):**
1. Parse multipart data → upload files to Firebase Storage
2. `LocationAgent.analyzeLocation()` → reverse geocode coordinates
3. `DuplicateAgent.findDuplicates()` → check for potential duplicates
4. `PriorityAgent.calculatePriority()` → calculate urgency score
5. `generateText()` with `SUMMARY_PROMPT` → AI-generated summary
6. `createIssue()` → save to Firestore with timeline
7. `addPoints()` → award report points to citizen
8. `NotificationAgent.notifyIssueReported()` → notify authorities
9. Return issue + priority data

### PATCH /api/issues/:id

Update issue status.

**Auth:** Required
**Roles:** Authority, Admin, Department

**Request:**
```json
{
  "status": "assigned",
  "assignedTo": "worker001",
  "assignedWorkerName": "Field Worker"
}
```

**Response (200):**
```json
{ "issue": { ... } }
```

**Flow:**
1. Update status and optional assignment
2. Add timeline event with status label
3. Send notifications based on status transition

### POST /api/issues/:id/support

Support/upvote an issue.

**Auth:** Required
**Roles:** Any authenticated user

**Response (200):**
```json
{ "issue": { ... } }
```

**Flow:**
1. Increment `supportCount` on issue
2. Award support points to citizen

### POST /api/issues/:id/confirm

Citizen confirms or rejects resolution.

**Auth:** Required

**Request:**
```json
{
  "confirmed": true,
  "comment": "The pothole is fixed. Thank you!"
}
```

**Response (200):**
```json
{ "issue": { ... } }
```

### POST /api/issues/:id/images

Upload before/after resolution images.

**Auth:** Required
**Roles:** Department, Worker, Authority, Admin

**Request:** Multipart form data

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `files` | file[] | ✓ | Image files |
| `type` | string | ✓ | `before` or `after` |

**Response (200):**
```json
{ "issue": { ... } }
```

---

## Comment Routes (`/api/comments`)

### GET /api/comments/:issueId

Get all public comments for an issue.

**Response (200):**
```json
{ "comments": [ { "id": "...", "issueId": "...", "userId": "...", "userName": "John", "content": "...", "createdAt": "..." } ] }
```

### POST /api/comments/:issueId

Add a public comment to an issue.

**Auth:** Required

**Request:**
```json
{ "content": "This issue is getting worse, please prioritize it." }
```

**Response (201):**
```json
{ "comment": { ... } }
```

---

## Verification Routes (`/api/verification`)

### GET /api/verification/:issueId

Get all verifications for an issue.

### POST /api/verification/:issueId

Submit a community verification.

**Auth:** Required

**Request:**
```json
{ "status": "confirmed" }
```

### POST /api/verification/:issueId/ai

Run AI verification on before/after images.

**Auth:** Required
**Roles:** Department, Authority, Admin

**Response (200):**
```json
{
  "verification": {
    "status": "resolved",
    "confidence": 0.88,
    "analysis": "The pothole appears to be properly filled and the road surface is smooth."
  }
}
```

**Flow:**
1. Fetch before/after images from issue
2. `VerificationAgent.verifyCompletionFromUrls()` → download images
3. Groq Llama 4 Scout compares images
4. Returns resolution status: `resolved`, `possibly_unresolved`, or `need_manual_review`

---

## Dashboard Routes (`/api/dashboard`)

**Auth:** Required
**Roles:** Authority, Admin

### GET /api/dashboard

Get city-wide dashboard with filters.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `ward` | string | Filter by ward |
| `borough` | string | Filter by borough |
| `department` | string | Filter by department |
| `status` | string | Filter by status |
| `priority` | string | Filter by priority |

**Response (200):**
```json
{
  "analytics": { ... },
  "issues": [ ... ],
  "mapData": [
    { "id": "...", "lat": 22.55, "lng": 88.35, "priority": "critical", "status": "assigned", "department": "Roads Department", "borough": "Borough VI", "ward": "Ward 11 • Park Street", "category": "pothole", "title": "..." }
  ]
}
```

### GET /api/dashboard/:id

Get detailed dashboard view for a specific issue.

---

## Leaderboard Routes (`/api/leaderboard`)

### GET /api/leaderboard

Get top contributors.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | Number of results (default: 10) |

**Response (200):**
```json
{
  "leaderboard": [
    { "id": "...", "displayName": "John Doe", "points": 150, "trustScore": 65, "badges": ["community_hero"] }
  ]
}
```

---

## Analytics Routes (`/api/analytics`)

### GET /api/analytics

Get comprehensive city analytics (cached for 2 minutes).

**Auth:** Required
**Roles:** Authority, Admin

**Response (200):**
```json
{
  "analytics": {
    "totalIssues": 150,
    "resolvedIssues": 85,
    "activeIssues": 65,
    "resolutionRate": 56,
    "avgRepairTimeHours": 48,
    "activeUsers": 1200,
    "categoryBreakdown": { "pothole": 45, "garbage": 30, "water_leakage": 20 },
    "mostCommonIssue": "pothole",
    "criticalCount": 12,
    "mediumCount": 45,
    "lowCount": 93,
    "issueTrends": { "2025-01-01": 5, "2025-01-02": 8, ... },
    "topContributors": [ { "id": "...", "displayName": "...", "points": 150, "trustScore": 65 } ],
    "departmentBreakdown": { "Roads Department": 45, "Water Supply": 30 },
    "wardBreakdown": { "Ward 11 • Park Street": 12, "Ward 5 • Hatibagan": 8 },
    "wardMetrics": [ { "wardNumber": 5, "ward": "Ward 5 • Borough IV", "borough": "Borough IV", "complaintCount": 8, "criticalCount": 2, "pendingCount": 3, "resolvedCount": 5, "escalatedCount": 0, "slaCompliance": 80, "departmentBreakdown": { ... } } ],
    "departmentPerformance": [ { "name": "Roads Department", "total": 45, "resolved": 30, "pending": 15, "resolutionRate": 66, "avgHours": 36 } ],
    "resolutionTrends": { "2025-01-01": { "reported": 5, "resolved": 2 }, ... },
    "peakReportingHours": [ { "hour": 9, "count": 12 }, ... ],
    "aiInsights": [ "Complaint frequency is increasing in the last 7 days..." ],
    "citizenSatisfaction": 78
  }
}
```

---

## Chat Routes (`/api/chat`)

### POST /api/chat/message

Send a message to the AI chatbot.

**Auth:** Required

**Request:**
```json
{ "message": "How do I report a pothole?" }
```

**Response (200):**
```json
{ "reply": "To report a pothole, go to the Report page and fill in..." }
```

---

## Notification Routes (`/api/notifications`)

### GET /api/notifications

Get current user's notifications.

**Response (200):**
```json
{
  "notifications": [
    { "id": "...", "userId": "...", "type": "issue_assigned", "title": "New Assignment", "message": "You have been assigned: 'Large pothole on Park Street'", "issueId": "issue001", "read": false, "createdAt": "..." }
  ]
}
```

### PATCH /api/notifications/:id/read

Mark a notification as read.

**Response (200):**
```json
{ "success": true }
```

---

## Department Routes (`/api/department`)

**Auth:** Required
**Roles:** Department

### GET /api/department

Get department dashboard with filterable issues.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `department` | string | Department name (or uses user's assigned department) |
| `status` | string | Status group: `pending`, `accepted`, `in_progress`, `completed`, `rejected`, `escalated` |
| `priority` | string | Filter by priority |
| `category` | string | Filter by category |
| `ward` | string | Filter by ward |
| `dateFrom` | string | Filter by date |
| `dateTo` | string | Filter by date |

**Response (200):**
```json
{
  "department": "Roads Department",
  "departments": [ "Roads Department", ... ],
  "issues": [ ... ],
  "stats": { "total": 45, "pending": 10, "accepted": 5, "inProgress": 8, "completed": 20, "rejected": 1, "escalated": 1, "critical": 3 },
  "workers": [ { "id": "...", "displayName": "...", "department": "Roads Department", ... } ]
}
```

### GET /api/department/:id

Get detailed issue view with comments, verifications, internal comments, and similar issues.

### POST /api/department/:id/action

Perform an action on an issue.

**Request:**
```json
{
  "action": "assign",
  "assignedTo": "worker001",
  "assignedWorkerName": "Field Worker",
  "note": "Please prioritize this issue"
}
```

**Available Actions:** `accept`, `reject`, `assign`, `start`, `pause`, `complete`, `escalate`

### POST /api/department/:id/comment

Add an internal (department-only) comment.

**Request:**
```json
{
  "content": "Need to coordinate with Water Supply department for this issue."
}
```

---

## Worker Routes (`/api/worker`)

**Auth:** Required
**Roles:** Worker

### GET /api/worker

Get assigned tasks for today.

**Response (200):**
```json
{
  "tasks": [ ... ],
  "stats": { "total": 3, "assigned": 1, "inProgress": 1, "completed": 1 }
}
```

### GET /api/worker/tasks/:id

Get details of a specific assigned task.

### POST /api/worker/tasks/:id/action

Update task status.

**Request:**
```json
{ "action": "complete", "notes": "Fixed the pothole" }
```

**Available Actions:** `start`, `pause`, `complete`

### POST /api/worker/tasks/:id/images

Upload before/after photos for a task.

**Request:** Multipart form data with `files[]`, `type` (`before`/`after`), and optional `notes`

**Response (200):**
```json
{
  "issue": { ... },
  "aiVerification": {
    "status": "resolved",
    "confidence": 0.88,
    "analysis": "The issue appears to be properly resolved."
  }
}
```

**Flow:**
1. Upload images to Firebase Storage
2. If `type === 'after'`, trigger `VerificationAgent.verifyCompletionFromUrls()`
3. AI compares first "before" image with latest "after" image
4. Update issue with verification result

---

## Admin Routes (`/api/admin`)

**Auth:** Required
**Roles:** Authority, Admin

### GET /api/admin

Get admin dashboard with full analytics and map data.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `ward` | string | Filter by ward |
| `borough` | string | Filter by borough |
| `department` | string | Filter by department |
| `status` | string | Filter by status |
| `priority` | string | Filter by priority |

**Response (200):**
```json
{
  "analytics": { ... },
  "issues": [ ... ],
  "mapData": [ ... ]
}
```

### GET /api/admin/rankings

Get department performance rankings.

**Response (200):**
```json
{
  "rankings": [
    { "name": "Roads Department", "total": 45, "resolved": 30, "pending": 15, "resolutionRate": 66, "avgHours": 36, "rank": 1 }
  ]
}