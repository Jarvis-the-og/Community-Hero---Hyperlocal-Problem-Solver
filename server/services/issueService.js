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
      if (filters.department) query = query.where('department', '==', filters.department);
      if (filters.assignedTo) query = query.where('assignedTo', '==', filters.assignedTo);
      const snapshot = await query.limit(200).get();
      let docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      docs = applyClientFilters(docs, filters);
      return docs;
    } catch (error) {
      // Composite index not ready yet — fall back to unordered query and sort in memory
      if (error.code === 9 || String(error.message).includes('index')) {
        let query = db.collection('issues');
        if (filters.status) query = query.where('status', '==', filters.status);
        if (filters.category) query = query.where('category', '==', filters.category);
        if (filters.reporterId) query = query.where('reporterId', '==', filters.reporterId);
        if (filters.department) query = query.where('department', '==', filters.department);
        if (filters.assignedTo) query = query.where('assignedTo', '==', filters.assignedTo);
        const snapshot = await query.limit(200).get();
        let docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        docs = applyClientFilters(docs, filters);
        return docs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }
      throw error;
    }
  }

  if (useFirestoreRest()) {
    const issues = await restGetCollection('issues', filters);
    return applyClientFilters(issues, filters);
  }

  return applyClientFilters(inMemoryStore.getIssues(filters), filters);
}

function applyClientFilters(issues, filters) {
  let result = issues;
  if (filters.priority) {
    result = result.filter((i) => i.priority === filters.priority);
  }
  if (filters.ward) {
    result = result.filter((i) => i.location?.ward === filters.ward);
  }
  if (filters.dateFrom) {
    const from = new Date(filters.dateFrom).getTime();
    result = result.filter((i) => new Date(i.createdAt).getTime() >= from);
  }
  if (filters.dateTo) {
    const to = new Date(filters.dateTo).getTime();
    result = result.filter((i) => new Date(i.createdAt).getTime() <= to);
  }
  return result;
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

export async function getUserByEmail(email) {
  if (!email) return null;

  const db = getDb();
  if (db) {
    const snapshot = await db.collection('users').where('email', '==', email).limit(1).get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  return inMemoryStore.getUsersByEmail?.(email) || null;
}

export async function migrateUserReferences(fromId, toId, email = null) {
  if (!fromId || !toId || fromId === toId) return;

  const db = getDb();
  if (db) {
    const refs = [];
    const seen = new Set();
    const addRef = (docRef) => {
      if (!docRef?.path || seen.has(docRef.path)) return;
      seen.add(docRef.path);
      refs.push(docRef);
    };

    const issueQueries = [
      ['reporterId', fromId],
      ['assignedTo', fromId],
      ...(email ? [['reporterEmail', email], ['assignedToEmail', email]] : []),
    ];
    for (const [field, value] of issueQueries) {
      const snapshot = await db.collection('issues').where(field, '==', value).get();
      snapshot.docs.forEach((doc) => addRef(doc.ref));
    }

    for (const docRef of refs) {
      const issue = (await docRef.get()).data() || {};
      const updates = {};
      if (issue.reporterId === fromId || (email && issue.reporterEmail === email)) updates.reporterId = toId;
      if (issue.assignedTo === fromId || (email && issue.assignedToEmail === email)) updates.assignedTo = toId;
      if (Object.keys(updates).length) {
        await docRef.update(updates);
      }
    }

    const notificationSnapshot = await db.collection('notifications').where('userId', '==', fromId).get();
    const emailNotificationSnapshot = email
      ? await db.collection('notifications').where('userId', '==', email).get()
      : { docs: [] };
    const notificationRefs = new Map();
    [...notificationSnapshot.docs, ...emailNotificationSnapshot.docs].forEach((doc) => {
      notificationRefs.set(doc.ref.path, doc.ref);
    });
    for (const docRef of notificationRefs.values()) {
      await docRef.update({ userId: toId });
    }

    const userDoc = await db.collection('users').doc(fromId).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      await db.collection('users').doc(toId).set(
        {
          ...userData,
          id: toId,
          email: email || userData.email,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      await db.collection('users').doc(fromId).delete().catch(() => {});
    }

    if (email && email !== fromId) {
      const emailUserDoc = await db.collection('users').doc(email).get();
      if (emailUserDoc.exists) {
        const userData = emailUserDoc.data();
        await db.collection('users').doc(toId).set(
          {
            ...userData,
            id: toId,
            email,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
        await db.collection('users').doc(email).delete().catch(() => {});
      }
    }

    return;
  }

  inMemoryStore.migrateUserReferences?.(fromId, toId, email);
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
    try {
      const snapshot = await db
        .collection('notifications')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      if (error.code === 9 || String(error.message).includes('index')) {
        const snapshot = await db.collection('notifications').where('userId', '==', userId).get();
        return snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 50);
      }
      throw error;
    }
  }

  if (useFirestoreRest()) {
    const notifications = await restQueryCollection('notifications', 'userId', 'EQUAL', userId);
    return notifications
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 50);
  }

  return inMemoryStore.getNotifications(userId);
}

export async function markNotificationRead(id) {
  const db = getDb();
  if (db) {
    await db.collection('notifications').doc(id).update({ read: true });
    return { success: true };
  }
  return inMemoryStore.markNotificationRead(id);
}

export async function getUsersByRole(role) {
  const db = getDb();
  if (db) {
    const snapshot = await db.collection('users').where('role', '==', role).get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }
  if (useFirestoreRest()) {
    const users = await restGetCollection('users');
    return users.filter((u) => u.role === role);
  }
  return inMemoryStore.getUsersByRole(role);
}

export async function getWorkers(department = null) {
  const workers = await getUsersByRole('worker');
  if (!department) return workers;
  return workers.filter((w) => w.department === department);
}

export async function addInternalComment(issueId, data) {
  const commentData = omitUndefinedValues({
    ...data,
    issueId,
    isInternal: true,
    createdAt: new Date().toISOString(),
  });

  const db = getDb();
  if (db) {
    const ref = await db.collection('internalComments').add(commentData);
    return { id: ref.id, ...commentData };
  }
  return inMemoryStore.addInternalComment(commentData);
}

export async function getInternalComments(issueId) {
  const db = getDb();
  if (db) {
    const snapshot = await db.collection('internalComments').where('issueId', '==', issueId).get();
    return snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  return inMemoryStore.getInternalComments(issueId);
}

export async function getSimilarIssues(issue, radiusKm = 1) {
  const all = await getIssues();
  return all
    .filter((i) => i.id !== issue.id && i.category === issue.category)
    .map((i) => {
      if (!i.location?.lat || !issue.location?.lat) return null;
      const R = 6371;
      const dLat = ((i.location.lat - issue.location.lat) * Math.PI) / 180;
      const dLng = ((i.location.lng - issue.location.lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((issue.location.lat * Math.PI) / 180) *
          Math.cos((i.location.lat * Math.PI) / 180) *
          Math.sin(dLng / 2) ** 2;
      const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return distance <= radiusKm ? { ...i, distance: Math.round(distance * 1000) } : null;
    })
    .filter(Boolean)
    .slice(0, 5);
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

function computeDepartmentBreakdown(issues) {
  const counts = {};
  issues.forEach((i) => {
    const dept = i.department || 'Unassigned';
    counts[dept] = (counts[dept] || 0) + 1;
  });
  return counts;
}

function computeWardBreakdown(issues) {
  const counts = {};
  issues.forEach((i) => {
    const ward = i.location?.ward || 'Unknown';
    counts[ward] = (counts[ward] || 0) + 1;
  });
  return counts;
}

function computeDepartmentPerformance(issues) {
  const depts = {};
  issues.forEach((i) => {
    const dept = i.department || 'Unassigned';
    if (!depts[dept]) depts[dept] = { total: 0, resolved: 0, pending: 0, avgHours: 0, hours: [] };
    depts[dept].total++;
    if (['completed', 'ai_verified'].includes(i.status)) {
      depts[dept].resolved++;
      if (i.createdAt && i.updatedAt) {
        depts[dept].hours.push((new Date(i.updatedAt) - new Date(i.createdAt)) / 3600000);
      }
    } else if (!['rejected'].includes(i.status)) {
      depts[dept].pending++;
    }
  });

  return Object.entries(depts).map(([name, data]) => ({
    name,
    total: data.total,
    resolved: data.resolved,
    pending: data.pending,
    resolutionRate: data.total ? Math.round((data.resolved / data.total) * 100) : 0,
    avgHours: data.hours.length ? Math.round(data.hours.reduce((a, b) => a + b, 0) / data.hours.length) : 0,
  }));
}

function computeResolutionTrends(issues) {
  const trends = {};
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    trends[date.toISOString().slice(0, 10)] = { reported: 0, resolved: 0 };
  }
  issues.forEach((i) => {
    if (i.createdAt) {
      const key = i.createdAt.slice(0, 10);
      if (trends[key]) trends[key].reported++;
    }
    if (['completed', 'ai_verified'].includes(i.status) && i.updatedAt) {
      const key = i.updatedAt.slice(0, 10);
      if (trends[key]) trends[key].resolved++;
    }
  });
  return trends;
}

function computePeakReportingHours(issues) {
  const hours = Array(24).fill(0);
  issues.forEach((i) => {
    if (!i.createdAt) return;
    hours[new Date(i.createdAt).getHours()]++;
  });
  return hours.map((count, hour) => ({ hour, count }));
}

function computeCitizenSatisfaction(issues) {
  const confirmed = issues.filter((i) => i.citizenConfirmed === true).length;
  const rejected = issues.filter((i) => i.citizenConfirmed === false).length;
  const total = confirmed + rejected;
  return total ? Math.round((confirmed / total) * 100) : null;
}

function generateAiInsights(issues) {
  const insights = [];
  const trends = computeIssueTrends(issues);
  const trendValues = Object.values(trends);
  if (trendValues.length >= 2 && trendValues[trendValues.length - 1] > trendValues[0] * 1.5) {
    insights.push('Complaint frequency is increasing in the last 7 days — consider allocating additional field resources.');
  }

  const deptPerf = computeDepartmentPerformance(issues);
  const slowest = deptPerf.sort((a, b) => b.avgHours - a.avgHours)[0];
  if (slowest?.avgHours > 48) {
    insights.push(`${slowest.name} has the longest average resolution time (${slowest.avgHours}h). Review workload distribution.`);
  }

  const criticalPending = issues.filter((i) => i.priority === 'critical' && !['completed', 'ai_verified', 'rejected'].includes(i.status));
  if (criticalPending.length > 3) {
    insights.push(`${criticalPending.length} critical issues remain unresolved — high-risk zones may need immediate attention.`);
  }

  const wardCounts = computeWardBreakdown(issues);
  const topWard = Object.entries(wardCounts).sort((a, b) => b[1] - a[1])[0];
  if (topWard && topWard[1] > 2) {
    insights.push(`${topWard[0]} ward has the highest complaint volume (${topWard[1]} issues) — recurring infrastructure problems likely.`);
  }

  const escalated = issues.filter((i) => i.status === 'escalated').length;
  if (escalated > 0) {
    insights.push(`${escalated} issue(s) have exceeded SLA and been escalated.`);
  }

  return insights.length ? insights : ['City-wide complaint levels are within normal range. Continue monitoring department performance.'];
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
        activeIssues: issues.filter((i) => !['ai_verified', 'rejected'].includes(i.status)).length,
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
        departmentBreakdown: computeDepartmentBreakdown(issues),
        wardBreakdown: computeWardBreakdown(issues),
        departmentPerformance: computeDepartmentPerformance(issues),
        resolutionTrends: computeResolutionTrends(issues),
        peakReportingHours: computePeakReportingHours(issues),
        aiInsights: generateAiInsights(issues),
        citizenSatisfaction: computeCitizenSatisfaction(issues),
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
