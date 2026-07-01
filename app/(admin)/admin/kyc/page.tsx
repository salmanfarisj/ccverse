'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AuthNav } from '@/components/nav/AuthNav';

interface Application {
  userId: string;
  sellerName: string;
  email: string;
  country: string | null;
  submittedAt: string;
  documentCount: number;
}

export default function AdminKycPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/kyc');
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();
        setApplications(data.applications);
      } catch {
        // silently fail — admin can retry
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <>
      <AuthNav role="ADMIN" />
      <main id="main" className="min-h-screen bg-obsidian-loam pt-[80px]">
        <div className="mx-auto max-w-[1200px] px-[var(--spacing-18)] py-[var(--spacing-18)]">
          {/* Breadcrumb */}
          <div className="mb-6 flex items-center gap-2 font-jetbrains-mono text-[13px] text-drift-ash">
            <Link href="/admin" className="!text-lime-surveyor !no-underline hover:text-marsh-olive">
              Admin
            </Link>
            <span>/</span>
            <span className="text-bone-vellum">KYC Queue</span>
          </div>

          <h1 className="font-jetbrains-mono text-3xl font-bold tracking-tight !text-lime-surveyor">
            KYC Queue
          </h1>
          <p className="mt-2 font-jetbrains-mono text-[13px] uppercase tracking-[0.06em] text-drift-ash">
            {applications.length} pending{' '}
            {applications.length === 1 ? 'application' : 'applications'}
          </p>

          <div className="mt-8 overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-iron-filings">
                  <th className="py-3 pr-4 font-jetbrains-mono text-[13px] uppercase tracking-[0.06em] text-drift-ash">
                    Seller
                  </th>
                  <th className="py-3 pr-4 font-jetbrains-mono text-[13px] uppercase tracking-[0.06em] text-drift-ash">
                    Country
                  </th>
                  <th className="py-3 pr-4 font-jetbrains-mono text-[13px] uppercase tracking-[0.06em] text-drift-ash">
                    Submitted
                  </th>
                  <th className="py-3 pr-4 font-jetbrains-mono text-[13px] uppercase tracking-[0.06em] text-drift-ash">
                    Documents
                  </th>
                  <th className="py-3 font-jetbrains-mono text-[13px] uppercase tracking-[0.06em] text-drift-ash">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-drift-ash">
                      Loading…
                    </td>
                  </tr>
                ) : applications.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-drift-ash">
                      No pending applications
                    </td>
                  </tr>
                ) : (
                  applications.map((app) => (
                    <tr key={app.userId} className="border-b border-iron-filings">
                      <td className="py-3 pr-4">
                        <Link
                          href={`/admin/kyc/${app.userId}`}
                          className="font-nb-international-pro text-[14px] text-bone-vellum hover:text-lime-surveyor !no-underline"
                        >
                          {app.sellerName ?? app.email}
                        </Link>
                        <div className="text-[12px] text-drift-ash">{app.email}</div>
                      </td>
                      <td className="py-3 pr-4 font-jetbrains-mono text-[13px] text-bone-vellum">
                        {app.country ?? '—'}
                      </td>
                      <td className="py-3 pr-4 font-jetbrains-mono text-[13px] text-bone-vellum">
                        {new Date(app.submittedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 pr-4 font-jetbrains-mono text-[13px] text-bone-vellum">
                        {app.documentCount}
                      </td>
                      <td className="py-3">
                        <Link
                          href={`/admin/kyc/${app.userId}`}
                          className="font-jetbrains-mono text-[12px] uppercase tracking-[0.06em] text-lime-surveyor hover:text-marsh-olive !no-underline"
                        >
                          Review →
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
