import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { Id } from '@/convex/_generated/dataModel';
import { api } from '@/convex/_generated/api';
import { getConvexClient } from '@/lib/convex/client';
import { requireRole } from '@/lib/rbac';
import { requireKycApproved } from '@/lib/rbac/seller';

const createListingSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1),
  quantity: z.number().int().min(1),
  unitPrice: z.number().positive(),
  currency: z.enum(['USD', 'INR']),
});

export async function GET(_req: NextRequest) {
  try {
    const session = await requireRole(['SELLER']);
    const convex = getConvexClient();

    const listings = await convex.query(api.listings.queries.listMyListings, {
      sellerId: session.userId as Id<'users'>,
    });

    return NextResponse.json({ listings });
  } catch (err) {
    if (err instanceof NextResponse) throw err;
    console.error('GET /api/seller/listings error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(['SELLER']);
    await requireKycApproved(session);

    const body = await req.json();
    const parsed = createListingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const convex = getConvexClient();
    const result = await convex.mutation(api.listings.mutations.createListing, {
      sellerId: session.userId as Id<'users'>,
      projectId: parsed.data.projectId as Id<'projects'>,
      title: parsed.data.title,
      quantity: parsed.data.quantity,
      unitPrice: parsed.data.unitPrice,
      currency: parsed.data.currency,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      message: 'Listing created',
      listingId: result.listingId,
      serials: result.serials,
    });
  } catch (err) {
    if (err instanceof NextResponse) throw err;
    console.error('POST /api/seller/listings error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
