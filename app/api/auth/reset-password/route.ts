/**
 * POST /api/auth/reset-password
 *
 * Consumes a PasswordResetToken via Convex `auth.actions.resetPasswordAction`
 * (Node action: hashes the new password, then atomically consumes the
 * token + updates the user). On success, destroys the current
 * iron-session cookie so the user has to re-login.
 *
 * Audit events: auth.password_reset_completed, auth.session_invalidated.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { api } from '@/convex/_generated/api';
import { getConvexClient } from '@/lib/convex/client';
import { getSession } from '@/lib/session';

const resetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = resetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const { token, password } = parsed.data;
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined;
    const convex = getConvexClient();

    const result = await convex.action(api.auth.actions.resetPasswordAction, {
      token,
      password,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? 'Invalid or expired reset token' },
        { status: 400 },
      );
    }

    // Destroy the current session (the user is already on the reset page,
    // but we destroy their cookie so they need to re-login).
    try {
      const { session, save } = await getSession();
      if (session.userId && session.role) {
        await convex.mutation(api.audit.logMutation.writeAuditLogMutation, {
          actorId: session.userId,
          actorRole: session.role.toLowerCase(),
          action: 'auth.session_invalidated',
          targetType: 'user',
          targetId: session.userId,
          ip,
          payload: JSON.stringify({ reason: 'password_reset' }),
        });
      }
      session.userId = undefined;
      session.role = undefined;
      session.mfaPassed = undefined;
      session.ip = undefined;
      session.userAgent = undefined;
      await save();
    } catch {
      // Non-fatal — session might not exist
    }

    await convex.mutation(api.audit.logMutation.writeAuditLogMutation, {
      actorId: result.userId,
      action: 'auth.password_reset_completed',
      targetType: 'user',
      targetId: result.userId,
      ip,
      payload: '{}',
    });

    return NextResponse.json({
      message: 'Password updated. You can now log in with your new password.',
    });
  } catch (err) {
    console.error('reset-password error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
