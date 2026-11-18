'use client';

/**
 * NorthArrow — a small static compass badge.
 *
 * Leaflet never rotates the map, so north is always up; this is a fixed
 * cartographic marker, not a live bearing indicator. Purely decorative/reference
 * (aria-hidden) — it conveys no interactive state.
 */

import React from 'react';

export default function NorthArrow() {
  return (
    <div
      aria-hidden="true"
      title="Norte"
      className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 shadow-lg ring-1 ring-black/5 backdrop-blur"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Upper half (north) filled dark, lower half light — the classic
            two-tone compass needle. */}
        <polygon points="12,2 7.5,13 12,10.5 16.5,13" fill="#0f172a" />
        <polygon points="12,22 7.5,13 12,15.5 16.5,13" fill="#94a3b8" />
        <text
          x="12"
          y="8"
          textAnchor="middle"
          fontSize="6.5"
          fontWeight="700"
          fill="#ffffff"
          fontFamily="system-ui, sans-serif"
        >
          N
        </text>
      </svg>
    </div>
  );
}
