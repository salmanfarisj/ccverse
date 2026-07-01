import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { Id } from '@/convex/_generated/dataModel';
import { api } from '@/convex/_generated/api';
import { isInvalidSessionUserIdError } from '@/lib/convex/errors';
import { getConvexClient } from '@/lib/convex/client';
import { requireRole } from '@/lib/rbac';
import { clearSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  try {
    const session = await requireRole(['SELLER']);
    const userId = session.userId as Id<'users'>;
    const convex = getConvexClient();

    const [kyc, projects, listings, sales] = await Promise.all([
      convex.query(api.kyc.queries.getSellerKycState, { userId }),
      convex.query(api.projects.queries.listMyProjects, { sellerId: userId }),
      convex.query(api.listings.queries.listMyListings, { sellerId: userId }),
      convex.query(api.orders.queries.listSellerOrders, { sellerId: userId }),
    ]);

    return NextResponse.json({ kyc, projects, listings, sales });
  } catch (err) {
    if (err instanceof NextResponse) throw err;
    if (isInvalidSessionUserIdError(err)) {
      await clearSession();
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('GET /api/seller/dashboard error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
