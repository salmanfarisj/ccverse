'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AuthNav } from '@/components/nav/AuthNav';
import { Input } from '@/components/ui/Input';
import { LimeButton } from '@/components/ui/LimeButton';
import { useToast } from '@/components/ui/Toast';
import { apiSend } from '@/lib/query/fetcher';
import { qk } from '@/lib/query/keys';

export default function NewProjectPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [projectType, setProjectType] = useState('REFORESTATION');
  const [methodology, setMethodology] = useState('VCS');
  const [vintageYear, setVintageYear] = useState(String(new Date().getFullYear()));
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const createProjectMutation = useMutation({
    mutationFn: () =>
      apiSend('/api/seller/projects', 'POST', {
        name,
        country,
        projectType,
        methodology,
        vintageYear: parseInt(vintageYear, 10),
        description,
      }),
    onSuccess: async () => {
      toast('Project created successfully', 'success');
      await queryClient.invalidateQueries({ queryKey: qk.sellerProjects });
      await queryClient.invalidateQueries({ queryKey: qk.sellerDashboard });
      await router.push('/seller');
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Failed to create project';
      setError(message);
      toast(message, 'error');
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    createProjectMutation.mutate();
  }

  const loading = createProjectMutation.isPending;

  return (
    <>
      <AuthNav role="SELLER" />
      <main id="main" className="flex min-h-screen flex-col bg-obsidian-loam main-offset">
        <div className="mx-auto w-full max-w-xl space-y-8 px-6 py-12">
          <div>
            <Link
              href="/seller"
              className="font-jetbrains-mono text-[13px] !text-drift-ash !no-underline hover:!text-lime-surveyor"
            >
              ← Back to dashboard
            </Link>
            <h1 className="mt-4 font-nb-international-pro text-[length:var(--text-subheading)] leading-[var(--leading-subheading)] !text-bone-vellum">
              Register a Project
            </h1>
            <p className="mt-1 font-jetbrains-mono text-[13px] text-drift-ash">
              Add a carbon reduction project to the CC Verse registry.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-6 rounded-md border border-iron-filings bg-surface-raised p-8"
            noValidate
          >
            <Input
              label="Project name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Amazon Reforestation Initiative"
            />
            <Input
              label="Country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              required
              placeholder="Brazil"
            />
            <div className="flex flex-col gap-[var(--spacing-7)]">
              <label
                htmlFor="projectType"
                className="font-jetbrains-mono text-[13px] uppercase tracking-[0.06em] text-bone-vellum"
              >
                Project type
              </label>
              <select
                id="projectType"
                value={projectType}
                onChange={(e) => setProjectType(e.target.value)}
                className="w-full bg-transparent text-[14px] text-bone-vellum border-0 border-b border-iron-filings rounded-none px-0 py-[var(--spacing-7)] focus:outline-none focus:border-lime-surveyor"
              >
                <option value="REFORESTATION">Reforestation</option>
                <option value="RENEWABLE_ENERGY">Renewable Energy</option>
                <option value="METHANE_CAPTURE">Methane Capture</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <Input
              label="Methodology"
              value={methodology}
              onChange={(e) => setMethodology(e.target.value)}
              required
              placeholder="VCS, Gold Standard, etc."
            />
            <Input
              label="Vintage year"
              type="number"
              value={vintageYear}
              onChange={(e) => setVintageYear(e.target.value)}
              required
              min={2000}
              max={2100}
            />
            <div className="flex flex-col gap-[var(--spacing-7)]">
              <label
                htmlFor="description"
                className="font-jetbrains-mono text-[13px] uppercase tracking-[0.06em] text-bone-vellum"
              >
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={4}
                className="w-full bg-transparent text-[14px] text-bone-vellum placeholder:text-drift-ash border-0 border-b border-iron-filings rounded-none px-0 py-[var(--spacing-7)] focus:outline-none focus:border-lime-surveyor resize-none"
                placeholder="Brief description of the project..."
              />
            </div>

            {error && (
              <p className="font-jetbrains-mono text-[13px] text-error" role="alert">
                {error}
              </p>
            )}

            <LimeButton type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create project'}
            </LimeButton>
          </form>
        </div>
      </main>
    </>
  );
}
