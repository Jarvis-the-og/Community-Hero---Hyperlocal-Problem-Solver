import { generateFromImage, parseJsonResponse } from '../gemini/index.js';
import { VERIFICATION_PROMPT } from '../gemini/prompts/index.js';
import { ResolutionStatus } from '@community-hero/shared/enums/index.js';

export async function verifyCompletion(beforeBuffer, afterBuffer, mimeType = 'image/jpeg') {
  try {
    const beforeBase64 = beforeBuffer.toString('base64');
    const afterBase64 = afterBuffer.toString('base64');

    const model = (await import('../gemini/index.js')).getModel();
    const result = await model.generateContent([
      VERIFICATION_PROMPT,
      'BEFORE image:',
      { inlineData: { data: beforeBase64, mimeType } },
      'AFTER image:',
      { inlineData: { data: afterBase64, mimeType } },
    ]);

    const response = result.response.text();
    const parsed = parseJsonResponse(response);

    if (parsed?.status) {
      return {
        status: parsed.status,
        confidence: Math.min(1, Math.max(0, parsed.confidence || 0.7)),
        analysis: parsed.analysis || 'AI comparison completed',
      };
    }
  } catch (error) {
    console.error('VerificationAgent error:', error.message);
  }

  return {
    status: ResolutionStatus.NEED_MANUAL_REVIEW,
    confidence: 0.5,
    analysis: 'Unable to automatically verify. Manual review recommended.',
  };
}

export async function verifyCompletionFromUrls(beforeUrl, afterUrl) {
  try {
    const [beforeRes, afterRes] = await Promise.all([fetch(beforeUrl), fetch(afterUrl)]);
    const [beforeBuffer, afterBuffer] = await Promise.all([
      Buffer.from(await beforeRes.arrayBuffer()),
      Buffer.from(await afterRes.arrayBuffer()),
    ]);
    return verifyCompletion(beforeBuffer, afterBuffer);
  } catch (error) {
    console.error('VerificationAgent URL error:', error.message);
    return {
      status: ResolutionStatus.NEED_MANUAL_REVIEW,
      confidence: 0.3,
      analysis: 'Failed to fetch images for comparison.',
    };
  }
}

export const VerificationAgent = { verifyCompletion, verifyCompletionFromUrls };
