'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentPropsWithoutRef } from 'react';
import { navItemClass } from '@/components/nav/navStyles';

type NavLinkProps = {
  href: string;
  children: React.ReactNode;
  exact?: boolean;
} & Omit<ComponentPropsWithoutRef<typeof Link>, 'href' | 'children' | 'className'>;

export function NavLink({ href, children, exact = false, ...rest }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={
        isActive
          ? `${navItemClass} !text-bone-vellum underline decoration-lime-surveyor decoration-2 underline-offset-4`
          : navItemClass
      }
      aria-current={isActive ? 'page' : undefined}
      {...rest}
    >
      {children}
    </Link>
  );
}
