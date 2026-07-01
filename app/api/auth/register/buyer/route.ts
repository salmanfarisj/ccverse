/**
 * POST /api/auth/register/buyer
 *
 * Public buyer self-registration via Convex `auth.actions.registerBuyerAction`.
 * Creates a User (role=BUYER, status=PENDING_VERIFICATION) and a
 * matching BuyerProfile in Convex.
 *
 * TODO(phase-2): email verification — after registerBuyerAction returns
 * success, this route should call a Convex action that creates an
 * EmailVerificationToken and (in Phase 2) sends the verification email
 * via SES. For Phase 1 the user is created without an email challenge
 * so the happy-path login flow can be exercised end-to-end.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { api } from '@/convex/_generated/api';
import { getConvexClient } from '@/lib/convex/client';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  legalName: z.string().min(1).optional(),
  country: z.string().min(2).max(2).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const { email, password, legalName, country } = parsed.data;
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined;

    const convex = getConvexClient();
    const result = await convex.action(api.auth.actions.registerBuyerAction, {
      email,
      password,
      legalName,
      country,
    });

    if (!result.success || !result.user) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 },
      );
    }

    await convex.mutation(api.audit.logMutation.writeAuditLogMutation, {
      actorId: result.user.id,
      actorRole: 'buyer',
      action: 'auth.register',
      targetType: 'user',
      targetId: result.user.id,
      ip,
      payload: JSON.stringify({ email, role: 'buyer' }),
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
