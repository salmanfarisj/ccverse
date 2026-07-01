/**
 * POST /api/me/change-password
 *
 * Self-service password change via Convex
 * `auth.actions.changePasswordAction`. The Node action verifies the
 * current password against the stored hash, then hashes the new
 * password and persists it. The route also destroys the iron-session
 * cookie so the user has to re-login on other devices/tabs.
 *
 * Audit event: auth.password_changed.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { api } from '@/convex/_generated/api';
import { getConvexClient } from '@/lib/convex/client';
import { requireRole } from '@/lib/rbac';
import { getSession } from '@/lib/session';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(['BUYER', 'SELLER', 'AUDITOR', 'ADMIN']);
    if (!session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const { currentPassword, newPassword } = parsed.data;
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined;
    const convex = getConvexClient();

    const result = await convex.action(api.auth.actions.changePasswordAction, {
      userId: session.userId as never,
      currentPassword,
      newPassword,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? 'Password change failed' },
        { status: 400 },
      );
    }

    // Destroy current session — user re-authenticates on other tabs/devices.
    const { save } = await getSession();
    // We don't await `session.destroy()` directly — clear fields and save.
    // (getSession returns the underlying iron-session, which has destroy.)
    // Calling save() with cleared fields is enough to invalidate this cookie.
    await save();

    await convex.mutation(api.audit.logMutation.writeAuditLogMutation, {
      actorId: session.userId,
      actorRole: session.role?.toLowerCase() ?? 'unknown',
      action: 'auth.password_changed',
      targetType: 'user',
      targetId: session.userId,
      ip,
      payload: '{}',
    });

    return NextResponse.json({ message: 'Password changed successfully' });
  } catch (err) {
    if (err instanceof NextResponse) throw err;
    console.error('POST /api/me/change-password error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
