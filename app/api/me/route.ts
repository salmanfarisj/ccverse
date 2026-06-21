/**
 * GET /api/me — Current user profile (shape varies by role).
 * PATCH /api/me — Update allowed profile fields.
 *
 * Audit events: user.updated
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/rbac';
import { writeAuditEvent } from '@/lib/audit';

export async function GET(_req: NextRequest) {
  try {
    const session = await requireRole(['BUYER', 'SELLER', 'AUDITOR', 'ADMIN']);

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        emailVerified: true,
        emailVerifiedAt: true,
        lastLoginAt: true,
        createdAt: true,
        buyerProfile: {
          select: { legalName: true, country: true, defaultCurrency: true, kycStatus: true },
        },
        sellerProfile: {
          select: {
            legalName: true,
            country: true,
            kycStatus: true,
            bankAccount: { select: { bankName: true, accountNoLast4: true, verified: true } },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (err) {
    if (err instanceof NextResponse) throw err;
    console.error('GET /api/me error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const patchMeSchema = z.object({
  legalName: z.string().min(1).max(255).optional(),
  country: z.string().min(2).max(2).optional(),
  defaultCurrency: z.enum(['INR', 'USD']).optional(),
});

export async function PATCH(req: NextRequest) {
  console.log('[DEBUG] PATCH /api/me called, content-type:', req.headers.get('content-type'));
  try {
    const session = await requireRole(['BUYER', 'SELLER', 'AUDITOR', 'ADMIN']);
    console.log('[DEBUG] PATCH /api/me session.role:', session.role);
    const body = await req.json();
    console.log('[DEBUG] PATCH /api/me body:', JSON.stringify(body));
    const parsed = patchMeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const { legalName, country, defaultCurrency } = parsed.data;
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined;

    if (session.role === 'BUYER') {
      await prisma.buyerProfile.update({
        where: { userId: session.userId },
        data: {
          ...(legalName !== undefined && { legalName }),
          ...(country !== undefined && { country }),
          ...(defaultCurrency !== undefined && { defaultCurrency }),
        },
      });
    } else if (session.role === 'SELLER') {
      // Changing legalName on a seller resets kycStatus to EXPIRED
      const updateData: Record<string, unknown> = {};
      if (legalName !== undefined) {
        updateData.legalName = legalName;
        updateData.kycStatus = 'EXPIRED';
      }
      if (country !== undefined) updateData.country = country;

      await prisma.sellerProfile.update({
        where: { userId: session.userId },
        data: updateData,
      });
    }

    await writeAuditEvent({
      actorId: session.userId,
      actorRole: session.role?.toLowerCase() ?? 'unknown',
      action: 'user.updated',
      targetType: 'user',
      targetId: session.userId,
      ip,
      payload: { legalName, country, defaultCurrency },
    });

    return NextResponse.json({ message: 'Profile updated' });
  } catch (err) {
    if (err instanceof NextResponse) throw err;
    console.error('PATCH /api/me error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}