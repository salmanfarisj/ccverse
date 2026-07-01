/**
 * GET /api/auth/verify-email/[token]
 *
 * Validates an EmailVerificationToken via Convex
 * `auth.emailMutations.consumeEmailVerificationTokenMutation`,
 * which atomically consumes the token and activates the user
 * (`emailVerified=true`, `status=ACTIVE`).
 *
 * Audit event: auth.email_verified on success.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { api } from '@/convex/_generated/api';
import { getConvexClient } from '@/lib/convex/client';

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const { token } = params;

  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 });
  }

  const convex = getConvexClient();
  const result = await convex.mutation(
    api.auth.emailMutations.consumeEmailVerificationTokenMutation,
    { token },
  );

  if (!result.success) {
    return NextResponse.json(
      { error: result.error ?? 'Invalid or expired token' },
      { status: 400 },
    );
  }

  await convex.mutation(api.audit.logMutation.writeAuditLogMutation, {
    actorId: result.userId ?? undefined,
    action: 'auth.email_verified',
    targetType: 'user',
    targetId: result.userId ?? undefined,
    payload: '{}',
  });

  return NextResponse.json({ message: 'Email verified. Your account is now active.' });
}
