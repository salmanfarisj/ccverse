import type { ComponentPropsWithoutRef, ReactNode } from 'react';

/**
 * Data Tag — DESIGN.md §"Data Tag".
 *
 * The 'survey marker' of the system. Lime-filled (`solid` variant) or
 * transparent with a lime border (`outline` variant). JetBrains Mono 13px,
 * 3.6px radius, 5px 7px padding. Always uppercase — the tag IS a label.
 */
type DataTagVariant = 'solid' | 'outline';

type DataTagProps = {
  variant?: DataTagVariant;
  children: ReactNode;
  className?: string;
} & Omit<ComponentPropsWithoutRef<'span'>, 'className' | 'children'>;

const base =
  'inline-flex items-center font-jetbrains-mono text-[13px] uppercase ' +
  'tracking-[0.06em] rounded-md ';

const variants: Record<DataTagVariant, string> = {
  solid: 'px-[var(--spacing-7)] py-[var(--spacing-5)] bg-lime-surveyor text-obsidian-loam',
  outline:
    'px-[var(--spacing-7)] py-[var(--spacing-5)] bg-transparent text-bone-vellum ' +
    'border border-lime-surveyor',
};

export function DataTag({ variant = 'solid', children, className, ...rest }: DataTagProps) {
  const classes = className ? `${base} ${variants[variant]} ${className}` : `${base} ${variants[variant]}`;
  return (
    <span className={classes} {...rest}>
      {children}
    </span>
  );
}
