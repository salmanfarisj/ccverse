import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { Id } from '@/convex/_generated/dataModel';
import { api } from '@/convex/_generated/api';
import { getConvexClient } from '@/lib/convex/client';

type RouteContext = { params: { listingId: string } };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const convex = getConvexClient();
    const result = await convex.query(api.listings.queries.getListing, {
      listingId: params.listingId as Id<'listings'>,
    });

    if (!result.found) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    return NextResponse.json({ listing: result.listing });
  } catch (err) {
    console.error('GET /api/marketplace/[listingId] error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
