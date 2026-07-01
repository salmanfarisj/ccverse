'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { navItemClass, navSignOutClass } from '@/components/nav/navStyles';
import { getDashboardPath } from '@/lib/rbac/dashboard';

type AuthNavProps = {
  role?: string;
};

export function AuthNav({ role: roleProp }: AuthNavProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [role, setRole] = useState(roleProp ?? '');

  useEffect(() => {
    if (roleProp) {
      setRole(roleProp);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/me');
        if (!res.ok) return;
        const data = (await res.json()) as { user?: { role?: string } };
        if (!cancelled && data.user?.role) {
          setRole(data.user.role);
        }
      } catch {
        // Keep default dashboard path when profile is unavailable.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [roleProp]);

  const homeHref = getDashboardPath(role);
  const normalizedRole = role.toUpperCase();

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <>
      <a
        href="#main"
        className="visually-hidden focus:not-sr-only focus:fixed focus:left-[var(--spacing-14)] focus:top-[var(--spacing-14)] focus:z-50 focus:bg-obsidian-loam focus:text-bone-vellum focus:px-[var(--spacing-14)] focus:py-[var(--spacing-7)] focus:font-jetbrains-mono focus:text-[13px] focus:uppercase focus:tracking-[0.06em] focus:no-underline"
      >
        Skip to main content
      </a>
      <header className="fixed inset-x-0 top-0 z-40 border-b border-iron-filings bg-obsidian-loam">
      <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-[var(--spacing-18)] py-[var(--spacing-21)]">
        <Link
          href={homeHref}
          className="font-nb-international-pro text-[14px] tracking-[var(--tracking-body)] text-bone-vellum !no-underline"
        >
          CC Verse
        </Link>
        <nav className="flex items-center gap-[var(--spacing-18)]">
          {(normalizedRole === 'BUYER' || normalizedRole === 'SELLER') && (
            <>
              <Link href="/marketplace" className={navItemClass}>
                Marketplace
              </Link>
              <Link href="/registry" className={navItemClass}>
                Registry
              </Link>
            </>
          )}
          <Link href="/account" className={navItemClass}>
            Account
          </Link>
          <button
            type="button"
            disabled={loggingOut}
            onClick={handleLogout}
            className={navSignOutClass}
          >
            {loggingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </nav>
      </div>
    </header>
    </>
  );
}
