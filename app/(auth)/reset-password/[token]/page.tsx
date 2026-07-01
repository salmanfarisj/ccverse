'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Input } from '@/components/ui/Input';
import { LimeButton } from '@/components/ui/LimeButton';

interface Props {
  params: { token: string };
}

export default function ResetPasswordPage({ params }: Props) {
  const router = useRouter();
  const { token } = params;
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Reset failed');
        return;
      }

      router.push('/login?reset=success');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-obsidian-loam px-6">
      <div className="w-full max-w-md space-y-8">
        {/* Brand */}
        <div className="text-center">
          <Link
            href="/"
            className="font-jetbrains-mono text-2xl font-bold tracking-tight !text-lime-surveyor !no-underline"
          >
            CC Verse
          </Link>
          <p className="mt-2 font-jetbrains-mono text-[13px] uppercase tracking-[0.06em] text-drift-ash">
            Set a new password
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-md border border-iron-filings bg-[#141414] p-8"
          noValidate
        >
          <Input
            label="New password"
            type="password"
            name="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 8 characters"
            hint="At least 8 characters"
          />

          <Input
            label="Confirm password"
            type="password"
            name="confirmPassword"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat new password"
          />

          {error && (
            <p className="font-jetbrains-mono text-[13px] text-lime-surveyor" role="alert">
              {error}
            </p>
          )}

          <LimeButton type="submit" className="w-full" disabled={loading}>
            {loading ? 'Updating…' : 'Update password'}
          </LimeButton>
        </form>

        <p className="text-center font-jetbrains-mono text-[13px] text-drift-ash">
          <Link href="/login" className="!text-lime-surveyor !no-underline hover:text-marsh-olive">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
