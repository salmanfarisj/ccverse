/**
 * Seller KYC read queries — called from Next.js API routes via HTTP.
 */

import { query } from '../_generated/server';
import { v } from 'convex/values';
import type { Id } from '../_generated/dataModel';

function computeWizardStep(
  profile: {
    legalName?: string;
    registrationNo?: string;
    country?: string;
    authorizedSignatoryName?: string;
    authorizedSignatoryEmail?: string;
    bankAccountId?: Id<'bankAccounts'>;
  },
  documentCount: number,
): number {
  const hasEntity =
    !!profile.legalName &&
    !!profile.registrationNo &&
    !!profile.country &&
    !!profile.authorizedSignatoryName &&
    !!profile.authorizedSignatoryEmail;

  const hasDocuments = documentCount > 0;
  const hasBankAccount = !!profile.bankAccountId;

  let step = 1;
  if (hasEntity) step = 2;
  if (hasEntity && hasDocuments) step = 3;
  if (hasEntity && hasDocuments && hasBankAccount) step = 4;
  return step;
}

export const getSellerKycState = query({
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

    const documents = await ctx.db
      .query('kycDocuments')
      .withIndex('by_subjectUserId', (q) => q.eq('subjectUserId', args.userId))
      .collect();

    documents.sort((a, b) => a.uploadedAt - b.uploadedAt);

    let bankAccount: {
      id: Id<'bankAccounts'>;
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
          id: acc._id,
          accountHolder: acc.accountHolder,
          bankName: acc.bankName,
          accountNoLast4: acc.accountNoLast4,
          routingOrIfsc: acc.routingOrIfsc,
          verified: acc.verified,
        };
      }
    }

    const step = computeWizardStep(profile, documents.length);

    return {
      found: true as const,
      profileId: profile._id,
      step,
      kycStatus: profile.kycStatus,
      entity: {
        legalName: profile.legalName ?? null,
        registrationNo: profile.registrationNo ?? null,
        country: profile.country ?? null,
        authorizedSignatoryName: profile.authorizedSignatoryName ?? null,
        authorizedSignatoryEmail: profile.authorizedSignatoryEmail ?? null,
      },
      documents: documents.map((doc) => ({
        id: doc._id,
        documentType: doc.documentType,
        s3Key: doc.s3Key,
        sha256: doc.sha256 ?? null,
        uploadedAt: doc.uploadedAt,
        reviewStatus: doc.reviewStatus,
      })),
      bankAccount,
    };
  },
});

export const getKycDocumentRef = query({
  args: {
    userId: v.id('users'),
    docId: v.id('kycDocuments'),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.docId);
    if (!doc || doc.subjectUserId !== args.userId) {
      return { found: false as const };
    }
    return { found: true as const, s3Key: doc.s3Key };
  },
});
