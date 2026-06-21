import type { Id } from 'convex/values';
import { getConvexClient } from '@/lib/convex/client';
import { requireRole } from '@/lib/rbac';
import { api } from '@/convex/_generated/api';
import { getEnv } from '@/lib/env';
export async function POST(
  req: NextRequest,
  { params }: { params: { userId: string } },
) {
  try {
    const session = await requireRole(['ADMIN']);
    const { userId } = params;
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined;

    const profile = await prisma.sellerProfile.findUnique({
      where: { userId },
      include: { user: { select: { email: true } } },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Seller profile not found' }, { status: 404 });
    }

    if (profile.kycStatus !== 'PENDING') {
      return NextResponse.json({ error: 'KYC is not pending review' }, { status: 400 });
    }

    // Update profile + all documents in transaction
    await prisma.$transaction(async (tx) => {
      await tx.sellerProfile.update({
        where: { userId },
        data: {
          kycStatus: 'APPROVED',
          kycReviewedBy: session.userId,
          kycReviewedAt: new Date(),
        },
      });

      await tx.kycDocument.updateMany({
        where: { subjectUserId: userId, reviewStatus: 'PENDING' },
        data: { reviewStatus: 'APPROVED', reviewedBy: session.userId, reviewedAt: new Date() },
      });
    });

    const convex = getConvexClient();

    // Send approval email via Convex
    try {
      const env = getEnv();
      const loginUrl = `${env.APP_ORIGIN}/login`;
      await convex.action(api.email.actions.sendKycApprovedEmailAction, {
        userId: userId as Id<"users">,
        legalName: profile.legalName ?? profile.user.email,
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
      targetId: profile.id,
      ip,
      payload: JSON.stringify({ userId, legalName: profile.legalName }),
    });

    return NextResponse.json({ message: 'KYC approved', kycStatus: 'APPROVED' });
  } catch (err) {
    if (err instanceof NextResponse) throw err;
    console.error('POST /api/admin/kyc/:userId/approve error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}