/**
 * POST /api/admin/users/:id/ban — Set user status to BANNED.
 *
 * Audit events: user.banned
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/rbac';
import { writeAuditEvent } from '@/lib/audit';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await requireRole(['ADMIN']);
    const { id } = params;
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined;

    const user = await prisma.user.update({
      where: { id },
      data: { status: 'BANNED' },
      select: { id: true, email: true, status: true },
    });

    await writeAuditEvent({
      actorId: session.userId,
      actorRole: 'admin',
      action: 'user.banned',
      targetType: 'user',
      targetId: user.id,
      ip,
      payload: { email: user.email },
    });

    return NextResponse.json({ message: 'User banned', user });
  } catch (err) {
    if (err instanceof NextResponse) throw err;
    console.error('POST /api/admin/users/:id/ban error', err);
    if ((err as { code?: string }).code === 'NotFoundError') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}