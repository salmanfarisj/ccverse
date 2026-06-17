/**
 * requireKycApproved — seller KYC status guard.
 *
 * Use this in addition to requireRole(['SELLER']) for routes that require
 * a fully-approved seller (e.g. project registration, credit listing).
 *
 * Checks SellerProfile.kycStatus === 'APPROVED' in the DB.
 * Throws NextResponse 403 with { error, kycStatus } when KYC is not approved.
 *
 * NOTE: This performs a DB read so it must only be used in Node.js route
 * handlers / server actions — NOT in middleware (Edge has no DB access).
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { SessionData } from './index';

export async function requireKycApproved(session: SessionData): Promise<void> {
  if (!session.userId) {
    throw NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const profile = await prisma.sellerProfile.findUnique({
    where: { userId: session.userId },
    select: { kycStatus: true, legalName: true },
  });

  if (!profile) {
    throw NextResponse.json({ error: 'Seller profile not found' }, { status: 404 });
  }

  if (profile.kycStatus !== 'APPROVED') {
    throw NextResponse.json(
      {
        error: 'KYC verification required to access this feature',
        kycStatus: profile.kycStatus,
        message:
          profile.kycStatus === 'NOT_STARTED'
            ? 'Complete your KYC verification to list credits.'
            : profile.kycStatus === 'PENDING'
            ? 'Your KYC application is under review.'
            : profile.kycStatus === 'REJECTED'
            ? 'Your KYC was rejected. Please contact support.'
            : 'Your KYC has expired. Please re-verify.',
      },
      { status: 403 },
    );
  }
}
