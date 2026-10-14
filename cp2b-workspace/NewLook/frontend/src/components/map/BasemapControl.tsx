'use client';

/**
 * BasemapControl — floating basemap switcher (map / satellite / terrain / light).
 *
 * A pure overlay: it only reports the chosen BasemapId upward. The actual
 * TileLayer swap happens inside MapComponent's MapContainer, since tile layers
 * must be children of the Leaflet map. Collapsed to a single pill by default so
 * it barely touches the map; taps open the four options. No dark canvas by
 * product decision — see data/basemaps.ts.
 */

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { BASEMAPS, BASEMAP_ORDER, type BasemapId } from '@/data/basemaps';

interface BasemapControlProps {
  value: BasemapId;
  onChange: (id: BasemapId) => void;
}

export default function BasemapControl({ value, onChange }: BasemapControlProps) {
  const t = useTranslations('Map.basemaps');
  const [open, setOpen] = useState(false);
  const active = BASEMAPS[value];

  return (
    <div className="surface-light flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={t('switch')}
        title={t('heading')}
        className="flex min-h-11 min-w-11 items-center justify-center gap-1.5 px-3 py-1.5 border border-line bg-paper-raised/95 text-xs font-semibold text-ink shadow-md backdrop-blur transition-colors hover:bg-paper-raised md:min-h-0 md:min-w-0"
      >
        <span aria-hidden="true">{active.icon}</span>
        <span className="hidden sm:inline">{t(active.id)}</span>
        <span aria-hidden="true" className={`text-[9px] text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>

      {open && (
        <div
          role="radiogroup"
          aria-label={t('heading')}
          className="flex flex-col gap-0.5 rounded-xl bg-paper-raised/95 p-1.5 shadow-xl ring-1 ring-black/5 backdrop-blur"
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
                className={`flex min-h-11 items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs font-medium transition-colors md:min-h-0 ${
                  isActive
                    ? 'bg-terra-700 text-white shadow-sm'
                    : 'text-ink hover:bg-paper-sunken'
                }`}
              >
                <span aria-hidden="true" className="text-sm">{b.icon}</span>
                <span className="flex-1">{t(b.id)}</span>
                {isActive && <span aria-hidden="true" className="text-[10px]">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
