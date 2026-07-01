/**
 * Seller KYC write mutations — called from Next.js API routes via HTTP.
 */

import { mutation } from '../_generated/server';
import { v } from 'convex/values';

const KycDocumentType = v.union(
  v.literal('PAN'),
  v.literal('GSTIN'),
  v.literal('PASSPORT'),
  v.literal('UTILITY_BILL'),
  v.literal('BANK_STATEMENT'),
  v.literal('INCORPORATION_CERT'),
  v.literal('OTHER'),
);

const LOCKED_KYC_STATUSES = new Set(['PENDING', 'APPROVED', 'REJECTED']);

export const updateSellerEntity = mutation({
  args: {
    userId: v.id('users'),
    legalName: v.optional(v.string()),
    registrationNo: v.optional(v.string()),
    country: v.optional(v.string()),
    authorizedSignatoryName: v.optional(v.string()),
    authorizedSignatoryEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query('sellerProfiles')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .first();

    if (!profile) {
      return { success: false as const, error: 'Seller profile not found' };
    }

    if (LOCKED_KYC_STATUSES.has(profile.kycStatus)) {
      return {
        success: false as const,
        error: 'Cannot update entity details while KYC is under review or approved',
      };
    }

    const now = Date.now();
    await ctx.db.patch(profile._id, {
      ...(args.legalName !== undefined && { legalName: args.legalName }),
      ...(args.registrationNo !== undefined && { registrationNo: args.registrationNo }),
      ...(args.country !== undefined && { country: args.country }),
      ...(args.authorizedSignatoryName !== undefined && {
        authorizedSignatoryName: args.authorizedSignatoryName,
      }),
      ...(args.authorizedSignatoryEmail !== undefined && {
        authorizedSignatoryEmail: args.authorizedSignatoryEmail,
      }),
      updatedAt: now,
    });

    const updated = await ctx.db.get(profile._id);
    return {
      success: true as const,
      profileId: profile._id,
      kycStatus: updated?.kycStatus ?? profile.kycStatus,
    };
  },
});

export const createKycDocument = mutation({
  args: {
    userId: v.id('users'),
    uploadedById: v.id('users'),
    documentType: KycDocumentType,
    s3Key: v.string(),
    sha256: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query('sellerProfiles')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .first();

    if (!profile) {
      return { success: false as const, error: 'Seller profile not found' };
    }

    if (['PENDING', 'APPROVED'].includes(profile.kycStatus)) {
      return {
        success: false as const,
        error: 'Cannot upload documents while KYC is under review or approved',
      };
    }

    const now = Date.now();
    const docId = await ctx.db.insert('kycDocuments', {
      subjectUserId: args.userId,
      documentType: args.documentType,
      s3Key: args.s3Key,
      sha256: args.sha256,
      uploadedAt: now,
      uploadedById: args.uploadedById,
      reviewStatus: 'PENDING',
    });

    return { success: true as const, documentId: docId };
  },
});

export const createBankAccount = mutation({
  args: {
    userId: v.id('users'),
    accountHolder: v.string(),
    bankName: v.string(),
    accountNoLast4: v.string(),
    routingOrIfsc: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query('sellerProfiles')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .first();

    if (!profile) {
      return { success: false as const, error: 'Seller profile not found' };
    }

    if (['PENDING', 'APPROVED'].includes(profile.kycStatus)) {
      return {
        success: false as const,
        error: 'Cannot update bank account while KYC is under review or approved',
      };
    }

    if (profile.bankAccountId) {
      await ctx.db.delete(profile.bankAccountId);
    }

    const now = Date.now();
    const bankAccountId = await ctx.db.insert('bankAccounts', {
      userId: args.userId,
      accountHolder: args.accountHolder,
      bankName: args.bankName,
      accountNoLast4: args.accountNoLast4,
      routingOrIfsc: args.routingOrIfsc,
      verified: false,
      createdAt: now,
    });

    await ctx.db.patch(profile._id, {
      bankAccountId,
      updatedAt: now,
    });

    return {
      success: true as const,
      bankAccountId,
      accountHolder: args.accountHolder,
      bankName: args.bankName,
      accountNoLast4: args.accountNoLast4,
      routingOrIfsc: args.routingOrIfsc,
      verified: false,
    };
  },
});

export const submitKyc = mutation({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query('sellerProfiles')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .first();

    if (!profile) {
      return { success: false as const, error: 'Seller profile not found' };
    }

    if (profile.kycStatus === 'PENDING') {
      return { success: false as const, error: 'KYC is already under review' };
    }

    if (profile.kycStatus === 'APPROVED') {
      return { success: false as const, error: 'KYC is already approved' };
    }

    if (
      !profile.legalName ||
      !profile.registrationNo ||
      !profile.country ||
      !profile.authorizedSignatoryName ||
      !profile.authorizedSignatoryEmail
    ) {
      return {
        success: false as const,
        error: 'Entity details are incomplete. Please fill in all fields.',
      };
    }

    const documents = await ctx.db
      .query('kycDocuments')
      .withIndex('by_subjectUserId', (q) => q.eq('subjectUserId', args.userId))
      .collect();

    if (documents.length === 0) {
      return { success: false as const, error: 'At least one KYC document is required' };
    }

    if (!profile.bankAccountId) {
      return { success: false as const, error: 'Bank account is required' };
    }

    const bankAccount = await ctx.db.get(profile.bankAccountId);
    if (!bankAccount) {
      return { success: false as const, error: 'Bank account is required' };
    }

    const now = Date.now();
    await ctx.db.patch(profile._id, {
      kycStatus: 'PENDING',
      updatedAt: now,
    });

    return {
      success: true as const,
      profileId: profile._id,
      legalName: profile.legalName,
      kycStatus: 'PENDING' as const,
    };
  },
});
