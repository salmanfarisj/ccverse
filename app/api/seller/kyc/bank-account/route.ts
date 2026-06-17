/**
 * POST /api/seller/kyc/bank-account
 *
 * Creates a BankAccount row for the authenticated seller.
 * Only one bank account per seller is allowed.
 *
 * Audit event: kyc.bank_account_added
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/rbac';
import { writeAuditEvent } from '@/lib/audit';

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

    const { accountHolder, bankName, accountNoLast4, routingOrIfsc } = parsed.data;

    // Verify seller profile exists and KYC is not locked
    const profile = await prisma.sellerProfile.findUnique({
      where: { userId: session.userId },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Seller profile not found' }, { status: 404 });
    }

    if (['PENDING', 'APPROVED'].includes(profile.kycStatus)) {
      return NextResponse.json(
        { error: 'Cannot update bank account while KYC is under review or approved' },
        { status: 400 },
      );
    }

    // Check for existing bank account — delete it if re-adding
    if (profile.bankAccountId) {
      await prisma.bankAccount.delete({ where: { id: profile.bankAccountId } });
    }

    const bankAccount = await prisma.bankAccount.create({
      data: {
        userId: session.userId!,
        accountHolder,
        bankName,
        accountNoLast4,
        routingOrIfsc,
        verified: false,
      },
    });

    // Link to seller profile
    await prisma.sellerProfile.update({
      where: { userId: session.userId },
      data: { bankAccountId: bankAccount.id },
    });

    await writeAuditEvent({
      actorId: session.userId,
      actorRole: 'seller',
      action: 'kyc.bank_account_added',
      targetType: 'bank_account',
      targetId: bankAccount.id,
      ip: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
      payload: { bankName, accountNoLast4 },
    });

    return NextResponse.json(
      {
        id: bankAccount.id,
        accountHolder,
        bankName,
        accountNoLast4,
        routingOrIfsc,
        verified: false,
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof NextResponse) throw err;
    console.error('POST /api/seller/kyc/bank-account error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
