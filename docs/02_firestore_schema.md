# Firestore Schema — Community Hero

## Overview

Community Hero uses **Firebase Firestore** as its primary NoSQL database. The schema consists of 8 collections, documented below. Each collection is accessed through a **three-tier fallback**: Firebase Admin SDK → Firestore REST API → In-Memory Store.

---

## Collection: `users`

### Purpose
Stores registered user profiles with roles, points, badges, and gamification data.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | ✓ | User UID (matches Firebase Auth UID or email) |
| `email` | `string` | ✓ | User email address |
| `displayName` | `string` | ✓ | Display name shown in UI |
| `photoURL` | `string` | - | Profile photo URL |
| `role` | `string` | ✓ | One of: `citizen`, `volunteer`, `department`, `worker`, `authority`, `admin` |
| `department` | `string` | - | Assigned department (for department/worker roles) |
| `points` | `number` | - | Gamification points (default: 0) |
| `badges` | `array<string>` | - | Earned badge types |
| `trustScore` | `number` | - | Trust score (0-100, default: 50) |
| `createdAt` | `string` | ✓ | ISO 8601 timestamp of account creation |
| `updatedAt` | `string` | ✓ | ISO 8601 timestamp of last update |

### Relationships
- `id` → Referenced by `issues.reporterId`, `issues.assignedTo`, `notifications.userId`, `comments.userId`, `internalComments.userId`, `verifications.userId`
- `email` → Used as fallback user lookup in `getUserByEmail()`

### Indexes
- Primary: `id` (document key)
- Composite: `points desc` (for leaderboard)
- Composite: `role ==` (for role-based queries)

---

## Collection: `issues`

### Purpose
Core collection — stores every civic grievance report with full lifecycle tracking.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | ✓ | Auto-generated document ID |
| `title` | `string` | ✓ | Issue title |
| `description` | `string` | ✓ | Detailed description |
| `category` | `string` | ✓ | One of: `pothole`, `garbage`, `water_leakage`, `broken_streetlight`, `fallen_tree`, `drainage`, `road_damage`, `illegal_dumping`, `electrical_hazard`, `other` |
| `severity` | `string` | ✓ | One of: `critical`, `medium`, `low` |
| `priority` | `string` | ✓ | One of: `critical`, `medium`, `low` (calculated by PriorityAgent) |
| `status` | `string` | ✓ | One of: `reported`, `ai_categorized`, `community_verified`, `assigned`, `in_progress`, `paused`, `completed`, `ai_verified`, `rejected`, `escalated` |
| `reporterId` | `string` | ✓ | UID of the reporting citizen |
| `reporterName` | `string` | ✓ | Display name of reporter |
| `department` | `string` | - | Assigned department (e.g., "Roads Department") |
| `assignedTo` | `string` | - | UID of assigned field worker |
| `assignedWorkerName` | `string` | - | Display name of assigned worker |
| `location` | `object` | ✓ | Geo-location object (see below) |
| `mediaUrls` | `array<string>` | - | URLs of uploaded photos |
| `beforeImages` | `array<string>` | - | "Before" photos uploaded by worker |
| `afterImages` | `array<string>` | - | "After" photos uploaded by worker |
| `supportCount` | `number` | - | Number of supports/upvotes (default: 0) |
| `verificationScore` | `number` | - | Aggregate verification score |
| `aiConfidence` | `number` | - | AI analysis confidence (0-1) |
| `aiSummary` | `string` | - | AI-generated summary of the issue |
| `hazards` | `array<string>` | - | Detected hazards from Vision Agent |
| `duplicateOf` | `string` | - | ID of parent issue if this is a duplicate |
| `citizenConfirmed` | `boolean` | - | Whether citizen confirmed resolution |
| `citizenComment` | `string` | - | Citizen feedback on resolution |
| `workerNotes` | `string` | - | Notes from field worker |
| `resolutionStatus` | `string` | - | One of: `resolved`, `possibly_unresolved`, `need_manual_review` |
| `aiResolutionConfidence` | `number` | - | AI verification confidence (0-1) |
| `escalationLevel` | `number` | - | Current escalation level (default: 0) |
| `escalationHistory` | `array<object>` | - | Array of escalation events |
| `timeline` | `array<object>` | ✓ | Array of status change events |
| `scheduledDate` | `string` | - | Scheduled date for work |
| `reporterEmail` | `string` | - | Reporter email (for migration) |
| `assignedToEmail` | `string` | - | Assigned worker email (for migration) |
| `wardNumber` | `number` | - | Resolved ward number from ward catalog |
| `borough` | `string` | - | Resolved borough from ward catalog |
| `locality` | `string` | - | Resolved locality from ward catalog |
| `importantRoad` | `string` | - | Resolved important road/landmark |
| `createdAt` | `string` | ✓ | ISO 8601 timestamp |
| `updatedAt` | `string` | ✓ | ISO 8601 timestamp |

### Location Object (`location`)

| Field | Type | Description |
|-------|------|-------------|
| `lat` | `number` | Latitude |
| `lng` | `number` | Longitude |
| `address` | `string` | Human-readable address (reverse geocoded) |
| `ward` | `string` | Ward name with borough (e.g., "Ward 5 • Borough IV") |
| `wardNumber` | `number` | Ward number |
| `borough` | `string` | Borough name |
| `locality` | `string` | Locality name |
| `importantRoad` | `string` | Important road/landmark |
| `landmark` | `string` | Nearby landmark (from Places API) |
| `road` | `string` | Road name |
| `nearbyPlaces` | `array<object>` | Nearby places from Google Places API |

### Timeline Event Object

| Field | Type | Description |
|-------|------|-------------|
| `status` | `string` | Status value |
| `label` | `string` | Human-readable label |
| `description` | `string` | Optional description |
| `actor` | `string` | Person/system that performed the action |
| `timestamp` | `string` | ISO 8601 timestamp |

### Escalation History Object

| Field | Type | Description |
|-------|------|-------------|
| `level` | `number` | Escalation level |
| `reason` | `string` | Reason for escalation |
| `timestamp` | `string` | ISO 8601 timestamp |
| `actor` | `string` | Person/system that escalated |

### Relationships
- `reporterId` → References `users.id`
- `assignedTo` → References `users.id`
- `duplicateOf` → References `issues.id` (self-referential)

### Indexes

| Index | Fields | Purpose |
|-------|--------|---------|
| Primary | `id` | Document key |
| Query | `status` | Filter by status |
| Query | `category` | Filter by category |
| Query | `reporterId` | Find citizen's issues |
| Query | `department` | Filter by assigned department |
| Query | `assignedTo` | Find worker's tasks |
| Composite | `createdAt desc` + `status` | Default ordered listing |
| Composite | `status not-in` | Active issue queries |

---

## Collection: `comments`

### Purpose
Stores public comments on issues (visible to all users).

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | ✓ | Auto-generated document ID |
| `issueId` | `string` | ✓ | Parent issue ID |
| `userId` | `string` | ✓ | Commenter's UID |
| `userName` | `string` | ✓ | Commenter's display name |
| `content` | `string` | ✓ | Comment text |
| `createdAt` | `string` | ✓ | ISO 8601 timestamp |

### Relationships
- `issueId` → References `issues.id`
- `userId` → References `users.id`

### Indexes

| Index | Fields | Purpose |
|-------|--------|---------|
| Query | `issueId` | Get all comments for an issue |
| Composite | `issueId` + `createdAt desc` | Ordered comments |

---

## Collection: `verifications`

### Purpose
Stores community verification records — citizens confirming issue existence.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | ✓ | Auto-generated document ID |
| `issueId` | `string` | ✓ | Verified issue ID |
| `userId` | `string` | ✓ | Verifier's UID |
| `status` | `string` | ✓ | One of: `pending`, `confirmed`, `rejected` |
| `createdAt` | `string` | ✓ | ISO 8601 timestamp |

### Relationships
- `issueId` → References `issues.id`
- `userId` → References `users.id`

### Indexes

| Index | Fields | Purpose |
|-------|--------|---------|
| Query | `issueId` | Get verifications for an issue |

---

## Collection: `notifications`

### Purpose
Stores user notifications for real-time alerts.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | ✓ | Auto-generated document ID |
| `userId` | `string` | ✓ | Recipient's UID |
| `type` | `string` | ✓ | One of: `issue_received`, `issue_verified`, `issue_assigned`, `work_started`, `issue_resolved`, `issue_reopened`, `issue_escalated`, `nearby_issue`, `need_verification`, `citizen_verify`, `comment_reply`, `badge_earned` |
| `title` | `string` | ✓ | Notification title |
| `message` | `string` | ✓ | Notification body |
| `issueId` | `string` | - | Related issue ID |
| `read` | `boolean` | ✓ | Whether notification has been read |
| `createdAt` | `string` | ✓ | ISO 8601 timestamp |

### Relationships
- `userId` → References `users.id`
- `issueId` → References `issues.id`

### Indexes

| Index | Fields | Purpose |
|-------|--------|---------|
| Query | `userId` | Get user's notifications |
| Composite | `userId` + `createdAt desc` | Ordered notifications (with limit) |

---

## Collection: `internalComments`

### Purpose
Stores department-only internal notes on issues (not visible to citizens).

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | ✓ | Auto-generated document ID |
| `issueId` | `string` | ✓ | Parent issue ID |
| `userId` | `string` | ✓ | Author's UID |
| `userName` | `string` | ✓ | Author's display name |
| `content` | `string` | ✓ | Comment text |
| `isInternal` | `boolean` | ✓ | Always `true` |
| `createdAt` | `string` | ✓ | ISO 8601 timestamp |

### Relationships
- `issueId` → References `issues.id`
- `userId` → References `users.id`

### Indexes

| Index | Fields | Purpose |
|-------|--------|---------|
| Query | `issueId` | Get internal comments for an issue |

---

## Collection: `leaderboard`

### Purpose
(Not a dedicated collection — derived from `users` collection ordered by `points` descending.)

The leaderboard is computed at query time by fetching users sorted by `points`. The `getLeaderboard()` function returns the top N users. In Firestore, this uses `.orderBy('points', 'desc').limit(N)`. In the REST fallback, users are fetched and sorted in memory.

---

## Collection: `badges`

### Purpose
(Not a dedicated collection — badges are stored as strings in the `users.badges` array field.)

Badge definitions are hardcoded in `gamificationService.js`:

| Badge | Min Points | Label |
|-------|-----------|-------|
| `early_reporter` | 10 | Early Reporter |
| `community_hero` | 50 | Community Hero |
| `verification_champion` | 75 | Verification Champion |
| `problem_solver` | 100 | Problem Solver |
| `top_volunteer` | 200 | Top Volunteer |

---

## Firestore Security Rules

The project includes `firestore.rules` at the project root. The rules enforce:

- **Authentication required** for all reads/writes
- **Users can read/write their own documents** in the `users` collection
- **Issues are publicly readable**, writable by authenticated users
- **Comments and verifications** follow similar patterns
- **Notifications** are readable only by the intended recipient

---

## Three-Tier Data Access

All data access functions in `issueService.js` follow this pattern:

```
function getIssues(filters) {
  const db = getDb();  // Try Admin SDK
  if (db) {
    // Direct Firestore access
    return query results;
  }

  if (useFirestoreRest()) {  // Fallback to REST API
    return rest results;
  }

  return inMemoryStore results;  // Last resort: in-memory
}
```

This ensures the application works in development (in-memory), staging (REST fallback), and production (Admin SDK) without code changes.

---

## Ward Catalog

The ward catalog is not stored in Firestore — it is parsed from `ward.md` at runtime by `wardCatalog.js`:

```
ward.md (source of truth)
    │
    ▼
wardCatalog.parseWardEntries() — Parses markdown to structured array
    │
    ▼
wardCatalog.resolveWardContext(location, catalog) — Maps coordinates to ward
    │
    ▼
wardCatalog.buildWardAwareIssue(issue, catalog) — Enriches issue with ward data
```

The ward catalog is a static file that must be updated when deploying to a new city. It contains borough names, ward numbers, localities, and important roads for coordinate-to-ward resolution.