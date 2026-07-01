import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { Id } from '@/convex/_generated/dataModel';
import { getConvexClient } from '@/lib/convex/client';
import { requireRole } from '@/lib/rbac';
import { api } from '@/convex/_generated/api';

export async function GET(
  _req: NextRequest,
  { params }: { params: { userId: string; docId: string } },
) {
  try {
    await requireRole(['ADMIN']);
    const { userId, docId } = params;

    const convex = getConvexClient();
    const docRef = await convex.query(api.kyc.queries.getKycDocumentRef, {
      userId: userId as Id<'users'>,
      docId: docId as Id<'kycDocuments'>,
    });

    if (!docRef.found || !docRef.s3Key) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const result = await convex.action(api.storage.actions.presignGetAction, {
      bucket: 'ccverse-kyc',
      key: docRef.s3Key,
      ttlSeconds: 300,
    });

    return NextResponse.json({ url: result.url });
  } catch (err) {
    if (err instanceof NextResponse) throw err;
    console.error('GET /api/admin/kyc/:userId/documents/:docId/url error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
