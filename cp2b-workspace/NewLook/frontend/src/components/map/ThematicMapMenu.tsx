'use client';

/**
 * ThematicMapMenu — the thematic maps as ONE button in the map's top row
 * (desktop). It replaces, from md up, the full-width ribbon of ThematicMapBar,
 * which took a whole row above the search, the state and the scenario: two
 * rows of controls over the map. The ribbon stays on phones, where its chips
 * are the navigation.
 *
 * The button opens one panel with every category as a section, the same
 * presets and the same apply handler (MapComponent.handleApplyPreset). The
 * active map's name rides on the button, so the visitor sees which map is on
 * without opening anything.
 */

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, ChevronDown, Map as MapIcon } from 'lucide-react';
import {
  THEMATIC_PRESETS,
  PRESET_GROUP_META,
  type ThematicPreset,
} from '@/data/thematicPresets';
import { MAP_PALETTES } from '@/lib/mapMetrics';

function rampGradient(palette?: ThematicPreset['config']['palette']): string {
  const ramp = palette ? MAP_PALETTES[palette].ramp : MAP_PALETTES.ylgnbu.ramp;
  return `linear-gradient(to right, ${ramp.join(',')})`;
}

interface ThematicMapMenuProps {
  activePresetId?: string | null;
  onApplyPreset: (preset: ThematicPreset) => void;
  disabledBiomassTypes?: Array<NonNullable<ThematicPreset['config']['biomassType']>>;
  disabledResidues?: Array<NonNullable<ThematicPreset['config']['selectedResidues']>[number]>;
}

export default function ThematicMapMenu({
  activePresetId,
  onApplyPreset,
  disabledBiomassTypes = [],
  disabledResidues = [],
}: ThematicMapMenuProps) {
  const t = useTranslations('Map.thematic');
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      // Handled here: the map's own Escape (clear the selection) skips it.
      event.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // On open, focus goes to the active map (or the first one), so the keyboard
  // starts inside the panel instead of behind it.
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const target =
      panel?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]:not(:disabled)') ??
      panel?.querySelector<HTMLButtonElement>('button:not(:disabled)');
    target?.focus();
  }, [open]);

  const active = activePresetId ? THEMATIC_PRESETS.find((p) => p.id === activePresetId) : undefined;

  return (
    <div ref={rootRef} className="surface-light relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`flex min-h-11 max-w-[16rem] items-center gap-2 border px-3 text-sm font-semibold shadow-md backdrop-blur transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-terra-600 ${
          open ? 'border-line-strong bg-paper-raised text-ink' : 'border-line bg-paper-raised/95 text-ink hover:bg-paper-raised'
        }`}
      >
        <MapIcon className="h-4 w-4 shrink-0 text-terra-800" aria-hidden="true" />
        {/* Below 2xl (window width; the map itself is ~1000 px at 1280) the row is tight: "Temas", or the active map's name. */}
        <span className="truncate">
          {active ? (
            t(`presets.${active.id}.label`)
          ) : (
            <>
              <span className="2xl:hidden">{t('short_title')}</span>
              <span className="hidden 2xl:inline">{t('title')}</span>
            </>
          )}
        </span>
        <ChevronDown aria-hidden="true" className={`h-3.5 w-3.5 shrink-0 text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label={t('title')}
          className="absolute left-0 top-full z-20 mt-1 max-h-[70vh] w-80 overflow-y-auto border border-line bg-paper-raised py-1 shadow-xl"
        >
          {PRESET_GROUP_META.map(({ group }) => {
            const items = THEMATIC_PRESETS.filter((p) => p.group === group);
            if (items.length === 0) return null;
            return (
              <section key={group} className="py-1" aria-label={t(`group_labels.${group}`)}>
                <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                  {t(`group_labels.${group}`)}
                </p>
                {items.map((preset) => {
                  const isActive = activePresetId === preset.id;
                  const disabled =
                    (preset.config.biomassType ? disabledBiomassTypes.includes(preset.config.biomassType) : false) ||
                    (preset.config.selectedResidues?.some((r) => disabledResidues.includes(r)) ?? false);
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      aria-pressed={isActive}
                      disabled={disabled}
                      onClick={() => {
                        onApplyPreset(preset);
                        setOpen(false);
                        buttonRef.current?.focus();
                      }}
                      title={
                        disabled
                          ? t('validating_tooltip', { description: t(`presets.${preset.id}.description`) })
                          : t(`presets.${preset.id}.description`)
                      }
                      className={`flex min-h-11 w-full items-center gap-2 border-l-2 px-3 py-1.5 text-left transition-colors focus:outline-none focus-visible:bg-paper-sunken ${
                        disabled
                          ? 'cursor-not-allowed border-transparent opacity-45'
                          : isActive
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
                          className="mt-1 block h-1 w-full"
                          style={{ background: rampGradient(preset.config.palette) }}
                        />
                      </span>
                      {disabled && (
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-ink-muted">
                          {t('validating_badge')}
                        </span>
                      )}
                      {isActive && <Check className="h-3.5 w-3.5 shrink-0 text-terra-600" aria-hidden="true" />}
                    </button>
                  );
                })}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
