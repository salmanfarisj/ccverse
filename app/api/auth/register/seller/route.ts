/**
 * POST /api/auth/register/seller
 *
 * Public seller entity registration via Convex
 * `auth.actions.registerSellerAction`. Creates a User (role=SELLER,
 * status=PENDING_VERIFICATION) and a SellerProfile (kycStatus=NOT_STARTED).
 *
 * TODO(phase-2): email verification — see register/buyer/route.ts.
 * The same Phase-1-without-email-send applies here.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { api } from '@/convex/_generated/api';
import { getConvexClient } from '@/lib/convex/client';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  legalName: z.string().min(1, 'Legal name is required'),
  country: z.string().min(2).max(2),
  registrationNo: z.string().min(1).optional(),
  authorizedSignatoryName: z.string().min(1).optional(),
  authorizedSignatoryEmail: z.string().email().optional(),
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
    const result = await convex.action(api.auth.actions.registerSellerAction, {
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
      actorRole: 'seller',
      action: 'auth.register',
      targetType: 'user',
      targetId: result.user.id,
      ip,
      payload: JSON.stringify({ email, role: 'seller' }),
    });

    return NextResponse.json(
      { message: 'Account created. Please check your email to verify your address.' },
      { status: 201 },
    );
  } catch (err) {
    console.error('seller register error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
