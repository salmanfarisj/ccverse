/**
 * CC Verse job system — public API.
 *
 * Usage:
 *   import { enqueue, registerJobType, getRunner } from '@/jobs';
 *
 *   // At app boot:
 *   const runner = getRunner();
 *   runner.start();
 *
 *   // Register a handler:
 *   registerJobType('my.job', async (payload) => { … });
 *
 *   // Enqueue work:
 *   enqueue({ type: 'my.job', payload: { foo: 1 } });
 *
 * Scheduled jobs:
 *   import { registerScheduledJob } from '@/jobs/scheduler';
 *   registerScheduledJob({ id: 'audit.daily', type: 'audit.export', intervalMs: 86_400_000 }, async () => { … });
 */

// Core
export { enqueue, queueSize, completeJob } from './enqueue';
export type { EnqueueOptions, EnqueueResult } from './enqueue';

export { registerJobType, registeredTypes, dispatchJob } from './registry';

export { getRunner, _resetRunnerForTesting } from './runner';
export { _resetQueueForTesting } from './enqueue';

// Types
export type { Job, JobHandler, JobResult, JobFailure, JobRunResult, WorkerPoolConfig } from './types';

// Retry
export { backoffDelay, shouldRetry, nextRunAt } from './retry';
export type { BackoffConfig } from './retry';

// Scheduler
export { registerScheduledJob, unregisterScheduledJob, stopAllScheduledJobs } from './scheduler';
export type { ScheduledJobConfig } from './scheduler';
