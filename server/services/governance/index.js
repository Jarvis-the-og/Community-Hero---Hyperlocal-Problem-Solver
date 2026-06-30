import crypto from 'crypto';
import { config } from '../../config/index.js';
import { getRequestContext } from '../../utils/requestContext.js';
import { createCacheKey, normalizeCoordinates, requestCache } from './cache.js';
import { consumeDailyQuota } from './quotas.js';
import { logRequestEvent } from './logger.js';

const inFlight = new Map();

export function hashBuffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export function resolveRequestIdentity(explicitIdentity = null) {
  if (explicitIdentity) return explicitIdentity;

  const context = getRequestContext();
  return context.user?.uid || context.requestIp || 'anonymous';
}

export function createGovernanceError(message, status = 429, code = 'quota_exceeded', retryAfterMs) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  if (retryAfterMs) error.retryAfterMs = retryAfterMs;
  return error;
}

function isTransientError(error) {
  const message = String(error?.message || '').toLowerCase();
  const status = error?.status || error?.response?.status;
  const code = error?.code;

  return (
    [500, 502, 503, 504].includes(status) ||
    ['ETIMEDOUT', 'ECONNRESET', 'EAI_AGAIN', 'ECONNABORTED', 'UND_ERR_CONNECT_TIMEOUT'].includes(code) ||
    message.includes('timeout') ||
    message.includes('fetch failed') ||
    message.includes('temporarily unavailable')
  );
}

async function withTimeout(requestFn, timeoutMs) {
  const controller = new AbortController();
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error(`Request timed out after ${timeoutMs}ms`);
      error.code = 'ETIMEDOUT';
      error.status = 504;
      controller.abort();
      reject(error);
    }, timeoutMs);
  });

  try {
    const requestPromise = Promise.resolve().then(() => requestFn({ signal: controller.signal }));
    return await Promise.race([requestPromise, timeoutPromise]);
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}

export async function withGovernedRequest({
  api,
  operation,
  requestFn,
  cacheKey = null,
  cacheTtlMs = 0,
  forceRefresh = false,
  timeoutMs = 30000,
  retryOnce = true,
  appDailyLimit = null,
  userDailyLimit = null,
  identity: explicitIdentity = null,
  metadata = {},
}) {
  const identity = resolveRequestIdentity(explicitIdentity);
  const startedAt = Date.now();
  const lookupKey = cacheKey || createCacheKey(`${api}:${operation}:inflight`, { identity, metadata });

  if (!forceRefresh && cacheKey) {
    const cached = requestCache.get(cacheKey);
    if (cached !== null && cached !== undefined) {
      logRequestEvent({
        api,
        endpoint: operation,
        user: identity,
        executionTimeMs: 0,
        success: true,
        status: 'cache_hit',
        metadata,
        cacheHit: true,
      });
      return cached;
    }
  }

  if (inFlight.has(lookupKey)) {
    return inFlight.get(lookupKey);
  }

  const task = (async () => {
    try {
      if (appDailyLimit) {
        const appQuota = consumeDailyQuota({
          key: `${api}:app`,
          limit: appDailyLimit,
        });
        if (!appQuota.allowed) {
          throw createGovernanceError(
            `${api} daily application quota exceeded`,
            429,
            'app_quota_exceeded',
            appQuota.resetAt - Date.now()
          );
        }
      }

      if (userDailyLimit) {
        const userQuota = consumeDailyQuota({
          key: `${api}:${identity}`,
          limit: userDailyLimit,
        });
        if (!userQuota.allowed) {
          throw createGovernanceError(
            `${api} daily user quota exceeded`,
            429,
            'user_quota_exceeded',
            userQuota.resetAt - Date.now()
          );
        }
      }

      const attempts = retryOnce ? 2 : 1;
      let lastError = null;

      for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
          const result = await withTimeout(requestFn, timeoutMs);

          if (cacheKey && cacheTtlMs > 0) {
            requestCache.set(cacheKey, result, cacheTtlMs);
          }

          logRequestEvent({
            api,
            endpoint: operation,
            user: identity,
            executionTimeMs: Date.now() - startedAt,
            success: true,
            status: 200,
            metadata: { ...metadata, attempt },
          });

          return result;
        } catch (error) {
          lastError = error;

          if (attempt < attempts && isTransientError(error)) {
            continue;
          }

          throw error;
        }
      }

      throw lastError || new Error('Request failed');
    } catch (error) {
      logRequestEvent({
        api,
        endpoint: operation,
        user: identity,
        executionTimeMs: Date.now() - startedAt,
        success: false,
        status: error.status || 500,
        error,
        metadata,
      });

      throw error;
    } finally {
      inFlight.delete(lookupKey);
    }
  })();

  inFlight.set(lookupKey, task);
  return task;
}

export function buildAICacheKey(operation, payload) {
  return createCacheKey(`ai:${operation}`, payload);
}

export function buildMapsCacheKey(operation, payload) {
  return createCacheKey(`maps:${operation}`, payload);
}

export { normalizeCoordinates, createCacheKey };
