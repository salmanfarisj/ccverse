import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteNav } from '@/components/nav/SiteNav';
import { Footer } from '@/components/landing/Footer';
import type { Id } from '@/convex/_generated/dataModel';
import { getConvexClient } from '@/lib/convex/client';
import { api } from '@/convex/_generated/api';
import { ListingDetailClient } from './ListingDetailClient';

export const dynamic = 'force-dynamic';

type PageProps = { params: { listingId: string } };

export default async function ListingDetailPage({ params }: PageProps) {
  const convex = getConvexClient();
  const result = await convex.query(api.listings.queries.getListing, {
    listingId: params.listingId as Id<'listings'>,
  });

  if (!result.found) {
    notFound();
  }

  return (
    <>
      <SiteNav />
      <main id="main" className="min-h-screen bg-obsidian-loam pt-[80px]">
        <div className="mx-auto max-w-4xl px-6 py-12">
          <Link
            href="/marketplace"
            className="inline-flex font-jetbrains-mono text-[13px] !text-drift-ash !no-underline hover:!text-lime-surveyor"
          >
            ← Back to marketplace
          </Link>
          <div className="mt-6">
            <ListingDetailClient listing={result.listing} />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
