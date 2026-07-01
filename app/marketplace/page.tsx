import Link from 'next/link';
import { unstable_noStore as noStore } from 'next/cache';
import { SiteNav } from '@/components/nav/SiteNav';
import { Footer } from '@/components/landing/Footer';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { getConvexClient } from '@/lib/convex/client';
import { api } from '@/convex/_generated/api';
import { formatCurrency, formatNumber } from '@/lib/format';

export const metadata = {
  title: 'Marketplace',
  description: 'Browse verified carbon credits on the CC Verse marketplace.',
};

export const dynamic = 'force-dynamic';

export default async function MarketplacePage() {
  noStore();
  const convex = getConvexClient();
  const listings = await convex.query(api.listings.queries.listActiveListings, {});

  return (
    <>
      <SiteNav />
      <main id="main" className="min-h-screen bg-obsidian-loam main-offset" tabIndex={-1}>
        <div className="mx-auto max-w-6xl space-y-8 px-6 py-12">
          <PageHeader
            eyebrow="MARKETPLACE"
            title="Carbon Credits"
            description="Every listing is bound to a verified project and registry serials."
          />

          {listings.length === 0 ? (
            <EmptyState
              title="No listings"
              description="No active listings yet. Check back soon or register as a seller to list credits."
              ctaLabel="Register as seller"
              ctaHref="/register/seller"
            />
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((listing) => (
                <Link
                  key={listing.id}
                  href={`/marketplace/${listing.id}`}
                  className="group flex flex-col rounded-md border border-iron-filings bg-surface-raised p-[var(--spacing-21)] !no-underline transition-colors hover:border-lime-surveyor"
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
                  <div className="mt-auto pt-4 flex items-baseline justify-between">
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
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
