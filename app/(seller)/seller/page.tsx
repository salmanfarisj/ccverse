import { requireRole } from '@/lib/rbac';
import type { Id } from '@/convex/_generated/dataModel';
import { getConvexClient } from '@/lib/convex/client';
import { api } from '@/convex/_generated/api';
import { AuthNav } from '@/components/nav/AuthNav';
import Link from 'next/link';

export default async function SellerDashboardPage() {
  const session = await requireRole(['SELLER']);

  const convex = getConvexClient();
  const state = await convex.query(api.kyc.queries.getSellerKycState, {
    userId: session.userId as Id<'users'>,
  });

  const kycStatus = state.found ? state.kycStatus : 'NOT_STARTED';
  const isApproved = kycStatus === 'APPROVED';
  const isPending = kycStatus === 'PENDING';
  const needsKyc =
    kycStatus === 'NOT_STARTED' || kycStatus === 'REJECTED' || kycStatus === 'EXPIRED';

  return (
    <>
      <AuthNav />
      <main className="flex min-h-screen flex-col bg-obsidian-loam pt-[80px]">
        <div className="mx-auto w-full max-w-4xl space-y-8 px-6 py-12">
          <div>
            <h1 className="font-jetbrains-mono text-3xl font-bold tracking-tight !text-lime-surveyor">
              Seller Dashboard
            </h1>
            <p className="mt-1 font-jetbrains-mono text-[13px] text-drift-ash">
              Welcome back.{' '}
              {isApproved
                ? 'Your account is fully verified.'
                : isPending
                  ? 'Your KYC application is under review.'
                  : 'Complete your KYC verification to start listing credits.'}
            </p>
          </div>

          {!isApproved && (
            <div
              className={`rounded-md border p-6 ${
                needsKyc
                  ? 'border-yellow-500/50 bg-yellow-500/5'
                  : 'border-yellow-500/50 bg-yellow-500/5'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <h2 className="font-jetbrains-mono text-[14px] font-semibold uppercase tracking-[0.06em] text-yellow-400">
                    {isPending ? 'KYC Under Review' : needsKyc ? 'KYC Required' : ''}
                  </h2>
                  <p className="font-jetbrains-mono text-[13px] text-drift-ash">
                    {isPending
                      ? 'Our compliance team is reviewing your application. You will receive an email once a decision has been made.'
                      : 'Complete your seller verification to list carbon credits on the marketplace.'}
                  </p>
                </div>
                <Link
                  href="/seller/kyc"
                  className={`shrink-0 rounded px-4 py-2 font-jetbrains-mono text-[13px] font-semibold ${
                    needsKyc
                      ? 'bg-lime-surveyor !text-obsidian-loam no-underline hover:bg-lime/90'
                      : 'border border-yellow-500/50 !text-yellow-400 no-underline hover:bg-yellow-500/10'
                  }`}
                >
                  {isPending ? 'View KYC status' : 'Complete KYC'}
                </Link>
              </div>
            </div>
          )}

          {isApproved && (
            <div className="rounded-md border border-lime-surveyor/50 bg-lime-surveyor/5 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="font-jetbrains-mono text-[14px] font-semibold uppercase tracking-[0.06em] text-lime-surveyor">
                    KYC Approved
                  </h2>
                  <p className="font-jetbrains-mono text-[13px] text-drift-ash">
                    Your seller account is verified. You can now register projects and list credits.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-jetbrains-mono text-[13px] text-lime-surveyor">
                    ✓ Verified
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div
              className={`rounded-md border ${isApproved ? 'border-iron-filings bg-[#141414]' : 'border-iron-filings/50 bg-[#141414]/50'}`}
            >
              <div className="p-6">
                <h3 className="font-jetbrains-mono text-[14px] font-semibold !text-lime-surveyor">
                  Register a Project
                </h3>
                <p className="mt-1 font-jetbrains-mono text-[12px] text-drift-ash">
                  Add a new carbon reduction project to the registry.
                </p>
                {isApproved ? (
                  <Link
                    href="/seller/projects/new"
                    className="mt-4 inline-block rounded bg-lime-surveyor px-4 py-2 font-jetbrains-mono text-[13px] font-semibold !text-obsidian-loam no-underline hover:bg-lime/90"
                  >
                    New Project
                  </Link>
                ) : (
                  <p className="mt-4 font-jetbrains-mono text-[12px] text-drift-ash">
                    Available after KYC approval
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-md border border-iron-filings bg-[#141414]">
              <div className="p-6">
                <h3 className="font-jetbrains-mono text-[14px] font-semibold !text-lime-surveyor">
                  KYC Verification
                </h3>
                <p className="mt-1 font-jetbrains-mono text-[12px] text-drift-ash">
                  Status:{' '}
                  <span
                    className={
                      kycStatus === 'APPROVED'
                        ? 'text-lime-surveyor'
                        : kycStatus === 'PENDING'
                          ? 'text-yellow-400'
                          : 'text-drift-ash'
                    }
                  >
                    {kycStatus.replace('_', ' ')}
                  </span>
                </p>
                <Link
                  href="/seller/kyc"
                  className="mt-4 inline-block rounded border border-iron-filings px-4 py-2 font-jetbrains-mono text-[13px] !text-lime-surveyor no-underline hover:border-lime-surveyor"
                >
                  {isApproved ? 'View KYC' : 'Complete KYC'}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
