import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { Id } from '@/convex/_generated/dataModel';
import { getConvexClient } from '@/lib/convex/client';
import { requireRole } from '@/lib/rbac';
import { api } from '@/convex/_generated/api';
import { getEnv } from '@/lib/env';

export async function POST(req: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const session = await requireRole(['ADMIN']);
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined;
    const convex = getConvexClient();

    const result = await convex.mutation(api.admin.kyc.approveKyc, {
      userId: params.userId as Id<'users'>,
      reviewerId: session.userId as Id<'users'>,
    });

    if (!result.success) {
      const status = result.error === 'Seller profile not found' ? 404 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    try {
      const env = getEnv();
      const loginUrl = `${env.APP_ORIGIN}/login`;
      await convex.action(api.email.actions.sendKycApprovedEmailAction, {
        userId: params.userId as Id<'users'>,
        legalName: result.legalName,
        loginUrl,
      });
    } catch (emailErr) {
      console.error('kyc approve: email send failed', emailErr);
    }

    await convex.mutation(api.audit.logMutation.writeAuditLogMutation, {
      actorId: session.userId,
      actorRole: 'admin',
      action: 'kyc.approved',
      targetType: 'seller_profile',
      targetId: result.profileId,
      ip,
      payload: JSON.stringify({ userId: params.userId, legalName: result.legalName }),
    });

    return NextResponse.json({ message: 'KYC approved', kycStatus: result.kycStatus });
  } catch (err) {
    if (err instanceof NextResponse) throw err;
    console.error('POST /api/admin/kyc/:userId/approve error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
