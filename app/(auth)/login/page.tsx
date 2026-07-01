'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Input } from '@/components/ui/Input';
import { LimeButton } from '@/components/ui/LimeButton';
import { GhostButton } from '@/components/ui/GhostButton';

const DEMO_ACCOUNTS = {
  buyer: {
    email: 'buyer@ccverse.local',
    password: 'Test@12345678',
  },
  seller: {
    email: 'seller@ccverse.local',
    password: 'Test@12345678',
  },
} as const;

type LoginRole = keyof typeof DEMO_ACCOUNTS;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeRole, setActiveRole] = useState<LoginRole | null>(null);

  async function loginAs(role: LoginRole) {
    setError('');
    setRetryAfter(null);
    setActiveRole(role);
    setLoading(true);

    const credentials =
      email.trim() && password ? { email: email.trim(), password } : DEMO_ACCOUNTS[role];

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      const data = await res.json();

      if (res.status === 423) {
        setRetryAfter(data.retryAfter ?? 1800);
        setError(data.error ?? 'Account is temporarily locked.');
        return;
      }

      if (!res.ok) {
        setError(data.error ?? 'Login failed');
        return;
      }

      const loggedInRole = (data.role ?? '').toLowerCase();
      if (loggedInRole !== role) {
        await fetch('/api/auth/logout', { method: 'POST' });
        setError(`This account is registered as a ${loggedInRole || 'different role'}, not a ${role}.`);
        return;
      }

      const destination = role === 'seller' ? '/seller' : '/buyer';
      await router.push(destination);
    } catch (err) {
      console.error('Login error', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
      setActiveRole(null);
    }
  }

  function handleSubmit(e: FormEvent, role: LoginRole) {
    e.preventDefault();
    void loginAs(role);
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
            Sign in to your account
          </p>
        </div>

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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />

          <Input
            label="Password"
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
              disabled={loading}
              onClick={(e) => void handleSubmit(e, 'buyer')}
            >
              {loading && activeRole === 'buyer' ? 'Signing in…' : 'Sign in as buyer'}
            </LimeButton>
            <GhostButton
              type="button"
              className="w-full"
              disabled={loading}
              onClick={(e) => void handleSubmit(e, 'seller')}
            >
              {loading && activeRole === 'seller' ? 'Signing in…' : 'Sign in as seller'}
            </GhostButton>
          </div>
        </form>

        <p className="text-center font-jetbrains-mono text-[13px] text-drift-ash">
          <Link
            href="/forgot-password"
            className="!text-lime-surveyor !no-underline hover:text-marsh-olive"
          >
            Forgot password?
          </Link>
          {' · '}
          <Link href="/register" className="!text-lime-surveyor !no-underline hover:text-marsh-olive">
            Create account
          </Link>
        </p>
      </div>
    </main>
  );
}
