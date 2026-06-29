const dailyUsage = new Map();
const windowUsage = new Map();

function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function endOfDayUtc(date = new Date()) {
  const end = new Date(date);
  end.setUTCHours(23, 59, 59, 999);
  return end.getTime();
}

function windowKey(key, windowMs, now = Date.now()) {
  return `${key}:${Math.floor(now / windowMs)}`;
}

export function consumeDailyQuota({ key, limit, units = 1, now = new Date() }) {
  if (!limit || limit <= 0) {
    return { allowed: true, remaining: Infinity, resetAt: endOfDayUtc(now) };
  }

  const usageKey = `${key}:${dayKey(now)}`;
  const used = dailyUsage.get(usageKey) || 0;
  if (used + units > limit) {
    return {
      allowed: false,
      remaining: Math.max(0, limit - used),
      resetAt: endOfDayUtc(now),
    };
  }

  dailyUsage.set(usageKey, used + units);
  return {
    allowed: true,
    remaining: Math.max(0, limit - used - units),
    resetAt: endOfDayUtc(now),
  };
}

export function consumeWindowQuota({ key, limit, windowMs, units = 1, now = Date.now() }) {
  if (!limit || limit <= 0 || !windowMs || windowMs <= 0) {
    return { allowed: true, remaining: Infinity, resetAt: now + (windowMs || 0) };
  }

  const bucket = windowKey(key, windowMs, now);
  const used = windowUsage.get(bucket) || 0;
  if (used + units > limit) {
    return {
      allowed: false,
      remaining: Math.max(0, limit - used),
      resetAt: (Math.floor(now / windowMs) + 1) * windowMs,
    };
  }

  windowUsage.set(bucket, used + units);
  return {
    allowed: true,
    remaining: Math.max(0, limit - used - units),
    resetAt: (Math.floor(now / windowMs) + 1) * windowMs,
  };
}

export function pruneQuotaStores(now = Date.now()) {
  for (const key of dailyUsage.keys()) {
    if (!key.endsWith(dayKey(new Date(now)))) {
      dailyUsage.delete(key);
    }
  }

  for (const key of windowUsage.keys()) {
    const [, windowBucket] = key.split(':');
    if (Number.isNaN(Number(windowBucket))) continue;
    const bucketStart = Number(windowBucket) * 1000;
    if (bucketStart + 24 * 60 * 60 * 1000 < now) {
      windowUsage.delete(key);
    }
  }
}
