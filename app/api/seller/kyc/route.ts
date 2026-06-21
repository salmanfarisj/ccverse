import { getConvexClient } from '@/lib/convex/client';
import { requireRole } from '@/lib/rbac';
import { api } from '@/convex/_generated/api';

const updateEntitySchema = z.object({
  legalName: z.string().min(1).optional(),
  registrationNo: z.string().min(1).optional(),
  country: z.string().min(1).optional(),
  authorizedSignatoryName: z.string().min(1).optional(),
  authorizedSignatoryEmail: z.string().email().optional(),
});

export async function GET(_req: NextRequest) {
  try {
    const session = await requireRole(['SELLER']);

    const profile = await prisma.sellerProfile.findUnique({
      where: { userId: session.userId },
      include: {
        bankAccount: true,
        user: {
          select: { email: true },
        },
      },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Seller profile not found' }, { status: 404 });
    }

    const documents = await prisma.kycDocument.findMany({
      where: { subjectUserId: session.userId },
      orderBy: { uploadedAt: 'asc' },
    });

    // Determine current wizard step
    const hasEntity =
      profile.legalName &&
      profile.registrationNo &&
      profile.country &&
      profile.authorizedSignatoryName &&
      profile.authorizedSignatoryEmail;

    const hasDocuments = documents.length > 0;
    const hasBankAccount = !!profile.bankAccount;

    let step = 1;
    if (hasEntity) step = 2;
    if (hasEntity && hasDocuments) step = 3;
    if (hasEntity && hasDocuments && hasBankAccount) step = 4;

    return NextResponse.json({
      step,
      kycStatus: profile.kycStatus,
      entity: {
        legalName: profile.legalName,
        registrationNo: profile.registrationNo,
        country: profile.country,
        authorizedSignatoryName: profile.authorizedSignatoryName,
        authorizedSignatoryEmail: profile.authorizedSignatoryEmail,
      },
      documents: documents.map((doc) => ({
        id: doc.id,
        documentType: doc.documentType,
        s3Key: doc.s3Key,
        sha256: doc.sha256,
        uploadedAt: doc.uploadedAt,
        reviewStatus: doc.reviewStatus,
      })),
      bankAccount: profile.bankAccount
        ? {
            id: profile.bankAccount.id,
            accountHolder: profile.bankAccount.accountHolder,
            bankName: profile.bankAccount.bankName,
            accountNoLast4: profile.bankAccount.accountNoLast4,
            routingOrIfsc: profile.bankAccount.routingOrIfsc,
            verified: profile.bankAccount.verified,
          }
        : null,
    });
  } catch (err) {
    // requireRole throws NextResponse on auth failure — bubble those up
    if (err instanceof NextResponse) throw err;
    console.error('GET /api/seller/kyc error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireRole(['SELLER']);

    const body = await req.json();
    const parsed = updateEntitySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const { legalName, registrationNo, country, authorizedSignatoryName, authorizedSignatoryEmail } = parsed.data;

    const profile = await prisma.sellerProfile.findUnique({
      where: { userId: session.userId },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Seller profile not found' }, { status: 404 });
    }

    // Cannot update entity details once KYC is pending/approved/rejected
    if (['PENDING', 'APPROVED', 'REJECTED'].includes(profile.kycStatus)) {
      return NextResponse.json(
        { error: 'Cannot update entity details while KYC is under review or approved' },
        { status: 400 },
      );
    }

    const updated = await prisma.sellerProfile.update({
      where: { userId: session.userId },
      data: {
        ...(legalName !== undefined && { legalName }),
        ...(registrationNo !== undefined && { registrationNo }),
        ...(country !== undefined && { country }),
        ...(authorizedSignatoryName !== undefined && { authorizedSignatoryName }),
        ...(authorizedSignatoryEmail !== undefined && { authorizedSignatoryEmail }),
      },
    });

    const convex = getConvexClient();
    await convex.mutation(api.audit.logMutation.writeAuditLogMutation, {
      actorId: session.userId,
      actorRole: 'seller',
      action: 'kyc.entity_updated',
      targetType: 'seller_profile',
      targetId: updated.id,
      payload: JSON.stringify({ legalName, registrationNo, country }),
    });

    return NextResponse.json({ message: 'Entity details updated', kycStatus: updated.kycStatus });
  } catch (err) {
    if (err instanceof NextResponse) throw err;
    console.error('PATCH /api/seller/kyc error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
