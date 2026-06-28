import { getAuth } from '../services/firebase/index.js';

export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    req.user = { uid: 'demo-user', email: 'demo@communityhero.app', name: 'Demo User' };
    return next();
  }

  const token = authHeader.split('Bearer ')[1];
  const auth = getAuth();

  if (!auth) {
    req.user = { uid: 'demo-user', email: 'demo@communityhero.app', name: 'Demo User' };
    return next();
  }

  try {
    const decoded = await auth.verifyIdToken(token);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid authentication token' });
  }
}

export function requireRole(...roles) {
  return async (req, res, next) => {
    const { getUser } = await import('../services/issueService.js');
    const user = await getUser(req.user.uid);

    if (!user || !roles.includes(user.role)) {
      if (req.user.uid === 'demo-authority' && roles.includes('authority')) {
        return next();
      }
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    req.userProfile = user;
    next();
  };
}

export function errorHandler(err, req, res, _next) {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
}
