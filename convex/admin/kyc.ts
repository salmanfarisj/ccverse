/**
 * Admin KYC review queries and mutations.
 */

import { mutation, query } from '../_generated/server';
import { v } from 'convex/values';
export const listPendingKyc = query({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db
      .query('sellerProfiles')
      .filter((q) => q.eq(q.field('kycStatus'), 'PENDING'))
      .collect();

    profiles.sort((a, b) => b.updatedAt - a.updatedAt);

    const applications = await Promise.all(
      profiles.map(async (profile) => {
        const user = await ctx.db.get(profile.userId);
        const documents = await ctx.db
          .query('kycDocuments')
          .withIndex('by_subjectUserId', (q) => q.eq('subjectUserId', profile.userId))
          .collect();

        return {
          userId: profile.userId,
          sellerName: profile.legalName ?? null,
          email: user?.email ?? '',
          country: profile.country ?? null,
          submittedAt: profile.updatedAt,
          documentCount: documents.length,
        };
      }),
    );

    return { applications };
  },
});

export const getKycDetail = query({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query('sellerProfiles')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .first();

    if (!profile) {
      return { found: false as const };
    }

    const user = await ctx.db.get(args.userId);
    if (!user) {
      return { found: false as const };
    }

    const documents = await ctx.db
      .query('kycDocuments')
      .withIndex('by_subjectUserId', (q) => q.eq('subjectUserId', args.userId))
      .collect();

    documents.sort((a, b) => a.uploadedAt - b.uploadedAt);

    const kycDocuments = await Promise.all(
      documents.map(async (doc) => {
        const uploader = await ctx.db.get(doc.uploadedById);
        return {
          id: doc._id,
          documentType: doc.documentType,
          s3Key: doc.s3Key,
          sha256: doc.sha256 ?? null,
          uploadedAt: new Date(doc.uploadedAt).toISOString(),
          reviewStatus: doc.reviewStatus,
          reviewNotes: doc.reviewNotes ?? null,
          reviewedAt: doc.reviewedAt ? new Date(doc.reviewedAt).toISOString() : null,
          uploadedByUser: uploader ? { email: uploader.email } : null,
        };
      }),
    );

    let bankAccount: {
      accountHolder: string;
      bankName: string;
      accountNoLast4: string;
      routingOrIfsc: string;
      verified: boolean;
    } | null = null;

    if (profile.bankAccountId) {
      const acc = await ctx.db.get(profile.bankAccountId);
      if (acc) {
        bankAccount = {
          accountHolder: acc.accountHolder,
          bankName: acc.bankName,
          accountNoLast4: acc.accountNoLast4,
          routingOrIfsc: acc.routingOrIfsc,
          verified: acc.verified,
        };
      }
    }

    return {
      found: true as const,
      profile: {
        userId: profile.userId,
        legalName: profile.legalName ?? null,
        registrationNo: profile.registrationNo ?? null,
        country: profile.country ?? null,
        authorizedSignatoryName: profile.authorizedSignatoryName ?? null,
        authorizedSignatoryEmail: profile.authorizedSignatoryEmail ?? null,
        kycStatus: profile.kycStatus,
        kycReviewNotes: profile.kycReviewNotes ?? null,
        kycReviewedAt: profile.kycReviewedAt ? new Date(profile.kycReviewedAt).toISOString() : null,
        kycReviewedBy: profile.kycReviewedBy ?? null,
        bankAccount,
        kycDocuments,
        user: {
          id: user._id,
          email: user.email,
          createdAt: new Date(user.createdAt).toISOString(),
          lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt).toISOString() : null,
        },
      },
    };
  },
});

export const approveKyc = mutation({
  args: {
    userId: v.id('users'),
    reviewerId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query('sellerProfiles')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .first();

    if (!profile) {
      return { success: false as const, error: 'Seller profile not found' };
    }

    if (profile.kycStatus !== 'PENDING') {
      return { success: false as const, error: 'KYC is not pending review' };
    }

    const user = await ctx.db.get(args.userId);
    if (!user) {
      return { success: false as const, error: 'User not found' };
    }

    const now = Date.now();
    await ctx.db.patch(profile._id, {
      kycStatus: 'APPROVED',
      kycReviewedBy: args.reviewerId,
      kycReviewedAt: now,
      updatedAt: now,
    });

    const documents = await ctx.db
      .query('kycDocuments')
      .withIndex('by_subjectUserId', (q) => q.eq('subjectUserId', args.userId))
      .collect();

    for (const doc of documents) {
      if (doc.reviewStatus === 'PENDING') {
        await ctx.db.patch(doc._id, {
          reviewStatus: 'APPROVED',
          reviewedBy: args.reviewerId,
          reviewedAt: now,
        });
      }
    }

    return {
      success: true as const,
      profileId: profile._id,
      legalName: profile.legalName ?? user.email,
      email: user.email,
      kycStatus: 'APPROVED' as const,
    };
  },
});

export const rejectKyc = mutation({
  args: {
    userId: v.id('users'),
    reviewerId: v.id('users'),
    notes: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query('sellerProfiles')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .first();

    if (!profile) {
      return { success: false as const, error: 'Seller profile not found' };
    }

    if (profile.kycStatus !== 'PENDING') {
      return { success: false as const, error: 'KYC is not pending review' };
    }

    const user = await ctx.db.get(args.userId);
    if (!user) {
      return { success: false as const, error: 'User not found' };
    }

    const now = Date.now();
    await ctx.db.patch(profile._id, {
      kycStatus: 'REJECTED',
      kycReviewedBy: args.reviewerId,
      kycReviewedAt: now,
      kycReviewNotes: args.notes,
      updatedAt: now,
    });

    const documents = await ctx.db
      .query('kycDocuments')
      .withIndex('by_subjectUserId', (q) => q.eq('subjectUserId', args.userId))
      .collect();

    for (const doc of documents) {
      if (doc.reviewStatus === 'PENDING') {
        await ctx.db.patch(doc._id, {
          reviewStatus: 'REJECTED',
          reviewedBy: args.reviewerId,
          reviewedAt: now,
          reviewNotes: args.notes,
        });
      }
    }

    return {
      success: true as const,
      profileId: profile._id,
      legalName: profile.legalName ?? user.email,
      email: user.email,
      kycStatus: 'REJECTED' as const,
    };
  },
});
