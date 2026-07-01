import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { SiteNav } from '@/components/nav/SiteNav';
import { Footer } from '@/components/landing/Footer';
import { apiGet } from '@/lib/query/fetcher';
import { qk } from '@/lib/query/keys';
import { getQueryClient } from '@/lib/query/queryClient';
import { RegistryClient } from './RegistryClient';

export const metadata = {
  title: 'Public Registry',
  description: 'Public registry of all carbon credit serials and their state.',
};

export const dynamic = 'force-dynamic';

export default async function RegistryPage() {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: qk.registry,
    queryFn: () => apiGet('/api/registry'),
  });

  return (
    <>
      <SiteNav />
      <main id="main" className="min-h-screen bg-obsidian-loam main-offset" tabIndex={-1}>
        <HydrationBoundary state={dehydrate(queryClient)}>
          <RegistryClient />
        </HydrationBoundary>
      </main>
      <Footer />
    </>
  );
}
