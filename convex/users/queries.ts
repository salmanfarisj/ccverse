/**
 * User queries.
 *
 * Public-API read paths used by Next.js API routes and React components.
 * These queries take a `userId` argument and resolve the appropriate
 * shape based on the user's role (buyer/seller/auditor/admin).
 */

import { query, internalQuery } from "../_generated/server";
import { v } from "convex/values";

type Role = "BUYER" | "SELLER" | "AUDITOR" | "ADMIN";

type BankAccountSummary = {
  bankName: string;
  accountNoLast4: string;
  verified: boolean;
} | null;

/**
 * getMeQuery — returns the current user's profile, including
 * role-specific data (buyer profile, seller profile + bank account).
 * Public so it can be called from the browser via `useQuery` once
 * Convex Auth is wired up; for now it accepts a userId arg and is
 * called from Next.js API routes with the session userId.
 */
export const getMeQuery = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return { user: null };

    let buyerProfile: {
      legalName?: string;
      country?: string;
      kycStatus: string;
      defaultCurrency: string;
    } | null = null;
    let sellerProfile: {
      legalName?: string;
      country?: string;
      kycStatus: string;
      bankAccount: BankAccountSummary;
    } | null = null;

    if (user.role === "BUYER") {
      const profile = await ctx.db
        .query("buyerProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .first();
      if (profile) {
        buyerProfile = {
          legalName: profile.legalName,
          country: profile.country,
          kycStatus: profile.kycStatus,
          defaultCurrency: profile.defaultCurrency,
        };
      }
    } else if (user.role === "SELLER") {
      const profile = await ctx.db
        .query("sellerProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .first();
      if (profile) {
        let bankAccount: BankAccountSummary = null;
        if (profile.bankAccountId) {
          const acc = await ctx.db.get(profile.bankAccountId);
          if (acc) {
            bankAccount = {
              bankName: acc.bankName,
              accountNoLast4: acc.accountNoLast4,
              verified: acc.verified,
            };
          }
        }
        sellerProfile = {
          legalName: profile.legalName,
          country: profile.country,
          kycStatus: profile.kycStatus,
          bankAccount,
        };
      }
    }

    return {
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified,
        emailVerifiedAt: user.emailVerifiedAt,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        mfaEnabled: user.mfaEnabled,
        buyerProfile,
        sellerProfile,
      },
    };
  },
});

/**
 * findUserByEmailQuery — lookup used by the password reset request
 * flow and admin tooling. Returns the user id if a row with the
 * given (lowercased) email exists, or null if not.
 *
 * Public because Next.js API routes call it over HTTP. It returns
 * only the user id — no PII — so the response cannot be used to
 * leak account data even if unauthenticated callers probed it.
 */
export const findUserByEmailQuery = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.toLowerCase();
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();
    if (!user) return { userId: null };
    return { userId: user._id };
  },
});

/**
 * findUserAuthDataByIdQuery — public-by-id lookup used by the
 * change-password Node action. Returns only what the action needs
 * to verify the current password (passwordHash) and validate the
 * caller's role/status — no other PII.
 *
 * Public so the action can call it from inside Convex via
 * `ctx.runQuery(api.users.queries.findUserAuthDataByIdQuery, ...)`.
 */
export const findUserAuthDataByIdQuery = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return { passwordHash: null, role: null, status: null };
    }
    return {
      passwordHash: user.passwordHash ?? null,
      role: user.role,
      status: user.status,
    };
  },
});

/**
 * getUserByIdQuery — internal-only lightweight lookup used by email
 * actions to retrieve a user's email address and legal name.
 *
 * Exposed as `internal.users.queries.getUserByIdQuery`.
 */
export const getUserByIdQuery = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return { email: null, legalName: null };

    let legalName: string | null = null;
    if (user.role === "SELLER") {
      const profile = await ctx.db
        .query("sellerProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .first();
      legalName = profile?.legalName ?? null;
    } else if (user.role === "BUYER") {
      const profile = await ctx.db
        .query("buyerProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .first();
      legalName = profile?.legalName ?? null;
    }

    return { email: user.email, legalName };
  },
});

// Re-export Role for convenience so callers do not need to import the
// string literal type from convex/auth/* elsewhere.
export type { Role };
