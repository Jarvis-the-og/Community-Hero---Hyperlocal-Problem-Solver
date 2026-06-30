import { getAuth, isFirebaseAdminReady, isFirebaseConfigured } from '../services/firebase/index.js';
import { verifyIdToken } from '../services/firebase/auth.js';
import { config, isDemoMode } from '../config/index.js';
import { runWithContext, getRequestContext } from '../utils/requestContext.js';

const DEMO_USER = { uid: 'demo-user', email: 'demo@communityhero.app', name: 'Demo User' };

function getDefaultDemoUser() {
  return DEMO_USER;
}

export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  const useDemo = isDemoMode() || (!isFirebaseConfigured() && !isFirebaseAdminReady());

  if (!authHeader?.startsWith('Bearer ')) {
    if (useDemo) {
      req.user = { uid: 'demo-user', email: 'demo@communityhero.app', name: 'Demo User' };
      return runWithContext(
        { ...getRequestContext(), user: req.user, requestIp: req.ip, requestPath: req.originalUrl },
        () => next()
      );
    }
    return res.status(401).json({ error: 'Authentication required' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    req.user = await verifyIdToken(idToken);
    req.idToken = idToken;

    return runWithContext(
      { ...getRequestContext(), idToken, user: req.user, requestIp: req.ip, requestPath: req.originalUrl },
      () => next()
    );
  } catch {
    if (useDemo) {
      req.user = DEMO_USER;
      return runWithContext(
        { ...getRequestContext(), user: req.user, requestIp: req.ip, requestPath: req.originalUrl },
        () => next()
      );
    }
    return res.status(401).json({ error: 'Invalid authentication token' });
  }
}

export async function optionalAuthenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    req.user = isDemoMode() ? getDefaultDemoUser() : null;
    return next();
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    req.user = await verifyIdToken(idToken);
    req.idToken = idToken;

    return runWithContext(
      { ...getRequestContext(), idToken, user: req.user, requestIp: req.ip, requestPath: req.originalUrl },
      () => next()
    );
  } catch {
    req.user = null;
    return next();
  }
}

export function requireRole(...roles) {
  return async (req, res, next) => {
    const { getUser, getUserByEmail } = await import('../services/issueService.js');
    const user = (await getUser(req.user.uid)) || (await getUserByEmail(req.user.email));

    if (user && roles.includes(user.role)) {
      req.userProfile = user;
      return next();
    }

    if (isDemoMode()) {
      if (req.user.uid === 'demo-authority' && (roles.includes('authority') || roles.includes('admin'))) {
        req.userProfile = { id: 'demo-authority', role: 'authority', displayName: 'City Authority' };
        return next();
      }
      if (req.user.uid === 'demo-department' && roles.includes('department')) {
        req.userProfile = { id: 'demo-department', role: 'department', department: 'Public Works', displayName: 'Public Works Officer' };
        return next();
      }
      if (req.user.uid === 'demo-worker' && roles.includes('worker')) {
        req.userProfile = { id: 'demo-worker', role: 'worker', department: 'Public Works', displayName: 'Field Worker' };
        return next();
      }
    }

    return res.status(403).json({ error: 'Insufficient permissions' });
  };
}

export function errorHandler(err, req, res, _next) {
  console.error('Error:', err.message);
  if (err.retryAfterMs) {
    res.setHeader('Retry-After', Math.max(1, Math.ceil(err.retryAfterMs / 1000)));
  }
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
}
