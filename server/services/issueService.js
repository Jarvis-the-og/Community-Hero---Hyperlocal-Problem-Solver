import { getDb, getStorage, isFirebaseAdminReady } from '../services/firebase/index.js';
import { inMemoryStore } from '../utils/inMemoryStore.js';
import {
  isRestClientAvailable,
  restGetCollection,
  restGetDoc,
  restAddDoc,
  restUpdateDoc,
  restQueryCollection,
} from '../services/firestore/restClient.js';
import { IssueStatus } from '@community-hero/shared/enums/index.js';
import { createCacheKey, withGovernedRequest } from './governance/index.js';

function useFirestoreRest() {
  return !isFirebaseAdminReady() && isRestClientAvailable();
}

function omitUndefinedValues(value) {
  if (Array.isArray(value)) {
    return value.map(omitUndefinedValues).filter((item) => item !== undefined);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entryValue]) => entryValue !== undefined)
        .map(([key, entryValue]) => [key, omitUndefinedValues(entryValue)])
    );
  }

  return value;
}

export async function getIssues(filters = {}) {
  const db = getDb();
  if (db) {
    try {
      let query = db.collection('issues').orderBy('createdAt', 'desc');
      if (filters.status) query = query.where('status', '==', filters.status);
      if (filters.category) query = query.where('category', '==', filters.category);
      if (filters.reporterId) query = query.where('reporterId', '==', filters.reporterId);
      const snapshot = await query.limit(100).get();
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      // Composite index not ready yet — fall back to unordered query and sort in memory
      if (error.code === 9 || String(error.message).includes('index')) {
        let query = db.collection('issues');
        if (filters.status) query = query.where('status', '==', filters.status);
        if (filters.category) query = query.where('category', '==', filters.category);
        if (filters.reporterId) query = query.where('reporterId', '==', filters.reporterId);
        const snapshot = await query.limit(100).get();
        const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        return docs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }
      throw error;
    }
  }

  if (useFirestoreRest()) {
    return restGetCollection('issues', filters);
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

  if (useFirestoreRest()) {
    return restGetDoc('issues', id);
  }

  return inMemoryStore.getIssue(id);
}

export async function createIssue(data) {
  const issueData = omitUndefinedValues({
    ...data,
    supportCount: data.supportCount ?? 0,
    verificationScore: data.verificationScore ?? 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    timeline: data.timeline || [
      { status: IssueStatus.REPORTED, label: 'Reported', timestamp: new Date().toISOString() },
    ],
  });

  const db = getDb();
  if (db) {
    const ref = await db.collection('issues').add(issueData);
    return { id: ref.id, ...issueData };
  }

  if (useFirestoreRest()) {
    return restAddDoc('issues', issueData);
  }

  return inMemoryStore.createIssue(issueData);
}

export async function updateIssue(id, updates) {
  const updateData = omitUndefinedValues({ ...updates, updatedAt: new Date().toISOString() });

  const db = getDb();
  if (db) {
    await db.collection('issues').doc(id).update(updateData);
    return getIssueById(id);
  }

  if (useFirestoreRest()) {
    await restUpdateDoc('issues', id, updateData);
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

  if (useFirestoreRest()) {
    return restGetDoc('users', id);
  }

  return inMemoryStore.getUser(id);
}

export async function upsertUser(data) {
  const userData = omitUndefinedValues({ ...data, updatedAt: new Date().toISOString() });

  const db = getDb();
  if (db) {
    await db.collection('users').doc(data.id).set(userData, { merge: true });
    return { id: data.id, ...userData };
  }

  if (useFirestoreRest()) {
    const existing = await restGetDoc('users', data.id);
    if (existing) {
      await restUpdateDoc('users', data.id, userData);
    } else {
      await restAddDoc('users', userData, data.id);
    }
    return { id: data.id, ...userData };
  }

  return inMemoryStore.upsertUser(userData);
}

export async function addPoints(userId, points) {
  const user = await getUser(userId);
  if (!user) return null;
  const trustScore = Math.min(100, (user.trustScore || 50) + Math.floor(points / 5));
  return upsertUser({
    ...user,
    points: (user.points || 0) + points,
    trustScore,
  });
}

export async function getComments(issueId) {
  const db = getDb();
  if (db) {
    try {
      const snapshot = await db
        .collection('comments')
        .where('issueId', '==', issueId)
        .orderBy('createdAt', 'desc')
        .get();
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      // Index not ready — fall back to unordered and sort in memory
      if (error.code === 9 || String(error.message).includes('index')) {
        const snapshot = await db
          .collection('comments')
          .where('issueId', '==', issueId)
          .get();
        const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        return docs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }
      throw error;
    }
  }

  if (useFirestoreRest()) {
    const comments = await restQueryCollection('comments', 'issueId', 'EQUAL', issueId);
    return comments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  return inMemoryStore.getComments(issueId);
}

export async function addComment(data) {
  const commentData = omitUndefinedValues({ ...data, createdAt: new Date().toISOString() });

  const db = getDb();
  if (db) {
    const ref = await db.collection('comments').add(commentData);
    return { id: ref.id, ...commentData };
  }

  if (useFirestoreRest()) {
    return restAddDoc('comments', commentData);
  }

  return inMemoryStore.addComment(commentData);
}

export async function addVerification(data) {
  const verificationData = omitUndefinedValues({ ...data, createdAt: new Date().toISOString() });

  const db = getDb();
  if (db) {
    const ref = await db.collection('verifications').add(verificationData);
    return { id: ref.id, ...verificationData };
  }

  if (useFirestoreRest()) {
    return restAddDoc('verifications', verificationData);
  }

  return inMemoryStore.addVerification(verificationData);
}

export async function getVerifications(issueId) {
  const db = getDb();
  if (db) {
    const snapshot = await db.collection('verifications').where('issueId', '==', issueId).get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  if (useFirestoreRest()) {
    return restQueryCollection('verifications', 'issueId', 'EQUAL', issueId);
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

  if (useFirestoreRest()) {
    const notifications = await restQueryCollection('notifications', 'userId', 'EQUAL', userId);
    return notifications
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 50);
  }

  return inMemoryStore.getNotifications(userId);
}

export async function getLeaderboard(limit = 10) {
  const db = getDb();
  if (db) {
    const snapshot = await db.collection('users').orderBy('points', 'desc').limit(limit).get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  if (useFirestoreRest()) {
    const users = await restGetCollection('users');
    return users
      .filter((u) => (u.points || 0) > 0)
      .sort((a, b) => (b.points || 0) - (a.points || 0))
      .slice(0, limit);
  }

  return inMemoryStore.getLeaderboard(limit);
}

function computeAvgRepairTimeHours(issues) {
  const resolved = issues.filter((i) =>
    ['completed', 'ai_verified'].includes(i.status) && i.createdAt && i.updatedAt
  );
  if (!resolved.length) return 0;

  const totalHours = resolved.reduce((sum, issue) => {
    const created = new Date(issue.createdAt).getTime();
    const updated = new Date(issue.updatedAt).getTime();
    return sum + (updated - created) / 3600000;
  }, 0);

  return Math.round(totalHours / resolved.length);
}

function computeIssueTrends(issues) {
  const trends = {};
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    trends[key] = 0;
  }

  issues.forEach((issue) => {
    if (!issue.createdAt) return;
    const key = issue.createdAt.slice(0, 10);
    if (key in trends) trends[key]++;
  });

  return trends;
}

export async function getAnalytics() {
  return withGovernedRequest({
    api: 'firestore',
    operation: 'analytics_summary',
    cacheKey: createCacheKey('firestore:analytics', { scope: 'global' }),
    cacheTtlMs: 2 * 60 * 1000,
    timeoutMs: 15_000,
    requestFn: async () => {
      const db = getDb();
      let issues = [];
      let usersCount = 0;

      if (db) {
        const snapshot = await db.collection('issues').get();
        issues = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        usersCount = (await db.collection('users').get()).size;
      } else if (useFirestoreRest()) {
        issues = await restGetCollection('issues');
        usersCount = (await restGetCollection('users')).length;
      } else {
        return inMemoryStore.getAnalytics();
      }

      const resolved = issues.filter((i) => ['completed', 'ai_verified'].includes(i.status)).length;

      const categoryCounts = {};
      issues.forEach((i) => {
        categoryCounts[i.category] = (categoryCounts[i.category] || 0) + 1;
      });

      const topContributors = (await getLeaderboard(5)).map((u) => ({
        id: u.id,
        displayName: u.displayName,
        points: u.points || 0,
        trustScore: u.trustScore || 50,
      }));

      return {
        totalIssues: issues.length,
        resolvedIssues: resolved,
        resolutionRate: issues.length ? Math.round((resolved / issues.length) * 100) : 0,
        avgRepairTimeHours: computeAvgRepairTimeHours(issues),
        activeUsers: usersCount,
        categoryBreakdown: categoryCounts,
        mostCommonIssue: Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'none',
        criticalCount: issues.filter((i) => i.priority === 'critical').length,
        mediumCount: issues.filter((i) => i.priority === 'medium').length,
        lowCount: issues.filter((i) => i.priority === 'low').length,
        issueTrends: computeIssueTrends(issues),
        topContributors,
      };
    },
  });
}

export async function uploadMedia(buffer, filename, mimeType) {
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
