import type { ReactNode } from 'react';

/**
 * Section — full-bleed layout primitive.
 *
 * DESIGN.md §"Layout": content anchored to a max-width 1200px column,
 * sections separated by 86–104px vertical gaps. The section has no card
 * chrome — it sits directly on the obsidian-loam canvas. Background variants
 * (none, `obsidian` explicit, `lift` for a slightly elevated surface) are
 * provided as hooks for future phases.
 */
type SectionBackground = 'canvas' | 'lift';

type SectionProps = {
  children: ReactNode;
  background?: SectionBackground;
  className?: string;
  id?: string;
  ariaLabel?: string;
};

const backgrounds: Record<SectionBackground, string> = {
  canvas: 'bg-obsidian-loam',
  lift: 'bg-obsidian-loam', // No chrome in the design system; reserved for future use.
};

const GAP = 'py-[var(--spacing-86)]';

export function Section({
  children,
  background = 'canvas',
  className,
  id,
  ariaLabel,
}: SectionProps) {
  const wrapperClasses = className
    ? `${backgrounds[background]} ${GAP} ${className}`
    : `${backgrounds[background]} ${GAP}`;
  return (
    <section id={id} aria-label={ariaLabel} className={wrapperClasses}>
      <div className="mx-auto w-full max-w-[1200px] px-[var(--spacing-18)]">{children}</div>
    </section>
  );
}
