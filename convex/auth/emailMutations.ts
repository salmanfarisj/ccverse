/**
 * Email lifecycle mutations.
 *
 * Token CRUD for email-verification and password-reset flows, plus a
 * change-password mutation. Email *sending* lives in Phase 2 (SES via
 * Node action). Phase 1 only persists and consumes the tokens — the
 * email channel will be wired up later.
 *
 * All consume* mutations are atomic: the token row is patched with
 * `consumedAt` inside the same call that updates the user, so a token
 * cannot be used twice and a partial failure cannot leave the user in
 * a half-verified state.
 *
 * These are PUBLIC mutations because Next.js API routes call them over
 * HTTP. Security for token-consuming mutations rests on the secrecy of
 * the token (consumeEmailVerificationTokenMutation, consumePasswordResetTokenMutation).
 * The change-password mutation is wrapped by `auth.actions.changePasswordAction`
 * which performs the password verification in Node code before invoking it.
 */

import { mutation } from '../_generated/server';
import { v } from 'convex/values';

const DEFAULT_EMAIL_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const DEFAULT_PASSWORD_RESET_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * createEmailVerificationTokenMutation — generate a one-time token used
 * to verify an email address. The token is a UUID v4 string. Caller is
 * responsible for emailing it to the user (Phase 2 work).
 */
export const createEmailVerificationTokenMutation = mutation({
  args: {
    userId: v.id('users'),
    ttlMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const ttl = args.ttlMs ?? DEFAULT_EMAIL_TTL_MS;
    const token = crypto.randomUUID();
    const expiresAt = Date.now() + ttl;

    await ctx.db.insert('emailVerificationTokens', {
      token,
      userId: args.userId,
      expiresAt,
    });

    return { token };
  },
});

/**
 * consumeEmailVerificationTokenMutation — atomically consume a token
 * and activate the user. Returns an error shape (not a thrown Convex
 * error) so the API route can render a 400 with a stable code.
 */
export const consumeEmailVerificationTokenMutation = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query('emailVerificationTokens')
      .withIndex('by_userId')
      .filter((q) => q.eq(q.field('token'), args.token))
      .first();

    if (!record) {
      return { success: false as const, error: 'Invalid or expired token', userId: null };
    }
    if (record.consumedAt) {
      return { success: false as const, error: 'Token has already been used', userId: null };
    }
    if (record.expiresAt < Date.now()) {
      return { success: false as const, error: 'Token has expired', userId: null };
    }

    const now = Date.now();
    await ctx.db.patch(record._id, { consumedAt: now });
    await ctx.db.patch(record.userId, {
      emailVerified: true,
      emailVerifiedAt: now,
      status: 'ACTIVE',
    });

    return { success: true as const, error: null, userId: record.userId };
  },
});

/**
 * createPasswordResetTokenMutation — generate a one-time token used to
 * reset a forgotten password. Phase 1 returns the token to the caller
 * (NOT SECURE in production — Phase 2 will send it via SES).
 */
export const createPasswordResetTokenMutation = mutation({
  args: {
    userId: v.id('users'),
    ip: v.optional(v.string()),
    ttlMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const ttl = args.ttlMs ?? DEFAULT_PASSWORD_RESET_TTL_MS;
    const token = crypto.randomUUID();
    const expiresAt = Date.now() + ttl;

    await ctx.db.insert('passwordResetTokens', {
      token,
      userId: args.userId,
      expiresAt,
      ip: args.ip,
    });

    return { token };
  },
});

/**
 * consumePasswordResetTokenMutation — atomically consume a reset token
 * and update the user's passwordHash. Returns a stable error shape.
 * Security relies on the secrecy of the token (UUID v4 + 30min TTL).
 */
export const consumePasswordResetTokenMutation = mutation({
  args: {
    token: v.string(),
    newPasswordHash: v.string(),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query('passwordResetTokens')
      .withIndex('by_userId')
      .filter((q) => q.eq(q.field('token'), args.token))
      .first();

    if (!record) {
      return { success: false as const, error: 'Invalid or expired reset token', userId: null };
    }
    if (record.consumedAt) {
      return { success: false as const, error: 'Token has already been used', userId: null };
    }
    if (record.expiresAt < Date.now()) {
      return {
        success: false as const,
        error: 'Token has expired. Please request a new one.',
        userId: null,
      };
    }

    await ctx.db.patch(record._id, { consumedAt: Date.now() });
    await ctx.db.patch(record.userId, {
      passwordHash: args.newPasswordHash,
      failedLoginCount: 0,
      lockedUntil: undefined,
    });

    return { success: true as const, error: null, userId: record.userId };
  },
});

/**
 * changePasswordMutation — update passwordHash for a logged-in user
 * (self-service change-password flow). Also clears any in-progress
 * lockout so the user is not locked out by their own change.
 *
 * Only safe to expose as public because callers always go through
 * `auth.actions.changePasswordAction`, which verifies the current
 * password against the stored hash before invoking this mutation.
 */
export const changePasswordMutation = mutation({
  args: {
    userId: v.id('users'),
    newPasswordHash: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      passwordHash: args.newPasswordHash,
      failedLoginCount: 0,
      lockedUntil: undefined,
    });

    return { success: true as const };
  },
});
