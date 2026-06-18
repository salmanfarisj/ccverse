/**
 * GET /api/admin/kyc/:userId/documents/:docId/url
 *
 * Generate a 5-minute presigned GET URL for an S3 document.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/rbac';
import { getStorageDriver } from '@/lib/storage';

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string; docId: string } },
) {
  try {
    await requireRole(['ADMIN']);
    const { userId, docId } = params;

    const doc = await prisma.kycDocument.findUnique({
      where: { id: docId, subjectUserId: userId },
      select: { id: true, s3Key: true },
    });

    if (!doc || !doc.s3Key) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const storage = getStorageDriver();
    const url = await storage.presignGet('ccverse-kyc', doc.s3Key, 300);

    return NextResponse.json({ url });
  } catch (err) {
    if (err instanceof NextResponse) throw err;
    console.error('GET /api/admin/kyc/:userId/documents/:docId/url error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}