'use client';

/**
 * Moving between pages: the new page's content fades in under the header,
 * which stays put. A template mounts again on every navigation (links, the
 * header's menus, back and forward), so its mount is the arrival.
 *
 * - The visit's first page doesn't fade: the home has its own entrance, and a
 *   page opened from a link is not a change the reader made here.
 * - The map doesn't fade either: the whole Leaflet map would be composited
 *   at partial opacity while it paints its first tiles.
 * - Reduced motion: no fade.
 *
 * A plain fade on <main> rather than a view transition: Next 16 still keeps
 * those behind an experimental flag, and one would snapshot the whole map on
 * the way out of /map.
 */
import { useLayoutEffect, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { motionEasing, motionMs, prefersReducedMotion } from '@/lib/mapMotion';

/** The page shown before this one in this visit (null on the first). */
let lastPath: string | null = null;

const isMapPage = (path: string) => /\/map\/?$/.test(path);

export default function Template({ children }: { children: ReactNode }) {
  const path = usePathname();

  useLayoutEffect(() => {
    const from = lastPath;
    lastPath = path;
    // A second run for the same page (React's dev double mount) is no arrival.
    if (from === null || from === path) return;
    const main = document.getElementById('main-content');
    if (!main || typeof main.animate !== 'function') return;
    if (isMapPage(path) || prefersReducedMotion()) {
      // Arriving at the map mid-fade: it shows whole at once.
      main.getAnimations().forEach((fade) => fade.cancel());
      return;
    }
    // A page left mid-fade: the next one starts from the opacity on screen.
    // <main> outlives the pages, so a fade is never cut by a clean-up; it
    // only ever gives way to the next one.
    const start = parseFloat(getComputedStyle(main).opacity);
    main.getAnimations().forEach((fade) => fade.cancel());
    main.animate([{ opacity: Number.isFinite(start) && start < 1 ? start : 0 }, { opacity: 1 }], {
      duration: motionMs('--motion-base', 220),
      easing: motionEasing('--ease-enter', 'ease-out'),
    });
  }, [path]);

  return children;
}
