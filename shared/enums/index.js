export const UserRole = {
  CITIZEN: 'citizen',
  VOLUNTEER: 'volunteer',
  AUTHORITY: 'authority',
  ADMIN: 'admin',
};

export const IssueStatus = {
  REPORTED: 'reported',
  AI_CATEGORIZED: 'ai_categorized',
  COMMUNITY_VERIFIED: 'community_verified',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  AI_VERIFIED: 'ai_verified',
  REJECTED: 'rejected',
};

export const IssueCategory = {
  POTHOLE: 'pothole',
  GARBAGE: 'garbage',
  WATER_LEAKAGE: 'water_leakage',
  BROKEN_STREETLIGHT: 'broken_streetlight',
  FALLEN_TREE: 'fallen_tree',
  DRAINAGE: 'drainage',
  ROAD_DAMAGE: 'road_damage',
  ILLEGAL_DUMPING: 'illegal_dumping',
  ELECTRICAL_HAZARD: 'electrical_hazard',
  OTHER: 'other',
};

export const Severity = {
  CRITICAL: 'critical',
  MEDIUM: 'medium',
  LOW: 'low',
};

export const Priority = {
  CRITICAL: 'critical',
  MEDIUM: 'medium',
  LOW: 'low',
};

export const VerificationStatus = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  REJECTED: 'rejected',
};

export const ResolutionStatus = {
  RESOLVED: 'resolved',
  POSSIBLY_UNRESOLVED: 'possibly_unresolved',
  NEED_MANUAL_REVIEW: 'need_manual_review',
};

export const BadgeType = {
  COMMUNITY_HERO: 'community_hero',
  TOP_VOLUNTEER: 'top_volunteer',
  PROBLEM_SOLVER: 'problem_solver',
  EARLY_REPORTER: 'early_reporter',
  VERIFICATION_CHAMPION: 'verification_champion',
};

export const NotificationType = {
  ISSUE_VERIFIED: 'issue_verified',
  ISSUE_ASSIGNED: 'issue_assigned',
  WORK_STARTED: 'work_started',
  ISSUE_RESOLVED: 'issue_resolved',
  NEARBY_ISSUE: 'nearby_issue',
  NEED_VERIFICATION: 'need_verification',
  COMMENT_REPLY: 'comment_reply',
  BADGE_EARNED: 'badge_earned',
};

export const PointAction = {
  REPORT: 10,
  VERIFY: 15,
  SUPPORT: 5,
  HELPFUL_COMMENT: 3,
  RESOLUTION: 20,
};

export const CATEGORY_LABELS = {
  [IssueCategory.POTHOLE]: 'Pothole',
  [IssueCategory.GARBAGE]: 'Garbage',
  [IssueCategory.WATER_LEAKAGE]: 'Water Leakage',
  [IssueCategory.BROKEN_STREETLIGHT]: 'Broken Streetlight',
  [IssueCategory.FALLEN_TREE]: 'Fallen Tree',
  [IssueCategory.DRAINAGE]: 'Drainage',
  [IssueCategory.ROAD_DAMAGE]: 'Road Damage',
  [IssueCategory.ILLEGAL_DUMPING]: 'Illegal Dumping',
  [IssueCategory.ELECTRICAL_HAZARD]: 'Electrical Hazard',
  [IssueCategory.OTHER]: 'Other',
};

export const STATUS_LABELS = {
  [IssueStatus.REPORTED]: 'Reported',
  [IssueStatus.AI_CATEGORIZED]: 'AI Categorized',
  [IssueStatus.COMMUNITY_VERIFIED]: 'Community Verified',
  [IssueStatus.ASSIGNED]: 'Assigned',
  [IssueStatus.IN_PROGRESS]: 'In Progress',
  [IssueStatus.COMPLETED]: 'Completed',
  [IssueStatus.AI_VERIFIED]: 'AI Verified',
  [IssueStatus.REJECTED]: 'Rejected',
};
