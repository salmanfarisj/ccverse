/**
 * In-process job queue with idempotency.
 *
 * `enqueue({ type, payload, key })` deduplicates on `key`: if a job with
 * the same key is already queued or running, the call is a no-op and
 * returns the existing job id.
 *
 * The queue is bounded (T0-4-1 runner enforces concurrency), so this module
 * only stores the pending/ready jobs. In-flight jobs are held by the
 * runner; completed jobs are dropped.
 *
 * For MVP this is all in-memory. A future phase can swap the storage
 * adapter behind the IQueue interface for a durable (DB-backed) queue
 * without changing the call site.
 */

import { randomUUID } from 'crypto';
import type { Job } from './types';

interface IQueue {
  enqueue(job: Job): string; // returns job id
  dequeue(): Job | undefined;
  size(): number;
  findByKey(key: string): Job | undefined;
  hasInFlight(key: string): boolean;
  completeJob(key: string): void; // removes from in-flight AND from pending
}

/** Global in-memory queue instance (survives HMR in dev). */
const globalForQueue = globalThis as unknown as { __ccverseJobQueue?: IQueue };

function newQueue(): IQueue {
  const pending: Job[] = [];
  const inFlight = new Set<string>();
  const keyToId = new Map<string, string>();

  return {
    enqueue(job: Job): string {
      if (job.key && keyToId.has(job.key)) {
        return keyToId.get(job.key)!;
      }
      pending.push(job);
      if (job.key) keyToId.set(job.key, job.id);
      return job.id;
    },

    dequeue(): Job | undefined {
      const job = pending.shift();
      if (job && job.key) inFlight.add(job.key);
      return job;
    },

    size(): number {
      return pending.length;
    },

    findByKey(key: string): Job | undefined {
      return pending.find((j) => j.key === key);
    },

    hasInFlight(key: string): boolean {
      return inFlight.has(key);
    },

    /** Called by the runner when a job finishes so we clear the in-flight marker. */
    completeJob(key: string): void {
      inFlight.delete(key);
      keyToId.delete(key);
      // Remove from pending so a fresh enqueue with the same key succeeds.
      const idx = pending.findIndex((j) => j.key === key);
      if (idx !== -1) pending.splice(idx, 1);
    },
  };
}

function getQueue(): IQueue {
  if (!globalForQueue.__ccverseJobQueue) {
    globalForQueue.__ccverseJobQueue = newQueue();
  }
  return globalForQueue.__ccverseJobQueue;
}

/** @internal — exposed for testing only. */
export function _resetQueueForTesting(): void {
  globalForQueue.__ccverseJobQueue = newQueue();
}

export interface EnqueueOptions<TPayload = unknown> {
  type: string;
  payload: TPayload;
  key?: string; // idempotency key
  maxAttempts?: number;
  runAt?: Date; // scheduled future execution; defaults to now
  delayMs?: number; // alternative to runAt: ms from now
}

export interface EnqueueResult {
  id: string;
  queued: boolean; // false = deduplicated (key already existed)
}

/**
 * Enqueue a job.
 *
 * Idempotency: if `key` matches an already-queued or in-flight job, the
 * call is a no-op and returns the existing job id with `queued: false`.
 */
export function enqueue<TPayload>(opts: EnqueueOptions<TPayload>): EnqueueResult {
  const { type, payload, key, maxAttempts = 5, runAt, delayMs } = opts;

  // Idempotency check — both queued and in-flight keys.
  const q = getQueue();
  if (key) {
    const existing = q.findByKey(key);
    if (existing || q.hasInFlight(key)) {
      return { id: existing?.id ?? '(in-flight)', queued: false };
    }
  }

  const now = new Date();
  const effectiveRunAt = runAt ?? (delayMs ? new Date(now.getTime() + delayMs) : now);

  const job: Job = {
    id: randomUUID(),
    type,
    payload,
    key,
    attempts: 0,
    maxAttempts,
    createdAt: now,
    runAt: effectiveRunAt,
  };

  const id = q.enqueue(job);
  return { id, queued: true };
}

/** Remove the in-flight marker when a job completes. Called by runner. */
export function completeJob(key: string): void {
  getQueue().completeJob(key);
}

/** Dequeue the next ready job. Called by the runner. */
export function dequeue(): Job | undefined {
  return getQueue().dequeue();
}

/** Return the number of jobs waiting in the queue. */
export function queueSize(): number {
  return getQueue().size();
}
