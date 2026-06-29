import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { config } from '../../config/index.js';

let db = null;
let storage = null;
let auth = null;
let initialized = false;

function loadServiceAccount() {
  if (config.firebase.clientEmail && config.firebase.privateKey) {
    return {
      projectId: config.firebase.projectId,
      clientEmail: config.firebase.clientEmail,
      privateKey: config.firebase.privateKey,
    };
  }

  if (config.firebase.serviceAccountPath) {
    const serviceAccountPath = path.isAbsolute(config.firebase.serviceAccountPath)
      ? config.firebase.serviceAccountPath
      : path.resolve(config.projectRoot, config.firebase.serviceAccountPath);

    if (fs.existsSync(serviceAccountPath)) {
      return JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    }
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }

  return null;
}

export function initializeFirebase() {
  if (initialized) return { db, storage, auth };
  if (!config.flags.enableFirebase) {
    console.warn('Firebase feature disabled by flag.');
    return { db, storage, auth, admin };
  }

  try {
    const serviceAccount = loadServiceAccount();

    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: config.firebase.projectId || serviceAccount.project_id,
        storageBucket: config.firebase.storageBucket,
      });
      db = admin.firestore();
      storage = admin.storage();
      auth = admin.auth();
      initialized = true;
      console.log('Firebase Admin initialized');
    } else if (config.firebase.projectId) {
      try {
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          projectId: config.firebase.projectId,
          storageBucket: config.firebase.storageBucket,
        });
        db = admin.firestore();
        storage = admin.storage();
        auth = admin.auth();
        initialized = true;
        console.log('Firebase Admin initialized via Application Default Credentials');
      } catch {
        console.warn(
          'Firebase Admin credentials not configured. Using Firestore REST API with user tokens when available.'
        );
      }
    } else {
      console.warn('Firebase project not configured.');
    }
  } catch (error) {
    console.error('Firebase initialization error:', error.message);
  }

  return { db, storage, auth, admin };
}

export function isFirebaseAdminReady() {
  if (!initialized) initializeFirebase();
  return Boolean(db);
}

export function isFirebaseConfigured() {
  return Boolean(config.flags.enableFirebase && config.firebase.projectId && config.firebaseWebApiKey);
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
