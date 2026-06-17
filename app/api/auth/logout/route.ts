/**
 * POST /api/auth/logout
 *
 * Destroys the session cookie.
 *
 * Audit events: auth.logout
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { writeAuditEvent } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined;

    const { session, save } = await getSession();

    if (session.userId) {
      await writeAuditEvent({
        actorId: session.userId,
        actorRole: session.role?.toLowerCase(),
        action: 'auth.logout',
        targetType: 'user',
        targetId: session.userId,
        ip,
        payload: {},
      });
    }

    // Destroy the session by clearing all data and saving
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