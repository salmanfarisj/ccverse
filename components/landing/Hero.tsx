'use client';

import type { ReactNode } from 'react';
import { Stagger, StaggerItem } from '@/components/motion';

/**
 * Hero — DESIGN.md §"Hero Headline".
 *
 * Full-bleed surface (default: a layered dark gradient that stands in for
 * aerial/satellite imagery until real brand assets are supplied). H1 in
 * NB International Pro 72px weight 400, line-height 0.90, letter-spacing
 * -2.16px, anchored bottom-left. A lime primary CTA + optional ghost
 * secondary sit directly under the headline.
 */
type HeroProps = {
  /** Optional eyebrow tag rendered above the H1 (e.g. project codename). */
  eyebrow?: ReactNode;
  headline: ReactNode;
  subhead?: ReactNode;
  primary: ReactNode;
  secondary?: ReactNode;
  /** Override the default surface treatment (CSS background). */
  surfaceClassName?: string;
};

const DEFAULT_SURFACE =
  // Two-layer gradient that evokes a dark earth/space field without a
  // photographic asset. Once real imagery lands in `public/`, switch this
  // to a `<FullBleedImage>` background layer.
  'bg-[radial-gradient(ellipse_at_30%_20%,#1c2014_0%,#13140e_55%,#0a0b08_100%)]';

export function Hero({
  eyebrow,
  headline,
  subhead,
  primary,
  secondary,
  surfaceClassName,
}: HeroProps) {
  const surface = surfaceClassName ?? DEFAULT_SURFACE;
  return (
    <section
      className={`relative isolate min-h-[100dvh] w-full overflow-hidden ${surface}`}
      aria-label="Introduction"
    >
      <Stagger
        onMount
        className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-[1200px] flex-col justify-end px-[var(--spacing-18)] pb-[var(--spacing-86)] pt-[var(--spacing-119)]"
      >
        {eyebrow ? (
          <StaggerItem className="mb-[var(--spacing-18)]">{eyebrow}</StaggerItem>
        ) : null}
        <StaggerItem>
          <h1
            className="max-w-[14ch] font-nb-international-pro text-bone-vellum"
            style={{
              fontSize: 'var(--text-display)',
              lineHeight: 'var(--leading-display)',
              letterSpacing: 'var(--tracking-display)',
              fontWeight: 'var(--font-weight-regular)',
            }}
          >
            {headline}
          </h1>
        </StaggerItem>
        {subhead ? (
          <StaggerItem>
            <p
              className="mt-[var(--spacing-29)] max-w-[44ch] text-bone-vellum"
              style={{
                fontSize: 'var(--text-body)',
                lineHeight: 'var(--leading-body)',
              }}
            >
              {subhead}
            </p>
          </StaggerItem>
        ) : null}
        <StaggerItem>
          <div className="mt-[var(--spacing-29)] flex flex-wrap items-center gap-[var(--spacing-14)]">
            {primary}
            {secondary}
          </div>
        </StaggerItem>
      </Stagger>
    </section>
  );
}
