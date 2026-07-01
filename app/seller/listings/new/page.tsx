'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, type FormEvent } from 'react';
import { AuthNav } from '@/components/nav/AuthNav';
import { Input } from '@/components/ui/Input';
import { LimeButton } from '@/components/ui/LimeButton';

type Project = {
  id: string;
  name: string;
  ccverseProjectId: string;
};

function NewListingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedProject = searchParams.get('projectId') ?? '';

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState(preselectedProject);
  const [title, setTitle] = useState('');
  const [quantity, setQuantity] = useState('10');
  const [unitPrice, setUnitPrice] = useState('25');
  const [currency, setCurrency] = useState<'USD' | 'INR'>('USD');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadProjects() {
      const res = await fetch('/api/seller/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects ?? []);
        if (!projectId && data.projects?.length === 1) {
          setProjectId(data.projects[0].id);
        }
      }
    }
    void loadProjects();
  }, [projectId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/seller/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          title,
          quantity: parseInt(quantity, 10),
          unitPrice: parseFloat(unitPrice),
          currency,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to create listing');
        return;
      }

      router.push('/seller');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-md border border-iron-filings bg-[#141414] p-8"
      noValidate
    >
      {projects.length === 0 ? (
        <p className="font-jetbrains-mono text-[13px] text-drift-ash">
          No projects yet.{' '}
          <Link href="/seller/projects/new" className="!text-lime-surveyor !no-underline">
            Create a project first
          </Link>
          .
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-[var(--spacing-7)]">
            <label
              htmlFor="projectId"
              className="font-jetbrains-mono text-[13px] uppercase tracking-[0.06em] text-bone-vellum"
            >
              Project
            </label>
            <select
              id="projectId"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              required
              className="w-full bg-transparent text-[14px] text-bone-vellum border-0 border-b border-iron-filings rounded-none px-0 py-[var(--spacing-7)] focus:outline-none focus:border-lime-surveyor"
            >
              <option value="">Select a project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.ccverseProjectId})
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Listing title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="10 tCO₂e — Amazon Reforestation 2024"
          />
          <Input
            label="Quantity (credits)"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
            min={1}
          />
          <Input
            label="Unit price"
            type="number"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            required
            min={0.01}
            step="0.01"
          />
          <div className="flex flex-col gap-[var(--spacing-7)]">
            <label
              htmlFor="currency"
              className="font-jetbrains-mono text-[13px] uppercase tracking-[0.06em] text-bone-vellum"
            >
              Currency
            </label>
            <select
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as 'USD' | 'INR')}
              className="w-full bg-transparent text-[14px] text-bone-vellum border-0 border-b border-iron-filings rounded-none px-0 py-[var(--spacing-7)] focus:outline-none focus:border-lime-surveyor"
            >
              <option value="USD">USD</option>
              <option value="INR">INR</option>
            </select>
          </div>
        </>
      )}

      {error && (
        <p className="font-jetbrains-mono text-[13px] text-lime-surveyor" role="alert">
          {error}
        </p>
      )}

      {projects.length > 0 && (
        <LimeButton type="submit" disabled={loading || !projectId}>
          {loading ? 'Creating...' : 'Create listing'}
        </LimeButton>
      )}
    </form>
  );
}

export default function NewListingPage() {
  return (
    <>
      <AuthNav role="SELLER" />
      <main id="main" className="flex min-h-screen flex-col bg-obsidian-loam pt-[80px]">
        <div className="mx-auto w-full max-w-xl space-y-8 px-6 py-12">
          <div>
            <Link
              href="/seller"
              className="font-jetbrains-mono text-[13px] !text-drift-ash !no-underline hover:!text-lime-surveyor"
            >
              ← Back to dashboard
            </Link>
            <h1 className="mt-4 font-jetbrains-mono text-3xl font-bold tracking-tight !text-lime-surveyor">
              List Credits
            </h1>
            <p className="mt-1 font-jetbrains-mono text-[13px] text-drift-ash">
              Mint registry serials and list credits on the marketplace.
            </p>
          </div>

          <Suspense fallback={<p className="font-jetbrains-mono text-[13px] text-drift-ash">Loading...</p>}>
            <NewListingForm />
          </Suspense>
        </div>
      </main>
    </>
  );
}
