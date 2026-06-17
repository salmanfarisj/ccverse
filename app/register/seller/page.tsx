'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Input } from '@/components/ui/Input';
import { LimeButton } from '@/components/ui/LimeButton';

export default function SellerRegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: '',
    password: '',
    legalName: '',
    registrationNo: '',
    country: '',
    authorizedSignatoryName: '',
    authorizedSignatoryEmail: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register/seller', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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
          <h1 className="mt-2 font-jetbrains-mono text-[13px] uppercase tracking-[0.06em] text-drift-ash">
            Register as a seller
          </h1>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-md border border-iron-filings bg-[#141414] p-8"
          noValidate
        >
          <p className="font-jetbrains-mono text-[12px] uppercase tracking-[0.06em] text-drift-ash">
            Account details
          </p>

          <Input
            label="Email address"
            type="email"
            name="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={handleChange}
            placeholder="you@company.com"
          />

          <Input
            label="Password"
            type="password"
            name="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={form.password}
            onChange={handleChange}
            placeholder="Min. 8 characters"
            hint="At least 8 characters"
          />

          <hr className="border-iron-filings" />

          <p className="font-jetbrains-mono text-[12px] uppercase tracking-[0.06em] text-drift-ash">
            Entity details
          </p>

          <Input
            label="Legal entity name"
            type="text"
            name="legalName"
            required
            value={form.legalName}
            onChange={handleChange}
            placeholder="Acme Carbon Ltd."
          />

          <Input
            label="Registration number"
            type="text"
            name="registrationNo"
            required
            value={form.registrationNo}
            onChange={handleChange}
            placeholder="CIN / Registration ID"
          />

          <Input
            label="Country"
            type="text"
            name="country"
            required
            value={form.country}
            onChange={handleChange}
            placeholder="India"
          />

          <Input
            label="Authorized signatory name"
            type="text"
            name="authorizedSignatoryName"
            required
            value={form.authorizedSignatoryName}
            onChange={handleChange}
            placeholder="Jane Doe"
          />

          <Input
            label="Authorized signatory email"
            type="email"
            name="authorizedSignatoryEmail"
            required
            value={form.authorizedSignatoryEmail}
            onChange={handleChange}
            placeholder="signatory@company.com"
          />

          {error && (
            <p className="font-jetbrains-mono text-[13px] text-lime-surveyor" role="alert">
              {error}
            </p>
          )}

          <LimeButton type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating account…' : 'Register seller account'}
          </LimeButton>
        </form>

        {/* Footer */}
        <p className="text-center font-jetbrains-mono text-[13px] text-drift-ash">
          Register as a buyer?{' '}
          <Link href="/register" className="!text-lime-surveyor !no-underline hover:text-lime/80">
            Create buyer account
          </Link>
        </p>
      </div>
    </main>
  );
}
