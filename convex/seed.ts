'use node';

/**
 * Bootstrap admin user seed action.
 *
 * Run locally:
 *   npx convex run seed:seedAdminAction '{"email":"admin@ccverse.local","password":"your-password"}'
 */

import { action } from './_generated/server';
import { v } from 'convex/values';
import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';

async function hashPassword(plain: string): Promise<string> {
  const { hash } = await import('argon2');
  if (!plain || plain.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
  return hash(plain, {
    memoryCost: 64 * 1024,
    timeCost: 3,
    parallelism: 4,
    type: 2,
  });
}

export const seedAdminAction = action({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args): Promise<{ userId: Id<'users'>; created: boolean }> => {
    const passwordHash = await hashPassword(args.password);
    return ctx.runMutation(internal.seedMutations.insertAdminMutation, {
      email: args.email,
      passwordHash,
    });
  },
});
