/**
 * POST /api/admin/kyc/:userId/approve
 *
 * Approve a seller's KYC application.
 * Sets kycStatus=APPROVED, all KycDocument reviewStatus=APPROVED,
 * sets kycReviewedBy/At, sends kyc-approved email.
 *
 * Audit events: kyc.approved
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/rbac';
import { writeAuditEvent } from '@/lib/audit';
import { SesDriver } from '@/lib/email/ses';
import { renderKycApprovedHtml, renderKycApprovedText } from '@/lib/email/templates/kyc-approved';
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

    // Send approval email
    try {
      const env = getEnv();
      const loginUrl = `${env.APP_ORIGIN}/login`;
      const ses = new SesDriver();
      await ses.send({
        to: profile.user.email,
        subject: 'Your KYC has been approved — CC Verse',
        html: renderKycApprovedHtml({
          email: profile.user.email,
          legalName: profile.legalName ?? profile.user.email,
          loginUrl,
        }),
        text: renderKycApprovedText({
          email: profile.user.email,
          legalName: profile.legalName ?? profile.user.email,
          loginUrl,
        }),
        tags: ['kyc', 'kyc-approved'],
      });
    } catch (emailErr) {
      console.error('kyc approve: email send failed', emailErr);
    }

    await writeAuditEvent({
      actorId: session.userId,
      actorRole: 'admin',
      action: 'kyc.approved',
      targetType: 'seller_profile',
      targetId: profile.id,
      ip,
      payload: { userId, legalName: profile.legalName },
    });

    return NextResponse.json({ message: 'KYC approved', kycStatus: 'APPROVED' });
  } catch (err) {
    if (err instanceof NextResponse) throw err;
    console.error('POST /api/admin/kyc/:userId/approve error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}