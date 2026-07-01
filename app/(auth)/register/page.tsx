'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { LimeButton } from '@/components/ui/LimeButton';
import { GhostButton } from '@/components/ui/GhostButton';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState<'buyer' | 'seller' | null>(null);

  async function registerAsBuyer() {
    setError('');

    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading('buyer');

    try {
      const res = await fetch('/api/auth/register/buyer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Registration failed');
        return;
      }

      router.push('/register/success');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(null);
    }
  }

  function goToSellerRegister() {
    router.push('/register/seller');
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-obsidian-loam px-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link
            href="/"
            className="font-jetbrains-mono text-2xl font-bold tracking-tight !text-lime-surveyor !no-underline"
          >
            CC Verse
          </Link>
          <p className="mt-2 font-jetbrains-mono text-[13px] uppercase tracking-[0.06em] text-drift-ash">
            Create your account
          </p>
        </div>

        <form
          className="space-y-6 rounded-md border border-iron-filings bg-[#141414] p-8"
          noValidate
          onSubmit={(e) => e.preventDefault()}
        >
          <Input
            label="Email address"
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />

          <Input
            label="Password"
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

          {error && (
            <p className="font-jetbrains-mono text-[13px] text-lime-surveyor" role="alert">
              {error}
            </p>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <LimeButton
              type="button"
              className="w-full"
              disabled={loading !== null}
              onClick={() => void registerAsBuyer()}
            >
              {loading === 'buyer' ? 'Creating account…' : 'Register as buyer'}
            </LimeButton>
            <GhostButton
              type="button"
              className="w-full"
              disabled={loading !== null}
              onClick={goToSellerRegister}
            >
              {loading === 'seller' ? 'Loading…' : 'Register as seller'}
            </GhostButton>
          </div>
        </form>

        <p className="text-center font-jetbrains-mono text-[13px] text-drift-ash">
          Already have an account?{' '}
          <Link href="/login" className="!text-lime-surveyor !no-underline hover:text-marsh-olive">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
