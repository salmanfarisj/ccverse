/**
 * POST /api/auth/register/buyer
 *
 * Public buyer self-registration. Creates a User (status=pending_verification,
 * role=buyer), a BuyerProfile, an EmailVerificationToken (24h TTL), and sends
 * the verification email.
 *
 * Audit events: auth.register
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth/hashing';
import { writeAuditEvent } from '@/lib/audit';
import { SesDriver } from '@/lib/email/ses';
import { getEnv } from '@/lib/env';
import { renderVerifyEmailHtml, renderVerifyEmailText } from '@/lib/email/templates/verify-email';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const EMAIL_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const { email, password } = parsed.data;
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined;

    // Check for duplicate email
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    // Create user + buyer profile in a transaction
    const user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          email,
          passwordHash,
          role: 'BUYER',
          status: 'PENDING_VERIFICATION',
          emailVerified: false,
        },
      });

      await tx.buyerProfile.create({
        data: {
          userId: u.id,
          kycStatus: 'NOT_REQUIRED',
          kycMethod: 'NONE',
          defaultCurrency: 'USD',
        },
      });

      return u;
    });

    // Generate email verification token
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + EMAIL_TTL_MS);

    await prisma.emailVerificationToken.create({
      data: { token, userId: user.id, expiresAt },
    });

    // Send verification email
    const env = getEnv();
    const verifyUrl = `${env.APP_ORIGIN}/verify-email/${token}`;
    const ses = new SesDriver();
    await ses.send({
      to: email,
      subject: 'Verify your CC Verse account',
      html: renderVerifyEmailHtml({ email, verifyUrl }),
      text: renderVerifyEmailText({ email, verifyUrl }),
      tags: ['auth', 'verify-email'],
    });

    // Audit event
    await writeAuditEvent({
      actorId: user.id,
      actorRole: 'buyer',
      action: 'auth.register',
      targetType: 'user',
      targetId: user.id,
      ip,
      payload: { email, role: 'buyer' },
    });

    return NextResponse.json(
      { message: 'Account created. Please check your email to verify your address.' },
      { status: 201 },
    );
  } catch (err) {
    console.error('buyer register error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}