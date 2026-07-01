import { SiteNav } from '@/components/nav/SiteNav';
import { Footer } from '@/components/landing/Footer';
import type { ReactNode } from 'react';

type LegalPageProps = {
  title: string;
  children: ReactNode;
};

export function LegalPage({ title, children }: LegalPageProps) {
  return (
    <>
      <SiteNav />
      <main id="main" className="min-h-screen bg-obsidian-loam pt-[80px]">
        <div className="mx-auto max-w-[1200px] px-[var(--spacing-18)] py-[var(--spacing-86)]">
          <h1 className="font-jetbrains-mono text-3xl font-bold tracking-tight text-bone-vellum">
            {title}
          </h1>
          <div className="mt-[var(--spacing-29)] max-w-[68ch] space-y-[var(--spacing-18)] font-jetbrains-mono text-[14px] leading-relaxed text-drift-ash">
            {children}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
