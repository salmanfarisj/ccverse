/**
 * POST /api/auth/forgot-password
 *
 * Generates a PasswordResetToken (30min TTL) and sends a reset email.
 * Always returns 200 to prevent email enumeration.
 *
 * Audit events: auth.password_reset_requested
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { writeAuditEvent } from '@/lib/audit';
import { SesDriver } from '@/lib/email/ses';
import { getEnv } from '@/lib/env';
import { renderPasswordResetHtml, renderPasswordResetText } from '@/lib/email/templates/password-reset';

const forgotSchema = z.object({
  email: z.string().email(),
});

const RESET_TTL_MS = 30 * 60 * 1000; // 30 minutes

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = forgotSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const { email } = parsed.data;
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined;

    const user = await prisma.user.findUnique({ where: { email } });

    // Always return 200 — don't reveal whether the email exists
    if (!user) {
      return NextResponse.json({
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + RESET_TTL_MS);

    await prisma.passwordResetToken.create({
      data: { token, userId: user.id, expiresAt, ip: ip ?? null },
    });

    const env = getEnv();
    const resetUrl = `${env.APP_ORIGIN}/reset-password/${token}`;

    const ses = new SesDriver();
    await ses.send({
      to: email,
      subject: 'Reset your CC Verse password',
      html: renderPasswordResetHtml({ email, resetUrl }),
      text: renderPasswordResetText({ email, resetUrl }),
      tags: ['auth', 'password-reset'],
    });

    await writeAuditEvent({
      actorId: user.id,
      actorRole: user.role.toLowerCase(),
      action: 'auth.password_reset_requested',
      targetType: 'user',
      targetId: user.id,
      ip,
      payload: {},
    });

    return NextResponse.json({
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (err) {
    console.error('forgot-password error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}