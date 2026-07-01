/** Shared motion constants — INVERSA-aligned: short, ease-out, no bounce. */

export const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const DURATION = {
  fast: 0.2,
  base: 0.4,
  slow: 0.5,
} as const;

export const DISTANCE = 12;

export const CHILD_DELAY = 0.06;

export const VIEWPORT = { once: true, margin: '-10%' } as const;
