'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Input } from '@/components/ui/Input';
import { LimeButton } from '@/components/ui/LimeButton';
import { GhostButton } from '@/components/ui/GhostButton';
import { useToast } from '@/components/ui/Toast';

type FormState = {
  email: string;
  password: string;
  legalName: string;
  registrationNo: string;
  country: string;
  authorizedSignatoryName: string;
  authorizedSignatoryEmail: string;
};

const INITIAL: FormState = {
  email: '',
  password: '',
  legalName: '',
  registrationNo: '',
  country: '',
  authorizedSignatoryName: '',
  authorizedSignatoryEmail: '',
};

export default function SellerRegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function validateStep(current: number): boolean {
    if (current === 1) {
      if (!form.email.trim()) {
        setError('Email is required');
        return false;
      }
      if (form.password.length < 8) {
        setError('Password must be at least 8 characters');
        return false;
      }
    }
    if (current === 2) {
      const required = [
        'legalName',
        'registrationNo',
        'country',
        'authorizedSignatoryName',
        'authorizedSignatoryEmail',
      ] as const;
      for (const field of required) {
        if (!form[field].trim()) {
          setError('All entity fields are required');
          return false;
        }
      }
    }
    setError('');
    return true;
  }

  function goNext() {
    if (validateStep(step)) setStep((s) => Math.min(3, s + 1));
  }

  function goBack() {
    setError('');
    setStep((s) => Math.max(1, s - 1));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validateStep(2)) return;
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register/seller', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        const message = data.error ?? 'Registration failed';
        setError(message);
        toast(message, 'error');
        return;
      }

      toast('Seller account created', 'success');
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
    <main className="flex min-h-screen flex-col items-center justify-center bg-obsidian-loam px-6 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link
            href="/"
            className="font-nb-international-pro text-[length:var(--text-subheading)] leading-[var(--leading-subheading)] !text-lime-surveyor !no-underline"
          >
            CC Verse
          </Link>
          <h1 className="mt-2 font-jetbrains-mono text-[13px] uppercase tracking-[0.06em] text-drift-ash">
            Register as a seller
          </h1>
        </div>

        <div className="flex items-center justify-center gap-2" aria-label={`Step ${step} of 3`}>
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex items-center gap-2">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full font-jetbrains-mono text-[11px] font-bold ${
                  step >= n
                    ? '!bg-lime-surveyor !text-obsidian-loam'
                    : 'border border-iron-filings text-drift-ash'
                }`}
              >
                {step > n ? '✓' : n}
              </div>
              {n < 3 && (
                <div className={`h-px w-8 ${step > n ? 'bg-lime-surveyor' : 'bg-iron-filings'}`} />
              )}
            </div>
          ))}
        </div>
        <p className="text-center font-jetbrains-mono text-[12px] text-bone-vellum/70">
          Step {step} of 3 —{' '}
          {step === 1 ? 'Account' : step === 2 ? 'Entity' : 'Review'}
        </p>

        <form
          onSubmit={step === 3 ? handleSubmit : (e) => e.preventDefault()}
          className="space-y-5 rounded-md border border-iron-filings bg-surface-raised p-8"
          noValidate
        >
          {step === 1 && (
            <>
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
              />
            </>
          )}

          {step === 2 && (
            <>
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
            </>
          )}

          {step === 3 && (
            <dl className="space-y-3 font-jetbrains-mono text-[13px]">
              <div className="flex justify-between gap-4 border-b border-iron-filings pb-2">
                <dt className="text-drift-ash">Email</dt>
                <dd className="text-bone-vellum">{form.email}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-iron-filings pb-2">
                <dt className="text-drift-ash">Entity</dt>
                <dd className="text-bone-vellum text-right">{form.legalName}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-iron-filings pb-2">
                <dt className="text-drift-ash">Country</dt>
                <dd className="text-bone-vellum">{form.country}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-drift-ash">Signatory</dt>
                <dd className="text-bone-vellum text-right">{form.authorizedSignatoryName}</dd>
              </div>
            </dl>
          )}

          {error && (
            <p className="font-jetbrains-mono text-[13px] text-error" role="alert">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            {step > 1 ? (
              <GhostButton type="button" className="whitespace-nowrap" onClick={goBack}>
                Back
              </GhostButton>
            ) : (
              <GhostButton type="button" className="whitespace-nowrap" href="/register">
                Register as buyer
              </GhostButton>
            )}
            {step < 3 ? (
              <LimeButton type="button" className="whitespace-nowrap sm:ml-auto" onClick={goNext}>
                Continue
              </LimeButton>
            ) : (
              <LimeButton type="submit" className="whitespace-nowrap sm:ml-auto" disabled={loading}>
                {loading ? 'Creating account…' : 'Register as seller'}
              </LimeButton>
            )}
          </div>
        </form>

        <p className="text-center font-jetbrains-mono text-[13px] text-bone-vellum/70">
          Already have an account?{' '}
          <Link href="/login" className="!text-lime-surveyor !no-underline hover:text-marsh-olive">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
