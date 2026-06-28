import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  geminiApiKey: process.env.GEMINI_API_KEY,
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  },
};

export function validateConfig() {
  const required = ['GEMINI_API_KEY'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.warn(`Warning: Missing env vars: ${missing.join(', ')}. Some features may not work.`);
  }
}
