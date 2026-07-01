import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { Id } from '@/convex/_generated/dataModel';
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
    const convex = getConvexClient();

    const state = await convex.query(api.kyc.queries.getSellerKycState, {
      userId: session.userId as Id<'users'>,
    });

    if (!state.found) {
      return NextResponse.json({ error: 'Seller profile not found' }, { status: 404 });
    }

    return NextResponse.json({
      step: state.step,
      kycStatus: state.kycStatus,
      entity: state.entity,
      documents: state.documents,
      bankAccount: state.bankAccount,
    });
  } catch (err) {
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

    const convex = getConvexClient();
    const result = await convex.mutation(api.kyc.mutations.updateSellerEntity, {
      userId: session.userId as Id<'users'>,
      ...parsed.data,
    });

    if (!result.success) {
      const status = result.error === 'Seller profile not found' ? 404 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    await convex.mutation(api.audit.logMutation.writeAuditLogMutation, {
      actorId: session.userId,
      actorRole: 'seller',
      action: 'kyc.entity_updated',
      targetType: 'seller_profile',
      targetId: result.profileId,
      payload: JSON.stringify(parsed.data),
    });

    return NextResponse.json({ message: 'Entity details updated', kycStatus: result.kycStatus });
  } catch (err) {
    if (err instanceof NextResponse) throw err;
    console.error('PATCH /api/seller/kyc error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
