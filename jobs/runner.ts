/**
 * Job runner scaffold — bounded in-process worker pool.
 *
 * Architecture (per CLAUDE.md §4.4):
 *   - Single Next.js process; background work is short-running (≤ 30 s).
 *   - Worker pool pulls from the in-memory queue (this module).
 *   - Graceful shutdown: SIGTERM drains the queue, waiting for in-flight
 *     jobs to complete before exiting.
 *   - Job idempotency is enforced at enqueue time (`enqueue.ts`).
 *   - Terminal failures (exhausted retries) are written to `FailedJob`.
 *
 * The runner does NOT import from `lib/logger/` directly — it uses the
 * local `jobs/logger.ts` placeholder so it can run before T0-9-1 lands.
 * Once T0-9-1 is done, replace the import here.
 */

import { logger } from './logger';
import { enqueue, completeJob, queueSize, dequeue } from './enqueue';
import { dispatchJob } from './registry';
import { backoffDelay } from './retry';
import type { Job, WorkerPoolConfig } from './types';

const DEFAULT_CONFIG: Required<WorkerPoolConfig> = {
  concurrency: 4,
  defaultMaxAttempts: 5,
  pollIntervalMs: 1_000,
};

/** Singleton runner instance (survives Next.js HMR). */
const globalForRunner = globalThis as unknown as {
  __ccverseRunner?: Runner;
};

class Runner {
  private readonly concurrency: number;
  private readonly defaultMaxAttempts: number;
  private readonly pollIntervalMs: number;

  private workers: Set<Promise<void>> = new Set();
  private running = false;
  private draining = false;
  private shutdownSignal: 'SIGTERM' | 'SIGINT' | null = null;

  constructor(config: WorkerPoolConfig = {}) {
    this.concurrency = (config.concurrency ?? DEFAULT_CONFIG.concurrency) as number;
    this.defaultMaxAttempts = (config.defaultMaxAttempts ?? DEFAULT_CONFIG.defaultMaxAttempts) as number;
    this.pollIntervalMs = (config.pollIntervalMs ?? DEFAULT_CONFIG.pollIntervalMs) as number;

    // Wire graceful shutdown.
    process.on('SIGTERM', () => this._beginShutdown('SIGTERM'));
    process.on('SIGINT',  () => this._beginShutdown('SIGINT'));
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  /** Start the worker pool. Idempotent. */
  start(): void {
    if (this.running) return;
    this.running = true;
    logger.info('[jobs] Runner started', { concurrency: this.concurrency });

    // Feed workers indefinitely until shutdown.
    this._feedLoop();
  }

  /**
   * Register a no-op test job and immediately run it.
   * Used by the acceptance test in T0-4-1.
   */
  async registerAndRunTest(): Promise<boolean> {
    const { registerJobType } = await import('./registry');
    registerJobType('test.noop', async () => {});
    const result = enqueue({ type: 'test.noop', payload: {} });
    // Wait for the job to be picked up (polling loop).
    await new Promise<void>((resolve) => setTimeout(resolve, this.pollIntervalMs * 2));
    return result.queued;
  }

  // ─── Internal ────────────────────────────────────────────────────────────

  private _feedLoop(): void {
    // Continuously spawn workers while not draining and under concurrency limit.
    const tick = async () => {
      if (!this.running) return;

      while (!this.draining && this.workers.size < this.concurrency) {
        const job = this._nextJob();
        if (!job) break;
        const p = this._runWorker(job);
        this.workers.add(p);
        p.then(() => this.workers.delete(p));
      }
    };

    // Schedule next poll after this tick resolves.
    tick().finally(() => {
      if (this.running) {
        setTimeout(() => this._feedLoop(), this.pollIntervalMs);
      }
    });
  }

  /** Pull the next due job from the queue. Returns undefined if none are ready. */
  private _nextJob(): Job | undefined {
    if (queueSize() === 0) return undefined;
    const job = dequeue();

    if (!job) return undefined;

    // If the job is scheduled for the future, put it back and return undefined.
    if (job.runAt > new Date()) {
      // Re-enqueue with the same key (already deduplicated at original enqueue).
      enqueue({ type: job.type, payload: job.payload, key: job.key, runAt: job.runAt });
      return undefined;
    }

    return job;
  }

  private async _runWorker(job: Job): Promise<void> {
    logger.info('[jobs] Worker picked up job', { jobId: job.id, type: job.type, attempt: job.attempts + 1 });

    const incremented: Job = { ...job, attempts: job.attempts + 1 };
    const result = await dispatchJob(incremented);

    if (result.ok) {
      if (job.key) completeJob(job.key);
      logger.info('[jobs] Job completed', { jobId: job.id, type: job.type, durationMs: result.durationMs });
      return;
    }

    // Failure path.
    if (result.willRetry) {
      const delay = backoffDelay(incremented.attempts);
      const nextRunAt = new Date(Date.now() + delay);
      logger.warn('[jobs] Job failed, scheduling retry', {
        jobId: job.id,
        type: job.type,
        error: result.error,
        attempt: incremented.attempts,
        nextRunAt: nextRunAt.toISOString(),
        delayMs: delay,
      });
      enqueue({ type: job.type, payload: job.payload, key: job.key, maxAttempts: job.maxAttempts, runAt: nextRunAt });
      if (job.key) completeJob(job.key);
    } else {
      // Terminal failure — write to FailedJob.
      logger.error('[jobs] Job exhausted retries, moving to FailedJob', {
        jobId: job.id,
        type: job.type,
        error: result.error,
        attempts: incremented.attempts,
      });
      await this._writeFailedJob(job, result.error);
      if (job.key) completeJob(job.key);
    }
  }

  private async _writeFailedJob(job: Job, error: string): Promise<void> {
    const { prisma } = await import('@/lib/db');
    await prisma.failedJob.create({
      data: {
        jobType: job.type,
        payload: job.payload as object,
        error,
        attempts: job.attempts,
      },
    });
  }

  private _beginShutdown(signal: 'SIGTERM' | 'SIGINT'): void {
    if (this.draining) return;
    this.draining = true;
    this.shutdownSignal = signal;
    logger.info('[jobs] Shutdown signal received, draining queue', { signal });

    // Wait for all in-flight workers to finish.
    const waitForWorkers = async (): Promise<void> => {
      if (this.workers.size === 0) {
        this.running = false;
        logger.info('[jobs] Runner stopped gracefully');
        process.exit(0);
      } else {
        logger.info('[jobs] Waiting for in-flight workers to finish', { pending: this.workers.size });
        await Promise.race([Promise.all([...this.workers]), new Promise((r) => setTimeout(r, 30_000))]);
        await waitForWorkers();
      }
    };
    waitForWorkers();
  }
}

/**
 * Get or create the singleton Runner instance.
 * The runner is not started automatically — call `.start()` once at app boot.
 */
export function getRunner(config?: WorkerPoolConfig): Runner {
  if (!globalForRunner.__ccverseRunner) {
    globalForRunner.__ccverseRunner = new Runner(config);
  }
  return globalForRunner.__ccverseRunner;
}

/** @internal — for unit testing only. */
export function _resetRunnerForTesting(): void {
  delete globalForRunner.__ccverseRunner;
}
