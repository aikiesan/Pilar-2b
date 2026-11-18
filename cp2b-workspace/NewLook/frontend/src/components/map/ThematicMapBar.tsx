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
import { useTranslations } from 'next-intl';
import {
  THEMATIC_PRESETS,
  PRESET_GROUP_META,
  type ThematicPreset,
  type ThematicPresetGroup,
} from '@/data/thematicPresets';
import { MAP_PALETTES } from '@/lib/mapMetrics';
import { Check, ChevronDown, ChevronRight, FlaskConical, Layers, Map as MapIcon, Sprout, Truck, Zap, type LucideIcon } from 'lucide-react';

// Line icons for the category chips (the presets' emoji stay in the data for
// other uses; the bar follows the one-icon-set rule).
const GROUP_ICONS: Record<ThematicPresetGroup, LucideIcon> = {
  setorial: Layers,
  residuo: Sprout,
  energia: Zap,
  logistica: Truck,
  analise: FlaskConical,
};

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


export default function ThematicMapBar({
  activePresetId,
  onApplyPreset,
  disabledBiomassTypes = [],
  disabledResidues = [],
  collapsed = false,
  onToggleCollapsed,
}: ThematicMapBarProps) {
  const t = useTranslations('Map.thematic');
  const tGroupLabel = useTranslations('Map.thematic.groups');
  // Group ids are the stable identifiers; the label is looked up, never the key.
  const tGroups = { setorial: tGroupLabel('setorial'), residuo: tGroupLabel('residuo'), energia: tGroupLabel('energia'), logistica: tGroupLabel('logistica'), analise: tGroupLabel('analise') } as Record<ThematicPresetGroup, string>;
  const [openGroup, setOpenGroup] = useState<ThematicPresetGroup | null>(null);

  const activeGroup = activePresetId
    ? THEMATIC_PRESETS.find((p) => p.id === activePresetId)?.group ?? null
    : null;

  const apply = (preset: ThematicPreset) => {
    onApplyPreset(preset);
    setOpenGroup(null);
  };

  return (
    <div className={`surface-light pointer-events-auto max-w-full border-b border-r border-line bg-paper-raised/95 backdrop-blur md:w-full md:border-r-0 ${collapsed ? 'w-fit' : 'w-full'}`}>
      {/* Click-away backdrop: any click outside an open dropdown closes it. */}
      {openGroup && (
        <div className="fixed inset-0 z-0" aria-hidden="true" onClick={() => setOpenGroup(null)} />
      )}

      <div className="relative z-10 flex max-w-full flex-nowrap items-center gap-0.5 px-1 py-1 md:gap-1.5 md:px-2 md:py-1.5">
        {/* Leading label + collapse toggle */}
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1 px-1 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-terra-600 md:min-h-0 md:min-w-0 md:gap-1.5 md:px-2 md:text-[11px]"
          title={collapsed ? t('show') : t('hide')}
          aria-expanded={!collapsed}
        >
          <MapIcon className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="sm:hidden">{t('short_title')}</span>
          <span className="hidden sm:inline">{t('title')}</span>
          {collapsed
            ? <ChevronRight className="h-3 w-3" aria-hidden="true" />
            : <ChevronDown className="h-3 w-3" aria-hidden="true" />}
        </button>

        {!collapsed && (
          <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-0.5 md:flex-none md:flex-wrap md:gap-1.5">
            {PRESET_GROUP_META.map(({ group }, index) => {
              const Icon = GROUP_ICONS[group];
              const label = t(`group_labels.${group}`);
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
                    className={`flex min-h-11 w-full min-w-0 flex-col items-center justify-center gap-0.5 border px-0.5 py-1 text-[9px] font-medium leading-none transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-terra-600 md:min-h-0 md:w-auto md:flex-row md:gap-1.5 md:px-3 md:py-1.5 md:text-xs ${
                      isActive
                        ? 'border-terra-600 bg-terra-600 text-white'
                        : isOpen
                          ? 'border-line-strong bg-paper-sunken text-ink'
                          : 'border-transparent text-ink-muted hover:border-line hover:text-ink'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0 md:h-3.5 md:w-3.5" aria-hidden="true" />
                    <span className="mt-0.5 truncate md:mt-0">
                      <span className="md:hidden">{tGroups[group]}</span>
                      <span className="hidden md:inline">{label}</span>
                    </span>
                    <ChevronDown aria-hidden="true" className={`hidden h-3 w-3 transition-transform md:inline ${isOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isOpen && (
                    <div
                      role="listbox"
                      aria-label={label}
                      className={`absolute top-full z-20 mt-1 max-h-[60vh] w-64 overflow-y-auto border border-line bg-paper-raised py-1 shadow-xl ${
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
                            title={
                              disabled
                                ? t('validating_tooltip', { description: t(`presets.${preset.id}.description`) })
                                : t(`presets.${preset.id}.description`)
                            }
                            className={`flex min-h-11 w-full items-center gap-2 border-l-2 px-3 py-2 text-left transition-colors focus:outline-none focus-visible:bg-paper-sunken md:min-h-0 ${
                              disabled
                                ? 'cursor-not-allowed border-transparent opacity-45'
                                : active
                                  ? 'border-terra-600 bg-paper-sunken'
                                  : 'border-transparent hover:bg-paper-sunken'
                            }`}
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-xs font-medium text-ink">
                                {t(`presets.${preset.id}.label`)}
                              </span>
                              <span
                                aria-hidden="true"
                                className="mt-1.5 block h-1 w-full"
                                style={{ background: rampGradient(preset.config.palette) }}
                              />
                            </span>
                            {disabled && <span className="text-[9px] font-semibold uppercase tracking-wider text-ink-muted">{t('validating_badge')}</span>}
                            {active && <Check className="h-3.5 w-3.5 shrink-0 text-terra-600" aria-hidden="true" />}
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
