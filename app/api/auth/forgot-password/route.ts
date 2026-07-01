/**
 * POST /api/auth/forgot-password
 *
 * Generates a PasswordResetToken via Convex and returns it.
 *
 * Phase-1 behaviour: the token is returned in the response body so
 * the happy-path reset flow can be exercised end-to-end without
 * relying on an email channel.
 *
 * TODO(phase-2): send the reset URL via SES — `createPasswordResetTokenMutation`
 * will move to a Node action wrapper that generates the token and
 * triggers an SES send. The HTTP API response will then stop
 * returning the token (only the generic "if the email exists..." message).
 *
 * Audit event: auth.password_reset_requested (logged on success).
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { api } from '@/convex/_generated/api';
import { getConvexClient } from '@/lib/convex/client';

const forgotSchema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = forgotSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const { email } = parsed.data;
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined;
    const convex = getConvexClient();

    // Resolve the userId (returns null if not found). We always
    // respond with the same generic message — do not leak whether
    // the email exists.
    const lookup = await convex.query(api.users.queries.findUserByEmailQuery, { email });
    if (!lookup.userId) {
      return NextResponse.json({
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    }

    const created = await convex.mutation(
      api.auth.emailMutations.createPasswordResetTokenMutation,
      {
        userId: lookup.userId,
        ip,
      },
    );

    await convex.mutation(api.audit.logMutation.writeAuditLogMutation, {
      actorId: lookup.userId,
      action: 'auth.password_reset_requested',
      targetType: 'user',
      targetId: lookup.userId,
      ip,
      payload: '{}',
    });

    return NextResponse.json({
      message: 'If an account with that email exists, a password reset link has been sent.',
      // Phase 1 only — see TODO above.
      devToken: created.token,
    });
  } catch (err) {
    console.error('forgot-password error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
