'use client';

import { useMemo, useState } from 'react';
import { formatNumber } from '@/lib/format';

type RegistryEntry = {
  id: string;
  cvcSerial: string;
  state: string;
  projectName: string;
  ccverseProjectId: string | null;
  ownerEmail: string | null;
};

const STATE_COLORS: Record<string, string> = {
  AVAILABLE: 'text-lime-surveyor',
  HELD: 'text-marsh-olive',
  RETIRED: 'text-drift-ash',
};

const PAGE_SIZE = 25;

export function RegistryTable({ entries }: { entries: RegistryEntry[] }) {
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const pageEntries = useMemo(
    () => entries.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [entries, page],
  );

  if (entries.length === 0) {
    return (
      <p className="font-nb-international-pro text-[length:var(--text-body)] text-bone-vellum/70">
        No registry entries yet. Serials are minted when sellers create listings.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-md border border-iron-filings">
        <table className="w-full font-jetbrains-mono text-[13px]">
          <thead>
            <tr className="border-b border-iron-filings bg-surface-raised text-left">
              <th className="px-4 py-3 font-normal uppercase tracking-[0.06em] text-drift-ash">
                Serial
              </th>
              <th className="px-4 py-3 font-normal uppercase tracking-[0.06em] text-drift-ash">
                State
              </th>
              <th className="px-4 py-3 font-normal uppercase tracking-[0.06em] text-drift-ash">
                Project
              </th>
              <th className="hidden px-4 py-3 font-normal uppercase tracking-[0.06em] text-drift-ash sm:table-cell">
                Holder
              </th>
            </tr>
          </thead>
          <tbody>
            {pageEntries.map((entry) => (
              <tr
                key={entry.id}
                className="border-b border-iron-filings/50 hover:bg-surface-raised/50"
              >
                <td className="px-4 py-3 text-lime-surveyor">{entry.cvcSerial}</td>
                <td className={`px-4 py-3 ${STATE_COLORS[entry.state] ?? 'text-drift-ash'}`}>
                  {entry.state}
                </td>
                <td className="px-4 py-3 text-bone-vellum">
                  {entry.projectName}
                  {entry.ccverseProjectId ? (
                    <span className="ml-1 text-drift-ash">({entry.ccverseProjectId})</span>
                  ) : null}
                </td>
                <td className="hidden px-4 py-3 text-bone-vellum/70 sm:table-cell">
                  {entry.ownerEmail ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between font-jetbrains-mono text-[13px]">
          <span className="text-bone-vellum/70">
            Showing {formatNumber(page * PAGE_SIZE + 1)}–
            {formatNumber(Math.min((page + 1) * PAGE_SIZE, entries.length))} of{' '}
            {formatNumber(entries.length)}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-md border border-iron-filings bg-transparent px-3 py-2 text-bone-vellum disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-md border border-iron-filings bg-transparent px-3 py-2 text-bone-vellum disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
