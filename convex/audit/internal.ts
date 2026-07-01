/**
 * CONVENTION: Only files in `convex/audit/` write to `auditLogs`.
 * No `patch` or `delete` mutations are defined on `auditLogs`.
 * This table is append-only; rows are never modified or removed after insert.
 */

/**
 * writeAuditEvent — internal mutation, callable only from other Convex
 * functions (not over HTTP). New audit-log callers MUST use this.
 *
 * Returns `{ success: true }` on insert; the inserted document id is not
 * returned because audit events are fire-and-forget from the caller's
 * perspective.
 *
 * Schema matches `convex/schema.ts` auditLogs definition:
 *   actorId?, actorRole?, action, targetType?, targetId?, ip?,
 *   timestamp (float64 ms since epoch), payload (JSON string, default "{}")
 */

import { internalMutation } from '../_generated/server';
import { v } from 'convex/values';

export const writeAuditEvent = internalMutation({
  args: {
    actorId: v.optional(v.string()),
    actorRole: v.optional(v.string()),
    action: v.string(),
    targetType: v.optional(v.string()),
    targetId: v.optional(v.string()),
    ip: v.optional(v.string()),
    payload: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('auditLogs', {
      actorId: args.actorId,
      actorRole: args.actorRole,
      action: args.action,
      targetType: args.targetType,
      targetId: args.targetId,
      ip: args.ip,
      timestamp: Date.now(),
      payload: args.payload ?? '{}',
    });
    return { success: true };
  },
});
