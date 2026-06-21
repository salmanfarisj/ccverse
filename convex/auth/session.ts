/**
 * CC Verse auth model — Phase 1 decision.
 *
 * The Convex migration plan originally proposed deleting iron-session
 * in Phase 1 and moving to Convex Auth (JWT/WebSocket). Because Convex
 * Auth's Next.js support is still experimental (per the plan's risk
 * register), the minimal viable Phase 1 uses a hybrid model:
 *
 *   - **Data layer:** all auth state (users, passwordHash, sessions-
 *     worth-of-data) lives in Convex. There is no Prisma/User table
 *     outside Convex.
 *   - **Transport layer:** the Next.js side still uses `iron-session`
 *     cookies (httpOnly, sameSite=strict, secure-in-prod) so API
 *     routes know which `userId` to query/mutate against Convex.
 *
 * In Phase 5+ this can be replaced by Convex Auth once the Next.js
 * integration stabilises. Until then, the iron-session cookie is the
 * only client-side proof of identity; rotating SESSION_SECRET
 * invalidates every active session.
 *
 * This file holds the server-side `getSession` query used by Convex
 * HTTP actions to look up the caller's identity via
 * `ctx.auth.getUserIdentity()`. It is NOT used by the Next.js side —
 * Next.js reads the iron-session cookie via `lib/session/index.ts`.
 */

import { query } from "../_generated/server";

export const getSession = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .first();

    if (!user) {
      return null;
    }

    return {
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        status: user.status,
        mfaEnabled: user.mfaEnabled,
      },
    };
  },
});
