/**
 * POST /api/auth/reset-password
 *
 * Validates a PasswordResetToken, updates the user's password, consumes the
 * token, and invalidates all existing sessions.
 *
 * Audit events: auth.password_reset_completed
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth/hashing';
import { writeAuditEvent } from '@/lib/audit';
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

    const record = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!record) {
      return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 });
    }

    if (record.consumedAt) {
      return NextResponse.json({ error: 'Token has already been used' }, { status: 400 });
    }

    if (record.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Token has expired. Please request a new one.' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    // Update password and consume token in a transaction
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      });

      await tx.passwordResetToken.update({
        where: { token },
        data: { consumedAt: new Date() },
      });
    });

    // Invalidate the current session (the user is already on the reset page,
    // but we destroy their current cookie so they need to re-login with the new password)
    try {
      const { session, save } = await getSession();
      if (session.userId) {
        await writeAuditEvent({
          actorId: session.userId,
          actorRole: session.role?.toLowerCase(),
          action: 'auth.session_invalidated',
          targetType: 'user',
          targetId: session.userId,
          ip,
          payload: { reason: 'password_reset' },
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

    await writeAuditEvent({
      actorId: record.userId,
      actorRole: record.user.role.toLowerCase(),
      action: 'auth.password_reset_completed',
      targetType: 'user',
      targetId: record.userId,
      ip,
      payload: {},
    });

    return NextResponse.json({ message: 'Password updated. You can now log in with your new password.' });
  } catch (err) {
    console.error('reset-password error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}