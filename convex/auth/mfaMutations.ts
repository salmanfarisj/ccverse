import { internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";

export const setMfaSecretMutation = internalMutation({
  args: {
    userId: v.id("users"),
    encryptedSecret: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      mfaSecret: args.encryptedSecret,
    });
    return { success: true };
  },
});

export const enableMfaMutation = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      mfaEnabled: true,
    });
    return { success: true };
  },
});

export const disableMfaMutation = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      mfaEnabled: false,
      mfaSecret: undefined,
    });
    return { success: true };
  },
});

/**
 * getUserMfaSecretQuery — read-only lookup used by TOTP actions.
 * Convex actions can only call queries via `ctx.runQuery`, so this must
 * be an `internalQuery` even though it is functionally a lookup helper.
 */
export const getUserMfaSecretQuery = internalQuery({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.toLowerCase();
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (!user) {
      return {
        success: false as const,
        error: "User not found",
        mfaSecret: null,
        userId: null,
      };
    }

    return {
      success: true as const,
      error: null,
      mfaSecret: user.mfaSecret ?? null,
      userId: user._id,
    };
  },
});
