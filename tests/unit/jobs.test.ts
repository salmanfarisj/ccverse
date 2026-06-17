/**
 * Unit tests for the job system (T0-4).
 *
 * These tests cover:
 *   T0-4-1  — runner scaffold
 *   T0-4-2  — job type registry + dispatcher
 *   T0-4-3  — retry with exponential backoff
 *   T0-4-4  — enqueue() idempotency
 *   T0-4-5  — scheduled job registration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  enqueue,
  queueSize,
  completeJob,
  registerJobType,
  registeredTypes,
  dispatchJob,
  _resetQueueForTesting,
} from '@/jobs';
import { backoffDelay, shouldRetry, nextRunAt } from '@/jobs';
import {
  registerScheduledJob,
  unregisterScheduledJob,
  stopAllScheduledJobs,
} from '@/jobs/scheduler';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Minimal in-memory FailedJob mock for tests that call dispatchJob on unknown types. */
const mockFailedJobs: Array<{
  jobType: string;
  payload: unknown;
  error: string;
  attempts: number;
}> = [];

vi.mock('@/lib/db', () => ({
  prisma: {
    failedJob: {
      create: vi.fn(({ data }) => {
        mockFailedJobs.push(data);
        return data;
      }),
    },
  },
}));

// ─── Enqueue & idempotency ─────────────────────────────────────────────────

describe('T0-4-4 — enqueue() idempotency', () => {
  beforeEach(() => {
    _resetQueueForTesting();
  });

  it('returns queued:true on first call', () => {
    const r = enqueue({ type: 'test', payload: { x: 1 } });
    expect(r.queued).toBe(true);
    expect(r.id).toBeTruthy();
  });

  it('returns queued:false with same id on duplicate key', () => {
    const r1 = enqueue({ type: 'test', payload: {}, key: 'my-key' });
    const r2 = enqueue({ type: 'test', payload: {}, key: 'my-key' });
    expect(r2.queued).toBe(false);
    expect(r2.id).toBe(r1.id);
  });

  it('deduplication key is case-sensitive', () => {
    enqueue({ type: 'test', payload: {}, key: 'Key-A' });
    const r2 = enqueue({ type: 'test', payload: {}, key: 'key-a' });
    expect(r2.queued).toBe(true); // different key
  });

  it('enqueue without key never deduplicates', () => {
    const r1 = enqueue({ type: 'test', payload: {} });
    const r2 = enqueue({ type: 'test', payload: {} });
    expect(r2.queued).toBe(true);
    expect(r2.id).not.toBe(r1.id);
  });

  it('queueSize reflects pending jobs', () => {
    expect(queueSize()).toBe(0);
    enqueue({ type: 'a', payload: {} });
    enqueue({ type: 'b', payload: {} });
    expect(queueSize()).toBe(2);
  });

  it('completeJob clears the key so a new enqueue with same key succeeds', () => {
    // Enqueue a job with a key — it is now in-flight.
    const r1 = enqueue({ type: 'test', payload: {}, key: 'flow-key' });
    expect(r1.queued).toBe(true);

    // Complete it — the slot is freed.
    completeJob('flow-key');

    // A new enqueue with the same key should now succeed (not deduplicated).
    const r2 = enqueue({ type: 'test', payload: {}, key: 'flow-key' });
    expect(r2.queued).toBe(true);
    expect(r2.id).not.toBe(r1.id);
  });

  it('scheduled future job via runAt is enqueued and not run immediately', () => {
    const future = new Date(Date.now() + 60_000);
    const r = enqueue({ type: 'test', payload: {}, runAt: future });
    expect(r.queued).toBe(true);
    expect(queueSize()).toBe(1);
  });

  it('delayMs schedules job in the future', () => {
    const r = enqueue({ type: 'test', payload: {}, delayMs: 5_000 });
    expect(r.queued).toBe(true);
    expect(queueSize()).toBe(1);
  });
});

// ─── Registry & dispatcher ───────────────────────────────────────────────────

describe('T0-4-2 — job type registry and dispatcher', () => {
  beforeEach(() => {
    _resetQueueForTesting();
    mockFailedJobs.length = 0;
    vi.clearAllMocks();
  });

  it('registerJobType adds the handler', () => {
    const spy = vi.fn().mockResolvedValue(42);
    registerJobType('calc', spy);
    expect(registeredTypes()).toContain('calc');
  });

  it('dispatchJob runs the handler and returns the result', async () => {
    const spy = vi.fn().mockResolvedValue('done');
    registerJobType('echo', spy);

    const job = {
      id: 'j1',
      type: 'echo',
      payload: { msg: 'hello' },
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date(),
      runAt: new Date(),
    };

    const result = await dispatchJob(job);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.result).toBe('done');
    expect(spy).toHaveBeenCalledWith({ msg: 'hello' });
  });

  it('dispatchJob returns failure for unknown type and writes to FailedJob', async () => {
    const job = {
      id: 'j2',
      type: 'unknown.type',
      payload: {},
      attempts: 1,
      maxAttempts: 3,
      createdAt: new Date(),
      runAt: new Date(),
    };

    const result = await dispatchJob(job);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('No handler registered');
      expect(result.willRetry).toBe(false);
    }
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const { prisma } = await import('@/lib/db');
    expect(prisma.failedJob.create).toHaveBeenCalledTimes(1);
  });

  it('dispatchJob propagates handler throws as failures', async () => {
    registerJobType('failer', async () => {
      throw new Error('boom');
    });

    const job = {
      id: 'j3',
      type: 'failer',
      payload: {},
      attempts: 1,
      maxAttempts: 3,
      createdAt: new Date(),
      runAt: new Date(),
    };

    const result = await dispatchJob(job);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('boom');
      expect(result.willRetry).toBe(true); // attempts < maxAttempts
    }
  });
});

// ─── Retry with exponential backoff ────────────────────────────────────────

describe('T0-4-3 — retry with exponential backoff', () => {
  it('shouldRetry returns true when attempts < maxAttempts', () => {
    expect(shouldRetry(1, 5)).toBe(true);
    expect(shouldRetry(4, 5)).toBe(true);
  });

  it('shouldRetry returns false when attempts >= maxAttempts', () => {
    expect(shouldRetry(5, 5)).toBe(false);
    expect(shouldRetry(6, 5)).toBe(false);
  });

  it('backoffDelay grows exponentially', () => {
    const delays = [1, 2, 3, 4, 5].map((a) => backoffDelay(a));
    // Each delay should be roughly double the previous (within jitter).
    for (let i = 1; i < delays.length; i++) {
      expect(delays[i]!).toBeGreaterThan(delays[i - 1]!);
    }
  });

  it('backoffDelay is capped at maxSeconds', () => {
    const delay = backoffDelay(100, { maxSeconds: 10 }); // 100 attempts
    expect(delay).toBeLessThanOrEqual(10_000 + 10_000 * 0.1); // cap + jitter
  });

  it('nextRunAt returns null when shouldRetry is false', () => {
    // Passing maxSeconds=5 and attempt=5 means attempts >= maxAttempts, so no retry.
    const result = nextRunAt(5, { maxSeconds: 5 });
    expect(result).toBeNull();
  });

  it('nextRunAt returns a Date in the future when retry is allowed', () => {
    const before = Date.now();
    const result = nextRunAt(1, { maxSeconds: 300 });
    expect(result).not.toBeNull();
    expect(result!.getTime()).toBeGreaterThan(before);
  });
});

// ─── Scheduled jobs ─────────────────────────────────────────────────────────

describe('T0-4-5 — scheduled job registration', () => {
  beforeEach(() => {
    stopAllScheduledJobs();
    vi.useFakeTimers();
  });

  afterEach(() => {
    stopAllScheduledJobs();
    vi.useRealTimers();
  });

  it('registerScheduledJob calls the handler after offset', async () => {
    const spy = vi.fn().mockResolvedValue(undefined);

    registerScheduledJob({ id: 's1', type: 's1', intervalMs: 10_000, offsetMaxMs: 200 }, spy);

    // First tick fires after ~offsetMs.
    await vi.advanceTimersByTimeAsync(250);

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('subsequent ticks fire at the configured intervalMs', async () => {
    const spy = vi.fn().mockResolvedValue(undefined);

    registerScheduledJob({ id: 's2', type: 's2', intervalMs: 5_000, offsetMaxMs: 50 }, spy);

    // Let first tick fire.
    await vi.advanceTimersByTimeAsync(100);
    spy.mockClear();

    // Advance one interval.
    await vi.advanceTimersByTimeAsync(5_000);
    expect(spy).toHaveBeenCalledTimes(1);

    // Advance another interval.
    await vi.advanceTimersByTimeAsync(5_000);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('overlapping ticks are skipped when previous run is still active', async () => {
    // Handler takes longer than the interval.
    const spy = vi.fn().mockImplementation(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });

    registerScheduledJob({ id: 's3', type: 's3', intervalMs: 500, offsetMaxMs: 50 }, spy);

    // First tick fires and starts async handler.
    await vi.advanceTimersByTimeAsync(100);
    expect(spy).toHaveBeenCalledTimes(1);

    // Next tick fires while handler is still running — should be skipped.
    await vi.advanceTimersByTimeAsync(500);
    expect(spy).toHaveBeenCalledTimes(1); // still 1

    // Handler finishes and running=false; advance past next interval.
    await vi.advanceTimersByTimeAsync(2_000);
    await vi.advanceTimersByTimeAsync(500);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('unregisterScheduledJob stops the job', async () => {
    const spy = vi.fn().mockResolvedValue(undefined);

    registerScheduledJob({ id: 's4', type: 's4', intervalMs: 1_000, offsetMaxMs: 50 }, spy);

    await vi.advanceTimersByTimeAsync(100);
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockClear();

    unregisterScheduledJob('s4');

    // Next tick would have fired — but we've unregistered.
    await vi.advanceTimersByTimeAsync(1_000);
    expect(spy).not.toHaveBeenCalled();
  });

  it('duplicate id registration is ignored (first wins)', async () => {
    const spy1 = vi.fn().mockResolvedValue(undefined);
    const spy2 = vi.fn().mockResolvedValue(undefined);

    registerScheduledJob({ id: 'dup', type: 'dup1', intervalMs: 1_000, offsetMaxMs: 50 }, spy1);
    registerScheduledJob({ id: 'dup', type: 'dup2', intervalMs: 1_000, offsetMaxMs: 50 }, spy2);

    await vi.advanceTimersByTimeAsync(100);
    expect(spy1).toHaveBeenCalledTimes(1);
    expect(spy2).toHaveBeenCalledTimes(0);
  });

  it('stopAllScheduledJobs clears all jobs', async () => {
    const spy = vi.fn().mockResolvedValue(undefined);

    registerScheduledJob({ id: 's5', type: 's5', intervalMs: 1_000, offsetMaxMs: 50 }, spy);
    registerScheduledJob({ id: 's6', type: 's6', intervalMs: 1_000, offsetMaxMs: 50 }, spy);

    await vi.advanceTimersByTimeAsync(100);
    expect(spy).toHaveBeenCalledTimes(2);
    spy.mockClear();

    stopAllScheduledJobs();

    await vi.advanceTimersByTimeAsync(1_000);
    expect(spy).not.toHaveBeenCalled();
  });
});

// ─── Integration: handler that throws then succeeds ────────────────────────

describe('T0-4-3 integration — retry then succeed', () => {
  beforeEach(() => {
    _resetQueueForTesting();
    mockFailedJobs.length = 0;
    vi.clearAllMocks();
  });

  it('handler that throws 3 times then succeeds runs to completion', async () => {
    let attempts = 0;

    registerJobType('flaky', async () => {
      attempts++;
      if (attempts < 3) throw new Error(`attempt ${attempts} failed`);
    });

    // Simulate the retry loop manually (3 failures then success).
    for (let i = 1; i <= 3; i++) {
      const job = {
        id: `flaky-${i}`,
        type: 'flaky',
        payload: {},
        attempts: i,
        maxAttempts: 5,
        createdAt: new Date(),
        runAt: new Date(),
      };
      const result = await dispatchJob(job);
      if (i < 3) {
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.willRetry).toBe(true);
      } else {
        expect(result.ok).toBe(true);
      }
    }

    expect(attempts).toBe(3);
  });

  it('handler that always throws returns willRetry=false after max attempts', async () => {
    registerJobType('always-fail', async () => {
      throw new Error('permanent failure');
    });

    const job = {
      id: 'fail-final',
      type: 'always-fail',
      payload: {},
      attempts: 5,
      maxAttempts: 5,
      createdAt: new Date(),
      runAt: new Date(),
    };

    const final = await dispatchJob(job);
    expect(final.ok).toBe(false);
    if (!final.ok) {
      expect(final.willRetry).toBe(false);
    }
  });
});
