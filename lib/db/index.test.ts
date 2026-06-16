import { describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/db';

describe('lib/db singleton', () => {
  it('exports a PrismaClient instance', () => {
    expect(prisma).toBeInstanceOf(PrismaClient);
  });

  it('exposes the generated models from the Phase 0 schema', () => {
    // Each model delegate must be present on the client. The list here
    // mirrors §4.3 of `docs/phases/phase-0-foundation.md`. If a model
    // is dropped or renamed in `prisma/schema.prisma`, this test
    // fails — that's the point: the singleton's surface must stay
    // aligned with the schema.
    const required = [
      'user',
      'sellerProfile',
      'buyerProfile',
      'project',
      'projectRegistration',
      'listing',
      'order',
      'payment',
      'certificate',
      'auditDecision',
      'dispute',
      'registryEntry',
      'cvcBatch',
      'auditLog',
      'payout',
      'platformConfig',
      'failedJob',
    ] as const;

    for (const key of required) {
      // `noUncheckedIndexedAccess` makes this `… | undefined`; the
      // `!` is safe because we just verified the keys are known.
      const delegate = (prisma as unknown as Record<string, unknown>)[key];
      expect(delegate, `expected prisma.${key} to be defined`).toBeDefined();
    }
  });
});
