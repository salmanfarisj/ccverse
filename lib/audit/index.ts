/**
 * Append-only audit log writer.
 *
 * Every state-changing action across the app writes a row here. The table
 * is append-only by convention (no UPDATE path in this module). 7-year
 * retention is enforced at the DB level via `audit_log_retention_days`
 * in `PlatformConfig`.
 */

import { prisma } from '@/lib/db';
import { logger } from '@/jobs/logger';
import type { Prisma } from '@prisma/client';

export interface AuditEvent {
  actorId?: string;
  actorRole?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  ip?: string;
  payload?: Record<string, unknown>;
}

/**
 * Write a single audit event to the AuditLog table.
 * Returns the created row's id.
 */
export async function writeAuditEvent(event: AuditEvent): Promise<string> {
  try {
    const row = await prisma.auditLog.create({
      data: {
        actorId: event.actorId ?? null,
        actorRole: event.actorRole ?? null,
        action: event.action,
        targetType: event.targetType ?? null,
        targetId: event.targetId ?? null,
        ip: event.ip ?? null,
        payload: (event.payload ?? {}) as Prisma.InputJsonValue,
      },
    });
    logger.debug('Audit event written', { action: event.action, targetId: event.targetId });
    return row.id;
  } catch (err) {
    // Never let audit failures crash the request — log and continue
    logger.error('Failed to write audit event', { event, error: String(err) });
    return 'unknown';
  }
}