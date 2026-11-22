'use client';

/**
 * The home hero's moving picture: one edited loop through the sources of
 * biogas (a biogas plant, livestock, crop residues, sewage), cut into a single file so
 * there is one video, one decoder and one pause button. Under the hero text a
 * row names the source on screen, following the video's clock.
 *
 * The hero text is passed in as children, so it stays server-rendered.
 */

import React, { useState } from 'react';
import HomeVideo from '@/components/home/HomeVideo';

/** Where each source starts in hero.mp4, in seconds (see the encode script). */
const SEGMENTS = [
  { key: 'plant', start: 0, end: 9.5 },
  { key: 'livestock', start: 9.5, end: 14.5 },
  { key: 'crops', start: 14.5, end: 19.5 },
  { key: 'sanitation', start: 19.5, end: 25 },
] as const;

export type HeroSourceKey = (typeof SEGMENTS)[number]['key'];

interface Props {
  children: React.ReactNode;
  pauseLabel: string;
  playLabel: string;
  sourcesLabel: string;
  sourceNames: Record<HeroSourceKey, string>;
}

export default function HeroStage({ children, pauseLabel, playLabel, sourcesLabel, sourceNames }: Props) {
  const [time, setTime] = useState(0);

  return (
    <>
      <HomeVideo
        name="hero"
        smallName="hero-small"
        pauseLabel={pauseLabel}
        playLabel={playLabel}
        className="-z-10"
        controlClassName="top-20 right-4 sm:right-6 lg:right-8"
        onTime={setTime}
      />
      {/* Petrol from the top (under the clear header) and from the bottom-left,
          so the type always sits on a dark field. */}
      <div aria-hidden="true" className="absolute inset-x-0 top-0 -z-10 h-40 bg-gradient-to-b from-dusk-950/70 to-transparent" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-dusk-950/95 via-dusk-900/45 to-dusk-900/10" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-dusk-950/70 via-dusk-950/20 to-transparent" />

      <div className="home-rise mx-auto w-full max-w-7xl px-4 pb-14 pt-36 sm:px-6 sm:pb-16 lg:px-8 lg:pb-20">
        {children}

        {/* Which source is on screen. Decorative for screen readers beyond the
            list itself: the video is aria-hidden, so the names are read once. */}
        <div className="mt-14 hidden max-w-2xl sm:block">
          <p className="sr-only">{sourcesLabel}</p>
          <ol className="grid grid-cols-4 gap-4">
            {SEGMENTS.map(({ key, start, end }) => {
              const progress = Math.min(1, Math.max(0, (time - start) / (end - start)));
              const active = time >= start && time < end;
              return (
                <li key={key} className={`text-sm transition-colors ${active ? 'text-white' : 'text-white/55'}`}>
                  <span aria-hidden="true" className="block h-0.5 w-full bg-white/25">
                    <span
                      className="block h-full bg-cp2b-lima transition-[width] duration-300 ease-linear"
                      style={{ width: `${progress * 100}%` }}
                    />
                  </span>
                  <span className="mt-2 block font-medium">{sourceNames[key]}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </>
  );
}
