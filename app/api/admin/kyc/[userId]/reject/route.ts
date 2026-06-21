import type { Id } from 'convex/values';
import { getConvexClient } from '@/lib/convex/client';
import { requireRole } from '@/lib/rbac';
import { api } from '@/convex/_generated/api';
import { getEnv } from '@/lib/env';

const rejectSchema = z.object({
  reason: z.string().min(10, 'Rejection reason must be at least 10 characters'),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { userId: string } },
) {
  try {
    const session = await requireRole(['ADMIN']);
    const { userId } = params;

    const body = await req.json();
    const parsed = rejectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const { reason } = parsed.data;
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
          kycStatus: 'REJECTED',
          kycReviewedBy: session.userId,
          kycReviewedAt: new Date(),
          kycReviewNotes: reason,
        },
      });

      await tx.kycDocument.updateMany({
        where: { subjectUserId: userId, reviewStatus: 'PENDING' },
        data: { reviewStatus: 'REJECTED', reviewedBy: session.userId, reviewedAt: new Date(), reviewNotes: reason },
      });
    });

    const convex = getConvexClient();

    // Send rejection email via Convex
    try {
      const env = getEnv();
      const supportUrl = `${env.APP_ORIGIN}/support`;
      await convex.action(api.email.actions.sendKycRejectedEmailAction, {
        userId: userId as Id<"users">,
        legalName: profile.legalName ?? profile.user.email,
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
      targetId: profile.id,
      ip,
      payload: JSON.stringify({ userId, legalName: profile.legalName, reason }),
    });

    return NextResponse.json({ message: 'KYC rejected', kycStatus: 'REJECTED' });
  } catch (err) {
    if (err instanceof NextResponse) throw err;
    console.error('POST /api/admin/kyc/:userId/reject error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}