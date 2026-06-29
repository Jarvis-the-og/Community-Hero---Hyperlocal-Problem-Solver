import fs from 'fs';
import path from 'path';
import { config } from '../../config/index.js';

const logDir = path.resolve(config.projectRoot, 'logs');
const logFile = path.join(logDir, 'requests.jsonl');

function sanitizeError(error) {
  if (!error) return null;
  return {
    name: error.name || 'Error',
    message: error.message || String(error),
    code: error.code,
    status: error.status,
  };
}

export function logRequestEvent(event) {
  const payload = {
    timestamp: new Date().toISOString(),
    ...event,
    error: sanitizeError(event.error),
  };

  try {
    fs.mkdirSync(logDir, { recursive: true });
    fs.appendFileSync(logFile, `${JSON.stringify(payload)}\n`);
  } catch (error) {
    console.error('Request logger failed:', error.message);
  }

  if (config.nodeEnv !== 'production') {
    const status = payload.success ? 'ok' : 'fail';
    console.log(
      `[${status}] ${payload.api || 'http'} ${payload.endpoint || payload.operation || 'unknown'} ${payload.executionTimeMs || 0}ms`
    );
  }
}
