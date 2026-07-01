'use client';

import { AnimatePresence, m } from 'motion/react';
import type { ReactNode } from 'react';
import { DURATION } from '@/lib/motion/tokens';
import { useReducedMotion } from '@/lib/motion/useReducedMotion';

type CrossfadeProps = {
  showContent: boolean;
  skeleton: ReactNode;
  children: ReactNode;
  className?: string;
};

/** Crossfade between skeleton and loaded content. */
export function Crossfade({ showContent, skeleton, children, className }: CrossfadeProps) {
  const reduced = useReducedMotion();
  const duration = reduced ? 0 : DURATION.base;

  return (
    <div className={className}>
      <AnimatePresence mode="wait">
        {showContent ? (
          <m.div
            key="content"
            initial={{ opacity: reduced ? 1 : 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration }}
          >
            {children}
          </m.div>
        ) : (
          <m.div
            key="skeleton"
            initial={{ opacity: 1 }}
            exit={{ opacity: reduced ? 1 : 0 }}
            transition={{ duration: DURATION.fast }}
          >
            {skeleton}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
