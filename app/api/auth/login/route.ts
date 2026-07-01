/**
 * POST /api/auth/login
 *
 * Verifies email + password via Convex `auth.actions.loginAction`.
 * Enforces account lockout (managed server-side by Convex), then
 * establishes an iron-session cookie on success.
 *
 * Session model note: the iron-session cookie is the transport layer
 * only — user data lives in Convex. See `convex/auth/session.ts` for
 * the full Phase 1 auth model decision.
 *
 * Audit events: auth.login, auth.login_failed, auth.locked
 * (written via `api.audit.logMutation.writeAuditLogMutation`).
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { api } from '@/convex/_generated/api';
import { getConvexClient } from '@/lib/convex/client';
import { getSession } from '@/lib/session';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const { email, password } = parsed.data;
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined;

    const convex = getConvexClient();
    const result = await convex.action(api.auth.actions.loginAction, { email, password });

    if (!result.success) {
      const isLocked = result.error === 'Account locked';
      await convex.mutation(api.audit.logMutation.writeAuditLogMutation, {
        action: isLocked ? 'auth.locked' : 'auth.login_failed',
        ip,
        payload: JSON.stringify({ email, error: result.error }),
      });
      return NextResponse.json(
        { error: result.error ?? 'Invalid email or password' },
        { status: isLocked ? 423 : 401 },
      );
    }

    if (!result.user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const u = result.user;
    if (u.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Account is not active. Contact support.' },
        { status: 403 },
      );
    }

    const { session, save } = await getSession();
    session.userId = u.id;
    session.role = u.role;
    session.mfaPassed = !u.mfaEnabled;
    session.ip = ip;
    session.userAgent = req.headers.get('user-agent') ?? undefined;
    await save();

    await convex.mutation(api.audit.logMutation.writeAuditLogMutation, {
      actorId: u.id,
      actorRole: u.role.toLowerCase(),
      action: 'auth.login',
      targetType: 'user',
      targetId: u.id,
      ip,
      payload: '{}',
    });

    return NextResponse.json({ message: 'Login successful', role: u.role });
  } catch (err) {
    console.error('login error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
