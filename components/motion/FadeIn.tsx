'use client';

import { m } from 'motion/react';
import type { ReactNode } from 'react';
import { DISTANCE, DURATION, EASE_OUT, VIEWPORT } from '@/lib/motion/tokens';
import { useReducedMotion } from '@/lib/motion/useReducedMotion';

type FadeInProps = {
  children: ReactNode;
  className?: string;
  /** Mount animation instead of scroll reveal. */
  onMount?: boolean;
  delay?: number;
};

export function FadeIn({ children, className, onMount = false, delay = 0 }: FadeInProps) {
  const reduced = useReducedMotion();

  const initial = { opacity: reduced ? 1 : 0, y: reduced ? 0 : DISTANCE };
  const animate = { opacity: 1, y: 0 };
  const transition = {
    duration: reduced ? 0 : DURATION.base,
    ease: EASE_OUT,
    delay: reduced ? 0 : delay,
  };

  if (onMount) {
    return (
      <m.div className={className} initial={initial} animate={animate} transition={transition}>
        {children}
      </m.div>
    );
  }

  return (
    <m.div
      className={className}
      initial={initial}
      whileInView={animate}
      viewport={VIEWPORT}
      transition={transition}
    >
      {children}
    </m.div>
  );
}
