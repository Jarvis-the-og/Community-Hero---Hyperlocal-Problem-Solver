import { getLeaderboard } from '../services/issueService.js';

export async function getTopUsers(req, res, next) {
  try {
    const limit = parseInt(req.query.limit || '10', 10);
    const users = await getLeaderboard(limit);
    res.json({ leaderboard: users });
  } catch (error) {
    next(error);
  }
}
