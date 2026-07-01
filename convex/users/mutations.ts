/**
 * User mutations.
 *
 * Self-service profile updates called from Next.js API routes.
 * Each mutation is role-aware: BUYER rows update `buyerProfiles`,
 * SELLER rows update `sellerProfiles` (and changing legalName on a
 * seller invalidates their KYC).
 */

import { mutation } from '../_generated/server';
import { v } from 'convex/values';

/**
 * updateMyProfileMutation — patches the caller's profile row.
 *
 * - BUYER: legalName, country, defaultCurrency
 * - SELLER: legalName (resets KYC to EXPIRED), country
 * - AUDITOR / ADMIN: no profile fields to update
 *
 * Public because the caller is the Next.js API route /api/me PATCH,
 * which has already authenticated the user via iron-session.
 * Authorization (role gating + userId binding) happens at the route.
 */
export const updateMyProfileMutation = mutation({
  args: {
    userId: v.id('users'),
    legalName: v.optional(v.string()),
    country: v.optional(v.string()),
    defaultCurrency: v.optional(v.union(v.literal('INR'), v.literal('USD'))),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return { success: false as const, error: 'User not found' };
    }

    const now = Date.now();

    if (user.role === 'BUYER') {
      const profile = await ctx.db
        .query('buyerProfiles')
        .withIndex('by_userId', (q) => q.eq('userId', args.userId))
        .first();
      if (!profile) {
        return { success: false as const, error: 'Buyer profile not found' };
      }
      await ctx.db.patch(profile._id, {
        ...(args.legalName !== undefined && { legalName: args.legalName }),
        ...(args.country !== undefined && { country: args.country }),
        ...(args.defaultCurrency !== undefined && { defaultCurrency: args.defaultCurrency }),
        updatedAt: now,
      });
      return { success: true as const };
    }

    if (user.role === 'SELLER') {
      const profile = await ctx.db
        .query('sellerProfiles')
        .withIndex('by_userId', (q) => q.eq('userId', args.userId))
        .first();
      if (!profile) {
        return { success: false as const, error: 'Seller profile not found' };
      }
      const patch: Record<string, unknown> = { updatedAt: now };
      if (args.legalName !== undefined) {
        patch['legalName'] = args.legalName;
        // Per FRD: changing legalName invalidates KYC (re-verification required)
        patch['kycStatus'] = 'EXPIRED';
      }
      if (args.country !== undefined) {
        patch['country'] = args.country;
      }
      await ctx.db.patch(profile._id, patch);
      return { success: true as const };
    }

    // AUDITOR / ADMIN have no role-specific profile to patch
    return { success: true as const };
  },
});
