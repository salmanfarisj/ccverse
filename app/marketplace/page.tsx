import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { SiteNav } from '@/components/nav/SiteNav';
import { Footer } from '@/components/landing/Footer';
import { apiGet } from '@/lib/query/fetcher';
import { qk } from '@/lib/query/keys';
import { getQueryClient } from '@/lib/query/queryClient';
import { MarketplaceClient } from './MarketplaceClient';

export const metadata = {
  title: 'Marketplace',
  description: 'Browse verified carbon credits on the CC Verse marketplace.',
};

export const dynamic = 'force-dynamic';

export default async function MarketplacePage() {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: qk.marketplace,
    queryFn: () => apiGet('/api/marketplace'),
  });

  return (
    <>
      <SiteNav />
      <main id="main" className="min-h-screen bg-obsidian-loam main-offset" tabIndex={-1}>
        <HydrationBoundary state={dehydrate(queryClient)}>
          <MarketplaceClient />
        </HydrationBoundary>
      </main>
      <Footer />
    </>
  );
}
