/**
 * GET /api/me — Current user profile (shape varies by role).
 * PATCH /api/me — Update allowed profile fields.
 *
 * All reads/writes go through Convex. The iron-session cookie is
 * only the transport that tells us *which* userId to query/mutate.
 *
 * Audit event: user.updated (on PATCH success).
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { api } from '@/convex/_generated/api';
import { getConvexClient } from '@/lib/convex/client';
import { requireRole } from '@/lib/rbac';

export async function GET(_req: NextRequest) {
  try {
    const session = await requireRole(['BUYER', 'SELLER', 'AUDITOR', 'ADMIN']);

    if (!session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const convex = getConvexClient();
    const result = await convex.query(api.users.queries.getMeQuery, {
      userId: session.userId as never,
    });

    if (!result.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user: result.user });
  } catch (err) {
    if (err instanceof NextResponse) throw err;
    console.error('GET /api/me error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const patchMeSchema = z.object({
  legalName: z.string().min(1).max(255).optional(),
  country: z.string().min(2).max(2).optional(),
  defaultCurrency: z.enum(['INR', 'USD']).optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireRole(['BUYER', 'SELLER', 'AUDITOR', 'ADMIN']);
    if (!session.userId || !session.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = patchMeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const { legalName, country, defaultCurrency } = parsed.data;
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined;
    const convex = getConvexClient();

    const result = await convex.mutation(api.users.mutations.updateMyProfileMutation, {
      userId: session.userId as never,
      legalName,
      country,
      defaultCurrency,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    await convex.mutation(api.audit.logMutation.writeAuditLogMutation, {
      actorId: session.userId,
      actorRole: session.role.toLowerCase(),
      action: 'user.updated',
      targetType: 'user',
      targetId: session.userId,
      ip,
      payload: JSON.stringify({ legalName, country, defaultCurrency }),
    });

    return NextResponse.json({ message: 'Profile updated' });
  } catch (err) {
    if (err instanceof NextResponse) throw err;
    console.error('PATCH /api/me error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
