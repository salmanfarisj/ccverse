import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Verify email · CC Verse' };

interface Props {
  params: { token: string };
}

export default async function VerifyEmailPage({ params }: Props) {
  const { token } = params;

  let status: 'loading' | 'success' | 'error' = 'loading';
  let message = 'Verifying your email address…';

  try {
    const baseUrl = process.env.APP_ORIGIN ?? 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/auth/verify-email/${token}`, {
      cache: 'no-store',
    });
    const data = await res.json();

    if (res.ok) {
      status = 'success';
      message = data.message ?? 'Email verified. Your account is now active.';
    } else {
      status = 'error';
      message = data.error ?? 'Verification failed. The link may have expired.';
    }
  } catch {
    status = 'error';
    message = 'Verification failed. Please try again.';
  }

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
          {status === 'success' ? (
            <div className="space-y-4">
              <div className="text-4xl">✓</div>
              <h1 className="font-jetbrains-mono text-xl font-bold tracking-tight !text-lime-surveyor">
                Email verified
              </h1>
              <p className="font-jetbrains-mono text-[14px] text-drift-ash">{message}</p>
              <Link
                href="/login"
                className="inline-block font-jetbrains-mono text-[13px] uppercase tracking-[0.06em] !text-lime-surveyor !no-underline hover:text-lime/80"
              >
                Sign in to continue →
              </Link>
            </div>
          ) : status === 'error' ? (
            <div className="space-y-4">
              <div className="text-4xl">✗</div>
              <h1 className="font-jetbrains-mono text-xl font-bold tracking-tight !text-lime-surveyor">
                Verification failed
              </h1>
              <p className="font-jetbrains-mono text-[14px] text-drift-ash">{message}</p>
              <Link
                href="/register"
                className="inline-block font-jetbrains-mono text-[13px] uppercase tracking-[0.06em] !text-lime-surveyor !no-underline hover:text-lime/80"
              >
                Create a new account →
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-4xl">…</div>
              <p className="font-jetbrains-mono text-[14px] text-drift-ash">{message}</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
