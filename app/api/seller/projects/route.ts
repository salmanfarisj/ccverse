/**
 * POST /api/seller/projects
 *
 * KYC-gated: only sellers with kycStatus === 'APPROVED' may create projects.
 *
 * Full implementation lands in Phase 2 (T2-1). This handler returns 501
 * as a placeholder; the KYC gate is the primary concern here.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/rbac';
import { requireKycApproved } from '@/lib/rbac/seller';

export async function POST(_req: NextRequest) {
  try {
    const session = await requireRole(['SELLER']);
    await requireKycApproved(session);

    // Phase 2: full project creation logic
    return NextResponse.json(
      {
        error: 'Project creation is not yet implemented. Full registration flows land in Phase 2.',
      },
      { status: 501 },
    );
  } catch (err) {
    // If it's a NextResponse (auth/kyc rejection), return it directly
    if (err instanceof NextResponse) {
      return err;
    }
    console.error('POST /api/seller/projects error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
