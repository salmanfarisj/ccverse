import type { Metadata } from 'next';
import { SiteNav } from '@/components/nav/SiteNav';
import { Footer } from '@/components/landing/Footer';
import { LimeButton } from '@/components/ui/LimeButton';
import { GhostButton } from '@/components/ui/GhostButton';

export const metadata: Metadata = {
  title: 'Page not found',
  description: 'The page you requested does not exist.',
};

export default function NotFound() {
  return (
    <>
      <SiteNav />
      <main id="main" className="min-h-screen bg-obsidian-loam main-offset" tabIndex={-1}>
        <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-[var(--spacing-104)] text-center">
          <p className="font-jetbrains-mono text-[13px] uppercase tracking-[0.06em] text-drift-ash">
            404
          </p>
          <h1 className="mt-4 font-nb-international-pro text-[length:var(--text-heading)] leading-[var(--leading-heading)] tracking-[var(--tracking-heading)] text-bone-vellum">
            Page not found
          </h1>
          <p className="mt-4 font-nb-international-pro text-[length:var(--text-body)] leading-[var(--leading-body)] text-bone-vellum/80">
            The page you are looking for does not exist or has been moved.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <LimeButton href="/">Go home</LimeButton>
            <GhostButton href="/marketplace">Browse marketplace</GhostButton>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
