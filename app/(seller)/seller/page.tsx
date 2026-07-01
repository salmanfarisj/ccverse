import { requireRole } from '@/lib/rbac';
import type { Id } from '@/convex/_generated/dataModel';
import { getConvexClient } from '@/lib/convex/client';
import { api } from '@/convex/_generated/api';
import { AuthNav } from '@/components/nav/AuthNav';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function SellerDashboardPage() {
  const session = await requireRole(['SELLER']);
  const userId = session.userId as Id<'users'>;

  const convex = getConvexClient();
  const [state, projects, listings, sales] = await Promise.all([
    convex.query(api.kyc.queries.getSellerKycState, { userId }),
    convex.query(api.projects.queries.listMyProjects, { sellerId: userId }),
    convex.query(api.listings.queries.listMyListings, { sellerId: userId }),
    convex.query(api.orders.queries.listSellerOrders, { sellerId: userId }),
  ]);

  const kycStatus = state.found ? state.kycStatus : 'NOT_STARTED';
  const isApproved = kycStatus === 'APPROVED';

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
              {isApproved
                ? 'Your account is verified. Manage projects, listings, and sales.'
                : 'Complete KYC to start listing credits.'}
            </p>
          </div>

          {isApproved && (
            <div className="flex flex-wrap gap-3">
              <Link
                href="/seller/projects/new"
                className="rounded bg-lime-surveyor px-4 py-2 font-jetbrains-mono text-[13px] font-semibold !text-obsidian-loam no-underline hover:bg-lime/90"
              >
                New Project
              </Link>
              <Link
                href="/seller/listings/new"
                className="rounded border border-lime-surveyor px-4 py-2 font-jetbrains-mono text-[13px] !text-lime-surveyor no-underline hover:bg-lime-surveyor/10"
              >
                New Listing
              </Link>
            </div>
          )}

          <section className="space-y-4">
            <h2 className="font-jetbrains-mono text-[14px] font-semibold uppercase tracking-[0.06em] text-lime-surveyor">
              My Projects ({projects.length})
            </h2>
            {projects.length === 0 ? (
              <p className="font-jetbrains-mono text-[13px] text-drift-ash">No projects yet.</p>
            ) : (
              <div className="space-y-2">
                {projects.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-md border border-iron-filings bg-[#141414] p-4"
                  >
                    <div>
                      <p className="font-jetbrains-mono text-[14px] !text-bone-vellum">{p.name}</p>
                      <p className="font-jetbrains-mono text-[12px] text-drift-ash">
                        {p.ccverseProjectId} · {p.country} · {p.vintageYear}
                      </p>
                    </div>
                    {isApproved && (
                      <Link
                        href={`/seller/listings/new?projectId=${p.id}`}
                        className="font-jetbrains-mono text-[12px] !text-lime-surveyor !no-underline hover:underline"
                      >
                        List credits
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <h2 className="font-jetbrains-mono text-[14px] font-semibold uppercase tracking-[0.06em] text-lime-surveyor">
              My Listings ({listings.length})
            </h2>
            {listings.length === 0 ? (
              <p className="font-jetbrains-mono text-[13px] text-drift-ash">No listings yet.</p>
            ) : (
              <div className="space-y-2">
                {listings.map((l) => (
                  <div
                    key={l.id}
                    className="flex items-center justify-between rounded-md border border-iron-filings bg-[#141414] p-4"
                  >
                    <div>
                      <p className="font-jetbrains-mono text-[14px] !text-bone-vellum">{l.title}</p>
                      <p className="font-jetbrains-mono text-[12px] text-drift-ash">
                        {l.projectName} · {l.currency} {l.unitPrice}/credit · {l.quantityAvailable}/
                        {l.quantityTotal} available · {l.sold} sold
                      </p>
                    </div>
                    <span
                      className={`font-jetbrains-mono text-[12px] ${
                        l.status === 'ACTIVE' ? 'text-lime-surveyor' : 'text-drift-ash'
                      }`}
                    >
                      {l.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <h2 className="font-jetbrains-mono text-[14px] font-semibold uppercase tracking-[0.06em] text-lime-surveyor">
              Sales ({sales.length})
            </h2>
            {sales.length === 0 ? (
              <p className="font-jetbrains-mono text-[13px] text-drift-ash">No sales yet.</p>
            ) : (
              <div className="space-y-2">
                {sales.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-md border border-iron-filings bg-[#141414] p-4"
                  >
                    <p className="font-jetbrains-mono text-[14px] !text-bone-vellum">{s.listingTitle}</p>
                    <p className="font-jetbrains-mono text-[12px] text-drift-ash">
                      {s.projectName} · {s.quantity} credits · {s.currency} {s.totalAmount} ·{' '}
                      {new Date(s.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
