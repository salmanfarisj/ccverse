/**
 * Exponential backoff calculator for job retries.
 *
 * After each failed attempt, the next run is scheduled at:
 *   min(2^attempt * 1000, MAX_BACKOFF_MS) + jitter_ms
 *
 * Where jitter is a random offset of [0, JITTER_FRACTION * backoff].
 * This avoids the "thundering herd" problem when many jobs fail
 * simultaneously.
 */

export interface BackoffConfig {
  /** Base multiplier in ms. Default: 1000 (i.e., 1 s). */
  baseMs?: number;
  /** Maximum backoff in seconds. Default: 300 (5 min). */
  maxSeconds?: number;
  /** Fraction of backoff added as jitter. Default: 0.1 (10%). */
  jitterFraction?: number;
}

const DEFAULT_CONFIG: Required<BackoffConfig> = {
  baseMs: 1_000,
  maxSeconds: 300,
  jitterFraction: 0.1,
};

/**
 * Compute the delay in ms before the next retry attempt.
 *
 * @param attempt - The 1-based number of the attempt just completed.
 */
export function backoffDelay(attempt: number, config: BackoffConfig = {}): number {
  const { baseMs, maxSeconds, jitterFraction } = { ...DEFAULT_CONFIG, ...config };

  // 2^attempt seconds, capped at maxSeconds, converted to ms.
  const rawMs = Math.min(baseMs * 2 ** attempt, maxSeconds * 1_000);

  // Add jitter.
  const jitter = rawMs * jitterFraction * Math.random();

  return Math.floor(rawMs + jitter);
}

/**
 * Returns true if the given number of attempts should trigger a retry,
 * false if the job should be moved to FailedJob.
 */
export function shouldRetry(attempts: number, maxAttempts: number): boolean {
  return attempts < maxAttempts;
}

/**
 * Calculate the next runAt Date for a retry, or null if should not retry.
 */
export function nextRunAt(attempt: number, config: BackoffConfig = {}): Date | null {
  const maxAttempts = config.maxSeconds ?? 5;
  if (!shouldRetry(attempt, maxAttempts)) {
    return null; // Will be moved to FailedJob.
  }
  const delayMs = backoffDelay(attempt, config);
  return new Date(Date.now() + delayMs);
}
