'use client';

/**
 * ThematicMapBar — the thematic maps, surfaced DIRECTLY on the map.
 *
 * A slim ribbon pinned to the top of the map area. Instead of a long flat rail,
 * the maps are condensed into CATEGORY chips (Setoriais · Por resíduo · Energia
 * · Logística · Análises); each chip is a dropdown — same drop-it-down pattern
 * as the basemap switcher — that opens a vertical list of the ready-made maps in
 * that category. One click applies the map to the live view via the same handler
 * the sidebar uses (MapComponent.handleApplyPreset).
 *
 * This keeps the "test drive" obvious (categories are always visible, inviting
 * exploration) while staying compact as the catalogue of maps grows.
 */

import React, { useState } from 'react';
import {
  THEMATIC_PRESETS,
  PRESET_GROUP_META,
  type ThematicPreset,
  type ThematicPresetGroup,
} from '@/data/thematicPresets';
import { MAP_PALETTES } from '@/lib/mapMetrics';

function rampGradient(presetPalette?: ThematicPreset['config']['palette']): string {
  const ramp = presetPalette ? MAP_PALETTES[presetPalette].ramp : MAP_PALETTES.ylgnbu.ramp;
  return `linear-gradient(to right, ${ramp.join(',')})`;
}

interface ThematicMapBarProps {
  activePresetId?: string | null;
  onApplyPreset: (preset: ThematicPreset) => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

export default function ThematicMapBar({
  activePresetId,
  onApplyPreset,
  collapsed = false,
  onToggleCollapsed,
}: ThematicMapBarProps) {
  const [openGroup, setOpenGroup] = useState<ThematicPresetGroup | null>(null);

  const activeGroup = activePresetId
    ? THEMATIC_PRESETS.find((p) => p.id === activePresetId)?.group ?? null
    : null;

  const apply = (preset: ThematicPreset) => {
    onApplyPreset(preset);
    setOpenGroup(null);
  };

  return (
    <div className="pointer-events-auto w-full border-b border-gray-200 bg-white/92 shadow-sm backdrop-blur">
      {/* Click-away backdrop: any click outside an open dropdown closes it. */}
      {openGroup && (
        <div className="fixed inset-0 z-0" aria-hidden="true" onClick={() => setOpenGroup(null)} />
      )}

      <div className="relative z-10 flex items-center gap-1.5 px-2 py-1.5">
        {/* Leading label + collapse toggle */}
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-bold uppercase tracking-wide text-gray-500 hover:bg-gray-100 md:min-h-0 md:min-w-0"
          title={collapsed ? 'Mostrar mapas temáticos' : 'Ocultar mapas temáticos'}
          aria-expanded={!collapsed}
        >
          <span aria-hidden="true">🗺️</span>
          <span className="hidden sm:inline">Mapas temáticos</span>
          <span aria-hidden="true" className="text-gray-400">{collapsed ? '▸' : '▾'}</span>
        </button>

        {!collapsed && (
          <div className="flex flex-wrap items-center gap-1.5">
            {PRESET_GROUP_META.map(({ group, label, icon }) => {
              const items = THEMATIC_PRESETS.filter((p) => p.group === group);
              if (items.length === 0) return null;
              const isOpen = openGroup === group;
              const isActive = activeGroup === group;
              return (
                <div key={group} className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenGroup(isOpen ? null : group)}
                    aria-expanded={isOpen}
                    aria-haspopup="listbox"
                    className={`flex min-h-11 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors md:min-h-0 ${
                      isActive
                        ? 'bg-green-700 text-white shadow-sm'
                        : isOpen
                          ? 'bg-gray-100 text-gray-800 ring-1 ring-gray-300'
                          : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span aria-hidden="true">{icon}</span>
                    <span>{label}</span>
                    <span aria-hidden="true" className={`text-[9px] transition-transform ${isOpen ? 'rotate-180' : ''}`}>▾</span>
                  </button>

                  {isOpen && (
                    <div
                      role="listbox"
                      aria-label={label}
                      className="absolute left-0 top-full z-20 mt-1 max-h-[60vh] w-60 overflow-y-auto rounded-xl bg-white p-1.5 shadow-xl ring-1 ring-black/10"
                    >
                      {items.map((preset) => {
                        const active = activePresetId === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            role="option"
                            aria-selected={active}
                            onClick={() => apply(preset)}
                            title={preset.description}
                            className={`flex min-h-11 w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors md:min-h-0 ${
                              active ? 'bg-green-50 ring-1 ring-green-600' : 'hover:bg-gray-50'
                            }`}
                          >
                            <span aria-hidden="true" className="text-base leading-none">{preset.icon}</span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[11px] font-semibold text-gray-800">
                                {preset.label}
                              </span>
                              <span
                                aria-hidden="true"
                                className="mt-1 block h-1 w-full rounded-full"
                                style={{ background: rampGradient(preset.config.palette) }}
                              />
                            </span>
                            {active && <span aria-hidden="true" className="text-[10px] text-green-700">✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
