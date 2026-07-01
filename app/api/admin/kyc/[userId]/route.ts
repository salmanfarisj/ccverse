/**
 * GET /api/admin/kyc/:userId — Full KYC detail for a seller.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { Id } from '@/convex/_generated/dataModel';
import { getConvexClient } from '@/lib/convex/client';
import { requireRole } from '@/lib/rbac';
import { api } from '@/convex/_generated/api';

export async function GET(_req: NextRequest, { params }: { params: { userId: string } }) {
  try {
    await requireRole(['ADMIN']);
    const convex = getConvexClient();

    const result = await convex.query(api.admin.kyc.getKycDetail, {
      userId: params.userId as Id<'users'>,
    });

    if (!result.found) {
      return NextResponse.json({ error: 'Seller profile not found' }, { status: 404 });
    }

    return NextResponse.json({ profile: result.profile });
  } catch (err) {
    if (err instanceof NextResponse) throw err;
    console.error('GET /api/admin/kyc/:userId error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
