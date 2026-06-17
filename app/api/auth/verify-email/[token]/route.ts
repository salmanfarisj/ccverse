/**
 * GET /api/auth/verify-email/[token]
 *
 * Validates the EmailVerificationToken, activates the user account, and
 * consumes the token.
 *
 * Audit events: auth.email_verified
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { writeAuditEvent } from '@/lib/audit';

export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } },
) {
  const { token } = params;

  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 });
  }

  const record = await prisma.emailVerificationToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!record) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
  }

  if (record.consumedAt) {
    return NextResponse.json({ error: 'Token has already been used' }, { status: 400 });
  }

  if (record.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Token has expired' }, { status: 400 });
  }

  // Consume token and activate user in a transaction
  await prisma.$transaction(async (tx) => {
    await tx.emailVerificationToken.update({
      where: { token },
      data: { consumedAt: new Date() },
    });

    await tx.user.update({
      where: { id: record.userId },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
        status: 'ACTIVE',
      },
    });
  });

  // Audit event
  await writeAuditEvent({
    actorId: record.userId,
    actorRole: 'buyer',
    action: 'auth.email_verified',
    targetType: 'user',
    targetId: record.userId,
    payload: {},
  });

  return NextResponse.json({ message: 'Email verified. Your account is now active.' });
}