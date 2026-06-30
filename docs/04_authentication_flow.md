# Authentication Flow — Community Hero

## Overview

Community Hero uses **Firebase Authentication** for identity management with **JWT Bearer tokens** for API authorization. The authentication system supports six user roles with middleware-enforced access control.

```
┌─────────────────────────────────────────────────────────────────────┐
│                      AUTHENTICATION FLOW                            │
└─────────────────────────────────────────────────────────────────────┘

CLIENT (Browser)                    FIREBASE AUTH           EXPRESS SERVER
      │                                  │                       │
      │  1. User signs in                │                       │
      │─────────────────────────────────►│                       │
      │                                  │                       │
      │  2. Firebase returns ID Token    │                       │
      │◄─────────────────────────────────│                       │
      │                                  │                       │
      │  3. API Request + Bearer Token   │                       │
      │─────────────────────────────────────────────────────────►│
      │                                  │                       │
      │                                  │    4. authenticate()  │
      │                                  │    middleware runs    │
      │                                  │                       │
      │                                  │    5a. Verify JWT    │
      │                                  │    via Admin SDK ───►│
      │                                  │    (firebase-admin)   │
      │                                  │                       │
      │                                  │    OR                 │
      │                                  │                       │
      │                                  │    5b. Verify via    │
      │                                  │    Identity Toolkit   │
      │                                  │    REST API ────────►│
      │                                  │                       │
      │                                  │    6. Extract user    │
      │                                  │    { uid, email,     │
      │                                  │      name }          │
      │                                  │                       │
      │                                  │    7. requireRole()   │
      │                                  │    middleware         │
      │                                  │    fetches profile   │
      │                                  │    from Firestore     │
      │                                  │                       │
      │                                  │    8. Check role     │
      │                                  │    against required   │
      │                                  │                       │
      │◄─────────────────────────────────────────────────────────│
      │  9. Response (200/401/403)                               │
```

---

## Step-by-Step Authentication Flow

### 1. User Sign-In (Client-Side)

The client uses Firebase Authentication SDK (configured in `client/lib/firebase.ts`). Firebase handles all identity operations:

```typescript
// Firebase client configuration (client/lib/firebase.ts)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};
```

Supported authentication methods (via Firebase Auth):
- Email/Password
- Google Sign-In
- Any provider enabled in Firebase Console

### 2. Firebase Returns ID Token

After successful sign-in, Firebase returns a **JWT ID Token** that:
- Contains the user's UID, email, and custom claims
- Is signed by Firebase's private key
- Has a configurable expiration (default: 1 hour)
- Can be refreshed using Firebase's refresh token mechanism

### 3. API Request with Bearer Token

Every API request includes the ID token in the `Authorization` header:

```http
Authorization: Bearer <firebase-id-token>
Content-Type: application/json
```

The client API library (`client/lib/api.ts`) automatically attaches the token:

```typescript
// Client API client automatically attaches auth header
const response = await fetch('/api/issues', {
  headers: {
    'Authorization': `Bearer ${idToken}`,
    'Content-Type': 'application/json',
  },
});
```

### 4. Server Authentication Middleware

The `authenticate()` middleware (`server/middleware/index.js`) processes every protected request:

```javascript
export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  // No token? Try demo mode
  if (!authHeader?.startsWith('Bearer ')) {
    if (isDemoMode()) {
      req.user = DEMO_USER;  // Demo fallback user
      return next();
    }
    return res.status(401).json({ error: 'Authentication required' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    // Verify token (two methods available)
    req.user = await verifyIdToken(idToken);
    req.idToken = idToken;
    return next();
  } catch (error) {
    // Invalid token? Try demo mode fallback
    if (isDemoMode()) {
      req.user = DEMO_USER;
      return next();
    }
    return res.status(401).json({ error: 'Invalid authentication token' });
  }
}
```

### 5. Token Verification (Two Methods)

#### Method A: Firebase Admin SDK (Preferred)

When Firebase Admin SDK credentials are configured, token verification uses `firebase-admin`:

```javascript
// server/services/firebase/auth.js
const decoded = await admin.auth().verifyIdToken(idToken);
return {
  uid: decoded.uid,
  email: decoded.email,
  name: decoded.name || decoded.email?.split('@')[0] || 'User',
};
```

**Requirements:** `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`

#### Method B: Identity Toolkit REST API (Fallback)

When Admin SDK is unavailable, verification falls back to Google's Identity Toolkit:

```javascript
const res = await fetch(
  `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseWebApiKey}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  }
);
```

**Requirements:** `FIREBASE_WEB_API_KEY`

### 6. User Identity Resolution

After successful verification, the middleware sets `req.user`:

```javascript
req.user = {
  uid: 'abc123def456',       // Firebase Auth UID
  email: 'citizen@example.com',
  name: 'John Doe',
};
```

### 7. Role Authorization Middleware

The `requireRole()` middleware (`server/middleware/index.js`) enforces role-based access:

```javascript
export function requireRole(...roles) {
  return async (req, res, next) => {
    // Fetch user profile from Firestore
    const user = await getUser(req.user.uid)
      || await getUserByEmail(req.user.email);

    // Check if user has required role
    if (user && roles.includes(user.role)) {
      req.userProfile = user;  // Attach full profile for downstream use
      return next();
    }

    // Demo mode role fallback
    if (isDemoMode()) {
      // Check for demo accounts with specific roles
      if (req.user.uid === 'demo-authority' && roles.includes('authority')) { ... }
      if (req.user.uid === 'demo-department' && roles.includes('department')) { ... }
      if (req.user.uid === 'demo-worker' && roles.includes('worker')) { ... }
    }

    return res.status(403).json({ error: 'Insufficient permissions' });
  };
}
```

### 8. Role Check Against Requirements

The middleware checks the user's role (from Firestore profile) against the roles required for the endpoint:

| Endpoint | Required Roles |
|----------|---------------|
| `/api/issues` (GET) | Any authenticated |
| `/api/issues` (POST) | Any authenticated |
| `/api/dashboard` | authority, admin |
| `/api/analytics` | authority, admin |
| `/api/admin` | authority, admin |
| `/api/department` | department |
| `/api/worker` | worker |
| `/api/verification/:id/ai` | department, authority, admin |
| `/api/issues/:id` (PATCH) | authority, admin, department |

### 9. Response

- **200 OK** — User authenticated and authorized
- **401 Unauthorized** — Missing or invalid token
- **403 Forbidden** — Authenticated but insufficient role permissions

---

## User Sync Flow

After Firebase authentication succeeds on the client, the client synchronizes the user profile with the backend:

```javascript
// Client calls POST /api/auth/sync
await fetch('/api/auth/sync', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${idToken}` },
  body: JSON.stringify({
    displayName: 'John Doe',
    photoURL: 'https://...',
    role: 'citizen',  // Default role for new users
  }),
});
```

The server `syncUser()` controller calls `upsertUser()` which creates or updates the user document in Firestore:

```javascript
await upsertUser({
  id: req.user.uid,
  email: req.user.email,
  displayName: displayName || req.user.name,
  photoURL,
  role: role || 'citizen',
  points: 0,
  badges: [],
  createdAt: new Date().toISOString(),
});
```

---

## Demo Mode Authentication

For development and testing, the platform supports **demo mode** with automatic authentication:

### Configuration

```env
DEMO_MODE=true
ENABLE_FIREBASE=false
```

### Demo User Accounts

| UID | Role | Description |
|-----|------|-------------|
| `demo-user` | citizen | Default citizen |
| `demo-authority` | authority | Municipal authority dashboard |
| `demo-department` | department | Department officer (Public Works) |
| `demo-worker` | worker | Field worker (Public Works) |

### Behavior

1. If no `Authorization` header is provided **and** demo mode is active, a default `demo-user` is auto-assigned
2. If token verification fails **and** demo mode is active, the request proceeds with the demo user
3. If Firebase is not configured **and** demo mode is active, the system seeds in-memory data

---

## Role Hierarchy

```
                    ┌─────────┐
                    │  Admin  │  ← Full system access
                    └────┬────┘
                         │
                    ┌────▼────┐
                    │Authority│  ← Municipal oversight + analytics
                    └────┬────┘
                         │
              ┌──────────┼──────────┐
              │          │          │
        ┌─────▼────┐ ┌──▼───┐ ┌────▼─────┐
        │Department│ │Worker│ │ Volcano  │
        │ (per dept)│ │      │ │   teer   │
        └──────────┘ └──────┘ └──────────┘
                         │
                    ┌────▼────┐
                    │ Citizen │  ← Base level
                    └─────────┘
```

Each role inherits the permissions of roles below it in the hierarchy for most operations.

---

## Security Considerations

1. **Token Expiration** — Firebase ID tokens expire after 1 hour. The client must refresh tokens using Firebase's `onIdTokenChanged` callback
2. **HTTPS Required** — All token transmissions must use HTTPS to prevent token interception
3. **No Password Storage** — Passwords are never stored on the server; Firebase Auth handles all credential management
4. **Service Account Protection** — The Firebase service account private key must never be exposed client-side
5. **Role Escalation Prevention** — User roles are stored server-side in Firestore and cannot be modified by the client
6. **Department Isolation** — Department-scoped queries prevent cross-department data access
7. **Worker Isolation** — Workers can only access issues explicitly assigned to them