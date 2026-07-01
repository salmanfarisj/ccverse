import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { Id } from '@/convex/_generated/dataModel';
import { getConvexClient } from '@/lib/convex/client';
import { requireRole } from '@/lib/rbac';
import { api } from '@/convex/_generated/api';
import { getEnv } from '@/lib/env';

const rejectSchema = z.object({
  reason: z.string().min(10, 'Rejection reason must be at least 10 characters'),
});

export async function POST(req: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const session = await requireRole(['ADMIN']);

    const body = await req.json();
    const parsed = rejectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const { reason } = parsed.data;
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined;
    const convex = getConvexClient();

    const result = await convex.mutation(api.admin.kyc.rejectKyc, {
      userId: params.userId as Id<'users'>,
      reviewerId: session.userId as Id<'users'>,
      notes: reason,
    });

    if (!result.success) {
      const status = result.error === 'Seller profile not found' ? 404 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    try {
      const env = getEnv();
      const supportUrl = `${env.APP_ORIGIN}/support`;
      await convex.action(api.email.actions.sendKycRejectedEmailAction, {
        userId: params.userId as Id<'users'>,
        legalName: result.legalName,
        reason,
        supportUrl,
      });
    } catch (emailErr) {
      console.error('kyc reject: email send failed', emailErr);
    }

    await convex.mutation(api.audit.logMutation.writeAuditLogMutation, {
      actorId: session.userId,
      actorRole: 'admin',
      action: 'kyc.rejected',
      targetType: 'seller_profile',
      targetId: result.profileId,
      ip,
      payload: JSON.stringify({ userId: params.userId, legalName: result.legalName, reason }),
    });

    return NextResponse.json({ message: 'KYC rejected', kycStatus: result.kycStatus });
  } catch (err) {
    if (err instanceof NextResponse) throw err;
    console.error('POST /api/admin/kyc/:userId/reject error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
