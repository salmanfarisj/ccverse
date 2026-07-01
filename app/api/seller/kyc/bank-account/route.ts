import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { Id } from '@/convex/_generated/dataModel';
import { getConvexClient } from '@/lib/convex/client';
import { requireRole } from '@/lib/rbac';
import { api } from '@/convex/_generated/api';

const bankAccountSchema = z.object({
  accountHolder: z.string().min(1, 'Account holder name is required'),
  bankName: z.string().min(1, 'Bank name is required'),
  accountNoLast4: z.string().length(4, 'Must be exactly 4 digits'),
  routingOrIfsc: z.string().min(1, 'Routing number or IFSC code is required'),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(['SELLER']);

    const body = await req.json();
    const parsed = bankAccountSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const convex = getConvexClient();
    const result = await convex.mutation(api.kyc.mutations.createBankAccount, {
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
      action: 'kyc.bank_account_added',
      targetType: 'bank_account',
      targetId: result.bankAccountId,
      ip: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
      payload: JSON.stringify({
        bankName: parsed.data.bankName,
        accountNoLast4: parsed.data.accountNoLast4,
      }),
    });

    return NextResponse.json(
      {
        id: result.bankAccountId,
        accountHolder: result.accountHolder,
        bankName: result.bankName,
        accountNoLast4: result.accountNoLast4,
        routingOrIfsc: result.routingOrIfsc,
        verified: result.verified,
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof NextResponse) throw err;
    console.error('POST /api/seller/kyc/bank-account error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
