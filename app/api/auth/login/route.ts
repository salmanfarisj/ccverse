/**
 * POST /api/auth/login
 *
 * Verifies email + password, enforces account lockout, and establishes a session.
 *
 * Audit events: auth.login, auth.login_failed, auth.locked
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { verifyPassword } from '@/lib/auth/hashing';
import { writeAuditEvent } from '@/lib/audit';
import { getSession } from '@/lib/session';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const LOCKOUT_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const { email, password } = parsed.data;
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined;

    const user = await prisma.user.findUnique({ where: { email } });

    // User not found — generic message to avoid enumeration
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const retryAfter = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Account is temporarily locked. Try again later.', retryAfter },
        {
          status: 423,
          headers: { 'Retry-After': String(retryAfter) },
        },
      );
    }

    // Check status
    if (user.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Account is not active. Contact support.' }, { status: 403 });
    }

    // Check email verified
    if (!user.emailVerified) {
      return NextResponse.json(
        { error: 'Verify your email first. Check your inbox for a verification link.' },
        { status: 403 },
      );
    }

    // Verify password
    if (!user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
      const newFailedCount = (user.failedLoginCount ?? 0) + 1;

      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginCount: newFailedCount },
      });

      await writeAuditEvent({
        actorId: user.id,
        actorRole: user.role.toLowerCase(),
        action: 'auth.login_failed',
        targetType: 'user',
        targetId: user.id,
        ip,
        payload: { reason: 'invalid_password', failedCount: newFailedCount },
      });

      // Trigger lockout
      if (newFailedCount >= LOCKOUT_ATTEMPTS) {
        const lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
        await prisma.user.update({
          where: { id: user.id },
          data: { lockedUntil },
        });

        await writeAuditEvent({
          actorId: user.id,
          actorRole: user.role.toLowerCase(),
          action: 'auth.locked',
          targetType: 'user',
          targetId: user.id,
          ip,
          payload: { lockedUntil: lockedUntil.toISOString() },
        });

        return NextResponse.json(
          { error: 'Too many failed attempts. Account is temporarily locked.', retryAfter: 1800 },
          {
            status: 423,
            headers: { 'Retry-After': '1800' },
          },
        );
      }

      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Success — reset lockout counters and update last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: ip ?? null,
      },
    });

    // Establish session
    const { session, save } = await getSession();
    session.userId = user.id;
    session.role = user.role;
    session.mfaPassed = true;
    session.ip = ip;
    session.userAgent = req.headers.get('user-agent') ?? undefined;
    await save();

    await writeAuditEvent({
      actorId: user.id,
      actorRole: user.role.toLowerCase(),
      action: 'auth.login',
      targetType: 'user',
      targetId: user.id,
      ip,
      payload: {},
    });

    return NextResponse.json({ message: 'Login successful', role: user.role });
  } catch (err) {
    console.error('login error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}