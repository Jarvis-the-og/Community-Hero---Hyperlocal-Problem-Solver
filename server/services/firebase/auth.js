import { getAuth } from './index.js';
import { config } from '../../config/index.js';

export async function verifyIdToken(idToken) {
  const auth = getAuth();
  if (auth) {
    const decoded = await auth.verifyIdToken(idToken);
    return {
      uid: decoded.uid,
      email: decoded.email,
      name: decoded.name || decoded.email?.split('@')[0] || 'User',
    };
  }

  if (!config.firebaseWebApiKey) {
    throw new Error('Firebase not configured for token verification');
  }

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${config.firebaseWebApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    }
  );

  const data = await res.json();
  if (!res.ok || !data.users?.[0]) {
    throw new Error(data.error?.message || 'Invalid authentication token');
  }

  const user = data.users[0];
  return {
    uid: user.localId,
    email: user.email,
    name: user.displayName || user.email?.split('@')[0] || 'User',
  };
}
