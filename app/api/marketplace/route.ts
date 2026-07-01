import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { api } from '@/convex/_generated/api';
import { getConvexClient } from '@/lib/convex/client';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  try {
    const convex = getConvexClient();
    const listings = await convex.query(api.listings.queries.listActiveListings, {});

    return NextResponse.json({ listings });
  } catch (err) {
    console.error('GET /api/marketplace error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
