import { generateFromImages, parseJsonResponse } from '../gemini/index.js';
import { VERIFICATION_PROMPT } from '../gemini/prompts/index.js';
import { ResolutionStatus } from '@community-hero/shared/enums/index.js';
import { createCacheKey, withGovernedRequest } from '../governance/index.js';

export async function verifyCompletion(beforeBuffer, afterBuffer, mimeType = 'image/jpeg') {
  try {
    const response = await generateFromImages(VERIFICATION_PROMPT, [
      { buffer: beforeBuffer, data: beforeBuffer.toString('base64'), mimeType },
      { buffer: afterBuffer, data: afterBuffer.toString('base64'), mimeType },
    ]);

    const parsed = parseJsonResponse(response);
    if (parsed?.status) {
      return {
        status: parsed.status,
        confidence: Math.min(1, Math.max(0, parsed.confidence || 0.7)),
        analysis: parsed.analysis || 'AI comparison completed',
      };
    }
  } catch (error) {
    if (error?.status === 429 || String(error?.code || '').includes('quota')) {
      throw error;
    }
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
    const { beforeBuffer, afterBuffer } = await withGovernedRequest({
      api: 'storage',
      operation: 'fetch_verification_images',
      cacheKey: createCacheKey('storage:verification_images', { beforeUrl, afterUrl }),
      cacheTtlMs: 10 * 60 * 1000,
      timeoutMs: 15_000,
      requestFn: async ({ signal }) => {
        const [beforeRes, afterRes] = await Promise.all([
          fetch(beforeUrl, { signal }),
          fetch(afterUrl, { signal }),
        ]);
        const [beforeArrayBuffer, afterArrayBuffer] = await Promise.all([
          beforeRes.arrayBuffer(),
          afterRes.arrayBuffer(),
        ]);
        return {
          beforeBuffer: Buffer.from(beforeArrayBuffer),
          afterBuffer: Buffer.from(afterArrayBuffer),
        };
      },
    });

    return verifyCompletion(beforeBuffer, afterBuffer);
  } catch (error) {
    if (error?.status === 429 || String(error?.code || '').includes('quota')) {
      throw error;
    }
    console.error('VerificationAgent URL error:', error.message);
    return {
      status: ResolutionStatus.NEED_MANUAL_REVIEW,
      confidence: 0.3,
      analysis: 'Failed to fetch images for comparison.',
    };
  }
}

export const VerificationAgent = { verifyCompletion, verifyCompletionFromUrls };
