const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  health: () => request<{ status: string }>('/health'),

  getProfile: (token?: string | null) =>
    request<{ user: User }>('/auth/profile', {}, token),

  syncUser: (data: Partial<User>, token?: string | null) =>
    request<{ user: User }>('/auth/sync', { method: 'POST', body: JSON.stringify(data) }, token),

  getIssues: (params?: Record<string, string>, token?: string | null) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<{ issues: Issue[] }>(`/issues${query}`, {}, token);
  },

  getIssue: (id: string, token?: string | null) =>
    request<{ issue: Issue }>(`/issues/${id}`, {}, token),

  getNearbyIssues: (lat: number, lng: number, radius = 5, token?: string | null) =>
    request<{ issues: Issue[] }>(`/issues/nearby?lat=${lat}&lng=${lng}&radius=${radius}`, {}, token),

  analyzeMedia: (file: File, lat?: number, lng?: number, token?: string | null) => {
    const form = new FormData();
    form.append('media', file);
    if (lat) form.append('lat', String(lat));
    if (lng) form.append('lng', String(lng));
    return request<{ analysis: VisionAnalysis; location: GeoLocation }>(
      '/issues/analyze',
      { method: 'POST', body: form },
      token
    );
  },

  checkDuplicates: (data: DuplicateCheck, token?: string | null) =>
    request<{ isDuplicate: boolean; matches: DuplicateMatch[] }>(
      '/issues/check-duplicates',
      { method: 'POST', body: JSON.stringify(data) },
      token
    ),

  createIssue: (form: FormData, token?: string | null) =>
    request<{ issue: Issue; priority: PriorityResult }>(
      '/issues',
      { method: 'POST', body: form },
      token
    ),

  supportIssue: (id: string, token?: string | null) =>
    request<{ issue: Issue }>(`/issues/${id}/support`, { method: 'POST' }, token),

  uploadResolutionImages: (id: string, type: 'before' | 'after', files: File[], token?: string | null) => {
    const form = new FormData();
    form.append('type', type);
    files.forEach((f) => form.append('media', f));
    return request<{ issue: Issue }>(`/issues/${id}/resolution-images`, { method: 'POST', body: form }, token);
  },

  updateIssueStatus: (id: string, data: Record<string, string>, token?: string | null) =>
    request<{ issue: Issue }>(`/issues/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }, token),

  getComments: (issueId: string, token?: string | null) =>
    request<{ comments: Comment[] }>(`/comments/${issueId}`, {}, token),

  addComment: (issueId: string, content: string, token?: string | null) =>
    request<{ comment: Comment }>(`/comments/${issueId}`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }, token),

  submitVerification: (issueId: string, status: string, comment?: string, files?: File[], token?: string | null) => {
    const form = new FormData();
    form.append('status', status);
    if (comment) form.append('comment', comment);
    files?.forEach((f) => form.append('evidence', f));
    return request<{ verification: Verification; verificationScore: number }>(
      `/verification/${issueId}`,
      { method: 'POST', body: form },
      token
    );
  },

  getVerifications: (issueId: string, token?: string | null) =>
    request<{ verifications: Verification[] }>(`/verification/${issueId}`, {}, token),

  verifyResolution: (issueId: string, token?: string | null) =>
    request<{ result: ResolutionVerification; issue: Issue }>(
      `/verification/${issueId}/verify-resolution`,
      { method: 'POST' },
      token
    ),

  getDashboard: (token?: string | null) =>
    request<DashboardData>('/dashboard', {}, token),

  getDashboardIssue: (id: string, token?: string | null) =>
    request<{ issue: Issue; comments: Comment[]; verifications: Verification[] }>(
      `/dashboard/${id}`,
      {},
      token
    ),

  getLeaderboard: (limit = 10) =>
    request<{ leaderboard: User[] }>(`/leaderboard?limit=${limit}`),

  getAnalytics: (token?: string | null) =>
    request<{ analytics: Analytics }>('/analytics', {}, token),

  chat: (message: string, context?: { issueId?: string; lat?: number; lng?: number }, token?: string | null) =>
    request<{ reply: string }>('/chat', {
      method: 'POST',
      body: JSON.stringify({ message, ...context }),
    }, token),

  getNotifications: (token?: string | null) =>
    request<{ notifications: Notification[] }>('/notifications', {}, token),

  markNotificationRead: (id: string, token?: string | null) =>
    request<{ success: boolean }>(`/notifications/${id}/read`, { method: 'PATCH' }, token),

  confirmResolution: (id: string, confirmed: boolean, comment?: string, token?: string | null) =>
    request<{ issue: Issue }>(`/issues/${id}/confirm-resolution`, {
      method: 'POST',
      body: JSON.stringify({ confirmed, comment }),
    }, token),

  getDepartmentDashboard: (params?: Record<string, string>, token?: string | null) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<DepartmentDashboard>(`/department${query}`, {}, token);
  },

  getDepartmentIssue: (id: string, token?: string | null) =>
    request<DepartmentIssueDetail>(`/department/issues/${id}`, {}, token),

  departmentAction: (id: string, action: string, data?: Record<string, string>, token?: string | null) =>
    request<{ issue: Issue }>(`/department/issues/${id}/action`, {
      method: 'POST',
      body: JSON.stringify({ action, ...data }),
    }, token),

  addInternalComment: (issueId: string, content: string, token?: string | null) =>
    request<{ comment: InternalComment }>(`/department/issues/${issueId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }, token),

  getWorkerTasks: (token?: string | null) =>
    request<WorkerTasksData>('/worker/tasks', {}, token),

  getWorkerTask: (id: string, token?: string | null) =>
    request<{ issue: Issue }>(`/worker/tasks/${id}`, {}, token),

  workerUpdateTask: (id: string, action: string, notes?: string, token?: string | null) =>
    request<{ issue: Issue }>(`/worker/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action, notes }),
    }, token),

  workerUploadImages: (id: string, type: 'before' | 'after', files: File[], notes?: string, token?: string | null) => {
    const form = new FormData();
    form.append('type', type);
    if (notes) form.append('notes', notes);
    files.forEach((f) => form.append('media', f));
    return request<{ issue: Issue; aiVerification?: ResolutionVerification }>(
      `/worker/tasks/${id}/images`,
      { method: 'POST', body: form },
      token
    );
  },

  getAdminDashboard: (token?: string | null) =>
    request<AdminDashboard>('/admin', {}, token),

  getDepartmentRankings: (token?: string | null) =>
    request<{ rankings: DepartmentPerformance[] }>('/admin/rankings', {}, token),
};

export interface GeoLocation {
  lat: number;
  lng: number;
  address?: string;
  ward?: string;
  landmark?: string;
  road?: string;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: string;
  department?: string;
  points: number;
  badges: string[];
  trustScore?: number;
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  priority: string;
  status: string;
  reporterId: string;
  reporterName: string;
  mediaUrls: string[];
  location: GeoLocation;
  department?: string;
  hazards?: string[];
  aiConfidence: number;
  supportCount: number;
  verificationScore: number;
  assignedTo?: string;
  assignedWorkerName?: string;
  aiSummary?: string;
  timeline?: TimelineEvent[];
  beforeImages?: string[];
  afterImages?: string[];
  resolutionStatus?: string;
  aiResolutionConfidence?: number;
  citizenConfirmed?: boolean;
  escalationLevel?: number;
  escalationHistory?: EscalationEvent[];
  workerNotes?: string;
  isDuplicate?: boolean;
  duplicateOf?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  issueId: string;
  userId: string;
  userName: string;
  content: string;
  isHelpful: boolean;
  createdAt: string;
}

export interface Verification {
  id: string;
  issueId: string;
  userId: string;
  status: string;
  comment?: string;
  evidenceUrls?: string[];
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  issueId?: string;
  read: boolean;
  createdAt: string;
}

export interface TimelineEvent {
  status: string;
  label: string;
  description?: string;
  actor?: string;
  timestamp: string;
}

export interface VisionAnalysis {
  category: string;
  title: string;
  description: string;
  severity: string;
  department: string;
  hazards: string[];
  confidence: number;
}

export interface DuplicateMatch {
  issueId: string;
  title: string;
  similarity: number;
  distance: number;
  category: string;
  status: string;
}

export interface DuplicateCheck {
  lat: number;
  lng: number;
  category: string;
  title: string;
  description: string;
}

export interface PriorityResult {
  priority: string;
  score: number;
  reasoning: string;
}

export interface ResolutionVerification {
  status: string;
  confidence: number;
  analysis: string;
}

export interface DashboardData {
  critical: Issue[];
  medium: Issue[];
  low: Issue[];
  stats: {
    total: number;
    critical: number;
    inProgress: number;
    pendingVerification: number;
  };
}

export interface Analytics {
  totalIssues: number;
  resolvedIssues: number;
  activeIssues?: number;
  resolutionRate: number;
  avgRepairTimeHours: number;
  activeUsers: number;
  categoryBreakdown: Record<string, number>;
  mostCommonIssue: string;
  criticalCount: number;
  mediumCount: number;
  lowCount: number;
  issueTrends?: Record<string, number>;
  topContributors?: Array<{
    id: string;
    displayName: string;
    points: number;
    trustScore: number;
  }>;
  departmentBreakdown?: Record<string, number>;
  wardBreakdown?: Record<string, number>;
  departmentPerformance?: DepartmentPerformance[];
  resolutionTrends?: Record<string, { reported: number; resolved: number }>;
  peakReportingHours?: Array<{ hour: number; count: number }>;
  aiInsights?: string[];
  citizenSatisfaction?: number | null;
}

export interface DepartmentPerformance {
  name: string;
  total: number;
  resolved: number;
  pending: number;
  resolutionRate: number;
  avgHours: number;
  rank?: number;
}

export interface EscalationEvent {
  level: number;
  reason: string;
  timestamp: string;
  actor?: string;
}

export interface InternalComment {
  id: string;
  issueId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
}

export interface DepartmentDashboard {
  department: string;
  departments: string[];
  issues: Issue[];
  stats: {
    total: number;
    pending: number;
    accepted: number;
    inProgress: number;
    completed: number;
    rejected: number;
    escalated: number;
    critical: number;
  };
  workers: User[];
}

export interface DepartmentIssueDetail {
  issue: Issue;
  comments: Comment[];
  verifications: Verification[];
  internalComments: InternalComment[];
  similarIssues: Array<Issue & { distance?: number }>;
}

export interface WorkerTasksData {
  tasks: Issue[];
  stats: {
    total: number;
    assigned: number;
    inProgress: number;
    completed: number;
  };
}

export interface AdminDashboard {
  analytics: Analytics;
  issues: Issue[];
  mapData: Array<{
    id: string;
    lat: number;
    lng: number;
    priority: string;
    status: string;
    department?: string;
    category: string;
    title: string;
  }>;
}
