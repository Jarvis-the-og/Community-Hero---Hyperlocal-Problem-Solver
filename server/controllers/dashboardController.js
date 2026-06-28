import { getIssues, getIssueById } from '../services/issueService.js';
import { Priority } from '@community-hero/shared/enums/index.js';

export async function getDashboard(req, res, next) {
  try {
    const issues = await getIssues();
    const active = issues.filter((i) => !['ai_verified', 'rejected'].includes(i.status));

    const dashboard = {
      critical: active.filter((i) => i.priority === Priority.CRITICAL),
      medium: active.filter((i) => i.priority === Priority.MEDIUM),
      low: active.filter((i) => i.priority === Priority.LOW),
      stats: {
        total: active.length,
        critical: active.filter((i) => i.priority === Priority.CRITICAL).length,
        inProgress: active.filter((i) => i.status === 'in_progress').length,
        pendingVerification: active.filter((i) => i.status === 'ai_categorized').length,
      },
    };

    res.json(dashboard);
  } catch (error) {
    next(error);
  }
}

export async function getDashboardIssue(req, res, next) {
  try {
    const issue = await getIssueById(req.params.id);
    if (!issue) return res.status(404).json({ error: 'Issue not found' });

    const { getComments, getVerifications } = await import('../services/issueService.js');
    const [comments, verifications] = await Promise.all([
      getComments(issue.id),
      getVerifications(issue.id),
    ]);

    res.json({ issue, comments, verifications });
  } catch (error) {
    next(error);
  }
}
