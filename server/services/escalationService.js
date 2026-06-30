import { IssueStatus } from '@community-hero/shared/enums/index.js';
import { SLA_HOURS } from '@community-hero/shared/constants/departments.js';
import { getIssues, updateIssue, addTimelineEvent } from './issueService.js';
import { NotificationAgent } from './agents/NotificationAgent.js';

const ACTIVE_STATUSES = [
  IssueStatus.REPORTED,
  IssueStatus.AI_CATEGORIZED,
  IssueStatus.COMMUNITY_VERIFIED,
  IssueStatus.ASSIGNED,
  IssueStatus.IN_PROGRESS,
  IssueStatus.PAUSED,
  IssueStatus.ESCALATED,
];

function getSlaHours(priority) {
  return SLA_HOURS[priority] || SLA_HOURS.medium;
}

function isOverSla(issue) {
  if (!ACTIVE_STATUSES.includes(issue.status)) return false;
  const created = new Date(issue.createdAt).getTime();
  const hoursElapsed = (Date.now() - created) / 3600000;
  return hoursElapsed > getSlaHours(issue.priority);
}

export async function checkAndEscalateIssues() {
  const issues = await getIssues();
  const escalated = [];

  for (const issue of issues) {
    if (issue.status === IssueStatus.ESCALATED) continue;
    if (!isOverSla(issue)) continue;

    const escalationHistory = [
      ...(issue.escalationHistory || []),
      {
        level: (issue.escalationLevel || 0) + 1,
        reason: `SLA exceeded (${getSlaHours(issue.priority)}h for ${issue.priority} priority)`,
        timestamp: new Date().toISOString(),
      },
    ];

    await updateIssue(issue.id, {
      status: IssueStatus.ESCALATED,
      escalationLevel: (issue.escalationLevel || 0) + 1,
      escalationHistory,
    });

    await addTimelineEvent(issue.id, {
      status: IssueStatus.ESCALATED,
      label: 'Escalated',
      description: `Auto-escalated: SLA exceeded for ${issue.priority} priority issue`,
      actor: 'System',
      timestamp: new Date().toISOString(),
    });

    await NotificationAgent.notifyIssueEscalated({ ...issue, status: IssueStatus.ESCALATED });
    escalated.push(issue.id);
  }

  return escalated;
}

export function startEscalationScheduler(intervalMs = 15 * 60 * 1000) {
  const run = () => checkAndEscalateIssues().catch((err) => console.error('Escalation check failed:', err.message));
  run();
  return setInterval(run, intervalMs);
}

export const EscalationService = {
  checkAndEscalateIssues,
  startEscalationScheduler,
  isOverSla,
  getSlaHours,
};
