/**
 * Audit log public mutation (Phase 1 legacy — HTTP callers only).
 *
 * Append-only writer for `auditLogs`. This public mutation exists ONLY
 * to serve Phase 1 Next.js API routes that call Convex over HTTP via
 * `convex.mutation(api.audit.logMutation.writeAuditLogMutation, ...)`.
 *
 * New audit-log callers inside Convex (including Phase 2+ migrations
 * from `lib/audit/index.ts`) MUST use the internal mutation instead:
 *   `internal.audit.writeAuditEvent({ ... })`
 *
 * The convention "no patch / no delete on auditLogs" is enforced by
 * code review: only files in `convex/audit/` write to this table.
 */

import { mutation } from '../_generated/server';
import { v } from 'convex/values';

/**
 * writeAuditLogMutation — public mutation so Next.js API routes
 * (which call Convex over HTTP) can write audit events.
 *
 * The function is intentionally public because every audit-emitting
 * call site is already inside an authenticated route handler (the
 * iron-session check happens at the route boundary). Phase 2 may
 * tighten this with a server-side rate limit or admin-only restriction.
 */
export const writeAuditLogMutation = mutation({
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
    const id = await ctx.db.insert('auditLogs', {
      actorId: args.actorId,
      actorRole: args.actorRole,
      action: args.action,
      targetType: args.targetType,
      targetId: args.targetId,
      ip: args.ip,
      timestamp: Date.now(),
      payload: args.payload ?? '{}',
    });
    return { id };
  },
});
