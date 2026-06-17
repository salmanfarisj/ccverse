/**
 * trackFailedLogin — records failed authentication attempts.
 *
 * In Phase 0 this is a stub: it logs to the audit log and the structured
 * logger. The User.failedLoginCount column and any lockout enforcement are
 * added in Phase 1 when the full login flow exists.
 *
 * This helper is intentionally not connected to any model in Phase 0.
 * The schema stub (User model) exists in Prisma; the column and enforcement
 * logic lands in Phase 1.
 */

import { logger } from '@/jobs/logger';

export interface FailedLoginRecord {
  email: string;
  ip?: string;
  reason: 'invalid_credentials' | 'account_locked' | 'mfa_required' | 'mfa_invalid';
}

/**
 * Record a failed login attempt.
 * In MVP this is a no-op stub that logs the event. Once User.failedLoginCount
 * is added in Phase 1, this function will write to the DB.
 */
export async function trackFailedLogin(record: FailedLoginRecord): Promise<void> {
  const { email, ip, reason } = record;

  logger.warn('Failed login attempt', {
    email,
    ip,
    reason,
    // TODO (Phase 1): write to audit_log table
    // audit.write({ actor: email, action: 'auth.failed_login', target: 'User', payload: record });
  });
}
