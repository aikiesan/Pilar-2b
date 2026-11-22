'use client';

/**
 * A muted background loop for the landing page, with its own pause button.
 *
 * - Stays on its poster when the reader asks for reduced motion.
 * - Plays only while on screen, so three loops never decode at once.
 * - The pause button is required: WCAG 2.2.2 for motion that runs over 5 s.
 *
 * The clips are stock footage under the Pexels licence (free to use, no
 * attribution required), re-encoded for the web by scripts/encode-home-media.sh.
 * They are not in the repository: see src/lib/mediaUrl.ts for where they live.
 */

import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Pause, Play } from 'lucide-react';
import { mediaUrl } from '@/lib/mediaUrl';

interface Props {
  /** Base name under media /home: `<name>.mp4` and `<name>.jpg`. */
  name: string;
  /** Smaller encode for phones, same naming. */
  smallName?: string;
  pauseLabel: string;
  playLabel: string;
  className?: string;
  /** Where the pause button sits. */
  controlClassName?: string;
  /** The playhead, in seconds, as the video reports it. */
  onTime?: (seconds: number) => void;
}

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia?.(REDUCED_MOTION);
  query?.addEventListener?.('change', onChange);
  return () => query?.removeEventListener?.('change', onChange);
}
const reducedMotion = () => window.matchMedia?.(REDUCED_MOTION).matches ?? false;

export default function HomeVideo({ name, smallName, pauseLabel, playLabel, className = '', controlClassName = 'top-4 right-4', onTime }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const reduce = useSyncExternalStore(subscribeReducedMotion, reducedMotion, () => false);
  // The reader's own choice wins over the motion setting, and scrolling back
  // into view never restarts a loop they paused.
  const [choice, setChoice] = useState<'play' | 'pause' | null>(null);
  const paused = choice ? choice === 'pause' : reduce;

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (paused) {
      video.pause();
      return;
    }
    if (typeof IntersectionObserver === 'undefined') {
      void video.play().catch(() => undefined);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void video.play().catch(() => undefined);
        else video.pause();
      },
      { threshold: 0.15 }
    );
    io.observe(video);
    return () => io.disconnect();
  }, [paused]);

  return (
    <>
      <video
        ref={ref}
        className={`absolute inset-0 h-full w-full object-cover ${className}`}
        poster={mediaUrl(`/home/${name}.jpg`)}
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
        tabIndex={-1}
        onTimeUpdate={onTime ? (e) => onTime(e.currentTarget.currentTime) : undefined}
      >
        {smallName && <source src={mediaUrl(`/home/${smallName}.mp4`)} type="video/mp4" media="(max-width: 767px)" />}
        <source src={mediaUrl(`/home/${name}.mp4`)} type="video/mp4" />
      </video>
      <button
        type="button"
        onClick={() => setChoice(paused ? 'play' : 'pause')}
        aria-label={paused ? playLabel : pauseLabel}
        title={paused ? playLabel : pauseLabel}
        className={`absolute z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition-colors hover:bg-black/55 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/40 ${controlClassName}`}
      >
        {paused ? <Play className="h-4 w-4" aria-hidden="true" /> : <Pause className="h-4 w-4" aria-hidden="true" />}
      </button>
    </>
  );
}
