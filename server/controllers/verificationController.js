import {
  addVerification,
  getVerifications,
  updateIssue,
  getIssueById,
  addTimelineEvent,
  addPoints,
} from '../services/issueService.js';
import { NotificationAgent } from '../services/agents/NotificationAgent.js';
import { GamificationService } from '../services/gamificationService.js';
import { uploadMedia } from '../services/issueService.js';
import { IssueStatus, VerificationStatus, PointAction } from '@community-hero/shared/enums/index.js';

export async function getIssueVerifications(req, res, next) {
  try {
    const verifications = await getVerifications(req.params.issueId);
    res.json({ verifications });
  } catch (error) {
    next(error);
  }
}

export async function submitVerification(req, res, next) {
  try {
    const { status, comment } = req.body;
    if (!['confirmed', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be confirmed or rejected' });
    }

    let evidenceUrls = [];
    if (req.files?.length) {
      evidenceUrls = await Promise.all(
        req.files.map((file) => uploadMedia(file.buffer, file.originalname, file.mimetype))
      );
    }

    const verification = await addVerification({
      issueId: req.params.issueId,
      userId: req.user.uid,
      status,
      comment,
      evidenceUrls,
    });

    const allVerifications = await getVerifications(req.params.issueId);
    const confirmed = allVerifications.filter((v) => v.status === VerificationStatus.CONFIRMED).length;
    const total = allVerifications.length;
    const verificationScore = total > 0 ? Math.round((confirmed / total) * 100) : 0;

    const issue = await getIssueById(req.params.issueId);
    const updates = { verificationScore };

    if (verificationScore >= 60 && issue.status === IssueStatus.AI_CATEGORIZED) {
      updates.status = IssueStatus.COMMUNITY_VERIFIED;
      await addTimelineEvent(req.params.issueId, {
        status: IssueStatus.COMMUNITY_VERIFIED,
        label: 'Community Verified',
        description: `${verificationScore}% verification score`,
        timestamp: new Date().toISOString(),
      });
      await NotificationAgent.notifyIssueVerified(issue, issue.reporterId);
    }

    await updateIssue(req.params.issueId, updates);
    await GamificationService.awardPointsWithBadges(req.user.uid, PointAction.VERIFY);

    res.status(201).json({ verification, verificationScore });
  } catch (error) {
    next(error);
  }
}

export async function verifyResolution(req, res, next) {
  try {
    const { verifyCompletionFromUrls } = await import('../services/agents/VerificationAgent.js');
    const issue = await getIssueById(req.params.issueId);

    if (!issue?.beforeImages?.length || !issue?.afterImages?.length) {
      return res.status(400).json({ error: 'Before and after images required' });
    }

    const result = await verifyCompletionFromUrls(
      issue.beforeImages[0],
      issue.afterImages[issue.afterImages.length - 1]
    );

    const updates = {
      resolutionStatus: result.status,
      status: result.status === 'resolved' ? IssueStatus.AI_VERIFIED : IssueStatus.COMPLETED,
    };

    await updateIssue(req.params.issueId, updates);
    await addTimelineEvent(req.params.issueId, {
      status: IssueStatus.AI_VERIFIED,
      label: 'AI Verified',
      description: result.analysis,
      timestamp: new Date().toISOString(),
    });

    res.json({ result, issue: await getIssueById(req.params.issueId) });
  } catch (error) {
    next(error);
  }
}
