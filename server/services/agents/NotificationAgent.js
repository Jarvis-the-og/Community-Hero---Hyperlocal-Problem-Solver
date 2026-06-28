import { getDb } from '../firebase/index.js';
import { inMemoryStore } from '../../utils/inMemoryStore.js';
import { NotificationType } from '@community-hero/shared/enums/index.js';

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

export async function notifyIssueReported(issue) {
  const notifications = [];

  const authorityMsg = await createNotification(
    'authority',
    NotificationType.NEARBY_ISSUE,
    'New Issue Reported',
    `"${issue.title}" reported near ${issue.location?.address || 'your area'}`,
    issue.id
  );
  notifications.push(authorityMsg);

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
  return createNotification(
    issue.reporterId,
    NotificationType.ISSUE_RESOLVED,
    'Issue Resolved',
    `"${issue.title}" has been marked as resolved!`,
    issue.id
  );
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
  notifyBadgeEarned,
};
