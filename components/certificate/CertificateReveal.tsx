'use client';

import { m } from 'motion/react';
import type { ReactNode } from 'react';
import { CHILD_DELAY, DISTANCE, DURATION, EASE_OUT } from '@/lib/motion/tokens';
import { useReducedMotion } from '@/lib/motion/useReducedMotion';

type CertificateRevealProps = {
  children: ReactNode;
};

/**
 * Sequential reveal for the certificate article. Disabled in print and when
 * the user prefers reduced motion.
 */
export function CertificateReveal({ children }: CertificateRevealProps) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <>{children}</>;
  }

  return (
    <m.article
      className="rounded-md border-2 border-lime-surveyor bg-surface-raised p-10 print:border-black print:bg-white print:text-black"
      initial={{ opacity: 0, scale: 0.99 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: DURATION.base, ease: EASE_OUT }}
    >
      {children}
    </m.article>
  );
}

type CertificateFieldProps = {
  children: ReactNode;
  index: number;
};

export function CertificateField({ children, index }: CertificateFieldProps) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div>{children}</div>;
  }

  return (
    <m.div
      initial={{ opacity: 0, y: DISTANCE / 2 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: DURATION.fast,
        ease: EASE_OUT,
        delay: DURATION.base + index * CHILD_DELAY,
      }}
    >
      {children}
    </m.div>
  );
}

type CertificateSerialProps = {
  children: ReactNode;
  index: number;
  baseDelay?: number;
};

export function CertificateSerial({ children, index, baseDelay = 0.6 }: CertificateSerialProps) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <li>{children}</li>;
  }

  return (
    <m.li
      className="font-jetbrains-mono text-[13px] text-lime-surveyor print:text-black"
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: DURATION.fast,
        ease: EASE_OUT,
        delay: baseDelay + index * 0.04,
      }}
    >
      {children}
    </m.li>
  );
}

/** Header block inside the certificate — fades in after frame. */
export function CertificateHeader({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div className="text-center space-y-4">{children}</div>;
  }

  return (
    <m.div
      className="text-center space-y-4"
      initial={{ opacity: 0, y: DISTANCE }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION.base, ease: EASE_OUT, delay: 0.15 }}
    >
      {children}
    </m.div>
  );
}
