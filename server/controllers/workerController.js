import {
  getIssues,
  getIssueById,
  updateIssue,
  addTimelineEvent,
  uploadMedia,
} from '../services/issueService.js';
import { NotificationAgent } from '../services/agents/NotificationAgent.js';
import { verifyCompletionFromUrls } from '../services/agents/VerificationAgent.js';
import { GamificationService } from '../services/gamificationService.js';
import { IssueStatus } from '@community-hero/shared/enums/index.js';

export async function getWorkerTasks(req, res, next) {
  try {
    const workerId = req.user.uid;
    const issues = await getIssues({ assignedTo: workerId });

    const today = new Date().toISOString().slice(0, 10);
    const todayTasks = issues.filter((i) => {
      if (!['assigned', 'in_progress', 'paused'].includes(i.status)) return false;
      return !i.scheduledDate || i.scheduledDate.slice(0, 10) <= today;
    });

    res.json({
      tasks: todayTasks,
      stats: {
        total: todayTasks.length,
        assigned: todayTasks.filter((i) => i.status === 'assigned').length,
        inProgress: todayTasks.filter((i) => i.status === 'in_progress').length,
        completed: issues.filter((i) => ['completed', 'ai_verified'].includes(i.status)).length,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getWorkerTask(req, res, next) {
  try {
    const issue = await getIssueById(req.params.id);
    if (!issue) return res.status(404).json({ error: 'Task not found' });
    if (issue.assignedTo !== req.user.uid) {
      return res.status(403).json({ error: 'Not assigned to you' });
    }
    res.json({ issue });
  } catch (error) {
    next(error);
  }
}

export async function workerUpdateTask(req, res, next) {
  try {
    const { action, notes } = req.body;
    const issue = await getIssueById(req.params.id);
    if (!issue) return res.status(404).json({ error: 'Task not found' });
    if (issue.assignedTo !== req.user.uid) {
      return res.status(403).json({ error: 'Not assigned to you' });
    }

    const actionMap = {
      start: { status: IssueStatus.IN_PROGRESS, label: 'Work Started' },
      pause: { status: IssueStatus.PAUSED, label: 'Work Paused' },
      complete: { status: IssueStatus.COMPLETED, label: 'Work Completed' },
    };

    const mapped = actionMap[action];
    if (!mapped) return res.status(400).json({ error: 'Invalid action' });

    const updates = { status: mapped.status };
    if (notes) updates.workerNotes = notes;

    await updateIssue(req.params.id, updates);
    await addTimelineEvent(req.params.id, {
      status: mapped.status,
      label: mapped.label,
      description: notes,
      actor: req.userProfile?.displayName || 'Field Worker',
      timestamp: new Date().toISOString(),
    });

    if (action === 'start') await NotificationAgent.notifyWorkStarted(issue);
    if (action === 'complete') {
      await NotificationAgent.notifyIssueResolved({ ...issue, ...updates });
      await GamificationService.awardResolutionPoints(req.user.uid);
    }

    res.json({ issue: await getIssueById(req.params.id) });
  } catch (error) {
    next(error);
  }
}

export async function workerUploadImages(req, res, next) {
  try {
    const { type, notes } = req.body;
    if (!req.files?.length) return res.status(400).json({ error: 'Images required' });

    const issue = await getIssueById(req.params.id);
    if (!issue) return res.status(404).json({ error: 'Task not found' });
    if (issue.assignedTo !== req.user.uid) {
      return res.status(403).json({ error: 'Not assigned to you' });
    }

    const urls = await Promise.all(
      req.files.map((file) => uploadMedia(file.buffer, file.originalname, file.mimetype))
    );

    const field = type === 'after' ? 'afterImages' : 'beforeImages';
    const existing = issue[field] || [];
    const updates = { [field]: [...existing, ...urls] };
    if (notes) updates.workerNotes = notes;

    await updateIssue(req.params.id, updates);

    let aiVerification = null;
    if (type === 'after') {
      const updated = await getIssueById(req.params.id);
      if (updated.beforeImages?.length && updated.afterImages?.length) {
        try {
          aiVerification = await verifyCompletionFromUrls(
            updated.beforeImages[0],
            updated.afterImages[updated.afterImages.length - 1]
          );
          await updateIssue(req.params.id, {
            resolutionStatus: aiVerification.status,
            aiResolutionConfidence: aiVerification.confidence,
          });
        } catch {
          // AI verification optional — worker can still complete
        }
      }
    }

    res.json({ issue: await getIssueById(req.params.id), aiVerification });
  } catch (error) {
    next(error);
  }
}
