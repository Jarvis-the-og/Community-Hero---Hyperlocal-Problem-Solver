import admin from 'firebase-admin';
import { config } from '../../config/index.js';

let db = null;
let storage = null;
let auth = null;
let initialized = false;

export function initializeFirebase() {
  if (initialized) return { db, storage, auth };

  try {
    if (config.firebase.projectId && config.firebase.clientEmail && config.firebase.privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: config.firebase.projectId,
          clientEmail: config.firebase.clientEmail,
          privateKey: config.firebase.privateKey,
        }),
        storageBucket: config.firebase.storageBucket,
      });
      db = admin.firestore();
      storage = admin.storage();
      auth = admin.auth();
      initialized = true;
      console.log('Firebase Admin initialized');
    } else {
      console.warn('Firebase credentials not configured. Using in-memory fallback.');
    }
  } catch (error) {
    console.error('Firebase initialization error:', error.message);
  }

  return { db, storage, auth, admin };
}

export function getDb() {
  if (!db) initializeFirebase();
  return db;
}

export function getStorage() {
  if (!storage) initializeFirebase();
  return storage;
}

export function getAuth() {
  if (!auth) initializeFirebase();
  return auth;
}

export { admin };
