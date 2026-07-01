'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

export function AuthNav() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout(e: FormEvent) {
    e.preventDefault();
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-iron-filings bg-obsidian-loam">
      <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-[var(--spacing-18)] py-[var(--spacing-21)]">
        <Link
          href="/"
          className="font-nb-international-pro text-[14px] tracking-[var(--tracking-body)] text-bone-vellum !no-underline"
        >
          CC Verse
        </Link>
        <nav className="flex items-center gap-[var(--spacing-18)]">
          <Link
            href="/account"
            className="font-jetbrains-mono text-[13px] uppercase tracking-[0.06em] text-drift-ash hover:text-bone-vellum !no-underline"
          >
            Account
          </Link>
          <form onSubmit={handleLogout}>
            <button
              type="submit"
              disabled={loggingOut}
              className="font-jetbrains-mono text-[13px] uppercase tracking-[0.06em] text-drift-ash hover:text-lime-surveyor disabled:opacity-50"
            >
              {loggingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
