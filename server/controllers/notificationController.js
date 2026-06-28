import { getNotifications } from '../services/issueService.js';

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
    const { getDb } = await import('../services/firebase/index.js');
    const db = getDb();

    if (db) {
      await db.collection('notifications').doc(req.params.id).update({ read: true });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}
