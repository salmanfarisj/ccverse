/**
 * GET /api/admin/users — List all users with optional email search.
 * POST /api/admin/users — Create an Auditor or Admin account.
 *
 * Audit events: user.role_changed (on create)
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/rbac';
import { writeAuditEvent } from '@/lib/audit';
import { hashPassword } from '@/lib/auth/hashing';

export async function GET(req: NextRequest) {
  try {
    await requireRole(['ADMIN']);
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') ?? '';

    const users = await prisma.user.findMany({
      where: q
        ? { email: { contains: q, mode: 'insensitive' } }
        : undefined,
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        emailVerified: true,
        createdAt: true,
        lastLoginAt: true,
        sellerProfile: { select: { legalName: true, kycStatus: true } },
        buyerProfile: { select: { legalName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ users });
  } catch (err) {
    if (err instanceof NextResponse) throw err;
    console.error('GET /api/admin/users error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const createUserSchema = z.object({
  email: z.string().email(),
  role: z.enum(['AUDITOR', 'ADMIN']),
  password: z.string().min(12, 'Password must be at least 12 characters').optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(['ADMIN']);
    const body = await req.json();
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const { email, role, password } = parsed.data;
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined;

    // Check for duplicate email
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    // Generate temp password if not provided
    const tempPassword = password ?? crypto.randomUUID().slice(0, 16);
    const passwordHash = await hashPassword(tempPassword);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: role as 'AUDITOR' | 'ADMIN',
        status: 'ACTIVE',
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });

    await writeAuditEvent({
      actorId: session.userId,
      actorRole: 'admin',
      action: 'user.role_changed',
      targetType: 'user',
      targetId: user.id,
      ip,
      payload: { email, role, action: 'created' },
    });

    return NextResponse.json(
      { message: 'Account created', userId: user.id, tempPassword: password ? undefined : tempPassword },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof NextResponse) throw err;
    console.error('POST /api/admin/users error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}