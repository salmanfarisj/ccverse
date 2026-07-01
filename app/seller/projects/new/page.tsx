/**
 * /seller/projects/new — placeholder for Phase 2 project registration.
 *
 * This route is KYC-gated: only sellers with kycStatus === 'APPROVED'
 * can access it. The guard is applied via requireKycApproved in the
 * route handler.
 *
 * Full implementation lands in Phase 2 (T2-1).
 */

import { requireRole } from '@/lib/rbac';
import { requireKycApproved } from '@/lib/rbac/seller';
import { AuthNav } from '@/components/nav/AuthNav';

export default async function NewProjectPage() {
  // Auth check
  const session = await requireRole(['SELLER']);
  // KYC gate
  await requireKycApproved(session);

  return (
    <>
      <AuthNav />
      <main className="flex min-h-screen flex-col items-center justify-center bg-obsidian-loam pt-[80px]">
        <div className="space-y-4 px-6 text-center">
          <h1 className="font-mono text-4xl font-bold tracking-tight !text-lime-surveyor">
            New Project
          </h1>
          <p className="text-lime/70">Full project registration flows land in Phase 2.</p>
        </div>
      </main>
    </>
  );
}
