'use client';

import { useReducedMotion as useMotionReducedMotion } from 'motion/react';

/** Motion's hook can return null before hydration — coerce to boolean. */
export function useReducedMotion(): boolean {
  return useMotionReducedMotion() ?? false;
}
