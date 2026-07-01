'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Input } from '@/components/ui/Input';
import { LimeButton } from '@/components/ui/LimeButton';
import { useToast } from '@/components/ui/Toast';
import { getDashboardPath } from '@/lib/rbac/dashboard';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError('');
    setRetryAfter(null);
    setLoading(true);

    const credentials =
      email.trim() && password
        ? { email: email.trim(), password }
        : process.env.NODE_ENV === 'development'
          ? { email: 'buyer@ccverse.local', password: 'Test@12345678' }
          : null;

    if (!credentials) {
      setError('Email and password are required');
      setLoading(false);
      return;
    }

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
        const message = data.error ?? 'Login failed';
        setError(message);
        toast(message, 'error');
        return;
      }

      const destination = getDashboardPath(data.role);
      toast('Signed in successfully', 'success');
      await router.push(destination);
    } catch {
      const message = 'Something went wrong. Please try again.';
      setError(message);
      toast(message, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-obsidian-loam px-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link
            href="/"
            className="font-nb-international-pro text-[length:var(--text-subheading)] leading-[var(--leading-subheading)] !text-lime-surveyor !no-underline"
          >
            CC Verse
          </Link>
          <p className="mt-2 font-jetbrains-mono text-[13px] uppercase tracking-[0.06em] text-drift-ash">
            Sign in to your account
          </p>
        </div>

        {retryAfter !== null && (
          <div className="rounded-md border border-lime-surveyor bg-surface-raised p-4">
            <p className="font-jetbrains-mono text-[13px] text-bone-vellum">
              Account locked. Try again in{' '}
              <strong>
                {Math.ceil(retryAfter / 60)} minute{Math.ceil(retryAfter / 60) !== 1 ? 's' : ''}
              </strong>
              .
            </p>
          </div>
        )}

        <form
          className="space-y-6 rounded-md border border-iron-filings bg-surface-raised p-8"
          noValidate
          onSubmit={(e) => void handleLogin(e)}
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
            placeholder="Your password"
          />

          {error && (
            <p className="font-jetbrains-mono text-[13px] text-error" role="alert">
              {error}
            </p>
          )}

          <LimeButton type="submit" className="w-full whitespace-nowrap" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </LimeButton>
        </form>

        <p className="text-center font-jetbrains-mono text-[13px] text-bone-vellum/70">
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
