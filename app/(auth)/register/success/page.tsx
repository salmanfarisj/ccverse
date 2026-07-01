import Link from 'next/link';
import type { Metadata } from 'next';
import { LimeButton } from '@/components/ui/LimeButton';

export const metadata: Metadata = { title: 'Account created' };

export default function RegisterSuccessPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-obsidian-loam px-6">
      <div className="w-full max-w-md space-y-8 text-center">
        <Link
          href="/"
          className="font-nb-international-pro text-[length:var(--text-subheading)] leading-[var(--leading-subheading)] !text-lime-surveyor !no-underline"
        >
          CC Verse
        </Link>

        <div className="rounded-md border border-iron-filings bg-surface-raised p-8">
          <div className="space-y-4">
            <div className="text-4xl text-lime-surveyor" aria-hidden="true">
              ✓
            </div>
            <h1 className="font-nb-international-pro text-[length:var(--text-subheading)] leading-[var(--leading-subheading)] !text-bone-vellum">
              Account created
            </h1>
            <p className="font-nb-international-pro text-[length:var(--text-body)] leading-[var(--leading-body)] text-bone-vellum/80">
              Your account is ready. You can sign in now to access the marketplace and your
              dashboard.
            </p>
            <LimeButton href="/login" className="mt-4">
              Sign in
            </LimeButton>
          </div>
        </div>
      </div>
    </main>
  );
}
