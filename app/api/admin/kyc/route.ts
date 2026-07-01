/**
 * GET /api/admin/kyc — Pending KYC applications queue.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getConvexClient } from '@/lib/convex/client';
import { requireRole } from '@/lib/rbac';
import { api } from '@/convex/_generated/api';

export async function GET(_req: NextRequest) {
  try {
    await requireRole(['ADMIN']);

    const convex = getConvexClient();
    const { applications } = await convex.query(api.admin.kyc.listPendingKyc, {});

    return NextResponse.json({ applications });
  } catch (err) {
    if (err instanceof NextResponse) throw err;
    console.error('GET /api/admin/kyc error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
