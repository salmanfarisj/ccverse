import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Account created · CC Verse' };

export default function RegisterSuccessPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-obsidian-loam px-6">
      <div className="w-full max-w-md space-y-8 text-center">
        <Link
          href="/"
          className="font-jetbrains-mono text-2xl font-bold tracking-tight !text-lime-surveyor !no-underline"
        >
          CC Verse
        </Link>

        <div className="rounded-md border border-iron-filings bg-[#141414] p-8">
          <div className="space-y-4">
            <div className="text-4xl">✓</div>
            <h1 className="font-jetbrains-mono text-xl font-bold tracking-tight !text-lime-surveyor">
              Account created
            </h1>
            <p className="font-jetbrains-mono text-[14px] text-drift-ash">
              We&apos;ve sent a verification link to your email address. Click the link to activate
              your account and sign in.
            </p>
            <p className="font-jetbrains-mono text-[13px] text-drift-ash">
              The verification link expires in 24 hours.
            </p>
            <Link
              href="/login"
              className="inline-block font-jetbrains-mono text-[13px] uppercase tracking-[0.06em] !text-lime-surveyor !no-underline hover:text-marsh-olive"
            >
              ← Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
