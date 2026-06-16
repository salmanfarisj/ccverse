import Link from 'next/link';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

/**
 * Ghost Text Button — DESIGN.md §"Ghost Text Button".
 *
 * Transparent background, text #f4f3e8, 1px #404040 border, JetBrains Mono
 * 14px, 3.6px radius. Used for nav items and secondary actions. Per
 * DESIGN.md "Don't"s we never introduce a second accent color — on hover
 * the border steps up to bone-vellum to keep the system binary.
 */
type GhostButtonProps = {
  href?: string;
  children: ReactNode;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
} & Omit<ComponentPropsWithoutRef<'button'>, 'children' | 'className' | 'type'>;

const base =
  'inline-flex items-center justify-center font-jetbrains-mono text-[14px] uppercase ' +
  'tracking-[0.06em] rounded-md px-[18px] py-[14px] ' +
  'bg-transparent !text-bone-vellum border border-iron-filings ' +
  'transition-colors hover:border-bone-vellum ' +
  '!no-underline ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

export function GhostButton({
  href,
  children,
  className,
  type = 'button',
  ...rest
}: GhostButtonProps) {
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
