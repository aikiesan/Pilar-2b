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
  disabledBiomassTypes?: Array<NonNullable<ThematicPreset['config']['biomassType']>>;
  disabledResidues?: Array<NonNullable<ThematicPreset['config']['selectedResidues']>[number]>;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

const MOBILE_GROUP_LABEL: Record<ThematicPresetGroup, string> = {
  setorial: 'Setor',
  residuo: 'Resíduo',
  energia: 'Energia',
  logistica: 'Logística',
  analise: 'Análises',
};

export default function ThematicMapBar({
  activePresetId,
  onApplyPreset,
  disabledBiomassTypes = [],
  disabledResidues = [],
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
    <div className={`pointer-events-auto max-w-full rounded-br-xl border-b border-r border-gray-200 bg-white/92 shadow-sm backdrop-blur md:w-full md:rounded-none md:border-r-0 ${collapsed ? 'w-fit' : 'w-full'}`}>
      {/* Click-away backdrop: any click outside an open dropdown closes it. */}
      {openGroup && (
        <div className="fixed inset-0 z-0" aria-hidden="true" onClick={() => setOpenGroup(null)} />
      )}

      <div className="relative z-10 flex max-w-full flex-nowrap items-center gap-0.5 px-1 py-1 md:gap-1.5 md:px-2 md:py-1.5">
        {/* Leading label + collapse toggle */}
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-0.5 rounded-md px-1 py-1 text-[10px] font-bold uppercase tracking-tight text-gray-600 hover:bg-gray-100 md:min-h-0 md:min-w-0 md:gap-1 md:px-1.5 md:text-[11px] md:tracking-wide"
          title={collapsed ? 'Mostrar mapas temáticos' : 'Ocultar mapas temáticos'}
          aria-expanded={!collapsed}
        >
          <span aria-hidden="true">🗺️</span>
          <span className="sm:hidden">Temas</span>
          <span className="hidden sm:inline">Mapas temáticos</span>
          <span aria-hidden="true" className="text-gray-400">{collapsed ? '▸' : '▾'}</span>
        </button>

        {!collapsed && (
          <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-0.5 md:flex-none md:flex-wrap md:gap-1.5">
            {PRESET_GROUP_META.map(({ group, label, icon }, index) => {
              const items = THEMATIC_PRESETS.filter((p) => p.group === group);
              if (items.length === 0) return null;
              const isOpen = openGroup === group;
              const isActive = activeGroup === group;
              return (
                <div key={group} className="relative min-w-0 flex-1 md:flex-none">
                  <button
                    type="button"
                    onClick={() => setOpenGroup(isOpen ? null : group)}
                    aria-expanded={isOpen}
                    aria-haspopup="listbox"
                    className={`flex min-h-11 w-full min-w-0 flex-col items-center justify-center gap-0 rounded-lg px-0.5 py-1 text-[9px] font-semibold leading-none transition-colors md:min-h-0 md:w-auto md:flex-row md:gap-1 md:rounded-full md:px-3 md:py-1.5 md:text-xs ${
                      isActive
                        ? 'bg-green-700 text-white shadow-sm'
                        : isOpen
                          ? 'bg-gray-100 text-gray-800 ring-1 ring-gray-300'
                          : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span aria-hidden="true" className="text-sm leading-none md:text-xs">{icon}</span>
                    <span className="mt-0.5 truncate md:mt-0">
                      <span className="md:hidden">{MOBILE_GROUP_LABEL[group]}</span>
                      <span className="hidden md:inline">{label}</span>
                    </span>
                    <span aria-hidden="true" className={`hidden text-[9px] transition-transform md:inline ${isOpen ? 'rotate-180' : ''}`}>▾</span>
                  </button>

                  {isOpen && (
                    <div
                      role="listbox"
                      aria-label={label}
                      className={`absolute top-full z-20 mt-1 max-h-[60vh] w-60 overflow-y-auto rounded-xl bg-white p-1.5 shadow-xl ring-1 ring-black/10 ${
                        index < 2
                          ? 'left-0'
                          : index > 2
                            ? 'right-0 md:right-auto md:left-0'
                            : 'left-1/2 -translate-x-1/2 md:left-0 md:translate-x-0'
                      }`}
                    >
                      {items.map((preset) => {
                        const active = activePresetId === preset.id;
                        const disabledBySector = preset.config.biomassType
                          ? disabledBiomassTypes.includes(preset.config.biomassType)
                          : false;
                        const disabledByResidue = preset.config.selectedResidues?.some((residue) =>
                          disabledResidues.includes(residue),
                        ) ?? false;
                        const disabled = disabledBySector || disabledByResidue;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            role="option"
                            aria-selected={active}
                            disabled={disabled}
                            onClick={() => apply(preset)}
                            title={disabled ? `${preset.description} Em validação para MG.` : preset.description}
                            className={`flex min-h-11 w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors md:min-h-0 ${
                              disabled
                                ? 'cursor-not-allowed bg-gray-50 opacity-45'
                                : active
                                  ? 'bg-green-50 ring-1 ring-green-600'
                                  : 'hover:bg-gray-50'
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
                            {disabled && <span className="text-[9px] font-semibold text-gray-500">EM VALIDAÇÃO</span>}
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
