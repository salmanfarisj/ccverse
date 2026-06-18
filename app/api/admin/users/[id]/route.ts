/**
 * PATCH /api/admin/users/:id — Update a user's role or status.
 *
 * Audit events: user.role_changed
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/rbac';
import { writeAuditEvent } from '@/lib/audit';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await requireRole(['ADMIN']);
    const { id } = params;

    const body = await req.json();
    const parsed = z.object({
      role: z.enum(['BUYER', 'SELLER', 'AUDITOR', 'ADMIN']).optional(),
      status: z.enum(['ACTIVE', 'SUSPENDED', 'BANNED', 'PENDING_VERIFICATION']).optional(),
    }).safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (parsed.data.role) updates.role = parsed.data.role;
    if (parsed.data.status) updates.status = parsed.data.status;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id },
      data: updates,
      select: { id: true, email: true, role: true, status: true },
    });

    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined;
    await writeAuditEvent({
      actorId: session.userId,
      actorRole: 'admin',
      action: 'user.role_changed',
      targetType: 'user',
      targetId: user.id,
      ip,
      payload: { updatedFields: updates, email: user.email },
    });

    return NextResponse.json({ user });
  } catch (err) {
    if (err instanceof NextResponse) throw err;
    console.error('PATCH /api/admin/users/:id error', err);
    if ((err as { code?: string }).code === 'NotFoundError') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}