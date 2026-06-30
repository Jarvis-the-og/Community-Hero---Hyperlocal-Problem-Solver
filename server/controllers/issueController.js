import {
  getUser,
  upsertUser,
  getIssues,
  getIssueById,
  createIssue,
  updateIssue,
  addTimelineEvent,
  getNearbyIssues,
  supportIssue,
  uploadMedia,
  addPoints,
} from '../services/issueService.js';
import { analyzeImage } from '../services/agents/VisionAgent.js';
import { analyzeLocation } from '../services/agents/LocationAgent.js';
import { findDuplicates } from '../services/agents/DuplicateAgent.js';
import { calculatePriority } from '../services/agents/PriorityAgent.js';
import { NotificationAgent } from '../services/agents/NotificationAgent.js';
import { generateText } from '../services/ai/index.js';
import { SUMMARY_PROMPT } from '../services/ai/prompts/index.js';
import { IssueStatus, PointAction } from '@community-hero/shared/enums/index.js';

export async function getAllIssues(req, res, next) {
  try {
    const { status, category, priority, reporterId } = req.query;
    const issues = await getIssues({ status, category, priority, reporterId });
    res.json({ issues });
  } catch (error) {
    next(error);
  }
}

export async function getIssue(req, res, next) {
  try {
    const issue = await getIssueById(req.params.id);
    if (!issue) return res.status(404).json({ error: 'Issue not found' });
    res.json({ issue });
  } catch (error) {
    next(error);
  }
}

export async function getNearby(req, res, next) {
  try {
    const { lat, lng, radius } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });
    const issues = await getNearbyIssues(parseFloat(lat), parseFloat(lng), parseFloat(radius || 5));
    res.json({ issues });
  } catch (error) {
    next(error);
  }
}

export async function analyzeMedia(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'Media file required' });

    const analysis = await analyzeImage(req.file.buffer, req.file.mimetype);
    const { lat, lng } = req.body;

    let location = null;
    if (lat && lng) {
      location = await analyzeLocation(parseFloat(lat), parseFloat(lng));
    }

    res.json({ analysis, location });
  } catch (error) {
    next(error);
  }
}

export async function checkDuplicates(req, res, next) {
  try {
    const { lat, lng, category, title, description } = req.body;
    const result = await findDuplicates({ lat, lng, category, title, description });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function createNewIssue(req, res, next) {
  try {
    const {
      title,
      description,
      category,
      severity,
      department,
      hazards,
      aiConfidence,
      lat,
      lng,
      duplicateOf,
    } = req.body;

    let mediaUrls = [];
    if (req.body.mediaUrls) {
      try {
        mediaUrls = JSON.parse(req.body.mediaUrls);
      } catch {
        mediaUrls = [req.body.mediaUrls].filter(Boolean);
      }
    }
    if (req.files?.length) {
      const uploaded = await Promise.all(
        req.files.map((file) => uploadMedia(file.buffer, file.originalname, file.mimetype))
      );
      mediaUrls = [...mediaUrls, ...uploaded];
    }

    let location = { lat: parseFloat(lat), lng: parseFloat(lng) };
    if (lat && lng) {
      const locationData = await analyzeLocation(parseFloat(lat), parseFloat(lng));
      location = locationData;
    }

    if (!duplicateOf) {
      const duplicates = await findDuplicates({
        lat: location.lat,
        lng: location.lng,
        category,
        title,
        description,
      });
      if (duplicates.isDuplicate && duplicates.matches.length > 0) {
        return res.status(409).json({
          error: 'Potential duplicate detected',
          duplicates,
        });
      }
    }

    const priorityResult = await calculatePriority({
      category,
      severity,
      supportCount: 0,
      verificationScore: 0,
      location,
      createdAt: new Date().toISOString(),
    });

    let aiSummary = '';
    try {
      aiSummary = await generateText(
        `${SUMMARY_PROMPT}\n\nIssue: ${title}\nDescription: ${description}\nCategory: ${category}\nSeverity: ${severity}`
      );
    } catch {
      aiSummary = `${category} issue reported: ${title}`;
    }

    const user = await getUser(req.user.uid);
    const issue = await createIssue({
      title,
      description,
      category,
      severity,
      priority: priorityResult.priority,
      status: IssueStatus.AI_CATEGORIZED,
      reporterId: req.user.uid,
      reporterName: user?.displayName || req.user.name || 'Anonymous',
      mediaUrls,
      location,
      department,
      hazards: hazards ? JSON.parse(hazards) : [],
      aiConfidence: parseFloat(aiConfidence) || 0.7,
      aiSummary,
      duplicateOf: duplicateOf || null,
      timeline: [
        { status: IssueStatus.REPORTED, label: 'Reported', timestamp: new Date().toISOString() },
        {
          status: IssueStatus.AI_CATEGORIZED,
          label: 'AI Categorized',
          description: `Priority: ${priorityResult.priority}. ${priorityResult.reasoning}`,
          timestamp: new Date().toISOString(),
        },
      ],
    });

    await addPoints(req.user.uid, PointAction.REPORT);
    await NotificationAgent.notifyIssueReported(issue);

    res.status(201).json({ issue, priority: priorityResult });
  } catch (error) {
    next(error);
  }
}

export async function supportExistingIssue(req, res, next) {
  try {
    const issue = await supportIssue(req.params.id);
    if (!issue) return res.status(404).json({ error: 'Issue not found' });
    await addPoints(req.user.uid, PointAction.SUPPORT);
    res.json({ issue });
  } catch (error) {
    next(error);
  }
}

export async function updateIssueStatus(req, res, next) {
  try {
    const { status, assignedTo, assignedWorkerName } = req.body;
    const updates = { status };

    if (assignedTo) {
      updates.assignedTo = assignedTo;
      updates.assignedWorkerName = assignedWorkerName;
    }

    const issue = await updateIssue(req.params.id, updates);

    if (status) {
      const statusLabels = {
        assigned: 'Assigned',
        in_progress: 'In Progress',
        completed: 'Completed',
        ai_verified: 'AI Verified',
        community_verified: 'Community Verified',
      };
      await addTimelineEvent(req.params.id, {
        status,
        label: statusLabels[status] || status,
        actor: req.userProfile?.displayName || 'Authority',
        timestamp: new Date().toISOString(),
      });
    }

    if (status === 'assigned') await NotificationAgent.notifyIssueAssigned(issue, assignedTo);
    if (status === 'in_progress') await NotificationAgent.notifyWorkStarted(issue);
    if (status === 'completed') await NotificationAgent.notifyIssueResolved(issue);

    res.json({ issue });
  } catch (error) {
    next(error);
  }
}

export async function uploadResolutionImages(req, res, next) {
  try {
    const { type } = req.body;
    if (!req.files?.length) return res.status(400).json({ error: 'Images required' });

    const urls = await Promise.all(
      req.files.map((file) => uploadMedia(file.buffer, file.originalname, file.mimetype))
    );

    const field = type === 'after' ? 'afterImages' : 'beforeImages';
    const issue = await getIssueById(req.params.id);
    const existing = issue[field] || [];

    const updated = await updateIssue(req.params.id, {
      [field]: [...existing, ...urls],
    });

    res.json({ issue: updated });
  } catch (error) {
    next(error);
  }
}

export async function syncUser(req, res, next) {
  try {
    const { displayName, photoURL, role } = req.body;
    const user = await upsertUser({
      id: req.user.uid,
      email: req.user.email,
      displayName: displayName || req.user.name,
      photoURL,
      role: role || 'citizen',
      points: 0,
      badges: [],
      createdAt: new Date().toISOString(),
    });
    res.json({ user });
  } catch (error) {
    next(error);
  }
}

export async function getProfile(req, res, next) {
  try {
    let user = await getUser(req.user.uid);
    if (!user) {
      user = await upsertUser({
        id: req.user.uid,
        email: req.user.email,
        displayName: req.user.name || 'User',
        role: 'citizen',
        points: 0,
        badges: [],
        createdAt: new Date().toISOString(),
      });
    }
    res.json({ user });
  } catch (error) {
    next(error);
  }
}
