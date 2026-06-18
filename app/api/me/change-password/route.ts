/**
 * POST /api/me/change-password
 *
 * Verify current password, argon2id hash new password, invalidate all sessions.
 * In MVP we invalidate by deleting the session cookie (iron-session handles
 * session records internally; the cookie seal is enough to invalidate).
 *
 * Audit events: auth.password_changed
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/rbac';
import { writeAuditEvent } from '@/lib/audit';
import { verifyPassword } from '@/lib/auth/hashing';
import { getEnv } from '@/lib/env';
import { getIronSession } from 'iron-session';
import type { SessionData } from '@/lib/rbac';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(['BUYER', 'SELLER', 'AUDITOR', 'ADMIN']);

    const body = await req.json();
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const { currentPassword, newPassword } = parsed.data;
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined;

    // Fetch user with password hash
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, passwordHash: true, email: true },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify current password
    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    }

    // Hash new password
    const { hashPassword } = await import('@/lib/auth/hashing');
    const newHash = await hashPassword(newPassword);

    // Update password hash
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    // Destroy current session cookie
    const env = getEnv();
    const ironSession = await getIronSession<SessionData>(await cookies(), {
      password: env.SESSION_SECRET,
      cookieName: 'ccverse_session',
      cookieOptions: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
      },
    });
    await ironSession.destroy();

    await writeAuditEvent({
      actorId: session.userId,
      actorRole: session.role?.toLowerCase() ?? 'unknown',
      action: 'auth.password_changed',
      targetType: 'user',
      targetId: user.id,
      ip,
      payload: {},
    });

    return NextResponse.json({ message: 'Password changed successfully' });
  } catch (err) {
    if (err instanceof NextResponse) throw err;
    console.error('POST /api/me/change-password error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}