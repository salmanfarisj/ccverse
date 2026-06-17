/**
 * Job type registry and dispatcher.
 *
 * Maps job type strings → typed handlers. The dispatcher is called by the
 * worker pool; unknown types are logged and written to FailedJob so they
 * can be replayed after a handler is registered.
 */

import type { JobHandler, Job, JobRunResult } from './types';
import { prisma } from '@/lib/db';
import { logger } from './logger';

type AnyHandler = JobHandler<unknown, unknown>;

/** Per-type handler registry. */
const handlers = new Map<string, AnyHandler>();

/**
 * Register a job handler. Safe to call multiple times (hot-reload).
 * Throws if the same type is registered by two different modules.
 */
export function registerJobType<TPayload, TResult>(
  type: string,
  handler: JobHandler<TPayload, TResult>,
): void {
  if (handlers.has(type)) {
    // Allow re-registration in dev (HMR) — just overwrite.
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`[jobs] Duplicate job type registration: "${type}"`);
    }
  }
  handlers.set(type, handler as AnyHandler);
}

/** Returns all registered type names. */
export function registeredTypes(): string[] {
  return [...handlers.keys()];
}

/**
 * Dispatch a job to its registered handler.
 *
 * - Unknown type → writes to FailedJob, returns failure with willRetry=false.
 * - Known type → runs the handler, propagates any throw as a failure.
 */
export async function dispatchJob(job: Job): Promise<JobRunResult> {
  const start = Date.now();
  const handler = handlers.get(job.type);

  if (!handler) {
    const err = `No handler registered for job type: "${job.type}"`;
    logger.warn(err, { jobId: job.id, type: job.type });

    // Write to FailedJob so ops can replay after deploying a handler.
    await prisma.failedJob.create({
      data: {
        jobType: job.type,
        payload: job.payload as object,
        error: err,
        attempts: job.attempts,
      },
    });

    return {
      ok: false,
      error: err,
      attempts: job.attempts,
      durationMs: Date.now() - start,
      willRetry: false,
    };
  }

  try {
    const result = await handler(job.payload);
    return {
      ok: true,
      result,
      attempts: job.attempts,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    logger.warn('Job handler threw', { jobId: job.id, type: job.type, error, attempts: job.attempts });

    return {
      ok: false,
      error,
      attempts: job.attempts,
      durationMs: Date.now() - start,
      willRetry: job.attempts < job.maxAttempts,
    };
  }
}
