/**
 * requireKycApproved — seller KYC status guard.
 *
 * Use this in addition to requireRole(['SELLER']) for routes that require
 * a fully-approved seller (e.g. project registration, credit listing).
 */

import { NextResponse } from 'next/server';
import type { Id } from '@/convex/_generated/dataModel';
import { api } from '@/convex/_generated/api';
import { getConvexClient } from '@/lib/convex/client';
import type { SessionData } from './index';

export async function requireKycApproved(session: SessionData): Promise<void> {
  if (!session.userId) {
    throw NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const convex = getConvexClient();
  const state = await convex.query(api.kyc.queries.getSellerKycState, {
    userId: session.userId as Id<'users'>,
  });

  if (!state.found) {
    throw NextResponse.json({ error: 'Seller profile not found' }, { status: 404 });
  }

  const kycStatus = state.kycStatus;

  if (kycStatus !== 'APPROVED') {
    throw NextResponse.json(
      {
        error: 'KYC verification required to access this feature',
        kycStatus,
        message:
          kycStatus === 'NOT_STARTED'
            ? 'Complete your KYC verification to list credits.'
            : kycStatus === 'PENDING'
              ? 'Your KYC application is under review.'
              : kycStatus === 'REJECTED'
                ? 'Your KYC was rejected. Please contact support.'
                : 'Your KYC has expired. Please re-verify.',
      },
      { status: 403 },
    );
  }
}
