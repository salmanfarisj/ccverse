/**
 * GET /api/admin/kyc — Pending KYC applications queue.
 *
 * Returns users whose seller profile has kycStatus = PENDING.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/rbac';

export async function GET(_req: NextRequest) {
  try {
    await requireRole(['ADMIN']);

    const profiles = await prisma.sellerProfile.findMany({
      where: { kycStatus: 'PENDING' },
      include: {
        user: { select: { email: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Fetch document counts per user
    const userIds = profiles.map((p) => p.userId);
    const docCounts = await prisma.kycDocument.groupBy({
      by: ['subjectUserId'],
      where: { subjectUserId: { in: userIds } },
      _count: { id: true },
    });
    const countMap = Object.fromEntries(docCounts.map((d) => [d.subjectUserId, d._count.id]));

    return NextResponse.json({
      applications: profiles.map((p) => ({
        userId: p.userId,
        sellerName: p.legalName,
        email: p.user.email,
        country: p.country,
        submittedAt: p.kycReviewedAt ?? p.createdAt,
        documentCount: countMap[p.userId] ?? 0,
      })),
    });
  } catch (err) {
    if (err instanceof NextResponse) throw err;
    console.error('GET /api/admin/kyc error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}