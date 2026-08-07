'use client';

/**
 * ThematicMapBar — the thematic maps, surfaced DIRECTLY on the map.
 *
 * A slim, always-visible, horizontally-scrollable ribbon of theme chips pinned
 * to the top of the map area. This is the "test drive": any visitor sees the
 * ready-made maps immediately and clicks through them out of curiosity — no tab
 * to discover, no menu to open. One click applies the theme to the live map via
 * the same handler the sidebar uses (MapComponent.handleApplyPreset).
 *
 * The chips are grouped (setoriais · por resíduo · energia · logística) with a
 * thin divider between groups; each carries its palette as a colour underline so
 * the ribbon itself previews what the map will look like.
 */

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  THEMATIC_PRESETS,
  PRESET_GROUP_LABELS,
  type ThematicPreset,
  type ThematicPresetGroup,
} from '@/data/thematicPresets';
import { MAP_PALETTES } from '@/lib/mapMetrics';

const GROUP_ORDER: ThematicPresetGroup[] = ['setorial', 'residuo', 'energia', 'logistica'];

function rampGradient(presetPalette?: ThematicPreset['config']['palette']): string {
  const ramp = presetPalette ? MAP_PALETTES[presetPalette].ramp : MAP_PALETTES.ylgnbu.ramp;
  return `linear-gradient(to right, ${ramp.join(',')})`;
}

interface ThematicMapBarProps {
  activePresetId?: string | null;
  onApplyPreset: (preset: ThematicPreset) => void;
  /** Collapsed state is owned by the parent so it can be toggled from a chip. */
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

export default function ThematicMapBar({
  activePresetId,
  onApplyPreset,
  collapsed = false,
  onToggleCollapsed,
}: ThematicMapBarProps) {
  const scrollerRef = React.useRef<HTMLDivElement>(null);

  const nudge = (dir: -1 | 1) => {
    scrollerRef.current?.scrollBy({ left: dir * 280, behavior: 'smooth' });
  };

  return (
    <div className="pointer-events-auto w-full border-b border-gray-200 bg-white/92 shadow-sm backdrop-blur">
      <div className="flex items-center gap-1 px-2 py-1.5">
        {/* Leading label + collapse toggle */}
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-bold uppercase tracking-wide text-gray-500 hover:bg-gray-100"
          title={collapsed ? 'Mostrar mapas temáticos' : 'Ocultar mapas temáticos'}
          aria-expanded={!collapsed}
        >
          <span aria-hidden="true">🗺️</span>
          <span className="hidden sm:inline">Mapas temáticos</span>
          <span aria-hidden="true" className="text-gray-400">{collapsed ? '▸' : '▾'}</span>
        </button>

        {!collapsed && (
          <>
            <button
              type="button"
              onClick={() => nudge(-1)}
              aria-label="Rolar temas para a esquerda"
              className="hidden shrink-0 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 md:block"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* Scrollable chip rail */}
            <div
              ref={scrollerRef}
              className="flex flex-1 items-stretch gap-3 overflow-x-auto scroll-smooth px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              role="listbox"
              aria-label="Mapas temáticos prontos"
            >
              {GROUP_ORDER.map((g, gi) => {
                const items = THEMATIC_PRESETS.filter((p) => p.group === g);
                if (items.length === 0) return null;
                return (
                  <div key={g} className="flex items-center gap-1.5">
                    {gi > 0 && <span aria-hidden="true" className="mx-0.5 h-7 w-px shrink-0 bg-gray-200" />}
                    <span className="shrink-0 select-none text-[8px] font-bold uppercase tracking-wider text-gray-300">
                      {PRESET_GROUP_LABELS[g]}
                    </span>
                    {items.map((preset) => {
                      const active = activePresetId === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          role="option"
                          aria-selected={active}
                          onClick={() => onApplyPreset(preset)}
                          title={preset.description}
                          className={`group flex shrink-0 flex-col items-center gap-1 rounded-lg border px-2.5 py-1 transition-all ${
                            active
                              ? 'border-green-600 bg-green-50 shadow-sm ring-1 ring-green-600'
                              : 'border-gray-200 bg-white hover:border-green-300 hover:bg-gray-50'
                          }`}
                        >
                          <span className="flex items-center gap-1 whitespace-nowrap text-[11px] font-semibold text-gray-800">
                            <span aria-hidden="true" className="text-sm leading-none">{preset.icon}</span>
                            {preset.label}
                          </span>
                          <span
                            aria-hidden="true"
                            className="h-1 w-full rounded-full"
                            style={{ background: rampGradient(preset.config.palette) }}
                          />
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => nudge(1)}
              aria-label="Rolar temas para a direita"
              className="hidden shrink-0 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 md:block"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
