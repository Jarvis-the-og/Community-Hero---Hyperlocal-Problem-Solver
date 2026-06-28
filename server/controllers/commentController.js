import { addComment, getComments, addPoints, getIssueById } from '../services/issueService.js';
import { PointAction } from '@community-hero/shared/enums/index.js';

export async function getIssueComments(req, res, next) {
  try {
    const comments = await getComments(req.params.issueId);
    res.json({ comments });
  } catch (error) {
    next(error);
  }
}

export async function createComment(req, res, next) {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Content required' });

    const issue = await getIssueById(req.params.issueId);
    if (!issue) return res.status(404).json({ error: 'Issue not found' });

    const comment = await addComment({
      issueId: req.params.issueId,
      userId: req.user.uid,
      userName: req.user.name || 'User',
      content: content.trim(),
      isHelpful: false,
    });

    res.status(201).json({ comment });
  } catch (error) {
    next(error);
  }
}

export async function markHelpful(req, res, next) {
  try {
    const { getDb } = await import('../services/firebase/index.js');
    const db = getDb();

    if (db) {
      await db.collection('comments').doc(req.params.id).update({ isHelpful: true });
    }

    const comment = { id: req.params.id, isHelpful: true };
    await addPoints(comment.userId || req.user.uid, PointAction.HELPFUL_COMMENT);
    res.json({ comment });
  } catch (error) {
    next(error);
  }
}
