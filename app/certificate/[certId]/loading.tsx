import { SiteNav } from '@/components/nav/SiteNav';
import { Footer } from '@/components/landing/Footer';
import { PageSkeleton } from '@/components/ui/Skeleton';

export default function CertificateLoading() {
  return (
    <>
      <SiteNav />
      <main id="main" className="min-h-screen bg-obsidian-loam main-offset" aria-busy="true">
        <div className="mx-auto max-w-3xl px-6 py-12">
          <PageSkeleton />
        </div>
      </main>
      <Footer />
    </>
  );
}
