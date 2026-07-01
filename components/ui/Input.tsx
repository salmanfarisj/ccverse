import { forwardRef, useId } from 'react';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

/**
 * Input — DESIGN.md §"Input Field".
 *
 * Transparent background, bottom-border only (1px #404040), NB International
 * Pro 14px #f4f3e8 text, placeholder #84837b. The underline IS the field —
 * no fill, no radius. Labels sit above in JetBrains Mono per the
 * "all UI labels in JetBrains Mono" rule.
 */
type InputProps = {
  label: string;
  error?: string;
  hint?: ReactNode;
  className?: string;
} & Omit<ComponentPropsWithoutRef<'input'>, 'className'>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, id, className, ...rest },
  ref,
) {
  // Fall back to a useId-derived id so every input has a stable id even if
  // the caller forgets — required for label/input association (a11y).
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  return (
    <div
      className={
        className
          ? `flex flex-col gap-[var(--spacing-7)] ${className}`
          : 'flex flex-col gap-[var(--spacing-7)]'
      }
    >
      <label
        htmlFor={inputId}
        className="font-jetbrains-mono text-[13px] uppercase tracking-[0.06em] text-bone-vellum"
      >
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined
        }
        className={
          'w-full bg-transparent text-[14px] font-nb-international-pro ' +
          'text-bone-vellum placeholder:text-drift-ash ' +
          'border-0 border-b border-iron-filings ' +
          'rounded-none px-0 py-[var(--spacing-7)] ' +
          'focus:outline-none focus:border-lime-surveyor ' +
          (error ? 'border-drift-ash' : '')
        }
        {...rest}
      />
      {hint && !error ? (
        <p id={hintId} className="font-jetbrains-mono text-[13px] text-drift-ash">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="font-jetbrains-mono text-[13px] text-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
});
