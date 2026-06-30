import { v4 as uuidv4 } from 'uuid';
import { IssueStatus, Severity, Priority, IssueCategory } from '@community-hero/shared/enums/index.js';

const store = {
  users: new Map(),
  issues: new Map(),
  comments: new Map(),
  verifications: new Map(),
  notifications: new Map(),
  internalComments: new Map(),
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
      location: { lat: 28.6139, lng: 77.209, address: 'Park Street, Kolkata' },
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
      location: { lat: 28.6205, lng: 77.215, address: 'Gariahat, Kolkata' },
      supportCount: 5,
      verificationScore: 70,
      department: 'Garbage Department',
      assignedTo: 'demo-worker',
      assignedWorkerName: 'Field Worker Demo',
    },
    {
      title: 'Broken Streetlight',
      description: 'Streetlight not working, area is dark at night.',
      category: IssueCategory.BROKEN_STREETLIGHT,
      severity: Severity.MEDIUM,
      priority: Priority.MEDIUM,
      status: IssueStatus.IN_PROGRESS,
      location: { lat: 28.608, lng: 77.22, address: 'Sector V, Kolkata' },
      supportCount: 8,
      verificationScore: 60,
      department: 'Electricity Department',
    },
    {
      title: 'Water Pipeline Leak',
      description: 'Water leaking from underground pipeline.',
      category: IssueCategory.WATER_LEAKAGE,
      severity: Severity.CRITICAL,
      priority: Priority.CRITICAL,
      status: IssueStatus.REPORTED,
      location: { lat: 28.625, lng: 77.205, address: 'Esplanade, Kolkata' },
      supportCount: 3,
      verificationScore: 40,
      department: 'Water Department',
    },
    {
      title: 'Fallen Tree Blocking Sidewalk',
      description: 'Tree branch fallen after storm blocking pedestrian path.',
      category: IssueCategory.FALLEN_TREE,
      severity: Severity.MEDIUM,
      priority: Priority.LOW,
      status: IssueStatus.AI_VERIFIED,
      location: { lat: 28.61, lng: 77.23, address: 'Jadavpur, Kolkata' },
      supportCount: 15,
      verificationScore: 95,
      department: 'Public Works',
    },
    {
      title: 'Damaged Drain Cover',
      description: 'Open drain cover creating a hazard near the market entrance.',
      category: IssueCategory.DRAINAGE,
      severity: Severity.CRITICAL,
      priority: Priority.CRITICAL,
      status: IssueStatus.ESCALATED,
      location: { lat: 28.6182, lng: 77.2125, address: 'Shyambazar, Kolkata' },
      supportCount: 21,
      verificationScore: 92,
      department: 'Water Department',
    },
    {
      title: 'Repeated Illegal Dumping',
      description: 'Construction waste dumped repeatedly on the roadside.',
      category: IssueCategory.ILLEGAL_DUMPING,
      severity: Severity.MEDIUM,
      priority: Priority.MEDIUM,
      status: IssueStatus.PAUSED,
      location: { lat: 28.6065, lng: 77.2188, address: 'EM Bypass, Kolkata' },
      supportCount: 4,
      verificationScore: 52,
      department: 'Garbage Department',
      assignedTo: 'demo-worker',
      assignedWorkerName: 'Field Worker Demo',
    },
    {
      title: 'Resolved Sidewalk Crack',
      description: 'Sidewalk crack repaired after citizen reports and field inspection.',
      category: IssueCategory.ROAD_DAMAGE,
      severity: Severity.LOW,
      priority: Priority.LOW,
      status: IssueStatus.COMPLETED,
      location: { lat: 28.6095, lng: 77.2042, address: 'College Street, Kolkata' },
      supportCount: 18,
      verificationScore: 97,
      department: 'Public Works',
      assignedTo: 'demo-worker',
      assignedWorkerName: 'Field Worker Demo',
    },
    {
      title: 'Noise Complaint Near School',
      description: 'Community noise complaint with no evidence after review.',
      category: IssueCategory.OTHER,
      severity: Severity.LOW,
      priority: Priority.LOW,
      status: IssueStatus.REJECTED,
      location: { lat: 28.6228, lng: 77.2088, address: 'Bhowanipore, Kolkata' },
      supportCount: 2,
      verificationScore: 18,
      department: 'Health Department',
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
    role: 'admin',
    points: 320,
    badges: [],
    createdAt: new Date().toISOString(),
  });

  store.users.set('demo-department', {
    id: 'demo-department',
    email: 'dept@communityhero.app',
    displayName: 'Public Works Officer',
    role: 'department',
    department: 'Public Works',
    points: 210,
    badges: [],
    createdAt: new Date().toISOString(),
  });

  store.users.set('demo-worker', {
    id: 'demo-worker',
    email: 'worker@communityhero.app',
    displayName: 'Field Worker Demo',
    role: 'worker',
    department: 'Garbage Department',
    points: 180,
    badges: [],
    createdAt: new Date().toISOString(),
  });

  const now = Date.now();
  const issueList = [...store.issues.values()];
  const notificationSeed = [
    {
      userId: 'demo-user',
      type: 'issue_resolved',
      title: 'Streetlight Fixed',
      message: 'Broken Streetlight has been marked resolved.',
      issueId: issueList[2]?.id,
      read: false,
      createdAt: new Date(now - 1000 * 60 * 20).toISOString(),
    },
    {
      userId: 'demo-user',
      type: 'issue_escalated',
      title: 'Water Leak Escalated',
      message: 'Water Pipeline Leak has been escalated for urgent review.',
      issueId: issueList[3]?.id,
      read: true,
      createdAt: new Date(now - 1000 * 60 * 90).toISOString(),
    },
    {
      userId: 'demo-authority',
      type: 'issue_received',
      title: 'New Issue Reported',
      message: 'Large Pothole on Main Street reported near Park Street, Kolkata.',
      issueId: issueList[0]?.id,
      read: false,
      createdAt: new Date(now - 1000 * 60 * 10).toISOString(),
    },
    {
      userId: 'demo-department',
      type: 'issue_assigned',
      title: 'Issue Assigned',
      message: 'Fallen Tree Blocking Sidewalk is ready for review.',
      issueId: issueList[4]?.id,
      read: false,
      createdAt: new Date(now - 1000 * 60 * 35).toISOString(),
    },
    {
      userId: 'demo-worker',
      type: 'issue_assigned',
      title: 'New Assignment',
      message: 'You have been assigned Overflowing Garbage Bin.',
      issueId: issueList[1]?.id,
      read: false,
      createdAt: new Date(now - 1000 * 60 * 15).toISOString(),
    },
  ];

  notificationSeed.forEach((notification) => {
    const id = uuidv4();
    store.notifications.set(id, { id, ...notification });
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
    if (filters.department) issues = issues.filter((i) => i.department === filters.department);
    if (filters.assignedTo) issues = issues.filter((i) => i.assignedTo === filters.assignedTo);

    return issues.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  getUsersByRole(role) {
    seedDemoData();
    return [...store.users.values()].filter((u) => u.role === role);
  },

  getUsersByEmail(email) {
    seedDemoData();
    return [...store.users.values()].find((u) => u.email === email) || null;
  },

  migrateUserReferences(fromId, toId, email) {
    seedDemoData();
    for (const issue of store.issues.values()) {
      if (issue.reporterId === fromId || (email && issue.reporterEmail === email)) {
        issue.reporterId = toId;
      }
      if (issue.assignedTo === fromId || (email && issue.assignedToEmail === email)) {
        issue.assignedTo = toId;
      }
    }

    for (const notification of store.notifications.values()) {
      if (notification.userId === fromId || (email && notification.userId === email)) {
        notification.userId = toId;
      }
    }

    const user = store.users.get(fromId);
    if (user) {
      store.users.delete(fromId);
      store.users.set(toId, { ...user, id: toId, email: email || user.email, updatedAt: new Date().toISOString() });
    }
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
    const newNotification = { id, ...notification, createdAt: notification.createdAt || new Date().toISOString() };
    store.notifications.set(id, newNotification);
    return newNotification;
  },

  markNotificationRead(id) {
    const notification = store.notifications.get(id);
    if (notification) {
      notification.read = true;
      store.notifications.set(id, notification);
    }
    return { success: true };
  },

  getInternalComments(issueId) {
    return [...store.internalComments.values()]
      .filter((c) => c.issueId === issueId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  addInternalComment(comment) {
    const id = uuidv4();
    const newComment = { id, ...comment, createdAt: new Date().toISOString() };
    store.internalComments.set(id, newComment);
    return newComment;
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
