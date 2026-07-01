'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { navItemClass } from '@/components/nav/navStyles';
import { GhostButton } from '@/components/ui/GhostButton';

type PublicNavProps = {
  transparent?: boolean;
};

export function PublicNav({ transparent = false }: PublicNavProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const firstMenuItemRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        menuButtonRef.current?.focus();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    if (open) {
      firstMenuItemRef.current?.focus();
    }
  }, [open]);

  const headerClass = transparent
    ? 'fixed inset-x-0 top-0 z-40 border-b border-transparent bg-obsidian-loam/60 backdrop-blur-sm'
    : 'fixed inset-x-0 top-0 z-40 border-b border-iron-filings bg-obsidian-loam';

  const desktopLinks = (
    <>
      <Link href="/marketplace" className={navItemClass}>
        Marketplace
      </Link>
      <Link href="/registry" className={navItemClass}>
        Registry
      </Link>
      <Link href="/login" className={navItemClass}>
        Sign in
      </Link>
      <GhostButton href="/register" className="whitespace-nowrap">
        Register
      </GhostButton>
    </>
  );

  return (
    <>
      <a
        href="#main"
        className="visually-hidden focus:not-sr-only focus:fixed focus:left-[var(--spacing-14)] focus:top-[var(--spacing-14)] focus:z-50 focus:bg-obsidian-loam focus:text-bone-vellum focus:px-[var(--spacing-14)] focus:py-[var(--spacing-7)] focus:font-jetbrains-mono focus:text-[13px] focus:uppercase focus:tracking-[0.06em] focus:no-underline"
      >
        Skip to main content
      </a>
      <header className={headerClass}>
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-[var(--spacing-18)] py-[var(--spacing-21)]">
          <Link
            href="/"
            className="font-nb-international-pro text-[14px] tracking-[var(--tracking-body)] text-bone-vellum !no-underline"
          >
            CC Verse
          </Link>

          <nav className="hidden items-center gap-[var(--spacing-18)] md:flex" aria-label="Main">
            {desktopLinks}
          </nav>

          <div className="relative md:hidden" ref={menuRef}>
            <button
              ref={menuButtonRef}
              type="button"
              aria-expanded={open}
              aria-haspopup="true"
              aria-label="Open menu"
              onClick={() => setOpen((value) => !value)}
              className="group inline-flex items-center gap-[var(--spacing-7)] bg-transparent font-jetbrains-mono text-[13px] uppercase tracking-[0.06em] text-bone-vellum"
            >
              <span>Menu</span>
              <span
                aria-hidden="true"
                className="block h-[4px] w-[4px] rounded-full bg-bone-vellum"
              />
            </button>

            {open && (
              <nav
                aria-label="Site menu"
                className="absolute right-0 top-[calc(100%+var(--spacing-7))] min-w-[200px] border border-iron-filings bg-obsidian-loam p-[var(--spacing-14)]"
              >
                <ul className="flex flex-col gap-[var(--spacing-14)]">
                  <li>
                    <Link
                      ref={firstMenuItemRef}
                      href="/login"
                      className={navItemClass}
                      onClick={() => setOpen(false)}
                    >
                      Sign in
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/register"
                      className={navItemClass}
                      onClick={() => setOpen(false)}
                    >
                      Register
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/marketplace"
                      className={navItemClass}
                      onClick={() => setOpen(false)}
                    >
                      Marketplace
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/registry"
                      className={navItemClass}
                      onClick={() => setOpen(false)}
                    >
                      Registry
                    </Link>
                  </li>
                </ul>
              </nav>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
