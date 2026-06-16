import { getEnv } from '@/lib/env';

/**
 * Footer — DESIGN.md §"Footer".
 *
 * Full-width obsidian-loam band with 1px #404040 top border. Three columns:
 * legal links, contact, and build metadata (git SHA + build time). All copy
 * is JetBrains Mono 13px #f4f3e8 per the design system.
 *
 * The version metadata is sourced from the env loader (T0-1-5) and falls
 * back to `dev` / empty when unset — the same values power `/api/version`
 * (T0-13-2).
 */
type FooterColumn = { heading: string; items: { label: string; href?: string }[] };

const COLUMNS: FooterColumn[] = [
  {
    heading: 'Legal',
    items: [
      { label: 'Terms of service', href: '/legal/terms' },
      { label: 'Privacy policy', href: '/legal/privacy' },
      { label: 'Cookie policy', href: '/legal/cookies' },
    ],
  },
  {
    heading: 'Contact',
    items: [
      { label: 'hello@ccverse.example', href: 'mailto:hello@ccverse.example' },
      { label: 'support@ccverse.example', href: 'mailto:support@ccverse.example' },
      { label: 'Status', href: 'https://status.ccverse.example' },
    ],
  },
];

export function Footer() {
  const env = getEnv();
  const gitSha = env.GIT_SHA || 'dev';
  const builtAt = env.BUILT_AT || '';
  const buildLabel = builtAt ? `${gitSha} · ${builtAt}` : gitSha;

  return (
    <footer className="border-t border-iron-filings bg-obsidian-loam">
      <div className="mx-auto w-full max-w-[1200px] px-[var(--spacing-18)] py-[var(--spacing-86)]">
        <div className="grid grid-cols-1 gap-[var(--spacing-59)] md:grid-cols-3">
          {COLUMNS.map((column) => (
            <div key={column.heading}>
              <p className="font-jetbrains-mono text-[13px] uppercase tracking-[0.06em] text-drift-ash">
                {column.heading}
              </p>
              <ul className="mt-[var(--spacing-14)] space-y-[var(--spacing-7)]">
                {column.items.map((item) => (
                  <li key={item.label}>
                    {item.href ? (
                      <a
                        href={item.href}
                        className="font-jetbrains-mono text-[13px] text-bone-vellum no-underline hover:text-lime-surveyor"
                      >
                        {item.label}
                      </a>
                    ) : (
                      <span className="font-jetbrains-mono text-[13px] text-bone-vellum">
                        {item.label}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <p className="font-jetbrains-mono text-[13px] uppercase tracking-[0.06em] text-drift-ash">
              Build
            </p>
            <ul className="mt-[var(--spacing-14)] space-y-[var(--spacing-7)]">
              <li className="font-jetbrains-mono text-[13px] text-bone-vellum">{buildLabel}</li>
              <li className="font-jetbrains-mono text-[13px] text-drift-ash">
                © {new Date().getUTCFullYear()} CC Verse
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
