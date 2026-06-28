import { generateFromImage, parseJsonResponse } from '../gemini/index.js';
import { VISION_PROMPT } from '../gemini/prompts/index.js';
import { IssueCategory, Severity } from '@community-hero/shared/enums/index.js';

const FALLBACK_ANALYSIS = {
  category: IssueCategory.OTHER,
  title: 'Community Issue Reported',
  description: 'An issue has been reported in the community. Please review the uploaded media.',
  severity: Severity.MEDIUM,
  department: 'Public Works',
  hazards: [],
  confidence: 0.5,
};

export async function analyzeImage(imageBuffer, mimeType = 'image/jpeg') {
  try {
    const base64 = imageBuffer.toString('base64');
    const response = await generateFromImage(VISION_PROMPT, base64, mimeType);
    const parsed = parseJsonResponse(response);

    if (parsed && parsed.category) {
      return {
        category: parsed.category || IssueCategory.OTHER,
        title: parsed.title || FALLBACK_ANALYSIS.title,
        description: parsed.description || FALLBACK_ANALYSIS.description,
        severity: parsed.severity || Severity.MEDIUM,
        department: parsed.department || 'Public Works',
        hazards: parsed.hazards || [],
        confidence: Math.min(1, Math.max(0, parsed.confidence || 0.7)),
      };
    }
  } catch (error) {
    console.error('VisionAgent error:', error.message);
  }

  return { ...FALLBACK_ANALYSIS };
}

export const VisionAgent = { analyzeImage };
