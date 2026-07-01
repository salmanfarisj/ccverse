import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { api } from '@/convex/_generated/api';
import { getConvexClient } from '@/lib/convex/client';

export async function GET(_req: NextRequest) {
  try {
    const convex = getConvexClient();
    const entries = await convex.query(api.registry.queries.listRegistry, {});

    return NextResponse.json({ entries });
  } catch (err) {
    console.error('GET /api/registry error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
