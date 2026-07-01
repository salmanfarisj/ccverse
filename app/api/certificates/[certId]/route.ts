import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { Id } from '@/convex/_generated/dataModel';
import { api } from '@/convex/_generated/api';
import { getConvexClient } from '@/lib/convex/client';

type RouteContext = { params: { certId: string } };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const convex = getConvexClient();
    const result = await convex.query(api.orders.queries.getCertificate, {
      certId: params.certId as Id<'certificates'>,
    });

    if (!result.found) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
    }

    return NextResponse.json({ certificate: result.certificate });
  } catch (err) {
    console.error('GET /api/certificates/[certId] error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
