'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { LimeButton } from '@/components/ui/LimeButton';
import { useToast } from '@/components/ui/Toast';

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register/buyer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        const message = data.error ?? 'Registration failed';
        setError(message);
        toast(message, 'error');
        return;
      }

      toast('Account created successfully', 'success');
      router.push('/register/success');
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
            Create your account
          </p>
        </div>

        <form
          className="space-y-6 rounded-md border border-iron-filings bg-surface-raised p-8"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void registerAsBuyer();
          }}
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
          />

          {error && (
            <p className="font-jetbrains-mono text-[13px] text-error" role="alert">
              {error}
            </p>
          )}

          <LimeButton type="submit" className="w-full whitespace-nowrap" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </LimeButton>
        </form>

        <p className="text-center font-jetbrains-mono text-[13px] text-bone-vellum/70">
          Registering as a seller?{' '}
          <Link
            href="/register/seller"
            className="!text-lime-surveyor !no-underline hover:text-marsh-olive"
          >
            Seller registration
          </Link>
          {' · '}
          Already have an account?{' '}
          <Link href="/login" className="!text-lime-surveyor !no-underline hover:text-marsh-olive">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
