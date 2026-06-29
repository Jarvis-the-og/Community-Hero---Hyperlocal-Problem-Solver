/**
 * AI service - powered by Groq
 * Exposes the same interface (generateText, generateFromImage, parseJsonResponse)
 * so all agents work without changes.
 */
import Groq from 'groq-sdk';
import { config } from '../../config/index.js';
import { buildGeminiCacheKey, hashBuffer, withGovernedRequest } from '../governance/index.js';

let groqClient = null;

// Text model
const TEXT_MODEL = 'llama-3.3-70b-versatile';
// Vision model (supports image input)
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

const AI_APP_LIMIT = 200;
const AI_USER_LIMIT = 60;
const AI_TIMEOUT_MS = 30000;
const TEXT_CACHE_TTL_MS = 5 * 60 * 1000;
const IMAGE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export function getGroqClient() {
  if (!config.flags.enableGemini) return null;
  if (groqClient) return groqClient;
  if (!config.groqApiKey) throw new Error('GROQ_API_KEY not configured');
  groqClient = new Groq({ apiKey: config.groqApiKey });
  return groqClient;
}

// Kept for backward compat with VerificationAgent which calls getModel()
export function getModel() {
  return { _groq: true };
}

export async function generateText(prompt, options = {}) {
  if (!config.flags.enableGemini) throw new Error('AI feature disabled');

  const cacheKey = buildGeminiCacheKey('text', { prompt, json: Boolean(options.json) });

  return withGovernedRequest({
    api: 'gemini',
    operation: 'text',
    cacheKey,
    cacheTtlMs: options.cacheTtlMs ?? TEXT_CACHE_TTL_MS,
    timeoutMs: options.timeoutMs ?? AI_TIMEOUT_MS,
    retryOnce: options.retryOnce ?? true,
    appDailyLimit: AI_APP_LIMIT,
    userDailyLimit: options.userDailyLimit ?? AI_USER_LIMIT,
    metadata: { json: Boolean(options.json) },
    requestFn: async () => {
      const client = getGroqClient();
      const systemMsg = options.json
        ? 'You are a JSON-only assistant. Always respond with valid JSON and nothing else.'
        : undefined;

      const messages = [];
      if (systemMsg) messages.push({ role: 'system', content: systemMsg });
      messages.push({ role: 'user', content: prompt });

      const completion = await client.chat.completions.create({
        model: TEXT_MODEL,
        messages,
        temperature: 0.3,
        max_tokens: 1024,
        ...(options.json ? { response_format: { type: 'json_object' } } : {}),
      });

      return completion.choices[0]?.message?.content || '';
    },
  });
}

export async function generateFromImage(prompt, imageData, mimeType = 'image/jpeg', options = {}) {
  if (!config.flags.enableGemini) throw new Error('AI feature disabled');

  const imageHash = hashBuffer(Buffer.from(imageData, 'base64'));
  const cacheKey = buildGeminiCacheKey('image', { prompt, imageHash, mimeType });

  return withGovernedRequest({
    api: 'gemini',
    operation: 'image',
    cacheKey,
    cacheTtlMs: options.cacheTtlMs ?? IMAGE_CACHE_TTL_MS,
    timeoutMs: options.timeoutMs ?? AI_TIMEOUT_MS,
    retryOnce: options.retryOnce ?? true,
    appDailyLimit: AI_APP_LIMIT,
    userDailyLimit: options.userDailyLimit ?? AI_USER_LIMIT,
    metadata: { mimeType },
    requestFn: async () => {
      const client = getGroqClient();
      const dataUrl = `data:${mimeType};base64,${imageData}`;

      const completion = await client.chat.completions.create({
        model: VISION_MODEL,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
        temperature: 0.2,
        max_tokens: 1024,
        response_format: { type: 'json_object' },
      });

      return completion.choices[0]?.message?.content || '';
    },
  });
}

export async function generateFromImages(prompt, images, options = {}) {
  if (!config.flags.enableGemini) throw new Error('AI feature disabled');

  const cacheKey = buildGeminiCacheKey('images', {
    prompt,
    hashes: images.map((img) => hashBuffer(img.buffer)),
  });

  return withGovernedRequest({
    api: 'gemini',
    operation: 'images',
    cacheKey,
    cacheTtlMs: options.cacheTtlMs ?? IMAGE_CACHE_TTL_MS,
    timeoutMs: options.timeoutMs ?? AI_TIMEOUT_MS,
    retryOnce: options.retryOnce ?? true,
    appDailyLimit: AI_APP_LIMIT,
    userDailyLimit: options.userDailyLimit ?? AI_USER_LIMIT,
    metadata: {},
    requestFn: async () => {
      const client = getGroqClient();
      const contentParts = [{ type: 'text', text: prompt }];
      for (const img of images) {
        contentParts.push({
          type: 'image_url',
          image_url: { url: `data:${img.mimeType};base64,${img.data}` },
        });
      }

      const completion = await client.chat.completions.create({
        model: VISION_MODEL,
        messages: [{ role: 'user', content: contentParts }],
        temperature: 0.2,
        max_tokens: 1024,
        response_format: { type: 'json_object' },
      });

      return completion.choices[0]?.message?.content || '';
    },
  });
}

export function parseJsonResponse(text) {
  if (!text) return null;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      return null;
    }
  }
  return null;
}
