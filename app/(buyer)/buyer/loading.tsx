import { AuthNav } from '@/components/nav/AuthNav';
import { PageSkeleton } from '@/components/ui/Skeleton';

export default function BuyerLoading() {
  return (
    <>
      <AuthNav />
      <main id="main" className="min-h-screen bg-obsidian-loam main-offset" aria-busy="true">
        <div className="mx-auto max-w-4xl px-6 py-12">
          <PageSkeleton />
        </div>
      </main>
    </>
  );
}
