import Link from 'next/link';

/**
 * Top Navigation Bar — DESIGN.md §"Top Navigation Bar".
 *
 * Transparent over the hero, fixed at the top of the viewport. The skip-link
 * is visually hidden until focused (Tab) so keyboard users can bypass the
 * nav. The brand wordmark uses NB International Pro; the menu trigger is
 * JetBrains Mono with a 4px #f4f3e8 dot per the design spec.
 *
 * In Phase 0 there are no real nav routes — the menu trigger is a button
 * stub. Phase 1+ replaces it with the real menu and the role-aware account
 * slot.
 */
export function TopNav() {
  return (
    <>
      <a
        href="#main"
        className="visually-hidden focus:not-sr-only focus:fixed focus:left-[var(--spacing-14)] focus:top-[var(--spacing-14)] focus:z-50 focus:bg-obsidian-loam focus:text-bone-vellum focus:px-[var(--spacing-14)] focus:py-[var(--spacing-7)] focus:font-jetbrains-mono focus:text-[13px] focus:uppercase focus:tracking-[0.06em] focus:no-underline"
      >
        Skip to main content
      </a>
      <header className="fixed inset-x-0 top-0 z-40 bg-transparent">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-[var(--spacing-18)] py-[var(--spacing-21)]">
          <Link
            href="/"
            className="font-nb-international-pro text-[14px] tracking-[var(--tracking-body)] text-bone-vellum !no-underline"
          >
            CC Verse
          </Link>
          <button
            type="button"
            aria-label="Open menu"
            className="group inline-flex items-center gap-[var(--spacing-7)] bg-transparent font-jetbrains-mono text-[13px] uppercase tracking-[0.06em] text-bone-vellum"
          >
            <span>Menu</span>
            <span
              aria-hidden="true"
              className="block h-[4px] w-[4px] rounded-full bg-bone-vellum"
            />
          </button>
        </div>
      </header>
    </>
  );
}
