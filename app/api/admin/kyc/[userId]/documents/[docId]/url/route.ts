import { getConvexClient } from '@/lib/convex/client';
import { requireRole } from '@/lib/rbac';
import { api } from '@/convex/_generated/api';

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

    const convex = getConvexClient();
    const result = await convex.action(api.storage.actions.presignGetAction, {
      bucket: 'ccverse-kyc',
      key: doc.s3Key,
      ttlSeconds: 300,
    });

    return NextResponse.json({ url: result.url });
  }
}