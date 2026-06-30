import path from 'path';
import { fileURLToPath } from 'url';
import { initializeFirebase, getDb, getAuth } from '../services/firebase/index.js';
import { buildWardAwareIssue, getWardCatalog } from '../services/wardCatalog.js';

const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  await initializeFirebase();
}

const db = getDb();
const auth = getAuth();

if (!db) {
  throw new Error('Firebase Firestore is not ready. Check service account and project configuration.');
}

if (!auth) {
  throw new Error('Firebase Auth is not ready. Check service account and project configuration.');
}

const now = Date.now();
const iso = (minutesAgo) => new Date(now - minutesAgo * 60 * 1000).toISOString();
const wardCatalog = await getWardCatalog();

const demoAccounts = [
  {
    uid: 'demo-citizen',
    email: 'citizen@communityhero.app',
    password: 'Citizen@123',
    displayName: 'Asha Verma',
    role: 'citizen',
    department: '',
    dashboard: '/',
    points: 180,
    badges: ['community_hero', 'early_reporter'],
    trustScore: 88,
  },
  {
    uid: 'demo-department',
    email: 'department@communityhero.app',
    password: 'Department@123',
    displayName: 'Rohan Das',
    role: 'department',
    department: 'Roads Department',
    dashboard: '/department',
    points: 260,
    badges: ['verification_champion'],
    trustScore: 91,
  },
  {
    uid: 'demo-worker',
    email: 'worker@communityhero.app',
    password: 'Worker@123',
    displayName: 'Imran Khan',
    role: 'worker',
    department: 'Solid Waste Management',
    dashboard: '/worker',
    points: 240,
    badges: ['field_responder'],
    trustScore: 84,
  },
  {
    uid: 'demo-admin',
    email: 'admin@communityhero.app',
    password: 'Admin@123',
    displayName: 'Meera Iyer',
    role: 'admin',
    department: 'KMC Administration',
    dashboard: '/admin',
    points: 420,
    badges: ['problem_solver'],
    trustScore: 95,
  },
];

async function clearCollection(name) {
  while (true) {
    const snapshot = await db.collection(name).limit(400).get();
    if (snapshot.empty) break;
    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}

async function ensureAuthAccount(account) {
  let existing = null;
  try {
    existing = await auth.getUserByEmail(account.email);
  } catch (error) {
    if (error.code !== 'auth/user-not-found') {
      throw error;
    }
  }

  if (existing) {
    await auth.updateUser(existing.uid, {
      email: account.email,
      password: account.password,
      displayName: account.displayName,
      emailVerified: true,
      disabled: false,
    });
    return existing.uid;
  }

  const created = await auth.createUser({
    uid: account.uid,
    email: account.email,
    password: account.password,
    displayName: account.displayName,
    emailVerified: true,
    disabled: false,
  });

  return created.uid;
}

export function buildIssue({
  id,
  title,
  description,
  category,
  severity,
  priority,
  status,
  department,
  ward,
  lat,
  lng,
  address,
  reporterId,
  reporterName,
  supportCount,
  verificationScore,
  assignedTo = null,
  assignedWorkerName = null,
  aiConfidence,
  aiSummary,
  hazards = [],
  timeline = [],
  escalationLevel = 0,
  escalationHistory = [],
  citizenConfirmed = null,
  workerNotes = null,
}) {
  return {
    id,
    title,
    description,
    category,
    severity,
    priority,
    status,
    department,
    reporterId,
    reporterName,
    reporterEmail: demoAccounts[0].email,
    location: { lat, lng, address, ward },
    supportCount,
    verificationScore,
    assignedTo,
    assignedWorkerName,
    aiConfidence,
    aiSummary,
    hazards,
    escalationLevel,
    escalationHistory,
    citizenConfirmed,
    workerNotes,
    mediaUrls: [],
    createdAt: timeline[0]?.timestamp || iso(1440),
    updatedAt: timeline[timeline.length - 1]?.timestamp || iso(60),
    timeline,
  };
}

export const issueFixtures = [
  buildIssue({
    id: 'issue-pothole-park-street',
    title: 'Large Pothole on Park Street',
    description: 'Deep pothole near the crossing causing two-wheelers to swerve dangerously.',
    category: 'pothole',
    severity: 'critical',
    priority: 'critical',
    status: 'community_verified',
    department: 'Roads Department',
    ward: 'Ward 63',
    lat: 22.5510,
    lng: 88.3517,
    address: 'Park Street, Kolkata',
    reporterId: 'demo-citizen',
    reporterName: 'Asha Verma',
    supportCount: 18,
    verificationScore: 87,
    aiConfidence: 0.96,
    aiSummary: 'Severe roadway damage with immediate hazard to traffic flow.',
    hazards: ['vehicle_damage', 'accident_risk'],
    timeline: [
      { status: 'reported', label: 'Reported', timestamp: iso(1680) },
      { status: 'ai_categorized', label: 'AI Categorized', timestamp: iso(1678) },
      { status: 'community_verified', label: 'Community Verified', timestamp: iso(1650) },
    ],
  }),
  buildIssue({
    id: 'issue-garbage-gariahat',
    title: 'Overflowing Garbage Bin',
    description: 'Municipal bin overflowing for several days and attracting stray animals in Gariahat.',
    category: 'garbage',
    severity: 'medium',
    priority: 'medium',
    status: 'assigned',
    department: 'Solid Waste Management',
    ward: 'Ward 68',
    lat: 22.5194,
    lng: 88.3691,
    address: 'Gariahat Market, Kolkata',
    reporterId: 'demo-citizen',
    reporterName: 'Asha Verma',
    supportCount: 7,
    verificationScore: 72,
    assignedTo: 'demo-worker',
    assignedWorkerName: 'Imran Khan',
    aiConfidence: 0.89,
    aiSummary: 'Waste collection overflow requiring immediate pickup.',
    hazards: ['sanitation', 'pests'],
    timeline: [
      { status: 'reported', label: 'Reported', timestamp: iso(1440) },
      { status: 'ai_categorized', label: 'AI Categorized', timestamp: iso(1438) },
      { status: 'assigned', label: 'Assigned', timestamp: iso(1400) },
    ],
  }),
  buildIssue({
    id: 'issue-streetlight-saltlake',
    title: 'Broken Streetlight in Sector V',
    description: 'Streetlight has been dark for a week, making the tech park lane unsafe after sunset.',
    category: 'broken_streetlight',
    severity: 'medium',
    priority: 'medium',
    status: 'in_progress',
    department: 'Street Lighting',
    ward: 'Ward 31',
    lat: 22.5726,
    lng: 88.4312,
    address: 'Sector V, Salt Lake, Kolkata',
    reporterId: 'demo-citizen',
    reporterName: 'Asha Verma',
    supportCount: 11,
    verificationScore: 64,
    assignedTo: 'demo-worker',
    assignedWorkerName: 'Imran Khan',
    aiConfidence: 0.84,
    aiSummary: 'Lighting outage likely requires electrical maintenance.',
    hazards: ['poor_visibility'],
    timeline: [
      { status: 'reported', label: 'Reported', timestamp: iso(1320) },
      { status: 'ai_categorized', label: 'AI Categorized', timestamp: iso(1318) },
      { status: 'assigned', label: 'Assigned', timestamp: iso(1290) },
      { status: 'in_progress', label: 'Work Started', timestamp: iso(1260) },
    ],
  }),
  buildIssue({
    id: 'issue-water-leak-esplanade',
    title: 'Water Pipeline Leak',
    description: 'Persistent underground leak causing road seepage near Esplanade.',
    category: 'water_leakage',
    severity: 'critical',
    priority: 'critical',
    status: 'escalated',
    department: 'Water Supply Department',
    ward: 'Ward 46',
    lat: 22.5636,
    lng: 88.3520,
    address: 'Esplanade, Kolkata',
    reporterId: 'demo-citizen',
    reporterName: 'Asha Verma',
    supportCount: 14,
    verificationScore: 80,
    aiConfidence: 0.92,
    aiSummary: 'Likely main-line leak with road damage and water loss.',
    hazards: ['water_waste', 'road_damage'],
    escalationLevel: 1,
    escalationHistory: [
      { level: 1, reason: 'SLA exceeded', timestamp: iso(1200), actor: 'System' },
    ],
    timeline: [
      { status: 'reported', label: 'Reported', timestamp: iso(1500) },
      { status: 'ai_categorized', label: 'AI Categorized', timestamp: iso(1498) },
      { status: 'escalated', label: 'Escalated', timestamp: iso(1200) },
    ],
  }),
  buildIssue({
    id: 'issue-drain-cover-shyambazar',
    title: 'Damaged Drain Cover',
    description: 'Open drain cover creating a hazard near the 5-point crossing.',
    category: 'drainage',
    severity: 'critical',
    priority: 'critical',
    status: 'ai_verified',
    department: 'Drainage',
    ward: 'Ward 10',
    lat: 22.5950,
    lng: 88.3740,
    address: 'Shyambazar, Kolkata',
    reporterId: 'demo-citizen',
    reporterName: 'Asha Verma',
    supportCount: 21,
    verificationScore: 91,
    aiConfidence: 0.94,
    aiSummary: 'Open drainage cover requiring urgent barricading.',
    hazards: ['fall_risk'],
    timeline: [
      { status: 'reported', label: 'Reported', timestamp: iso(960) },
      { status: 'ai_categorized', label: 'AI Categorized', timestamp: iso(958) },
      { status: 'assigned', label: 'Assigned', timestamp: iso(900) },
      { status: 'ai_verified', label: 'AI Verified', timestamp: iso(840) },
    ],
  }),
  buildIssue({
    id: 'issue-dumping-em-bypass',
    title: 'Repeated Illegal Dumping',
    description: 'Construction waste dumped repeatedly on EM Bypass despite prior cleanup.',
    category: 'illegal_dumping',
    severity: 'medium',
    priority: 'medium',
    status: 'paused',
    department: 'Solid Waste Management',
    ward: 'Ward 91',
    lat: 22.5150,
    lng: 88.3940,
    address: 'EM Bypass, Kolkata',
    reporterId: 'demo-citizen',
    reporterName: 'Asha Verma',
    supportCount: 9,
    verificationScore: 58,
    assignedTo: 'demo-worker',
    assignedWorkerName: 'Imran Khan',
    aiConfidence: 0.81,
    aiSummary: 'Construction debris repeatedly returned after cleanup.',
    hazards: ['blocked_walkway', 'pollution'],
    escalationLevel: 1,
    escalationHistory: [
      { level: 1, reason: 'Reopened after cleanup', timestamp: iso(780), actor: 'Department Officer' },
    ],
    timeline: [
      { status: 'reported', label: 'Reported', timestamp: iso(840) },
      { status: 'ai_categorized', label: 'AI Categorized', timestamp: iso(838) },
      { status: 'paused', label: 'Paused', timestamp: iso(780) },
    ],
  }),
  buildIssue({
    id: 'issue-fallen-tree-jadavpur',
    title: 'Fallen Tree Blocking Sidewalk',
    description: 'Tree branch collapsed after wind storm, blocking pedestrians near the university.',
    category: 'fallen_tree',
    severity: 'medium',
    priority: 'low',
    status: 'completed',
    department: 'Parks & Gardens',
    ward: 'Ward 102',
    lat: 22.4990,
    lng: 88.3710,
    address: 'Jadavpur, Kolkata',
    reporterId: 'demo-citizen',
    reporterName: 'Asha Verma',
    supportCount: 16,
    verificationScore: 97,
    assignedTo: 'demo-worker',
    assignedWorkerName: 'Imran Khan',
    aiConfidence: 0.93,
    aiSummary: 'Storm damage partially blocking foot traffic.',
    hazards: ['blocked_walkway'],
    workerNotes: 'Debris cleared and sidewalk reopened.',
    citizenConfirmed: true,
    timeline: [
      { status: 'reported', label: 'Reported', timestamp: iso(1800) },
      { status: 'ai_categorized', label: 'AI Categorized', timestamp: iso(1798) },
      { status: 'assigned', label: 'Assigned', timestamp: iso(1720) },
      { status: 'in_progress', label: 'Work Started', timestamp: iso(1700) },
      { status: 'completed', label: 'Completed', timestamp: iso(1620) },
    ],
  }),
  buildIssue({
    id: 'issue-road-crack-college-street',
    title: 'Sidewalk Crack Repaired',
    description: 'Sidewalk crack near the book market repaired after citizen reports.',
    category: 'road_damage',
    severity: 'low',
    priority: 'low',
    status: 'completed',
    department: 'Roads Department',
    ward: 'Ward 37',
    lat: 22.5770,
    lng: 88.3620,
    address: 'College Street, Kolkata',
    reporterId: 'demo-citizen',
    reporterName: 'Asha Verma',
    supportCount: 18,
    verificationScore: 97,
    assignedTo: 'demo-worker',
    assignedWorkerName: 'Imran Khan',
    aiConfidence: 0.9,
    aiSummary: 'Minor sidewalk damage with quick repair potential.',
    hazards: ['trip_hazard'],
    citizenConfirmed: true,
    workerNotes: 'Crack sealed and footpath reopened.',
    timeline: [
      { status: 'reported', label: 'Reported', timestamp: iso(1920) },
      { status: 'ai_categorized', label: 'AI Categorized', timestamp: iso(1918) },
      { status: 'assigned', label: 'Assigned', timestamp: iso(1870) },
      { status: 'in_progress', label: 'Work Started', timestamp: iso(1840) },
      { status: 'completed', label: 'Completed', timestamp: iso(1760) },
    ],
  }),
  buildIssue({
    id: 'issue-noise-rejected',
    title: 'Noise Complaint Near School',
    description: 'Community noise complaint with no evidence after review.',
    category: 'other',
    severity: 'low',
    priority: 'low',
    status: 'rejected',
    department: 'Public Health',
    ward: 'Ward 71',
    lat: 22.5350,
    lng: 88.3450,
    address: 'Bhowanipore, Kolkata',
    reporterId: 'demo-citizen',
    reporterName: 'Asha Verma',
    supportCount: 2,
    verificationScore: 18,
    aiConfidence: 0.62,
    aiSummary: 'Insufficient evidence provided for municipal action.',
    hazards: [],
    timeline: [
      { status: 'reported', label: 'Reported', timestamp: iso(1560) },
      { status: 'ai_categorized', label: 'AI Categorized', timestamp: iso(1558) },
      { status: 'rejected', label: 'Rejected', timestamp: iso(1500) },
    ],
  }),
];

const notifications = [
  {
    id: 'notification-citizen-resolved-1',
    userId: 'demo-citizen',
    type: 'issue_resolved',
    title: 'Sidewalk Crack Repaired',
    message: 'Your sidewalk complaint at College Street was marked resolved.',
    issueId: 'issue-road-crack-college-street',
    read: false,
    createdAt: iso(12),
  },
  {
    id: 'notification-citizen-escalated-1',
    userId: 'demo-citizen',
    type: 'issue_escalated',
    title: 'Water Leak Escalated',
    message: 'Your Water Pipeline Leak report was escalated for urgent review.',
    issueId: 'issue-water-leak-esplanade',
    read: true,
    createdAt: iso(90),
  },
  {
    id: 'notification-citizen-confirmed-1',
    userId: 'demo-citizen',
    type: 'resolution_confirmed',
    title: 'Resolution Confirmed',
    message: 'Thank you for confirming the repair on Fallen Tree Blocking Sidewalk.',
    issueId: 'issue-fallen-tree-jadavpur',
    read: true,
    createdAt: iso(30),
  },
  {
    id: 'notification-admin-received-1',
    userId: 'demo-admin',
    type: 'issue_received',
    title: 'New Critical Complaint',
    message: 'Large Pothole on Park Street was reported.',
    issueId: 'issue-pothole-park-street',
    read: false,
    createdAt: iso(10),
  },
  {
    id: 'notification-admin-escalated-1',
    userId: 'demo-admin',
    type: 'issue_escalated',
    title: 'Drain Cover Escalated',
    message: 'Damaged Drain Cover needs immediate municipal attention.',
    issueId: 'issue-drain-cover-shyambazar',
    read: false,
    createdAt: iso(45),
  },
  {
    id: 'notification-dept-assigned-1',
    userId: 'demo-department',
    type: 'issue_assigned',
    title: 'Issue Assigned',
    message: 'Fallen Tree Blocking Sidewalk is ready for review.',
    issueId: 'issue-fallen-tree-jadavpur',
    read: false,
    createdAt: iso(35),
  },
  {
    id: 'notification-dept-queued-2',
    userId: 'demo-department',
    type: 'issue_assigned',
    title: 'Queue Update',
    message: 'Overflowing Garbage Bin is waiting for worker assignment.',
    issueId: 'issue-garbage-gariahat',
    read: true,
    createdAt: iso(70),
  },
  {
    id: 'notification-worker-assigned-1',
    userId: 'demo-worker',
    type: 'issue_assigned',
    title: 'New Task Assigned',
    message: 'You have been assigned Overflowing Garbage Bin.',
    issueId: 'issue-garbage-gariahat',
    read: false,
    createdAt: iso(20),
  },
  {
    id: 'notification-worker-complete-1',
    userId: 'demo-worker',
    type: 'issue_completed',
    title: 'Task Completed',
    message: 'Sidewalk Crack Repaired was successfully closed.',
    issueId: 'issue-road-crack-college-street',
    read: true,
    createdAt: iso(40),
  },
];

const comments = [
  {
    id: 'comment-issue-fallen-tree-1',
    issueId: 'issue-fallen-tree-jadavpur',
    authorId: 'demo-citizen',
    authorName: 'Asha Verma',
    content: 'Thanks for the fast response, the sidewalk is accessible again.',
    createdAt: iso(28),
  },
  {
    id: 'comment-issue-garbage-1',
    issueId: 'issue-garbage-gariahat',
    authorId: 'demo-worker',
    authorName: 'Imran Khan',
    content: 'Crew has been dispatched for pickup before evening rounds.',
    createdAt: iso(18),
  },
  {
    id: 'comment-issue-water-1',
    issueId: 'issue-water-leak-esplanade',
    authorId: 'demo-department',
    authorName: 'Rohan Das',
    content: 'Escalating to water engineering team and scheduling a site visit.',
    createdAt: iso(82),
  },
];

const internalComments = [
  {
    id: 'internal-comment-issue-garbage-1',
    issueId: 'issue-garbage-gariahat',
    authorId: 'demo-department',
    authorName: 'Rohan Das',
    content: 'Assign to the afternoon pickup team; the ward is reporting repeated overflow.',
    isInternal: true,
    createdAt: iso(16),
  },
  {
    id: 'internal-comment-issue-drain-1',
    issueId: 'issue-drain-cover-shyambazar',
    authorId: 'demo-admin',
    authorName: 'Meera Iyer',
    content: 'Prioritize barricading and send a field photo update before end of day.',
    isInternal: true,
    createdAt: iso(42),
  },
];

const verifications = [
  {
    id: 'verification-issue-fallen-tree-1',
    issueId: 'issue-fallen-tree-jadavpur',
    status: 'approved',
    comment: 'Debris cleared and the path is now safe.',
    verifierId: 'demo-worker',
    verifierName: 'Imran Khan',
    evidenceUrls: [],
    createdAt: iso(24),
  },
  {
    id: 'verification-issue-road-crack-1',
    issueId: 'issue-road-crack-college-street',
    status: 'approved',
    comment: 'Repair work meets closure requirements.',
    verifierId: 'demo-department',
    verifierName: 'Rohan Das',
    evidenceUrls: [],
    createdAt: iso(35),
  },
  {
    id: 'verification-issue-drain-1',
    issueId: 'issue-drain-cover-shyambazar',
    status: 'flagged',
    comment: 'Awaiting physical barricade and on-site confirmation.',
    verifierId: 'demo-admin',
    verifierName: 'Meera Iyer',
    evidenceUrls: [],
    createdAt: iso(38),
  },
];

export async function seed() {
  const resolvedUids = new Map();
  for (const account of demoAccounts) {
    const uid = await ensureAuthAccount(account);
    resolvedUids.set(account.role, uid);
  }

  await Promise.all([
    clearCollection('users'),
    clearCollection('issues'),
    clearCollection('notifications'),
    clearCollection('comments'),
    clearCollection('verifications'),
    clearCollection('internalComments'),
  ]);

  const userDocs = demoAccounts.map((account) => {
    const uid = resolvedUids.get(account.role) || account.uid;
    return {
      id: uid,
      email: account.email,
      displayName: account.displayName,
      role: account.role,
      department: account.department,
      dashboard: account.dashboard,
      points: account.points,
      badges: account.badges,
      trustScore: account.trustScore,
      createdAt: iso(3000),
      updatedAt: iso(5),
    };
  });

  const resolveId = (id) => {
    if (id === 'demo-citizen') return resolvedUids.get('citizen');
    if (id === 'demo-department') return resolvedUids.get('department');
    if (id === 'demo-worker') return resolvedUids.get('worker');
    if (id === 'demo-admin') return resolvedUids.get('admin');
    return id;
  };

  const processedIssues = issueFixtures.map((issue) => {
    const normalizedIssue = buildWardAwareIssue(issue, wardCatalog);
    return {
      ...normalizedIssue,
      reporterId: resolveId(issue.reporterId),
      assignedTo: resolveId(issue.assignedTo),
    };
  });

  const processedNotifications = notifications.map(n => ({
    ...n,
    userId: resolveId(n.userId)
  }));

  const processedComments = comments.map(c => ({
    ...c,
    authorId: resolveId(c.authorId)
  }));

  const processedVerifications = verifications.map(v => ({
    ...v,
    verifierId: resolveId(v.verifierId)
  }));

  const processedInternalComments = internalComments.map(c => ({
    ...c,
    authorId: resolveId(c.authorId)
  }));

  for (const user of userDocs) {
    await db.collection('users').doc(user.id).set(user, { merge: false });
  }

  for (const issue of processedIssues) {
    await db.collection('issues').doc(issue.id).set(issue, { merge: false });
  }

  for (const notification of processedNotifications) {
    await db.collection('notifications').doc(notification.id).set(notification, { merge: false });
  }

  for (const comment of processedComments) {
    await db.collection('comments').doc(comment.id).set(comment, { merge: false });
  }

  for (const verification of processedVerifications) {
    await db.collection('verifications').doc(verification.id).set(verification, { merge: false });
  }

  for (const comment of processedInternalComments) {
    await db.collection('internalComments').doc(comment.id).set(comment, { merge: false });
  }

  console.log(
    `Seeded Firebase Auth accounts and Firestore demo data for ${demoAccounts.length} users, ${issueFixtures.length} issues, ${notifications.length} notifications, ${comments.length} comments, and ${verifications.length} verifications.`
  );
}

if (isDirectExecution) {
  await seed();
}
