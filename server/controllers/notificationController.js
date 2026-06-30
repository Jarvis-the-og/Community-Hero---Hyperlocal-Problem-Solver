import { getNotifications, markNotificationRead } from '../services/issueService.js';

export async function getUserNotifications(req, res, next) {
  try {
    const notifications = await getNotifications(req.user.uid);
    res.json({ notifications });
  } catch (error) {
    next(error);
  }
}

export async function markAsRead(req, res, next) {
  try {
    await markNotificationRead(req.params.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}
