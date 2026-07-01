import Link from 'next/link';
import { requireRole } from '@/lib/rbac';
import type { Id } from '@/convex/_generated/dataModel';
import { getConvexClient } from '@/lib/convex/client';
import { api } from '@/convex/_generated/api';
import { AuthNav } from '@/components/nav/AuthNav';
import { EmptyState } from '@/components/ui/EmptyState';
import { LimeButton } from '@/components/ui/LimeButton';
import { GhostButton } from '@/components/ui/GhostButton';
import { PageHeader } from '@/components/ui/PageHeader';
import { formatCurrency, formatDate, formatNumber } from '@/lib/format';

export const metadata = {
  title: 'Seller Dashboard',
  description: 'Manage projects, listings, and sales on CC Verse.',
};

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
      <AuthNav role={session.role} />
      <main id="main" className="flex min-h-screen flex-col bg-obsidian-loam main-offset" tabIndex={-1}>
        <div className="mx-auto w-full max-w-4xl space-y-8 px-6 py-12">
          <PageHeader
            eyebrow="SELLER"
            title="Seller Dashboard"
            description={
              isApproved
                ? 'Your account is verified. Manage projects, listings, and sales.'
                : 'Complete KYC to start listing credits.'
            }
            actions={
              !isApproved ? <LimeButton href="/seller/kyc">Complete KYC</LimeButton> : undefined
            }
          />

          {isApproved && (
            <div className="flex flex-wrap gap-3">
              <LimeButton href="/seller/projects/new">New Project</LimeButton>
              <GhostButton href="/seller/listings/new">New Listing</GhostButton>
            </div>
          )}

          <section className="space-y-4">
            <h2 className="font-jetbrains-mono text-[14px] font-semibold uppercase tracking-[0.06em] text-lime-surveyor">
              My Projects ({projects.length})
            </h2>
            {projects.length === 0 ? (
              <EmptyState
                title="No projects"
                description="Create a verified project before listing carbon credits for sale."
                ctaLabel={isApproved ? 'New project' : 'Complete KYC first'}
                ctaHref={isApproved ? '/seller/projects/new' : '/seller/kyc'}
              />
            ) : (
              <div className="space-y-2">
                {projects.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-md border border-iron-filings bg-surface-raised p-4"
                  >
                    <div>
                      <p className="font-nb-international-pro text-[length:var(--text-body)] !text-bone-vellum">
                        {p.name}
                      </p>
                      <p className="font-jetbrains-mono text-[12px] text-bone-vellum/70">
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
              <p className="font-nb-international-pro text-[length:var(--text-body)] text-bone-vellum/70">
                No listings yet.
              </p>
            ) : (
              <div className="space-y-2">
                {listings.map((l) => (
                  <div
                    key={l.id}
                    className="flex items-center justify-between rounded-md border border-iron-filings bg-surface-raised p-4"
                  >
                    <div>
                      <p className="font-nb-international-pro text-[length:var(--text-body)] !text-bone-vellum">
                        {l.title}
                      </p>
                      <p className="font-jetbrains-mono text-[12px] text-bone-vellum/70">
                        {l.projectName} · {formatCurrency(l.unitPrice, l.currency)}/credit ·{' '}
                        {formatNumber(l.quantityAvailable)}/{formatNumber(l.quantityTotal)} available
                        · {formatNumber(l.sold)} sold
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
              <p className="font-nb-international-pro text-[length:var(--text-body)] text-bone-vellum/70">
                No sales yet.
              </p>
            ) : (
              <div className="space-y-2">
                {sales.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-md border border-iron-filings bg-surface-raised p-4"
                  >
                    <p className="font-nb-international-pro text-[length:var(--text-body)] !text-bone-vellum">
                      {s.listingTitle}
                    </p>
                    <p className="font-jetbrains-mono text-[12px] text-bone-vellum/70">
                      {s.projectName} · {formatNumber(s.quantity)} credits ·{' '}
                      {formatCurrency(s.totalAmount, s.currency)} · {formatDate(s.createdAt)}
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
