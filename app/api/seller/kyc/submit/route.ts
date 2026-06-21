import type { Id } from 'convex/values';
import { getConvexClient } from '@/lib/convex/client';
import { requireRole } from '@/lib/rbac';
import { api } from '@/convex/_generated/api';
export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(['SELLER']);

    const profile = await prisma.sellerProfile.findUnique({
      where: { userId: session.userId },
      include: {
        bankAccount: true,
        user: { select: { email: true } },
      },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Seller profile not found' }, { status: 404 });
    }

    if (profile.kycStatus === 'PENDING') {
      return NextResponse.json({ error: 'KYC is already under review' }, { status: 400 });
    }

    if (profile.kycStatus === 'APPROVED') {
      return NextResponse.json({ error: 'KYC is already approved' }, { status: 400 });
    }

    // Validate entity details
    if (!profile.legalName || !profile.registrationNo || !profile.country ||
        !profile.authorizedSignatoryName || !profile.authorizedSignatoryEmail) {
      return NextResponse.json({ error: 'Entity details are incomplete. Please fill in all fields.' }, { status: 400 });
    }

    // Validate at least one document
    const documentCount = await prisma.kycDocument.count({
      where: { subjectUserId: session.userId },
    });
    if (documentCount === 0) {
      return NextResponse.json({ error: 'At least one KYC document is required' }, { status: 400 });
    }

    // Validate bank account
    if (!profile.bankAccount) {
      return NextResponse.json({ error: 'Bank account is required' }, { status: 400 });
    }

    // Update KYC status to pending
    await prisma.sellerProfile.update({
      where: { userId: session.userId },
      data: { kycStatus: 'PENDING' },
    });
    const convex = getConvexClient();

    // Send kyc-submitted email via Convex
    try {
      await convex.action(api.email.actions.sendKycSubmittedEmailAction, {
        userId: session.userId as Id<"users">,
        legalName: profile.legalName ?? undefined,
      });
    } catch (emailErr) {
      console.error('kyc submit: email send failed', emailErr);
    }

    await convex.mutation(api.audit.logMutation.writeAuditLogMutation, {
      actorId: session.userId,
      actorRole: 'seller',
      action: 'kyc.submitted',
      targetType: 'seller_profile',
      targetId: profile.id,
      ip: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
      payload: JSON.stringify({ legalName: profile.legalName }),
    });

    return NextResponse.json({ message: 'KYC application submitted for review', kycStatus: 'PENDING' });
  } catch (err) {
    if (err instanceof NextResponse) throw err;
    console.error('POST /api/seller/kyc/submit error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
