'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { LimeButton } from '@/components/ui/LimeButton';
import { GhostButton } from '@/components/ui/GhostButton';
import { AuthNav } from '@/components/nav/AuthNav';

export default function NewStaffPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'AUDITOR'>('ADMIN');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setTempPassword('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role, password: password || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Failed to create account');
        return;
      }

      if (data.tempPassword) {
        setTempPassword(data.tempPassword);
        setEmail('');
        setPassword('');
      } else {
        router.push('/admin/users');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <AuthNav />
      <main className="min-h-screen bg-obsidian-loam pt-[80px]">
        <div className="mx-auto max-w-[1200px] px-[var(--spacing-18)] py-[var(--spacing-18)]">
          {/* Breadcrumb */}
          <div className="mb-6 flex items-center gap-2 font-jetbrains-mono text-[13px] text-drift-ash">
            <Link href="/admin" className="!text-lime-surveyor !no-underline hover:text-lime/80">
              Admin
            </Link>
            <span>/</span>
            <Link href="/admin/users" className="!text-lime-surveyor !no-underline hover:text-lime/80">
              Users
            </Link>
            <span>/</span>
            <span className="text-bone-vellum">New staff</span>
          </div>

          <h1 className="font-mono text-3xl font-bold tracking-tight !text-lime-surveyor">
            New staff account
          </h1>

          <form
            onSubmit={handleSubmit}
            className="mt-8 max-w-lg space-y-6 rounded-md border border-iron-filings bg-[#141414] p-8"
            noValidate
          >
            <Input
              label="Email address"
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@ccverse.local"
            />

            <div className="flex flex-col gap-[var(--spacing-7)]">
              <label className="font-jetbrains-mono text-[13px] uppercase tracking-[0.06em] text-bone-vellum">
                Role
              </label>
              <div className="flex gap-4">
                {(['ADMIN', 'AUDITOR'] as const).map((r) => (
                  <label key={r} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value={r}
                      checked={role === r}
                      onChange={() => setRole(r)}
                      className="accent-lime-surveyor"
                    />
                    <span className="font-jetbrains-mono text-[13px] uppercase tracking-[0.06em] text-bone-vellum">
                      {r}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <Input
              label="Temporary password (leave blank to auto-generate)"
              type="password"
              name="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              hint="Min 12 characters if provided. Leave blank for auto-generated password."
            />

            {error && (
              <p className="font-jetbrains-mono text-[13px] text-lime-surveyor" role="alert">
                {error}
              </p>
            )}

            {tempPassword && (
              <div className="rounded-md border border-marsh-olive bg-[#141414] p-4">
                <p className="font-jetbrains-mono text-[13px] text-marsh-olive">
                  Account created. Share this temporary password with the user — it will not be shown again:
                </p>
                <p className="mt-2 font-mono text-[16px] font-bold text-lime-surveyor break-all">
                  {tempPassword}
                </p>
                <button
                  type="button"
                  onClick={() => setTempPassword('')}
                  className="mt-3 font-jetbrains-mono text-[13px] uppercase tracking-[0.06em] text-drift-ash hover:text-lime-surveyor"
                >
                  Clear & create another
                </button>
              </div>
            )}

            <div className="flex gap-4">
              <LimeButton type="submit" disabled={loading}>
                {loading ? 'Creating…' : 'Create account'}
              </LimeButton>
              <GhostButton href="/admin/users">Cancel</GhostButton>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}