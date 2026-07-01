import { SiteNav } from '@/components/nav/SiteNav';
import { Footer } from '@/components/landing/Footer';
import type { ReactNode } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';

type LegalPageProps = {
  title: string;
  children: ReactNode;
};

export function LegalPage({ title, children }: LegalPageProps) {
  return (
    <>
      <SiteNav />
      <main id="main" className="min-h-screen bg-obsidian-loam main-offset" tabIndex={-1}>
        <div className="mx-auto max-w-[1200px] px-[var(--spacing-18)] py-[var(--spacing-86)]">
          <PageHeader eyebrow="LEGAL" title={title} />
          <div className="mt-[var(--spacing-29)] max-w-[68ch] space-y-[var(--spacing-18)] font-nb-international-pro text-[length:var(--text-body)] leading-[var(--leading-body)] text-bone-vellum/80">
            {children}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
