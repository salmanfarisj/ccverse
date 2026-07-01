import Link from 'next/link';
import { unstable_noStore as noStore } from 'next/cache';
import { TopNav } from '@/components/landing/TopNav';
import { Footer } from '@/components/landing/Footer';
import { DataTag } from '@/components/ui/DataTag';
import { getConvexClient } from '@/lib/convex/client';
import { api } from '@/convex/_generated/api';

export const metadata = {
  title: 'Marketplace — CC Verse',
  description: 'Browse verified carbon credits on the CC Verse marketplace.',
};

export const dynamic = 'force-dynamic';

export default async function MarketplacePage() {
  noStore();
  const convex = getConvexClient();
  const listings = await convex.query(api.listings.queries.listActiveListings, {});

  return (
    <>
      <TopNav />
      <main className="min-h-screen bg-obsidian-loam pt-[80px]">
        <div className="mx-auto max-w-6xl space-y-8 px-6 py-12">
          <div>
            <DataTag variant="outline">MARKETPLACE</DataTag>
            <h1 className="mt-4 font-jetbrains-mono text-3xl font-bold tracking-tight text-bone-vellum">
              Carbon Credits
            </h1>
            <p className="mt-2 font-jetbrains-mono text-[13px] text-drift-ash">
              Every listing is bound to a verified project and registry serials.
            </p>
          </div>

          {listings.length === 0 ? (
            <p className="font-jetbrains-mono text-[14px] text-drift-ash">
              No active listings yet. Sellers can list credits from their dashboard.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((listing) => (
                <Link
                  key={listing.id}
                  href={`/marketplace/${listing.id}`}
                  className="group rounded-md border border-iron-filings bg-[#141414] p-6 !no-underline transition-colors hover:border-lime-surveyor/50"
                >
                  <h2 className="font-jetbrains-mono text-[15px] font-semibold !text-bone-vellum group-hover:!text-lime-surveyor">
                    {listing.title}
                  </h2>
                  <p className="mt-2 font-jetbrains-mono text-[12px] text-drift-ash">
                    {listing.projectName}
                  </p>
                  <p className="mt-1 font-jetbrains-mono text-[12px] text-drift-ash">
                    {listing.ccverseProjectId} · {listing.country} · {listing.vintageYear}
                  </p>
                  <div className="mt-4 flex items-baseline justify-between">
                    <span className="font-jetbrains-mono text-[18px] font-bold text-lime-surveyor">
                      {listing.currency} {listing.unitPrice}
                    </span>
                    <span className="font-jetbrains-mono text-[12px] text-drift-ash">
                      {listing.quantityAvailable} available
                    </span>
                  </div>
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
