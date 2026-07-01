/**
 * POST /api/auth/logout
 *
 * Destroys the iron-session cookie and writes a `auth.logout` audit
 * event. The cookie is the transport only — user data lives in
 * Convex, so logout is just "clear the cookie".
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { api } from '@/convex/_generated/api';
import { getConvexClient } from '@/lib/convex/client';
import { getSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined;

    const { session, save } = await getSession();

    if (session.userId && session.role) {
      const convex = getConvexClient();
      await convex.mutation(api.audit.logMutation.writeAuditLogMutation, {
        actorId: session.userId,
        actorRole: session.role.toLowerCase(),
        action: 'auth.logout',
        targetType: 'user',
        targetId: session.userId,
        ip,
        payload: '{}',
      });
    }

    session.userId = undefined;
    session.role = undefined;
    session.mfaPassed = undefined;
    session.ip = undefined;
    session.userAgent = undefined;
    await save();

    return NextResponse.json({ message: 'Logged out' });
  } catch (err) {
    console.error('logout error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
