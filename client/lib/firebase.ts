import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAnalytics, isSupported, Analytics } from 'firebase/analytics';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let googleProvider: GoogleAuthProvider | null = null;
let analytics: Analytics | null = null;

export function isFirebaseConfigured() {
  return Boolean(
    typeof window !== 'undefined' &&
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== 'your-api-key'
  );
}

function getFirebaseApp() {
  if (!isFirebaseConfigured()) return null;
  if (!app) {
    app = getApps().length === 0
      ? initializeApp({
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
          appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
          measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
        })
      : getApps()[0];
  }
  return app;
}

export function getFirebaseAuth() {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return null;
  if (!auth) auth = getAuth(firebaseApp);
  return auth;
}

export function getFirebaseDb() {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return null;
  if (!db) db = getFirestore(firebaseApp);
  return db;
}

export function getFirebaseStorage() {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return null;
  if (!storage) storage = getStorage(firebaseApp);
  return storage;
}

export async function getFirebaseAnalytics() {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return null;
  if (!analytics && await isSupported()) {
    analytics = getAnalytics(firebaseApp);
  }
  return analytics;
}

export function getGoogleProvider() {
  if (!googleProvider) googleProvider = new GoogleAuthProvider();
  return googleProvider;
}

// Legacy exports for compatibility
export { getFirebaseAuth as auth, getFirebaseDb as db, getFirebaseStorage as storage, getGoogleProvider as googleProvider };
