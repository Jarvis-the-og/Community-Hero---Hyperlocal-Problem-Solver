import { getDb } from '../firebase/index.js';
import { inMemoryStore } from '../../utils/inMemoryStore.js';
import { NotificationType } from '@community-hero/shared/enums/index.js';
import { getUsersByRole } from '../issueService.js';

async function createNotification(userId, type, title, message, issueId = null) {
  const notification = {
    userId,
    type,
    title,
    message,
    issueId,
    read: false,
    createdAt: new Date().toISOString(),
  };

  const db = getDb();
  if (db) {
    const ref = await db.collection('notifications').add(notification);
    return { id: ref.id, ...notification };
  }

  return inMemoryStore.addNotification(notification);
}

async function notifyRoleUsers(roles, type, title, message, issueId = null) {
  const notifications = [];
  for (const role of roles) {
    const users = await getUsersByRole(role);
    for (const user of users) {
      notifications.push(await createNotification(user.id, type, title, message, issueId));
    }
  }
  return notifications;
}

async function notifyDepartmentUsers(department, type, title, message, issueId = null) {
  const users = await getUsersByRole('department');
  const deptUsers = users.filter((u) => u.department === department);
  const notifications = [];
  for (const user of deptUsers) {
    notifications.push(await createNotification(user.id, type, title, message, issueId));
  }
  if (!notifications.length) {
    await notifyRoleUsers(['authority', 'admin'], type, title, message, issueId);
  }
  return notifications;
}

export async function notifyIssueReported(issue) {
  const title = 'New Issue Reported';
  const message = `"${issue.title}" reported near ${issue.location?.address || 'your area'}`;

  const notifications = await notifyRoleUsers(['authority', 'admin'], NotificationType.ISSUE_RECEIVED, title, message, issue.id);

  if (issue.department) {
    const deptNotifications = await notifyDepartmentUsers(
      issue.department,
      NotificationType.ISSUE_RECEIVED,
      title,
      `[${issue.department}] ${message}`,
      issue.id
    );
    notifications.push(...deptNotifications);
  }

  return notifications;
}

export async function notifyVerificationNeeded(issue, nearbyUserIds) {
  const notifications = [];
  for (const userId of nearbyUserIds) {
    const n = await createNotification(
      userId,
      NotificationType.NEED_VERIFICATION,
      'Verification Request',
      `Please verify: "${issue.title}" near you`,
      issue.id
    );
    notifications.push(n);
  }
  return notifications;
}

export async function notifyIssueVerified(issue, reporterId) {
  return createNotification(
    reporterId,
    NotificationType.ISSUE_VERIFIED,
    'Issue Verified',
    `Your report "${issue.title}" has been community verified!`,
    issue.id
  );
}

export async function notifyIssueAssigned(issue, workerId) {
  const notifications = [
    await createNotification(
      issue.reporterId,
      NotificationType.ISSUE_ASSIGNED,
      'Issue Assigned',
      `"${issue.title}" has been assigned to a worker`,
      issue.id
    ),
  ];

  if (workerId) {
    notifications.push(
      await createNotification(
        workerId,
        NotificationType.ISSUE_ASSIGNED,
        'New Assignment',
        `You have been assigned: "${issue.title}"`,
        issue.id
      )
    );
  }

  return notifications;
}

export async function notifyWorkStarted(issue) {
  return createNotification(
    issue.reporterId,
    NotificationType.WORK_STARTED,
    'Work Started',
    `Repair work has started on "${issue.title}"`,
    issue.id
  );
}

export async function notifyIssueResolved(issue) {
  await createNotification(
    issue.reporterId,
    NotificationType.ISSUE_RESOLVED,
    'Issue Resolved',
    `"${issue.title}" has been marked as resolved. Please confirm if the issue is fixed.`,
    issue.id
  );

  return createNotification(
    issue.reporterId,
    NotificationType.CITIZEN_VERIFY,
    'Confirm Resolution',
    `Please verify whether "${issue.title}" has been properly resolved.`,
    issue.id
  );
}

export async function notifyIssueReopened(issue) {
  const notifications = [
    await createNotification(
      issue.reporterId,
      NotificationType.ISSUE_REOPENED,
      'Issue Reopened',
      `"${issue.title}" has been reopened based on your feedback.`,
      issue.id
    ),
  ];

  if (issue.department) {
    const deptNotifications = await notifyDepartmentUsers(
      issue.department,
      NotificationType.ISSUE_REOPENED,
      'Issue Reopened',
      `"${issue.title}" was reopened by the citizen — requires attention.`,
      issue.id
    );
    notifications.push(...deptNotifications);
  }

  return notifications;
}

export async function notifyIssueEscalated(issue) {
  const title = 'Issue Escalated';
  const message = `"${issue.title}" has exceeded SLA and been escalated.`;

  const notifications = await notifyRoleUsers(['authority', 'admin'], NotificationType.ISSUE_ESCALATED, title, message, issue.id);

  if (issue.department) {
    const deptNotifications = await notifyDepartmentUsers(
      issue.department,
      NotificationType.ISSUE_ESCALATED,
      title,
      message,
      issue.id
    );
    notifications.push(...deptNotifications);
  }

  return notifications;
}

export async function notifyBadgeEarned(userId, badgeName) {
  return createNotification(
    userId,
    NotificationType.BADGE_EARNED,
    'Badge Earned!',
    `Congratulations! You earned the "${badgeName}" badge`,
    null
  );
}

export const NotificationAgent = {
  notifyIssueReported,
  notifyVerificationNeeded,
  notifyIssueVerified,
  notifyIssueAssigned,
  notifyWorkStarted,
  notifyIssueResolved,
  notifyIssueReopened,
  notifyIssueEscalated,
  notifyBadgeEarned,
};
