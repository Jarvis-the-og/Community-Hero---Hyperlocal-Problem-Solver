import { AsyncLocalStorage } from 'async_hooks';

const storage = new AsyncLocalStorage();

export function runWithContext(context, fn) {
  return storage.run(context, fn);
}

export function getRequestContext() {
  return storage.getStore() || {};
}

export function getIdToken() {
  return getRequestContext().idToken || null;
}
