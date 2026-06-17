'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Input } from '@/components/ui/Input';
import { LimeButton } from '@/components/ui/LimeButton';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

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
            Create your buyer account
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-md border border-iron-filings bg-[#141414] p-8"
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

          <LimeButton type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </LimeButton>
        </form>

        {/* Footer */}
        <p className="text-center font-jetbrains-mono text-[13px] text-drift-ash">
          Already have an account?{' '}
          <Link href="/login" className="!text-lime-surveyor !no-underline hover:text-lime/80">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}