/**
 * Shared job types for the CC Verse job system.
 *
 * The job system is an in-process worker pool (MVP scope). Background work
 * is short-running (≤ 30 s) or split into steps. Job idempotency keys live
 * in the payload; deduplication is handled in-memory at enqueue time.
 *
 * For future phases, this can be swapped for a durable (DB-backed) queue
 * without changing the handler interface.
 */

/** A registered job handler. Returns a typed result or throws. */
export type JobHandler<TPayload = unknown, TResult = unknown> = (
  payload: TPayload,
) => Promise<TResult>;

/** Raw job payload stored in the queue. */
export interface Job {
  id: string;
  type: string;
  payload: unknown;
  key?: string;          // idempotency key — deduplicated against in-flight/queued
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  runAt: Date;
}

/** Result returned after a job completes (success or terminal failure). */
export interface JobResult<TResult = unknown> {
  ok: true;
  result: TResult;
  attempts: number;
  durationMs: number;
}

export interface JobFailure {
  ok: false;
  error: string;
  attempts: number;
  durationMs: number;
  willRetry: boolean;
}

export type JobRunResult<TResult = unknown> = JobResult<TResult> | JobFailure;

/** Configuration for the worker pool. */
export interface WorkerPoolConfig {
  /** Number of concurrent workers. Default: 4. */
  concurrency?: number;
  /** Default max attempts per job. Default: 5. */
  defaultMaxAttempts?: number;
  /** Poll interval in ms for the queue feeder. Default: 1000. */
  pollIntervalMs?: number;
}
