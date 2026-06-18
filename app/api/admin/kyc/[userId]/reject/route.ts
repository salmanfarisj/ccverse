/**
 * POST /api/admin/kyc/:userId/reject
 *
 * Reject a seller's KYC application.
 * Sets kycStatus=REJECTED, all KycDocument reviewStatus=REJECTED,
 * requires reviewNotes, sends kyc-rejected email.
 *
 * Audit events: kyc.rejected
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/rbac';
import { writeAuditEvent } from '@/lib/audit';
import { SesDriver } from '@/lib/email/ses';
import { renderKycRejectedHtml, renderKycRejectedText } from '@/lib/email/templates/kyc-rejected';
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

    // Send rejection email
    try {
      const env = getEnv();
      const supportUrl = `${env.APP_ORIGIN}/support`;
      const ses = new SesDriver();
      await ses.send({
        to: profile.user.email,
        subject: 'Your KYC application was not approved — CC Verse',
        html: renderKycRejectedHtml({
          email: profile.user.email,
          legalName: profile.legalName ?? profile.user.email,
          reason,
          supportUrl,
        }),
        text: renderKycRejectedText({
          email: profile.user.email,
          legalName: profile.legalName ?? profile.user.email,
          reason,
          supportUrl,
        }),
        tags: ['kyc', 'kyc-rejected'],
      });
    } catch (emailErr) {
      console.error('kyc reject: email send failed', emailErr);
    }

    await writeAuditEvent({
      actorId: session.userId,
      actorRole: 'admin',
      action: 'kyc.rejected',
      targetType: 'seller_profile',
      targetId: profile.id,
      ip,
      payload: { userId, legalName: profile.legalName, reason },
    });

    return NextResponse.json({ message: 'KYC rejected', kycStatus: 'REJECTED' });
  } catch (err) {
    if (err instanceof NextResponse) throw err;
    console.error('POST /api/admin/kyc/:userId/reject error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}