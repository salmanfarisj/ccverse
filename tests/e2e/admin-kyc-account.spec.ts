/**
 * T1-5 E2E tests — Admin user management, KYC review queue, and account pages
 *
 * Prerequisites:
 *   npm run test:e2e:install   (one-time Playwright browser install)
 */

import { test, expect, type Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function uniqueEmail(prefix = 'admin') {
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
    // best-effort
  }
}

/**
 * Make an authenticated API request from within the browser page.
 * Uses page.evaluate + native browser fetch — httpOnly cookies are sent automatically.
 */
async function apiWithSession(
  page: Page,
  method: 'get' | 'post' | 'patch' | 'delete',
  url: string,
  options?: { data?: unknown },
) {
  return page.evaluate(
    async ({ method, url, data }) => {
      const opts: RequestInit = { method };
      if (data !== undefined) {
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
    { method, url, data: options?.data },
  );
}

/** Browser-based login — sets session cookie in the page context */
async function loginByEmail(page: Page, email: string, password = 'TestPass123!') {
  await page.goto('/login');
  await page.getByLabel(/email address/i).fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  // Determine expected redirect based on email
  let expectedPath = '/buyer';
  if (email.toLowerCase().includes('admin')) expectedPath = '/admin';
  else if (email.toLowerCase().includes('seller')) expectedPath = '/seller';
  await page.waitForURL(new RegExp(expectedPath), { timeout: 15000 });
  await page.waitForLoadState('networkidle');
}

// ─── Admin user management ─────────────────────────────────────────────────────

test.describe('Admin user management', () => {
  const adminEmail = 'admin@ccverse.local';
  const adminPassword = 'Test@12345678';

  test('GET /admin shows admin console with nav cards', async ({ page }) => {
    await loginByEmail(page, adminEmail, adminPassword);
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Users')).toBeVisible();
    await expect(page.getByText('KYC Queue')).toBeVisible();
  });

  test('GET /admin/users lists users', async ({ page }) => {
    await loginByEmail(page, adminEmail, adminPassword);
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('admin@ccverse.local')).toBeVisible();
  });

  test('GET /admin/users/new-staff shows creation form', async ({ page }) => {
    await loginByEmail(page, adminEmail, adminPassword);
    await page.goto('/admin/users/new-staff');
    await page.waitForLoadState('networkidle');
    await expect(page.getByLabel(/email address/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
  });

  test('Admin can view own user detail page', async ({ page }) => {
    await loginByEmail(page, adminEmail, adminPassword);
    const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
    await page.goto(`/admin/users/${admin!.id}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(adminEmail)).toBeVisible();
  });

  test('POST /api/admin/users creates a staff account', async ({ page }) => {
    await loginByEmail(page, adminEmail, adminPassword);
    const email = uniqueEmail('staff');
    const res = await apiWithSession(page, 'post', '/api/admin/users', {
      data: { email, role: 'ADMIN', password: 'StaffPass123!' },
    });
    expect(res.status).toBe(201);
    const body = res.body as { message: string };
    expect(body.message).toBe('Account created');
    await cleanupUser(email);
  });
});

// ─── Admin KYC queue ───────────────────────────────────────────────────────────

test.describe('Admin KYC queue', () => {
  const adminEmail = 'admin@ccverse.local';
  const adminPassword = 'Test@12345678';

  test('GET /admin/kyc loads the queue page', async ({ page }) => {
    await loginByEmail(page, adminEmail, adminPassword);
    await page.goto('/admin/kyc');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: /kyc queue/i })).toBeVisible();
  });

  test('GET /api/admin/kyc returns pending applications array', async ({ page }) => {
    await loginByEmail(page, adminEmail, adminPassword);
    const res = await apiWithSession(page, 'get', '/api/admin/kyc');
    expect(res.status).toBe(200);
    const data = res.body as { applications: unknown[] };
    expect(Array.isArray(data.applications)).toBe(true);
  });
});

// ─── Account pages ─────────────────────────────────────────────────────────────

test.describe('Account pages', () => {
  let buyerEmail: string;
  const buyerPassword = 'TestPass123!';

  test.beforeEach(async ({ request }) => {
    buyerEmail = uniqueEmail('buyeracct');
    await request.post('/api/auth/register/buyer', {
      data: { email: buyerEmail, password: buyerPassword },
    });
    const token = await getVerificationToken(buyerEmail);
    await request.get(`/api/auth/verify-email/${token}`);
  });

  test.afterEach(async () => {
    await cleanupUser(buyerEmail);
  });

  test('GET /account shows buyer profile', async ({ page }) => {
    await loginByEmail(page, buyerEmail, buyerPassword);
    await page.goto('/account');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Account', exact: true })).toBeVisible();
    await expect(page.getByText(buyerEmail)).toBeVisible();
  });

  test('GET /account/security shows password change form', async ({ page }) => {
    await loginByEmail(page, buyerEmail, buyerPassword);
    await page.goto('/account/security');
    await page.waitForLoadState('networkidle');
    await expect(page.getByLabel('Current password', { exact: true })).toBeVisible();
    await expect(page.getByLabel('New password', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Confirm new password', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /change password/i })).toBeVisible();
  });

  test('GET /api/me returns current user profile', async ({ page }) => {
    await loginByEmail(page, buyerEmail, buyerPassword);
    const res = await apiWithSession(page, 'get', '/api/me');
    expect(res.status).toBe(200);
    const data = res.body as { user: { email: string; role: string } };
    expect(data.user.email).toBe(buyerEmail);
    expect(data.user.role).toBe('BUYER');
  });

  test('PATCH /api/me updates buyer profile', async ({ page }) => {
    await loginByEmail(page, buyerEmail, buyerPassword);
    const res = await apiWithSession(page, 'patch', '/api/me', {
      data: { legalName: 'Updated Buyer Name', country: 'IN' },
    });
    expect(res.status).toBe(200);
    const body = res.body as { message: string };
    expect(body.message).toBe('Profile updated');
  });

  test('PATCH /api/me rejects invalid country code', async ({ page }) => {
    await loginByEmail(page, buyerEmail, buyerPassword);
    const res = await apiWithSession(page, 'patch', '/api/me', {
      data: { country: 'USA' },
    });
    expect(res.status).toBe(400);
  });
});

// ─── Password change ─────────────────────────────────────────────────────────────

test.describe('Password change', () => {
  let buyerEmail: string;
  const buyerPassword = 'TestPass123!';

  test.beforeEach(async ({ request }) => {
    buyerEmail = uniqueEmail('pwdtest');
    await request.post('/api/auth/register/buyer', {
      data: { email: buyerEmail, password: buyerPassword },
    });
    const token = await getVerificationToken(buyerEmail);
    await request.get(`/api/auth/verify-email/${token}`);
  });

  test.afterEach(async () => {
    await cleanupUser(buyerEmail);
  });

  test('Wrong current password returns 400', async ({ page }) => {
    await loginByEmail(page, buyerEmail, buyerPassword);
    const res = await apiWithSession(page, 'post', '/api/me/change-password', {
      data: { currentPassword: 'WrongPassword!', newPassword: 'NewPass123!' },
    });
    expect(res.status).toBe(400);
    const body = res.body as { error: string };
    expect(body.error).toContain('incorrect');
  });

  test('New password shorter than 8 chars returns 400', async ({ page }) => {
    await loginByEmail(page, buyerEmail, buyerPassword);
    const res = await apiWithSession(page, 'post', '/api/me/change-password', {
      data: { currentPassword: buyerPassword, newPassword: 'short' },
    });
    expect(res.status).toBe(400);
  });
});

// ─── Seller KYC approve/reject ─────────────────────────────────────────────────

test.describe('Seller KYC approve/reject', () => {
  const adminEmail = 'admin@ccverse.local';
  const adminPassword = 'Test@12345678';
  let sellerEmail: string;

  test.beforeEach(async ({ request }) => {
    sellerEmail = uniqueEmail('sellerkyc');
    await request.post('/api/auth/register/seller', {
      data: {
        email: sellerEmail,
        password: 'TestPass123!',
        legalName: 'KycTest Seller',
        registrationNo: 'KT123',
        country: 'IN',
        authorizedSignatoryName: 'Kyc Test',
        authorizedSignatoryEmail: 'kyctest@seller.com',
      },
    });
    const token = await getVerificationToken(sellerEmail);
    await request.get(`/api/auth/verify-email/${token}`);
  });

  test.afterEach(async () => {
    await cleanupUser(sellerEmail);
  });

  test('Admin can approve KYC via API', async ({ page }) => {
    const seller = await prisma.user.findUnique({ where: { email: sellerEmail } });
    // Set kycStatus to PENDING and create a doc
    await prisma.sellerProfile.update({ where: { userId: seller!.id }, data: { kycStatus: 'PENDING' } });
    await prisma.kycDocument.create({
      data: {
        subjectUserId: seller!.id,
        documentType: 'PAN',
        s3Key: 'kyc/test/doc.pdf',
        sha256: 'abc123',
        uploadedById: seller!.id,
      },
    });

    await loginByEmail(page, adminEmail, adminPassword);

    const res = await apiWithSession(page, 'post', `/api/admin/kyc/${seller!.id}/approve`);
    expect(res.status).toBe(200);
    const body = res.body as { kycStatus: string };
    expect(body.kycStatus).toBe('APPROVED');

    const profile = await prisma.sellerProfile.findUnique({ where: { userId: seller!.id } });
    expect(profile!.kycStatus).toBe('APPROVED');
  });

  test('Admin can reject KYC via API', async ({ page }) => {
    const seller = await prisma.user.findUnique({ where: { email: sellerEmail } });
    await prisma.sellerProfile.update({ where: { userId: seller!.id }, data: { kycStatus: 'PENDING' } });
    await prisma.kycDocument.create({
      data: {
        subjectUserId: seller!.id,
        documentType: 'GSTIN',
        s3Key: 'kyc/test/gstin.pdf',
        sha256: 'def456',
        uploadedById: seller!.id,
      },
    });

    await loginByEmail(page, adminEmail, adminPassword);

    const res = await apiWithSession(page, 'post', `/api/admin/kyc/${seller!.id}/reject`, {
      data: { reason: 'Incomplete documentation submitted' },
    });
    expect(res.status).toBe(200);
    const body = res.body as { kycStatus: string };
    expect(body.kycStatus).toBe('REJECTED');

    const profile = await prisma.sellerProfile.findUnique({ where: { userId: seller!.id } });
    expect(profile!.kycStatus).toBe('REJECTED');
    expect(profile!.kycReviewNotes).toBe('Incomplete documentation submitted');
  });
});

// ─── Seller legalName change expires KYC ─────────────────────────────────────

test.describe('Seller legalName change expires KYC', () => {
  let sellerEmail: string;

  test.beforeEach(async ({ request }) => {
    sellerEmail = uniqueEmail('sellerexp');
    await request.post('/api/auth/register/seller', {
      data: {
        email: sellerEmail,
        password: 'TestPass123!',
        legalName: 'ExpireTest Ltd',
        registrationNo: 'ET123',
        country: 'IN',
        authorizedSignatoryName: 'Expire Test',
        authorizedSignatoryEmail: 'expiretest@seller.com',
      },
    });
    const token = await getVerificationToken(sellerEmail);
    await request.get(`/api/auth/verify-email/${token}`);
  });

  test.afterEach(async () => {
    await cleanupUser(sellerEmail);
  });

  test('Seller changing legalName sets kycStatus to EXPIRED', async ({ page }) => {
    await loginByEmail(page, sellerEmail, 'TestPass123!');

    const res = await apiWithSession(page, 'patch', '/api/me', {
      data: { legalName: 'New Legal Name' },
    });
    expect(res.status).toBe(200);

    const verifyRes = await apiWithSession(page, 'get', '/api/me');
    const data = verifyRes.body as { user: { sellerProfile: { kycStatus: string } } };
    expect(data.user.sellerProfile?.kycStatus).toBe('EXPIRED');
  });

  test('Seller sees KYC status on account page', async ({ page }) => {
    await loginByEmail(page, sellerEmail, 'TestPass123!');
    await page.goto('/account');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/kyc status/i)).toBeVisible();
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
