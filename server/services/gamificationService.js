import { BadgeType, PointAction } from '@community-hero/shared/enums/index.js';
import { getUser, upsertUser, addPoints } from './issueService.js';
import { NotificationAgent } from './agents/NotificationAgent.js';

const BADGE_LABELS = {
  [BadgeType.COMMUNITY_HERO]: 'Community Hero',
  [BadgeType.TOP_VOLUNTEER]: 'Top Volunteer',
  [BadgeType.PROBLEM_SOLVER]: 'Problem Solver',
  [BadgeType.EARLY_REPORTER]: 'Early Reporter',
  [BadgeType.VERIFICATION_CHAMPION]: 'Verification Champion',
};

const BADGE_THRESHOLDS = [
  { badge: BadgeType.EARLY_REPORTER, minPoints: 10 },
  { badge: BadgeType.COMMUNITY_HERO, minPoints: 50 },
  { badge: BadgeType.VERIFICATION_CHAMPION, minPoints: 75 },
  { badge: BadgeType.PROBLEM_SOLVER, minPoints: 100 },
  { badge: BadgeType.TOP_VOLUNTEER, minPoints: 200 },
];

export async function checkAndAwardBadges(userId) {
  const user = await getUser(userId);
  if (!user) return [];

  const existing = new Set(user.badges || []);
  const awarded = [];

  for (const { badge, minPoints } of BADGE_THRESHOLDS) {
    if ((user.points || 0) >= minPoints && !existing.has(badge)) {
      existing.add(badge);
      awarded.push(badge);
      await NotificationAgent.notifyBadgeEarned(userId, BADGE_LABELS[badge] || badge);
    }
  }

  if (awarded.length) {
    await upsertUser({ ...user, badges: [...existing] });
  }

  return awarded;
}

export async function awardPointsWithBadges(userId, points) {
  await addPoints(userId, points);
  return checkAndAwardBadges(userId);
}

export async function awardResolutionPoints(userId) {
  return awardPointsWithBadges(userId, PointAction.RESOLUTION);
}

export const GamificationService = {
  checkAndAwardBadges,
  awardPointsWithBadges,
  awardResolutionPoints,
};
