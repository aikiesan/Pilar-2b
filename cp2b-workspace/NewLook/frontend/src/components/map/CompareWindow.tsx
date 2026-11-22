'use client';

/**
 * Compare: the floating window of the map's click tool. Two municipalities
 * side by side, A on the left in orange, B on the right in blue.
 *
 * Landscape (every desktop): a card on the right, under the control row.
 * Portrait (phones): a bottom sheet, like Land around and the profile.
 *
 * The window itself is presentational (CompareWindow); the default export adds
 * each municipality's detail (useMunicipalityMetrics), so the states can be
 * tested without a network. Every other figure comes in through props, from
 * what the map already holds.
 */
import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { Link } from '@/navigation';
import { loginHref } from '@/lib/authRedirect';
import {
  COMPARE_COLORS,
  COMPARE_SECTORS,
  COVER_BAR_COLORS,
  COVER_BAR_GROUPS,
  compareSide,
  type CompareSide,
  type CompareSlot,
} from '@/lib/compare';
import { SECTOR_COLORS } from '@/data/sectorColors';
import { isServedScenario, type MapScenarioKey } from '@/data/scenarioFactors';
import { useMunicipalityMetrics } from '@/hooks/useGeospatialData';
import { useFormat } from '@/hooks/useFormat';
import type { LandCoverResponse } from '@/lib/landCover';
import type { SitingIndicators } from '@/lib/mapAnalyses';
import type { MapToolAccess } from '@/lib/mapToolAccess';
import { writeMapToolParams } from '@/lib/mapTools';
import { ufAbbreviation } from '@/lib/municipalitySearch';
import type { MunicipalityFeature, MunicipalityProperties } from '@/types/geospatial';
import type { ResidueType } from '@/types/map';

const focusRing = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-terra-600 focus-visible:ring-offset-1 focus-visible:ring-offset-paper';
const SLOTS: CompareSlot[] = ['a', 'b'];

export interface CompareWindowProps {
  access: MapToolAccess;
  /** IBGE codes of A and B, as picked. */
  pair: readonly string[];
  /** The figures for each picked code that the map knows; missing while loading. */
  sides: (CompareSide | null)[];
  distanceKm: number | null;
  scenario: MapScenarioKey;
  onRemove: (code: string) => void;
  onClose: () => void;
}

export function CompareWindow({ access, pair, sides, distanceKm, scenario, onRemove, onClose }: CompareWindowProps) {
  const t = useTranslations('Map.compare');
  const tTools = useTranslations('Map.mapTools');
  const tMap = useTranslations('Map');
  const format = useFormat();

  const number = (value: number, decimals = 0) => format.number(value, { decimals });
  const tons = (value: number) => t('tons_value', { value: format.compact(value, { decimals: value >= 1000 ? 1 : 0 }) });
  const residueName = (r: ResidueType) =>
    r === 'rsu' || r === 'rpo' || r === 'sewage' ? tMap(`urbanTotals.streams.${r}`) : tMap(`residues.${r}`);
  const noData = <span className="text-ink-muted">{t('no_data')}</span>;

  const gated = access === 'sign_in' || access === 'pending';
  const both = sides.length === 2 && sides.every(Boolean) ? (sides as CompareSide[]) : null;
  const maxBiomethane = Math.max(0, ...sides.map((s) => s?.biomethane ?? 0));
  const loginNext = `/map?${writeMapToolParams('', { tool: 'compare', compare: { pair: [...pair] } }).toString()}`;

  const cell = (slot: CompareSlot, render: (side: CompareSide) => React.ReactNode) => {
    const side = sides[SLOTS.indexOf(slot)];
    if (side) return render(side);
    return pair[SLOTS.indexOf(slot)] ? <span className="text-ink-muted">{t('loading')}</span> : null;
  };

  /** One comparison row: its label, then A and B in two columns. */
  const row = (key: string, label: string, render: (side: CompareSide, slot: CompareSlot) => React.ReactNode) => (
    <div key={key} className="border-t border-line pt-2">
      <p className="mb-1 text-xs text-ink-muted">{label}</p>
      <div className="grid grid-cols-2 gap-3 text-sm">
        {SLOTS.map((slot) => (
          <div key={slot} className="min-w-0">{cell(slot, (side) => render(side, slot))}</div>
        ))}
      </div>
    </div>
  );

  return (
    <aside
      aria-label={t('window_aria')}
      className="surface-light absolute z-[1101] flex flex-col overflow-y-auto border-line bg-paper text-ink shadow-xl
                 inset-x-0 bottom-0 max-h-[60%] rounded-t-2xl border-t
                 landscape:inset-x-auto landscape:bottom-auto landscape:right-3 landscape:top-16 landscape:z-[999]
                 landscape:max-h-[calc(100%-5rem)] landscape:w-[380px] landscape:rounded-none landscape:border"
    >
      <div className="flex justify-center pt-2 landscape:hidden" aria-hidden="true">
        <span className="h-1.5 w-10 rounded-full bg-line-strong/50" />
      </div>

      <header className="flex items-start gap-2 px-4 pb-2 pt-1 landscape:pt-3">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-bold leading-snug text-ink">{t('title')}</h2>
          {both && distanceKm !== null && (
            <p className="mt-0.5 text-xs tabular-nums text-ink-muted">
              {t('distance', { km: number(distanceKm, distanceKm < 10 ? 1 : 0) })}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('close')}
          title={t('close')}
          className={`-mr-2 flex h-11 w-11 shrink-0 items-center justify-center text-ink-muted transition-colors hover:bg-paper-sunken hover:text-ink active:bg-line/60 ${focusRing}`}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </header>

      <div className="px-4 pb-4">
        {access === 'sign_in' && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-ink">{t('signed_out_title')}</p>
            <p className="text-sm text-ink-muted">{t('signed_out_body')}</p>
            <Link
              href={loginHref(loginNext)}
              className={`inline-flex min-h-11 items-center bg-terra-800 px-4 text-sm font-medium text-white transition-colors hover:bg-terra-900 active:bg-terra-950 ${focusRing}`}
            >
              {t('sign_in')}
            </Link>
          </div>
        )}

        {access === 'pending' && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-ink">{tTools('pending_title')}</p>
            <p className="text-sm text-ink-muted">{tTools('pending_body')}</p>
          </div>
        )}

        {!gated && pair.length === 0 && <p className="text-sm text-ink-muted">{t('idle')}</p>}

        {!gated && pair.length > 0 && (
          <div className="space-y-3">
            {/* Names: a chip in the slot's colour, the letter for colour-blind
                readers, and a button that takes the municipality out. */}
            <div className="grid grid-cols-2 gap-3">
              {SLOTS.map((slot, i) => {
                const side = sides[i];
                const code = pair[i];
                if (!code) {
                  return (
                    <p key={slot} className="self-center text-sm text-ink-muted">{t('pick_b')}</p>
                  );
                }
                const name = side?.name ?? code;
                return (
                  <div key={slot} className="flex min-w-0 items-start gap-1.5">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 bg-paper text-xs font-bold text-ink"
                      style={{ borderColor: COMPARE_COLORS[slot] }}
                    >
                      {slot.toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="break-words font-display text-sm font-bold leading-tight text-ink">
                        <span className="sr-only">{t(`slot_${slot}`)} </span>
                        {name}
                      </p>
                      <p className="text-xs text-ink-muted">{ufAbbreviation(code) ?? ''}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemove(code)}
                      aria-label={t('remove', { name })}
                      title={t('remove', { name })}
                      className={`-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center text-ink-muted transition-colors hover:bg-paper-sunken hover:text-ink active:bg-line/60 ${focusRing}`}
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                );
              })}
            </div>

            {row('rank', t('rows.rank'), (s) =>
              s.rank ? (
                <span className="tabular-nums">
                  {t('rank_value', { position: s.rank.position, of: s.rank.of, uf: ufAbbreviation(s.code) ?? '' })}
                </span>
              ) : noData,
            )}

            {row('biomethane', t('rows.biomethane', { scenario: tMap(isServedScenario(scenario) ? `scenario_${scenario}` : 'scenario_real') }), (s, slot) =>
              s.biomethane === null ? noData : (
                <div>
                  <p className="font-semibold tabular-nums">
                    {t('biomethane_value', { value: number(s.biomethane / 1e6, s.biomethane < 1e7 ? 2 : 1) })}
                  </p>
                  {/* Paired bars on one scale: the larger of the two fills the column. */}
                  <div className="mt-1 h-2 bg-paper-sunken" aria-hidden="true">
                    <div
                      className="land-around-fade h-full origin-left"
                      style={{
                        transform: `scaleX(${maxBiomethane > 0 ? s.biomethane / maxBiomethane : 0})`,
                        backgroundColor: COMPARE_COLORS[slot],
                      }}
                    />
                  </div>
                </div>
              ),
            )}

            {row('sectors', t('rows.sectors'), (s) => {
              const values = COMPARE_SECTORS.map((k) => s.sectors[k]);
              if (values.every((v) => v === null)) return noData;
              const total = values.reduce<number>((sum, v) => sum + (v ?? 0), 0);
              return (
                <div>
                  <p className="font-semibold tabular-nums">{tons(total)}</p>
                  <div role="img" aria-label={t('sectors_aria', {
                    agricultural: s.sectors.agricultural === null ? t('no_data') : tons(s.sectors.agricultural),
                    livestock: s.sectors.livestock === null ? t('no_data') : tons(s.sectors.livestock),
                    urban: s.sectors.urban === null ? t('no_data') : tons(s.sectors.urban),
                  })} className="mt-1 flex h-2 gap-[2px]">
                    {COMPARE_SECTORS.map((k) => (s.sectors[k] ?? 0) > 0 && (
                      <span
                        key={k}
                        className="land-around-fade block h-full"
                        style={{ flexGrow: s.sectors[k] ?? 0, flexBasis: 0, backgroundColor: SECTOR_COLORS[k] }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {row('residues', t('rows.residues'), (s) =>
              s.topResidues === null ? noData : s.topResidues.length === 0 ? (
                <span className="text-ink-muted">{t('no_residues')}</span>
              ) : (
                <ol className="space-y-0.5 text-xs">
                  {s.topResidues.map((r) => (
                    <li key={r.key} className="flex items-baseline justify-between gap-2">
                      <span className="min-w-0 truncate text-ink">{residueName(r.key)}</span>
                      <span className="shrink-0 tabular-nums text-ink-muted">{tons(r.tons)}</span>
                    </li>
                  ))}
                </ol>
              ),
            )}

            {row('land', t('rows.land_cover'), (s) =>
              s.landCover === null ? noData : (
                <div>
                  <p className="font-semibold tabular-nums">
                    {t('farmland', { share: number(s.landCover.farmlandShare * 100) })}
                  </p>
                  <div role="img" aria-label={t('land_aria')} className="mt-1 flex h-2 gap-[2px]">
                    {COVER_BAR_GROUPS.map((g) => s.landCover!.groups[g] > 0 && (
                      <span
                        key={g}
                        className="land-around-fade block h-full"
                        style={{ flexGrow: s.landCover!.groups[g], flexBasis: 0, backgroundColor: COVER_BAR_COLORS[g] }}
                      />
                    ))}
                  </div>
                </div>
              ),
            )}

            {row('pipeline', t('rows.pipeline'), (s) =>
              s.pipelineKm === null ? noData : (
                <span className="font-semibold tabular-nums">
                  {t('km_value', { km: number(s.pipelineKm, s.pipelineKm < 10 ? 1 : 0) })}
                </span>
              ),
            )}

            {row('plants', t('rows.plants'), (s) =>
              s.biogasPlants === null ? noData : (
                <span className="font-semibold tabular-nums">{number(s.biogasPlants)}</span>
              ),
            )}

            {/* Keys for the two stacked bars, once for both columns. */}
            <div className="space-y-1.5 border-t border-line pt-2 text-[11px] text-ink-muted">
              <ul className="flex flex-wrap gap-x-3 gap-y-1">
                {COMPARE_SECTORS.map((k) => (
                  <li key={k} className="flex items-center gap-1">
                    <span className="h-2 w-2" style={{ backgroundColor: SECTOR_COLORS[k] }} aria-hidden="true" />
                    {tMap(`categories.${k}`)}
                  </li>
                ))}
              </ul>
              <ul className="flex flex-wrap gap-x-3 gap-y-1">
                {COVER_BAR_GROUPS.map((g) => (
                  <li key={g} className="flex items-center gap-1">
                    <span className="h-2 w-2" style={{ backgroundColor: COVER_BAR_COLORS[g] }} aria-hidden="true" />
                    {t(`cover.${g}`)}
                  </li>
                ))}
              </ul>
            </div>

            {pair.length === 1 && <p className="text-xs text-ink-muted">{t('one_hint')}</p>}
            <p className="border-t border-line pt-2 text-[11px] leading-snug text-ink-muted">{t('source')}</p>
          </div>
        )}
      </div>
    </aside>
  );
}

export interface CompareProps {
  access: MapToolAccess;
  pair: readonly string[];
  /** Every municipality the map holds, under the scenario: to find A and B and rank them. */
  features: readonly MunicipalityFeature[];
  scenario: MapScenarioKey;
  siting: SitingIndicators | null;
  landCover: LandCoverResponse | undefined;
  distanceKm: number | null;
  onRemove: (code: string) => void;
  onClose: () => void;
}

/** The window with each municipality's detail. */
export default function Compare({ access, pair, features, scenario, siting, landCover, distanceKm, onRemove, onClose }: CompareProps) {
  const allowed = access === 'allowed';
  const [codeA, codeB] = pair;
  const detailA = useMunicipalityMetrics(allowed && codeA ? codeA : null);
  const detailB = useMunicipalityMetrics(allowed && codeB ? codeB : null);

  const sides = useMemo(() => {
    if (!allowed) return [];
    const byCode = new Map(features.map((f) => [String(f.properties?.ibge_code), f]));
    return [
      [codeA, detailA.data],
      [codeB, detailB.data],
    ]
      .filter(([code]) => Boolean(code))
      .map(([code, detail]) => {
        const feature = byCode.get(code as string);
        if (!feature) return null;
        const props = { ...feature.properties, ...((detail as object | undefined) ?? {}) } as MunicipalityProperties;
        return compareSide(props, features, scenario, siting, landCover);
      });
  }, [allowed, codeA, codeB, detailA.data, detailB.data, features, scenario, siting, landCover]);

  return (
    <CompareWindow
      access={access}
      pair={pair}
      sides={sides}
      distanceKm={distanceKm}
      scenario={scenario}
      onRemove={onRemove}
      onClose={onClose}
    />
  );
}
