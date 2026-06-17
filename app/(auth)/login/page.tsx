import Link from 'next/link';

/**
 * Login placeholder.
 *
 * Auth flows are built in Phase 1. This page is a stub so that the
 * RBAC middleware redirect target (/login) exists.
 */
export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-obsidian-loam text-lime">
      <div className="w-full max-w-md space-y-6 px-6">
        <h1 className="font-mono text-3xl font-bold tracking-tight">Sign in</h1>
        <p className="text-sm text-lime/70">Auth flows (email + password, MFA) land in Phase 1.</p>
        <Link
          href="/"
          className="block text-center text-sm underline underline-offset-4 hover:text-lime/80"
        >
          ← Back to home
        </Link>
      </div>
    </main>
  );
}
