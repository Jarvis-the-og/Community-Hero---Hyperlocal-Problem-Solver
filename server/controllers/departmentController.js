import {
  getIssues,
  getIssueById,
  getComments,
  getVerifications,
  getInternalComments,
  getSimilarIssues,
  getWorkers,
  updateIssue,
  addTimelineEvent,
  addInternalComment,
} from '../services/issueService.js';
import { NotificationAgent } from '../services/agents/NotificationAgent.js';
import { IssueStatus } from '@community-hero/shared/enums/index.js';
import { DEPARTMENTS } from '@community-hero/shared/constants/departments.js';
import { createCacheKey, withGovernedRequest } from '../services/governance/index.js';

const STATUS_GROUPS = {
  pending: [IssueStatus.REPORTED, IssueStatus.AI_CATEGORIZED, IssueStatus.COMMUNITY_VERIFIED],
  accepted: [IssueStatus.ASSIGNED],
  in_progress: [IssueStatus.IN_PROGRESS, IssueStatus.PAUSED],
  completed: [IssueStatus.COMPLETED, IssueStatus.AI_VERIFIED],
  rejected: [IssueStatus.REJECTED],
  escalated: [IssueStatus.ESCALATED],
};

function filterByDepartment(issues, department) {
  if (!department) return issues;
  return issues.filter((i) => i.department === department);
}

function applyFilters(issues, query) {
  let result = issues;
  if (query.status) {
    const statuses = STATUS_GROUPS[query.status] || [query.status];
    result = result.filter((i) => statuses.includes(i.status));
  }
  if (query.priority) result = result.filter((i) => i.priority === query.priority);
  if (query.category) result = result.filter((i) => i.category === query.category);
  if (query.ward) result = result.filter((i) => i.location?.ward === query.ward);
  if (query.dateFrom) {
    const from = new Date(query.dateFrom).getTime();
    result = result.filter((i) => new Date(i.createdAt).getTime() >= from);
  }
  if (query.dateTo) {
    const to = new Date(query.dateTo).getTime();
    result = result.filter((i) => new Date(i.createdAt).getTime() <= to);
  }
  return result;
}

export async function getDepartmentDashboard(req, res, next) {
  try {
    const department = req.userProfile?.department || req.query.department;
    if (!department && req.userProfile?.role === 'department') {
      return res.status(400).json({ error: 'Department not assigned to user profile' });
    }

    const dashboard = await withGovernedRequest({
      api: 'firestore',
      operation: 'department_dashboard',
      cacheKey: createCacheKey('firestore:dept', { department: department || 'all' }),
      cacheTtlMs: 30 * 1000,
      timeoutMs: 15_000,
      requestFn: async () => {
        const allIssues = filterByDepartment(await getIssues({ department }), department);
        const filtered = applyFilters(allIssues, req.query);

        return {
          department: department || 'All',
          departments: DEPARTMENTS,
          issues: filtered,
          stats: {
            total: allIssues.length,
            pending: allIssues.filter((i) => STATUS_GROUPS.pending.includes(i.status)).length,
            accepted: allIssues.filter((i) => STATUS_GROUPS.accepted.includes(i.status)).length,
            inProgress: allIssues.filter((i) => STATUS_GROUPS.in_progress.includes(i.status)).length,
            completed: allIssues.filter((i) => STATUS_GROUPS.completed.includes(i.status)).length,
            rejected: allIssues.filter((i) => STATUS_GROUPS.rejected.includes(i.status)).length,
            escalated: allIssues.filter((i) => STATUS_GROUPS.escalated.includes(i.status)).length,
            critical: allIssues.filter((i) => i.priority === 'critical').length,
          },
          workers: await getWorkers(department),
        };
      },
    });

    res.json(dashboard);
  } catch (error) {
    next(error);
  }
}

export async function getDepartmentIssue(req, res, next) {
  try {
    const issue = await getIssueById(req.params.id);
    if (!issue) return res.status(404).json({ error: 'Issue not found' });

    const department = req.userProfile?.department;
    if (department && issue.department !== department) {
      return res.status(403).json({ error: 'Issue not in your department' });
    }

    const [comments, verifications, internalComments, similarIssues] = await Promise.all([
      getComments(issue.id),
      getVerifications(issue.id),
      getInternalComments(issue.id),
      getSimilarIssues(issue),
    ]);

    res.json({ issue, comments, verifications, internalComments, similarIssues });
  } catch (error) {
    next(error);
  }
}

export async function departmentAction(req, res, next) {
  try {
    const { action, assignedTo, assignedWorkerName, note } = req.body;
    const issue = await getIssueById(req.params.id);
    if (!issue) return res.status(404).json({ error: 'Issue not found' });

    const department = req.userProfile?.department;
    if (department && issue.department !== department) {
      return res.status(403).json({ error: 'Issue not in your department' });
    }

    const actionMap = {
      accept: { status: IssueStatus.ASSIGNED, label: 'Accepted' },
      reject: { status: IssueStatus.REJECTED, label: 'Rejected' },
      assign: { status: IssueStatus.ASSIGNED, label: 'Assigned to Worker' },
      start: { status: IssueStatus.IN_PROGRESS, label: 'Work Started' },
      pause: { status: IssueStatus.PAUSED, label: 'Work Paused' },
      complete: { status: IssueStatus.COMPLETED, label: 'Completed' },
      escalate: { status: IssueStatus.ESCALATED, label: 'Escalated' },
    };

    const mapped = actionMap[action];
    if (!mapped) return res.status(400).json({ error: 'Invalid action' });

    const updates = { status: mapped.status };
    if (action === 'assign' && assignedTo) {
      updates.assignedTo = assignedTo;
      updates.assignedWorkerName = assignedWorkerName || 'Field Worker';
    }

    if (action === 'escalate') {
      updates.escalationLevel = (issue.escalationLevel || 0) + 1;
      updates.escalationHistory = [
        ...(issue.escalationHistory || []),
        { level: updates.escalationLevel, reason: note || 'Manual escalation', timestamp: new Date().toISOString(), actor: req.userProfile?.displayName },
      ];
    }

    await updateIssue(req.params.id, updates);
    await addTimelineEvent(req.params.id, {
      status: mapped.status,
      label: mapped.label,
      description: note,
      actor: req.userProfile?.displayName || 'Department',
      timestamp: new Date().toISOString(),
    });

    if (note) {
      await addInternalComment(req.params.id, {
        userId: req.user.uid,
        userName: req.userProfile?.displayName || 'Department',
        content: note,
      });
    }

    if (action === 'assign') await NotificationAgent.notifyIssueAssigned({ ...issue, ...updates }, assignedTo);
    if (action === 'start') await NotificationAgent.notifyWorkStarted(issue);
    if (action === 'complete') await NotificationAgent.notifyIssueResolved(issue);
    if (action === 'escalate') await NotificationAgent.notifyIssueEscalated({ ...issue, ...updates });

    res.json({ issue: await getIssueById(req.params.id) });
  } catch (error) {
    next(error);
  }
}

export async function addDepartmentComment(req, res, next) {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Comment required' });

    const comment = await addInternalComment(req.params.id, {
      userId: req.user.uid,
      userName: req.userProfile?.displayName || 'Department',
      content: content.trim(),
    });

    res.status(201).json({ comment });
  } catch (error) {
    next(error);
  }
}
