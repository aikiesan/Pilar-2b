'use client';

/**
 * BasemapControl — floating basemap switcher (Mapa / Satélite / Terreno / Light).
 *
 * A pure overlay: it only reports the chosen BasemapId upward. The actual
 * TileLayer swap happens inside MapComponent's MapContainer, since tile layers
 * must be children of the Leaflet map. Collapsed to a single pill by default so
 * it barely touches the map; taps open the four options. No dark canvas by
 * product decision — see data/basemaps.ts.
 */

import React, { useState } from 'react';
import { BASEMAPS, BASEMAP_ORDER, type BasemapId } from '@/data/basemaps';

interface BasemapControlProps {
  value: BasemapId;
  onChange: (id: BasemapId) => void;
}

export default function BasemapControl({ value, onChange }: BasemapControlProps) {
  const [open, setOpen] = useState(false);
  const active = BASEMAPS[value];

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Trocar mapa base"
        title="Mapa base"
        className="flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-lg ring-1 ring-black/5 backdrop-blur transition-colors hover:bg-white"
      >
        <span aria-hidden="true">{active.icon}</span>
        <span className="hidden sm:inline">{active.label}</span>
        <span aria-hidden="true" className={`text-[9px] text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>

      {open && (
        <div
          role="radiogroup"
          aria-label="Mapa base"
          className="flex flex-col gap-0.5 rounded-xl bg-white/95 p-1.5 shadow-xl ring-1 ring-black/5 backdrop-blur"
        >
          {BASEMAP_ORDER.map((id) => {
            const b = BASEMAPS[id];
            const isActive = id === value;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => {
                  onChange(id);
                  setOpen(false);
                }}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-green-700 text-white shadow-sm'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span aria-hidden="true" className="text-sm">{b.icon}</span>
                <span className="flex-1">{b.label}</span>
                {isActive && <span aria-hidden="true" className="text-[10px]">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
