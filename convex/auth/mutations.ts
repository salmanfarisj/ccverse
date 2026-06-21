import { internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";

/**
 * loginQuery — read-only lookup used by the loginAction.
 * Returns the user record (including passwordHash) so the Node action
 * can verify the password. The function is a query (not a mutation)
 * because it does not write anything — making it a query lets actions
 * invoke it via `ctx.runQuery` (mutations can only be invoked via
 * `ctx.runMutation`).
 */
export const loginQuery = internalQuery({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const { email } = args;
    const normalizedEmail = email.toLowerCase();

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (!user) {
      return { success: false, error: "Invalid credentials", user: null };
    }

    if (user.lockedUntil && user.lockedUntil > Date.now()) {
      return { success: false, error: "Account locked", user: null };
    }

    if (!user.passwordHash) {
      return { success: false, error: "Invalid credentials", user: null };
    }

    return {
      success: true,
      error: null,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        status: user.status,
        mfaEnabled: user.mfaEnabled,
        passwordHash: user.passwordHash,
        failedLoginCount: user.failedLoginCount,
        lockedUntil: user.lockedUntil,
      },
    };
  },
});

export const loginUpdateMutation = internalMutation({
  args: {
    userId: v.id("users"),
    failedLoginCount: v.number(),
    lockUntil: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, failedLoginCount, lockUntil } = args;

    await ctx.db.patch(userId, {
      failedLoginCount,
      lockedUntil: lockUntil,
    });

    return { success: true };
  },
});

export const loginSuccessMutation = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { userId } = args;

    await ctx.db.patch(userId, {
      failedLoginCount: 0,
      lockedUntil: undefined,
      lastLoginAt: Date.now(),
    });

    return { success: true };
  },
});

export const createBuyerMutation = internalMutation({
  args: {
    email: v.string(),
    passwordHash: v.string(),
    legalName: v.optional(v.string()),
    country: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { email, passwordHash, legalName, country } = args;
    const normalizedEmail = email.toLowerCase();
    const now = Date.now();

    const userId = await ctx.db.insert("users", {
      tokenIdentifier: normalizedEmail,
      email: normalizedEmail,
      passwordHash,
      role: "BUYER",
      status: "PENDING_VERIFICATION",
      mfaEnabled: false,
      emailVerified: false,
      failedLoginCount: 0,
      createdAt: now,
    });

    await ctx.db.insert("buyerProfiles", {
      userId,
      legalName,
      country,
      kycStatus: "NOT_REQUIRED",
      kycMethod: "NONE",
      defaultCurrency: "USD",
      createdAt: now,
      updatedAt: now,
    });

    return {
      success: true,
      userId,
    };
  },
});

export const createSellerMutation = internalMutation({
  args: {
    email: v.string(),
    passwordHash: v.string(),
    legalName: v.optional(v.string()),
    country: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { email, passwordHash, legalName, country } = args;
    const normalizedEmail = email.toLowerCase();
    const now = Date.now();

    const userId = await ctx.db.insert("users", {
      tokenIdentifier: normalizedEmail,
      email: normalizedEmail,
      passwordHash,
      role: "SELLER",
      status: "PENDING_VERIFICATION",
      mfaEnabled: false,
      emailVerified: false,
      failedLoginCount: 0,
      createdAt: now,
    });

    await ctx.db.insert("sellerProfiles", {
      userId,
      legalName,
      country,
      kycStatus: "NOT_STARTED",
      kycMethod: "manual",
      createdAt: now,
      updatedAt: now,
    });

    return {
      success: true,
      userId,
    };
  },
});
