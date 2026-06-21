"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { api, internal } from "../_generated/api";

async function hashPassword(plain: string): Promise<string> {
  const { hash } = await import("argon2");
  if (!plain || plain.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }
  return hash(plain, {
    memoryCost: 64 * 1024,
    timeCost: 3,
    parallelism: 4,
    type: 2,
  });
}

async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  const { verify } = await import("argon2");
  try {
    return await verify(hashed, plain);
  } catch {
    return false;
  }
}

type LoginResult =
  | { success: false; error: string; user: null }
  | {
      success: true;
      error: null;
      user: {
        id: Id<"users">;
        email: string;
        role: "BUYER" | "SELLER" | "AUDITOR" | "ADMIN";
        status: "ACTIVE" | "SUSPENDED" | "BANNED" | "PENDING_VERIFICATION";
        mfaEnabled: boolean;
      };
    };

type RegisterResult = {
  success: boolean;
  user:
    | {
        id: Id<"users">;
        email: string;
        role: "BUYER" | "SELLER";
        status: "PENDING_VERIFICATION";
        mfaEnabled: boolean;
      }
    | null;
};

export const loginAction = action({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args): Promise<LoginResult> => {
    const normalizedEmail = args.email.toLowerCase();

    const result = await ctx.runQuery(internal.auth.mutations.loginQuery, {
      email: normalizedEmail,
    });

    if (!result.success || !result.user) {
      return { success: false, error: result.error || "Invalid credentials", user: null };
    }

    if (result.user.lockedUntil && result.user.lockedUntil > Date.now()) {
      return { success: false, error: "Account locked", user: null };
    }

    const passwordValid = await verifyPassword(args.password, result.user.passwordHash);

    if (!passwordValid) {
      const failedLoginCount = result.user.failedLoginCount + 1;
      const lockUntil =
        failedLoginCount >= 5 ? Date.now() + 15 * 60 * 1000 : undefined;

      await ctx.runMutation(internal.auth.mutations.loginUpdateMutation, {
        userId: result.user.id,
        failedLoginCount,
        lockUntil,
      });

      return { success: false, error: "Invalid credentials", user: null };
    }

    await ctx.runMutation(internal.auth.mutations.loginSuccessMutation, {
      userId: result.user.id,
    });

    return {
      success: true,
      error: null,
      user: {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
        status: result.user.status,
        mfaEnabled: result.user.mfaEnabled,
      },
    };
  },
});

export const registerBuyerAction = action({
  args: {
    email: v.string(),
    password: v.string(),
    legalName: v.optional(v.string()),
    country: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<RegisterResult> => {
    const normalizedEmail = args.email.toLowerCase();
    const passwordHash = await hashPassword(args.password);

    const result = await ctx.runMutation(internal.auth.mutations.createBuyerMutation, {
      email: normalizedEmail,
      passwordHash,
      legalName: args.legalName,
      country: args.country,
    });

    return {
      success: result.success,
      user: result.success
        ? {
            id: result.userId,
            email: normalizedEmail,
            role: "BUYER",
            status: "PENDING_VERIFICATION",
            mfaEnabled: false,
          }
        : null,
    };
  },
});

export const registerSellerAction = action({
  args: {
    email: v.string(),
    password: v.string(),
    legalName: v.optional(v.string()),
    country: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<RegisterResult> => {
    const normalizedEmail = args.email.toLowerCase();
    const passwordHash = await hashPassword(args.password);

    const result = await ctx.runMutation(internal.auth.mutations.createSellerMutation, {
      email: normalizedEmail,
      passwordHash,
      legalName: args.legalName,
      country: args.country,
    });

    return {
      success: result.success,
      user: result.success
        ? {
            id: result.userId,
            email: normalizedEmail,
            role: "SELLER",
            status: "PENDING_VERIFICATION",
            mfaEnabled: false,
          }
        : null,
    };
  },
});

type ResetPasswordResult =
  | { success: true; error: null; userId: Id<"users"> }
  | { success: false; error: string; userId: null };

/**
 * resetPasswordAction — Node action wrapper for the password-reset flow.
 * Hashes the new password (argon2 is Node-only), then atomically
 * consumes the reset token and updates the user's passwordHash via the
 * `consumePasswordResetTokenMutation` internal mutation.
 */
export const resetPasswordAction = action({
  args: {
    token: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args): Promise<ResetPasswordResult> => {
    const newPasswordHash = await hashPassword(args.password);
    const result = await ctx.runMutation(
      api.auth.emailMutations.consumePasswordResetTokenMutation,
      {
        token: args.token,
        newPasswordHash,
      },
    );
    return result;
  },
});

type ChangePasswordResult =
  | { success: true; error: null }
  | { success: false; error: string };

/**
 * changePasswordAction — Node action for the logged-in
 * change-password flow. Verifies the user's current password against
 * the stored hash, then hashes the new password and updates it.
 *
 * Returns `{ success: false, error }` (not a thrown error) for the
 * common case of "wrong current password" so the API route can map
 * it to a 400 with a stable message. Throws only on truly
 * unexpected errors.
 */
export const changePasswordAction = action({
  args: {
    userId: v.id("users"),
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args): Promise<ChangePasswordResult> => {
    const auth = await ctx.runQuery(
      api.users.queries.findUserAuthDataByIdQuery,
      { userId: args.userId },
    );
    if (!auth.passwordHash) {
      return { success: false, error: "User not found or has no password set" };
    }

    const currentValid = await verifyPassword(args.currentPassword, auth.passwordHash);
    if (!currentValid) {
      return { success: false, error: "Current password is incorrect" };
    }

    const newPasswordHash = await hashPassword(args.newPassword);
    await ctx.runMutation(api.auth.emailMutations.changePasswordMutation, {
      userId: args.userId,
      newPasswordHash,
    });
    return { success: true, error: null };
  },
});
