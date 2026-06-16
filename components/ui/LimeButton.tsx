import Link from 'next/link';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

/**
 * Lime Action Button — DESIGN.md §"Lime Action Button".
 *
 * The sole high-saturation element on the page. Background #ebfc72, text
 * #13140e, JetBrains Mono 14px, 3.6px radius, 14px 18px padding, uppercase
 * with tracking. The global `:focus-visible` rule in `app/globals.css` paints
 * a lime-surveyor ring on keyboard focus.
 *
 * Polymorphism: if `href` is provided, renders as a Next.js `Link`; otherwise
 * a `<button>`. No other `as` permutations — keep the surface small.
 */
type LimeButtonProps = {
  href?: string;
  children: ReactNode;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
} & Omit<ComponentPropsWithoutRef<'button'>, 'children' | 'className' | 'type'>;

const base =
  'inline-flex items-center justify-center font-jetbrains-mono text-[14px] uppercase ' +
  'tracking-[0.06em] rounded-md px-[18px] py-[14px] ' +
  'bg-lime-surveyor !text-obsidian-loam ' +
  'transition-colors hover:bg-marsh-olive ' +
  '!no-underline ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

export function LimeButton({
  href,
  children,
  className,
  type = 'button',
  ...rest
}: LimeButtonProps) {
  const classes = className ? `${base} ${className}` : base;
  if (href !== undefined) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
}
