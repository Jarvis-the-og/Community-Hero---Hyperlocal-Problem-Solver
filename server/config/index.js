import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');
const rootEnv = path.resolve(__dirname, '../../.env');
const serverEnv = path.resolve(__dirname, '../.env');
dotenv.config({ path: rootEnv });
dotenv.config({ path: serverEnv });

function envFlag(name, defaultValue = false) {
  const value = process.env[name];
  if (value === undefined) return defaultValue;
  return !['false', '0', 'off', 'no'].includes(value.toLowerCase());
}

export const config = {
  projectRoot,
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  flags: {
    enableAI: envFlag('ENABLE_AI', true) && Boolean(process.env.GROQ_API_KEY),
    enableMaps: envFlag('ENABLE_MAPS', true),
    enableChatbot: envFlag('ENABLE_CHATBOT', true),
    enableFirebase: envFlag('ENABLE_FIREBASE', true),
    demoMode: envFlag('DEMO_MODE', false),
  },
  groqApiKey: process.env.GROQ_API_KEY,
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
  firebaseWebApiKey:
    process.env.FIREBASE_WEB_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    storageBucket:
      process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
  },
};

export function isDemoMode() {
  return config.flags.demoMode || !config.flags.enableFirebase;
}

export function validateConfig() {
  const warnings = [];
  if (config.flags.enableAI && !config.groqApiKey) warnings.push('GROQ_API_KEY');
  if (config.flags.enableMaps && !process.env.GOOGLE_MAPS_API_KEY) warnings.push('GOOGLE_MAPS_API_KEY');
  if (config.flags.enableFirebase && !config.firebase.projectId) warnings.push('FIREBASE_PROJECT_ID');

  // Only warn about missing explicit credentials when ADC is also unavailable.
  // On Cloud Run the attached service account provides ADC automatically, so
  // FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY are not required in that env.
  if (
    config.flags.enableFirebase &&
    !config.firebase.clientEmail &&
    !config.firebase.privateKey &&
    !process.env.FIREBASE_SERVICE_ACCOUNT_JSON &&
    !process.env.GOOGLE_APPLICATION_CREDENTIALS
  ) {
    console.info(
      'Firebase Admin: no explicit credentials set — will attempt Application Default Credentials (ADC). ' +
      'On Cloud Run this works automatically via the attached service account.'
    );
  }

  if (warnings.length > 0) {
    console.warn(`Warning: Missing env vars: ${warnings.join(', ')}. Some features may not work.`);
  }
}
