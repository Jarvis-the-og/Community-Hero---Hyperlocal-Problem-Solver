import { randomUUID } from 'crypto';
import { consumeDailyQuota, consumeWindowQuota } from '../services/governance/quotas.js';
import { logRequestEvent } from '../services/governance/logger.js';
import { runWithContext, getRequestContext } from '../utils/requestContext.js';

function getIdentity(req, scope = 'userOrIp') {
  if (scope === 'ip') return req.ip;
  return req.user?.uid || getRequestContext().user?.uid || req.ip;
}

function quotaResponse(res, message, resetAt, statusCode = 429) {
  if (resetAt) {
    res.setHeader('Retry-After', Math.max(1, Math.ceil((resetAt - Date.now()) / 1000)));
  }
  return res.status(statusCode).json({ error: message });
}

export function createRequestContextMiddleware() {
  return (req, _res, next) => {
    runWithContext(
      {
        requestId: randomUUID(),
        requestIp: req.ip,
        requestMethod: req.method,
        requestPath: req.originalUrl,
      },
      () => next()
    );
  };
}

export function createRequestLogger() {
  return (req, res, next) => {
    const startedAt = Date.now();

    res.once('finish', () => {
      const context = getRequestContext();
      logRequestEvent({
        api: 'http',
        endpoint: req.originalUrl,
        user: context.user?.uid || req.user?.uid || req.ip,
        executionTimeMs: Date.now() - startedAt,
        success: res.statusCode < 400,
        status: res.statusCode,
        metadata: { method: req.method },
      });
    });

    next();
  };
}

export function createBurstRateLimit({ limit = 600, windowMs = 60 * 1000 } = {}) {
  return (req, res, next) => {
    if (!req.originalUrl.startsWith('/api/')) return next();

    const result = consumeWindowQuota({
      key: `http:${req.ip}`,
      limit,
      windowMs,
    });

    if (!result.allowed) {
      return quotaResponse(res, 'Too many requests. Please slow down.', result.resetAt);
    }

    next();
  };
}

export function createRouteQuotaGuard({
  name,
  windowLimit = null,
  windowMs = null,
  dailyLimit = null,
  scope = 'userOrIp',
  message = 'Quota exceeded',
} = {}) {
  return (req, res, next) => {
    const identity = getIdentity(req, scope);

    if (windowLimit && windowMs) {
      const windowResult = consumeWindowQuota({
        key: `${name}:${identity}`,
        limit: windowLimit,
        windowMs,
      });

      if (!windowResult.allowed) {
        return quotaResponse(res, message, windowResult.resetAt);
      }
    }

    if (dailyLimit) {
      const dailyResult = consumeDailyQuota({
        key: `${name}:${identity}`,
        limit: dailyLimit,
      });

      if (!dailyResult.allowed) {
        return quotaResponse(res, message, dailyResult.resetAt);
      }
    }

    next();
  };
}
