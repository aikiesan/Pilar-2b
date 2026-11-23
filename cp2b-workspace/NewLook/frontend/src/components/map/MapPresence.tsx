'use client';

/**
 * Keeps a map window on screen for its exit, so it leaves the way it came
 * (`map-window` in globals.css) instead of vanishing.
 *
 * While it leaves it shows what it showed last: the props of a closing window
 * are already cleared (Compare's pair, Cruzar's analysis), and redrawing it
 * empty for 160 ms would flash. It is inert meanwhile, so neither the pointer
 * nor a screen reader reaches a window that is going away. With reduced motion
 * it goes at once.
 *
 * The wrapper is `display: contents`, so the window keeps its own place in the
 * map's layout.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { MAP_EXIT_MS, prefersReducedMotion } from '@/lib/mapMotion';

type Phase = 'shown' | 'leaving' | 'gone';

export default function MapPresence({ show, children }: { show: boolean; children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>(show ? 'shown' : 'gone');
  const last = useRef<ReactNode>(children);

  // Adjusting state while rendering (React's pattern for a prop change).
  if (show && phase !== 'shown') setPhase('shown');
  if (!show && phase === 'shown') setPhase(prefersReducedMotion() ? 'gone' : 'leaving');

  useEffect(() => {
    if (show) last.current = children;
  });

  useEffect(() => {
    if (phase !== 'leaving') return;
    const timer = window.setTimeout(() => setPhase('gone'), MAP_EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [phase]);

  if (phase === 'gone') return null;
  const leaving = phase === 'leaving';
  return (
    <div className="map-presence contents" data-leaving={leaving ? '' : undefined} inert={leaving}>
      {/* eslint-disable-next-line react-hooks/refs -- the last frame shown, read only while leaving */}
      {leaving ? last.current : children}
    </div>
  );
}
