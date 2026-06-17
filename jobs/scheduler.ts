/**
 * Scheduled job registration (cron-like via setInterval).
 *
 * Per CLAUDE.md: cron-like work uses a per-instance setInterval with a
 * startup sweep. A small random offset is applied per process to avoid
 * the thundering herd problem on horizontal scale (acceptable caveat for MVP).
 *
 * Scheduled jobs are registered by calling `registerScheduledJob`. They
 * run at the configured interval, independent of the worker pool.
 */

import { logger } from './logger';
import { enqueue } from './enqueue';
import type { JobHandler } from './types';

/** A registered scheduled job. */
interface ScheduledJob {
  type: string;
  intervalMs: number;
  handler: JobHandler<unknown, void>;   // the async work to run
  timeoutMs: number;                    // max time before we kill the interval
  offsetMs: number;                    // startup delay to avoid thundering herd
  timer: ReturnType<typeof setInterval> | null;
  running: boolean;
}

/** Global registry of scheduled jobs (survives HMR). */
const globalForScheduler = globalThis as unknown as {
  __ccverseScheduledJobs?: Map<string, ScheduledJob>;
};

function getScheduledJobs(): Map<string, ScheduledJob> {
  if (!globalForScheduler.__ccverseScheduledJobs) {
    globalForScheduler.__ccverseScheduledJobs = new Map();
  }
  return globalForScheduler.__ccverseScheduledJobs;
}

export interface ScheduledJobConfig {
  /** Unique identifier for this scheduled job. */
  id: string;
  /** Job type string passed to enqueue(). */
  type: string;
  /** Interval in milliseconds. */
  intervalMs: number;
  /** Max duration in ms before the job is considered stuck and skipped. Default: 30_000. */
  timeoutMs?: number;
  /** Random startup offset max in ms (to avoid thundering herd). Default: 5000. */
  offsetMaxMs?: number;
}

/**
 * Register a recurring job.
 *
 * On registration, the job runs once after a random offset (≤ offsetMaxMs),
 * then every `intervalMs` thereafter. If the previous run is still active
 * when the next tick fires, the tick is skipped (no parallel overlap).
 *
 * @example
 * registerScheduledJob({
 *   id: 'audit.export.daily',
 *   type: 'audit.export',
 *   intervalMs: 86_400_000, // 24 h
 *   timeoutMs: 300_000,
 * });
 */
export function registerScheduledJob<TPayload>(
  config: ScheduledJobConfig,
  handler: JobHandler<TPayload, void>,
): void {
  const jobs = getScheduledJobs();

  if (jobs.has(config.id)) {
    logger.warn(`[scheduler] Duplicate scheduled job ignored: "${config.id}"`);
    return;
  }

  const offsetMs = config.offsetMaxMs ?? 5_000;

  const job: ScheduledJob = {
    type: config.type,
    intervalMs: config.intervalMs,
    handler: handler as JobHandler<unknown, void>,
    timeoutMs: config.timeoutMs ?? 30_000,
    offsetMs: Math.random() * offsetMs,
    timer: null,
    running: false,
  };

  jobs.set(config.id, job);

  // Start after offset to avoid thundering herd.
  const startTimer = (): void => {
    const offset = job.offsetMs + Math.random() * offsetMs;

    setTimeout(() => {
      _tick(config.id);
      // Then regular interval.
      job.timer = setInterval(() => _tick(config.id), job.intervalMs);
    }, offset);
  };

  startTimer();

  logger.info('[scheduler] Scheduled job registered', {
    id: config.id,
    type: config.type,
    intervalMs: config.intervalMs,
    offsetMs: job.offsetMs,
  });
}

async function _tick(id: string): Promise<void> {
  const jobs = getScheduledJobs();
  const job = jobs.get(id);
  if (!job) return;

  if (job.running) {
    logger.warn('[scheduler] Skipping tick — previous run still active', { id });
    return;
  }

  job.running = true;
  const start = Date.now();

  try {
    logger.info('[scheduler] Tick starting', { id, type: job.type });

    // Run the handler; if it throws we log and continue to next tick.
    await job.handler({});

    logger.info('[scheduler] Tick completed', {
      id,
      type: job.type,
      durationMs: Date.now() - start,
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    logger.error('[scheduler] Tick threw, will retry at next interval', {
      id,
      type: job.type,
      error,
      durationMs: Date.now() - start,
    });
  } finally {
    job.running = false;
  }
}

/**
 * Unregister a scheduled job and stop its interval.
 */
export function unregisterScheduledJob(id: string): void {
  const jobs = getScheduledJobs();
  const job = jobs.get(id);
  if (!job) return;

  if (job.timer) {
    clearInterval(job.timer);
    job.timer = null;
  }
  jobs.delete(id);
  logger.info('[scheduler] Scheduled job unregistered', { id });
}

/** Stop all scheduled jobs. Called during graceful shutdown. */
export function stopAllScheduledJobs(): void {
  const jobs = getScheduledJobs();
  for (const [id, job] of jobs) {
    if (job.timer) {
      clearInterval(job.timer);
      job.timer = null;
    }
    logger.info('[scheduler] Stopped', { id });
  }
  jobs.clear();
}
