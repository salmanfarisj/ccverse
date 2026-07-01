'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/ui/PageHeader';
import { RegistryTable } from '@/components/registry/RegistryTable';
import { apiGet } from '@/lib/query/fetcher';
import { qk } from '@/lib/query/keys';
import { formatNumber } from '@/lib/format';

type RegistryEntry = {
  id: string;
  cvcSerial: string;
  state: string;
  projectName: string;
  ccverseProjectId: string | null;
  ownerEmail: string | null;
};

type RegistryResponse = {
  entries: RegistryEntry[];
};

const STATE_COLORS: Record<string, string> = {
  AVAILABLE: 'text-lime-surveyor',
  HELD: 'text-marsh-olive',
  RETIRED: 'text-drift-ash',
};

const REFETCH_INTERVAL = 30_000;

export function RegistryClient() {
  const { data, isPending } = useQuery({
    queryKey: qk.registry,
    queryFn: () => apiGet<RegistryResponse>('/api/registry'),
    refetchInterval: REFETCH_INTERVAL,
  });

  const entries = data?.entries ?? [];

  const counts = {
    AVAILABLE: entries.filter((e) => e.state === 'AVAILABLE').length,
    HELD: entries.filter((e) => e.state === 'HELD').length,
    RETIRED: entries.filter((e) => e.state === 'RETIRED').length,
  };

  if (isPending && !data) {
    return (
      <div className="mx-auto max-w-6xl space-y-8 px-6 py-12">
        <p className="font-jetbrains-mono text-[13px] text-drift-ash">Loading registry…</p>
      </div>
    );
  }

  return (
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
  );
}
