import { createHash } from 'crypto';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { Id } from '@/convex/_generated/dataModel';
import { getConvexClient } from '@/lib/convex/client';
import { requireRole } from '@/lib/rbac';
import { api } from '@/convex/_generated/api';

const uploadSchema = z.object({
  documentType: z.enum([
    'PAN',
    'GSTIN',
    'PASSPORT',
    'UTILITY_BILL',
    'BANK_STATEMENT',
    'INCORPORATION_CERT',
    'OTHER',
  ]),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(['SELLER']);

    let documentType: string;
    let fileBuffer: Buffer;

    const contentType = req.headers.get('content-type') ?? '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      documentType = formData.get('documentType') as string;
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    } else {
      const body = await req.json();
      const parsed = uploadSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.message }, { status: 400 });
      }
      documentType = parsed.data.documentType;
      const { fileBase64 } = body as { fileBase64: string };
      if (!fileBase64) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }
      fileBuffer = Buffer.from(fileBase64, 'base64');
    }

    const parsed = uploadSchema.safeParse({ documentType });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const sha256 = createHash('sha256').update(fileBuffer).digest('hex');
    const docId = crypto.randomUUID();
    const s3Key = `kyc/${session.userId}/${documentType}/${docId}`;

    const convex = getConvexClient();
    await convex.action(api.storage.actions.putObjectAction, {
      bucket: 'ccverse-kyc',
      key: s3Key,
      body: new Uint8Array(fileBuffer),
      contentType: 'application/octet-stream',
      metadata: { sha256, uploadedBy: session.userId! },
    });

    const result = await convex.mutation(api.kyc.mutations.createKycDocument, {
      userId: session.userId as Id<'users'>,
      uploadedById: session.userId as Id<'users'>,
      documentType: parsed.data.documentType,
      s3Key,
      sha256,
    });

    if (!result.success) {
      const status = result.error === 'Seller profile not found' ? 404 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    await convex.mutation(api.audit.logMutation.writeAuditLogMutation, {
      actorId: session.userId,
      actorRole: 'seller',
      action: 'kyc.document_uploaded',
      targetType: 'kyc_document',
      targetId: result.documentId,
      ip: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
      payload: JSON.stringify({ documentType, s3Key, sha256 }),
    });

    return NextResponse.json({ id: result.documentId, documentType, sha256 }, { status: 201 });
  } catch (err) {
    if (err instanceof NextResponse) throw err;
    console.error('POST /api/seller/kyc/documents error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
