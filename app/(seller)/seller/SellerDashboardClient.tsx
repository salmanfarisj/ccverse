'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { EmptyState } from '@/components/ui/EmptyState';
import { LimeButton } from '@/components/ui/LimeButton';
import { GhostButton } from '@/components/ui/GhostButton';
import { PageHeader } from '@/components/ui/PageHeader';
import { apiGet } from '@/lib/query/fetcher';
import { qk } from '@/lib/query/keys';
import { formatCurrency, formatDate, formatNumber } from '@/lib/format';

type SellerDashboardResponse = {
  kyc: {
    found: boolean;
    kycStatus?: string;
  };
  projects: Array<{
    id: string;
    name: string;
    ccverseProjectId: string;
    country: string;
    vintageYear: number;
  }>;
  listings: Array<{
    id: string;
    title: string;
    projectName: string;
    unitPrice: number;
    currency: string;
    quantityAvailable: number;
    quantityTotal: number;
    sold: number;
    status: string;
  }>;
  sales: Array<{
    id: string;
    listingTitle: string;
    projectName: string;
    quantity: number;
    totalAmount: number;
    currency: string;
    createdAt: string;
  }>;
};

const REFETCH_INTERVAL = 30_000;

export function SellerDashboardClient() {
  const { data, isPending, isError } = useQuery({
    queryKey: qk.sellerDashboard,
    queryFn: () => apiGet<SellerDashboardResponse>('/api/seller/dashboard'),
    refetchInterval: REFETCH_INTERVAL,
  });

  if (isPending && !data) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-8 px-6 py-12">
        <PageHeader eyebrow="SELLER" title="Seller Dashboard" description="Loading…" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-8 px-6 py-12">
        <PageHeader
          eyebrow="SELLER"
          title="Seller Dashboard"
          description="Failed to load dashboard. Try refreshing the page."
        />
      </div>
    );
  }

  const kycStatus = data?.kyc.found ? (data.kyc.kycStatus ?? 'NOT_STARTED') : 'NOT_STARTED';
  const isApproved = kycStatus === 'APPROVED';
  const projects = data?.projects ?? [];
  const listings = data?.listings ?? [];
  const sales = data?.sales ?? [];

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 px-6 py-12">
      <PageHeader
        eyebrow="SELLER"
        title="Seller Dashboard"
        description={
          isApproved
            ? 'Your account is verified. Manage projects, listings, and sales.'
            : 'Complete KYC to start listing credits.'
        }
        actions={!isApproved ? <LimeButton href="/seller/kyc">Complete KYC</LimeButton> : undefined}
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
                    {formatNumber(l.quantityAvailable)}/{formatNumber(l.quantityTotal)} available ·{' '}
                    {formatNumber(l.sold)} sold
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
  );
}
