import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

export type Role = "BUYER" | "SELLER" | "AUDITOR" | "ADMIN";

export async function requireRole(
  ctx: QueryCtx | MutationCtx,
  allowed: Role[]
): Promise<Id<"users">> {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new Error("Unauthorized");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_tokenIdentifier", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier)
    )
    .first();

  if (!user) {
    throw new Error("Forbidden");
  }

  if (!allowed.includes(user.role as Role)) {
    throw new Error("Forbidden");
  }

  return user._id;
}

export async function requireMfa(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">
): Promise<void> {
  const user = await ctx.db.get(userId);

  if (!user) {
    throw new Error("Forbidden");
  }

  if ((user.role === "AUDITOR" || user.role === "ADMIN") && !user.mfaEnabled) {
    throw new Error("MFA_REQUIRED");
  }
}

export async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
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

  return user;
}
