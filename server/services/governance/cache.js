import crypto from 'crypto';

class TimedCache {
  constructor(maxEntries = 1000) {
    this.maxEntries = maxEntries;
    this.store = new Map();
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  set(key, value, ttlMs = 0) {
    if (this.store.size >= this.maxEntries) {
      const firstKey = this.store.keys().next().value;
      if (firstKey) this.store.delete(firstKey);
    }

    this.store.set(key, {
      value,
      expiresAt: ttlMs > 0 ? Date.now() + ttlMs : null,
    });
  }

  delete(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}

export const requestCache = new TimedCache();

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === 'object' && value.constructor === Object) {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = sortValue(value[key]);
        return acc;
      }, {});
  }
  return value;
}

export function stableStringify(value) {
  return JSON.stringify(sortValue(value));
}

export function createCacheKey(namespace, value) {
  const hash = crypto.createHash('sha256').update(stableStringify(value)).digest('hex');
  return `${namespace}:${hash}`;
}

export function normalizeCoordinates(lat, lng, precision = 5) {
  const factor = 10 ** precision;
  return {
    lat: Math.round(Number(lat) * factor) / factor,
    lng: Math.round(Number(lng) * factor) / factor,
  };
}
