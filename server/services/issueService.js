import { getDb } from '../services/firebase/index.js';
import { inMemoryStore } from '../utils/inMemoryStore.js';
import { IssueStatus } from '@community-hero/shared/enums/index.js';

export async function getIssues(filters = {}) {
  const db = getDb();
  if (db) {
    let query = db.collection('issues').orderBy('createdAt', 'desc');
    if (filters.status) query = query.where('status', '==', filters.status);
    if (filters.category) query = query.where('category', '==', filters.category);
    if (filters.reporterId) query = query.where('reporterId', '==', filters.reporterId);
    const snapshot = await query.limit(100).get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }
  return inMemoryStore.getIssues(filters);
}

export async function getIssueById(id) {
  const db = getDb();
  if (db) {
    const doc = await db.collection('issues').doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  }
  return inMemoryStore.getIssue(id);
}

export async function createIssue(data) {
  const db = getDb();
  const issueData = {
    ...data,
    supportCount: 0,
    verificationScore: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    timeline: data.timeline || [
      { status: IssueStatus.REPORTED, label: 'Reported', timestamp: new Date().toISOString() },
    ],
  };

  if (db) {
    const ref = await db.collection('issues').add(issueData);
    return { id: ref.id, ...issueData };
  }
  return inMemoryStore.createIssue(issueData);
}

export async function updateIssue(id, updates) {
  const db = getDb();
  const updateData = { ...updates, updatedAt: new Date().toISOString() };

  if (db) {
    await db.collection('issues').doc(id).update(updateData);
    return getIssueById(id);
  }
  return inMemoryStore.updateIssue(id, updateData);
}

export async function addTimelineEvent(id, event) {
  const issue = await getIssueById(id);
  if (!issue) return null;
  const timeline = [...(issue.timeline || []), event];
  return updateIssue(id, { timeline, status: event.status });
}

export async function getNearbyIssues(lat, lng, radiusKm = 5) {
  const issues = await getIssues();
  return issues.filter((issue) => {
    if (!issue.location?.lat || !issue.location?.lng) return false;
    const R = 6371;
    const dLat = ((issue.location.lat - lat) * Math.PI) / 180;
    const dLng = ((issue.location.lng - lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat * Math.PI) / 180) *
        Math.cos((issue.location.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return distance <= radiusKm;
  });
}

export async function supportIssue(id) {
  const issue = await getIssueById(id);
  if (!issue) return null;
  return updateIssue(id, { supportCount: (issue.supportCount || 0) + 1 });
}

export async function getUser(id) {
  const db = getDb();
  if (db) {
    const doc = await db.collection('users').doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  }
  return inMemoryStore.getUser(id);
}

export async function upsertUser(data) {
  const db = getDb();
  const userData = { ...data, updatedAt: new Date().toISOString() };

  if (db) {
    await db.collection('users').doc(data.id).set(userData, { merge: true });
    return { id: data.id, ...userData };
  }
  return inMemoryStore.upsertUser(userData);
}

export async function addPoints(userId, points) {
  const user = await getUser(userId);
  if (!user) return null;
  return upsertUser({ ...user, points: (user.points || 0) + points });
}

export async function getComments(issueId) {
  const db = getDb();
  if (db) {
    const snapshot = await db
      .collection('comments')
      .where('issueId', '==', issueId)
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }
  return inMemoryStore.getComments(issueId);
}

export async function addComment(data) {
  const db = getDb();
  const commentData = { ...data, createdAt: new Date().toISOString() };

  if (db) {
    const ref = await db.collection('comments').add(commentData);
    return { id: ref.id, ...commentData };
  }
  return inMemoryStore.addComment(commentData);
}

export async function addVerification(data) {
  const db = getDb();
  const verificationData = { ...data, createdAt: new Date().toISOString() };

  if (db) {
    const ref = await db.collection('verifications').add(verificationData);
    return { id: ref.id, ...verificationData };
  }
  return inMemoryStore.addVerification(verificationData);
}

export async function getVerifications(issueId) {
  const db = getDb();
  if (db) {
    const snapshot = await db.collection('verifications').where('issueId', '==', issueId).get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }
  return inMemoryStore.getVerifications(issueId);
}

export async function getNotifications(userId) {
  const db = getDb();
  if (db) {
    const snapshot = await db
      .collection('notifications')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }
  return inMemoryStore.getNotifications(userId);
}

export async function getLeaderboard(limit = 10) {
  const db = getDb();
  if (db) {
    const snapshot = await db.collection('users').orderBy('points', 'desc').limit(limit).get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }
  return inMemoryStore.getLeaderboard(limit);
}

export async function getAnalytics() {
  const db = getDb();
  if (db) {
    const snapshot = await db.collection('issues').get();
    const issues = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const resolved = issues.filter((i) =>
      ['completed', 'ai_verified'].includes(i.status)
    ).length;

    const categoryCounts = {};
    issues.forEach((i) => {
      categoryCounts[i.category] = (categoryCounts[i.category] || 0) + 1;
    });

    return {
      totalIssues: issues.length,
      resolvedIssues: resolved,
      resolutionRate: issues.length ? Math.round((resolved / issues.length) * 100) : 0,
      avgRepairTimeHours: 48,
      activeUsers: (await db.collection('users').get()).size,
      categoryBreakdown: categoryCounts,
      mostCommonIssue: Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'none',
      criticalCount: issues.filter((i) => i.priority === 'critical').length,
      mediumCount: issues.filter((i) => i.priority === 'medium').length,
      lowCount: issues.filter((i) => i.priority === 'low').length,
    };
  }
  return inMemoryStore.getAnalytics();
}

export async function uploadMedia(buffer, filename, mimeType) {
  const { getStorage } = await import('../services/firebase/index.js');
  const storage = getStorage();

  if (storage) {
    const bucket = storage.bucket();
    const file = bucket.file(`issues/${Date.now()}-${filename}`);
    await file.save(buffer, { metadata: { contentType: mimeType } });
    await file.makePublic();
    return `https://storage.googleapis.com/${bucket.name}/${file.name}`;
  }

  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}
