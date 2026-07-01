import Link from 'next/link';
import { SiteNav } from '@/components/nav/SiteNav';
import { Footer } from '@/components/landing/Footer';
import { PageHeader } from '@/components/ui/PageHeader';
import { RegistryTable } from '@/components/registry/RegistryTable';
import { getConvexClient } from '@/lib/convex/client';
import { api } from '@/convex/_generated/api';
import { formatNumber } from '@/lib/format';

export const metadata = {
  title: 'Public Registry',
  description: 'Public registry of all carbon credit serials and their state.',
};

export const dynamic = 'force-dynamic';

const STATE_COLORS: Record<string, string> = {
  AVAILABLE: 'text-lime-surveyor',
  HELD: 'text-marsh-olive',
  RETIRED: 'text-drift-ash',
};

export default async function RegistryPage() {
  const convex = getConvexClient();
  const entries = await convex.query(api.registry.queries.listRegistry, {});

  const counts = {
    AVAILABLE: entries.filter((e) => e.state === 'AVAILABLE').length,
    HELD: entries.filter((e) => e.state === 'HELD').length,
    RETIRED: entries.filter((e) => e.state === 'RETIRED').length,
  };

  return (
    <>
      <SiteNav />
      <main id="main" className="min-h-screen bg-obsidian-loam main-offset" tabIndex={-1}>
        <div className="mx-auto max-w-6xl space-y-8 px-6 py-12">
          <div>
            <Link
              href="/"
              className="font-jetbrains-mono text-[13px] !text-bone-vellum/70 !no-underline hover:!text-lime-surveyor"
            >
              ← Home
            </Link>
            <div className="mt-4">
              <PageHeader
                eyebrow="PUBLIC REGISTRY"
                title="CC Verse Registry"
                description="One registry entry per carbon credit serial. States: Available → Held → Retired."
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 md:flex md:flex-row">
            {(['AVAILABLE', 'HELD', 'RETIRED'] as const).map((state) => (
              <div
                key={state}
                className="flex-1 rounded-md border border-iron-filings bg-surface-raised px-5 py-4"
              >
                <p
                  className={`font-jetbrains-mono text-[length:var(--text-subheading)] font-bold leading-none ${STATE_COLORS[state]}`}
                >
                  {formatNumber(counts[state])}
                </p>
                <p className="mt-1 font-jetbrains-mono text-[11px] uppercase tracking-[0.06em] text-drift-ash">
                  {state}
                </p>
              </div>
            ))}
          </div>

          <RegistryTable entries={entries} />
        </div>
      </main>
      <Footer />
    </>
  );
}
