import Link from 'next/link';
import { TopNav } from '@/components/landing/TopNav';
import { Footer } from '@/components/landing/Footer';
import { DataTag } from '@/components/ui/DataTag';
import { getConvexClient } from '@/lib/convex/client';
import { api } from '@/convex/_generated/api';

export const metadata = {
  title: 'Public Registry — CC Verse',
  description: 'Public registry of all carbon credit serials and their state.',
};

export const dynamic = 'force-dynamic';

const STATE_COLORS: Record<string, string> = {
  AVAILABLE: 'text-lime-surveyor',
  HELD: 'text-yellow-400',
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
      <TopNav />
      <main className="min-h-screen bg-obsidian-loam pt-[80px]">
        <div className="mx-auto max-w-6xl space-y-8 px-6 py-12">
          <div>
            <Link
              href="/"
              className="font-jetbrains-mono text-[13px] !text-drift-ash !no-underline hover:!text-lime-surveyor"
            >
              ← Home
            </Link>
            <DataTag variant="outline">PUBLIC REGISTRY</DataTag>
            <h1 className="mt-4 font-jetbrains-mono text-3xl font-bold tracking-tight text-bone-vellum">
              CC Verse Registry
            </h1>
            <p className="mt-2 font-jetbrains-mono text-[13px] text-drift-ash">
              One registry entry per carbon credit serial. States: Available → Held → Retired.
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            {(['AVAILABLE', 'HELD', 'RETIRED'] as const).map((state) => (
              <div
                key={state}
                className="rounded-md border border-iron-filings bg-[#141414] px-5 py-3"
              >
                <p className={`font-jetbrains-mono text-[20px] font-bold ${STATE_COLORS[state]}`}>
                  {counts[state]}
                </p>
                <p className="font-jetbrains-mono text-[11px] uppercase tracking-[0.06em] text-drift-ash">
                  {state}
                </p>
              </div>
            ))}
          </div>

          {entries.length === 0 ? (
            <p className="font-jetbrains-mono text-[14px] text-drift-ash">
              No registry entries yet. Serials are minted when sellers create listings.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-iron-filings">
              <table className="w-full font-jetbrains-mono text-[13px]">
                <thead>
                  <tr className="border-b border-iron-filings bg-[#141414] text-left">
                    <th className="px-4 py-3 text-drift-ash font-normal uppercase tracking-[0.06em]">
                      Serial
                    </th>
                    <th className="px-4 py-3 text-drift-ash font-normal uppercase tracking-[0.06em]">
                      State
                    </th>
                    <th className="px-4 py-3 text-drift-ash font-normal uppercase tracking-[0.06em]">
                      Project
                    </th>
                    <th className="px-4 py-3 text-drift-ash font-normal uppercase tracking-[0.06em]">
                      Holder
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} className="border-b border-iron-filings/50 hover:bg-[#141414]/50">
                      <td className="px-4 py-3 text-lime-surveyor">{entry.cvcSerial}</td>
                      <td className={`px-4 py-3 ${STATE_COLORS[entry.state] ?? 'text-drift-ash'}`}>
                        {entry.state}
                      </td>
                      <td className="px-4 py-3 text-bone-vellum">
                        {entry.projectName}
                        {entry.ccverseProjectId && (
                          <span className="ml-1 text-drift-ash">({entry.ccverseProjectId})</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-drift-ash">{entry.ownerEmail ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
