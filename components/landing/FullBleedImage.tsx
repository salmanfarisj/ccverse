'use client';

import Image from 'next/image';
import { m, useScroll, useTransform } from 'motion/react';
import { useRef, type ImgHTMLAttributes } from 'react';
import { DURATION } from '@/lib/motion/tokens';
import { useReducedMotion } from '@/lib/motion/useReducedMotion';

/**
 * Full-Bleed Image Band — DESIGN.md §"Full-Bleed Image Band".
 *
 * Edge-to-edge photographic imagery with zero radius, zero border, zero
 * overlay. Spans 100vw. Used as a section separator or to provide the only
 * color in the system outside the lime accent.
 *
 * When `src` is omitted we render a solid obsidian-loam band so the layout
 * doesn't collapse. The phase doc USER DEPENDENCY (Brand assets) is the
 * blocker for real photography landing in `public/`.
 */
type FullBleedImageProps = {
  src?: string;
  alt?: string;
  /** Aspect-ratio width / height. Default is cinematic 21:9. */
  aspect?: number;
  className?: string;
} & Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt' | 'className'>;

const DEFAULT_ASPECT = 21 / 9;

export function FullBleedImage({
  src,
  alt = '',
  aspect = DEFAULT_ASPECT,
  className,
}: FullBleedImageProps) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const scale = useTransform(scrollYProgress, [0, 1], reduced ? [1, 1] : [1, 1.04]);

  const wrapper = className ? `relative w-screen overflow-hidden ${className}` : 'relative w-screen overflow-hidden';

  if (!src) {
    // No asset yet — render a solid obsidian band at the requested aspect.
    return (
      <div
        ref={ref}
        role="presentation"
        aria-hidden="true"
        className={`${wrapper} bg-obsidian-loam`}
        style={{ aspectRatio: aspect.toString() }}
      />
    );
  }

  return (
    <m.div
      ref={ref}
      className={wrapper}
      style={{ aspectRatio: aspect.toString() }}
      initial={{ opacity: reduced ? 1 : 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-10%' }}
      transition={{ duration: reduced ? 0 : DURATION.slow }}
    >
      <m.div className="absolute inset-0" style={{ scale }}>
        <Image src={src} alt={alt} fill sizes="100vw" priority={false} className="object-cover" />
      </m.div>
    </m.div>
  );
}
