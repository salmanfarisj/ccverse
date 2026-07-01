'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { NavLink } from '@/components/nav/NavLink';
import { navSignOutClass } from '@/components/nav/navStyles';
import { useToast } from '@/components/ui/Toast';
import { getDashboardPath } from '@/lib/rbac/dashboard';
import { apiGet, apiSend } from '@/lib/query/fetcher';
import { qk } from '@/lib/query/keys';

type AuthNavProps = {
  role?: string;
};

type MeResponse = {
  user?: { role?: string };
};

export function AuthNav({ role: roleProp }: AuthNavProps) {
  const router = useRouter();
  const { toast } = useToast();

  const { data } = useQuery({
    queryKey: qk.me,
    queryFn: () => apiGet<MeResponse>('/api/me'),
    enabled: !roleProp,
    retry: false,
  });

  const role = roleProp ?? data?.user?.role ?? '';
  const homeHref = getDashboardPath(role);
  const normalizedRole = role.toUpperCase();

  const logoutMutation = useMutation({
    mutationFn: () => apiSend('/api/auth/logout', 'POST'),
    onSuccess: async () => {
      toast('Signed out successfully', 'success');
      await router.push('/login');
    },
  });

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
                <NavLink href="/marketplace">Marketplace</NavLink>
                <NavLink href="/registry">Registry</NavLink>
              </>
            )}
            <NavLink href="/account">Account</NavLink>
            <button
              type="button"
              disabled={logoutMutation.isPending}
              onClick={() => logoutMutation.mutate()}
              className={navSignOutClass}
            >
              {logoutMutation.isPending ? 'Signing out…' : 'Sign out'}
            </button>
          </nav>
        </div>
      </header>
    </>
  );
}
