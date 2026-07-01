'use client';

import { m } from 'motion/react';
import type { ReactNode } from 'react';
import { fadeUp, staggerContainer } from '@/lib/motion/variants';
import { useReducedMotion } from '@/lib/motion/useReducedMotion';

type StaggerProps = {
  children: ReactNode;
  className?: string;
  /** Mount animation instead of scroll reveal. */
  onMount?: boolean;
};

export function Stagger({ children, className, onMount = false }: StaggerProps) {
  const reduced = useReducedMotion();
  const container = staggerContainer(reduced);

  if (onMount) {
    return (
      <m.div
        className={className}
        variants={container}
        initial="hidden"
        animate="show"
      >
        {children}
      </m.div>
    );
  }

  return (
    <m.div
      className={className}
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-10%' }}
    >
      {children}
    </m.div>
  );
}

type StaggerItemProps = {
  children: ReactNode;
  className?: string;
};

export function StaggerItem({ children, className }: StaggerItemProps) {
  const reduced = useReducedMotion();
  return (
    <m.div className={className} variants={fadeUp(reduced)}>
      {children}
    </m.div>
  );
}
