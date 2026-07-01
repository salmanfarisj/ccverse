import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { Id } from '@/convex/_generated/dataModel';
import { getConvexClient } from '@/lib/convex/client';
import { requireRole } from '@/lib/rbac';
import { api } from '@/convex/_generated/api';

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(['SELLER']);
    const convex = getConvexClient();

    const result = await convex.mutation(api.kyc.mutations.submitKyc, {
      userId: session.userId as Id<'users'>,
    });

    if (!result.success) {
      const status = result.error === 'Seller profile not found' ? 404 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    try {
      await convex.action(api.email.actions.sendKycSubmittedEmailAction, {
        userId: session.userId as Id<'users'>,
        legalName: result.legalName ?? undefined,
      });
    } catch (emailErr) {
      console.error('kyc submit: email send failed', emailErr);
    }

    await convex.mutation(api.audit.logMutation.writeAuditLogMutation, {
      actorId: session.userId,
      actorRole: 'seller',
      action: 'kyc.submitted',
      targetType: 'seller_profile',
      targetId: result.profileId,
      ip: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
      payload: JSON.stringify({ legalName: result.legalName }),
    });

    return NextResponse.json({
      message: 'KYC application submitted for review',
      kycStatus: result.kycStatus,
    });
  } catch (err) {
    if (err instanceof NextResponse) throw err;
    console.error('POST /api/seller/kyc/submit error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
