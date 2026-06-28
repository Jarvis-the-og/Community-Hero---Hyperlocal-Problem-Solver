import { v4 as uuidv4 } from 'uuid';
import { IssueStatus, Severity, Priority, IssueCategory } from '@community-hero/shared/enums/index.js';

const store = {
  users: new Map(),
  issues: new Map(),
  comments: new Map(),
  verifications: new Map(),
  notifications: new Map(),
  seeded: false,
};

function seedDemoData() {
  if (store.seeded) return;
  store.seeded = true;

  const demoIssues = [
    {
      title: 'Large Pothole on Main Street',
      description: 'Deep pothole causing vehicle damage near the intersection.',
      category: IssueCategory.POTHOLE,
      severity: Severity.CRITICAL,
      priority: Priority.CRITICAL,
      status: IssueStatus.COMMUNITY_VERIFIED,
      location: { lat: 28.6139, lng: 77.209, address: 'Connaught Place, New Delhi' },
      supportCount: 12,
      verificationScore: 85,
      department: 'Public Works',
    },
    {
      title: 'Overflowing Garbage Bin',
      description: 'Municipal garbage bin overflowing for 3 days.',
      category: IssueCategory.GARBAGE,
      severity: Severity.MEDIUM,
      priority: Priority.MEDIUM,
      status: IssueStatus.ASSIGNED,
      location: { lat: 28.6205, lng: 77.215, address: 'Janpath, New Delhi' },
      supportCount: 5,
      verificationScore: 70,
      department: 'Sanitation',
    },
    {
      title: 'Broken Streetlight',
      description: 'Streetlight not working, area is dark at night.',
      category: IssueCategory.BROKEN_STREETLIGHT,
      severity: Severity.MEDIUM,
      priority: Priority.MEDIUM,
      status: IssueStatus.IN_PROGRESS,
      location: { lat: 28.608, lng: 77.22, address: 'India Gate Area, New Delhi' },
      supportCount: 8,
      verificationScore: 60,
      department: 'Electrical',
    },
    {
      title: 'Water Pipeline Leak',
      description: 'Water leaking from underground pipeline.',
      category: IssueCategory.WATER_LEAKAGE,
      severity: Severity.CRITICAL,
      priority: Priority.CRITICAL,
      status: IssueStatus.REPORTED,
      location: { lat: 28.625, lng: 77.205, address: 'Rajpath, New Delhi' },
      supportCount: 3,
      verificationScore: 40,
      department: 'Water Board',
    },
    {
      title: 'Fallen Tree Blocking Sidewalk',
      description: 'Tree branch fallen after storm blocking pedestrian path.',
      category: IssueCategory.FALLEN_TREE,
      severity: Severity.MEDIUM,
      priority: Priority.LOW,
      status: IssueStatus.AI_VERIFIED,
      location: { lat: 28.61, lng: 77.23, address: 'Lodhi Gardens Area, New Delhi' },
      supportCount: 15,
      verificationScore: 95,
      department: 'Parks & Recreation',
    },
  ];

  demoIssues.forEach((issue) => {
    const id = uuidv4();
    store.issues.set(id, {
      id,
      ...issue,
      reporterId: 'demo-user',
      reporterName: 'Demo Citizen',
      mediaUrls: [],
      aiConfidence: 0.85,
      hazards: [],
      createdAt: new Date(Date.now() - Math.random() * 7 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
      timeline: [
        { status: IssueStatus.REPORTED, label: 'Reported', timestamp: new Date().toISOString() },
        { status: IssueStatus.AI_CATEGORIZED, label: 'AI Categorized', timestamp: new Date().toISOString() },
      ],
    });
  });

  store.users.set('demo-user', {
    id: 'demo-user',
    email: 'demo@communityhero.app',
    displayName: 'Demo Citizen',
    role: 'citizen',
    points: 150,
    badges: ['community_hero'],
    createdAt: new Date().toISOString(),
  });

  store.users.set('demo-authority', {
    id: 'demo-authority',
    email: 'authority@communityhero.app',
    displayName: 'City Authority',
    role: 'authority',
    points: 0,
    badges: [],
    createdAt: new Date().toISOString(),
  });
}

export const inMemoryStore = {
  seed: seedDemoData,

  getUser(id) {
    seedDemoData();
    return store.users.get(id);
  },

  upsertUser(user) {
    seedDemoData();
    const existing = store.users.get(user.id) || {};
    const updated = { ...existing, ...user, updatedAt: new Date().toISOString() };
    store.users.set(user.id, updated);
    return updated;
  },

  getIssues(filters = {}) {
    seedDemoData();
    let issues = [...store.issues.values()];

    if (filters.status) issues = issues.filter((i) => i.status === filters.status);
    if (filters.category) issues = issues.filter((i) => i.category === filters.category);
    if (filters.priority) issues = issues.filter((i) => i.priority === filters.priority);
    if (filters.reporterId) issues = issues.filter((i) => i.reporterId === filters.reporterId);

    return issues.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  getIssue(id) {
    seedDemoData();
    return store.issues.get(id);
  },

  createIssue(issue) {
    seedDemoData();
    const id = uuidv4();
    const newIssue = {
      id,
      supportCount: 0,
      verificationScore: 0,
      ...issue,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      timeline: issue.timeline || [
        { status: IssueStatus.REPORTED, label: 'Reported', timestamp: new Date().toISOString() },
      ],
    };
    store.issues.set(id, newIssue);
    return newIssue;
  },

  updateIssue(id, updates) {
    seedDemoData();
    const existing = store.issues.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    store.issues.set(id, updated);
    return updated;
  },

  getComments(issueId) {
    return [...store.comments.values()].filter((c) => c.issueId === issueId);
  },

  addComment(comment) {
    const id = uuidv4();
    const newComment = { id, ...comment, createdAt: new Date().toISOString() };
    store.comments.set(id, newComment);
    return newComment;
  },

  getVerifications(issueId) {
    return [...store.verifications.values()].filter((v) => v.issueId === issueId);
  },

  addVerification(verification) {
    const id = uuidv4();
    const newVerification = { id, ...verification, createdAt: new Date().toISOString() };
    store.verifications.set(id, newVerification);
    return newVerification;
  },

  getNotifications(userId) {
    return [...store.notifications.values()]
      .filter((n) => n.userId === userId || n.userId === 'authority')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  addNotification(notification) {
    const id = uuidv4();
    const newNotification = { id, ...notification };
    store.notifications.set(id, newNotification);
    return newNotification;
  },

  getLeaderboard(limit = 10) {
    seedDemoData();
    return [...store.users.values()]
      .filter((u) => u.points > 0)
      .sort((a, b) => b.points - a.points)
      .slice(0, limit);
  },

  getAnalytics() {
    seedDemoData();
    const issues = [...store.issues.values()];
    const resolved = issues.filter((i) =>
      ['completed', 'ai_verified'].includes(i.status)
    ).length;

    const categoryCounts = {};
    issues.forEach((i) => {
      categoryCounts[i.category] = (categoryCounts[i.category] || 0) + 1;
    });

    const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0];

    return {
      totalIssues: issues.length,
      resolvedIssues: resolved,
      resolutionRate: issues.length ? Math.round((resolved / issues.length) * 100) : 0,
      avgRepairTimeHours: 48,
      activeUsers: store.users.size,
      categoryBreakdown: categoryCounts,
      mostCommonIssue: topCategory ? topCategory[0] : 'none',
      criticalCount: issues.filter((i) => i.priority === Priority.CRITICAL).length,
      mediumCount: issues.filter((i) => i.priority === Priority.MEDIUM).length,
      lowCount: issues.filter((i) => i.priority === Priority.LOW).length,
    };
  },
};
