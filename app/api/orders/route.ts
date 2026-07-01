import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { Id } from '@/convex/_generated/dataModel';
import { api } from '@/convex/_generated/api';
import { getConvexClient } from '@/lib/convex/client';
import { requireRole } from '@/lib/rbac';

const buySchema = z.object({
  listingId: z.string().min(1),
  quantity: z.number().int().min(1),
});

export async function GET(_req: NextRequest) {
  try {
    const session = await requireRole(['BUYER']);
    const convex = getConvexClient();

    const orders = await convex.query(api.orders.queries.listMyOrders, {
      buyerId: session.userId as Id<'users'>,
    });

    return NextResponse.json({ orders });
  } catch (err) {
    if (err instanceof NextResponse) throw err;
    console.error('GET /api/orders error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(['BUYER']);
    const body = await req.json();
    const parsed = buySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const convex = getConvexClient();
    const result = await convex.mutation(api.orders.mutations.buyListing, {
      buyerId: session.userId as Id<'users'>,
      listingId: parsed.data.listingId as Id<'listings'>,
      quantity: parsed.data.quantity,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      message: 'Purchase complete (demo payment)',
      orderId: result.orderId,
      certificateId: result.certificateId,
      certNo: result.certNo,
      totalAmount: result.totalAmount,
      currency: result.currency,
      serials: result.serials,
    });
  } catch (err) {
    if (err instanceof NextResponse) throw err;
    console.error('POST /api/orders error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
