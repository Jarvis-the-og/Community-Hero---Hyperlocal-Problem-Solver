import { getAnalytics } from '../services/issueService.js';

export async function getStats(req, res, next) {
  try {
    const analytics = await getAnalytics();
    res.json({ analytics });
  } catch (error) {
    next(error);
  }
}
