'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Input } from '@/components/ui/Input';
import { LimeButton } from '@/components/ui/LimeButton';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Request failed');
        return;
      }

      setSuccess(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-obsidian-loam px-6">
        <div className="w-full max-w-md space-y-6 text-center">
          <h1 className="font-jetbrains-mono text-2xl font-bold tracking-tight !text-lime-surveyor">
            Check your email
          </h1>
          <p className="font-jetbrains-mono text-[14px] text-drift-ash">
            If an account with that email exists, we&apos;ve sent a password reset link. Check your
            inbox — the link expires in 30 minutes.
          </p>
          <Link
            href="/login"
            className="font-jetbrains-mono text-[13px] uppercase tracking-[0.06em] !text-lime-surveyor !no-underline hover:text-lime/80"
          >
            ← Back to sign in
          </Link>
        </div>
      </main>
    );
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
            Reset your password
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-md border border-iron-filings bg-[#141414] p-8"
          noValidate
        >
          <p className="font-jetbrains-mono text-[13px] text-drift-ash">
            Enter your registered email address and we&apos;ll send you a reset link.
          </p>

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

          {error && (
            <p className="font-jetbrains-mono text-[13px] text-lime-surveyor" role="alert">
              {error}
            </p>
          )}

          <LimeButton type="submit" className="w-full" disabled={loading}>
            {loading ? 'Sending…' : 'Send reset link'}
          </LimeButton>
        </form>

        <p className="text-center font-jetbrains-mono text-[13px] text-drift-ash">
          Remember your password?{' '}
          <Link href="/login" className="!text-lime-surveyor !no-underline hover:text-lime/80">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
