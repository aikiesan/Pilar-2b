'use client';

/**
 * A figure that counts to its new value when it changes in place (a new
 * scenario, a new pick), so the eye sees how far it moved.
 *
 * - Shown for the first time, it stands still: only a change counts.
 * - Every frame goes through the caller's `format`, so the locale, the unit
 *   and the decimals hold while it counts.
 * - A screen reader hears the final value once: the counting text is
 *   aria-hidden and the value beside it, visually hidden, is the final one.
 * - A change mid-count starts from the value on screen.
 * - With reduced motion it swaps at once.
 *
 * Timing: --motion-count and --ease-change (globals.css, "Map motion").
 */
import { useEffect, useState } from 'react';
import { motionMs, prefersReducedMotion } from '@/lib/mapMotion';

interface Count {
  from: number;
  to: number;
  now: number;
}

/** easeOutCubic: --ease-change's shape, fast at first, settling on the value. */
const settle = (t: number) => 1 - (1 - t) ** 3;

/** The value to show: `value` itself, or a step on the way to it. */
export function useCountUp(value: number | null): number | null {
  const [seen, setSeen] = useState(value);
  const [count, setCount] = useState<Count | null>(null);
  const onScreen = count ? count.now : seen;

  // Adjusting state while rendering (React's pattern for a prop change).
  if (seen !== value) {
    setSeen(value);
    const counts = value !== null && onScreen !== null && Number.isFinite(value) && Number.isFinite(onScreen) && !prefersReducedMotion();
    setCount(counts ? { from: onScreen, to: value, now: onScreen } : null);
  }

  const from = count?.from;
  const to = count?.to;
  useEffect(() => {
    if (from === undefined || to === undefined) return;
    const duration = motionMs('--motion-count', 300);
    let start: number | null = null;
    let frame = requestAnimationFrame(function step(time) {
      start ??= time;
      const t = Math.min(1, (time - start) / duration);
      if (t < 1) {
        setCount({ from, to, now: from + (to - from) * settle(t) });
        frame = requestAnimationFrame(step);
      } else {
        setCount(null);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [from, to]);

  return count ? count.now : value;
}

export default function CountUp({
  value,
  format,
  className,
}: {
  value: number;
  format: (value: number) => string;
  className?: string;
}) {
  const shown = useCountUp(value) ?? value;
  const counting = shown !== value;
  return (
    <span className={className}>
      <span aria-hidden={counting || undefined}>{format(shown)}</span>
      {counting && <span className="sr-only">{format(value)}</span>}
    </span>
  );
}
