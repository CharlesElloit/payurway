import pino from 'pino';
import pretty from 'pino-pretty';
import path from 'path';
import fs from 'fs';
import * as Sentry from '@sentry/node';
import { config } from '../config';

const logDir = path.resolve(config.logs.dir);
fs.mkdirSync(logDir, { recursive: true });

function getLogFile(): string {
  const date = new Date().toISOString().split('T')[0];
  return path.join(logDir, `app-${date}.log`);
}

function cleanupOldLogs() {
  try {
    const files = fs.readdirSync(logDir)
      .filter((f) => f.startsWith('app-') && f.endsWith('.log'))
      .sort();
    while (files.length > config.logs.maxFiles) {
      const old = files.shift()!;
      fs.unlinkSync(path.join(logDir, old));
    }
  } catch {}
}

cleanupOldLogs();

const streams: pino.StreamEntry[] = [
  { level: 'debug' as const, stream: pino.destination(getLogFile()) },
];

if (config.isProduction) {
  streams.push({ level: config.logs.level as any, stream: pino.destination(1) });
} else {
  streams.push({
    level: config.logs.level as any,
    stream: pretty({ colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' }),
  });
}

const logger = pino({ level: config.logs.level }, pino.multistream(streams));

export function captureError(error: Error, extra?: Record<string, any>) {
  Sentry.withScope((scope) => {
    if (extra) scope.setExtras(extra);
    Sentry.captureException(error);
  });
}

export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info', extra?: Record<string, any>) {
  Sentry.withScope((scope) => {
    if (extra) scope.setExtras(extra);
    Sentry.captureMessage(message, level);
  });
}

export default logger;
