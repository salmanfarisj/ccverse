import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { SiteNav } from '@/components/nav/SiteNav';
import { Footer } from '@/components/landing/Footer';
import type { Id } from '@/convex/_generated/dataModel';
import { getConvexClient } from '@/lib/convex/client';
import { api } from '@/convex/_generated/api';
import { getSessionData } from '@/lib/session';
import { ListingDetailClient } from './ListingDetailClient';

export const dynamic = 'force-dynamic';

type PageProps = { params: { listingId: string } };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const convex = getConvexClient();
  const result = await convex.query(api.listings.queries.getListing, {
    listingId: params.listingId as Id<'listings'>,
  });
  if (!result.found) {
    return { title: 'Listing not found' };
  }
  return {
    title: result.listing.title,
    description: `Purchase verified carbon credits from ${result.listing.projectName}.`,
  };
}

export default async function ListingDetailPage({ params }: PageProps) {
  const convex = getConvexClient();
  const [result, session] = await Promise.all([
    convex.query(api.listings.queries.getListing, {
      listingId: params.listingId as Id<'listings'>,
    }),
    getSessionData(),
  ]);

  if (!result.found) {
    notFound();
  }

  return (
    <>
      <SiteNav />
      <main id="main" className="min-h-screen bg-obsidian-loam main-offset" tabIndex={-1}>
        <div className="mx-auto max-w-4xl px-6 py-12">
          <Link
            href="/marketplace"
            className="inline-flex font-jetbrains-mono text-[13px] !text-bone-vellum/70 !no-underline hover:!text-lime-surveyor"
          >
            ← Back to marketplace
          </Link>
          <div className="mt-6">
            <ListingDetailClient
              listing={result.listing}
              isAuthenticated={Boolean(session.userId)}
              userRole={session.role}
            />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
