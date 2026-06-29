export const CATEGORY_LABELS: Record<string, string> = {
  pothole: 'Pothole',
  garbage: 'Garbage',
  water_leakage: 'Water Leakage',
  broken_streetlight: 'Broken Streetlight',
  fallen_tree: 'Fallen Tree',
  drainage: 'Drainage',
  road_damage: 'Road Damage',
  illegal_dumping: 'Illegal Dumping',
  electrical_hazard: 'Electrical Hazard',
  other: 'Other',
};

export const STATUS_LABELS: Record<string, string> = {
  reported: 'Reported',
  ai_categorized: 'AI Categorized',
  community_verified: 'Community Verified',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  paused: 'Paused',
  completed: 'Completed',
  ai_verified: 'AI Verified',
  rejected: 'Rejected',
  escalated: 'Escalated',
};

export const DEPARTMENTS = [
  'Road Department',
  'Water Department',
  'Garbage Department',
  'Electricity Department',
  'Public Works',
  'Health Department',
];

export const BADGE_LABELS: Record<string, string> = {
  community_hero: 'Community Hero',
  top_volunteer: 'Top Volunteer',
  problem_solver: 'Problem Solver',
  early_reporter: 'Early Reporter',
  verification_champion: 'Verification Champion',
};

export const ISSUE_CATEGORIES = Object.keys(CATEGORY_LABELS);

export const DEFAULT_LOCATION = { lat: 28.6139, lng: 77.2090 };

export const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: 'Home' },
  { href: '/map', label: 'Map', icon: 'Map' },
  { href: '/report', label: 'Report', icon: 'Plus' },
  { href: '/issues', label: 'My Issues', icon: 'List' },
  { href: '/leaderboard', label: 'Leaderboard', icon: 'Trophy' },
];

export const AUTHORITY_NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { href: '/analytics', label: 'Analytics', icon: 'BarChart3' },
  { href: '/admin', label: 'Corporation', icon: 'Building2' },
];

export const DEPARTMENT_NAV = [
  { href: '/department', label: 'Department', icon: 'Building' },
];

export const WORKER_NAV = [
  { href: '/worker', label: 'My Tasks', icon: 'HardHat' },
];
