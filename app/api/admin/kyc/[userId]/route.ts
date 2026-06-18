/**
 * GET /api/admin/kyc/:userId — Full KYC detail for a seller.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/rbac';

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } },
) {
  try {
    await requireRole(['ADMIN']);
    const { userId } = params;

    const profile = await prisma.sellerProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            createdAt: true,
            lastLoginAt: true,
            kycDocuments: {
              orderBy: { uploadedAt: 'asc' },
            },
          },
        },
        bankAccount: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Seller profile not found' }, { status: 404 });
    }

    // Shape the response — move kycDocuments up one level for convenience
    const { kycDocuments, ...user } = profile.user;
    return NextResponse.json({
      profile: {
        ...profile,
        kycDocuments,
        user,
      },
    });
  } catch (err) {
    if (err instanceof NextResponse) throw err;
    console.error('GET /api/admin/kyc/:userId error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}