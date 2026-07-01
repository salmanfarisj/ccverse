'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/** Moves focus to #main on route change for keyboard/screen-reader users. */
export function RouteFocusManager() {
  const pathname = usePathname();

  useEffect(() => {
    const main = document.getElementById('main');
    if (main) {
      if (!main.hasAttribute('tabindex')) {
        main.setAttribute('tabindex', '-1');
      }
      main.focus({ preventScroll: true });
      return;
    }
    const heading = document.querySelector('main h1, h1');
    if (heading instanceof HTMLElement) {
      if (!heading.hasAttribute('tabindex')) {
        heading.setAttribute('tabindex', '-1');
      }
      heading.focus({ preventScroll: true });
    }
  }, [pathname]);

  return null;
}
