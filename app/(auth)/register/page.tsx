'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Input } from '@/components/ui/Input';
import { LimeButton } from '@/components/ui/LimeButton';
import { useToast } from '@/components/ui/Toast';
import { apiSend } from '@/lib/query/fetcher';

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const registerMutation = useMutation({
    mutationFn: () => apiSend('/api/auth/register/buyer', 'POST', { email, password }),
    onSuccess: () => {
      toast('Account created successfully', 'success');
      router.push('/register/success');
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
      toast(message, 'error');
    },
  });

  function registerAsBuyer() {
    setError('');

    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    registerMutation.mutate();
  }

  const loading = registerMutation.isPending;

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
            registerAsBuyer();
          }}
        >
          <Input
            label="Email address"
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />

          <Input
            label="Password"
            type="password"
            name="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 8 characters"
            required
            minLength={8}
          />

          {error && (
            <p className="font-jetbrains-mono text-[13px] text-error" role="alert">
              {error}
            </p>
          )}

          <LimeButton type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating account…' : 'Register as buyer'}
          </LimeButton>
        </form>

        <p className="text-center font-jetbrains-mono text-[13px] text-bone-vellum/70">
          Already have an account?{' '}
          <Link href="/login" className="!text-lime-surveyor !no-underline hover:text-marsh-olive">
            Sign in
          </Link>
          {' · '}
          <Link
            href="/register/seller"
            className="!text-lime-surveyor !no-underline hover:text-marsh-olive"
          >
            Register as seller
          </Link>
        </p>
      </div>
    </main>
  );
}
