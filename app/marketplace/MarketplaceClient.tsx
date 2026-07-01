'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, m } from 'motion/react';
import { Crossfade } from '@/components/motion';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { apiGet } from '@/lib/query/fetcher';
import { qk } from '@/lib/query/keys';
import { CHILD_DELAY, DURATION, EASE_OUT } from '@/lib/motion/tokens';
import { useReducedMotion } from '@/lib/motion/useReducedMotion';
import { formatCurrency, formatNumber } from '@/lib/format';

type MarketplaceListing = {
  id: string;
  title: string;
  projectName: string;
  ccverseProjectId: string;
  country: string;
  vintageYear: number;
  unitPrice: number;
  currency: string;
  quantityAvailable: number;
};

type MarketplaceResponse = {
  listings: MarketplaceListing[];
};

const REFETCH_INTERVAL = 30_000;

function ListingCard({
  listing,
  index,
}: {
  listing: MarketplaceListing;
  index: number;
}) {
  const reduced = useReducedMotion();

  return (
    <m.div
      layout
      initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 12 }}
      animate={{
        opacity: 1,
        y: 0,
        transition: {
          duration: reduced ? 0 : DURATION.base,
          ease: EASE_OUT,
          delay: reduced ? 0 : index * CHILD_DELAY,
        },
      }}
      exit={{ opacity: reduced ? 1 : 0, scale: reduced ? 1 : 0.98 }}
      whileHover={reduced ? undefined : { y: -2 }}
    >
      <Link
        href={`/marketplace/${listing.id}`}
        className="group flex h-full flex-col rounded-md border border-iron-filings bg-surface-raised p-[var(--spacing-21)] !no-underline transition-colors hover:border-lime-surveyor"
      >
        <h2 className="font-nb-international-pro text-[length:var(--text-body)] leading-[var(--leading-body)] !text-bone-vellum group-hover:!text-lime-surveyor">
          {listing.title}
        </h2>
        <p className="mt-2 font-nb-international-pro text-[14px] text-bone-vellum/70">
          {listing.projectName}
        </p>
        <p className="mt-1 font-jetbrains-mono text-[12px] text-drift-ash">
          {listing.ccverseProjectId} · {listing.country} · {listing.vintageYear}
        </p>
        <div className="mt-auto flex items-baseline justify-between pt-4">
          <span className="font-jetbrains-mono text-[18px] font-bold text-lime-surveyor">
            {formatCurrency(listing.unitPrice, listing.currency)}
          </span>
          <span className="font-jetbrains-mono text-[12px] text-bone-vellum/70">
            {formatNumber(listing.quantityAvailable)} available
          </span>
        </div>
        <span className="mt-4 font-jetbrains-mono text-[12px] uppercase tracking-[0.06em] text-drift-ash group-hover:text-lime-surveyor">
          View listing →
        </span>
      </Link>
    </m.div>
  );
}

export function MarketplaceClient() {
  const { data, isPending } = useQuery({
    queryKey: qk.marketplace,
    queryFn: () => apiGet<MarketplaceResponse>('/api/marketplace'),
    refetchInterval: REFETCH_INTERVAL,
  });

  const listings = data?.listings ?? [];
  const isLoading = isPending && !data;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-12">
      <PageHeader
        eyebrow="MARKETPLACE"
        title="Carbon Credits"
        description="Every listing is bound to a verified project and registry serials."
      />

      <Crossfade showContent={!isLoading} skeleton={<PageSkeleton />}>
        {listings.length === 0 ? (
          <EmptyState
            title="No listings"
            description="No active listings yet. Check back soon or register as a seller to list credits."
            ctaLabel="Register as seller"
            ctaHref="/register/seller"
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {listings.map((listing, index) => (
                <ListingCard key={listing.id} listing={listing} index={index} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </Crossfade>
    </div>
  );
}
