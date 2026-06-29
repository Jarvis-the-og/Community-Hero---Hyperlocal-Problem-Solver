import { generateFromImage, parseJsonResponse } from '../gemini/index.js';
import { VISION_PROMPT } from '../gemini/prompts/index.js';
import { IssueCategory, Severity } from '@community-hero/shared/enums/index.js';

export async function analyzeImage(imageBuffer, mimeType = 'image/jpeg') {
  try {
    const base64 = imageBuffer.toString('base64');
    const response = await generateFromImage(VISION_PROMPT, base64, mimeType);
    const parsed = parseJsonResponse(response);

    if (parsed && parsed.category) {
      return {
        category: parsed.category || IssueCategory.OTHER,
        title: parsed.title,
        description: parsed.description,
        severity: parsed.severity || Severity.MEDIUM,
        department: parsed.department || 'Public Works',
        hazards: parsed.hazards || [],
        confidence: Math.min(1, Math.max(0, parsed.confidence || 0.7)),
      };
    }
  } catch (error) {
    if (error?.status === 429 || String(error?.code || '').includes('quota')) {
      throw error;
    }
    console.error('VisionAgent error:', error.message);
  }

  throw new Error("AI analysis unavailable.");
}

export const VisionAgent = { analyzeImage };
