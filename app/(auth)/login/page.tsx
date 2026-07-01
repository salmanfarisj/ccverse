'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Input } from '@/components/ui/Input';
import { LimeButton } from '@/components/ui/LimeButton';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setRetryAfter(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.status === 423) {
        // Locked out
        setRetryAfter(data.retryAfter ?? 1800);
        setError(data.error ?? 'Account is temporarily locked.');
        return;
      }

      if (!res.ok) {
        setError(data.error ?? 'Login failed');
        return;
      }

      // Redirect based on role
      const role = (data.role ?? '').toLowerCase();
      let destination = '/buyer';
      if (role === 'admin' || role === 'auditor') {
        destination = '/admin';
      } else if (role === 'seller') {
        destination = '/seller';
      }

      await router.push(destination);
    } catch (err) {
      console.error('Login error', err);
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
            Sign in to your account
          </p>
        </div>

        {/* Lockout notice */}
        {retryAfter !== null && (
          <div className="rounded-md border border-lime-surveyor bg-[#141414] p-4">
            <p className="font-jetbrains-mono text-[13px] text-lime-surveyor">
              Account locked. Try again in{' '}
              <strong>
                {Math.ceil(retryAfter / 60)} minute{Math.ceil(retryAfter / 60) !== 1 ? 's' : ''}
              </strong>
              .
            </p>
          </div>
        )}

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
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && (
            <p className="font-jetbrains-mono text-[13px] text-lime-surveyor" role="alert">
              {error}
            </p>
          )}

          <LimeButton type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </LimeButton>
        </form>

        {/* Footer links */}
        <p className="text-center font-jetbrains-mono text-[13px] text-drift-ash">
          <Link
            href="/forgot-password"
            className="!text-lime-surveyor !no-underline hover:text-lime/80"
          >
            Forgot password?
          </Link>
          {' · '}
          <Link href="/register" className="!text-lime-surveyor !no-underline hover:text-lime/80">
            Create account
          </Link>
        </p>
      </div>
    </main>
  );
}
