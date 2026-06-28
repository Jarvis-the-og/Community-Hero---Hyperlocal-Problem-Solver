import { getDb } from '../firebase/index.js';
import { inMemoryStore } from '../../utils/inMemoryStore.js';

const DUPLICATE_RADIUS_KM = 0.5;
const SIMILARITY_THRESHOLD = 0.7;

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function textSimilarity(a, b) {
  if (!a || !b) return 0;
  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = new Set(b.toLowerCase().split(/\s+/));
  const intersection = [...wordsA].filter((w) => wordsB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;
  return union > 0 ? intersection / union : 0;
}

async function getNearbyIssues(lat, lng, radiusKm = DUPLICATE_RADIUS_KM) {
  const db = getDb();

  if (db) {
    const snapshot = await db
      .collection('issues')
      .where('status', 'not-in', ['completed', 'ai_verified', 'rejected'])
      .limit(50)
      .get();

    return snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((issue) => {
        if (!issue.location?.lat || !issue.location?.lng) return false;
        return haversineDistance(lat, lng, issue.location.lat, issue.location.lng) <= radiusKm;
      });
  }

  return inMemoryStore.getIssues().filter((issue) => {
    if (!issue.location?.lat || !issue.location?.lng) return false;
    if (['completed', 'ai_verified', 'rejected'].includes(issue.status)) return false;
    return haversineDistance(lat, lng, issue.location.lat, issue.location.lng) <= radiusKm;
  });
}

export async function findDuplicates({ lat, lng, category, title, description }) {
  const nearby = await getNearbyIssues(lat, lng);
  const matches = [];

  for (const issue of nearby) {
    let similarity = 0;

    if (issue.category === category) similarity += 0.4;

    const titleSim = textSimilarity(title, issue.title);
    const descSim = textSimilarity(description, issue.description);
    similarity += titleSim * 0.3 + descSim * 0.3;

    const distance = haversineDistance(lat, lng, issue.location.lat, issue.location.lng);
    if (distance < 0.1) similarity += 0.2;
    else if (distance < 0.3) similarity += 0.1;

    if (similarity >= SIMILARITY_THRESHOLD) {
      matches.push({
        issueId: issue.id,
        title: issue.title,
        similarity: Math.round(similarity * 100) / 100,
        distance: Math.round(distance * 1000),
        category: issue.category,
        status: issue.status,
      });
    }
  }

  matches.sort((a, b) => b.similarity - a.similarity);

  return {
    isDuplicate: matches.length > 0,
    matches: matches.slice(0, 3),
  };
}

export const DuplicateAgent = { findDuplicates };
