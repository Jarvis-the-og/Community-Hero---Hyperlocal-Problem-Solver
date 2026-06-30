import { generateText, parseJsonResponse } from '../ai/index.js';
import { PRIORITY_PROMPT } from '../ai/prompts/index.js';
import { Priority, Severity } from '@community-hero/shared/enums/index.js';

const SEVERITY_WEIGHTS = { critical: 40, medium: 25, low: 10 };
const CATEGORY_WEIGHTS = {
  electrical_hazard: 15,
  water_leakage: 12,
  fallen_tree: 10,
  pothole: 8,
  road_damage: 8,
  drainage: 7,
  broken_streetlight: 6,
  garbage: 4,
  illegal_dumping: 5,
  other: 3,
};

function calculateBaseScore(issue) {
  let score = SEVERITY_WEIGHTS[issue.severity] || 15;
  score += CATEGORY_WEIGHTS[issue.category] || 3;
  score += Math.min(issue.supportCount || 0, 10) * 2;
  score += Math.min(issue.verificationScore || 0, 100) * 0.1;

  if (issue.createdAt) {
    const ageHours = (Date.now() - new Date(issue.createdAt).getTime()) / 3600000;
    if (ageHours > 72) score += 10;
    else if (ageHours > 24) score += 5;
  }

  if (issue.location?.nearbyPlaces) {
    const hasHospital = issue.location.nearbyPlaces.some(
      (p) => p.type?.includes('hospital') || p.name?.toLowerCase().includes('hospital')
    );
    const hasSchool = issue.location.nearbyPlaces.some(
      (p) => p.type?.includes('school') || p.name?.toLowerCase().includes('school')
    );
    if (hasHospital) score += 15;
    if (hasSchool) score += 10;
  }

  return Math.min(100, score);
}

function scoreToPriority(score) {
  if (score >= 70) return Priority.CRITICAL;
  if (score >= 40) return Priority.MEDIUM;
  return Priority.LOW;
}

export async function calculatePriority(issue, context = {}) {
  const baseScore = calculateBaseScore(issue);

  try {
    const prompt = `${PRIORITY_PROMPT}

Issue details:
- Category: ${issue.category}
- Severity: ${issue.severity}
- Support count: ${issue.supportCount || 0}
- Verification score: ${issue.verificationScore || 0}
- Location: ${issue.location?.address || 'Unknown'}
- Base calculated score: ${baseScore}
- Weather: ${context.weather || 'Unknown'}
- Near hospital: ${context.nearHospital || false}
- Near school: ${context.nearSchool || false}`;

    const response = await generateText(prompt, { json: true });
    const parsed = parseJsonResponse(response);

    if (parsed?.priority) {
      return {
        priority: parsed.priority,
        score: parsed.score || baseScore,
        reasoning: parsed.reasoning || 'AI-calculated priority',
      };
    }
  } catch (error) {
    console.error('PriorityAgent AI fallback:', error.message);
  }

  return {
    priority: scoreToPriority(baseScore),
    score: baseScore,
    reasoning: `Calculated from severity (${issue.severity}), category, support, and verification metrics.`,
  };
}

export const PriorityAgent = { calculatePriority };
