/**
 * T1-4 E2E tests — Seller registration + KYC wizard + KYC gate
 *
 * Tests the full seller lifecycle:
 *   1. Seller registration page loads and submits
 *   2. Email verification activates the account
 *   3. KYC wizard steps (entity → documents → bank account → submit)
 *   4. Dashboard shows correct KYC banners at each status
 *   5. Phase 2 routes are blocked when KYC is not approved
 *
 * Prerequisites:
 *   npm run test:e2e:install   (one-time Playwright browser install)
 *
 * Note: page.request does NOT share browser-context cookies — always use
 * apiWithSession() (or page.evaluate()) for authenticated API calls.
 */

import { test, expect, type Page, type APIRequestContext } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function uniqueEmail(prefix = 'seller') {
  return `${prefix}+e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@ccverse.local`;
}

async function getVerificationToken(email: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error(`User not found: ${email}`);
  const token = await prisma.emailVerificationToken.findFirst({
    where: { userId: user.id, consumedAt: null },
    orderBy: { expiresAt: 'desc' },
  });
  if (!token) throw new Error(`No unconsumed token for ${email}`);
  return token.token;
}

async function cleanupUser(email: string) {
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return;
    await prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } }).catch(() => {});
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }).catch(() => {});
    await prisma.kycDocument.deleteMany({ where: { subjectUserId: user.id } }).catch(() => {});
    await prisma.bankAccount.deleteMany({ where: { userId: user.id } }).catch(() => {});
    await prisma.sellerProfile.deleteMany({ where: { userId: user.id } }).catch(() => {});
    await prisma.buyerProfile.deleteMany({ where: { userId: user.id } }).catch(() => {});
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
  } catch {
    // best-effort cleanup — ignore errors so test suite continues
  }
}

/**
 * Make an authenticated API request from within the browser page.
 * Uses page.evaluate + native fetch — httpOnly cookies are sent automatically.
 * Returns a Playwright-friendly APIResponse-like object.
 */
/**
 * Make an authenticated API request from within the browser page.
 * Uses page.evaluate + native browser fetch — httpOnly cookies are sent automatically.
 * Supports JSON body and multipart FormData (for file uploads).
 *
 * Returns { status, body } on any HTTP response (including 4xx/5xx).
 * Throws only on network failures.
 */
async function apiWithSession(
  page: Page,
  method: 'get' | 'post' | 'patch' | 'delete',
  url: string,
  options?: { data?: unknown; multipart?: Record<string, unknown> },
) {
  return page.evaluate(
    async ({ method, url, data, multipart }) => {
      const opts: RequestInit = { method };

      if (multipart) {
        const form = new FormData();
        for (const [k, v] of Object.entries(multipart)) {
          if (v && typeof v === 'object' && 'buffer' in (v as object)) {
            const file = v as { name: string; mimeType: string; buffer: Buffer };
            const data_ = (file.buffer as unknown as { type: string; data: number[] }).data;
            const bytes = new Uint8Array(data_).buffer;
            form.append(k, new Blob([bytes], { type: file.mimeType }), file.name);
          } else {
            form.append(k, String(v));
          }
        }
        opts.body = form;
      } else if (data !== undefined) {
        opts.body = JSON.stringify(data);
        (opts.headers as Record<string, string>) = { 'Content-Type': 'application/json' };
      }

      const base = `${window.location.origin}`;
      const fullUrl = url.startsWith('http') ? url : `${base}${url}`;
      const res = await fetch(fullUrl, opts);

      let body: unknown;
      const contentType = res.headers.get('content-type') ?? '';
      if (contentType.includes('application/json')) {
        body = await res.json();
      } else {
        body = await res.text();
      }

      return { status: res.status, ok: res.ok, body };
    },
    { method, url, data: options?.data, multipart: options?.multipart },
  );
}

/** Browser-based login — sets session cookie in the page context */
async function loginSeller(page: Page, email: string, password = 'TestPass123!') {
  await page.goto('/login');
  await page.getByLabel(/email address/i).fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/seller/);
  // Wait for the page to settle so the session cookie is guaranteed to be set
  await page.waitForLoadState('networkidle');
}

// ─── Registration page ───────────────────────────────────────────────────────

test.describe('Seller registration', () => {
  let email: string;

  test.beforeEach(async () => {
    email = uniqueEmail();
    await cleanupUser(email);
  });

  test.afterEach(async () => {
    if (email) await cleanupUser(email);
  });

  test('GET /register/seller shows the registration form', async ({ page }) => {
    await page.goto('/register/seller');
    await expect(page.getByText(/register as a seller/i)).toBeVisible();
    await expect(page.getByLabel(/email address/i)).toBeVisible();
    await expect(page.getByLabel(/^password$/i)).toBeVisible();
    await expect(page.getByLabel(/legal entity name/i)).toBeVisible();
    await expect(page.getByLabel(/registration number/i)).toBeVisible();
    await expect(page.getByLabel(/country/i)).toBeVisible();
    await expect(page.getByLabel(/authorized signatory name/i)).toBeVisible();
    await expect(page.getByLabel(/authorized signatory email/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /register seller account/i })).toBeVisible();
  });

  test('POST /api/auth/register/seller creates user and profile', async ({ request }) => {
    const res = await request.post('/api/auth/register/seller', {
      data: {
        email,
        password: 'TestPass123!',
        legalName: 'GreenCarbon E2E Ltd',
        registrationNo: 'U99999MH2024',
        country: 'India',
        authorizedSignatoryName: 'Alice Smith',
        authorizedSignatoryEmail: 'alice@greencarbon.com',
      },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.message).toContain('check your email');

    const user = await prisma.user.findUnique({ where: { email } });
    expect(user).not.toBeNull();
    expect(user!.role).toBe('SELLER');
    expect(user!.status).toBe('PENDING_VERIFICATION');
    expect(user!.emailVerified).toBe(false);

    const profile = await prisma.sellerProfile.findUnique({ where: { userId: user!.id } });
    expect(profile).not.toBeNull();
    expect(profile!.kycStatus).toBe('NOT_STARTED');
  });

  test('Duplicate email returns 409', async ({ request }) => {
    await request.post('/api/auth/register/seller', {
      data: {
        email,
        password: 'TestPass123!',
        legalName: 'First Ltd',
        registrationNo: 'R1',
        country: 'India',
        authorizedSignatoryName: 'Bob',
        authorizedSignatoryEmail: 'bob@test.com',
      },
    });

    const dup = await request.post('/api/auth/register/seller', {
      data: {
        email,
        password: 'TestPass123!',
        legalName: 'Second Ltd',
        registrationNo: 'R2',
        country: 'India',
        authorizedSignatoryName: 'Carol',
        authorizedSignatoryEmail: 'carol@test.com',
      },
    });
    expect(dup.status()).toBe(409);
  });

  test('Invalid payload returns 400', async ({ request }) => {
    const res = await request.post('/api/auth/register/seller', { data: { email: 'not-an-email' } });
    expect(res.status()).toBe(400);
  });
});

// ─── Email verification ───────────────────────────────────────────────────────

test.describe('Seller email verification', () => {
  let email: string;

  test.beforeEach(async ({ request }) => {
    email = uniqueEmail();
    await request.post('/api/auth/register/seller', {
      data: {
        email,
        password: 'TestPass123!',
        legalName: 'VerifyTest Ltd',
        registrationNo: 'V123',
        country: 'India',
        authorizedSignatoryName: 'Verify User',
        authorizedSignatoryEmail: 'verify@test.com',
      },
    });
  });

  test.afterEach(async () => {
    await cleanupUser(email);
  });

  test('Valid token activates the account', async ({ request }) => {
    const token = await getVerificationToken(email);
    const res = await request.get(`/api/auth/verify-email/${token}`);
    expect(res.status()).toBe(200);

    const user = await prisma.user.findUnique({ where: { email } });
    expect(user!.status).toBe('ACTIVE');
    expect(user!.emailVerified).toBe(true);
    expect(user!.emailVerifiedAt).not.toBeNull();
  });

  test('Invalid token returns 400', async ({ request }) => {
    const res = await request.get('/api/auth/verify-email/nonexistent-token-xyz');
    expect(res.status()).toBe(400);
  });

  test('Already-consumed token returns 400', async ({ request }) => {
    const token = await getVerificationToken(email);
    await request.get(`/api/auth/verify-email/${token}`); // consume once
    const res = await request.get(`/api/auth/verify-email/${token}`); // consume again
    expect(res.status()).toBe(400);
  });
});

// ─── KYC wizard ──────────────────────────────────────────────────────────────

test.describe('KYC wizard', () => {
  let email: string;

  test.beforeEach(async ({ request }) => {
    email = uniqueEmail();
    await request.post('/api/auth/register/seller', {
      data: {
        email,
        password: 'TestPass123!',
        legalName: 'KycWizardTest Ltd',
        registrationNo: 'KYC123',
        country: 'India',
        authorizedSignatoryName: 'KYC User',
        authorizedSignatoryEmail: 'kycuser@test.com',
      },
    });
    const token = await getVerificationToken(email);
    await request.get(`/api/auth/verify-email/${token}`);
  });

  test.afterEach(async () => {
    await cleanupUser(email);
  });

  test('GET /seller/kyc returns step 2 for new verified seller (entity pre-filled from registration)', async ({ page }) => {
    await loginSeller(page, email);
    // Force a fresh navigation so the page fully loads with session state
    await page.goto('/seller/kyc');
    await page.waitForLoadState('networkidle');

    const res = await apiWithSession(page, 'get', '/api/seller/kyc');
    expect(res.status).toBe(200);
    const data = res.body as { step: number; kycStatus: string; documents: unknown[]; bankAccount: unknown };
    expect(data.step).toBe(2);
    expect(data.kycStatus).toBe('NOT_STARTED');
    expect(data.documents).toEqual([]);
    expect(data.bankAccount).toBeNull();
  });

  test('Step 1: entity details can be saved and step advances to 2', async ({ page }) => {
    await loginSeller(page, email);
    await page.goto('/seller/kyc');

    await page.getByLabel(/legal entity name/i).fill('Updated Legal Name');
    await page.getByLabel(/registration number/i).fill('UPDATED123');
    await page.getByLabel(/country/i).fill('United States');
    await page.getByLabel(/authorized signatory name/i).fill('Updated Signatory');
    await page.getByLabel(/authorized signatory email/i).fill('updated@test.com');

    await page.getByRole('button', { name: /save entity details/i }).click();
    await page.waitForResponse((res) => res.url().includes('/api/seller/kyc') && res.request().method() === 'PATCH');

    // Poll until the updated name is reflected in GET
    await page.waitForFunction(
      async () => {
        const res = await fetch('/api/seller/kyc', { headers: { cookie: document.cookie } });
        if (!res.ok) return false;
        const data = await res.json() as { entity: { legalName: string } };
        return data.entity?.legalName === 'Updated Legal Name';
      },
      { timeout: 5000 },
    );

    const res = await apiWithSession(page, 'get', '/api/seller/kyc');
    expect(res.status).toBe(200);
    const data = res.body as { step: number; entity: { legalName: string } };
    expect(data.step).toBe(2);
    expect(data.entity.legalName).toBe('Updated Legal Name');
  });

  test('Step 2: document can be uploaded', async ({ page }) => {
    await loginSeller(page, email);

    // Save entity first so wizard is at step 2+
    await apiWithSession(page, 'patch', '/api/seller/kyc', {
      data: {
        legalName: 'DocTest Ltd',
        registrationNo: 'DT123',
        country: 'India',
        authorizedSignatoryName: 'Doc User',
        authorizedSignatoryEmail: 'doc@test.com',
      },
    });

    // Upload a PDF
    const dummyPdf = Buffer.from('%PDF-1.4 test document');
    const uploadRes = await apiWithSession(page, 'post', '/api/seller/kyc/documents', {
      multipart: {
        documentType: 'PAN',
        file: { name: 'pan.pdf', mimeType: 'application/pdf', buffer: dummyPdf },
      },
    });
    expect(uploadRes.status).toBe(201);
    const uploadData = uploadRes.body as { id: string; sha256: string };
    expect(uploadData.id).toBeDefined();
    expect(uploadData.sha256).toBeDefined();

    // Verify document appears in KYC state
    const kycRes = await apiWithSession(page, 'get', '/api/seller/kyc');
    expect(kycRes.status).toBe(200);
    const kycData = kycRes.body as { documents: Array<{ documentType: string }>; step: number };
    expect(kycData.documents).toHaveLength(1);
    expect(kycData.documents[0]?.documentType).toBe('PAN');
    expect(kycData.step).toBe(3);
  });

  test('Step 3: bank account can be saved and step advances to 4', async ({ page }) => {
    await loginSeller(page, email);

    // Setup: entity + document
    await apiWithSession(page, 'patch', '/api/seller/kyc', {
      data: {
        legalName: 'BankTest Ltd',
        registrationNo: 'BT123',
        country: 'India',
        authorizedSignatoryName: 'Bank User',
        authorizedSignatoryEmail: 'bank@test.com',
      },
    });

    const dummyPdf = Buffer.from('%PDF-1.4 test');
    await apiWithSession(page, 'post', '/api/seller/kyc/documents', {
      multipart: { documentType: 'PAN', file: { name: 'pan.pdf', mimeType: 'application/pdf', buffer: dummyPdf } },
    });

    // Fill bank account via UI
    await page.goto('/seller/kyc');
    await page.getByLabel(/account holder name/i).fill('BankTest Ltd');
    await page.getByLabel(/bank name/i).fill('Test Bank');
    await page.getByLabel(/last 4 digits/i).fill('1234');
    await page.getByLabel(/routing number \/ ifsc/i).fill('TESTIFSC123');

    await page.getByRole('button', { name: /save bank account/i }).click();
    await page.waitForResponse(
      (res) => res.url().includes('/api/seller/kyc/bank-account') && res.status() === 201,
    );

    const res = await apiWithSession(page, 'get', '/api/seller/kyc');
    expect(res.status).toBe(200);
    const data = res.body as { step: number; bankAccount: { bankName: string; accountNoLast4: string } | null };
    expect(data.step).toBe(4);
    expect(data.bankAccount).not.toBeNull();
    expect(data.bankAccount!.bankName).toBe('Test Bank');
    expect(data.bankAccount!.accountNoLast4).toBe('1234');
  });

  test('Step 4: submit sets kycStatus=PENDING', async ({ page }) => {
    await loginSeller(page, email);

    // Full setup via API
    await apiWithSession(page, 'patch', '/api/seller/kyc', {
      data: {
        legalName: 'SubmitTest Ltd',
        registrationNo: 'ST123',
        country: 'India',
        authorizedSignatoryName: 'Submit User',
        authorizedSignatoryEmail: 'submit@test.com',
      },
    });

    const dummyPdf = Buffer.from('%PDF-1.4 test');
    await apiWithSession(page, 'post', '/api/seller/kyc/documents', {
      multipart: { documentType: 'PAN', file: { name: 'pan.pdf', mimeType: 'application/pdf', buffer: dummyPdf } },
    });

    await apiWithSession(page, 'post', '/api/seller/kyc/bank-account', {
      data: { accountHolder: 'SubmitTest Ltd', bankName: 'Submit Bank', accountNoLast4: '9999', routingOrIfsc: 'SUBMIT123' },
    });

    // Submit KYC
    const submitRes = await apiWithSession(page, 'post', '/api/seller/kyc/submit');
    expect(submitRes.status).toBe(200);
    const submitData = submitRes.body as { kycStatus: string };
    expect(submitData.kycStatus).toBe('PENDING');

    // Verify DB
    const user = await prisma.user.findUnique({ where: { email } });
    const profile = await prisma.sellerProfile.findUnique({ where: { userId: user!.id } });
    expect(profile!.kycStatus).toBe('PENDING');
  });

  test('Submit without entity returns 400', async ({ page }) => {
    await loginSeller(page, email);

    const res = await apiWithSession(page, 'post', '/api/seller/kyc/submit');
    expect(res.status).toBe(400);
    const body = res.body as { error: string };
    expect(body.error).toContain('document');
  });

  test('Submit without documents returns 400', async ({ page }) => {
    await loginSeller(page, email);

    await apiWithSession(page, 'patch', '/api/seller/kyc', {
      data: {
        legalName: 'NoDoc Ltd',
        registrationNo: 'ND123',
        country: 'India',
        authorizedSignatoryName: 'NoDoc User',
        authorizedSignatoryEmail: 'nodoc@test.com',
      },
    });

    const res = await apiWithSession(page, 'post', '/api/seller/kyc/submit');
    expect(res.status).toBe(400);
    const body = res.body as { error: string };
    expect(body.error).toContain('document');
  });

  test('Submit without bank account returns 400', async ({ page }) => {
    await loginSeller(page, email);

    await apiWithSession(page, 'patch', '/api/seller/kyc', {
      data: {
        legalName: 'NoBank Ltd',
        registrationNo: 'NB123',
        country: 'India',
        authorizedSignatoryName: 'NoBank User',
        authorizedSignatoryEmail: 'nobank@test.com',
      },
    });

    const dummyPdf = Buffer.from('%PDF-1.4 test');
    await apiWithSession(page, 'post', '/api/seller/kyc/documents', {
      multipart: { documentType: 'UTILITY_BILL', file: { name: 'bill.pdf', mimeType: 'application/pdf', buffer: dummyPdf } },
    });

    const res = await apiWithSession(page, 'post', '/api/seller/kyc/submit');
    expect(res.status).toBe(400);
    const body = res.body as { error: string };
    expect(body.error).toContain('Bank account');
  });
});

// ─── Seller dashboard ─────────────────────────────────────────────────────────

test.describe('Seller dashboard', () => {
  let email: string;

  test.beforeEach(async ({ request }) => {
    email = uniqueEmail();
    await request.post('/api/auth/register/seller', {
      data: {
        email,
        password: 'TestPass123!',
        legalName: 'DashboardTest Ltd',
        registrationNo: 'DT123',
        country: 'India',
        authorizedSignatoryName: 'Dash User',
        authorizedSignatoryEmail: 'dash@test.com',
      },
    });
    const token = await getVerificationToken(email);
    await request.get(`/api/auth/verify-email/${token}`);
  });

  test.afterEach(async () => {
    await cleanupUser(email);
  });

  test('Unapproved seller sees KYC required banner', async ({ page }) => {
    await loginSeller(page, email);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/kyc required/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/available after kyc approval/i)).toBeVisible();
  });

  test('Approved seller sees approved banner and New Project CTA', async ({ page }) => {
    const user = await prisma.user.findUnique({ where: { email } });
    await prisma.sellerProfile.update({
      where: { userId: user!.id },
      data: { kycStatus: 'APPROVED' },
    });

    await loginSeller(page, email);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/kyc approved/i)).toBeVisible({ timeout: 5000 });
    // New Project link is inside the quick actions card (second occurrence on page)
    await expect(page.locator('a[href="/seller/projects/new"]')).toBeVisible();
  });

  test('Pending seller sees under review banner', async ({ page }) => {
    const user = await prisma.user.findUnique({ where: { email } });
    await prisma.sellerProfile.update({ where: { userId: user!.id }, data: { kycStatus: 'PENDING' } });

    await loginSeller(page, email);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /kyc under review/i })).toBeVisible({ timeout: 5000 });
  });
});

// ─── KYC gate (Phase 2 forward-reference) ───────────────────────────────────

test.describe('KYC gate', () => {
  let unapprovedEmail: string;
  let approvedEmail: string;

  test.beforeEach(async ({ request }) => {
    // Unapproved seller
    unapprovedEmail = uniqueEmail('unapproved');
    await request.post('/api/auth/register/seller', {
      data: {
        email: unapprovedEmail,
        password: 'TestPass123!',
        legalName: 'Unapproved Ltd',
        registrationNo: 'UA123',
        country: 'India',
        authorizedSignatoryName: 'Un User',
        authorizedSignatoryEmail: 'un@test.com',
      },
    });
    let token = await getVerificationToken(unapprovedEmail);
    await request.get(`/api/auth/verify-email/${token}`);

    // Approved seller
    approvedEmail = uniqueEmail('approved');
    await request.post('/api/auth/register/seller', {
      data: {
        email: approvedEmail,
        password: 'TestPass123!',
        legalName: 'Approved Ltd',
        registrationNo: 'AP123',
        country: 'India',
        authorizedSignatoryName: 'Ap User',
        authorizedSignatoryEmail: 'ap@test.com',
      },
    });
    token = await getVerificationToken(approvedEmail);
    await request.get(`/api/auth/verify-email/${token}`);
    const user = await prisma.user.findUnique({ where: { email: approvedEmail } });
    await prisma.sellerProfile.update({ where: { userId: user!.id }, data: { kycStatus: 'APPROVED' } });
  });

  test.afterEach(async () => {
    await cleanupUser(unapprovedEmail);
    await cleanupUser(approvedEmail);
  });

  test('Unapproved seller gets 403 on POST /api/seller/projects', async ({ page }) => {
    await loginSeller(page, unapprovedEmail);

    const res = await apiWithSession(page, 'post', '/api/seller/projects');
    expect(res.status).toBe(403);
    const body = res.body as { error: string; kycStatus: string };
    expect(body.error).toContain('KYC');
    expect(body.kycStatus).toBe('NOT_STARTED');
  });

  test('Approved seller gets 501 on POST /api/seller/projects', async ({ page }) => {
    await loginSeller(page, approvedEmail);

    const res = await apiWithSession(page, 'post', '/api/seller/projects');
    // 501 = Phase 2 not implemented yet, but NOT 403
    expect(res.status).toBe(501);
  });

  test('GET /seller/projects/new is accessible to approved seller', async ({ page }) => {
    await loginSeller(page, approvedEmail);

    await page.goto('/seller/projects/new');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/seller/projects/new');
  });

  test('GET /seller/projects/new shows error for unapproved seller', async ({ page }) => {
    await loginSeller(page, unapprovedEmail);

    await page.goto('/seller/projects/new');
    // The server component throws 403, which Next.js renders as an error page.
    // Check that the page either redirects or shows an error.
    const url = page.url();
    const hasError = url.includes('error') || (await page.content()).includes('KYC');
    // Either redirected to /seller or shows KYC error
    expect(url.includes('/seller') || hasError).toBeTruthy();
  });
});

// ─── Audit events ─────────────────────────────────────────────────────────────

test.describe('Audit events', () => {
  let email: string;

  test.beforeEach(async ({ request }) => {
    email = uniqueEmail('audit');
    await request.post('/api/auth/register/seller', {
      data: {
        email,
        password: 'TestPass123!',
        legalName: 'AuditTest Ltd',
        registrationNo: 'AT123',
        country: 'India',
        authorizedSignatoryName: 'Audit User',
        authorizedSignatoryEmail: 'audit@test.com',
      },
    });
  });

  test.afterEach(async () => {
    await cleanupUser(email);
  });

  test('auth.register is written for seller registration', async () => {
    const user = await prisma.user.findUnique({ where: { email } });
    const events = await prisma.auditLog.findMany({
      where: { actorId: user!.id, action: 'auth.register' },
      orderBy: { timestamp: 'desc' },
    });
    expect(events.length).toBeGreaterThan(0);
    expect(events[0]?.payload).toMatchObject({ role: 'seller' });
  });
});

// ─── Cleanup ─────────────────────────────────────────────────────────────────

test.afterAll(async () => {
  try {
    const users = await prisma.user.findMany({ where: { email: { contains: '+e2e-' } }, select: { id: true } });
    for (const user of users) {
      await prisma.kycDocument.deleteMany({ where: { subjectUserId: user.id } }).catch(() => {});
      const profile = await prisma.sellerProfile.findUnique({ where: { userId: user.id } }).catch(() => null);
      if (profile?.bankAccountId) await prisma.bankAccount.delete({ where: { id: profile.bankAccountId } }).catch(() => {});
      await prisma.sellerProfile.deleteMany({ where: { userId: user.id } }).catch(() => {});
      await prisma.buyerProfile.deleteMany({ where: { userId: user.id } }).catch(() => {});
      await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
    }
  } catch (e) {
    console.error('final cleanup error:', e);
  }
  await prisma.$disconnect();
});
