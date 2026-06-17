/**
 * Minimal structured logger for the jobs subsystem.
 *
 * Thin wrapper around `console` that emits structured JSON lines so the
 * output is grep-able and parser-friendly. This is a placeholder until
 * T0-9-1 wires up the full `lib/logger/` (pino + request id). Once that
 * lands, this module can be removed and `jobs/runner.ts` can import from
 * `lib/logger` directly.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogFields {
  msg: string;
  [key: string]: unknown;
}

function formatLevel(level: LogLevel): string {
  return level.toUpperCase().padEnd(5, ' ');
}

function log(level: LogLevel, msg: string, fields: Record<string, unknown> = {}): void {
  const line: LogFields = { msg, ...fields, level };
  const json = JSON.stringify(line);
  if (level === 'error') {
    console.error(json);
  } else if (level === 'warn') {
    console.warn(json);
  } else {
    console.log(json);
  }
}

export const logger = {
  debug(msg: string, fields?: Record<string, unknown>): void {
    if (process.env.NODE_ENV === 'production') log('debug', msg, fields);
  },
  info(msg: string, fields?: Record<string, unknown>): void {
    log('info', msg, fields);
  },
  warn(msg: string, fields?: Record<string, unknown>): void {
    log('warn', msg, fields);
  },
  error(msg: string, fields?: Record<string, unknown>): void {
    log('error', msg, fields);
  },
};
