import { CHILD_DELAY, DISTANCE, DURATION, EASE_OUT } from '@/lib/motion/tokens';

/** Fade-up variant for mount / stagger children. */
export function fadeUp(reduced: boolean) {
  return {
    hidden: { opacity: reduced ? 1 : 0, y: reduced ? 0 : DISTANCE },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: reduced ? 0 : DURATION.base, ease: EASE_OUT },
    },
  };
}

/** Parent stagger container. */
export function staggerContainer(reduced: boolean) {
  return {
    hidden: {},
    show: {
      transition: reduced ? { duration: 0 } : { staggerChildren: CHILD_DELAY },
    },
  };
}

/** Modal backdrop fade. */
export function backdropVariants(reduced: boolean) {
  return {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: reduced ? 0 : DURATION.fast } },
    exit: { opacity: 0, transition: { duration: reduced ? 0 : DURATION.fast } },
  };
}

/** Modal panel scale + fade. */
export function panelVariants(reduced: boolean) {
  return {
    hidden: { opacity: reduced ? 1 : 0, scale: reduced ? 1 : 0.98 },
    show: {
      opacity: 1,
      scale: 1,
      transition: { duration: reduced ? 0 : DURATION.base, ease: EASE_OUT },
    },
    exit: {
      opacity: reduced ? 1 : 0,
      scale: reduced ? 1 : 0.98,
      transition: { duration: reduced ? 0 : DURATION.fast },
    },
  };
}

/** Toast enter/exit. */
export function toastVariants(reduced: boolean) {
  return {
    hidden: { opacity: reduced ? 1 : 0, y: reduced ? 0 : 8 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: reduced ? 0 : DURATION.fast, ease: EASE_OUT },
    },
    exit: {
      opacity: reduced ? 1 : 0,
      y: reduced ? 0 : 8,
      transition: { duration: reduced ? 0 : DURATION.fast },
    },
  };
}

/** Mobile nav dropdown. */
export function menuVariants(reduced: boolean) {
  return {
    hidden: { opacity: reduced ? 1 : 0, y: reduced ? 0 : -4 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: reduced ? 0 : DURATION.fast, ease: EASE_OUT },
    },
    exit: {
      opacity: reduced ? 1 : 0,
      y: reduced ? 0 : -4,
      transition: { duration: reduced ? 0 : DURATION.fast },
    },
  };
}

/** List item for grids / tables. */
export function listItemVariants(reduced: boolean, fast = false) {
  const duration = fast ? DURATION.fast : DURATION.base;
  return {
    hidden: { opacity: reduced ? 1 : 0, y: reduced ? 0 : DISTANCE },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: reduced ? 0 : duration, ease: EASE_OUT },
    },
    exit: {
      opacity: reduced ? 1 : 0,
      y: reduced ? 0 : -DISTANCE / 2,
      transition: { duration: reduced ? 0 : DURATION.fast },
    },
  };
}
