'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
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
    } catch {
      const { user: profile } = await api.syncUser(
        { displayName: fbUser.displayName || 'User', photoURL: fbUser.photoURL || undefined },
        idToken
      );
      setUser(profile);
    }
  }, []);

  // Debounced version — collapses rapid auth state fires into one request
  const debouncedSyncProfile = useCallback((fbUser: FirebaseUser) => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => syncProfile(fbUser), 300);
  }, [syncProfile]);

  useEffect(() => {
    if (isDemo) {
      setLoading(false);
      return;
    }

    const auth = getFirebaseAuth();
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        await debouncedSyncProfile(fbUser);
      } else {
        setUser(null);
        setToken(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [isDemo, debouncedSyncProfile]);

  const signIn = async () => {
    if (isDemo) {
      throw new Error('Firebase is not configured. Add environment variables to enable sign-in.');
    }
    const auth = getFirebaseAuth();
    if (!auth) throw new Error('Firebase Auth unavailable');
    try {
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

  const signOut = async () => {
    const auth = getFirebaseAuth();
    if (auth) await firebaseSignOut(auth);
    setUser(null);
    setToken(null);
    setFirebaseUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, token, signIn, signOut, isDemo }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
