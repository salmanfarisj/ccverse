/**
 * Prisma seed — bootstraps the database with the minimum data
 * Phase 0 promises:
 *
 *   1. A single admin `User` row, role=ADMIN, status=ACTIVE. Email
 *      and password come from `SEED_ADMIN_EMAIL` /
 *      `SEED_ADMIN_PASSWORD` in the environment. If either is
 *      missing, the seed inserts a row with a sentinel
 *      `passwordHash` and prints a clear warning — login (Phase 1)
 *      will refuse the row until a real password is set.
 *   2. A fixed set of `PlatformConfig` default keys used across the
 *      app (commission, currency, payout settlement days, etc.).
 *
 * Phase 1 (T1-1) adds three test accounts for manual testing:
 *   - admin@ccverse.local (role=ADMIN, emailVerified=true)
 *   - buyer@ccverse.local (role=BUYER, emailVerified=true, BuyerProfile)
 *   - seller@ccverse.local (role=SELLER, emailVerified=true, SellerProfile
 *     with kycStatus=APPROVED, BankAccount)
 *
 * The seed is idempotent: re-running it is safe and updates the
 * admin's password hash in place (so a re-seed after rotating
 * `SEED_ADMIN_PASSWORD` works as expected).
 *
 * Run via:
 *   npm run db:seed          # uses prisma's seed config
 *   npx prisma db seed       # same
 *
 * Connection details come from `process.env.DATABASE_URL`, which
 * Prisma loads from `.env` automatically.
 */
import {
  PrismaClient,
  UserRole,
  UserStatus,
  KycStatus,
  BuyerKycStatus,
  DefaultCurrency,
} from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

/**
 * OWASP-recommended argon2id parameters (cheat sheet, 2024):
 * memoryCost = 64 MiB, timeCost = 3, parallelism = 4. These are the
 * same values that `lib/auth/password.ts` (T0-7-2) will use, so the
 * seed hash verifies under the same helper in Phase 1.
 */
const ARGON2_OPTS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MiB
  timeCost: 3,
  parallelism: 4,
};

/** Sentinel value for the password hash when no password is provided. */
const PASSWORD_SENTINEL = '!seed:unset';

/** PlatformConfig defaults seeded on first run. */
const CONFIG_DEFAULTS: ReadonlyArray<readonly [string, string]> = [
  // Commission: basis points. 250 = 2.50%. Final value set in Phase 6
  // (depends on FRD-§8 platform fee per market).
  ['commission_bps', '250'],
  // Minimum age (days) of a CVC before it can be retired. 0 for MVP.
  ['retire_min_age_days', '0'],
  // Default display currency.
  ['currency_default', 'USD'],
  // Comma-separated ISO-4217 list of accepted currencies.
  ['supported_currencies', 'USD,INR'],
  // Payout settlement window (T+2 per FRD §6.4).
  ['payout_settlement_days', '2'],
  // KMS key alias for PDF signing (Phase 7). Empty until provisioned.
  ['pdf_signing_key_id', ''],
  // Audit log retention (NFR 4.6): 7 years = 2555 days (incl. leap).
  ['audit_log_retention_days', '2555'],
  // Lock a registry entry once it transitions to RETIRED. Hard rule
  // per `docs/plan.md` §7.
  ['registry_lock_after_retire', 'true'],
  // Listing guardrails (Phase 3).
  ['min_listing_quantity', '1'],
  ['max_listing_quantity', '1000000'],
];

async function seedAdmin(): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    // eslint-disable-next-line no-console
    console.warn(
      '\n⚠  SEED_ADMIN_EMAIL or SEED_ADMIN_PASSWORD is unset.\n' +
        '   Inserting a User row with a sentinel password hash.\n' +
        '   Login (Phase 1) will refuse this row until a real password\n' +
        '   is set via `SEED_ADMIN_PASSWORD` and the seed is re-run.\n',
    );
    const sentinel = 'admin@ccverse.local';
    await prisma.user.upsert({
      where: { email: sentinel },
      create: {
        email: sentinel,
        passwordHash: PASSWORD_SENTINEL,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      },
      update: {},
    });
    return;
  }

  if (password.length < 12) {
    // eslint-disable-next-line no-console
    console.warn(
      `⚠  SEED_ADMIN_PASSWORD is ${password.length} chars; the Phase 1\n` +
        '   password policy requires ≥ 12. Proceeding anyway — Phase 1\n' +
        '   will reject logins until the password is rotated to a\n' +
        '   policy-compliant value.',
    );
  }

  const passwordHash = await argon2.hash(password, ARGON2_OPTS);
  const admin = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
    update: {
      // Re-hash on re-seed so rotating SEED_ADMIN_PASSWORD actually
      // takes effect. Role/status are preserved.
      passwordHash,
    },
  });

  // eslint-disable-next-line no-console
  console.log(`✓ Seeded admin user: ${admin.email} (id=${admin.id})`);
}

async function seedConfig(): Promise<void> {
  for (const [key, value] of CONFIG_DEFAULTS) {
    await prisma.platformConfig.upsert({
      where: { key },
      create: { key, value },
      // Don't overwrite a value the operator has manually changed.
      // Use `prisma.platformConfig.update` directly to force-update.
      update: {},
    });
  }
  // eslint-disable-next-line no-console
  console.log(`✓ Seeded ${CONFIG_DEFAULTS.length} PlatformConfig keys`);
}

async function seedTestAccounts(): Promise<void> {
  const TEST_PASSWORD = 'Test@12345678';

  // Test admin — same as Phase 0 admin but with emailVerified=true
  const adminEmail = 'admin@ccverse.local';
  const adminHash = await argon2.hash(TEST_PASSWORD, ARGON2_OPTS);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      passwordHash: adminHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    },
    update: { passwordHash: adminHash, emailVerified: true },
  });
  // eslint-disable-next-line no-console
  console.log(`✓ Seeded admin: ${admin.email}`);

  // Test buyer
  const buyerEmail = 'buyer@ccverse.local';
  const buyerHash = await argon2.hash(TEST_PASSWORD, ARGON2_OPTS);
  const buyer = await prisma.user.upsert({
    where: { email: buyerEmail },
    create: {
      email: buyerEmail,
      passwordHash: buyerHash,
      role: UserRole.BUYER,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    },
    update: { passwordHash: buyerHash, emailVerified: true },
  });
  await prisma.buyerProfile.upsert({
    where: { userId: buyer.id },
    create: {
      userId: buyer.id,
      kycStatus: BuyerKycStatus.NOT_REQUIRED,
      defaultCurrency: DefaultCurrency.USD,
    },
    update: {},
  });
  // eslint-disable-next-line no-console
  console.log(`✓ Seeded buyer: ${buyer.email}`);

  // Test seller (kycStatus=APPROVED for easy manual testing)
  const sellerEmail = 'seller@ccverse.local';
  const sellerHash = await argon2.hash(TEST_PASSWORD, ARGON2_OPTS);
  const seller = await prisma.user.upsert({
    where: { email: sellerEmail },
    create: {
      email: sellerEmail,
      passwordHash: sellerHash,
      role: UserRole.SELLER,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    },
    update: { passwordHash: sellerHash, emailVerified: true },
  });

  // Create bank account first
  const bankAccount = await prisma.bankAccount.upsert({
    where: { id: seller.id }, // upsert by id placeholder
    create: {
      id: seller.id, // reuse seller.id as bankAccount id for 1:1
      userId: seller.id,
      accountHolder: 'Test Seller Inc.',
      bankName: 'Test Bank',
      accountNoLast4: '1234',
      routingOrIfsc: 'TEST0001',
      verified: true,
    },
    update: {},
  }).catch(() => // handle case where id conflict — create with random id
    prisma.bankAccount.create({
      data: {
        userId: seller.id,
        accountHolder: 'Test Seller Inc.',
        bankName: 'Test Bank',
        accountNoLast4: '1234',
        routingOrIfsc: 'TEST0001',
        verified: true,
      },
    })
  );

  await prisma.sellerProfile.upsert({
    where: { userId: seller.id },
    create: {
      userId: seller.id,
      legalName: 'Test Seller Inc.',
      registrationNo: 'TEST-REG-001',
      country: 'IN',
      authorizedSignatoryName: 'Test Signatory',
      authorizedSignatoryEmail: sellerEmail,
      kycStatus: KycStatus.APPROVED,
      bankAccountId: bankAccount.id,
    },
    update: { kycStatus: KycStatus.APPROVED },
  });
  // eslint-disable-next-line no-console
  console.log(`✓ Seeded seller: ${seller.email} (kycStatus=APPROVED)`);
}

async function main(): Promise<void> {
  await seedAdmin();
  await seedConfig();
  await seedTestAccounts();
}

main()
  .catch((err: unknown) => {
    // eslint-disable-next-line no-console
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
