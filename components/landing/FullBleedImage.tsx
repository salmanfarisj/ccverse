import Image from 'next/image';
import type { ImgHTMLAttributes } from 'react';

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
  const wrapper = className ? `relative w-screen ${className}` : 'relative w-screen';
  if (!src) {
    // No asset yet — render a solid obsidian band at the requested aspect.
    return (
      <div
        role="presentation"
        aria-hidden="true"
        className={wrapper}
        style={{ aspectRatio: aspect.toString() }}
      />
    );
  }
  return (
    <div className={wrapper} style={{ aspectRatio: aspect.toString() }}>
      <Image src={src} alt={alt} fill sizes="100vw" priority={false} className="object-cover" />
    </div>
  );
}
