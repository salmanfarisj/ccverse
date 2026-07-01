import { internalMutation } from './_generated/server';
import { v } from 'convex/values';

export const insertAdminMutation = internalMutation({
  args: {
    email: v.string(),
    passwordHash: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.toLowerCase();
    const now = Date.now();

    const existing = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', normalizedEmail))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        passwordHash: args.passwordHash,
        role: 'ADMIN',
        status: 'ACTIVE',
        emailVerified: true,
        emailVerifiedAt: now,
        mfaEnabled: false,
      });
      return { userId: existing._id, created: false };
    }

    const userId = await ctx.db.insert('users', {
      tokenIdentifier: normalizedEmail,
      email: normalizedEmail,
      passwordHash: args.passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      mfaEnabled: false,
      emailVerified: true,
      emailVerifiedAt: now,
      failedLoginCount: 0,
      createdAt: now,
    });

    return { userId, created: true };
  },
});
