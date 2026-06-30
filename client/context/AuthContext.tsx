'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  setPersistence,
  browserLocalPersistence,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { getFirebaseAuth, getGoogleProvider, isFirebaseConfigured } from '@/lib/firebase';
import { api, User } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  token: string | null;
  signIn: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string, displayName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  isDemo: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const isDemo = !isFirebaseConfigured();
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncProfile = useCallback(async (fbUser: FirebaseUser) => {
    const idToken = await fbUser.getIdToken();
    setToken(idToken);
    try {
      const { user: profile } = await api.getProfile(idToken);
      setUser(profile);
    } catch (e: any) {
      try {
        const { user: profile } = await api.syncUser(
          { displayName: fbUser.displayName || 'User', photoURL: fbUser.photoURL || undefined },
          idToken
        );
        setUser(profile);
      } catch (innerError) {
        // Token is likely invalid or revoked on the backend
        setUser(null);
        const auth = getFirebaseAuth();
        if (auth) await firebaseSignOut(auth);
      }
    }
  }, []);

  const ensurePersistence = useCallback(async (auth: ReturnType<typeof getFirebaseAuth>) => {
    if (!auth) return;
    try {
      await setPersistence(auth, browserLocalPersistence);
    } catch {
      // Local persistence is best-effort; auth still functions without it.
    }
  }, []);

  // We don't debounce here to avoid race conditions with setLoading(false).
  // onAuthStateChanged shouldn't fire rapidly enough to cause issues in normal flows.

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setLoading(false);
      return;
    }

    void ensurePersistence(auth);

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          await syncProfile(fbUser);
        } finally {
          setLoading(false);
        }
      } else {
        setUser(null);
        setToken(null);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, [isDemo, syncProfile, ensurePersistence]);

  const signIn = async () => {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error('Firebase Auth unavailable');
    try {
      await ensurePersistence(auth);
      const result = await signInWithPopup(auth, getGoogleProvider());
      await syncProfile(result.user);
    } catch (error: any) {
      // User closed the popup — not an error worth surfacing
      if (error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request') {
        return;
      }
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error('Firebase Auth unavailable');
    await ensurePersistence(auth);
    const result = await signInWithEmailAndPassword(auth, email, password);
    await syncProfile(result.user);
  };

  const registerWithEmail = async (email: string, password: string, displayName?: string) => {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error('Firebase Auth unavailable');
    await ensurePersistence(auth);
    const result = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName && result.user) {
      await updateProfile(result.user, { displayName });
    }
    await syncProfile(result.user);
  };

  const signOut = async () => {
    const auth = getFirebaseAuth();
    if (auth) await firebaseSignOut(auth);
    setUser(null);
    setToken(null);
    setFirebaseUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, firebaseUser, loading, token, signIn, signInWithEmail, registerWithEmail, signOut, isDemo }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
