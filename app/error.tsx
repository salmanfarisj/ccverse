'use client';

import { useEffect } from 'react';
import { PublicNav } from '@/components/nav/PublicNav';
import { Footer } from '@/components/landing/Footer';
import { LimeButton } from '@/components/ui/LimeButton';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error', error.digest ?? error.message);
  }, [error]);

  return (
    <>
      <PublicNav />
      <main id="main" className="min-h-screen bg-obsidian-loam main-offset" tabIndex={-1}>
        <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-[var(--spacing-104)] text-center">
          <p className="font-jetbrains-mono text-[13px] uppercase tracking-[0.06em] text-drift-ash">
            Error
          </p>
          <h1 className="mt-4 font-nb-international-pro text-[length:var(--text-heading)] leading-[var(--leading-heading)] tracking-[var(--tracking-heading)] text-bone-vellum">
            Something went wrong
          </h1>
          <p className="mt-4 font-nb-international-pro text-[length:var(--text-body)] leading-[var(--leading-body)] text-bone-vellum/80">
            We could not complete your request. Please try again.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <LimeButton type="button" onClick={() => reset()}>
              Try again
            </LimeButton>
            <LimeButton href="/">Go home</LimeButton>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
