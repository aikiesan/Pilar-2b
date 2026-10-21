/**
 * Municipality Profile Panel — the map's click-open sidebar.
 *
 * A condensed version of /municipalities/[slug], built from the same
 * ProfileVisuals pieces, in reading order:
 *   1. header: name, region, IBGE code;
 *   2. four tiles: the active map metric's total (with its sector split as one
 *      bar), accessible methane (N4), mobilisable methane (N3) and the residue
 *      that carries most of N4;
 *   3. one line of context: population, area, density, GDP per capita;
 *   4. composition by sector in the active metric;
 *   5. every residue under its sector's heading, as labelled bars, in methane
 *      (the CP2b level behind the scenario) or in tonnes — a two-way switch
 *      that starts on whichever the map is showing;
 *   6. links to the full profile and to IBGE.
 * No accordions: everything fits a scroll or two, and nothing is hidden behind
 * a click.
 */

'use client';

import React, { useState } from 'react';
import { X, MapPin, ExternalLink, FileText } from 'lucide-react';
import { Link } from '@/navigation';
import type { DisplayMetric, MunicipalityFeature } from '@/types/geospatial';
import {
  isServedScenario,
  SERVED_SOURCE_TIER,
  type MapScenarioKey,
} from '@/data/scenarioFactors';
import { SECTOR_COLORS, type SectorKey } from '@/data/sectorColors';
import { getSectorMetricValue, getResidueTonsOrNull } from '@/lib/mapValues';
import { useTranslations } from 'next-intl';
import { useMunicipalityMetrics } from '@/hooks/useGeospatialData';
import { getMetricSpec } from '@/lib/mapMetrics';
import { MISSING_VALUE } from '@/lib/format';
import { useFormat } from '@/hooks/useFormat';
import { useMetricText } from '@/hooks/useMetricText';
import type { ResidueType } from '@/types/map';
import { municipalityPath } from '@/lib/municipalitySlug';
import Cite from '@/components/mandate/Cite';
import { useDataSources, useDescribeSource } from '@/hooks/useDataSources';
import { layerSources, pageSources, type DataSource } from '@/lib/dataSources';
import { MG_BETA_LAYER_ID } from '@/lib/mapScope';
import {
  BarList,
  Card,
  LegendItem,
  StackedBar,
  StatTile,
  type BarRow,
} from '@/components/municipality/ProfileVisuals';

interface MunicipalityProfilePanelProps {
  municipality: MunicipalityFeature | null;
  onClose: () => void;
  visible: boolean;
  /** Metric the map is currently showing — the panel mirrors it. */
  metric?: DisplayMetric;
  scenario?: MapScenarioKey;
}

const SECTORS: SectorKey[] = ['agricultural', 'livestock', 'urban'];

const RESIDUES_BY_SECTOR: Record<SectorKey, ResidueType[]> = {
  agricultural: ['sugarcane', 'soybean', 'corn', 'coffee', 'citrus'],
  livestock: ['cattle', 'swine', 'poultry', 'aquaculture'],
  urban: ['rsu', 'rpo', 'sewage'],
};

type ResidueView = 'methane' | 'biomass';

export default function MunicipalityProfilePanel({
  municipality,
  onClose,
  visible,
  metric = 'biomass_tons',
  scenario = 'baseline',
}: MunicipalityProfilePanelProps) {
  const t = useTranslations('Map.profilePanel');
  const tMap = useTranslations('Map');
  const tResidues = useTranslations('Map.residues');
  const tCommon = useTranslations('common');
  const format = useFormat();
  const metricText = useMetricText();
  const catalog = useDataSources();
  const describeSource = useDescribeSource();
  const tSources = useTranslations('dataSources');
  // The residue list starts in the unit the map is painting; null = follow it.
  const [chosenView, setChosenView] = useState<ResidueView | null>(null);

  // Demographics and the sector breakdown are not in the slim collection payload
  // — fetch them for the municipality being shown. Hook runs before the early
  // return, so the null-safe access is deliberate.
  const rawCode = visible ? municipality?.properties?.ibge_code : null;
  const { data: detail } = useMunicipalityMetrics(rawCode == null ? null : String(rawCode));

  if (!visible || !municipality) return null;

  const props = { ...municipality.properties, ...(detail ?? {}) } as typeof municipality.properties;
  const field = (key: string): number | null => {
    const value = (props as unknown as Record<string, unknown>)[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  };
  const short = (v: number) => format.compact(v, { decimals: v >= 1000 ? 1 : 0 });

  // ── Active metric: total and sector split ────────────────────────────────
  // The headline is the MUNICIPALITY TOTAL as the choropleth reads it, through
  // the same registry accessor that paints the polygon — never the sum of the
  // sector rows, which under the default scenario are not in the map payload
  // and would print "No data" over a municipality the map paints green.
  const spec = getMetricSpec(metric);
  const text = metricText(metric);
  const toDisplay = (v: number | null) => (v === null ? null : spec.toDisplay(v));
  const totalValue = toDisplay(
    spec.rawValue(props, { biomassType: 'total', selectedResidues: [], scenario }).value
  );
  const metricTotal = totalValue ?? 0;
  const sectorValue = Object.fromEntries(
    SECTORS.map((s) => [s, toDisplay(getSectorMetricValue(props, s, metric, scenario))])
  ) as Record<SectorKey, number | null>;
  // Shares are of that same total. They need not reach 100%: a total can carry
  // streams no sector row reports, so a visible remainder is the honest
  // reading rather than a rounding artefact.
  const share = (v: number | null) => (metricTotal > 0 && v !== null ? (v / metricTotal) * 100 : 0);
  const hasSectorSplit = SECTORS.some((s) => sectorValue[s] !== null);
  const sectorSegments = SECTORS.map((s) => ({ key: s, value: sectorValue[s] ?? 0, color: SECTOR_COLORS[s] }));

  // ── CP2b method: N4 and N3 ───────────────────────────────────────────────
  // The served scenarios read one CP2b level (Real = N4, Ideal = N3); the
  // residue view follows it, and every other scenario shows N4.
  const tier = isServedScenario(scenario) ? SERVED_SOURCE_TIER[scenario] : 'cp2b_n4';
  const tierLabel = tier === 'cp2b_n3' ? 'N3' : 'N4';
  const n4 = field('ch4_cp2b_n4_m3_year');
  const n3 = field('ch4_cp2b_n3_m3_year');
  const residueMethane = (r: ResidueType) => field(`ch4_${tier}_${r}_m3_year`);
  const n4ByResidue = Object.values(RESIDUES_BY_SECTOR)
    .flat()
    .map((r) => ({ r, v: field(`ch4_cp2b_n4_${r}_m3_year`) ?? 0 }))
    .sort((a, b) => b.v - a.v);
  const mainResidue = n4 && n4 > 0 && n4ByResidue[0].v > 0 ? n4ByResidue[0] : null;

  // ── Residues ─────────────────────────────────────────────────────────────
  const view: ResidueView = chosenView ?? (metric === 'biomass_tons' ? 'biomass' : 'methane');
  // Per-residue rows separate "we measured none" from "we have no data":
  // sugarcane outside São Paulo has never been promoted, so its column is NULL,
  // and rendering that as "0 t/ano" states the municipality grows no cane.
  const residueValue = (r: ResidueType) => (view === 'methane' ? residueMethane(r) : getResidueTonsOrNull(props, r));
  const residueRows = Object.fromEntries(
    SECTORS.map((s) => [s, RESIDUES_BY_SECTOR[s].map((r) => ({ r, v: residueValue(r) }))])
  ) as Record<SectorKey, { r: ResidueType; v: number | null }[]>;
  const residueMax = Math.max(0, ...Object.values(residueRows).flat().map((x) => x.v ?? 0));
  // Urban streams by their short names ("FORSU", not "FORSU (orgânicos)"):
  // the panel's label column is narrow.
  const residueName = (r: ResidueType) =>
    r === 'rsu' || r === 'rpo' || r === 'sewage' ? tMap(`urbanTotals.streams.${r}`) : tResidues(r);
  const residueUnit = view === 'methane' ? t('ch4_unit') : tCommon('units.t_year');
  const isMgMunicipality = String(props.ibge_code).startsWith('31');
  const ibgeUf = isMgMunicipality ? 'mg' : 'sp';
  // IBGE Cidades uses deburred, hyphenated slugs ("Ribeirão Preto" →
  // "ribeirao-preto"); a bare toLowerCase() keeps accents and spaces and 404s.
  const ibgeSlug = props.name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  // ── Sources ──────────────────────────────────────────────────────────────
  // Minas figures are the beta layer's: the CP2b method on IBGE and SNIS inputs.
  const potentialSources = [
    ...pageSources(catalog, 'municipio_potencial'),
    ...(isMgMunicipality ? layerSources(catalog, MG_BETA_LAYER_ID) : []),
  ];
  const sourceLine = (sources: DataSource[]) =>
    sources.length > 0 && (
      <p className="flex flex-wrap items-center text-[10px] text-ink-muted">
        {tSources('label', { count: sources.length })}
        <Cite sources={sources} describe={describeSource} />
      </p>
    );

  // ── Context ──────────────────────────────────────────────────────────────
  // A GDP of zero is a missing figure, not a municipality with no economy.
  const density =
    props.population_density ??
    (props.population && props.area_km2 ? props.population / props.area_km2 : null);
  const context: { key: string; label: string; value: string; unit: string }[] = [
    {
      key: 'population',
      label: t('population'),
      value: props.population ? format.compact(props.population, { decimals: 1 }) : MISSING_VALUE,
      unit: `${t('inhabitants')}${props.population_year ? ` · ${props.population_year}` : ''}`,
    },
    {
      key: 'area',
      label: t('area'),
      value: props.area_km2 ? format.number(props.area_km2) : MISSING_VALUE,
      unit: tCommon('units.km2'),
    },
    {
      key: 'density',
      label: t('density'),
      value: density ? format.number(density) : MISSING_VALUE,
      unit: t('density_unit'),
    },
    {
      key: 'gdp',
      label: t('gdp_per_capita'),
      value:
        props.gdp_per_capita != null && props.gdp_per_capita > 0
          ? format.currency(props.gdp_per_capita, { compact: true })
          : MISSING_VALUE,
      unit: props.gdp_year ? String(props.gdp_year) : t('per_capita'),
    },
  ];

  return (
    <>
      {/* Portrait  → bottom sheet: fixed to the bottom, ~68% tall, rounded top.
          Landscape → right-side drawer, full height (matches desktop). */}
      <aside
        aria-label={t('detail_aria', { name: props.name })}
        className="absolute z-[1101] overflow-y-auto bg-paper shadow-2xl
                   inset-x-0 bottom-0 max-h-[68%] rounded-t-2xl
                   landscape:inset-x-auto landscape:right-0 landscape:top-0 landscape:bottom-0 landscape:max-h-none landscape:w-[min(88vw,360px)] landscape:rounded-none"
      >
        {/* Drag-handle affordance (bottom-sheet only) */}
        <div className="landscape:hidden flex justify-center bg-terra-700 pt-2 pb-1 rounded-t-2xl">
          <span className="h-1.5 w-10 rounded-full bg-white/40" aria-hidden="true" />
        </div>

        {/* Header */}
        <div className="sticky top-0 z-10 bg-terra-700 px-3 pb-2.5 pt-1.5 text-white shadow-md landscape:pt-2.5 dark:bg-terra-900">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-white/80">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                {props.intermediate_region
                  ? t('municipality_with_region', { region: props.intermediate_region })
                  : t('municipality')}
              </div>
              <h2 className="font-display text-xl leading-tight">{props.name}</h2>
              <p className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
                <span className="rounded-sm bg-white/15 px-1.5 py-0.5">IBGE {props.ibge_code}</span>
                {props.immediate_region && props.immediate_region !== props.intermediate_region && (
                  <span className="rounded-sm bg-white/15 px-1.5 py-0.5">
                    {t('immediate_region', { region: props.immediate_region })}
                  </span>
                )}
                {props.cluster_label != null && (
                  <span className="rounded-sm bg-white/15 px-1.5 py-0.5">
                    {t('residue_profile')}: {props.cluster_label}
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={onClose}
              className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-white/20"
              title={tCommon('actions.close')}
              aria-label={t('close_aria')}
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="space-y-2 p-2">
          {/* Headline tiles */}
          <dl className="grid grid-cols-2 gap-1.5">
            <StatTile
              compact
              emphasis
              label={t('metric_total', { metric: text.label })}
              value={metricTotal > 0 ? short(metricTotal) : tCommon('states.no_data')}
              unit={text.unit}
            >
              {hasSectorSplit && metricTotal > 0 && <StackedBar segments={sectorSegments} height="h-2" />}
            </StatTile>
            {n4 !== null && (
              <StatTile
                compact
                label={t('n4_label')}
                value={short(n4)}
                unit={t('ch4_unit')}
                note={n4 > 0 ? t('per_day', { value: short(n4 / 365) }) : undefined}
              />
            )}
            {n3 !== null && (
              <StatTile
                compact
                label={t('n3_label')}
                value={short(n3)}
                unit={t('ch4_unit')}
                note={n4 !== null && n3 > 0 ? t('n4_kept', { percent: format.percent((n4 / n3) * 100, { decimals: 0 }) }) : undefined}
              />
            )}
            {mainResidue && n4 && (
              <StatTile
                compact
                label={t('main_residue')}
                value={<span className="text-lg">{tResidues(mainResidue.r)}</span>}
                note={t('main_residue_share', { percent: format.percent((mainResidue.v / n4) * 100, { decimals: 0 }) })}
              >
                <span className="block h-2 rounded-r bg-paper-sunken" aria-hidden="true">
                  <span
                    className="block h-full rounded-r bg-terra-600 dark:bg-terra-400"
                    style={{ width: `${Math.min(100, (mainResidue.v / n4) * 100)}%` }}
                  />
                </span>
              </StatTile>
            )}
          </dl>

          {sourceLine(potentialSources)}

          {/* Context: one row of small figures */}
          <dl className="grid grid-cols-4 divide-x divide-line border border-line bg-paper-raised">
            {context.map((c) => (
              <div key={c.key} className="flex min-w-0 flex-col justify-between px-1.5 py-1.5">
                <dt className="text-[10px] font-medium uppercase leading-tight tracking-wide text-ink-muted">{c.label}</dt>
                <dd className="mt-0.5">
                  <span className="block truncate text-sm font-semibold tabular-nums text-ink">{c.value}</span>
                  <span className="block truncate text-[10px] text-ink-muted">{c.unit}</span>
                </dd>
              </div>
            ))}
          </dl>
          {sourceLine(pageSources(catalog, 'municipio_demografia'))}

          {/* Composition by sector, in the active metric */}
          <Card
            compact
            id="panel-composicao"
            title={t('composition_by_source')}
            caption={text.unit}
          >
            {hasSectorSplit ? (
              <>
                <StackedBar segments={sectorSegments} />
                <ul className="mt-2 space-y-1">
                  {SECTORS.filter((s) => sectorValue[s] !== null).map((s) => (
                    <li key={s} className="flex items-baseline justify-between gap-3">
                      <LegendItem color={SECTOR_COLORS[s]} label={t(`sector_${s}`)} />
                      <span className="text-sm tabular-nums text-ink">
                        {short(sectorValue[s] ?? 0)}
                        <span className="ml-2 inline-block w-12 text-right text-ink-muted">
                          {format.percent(share(sectorValue[s]), { decimals: 0 })}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-xs text-ink-muted">{t('no_sector_breakdown')}</p>
            )}
          </Card>

          {/* Residues, grouped by sector */}
          <Card
            compact
            id="panel-residuos"
            title={t('residues_heading')}
            aside={
              <span role="group" aria-label={t('view_aria')} className="inline-flex border border-line text-xs">
                {(['methane', 'biomass'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={view === v}
                    onClick={() => setChosenView(v)}
                    className={`min-h-[32px] px-2.5 transition-colors ${
                      view === v ? 'bg-ink text-paper' : 'text-ink-muted hover:bg-paper-sunken'
                    }`}
                  >
                    {v === 'methane' ? t('view_methane', { tier: tierLabel }) : t('view_biomass')}
                  </button>
                ))}
              </span>
            }
            caption={
              view === 'methane'
                ? t('residues_caption_methane', { tier: tierLabel, unit: residueUnit })
                : t('residues_caption_biomass', { unit: residueUnit })
            }
          >
            <div className="space-y-3">
              {SECTORS.map((s) => {
                const rows = residueRows[s];
                const drawn = rows.filter((x) => (x.v ?? 0) > 0).sort((a, b) => (b.v ?? 0) - (a.v ?? 0));
                const zero = rows.filter((x) => x.v === 0).map((x) => residueName(x.r));
                const missing = rows.filter((x) => x.v === null).map((x) => residueName(x.r));
                const sectorTotal = drawn.reduce((sum, x) => sum + (x.v ?? 0), 0);
                const bars: BarRow[] = drawn.map((x) => ({
                  key: x.r,
                  label: residueName(x.r),
                  value: x.v ?? 0,
                  valueLabel: short(x.v ?? 0),
                  color: SECTOR_COLORS[s],
                }));
                // Urban streams with nothing at all are a validation gap, not a
                // zero: they are never inferred from population.
                const urbanGap = s === 'urban' && drawn.length === 0;
                return (
                  <section key={s} aria-labelledby={`panel-res-${s}`}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3 border-b border-line pb-1">
                      <h4 id={`panel-res-${s}`} className="text-sm font-medium">
                        <LegendItem color={SECTOR_COLORS[s]} label={t(`sector_${s}`)} />
                      </h4>
                      {sectorTotal > 0 && <span className="text-xs tabular-nums text-ink-muted">{short(sectorTotal)}</span>}
                    </div>
                    {urbanGap ? (
                      <div className="border border-dashed border-line-strong bg-paper-sunken p-2.5 text-xs text-ink">
                        <p className="font-semibold">
                          {isMgMunicipality ? t('no_urban_inventory_mg') : t('no_urban_inventory')}
                        </p>
                        <p className="mt-1 leading-snug text-ink-muted">{t('urban_note')}</p>
                      </div>
                    ) : (
                      <>
                        {bars.length > 0 && <BarList rows={bars} scale={residueMax} labelWidth="7.75rem" />}
                        {(zero.length > 0 || missing.length > 0) && (
                          <p className="mt-1.5 text-[11px] leading-snug text-ink-muted">
                            {zero.length > 0 && t('zero_list', { list: zero.join(', ') })}
                            {zero.length > 0 && missing.length > 0 && ' · '}
                            {missing.length > 0 && t('no_data_list', { list: missing.join(', ') })}
                          </p>
                        )}
                      </>
                    )}
                  </section>
                );
              })}
            </div>
            {view === 'methane' && (
              <p className="mt-2 border-l-2 border-terra-600 pl-2 text-[11px] leading-snug text-ink-muted">
                {t('scenario_note')}
              </p>
            )}
          </Card>

          {/* Links */}
          <div className="grid gap-1.5">
            {/* next-intl's Link, not a bare <a>. A raw href="/municipalities/…"
                skips BOTH the basePath (/pilar2b) and the locale segment, so in
                production this button left the platform entirely and landed on
                the CP2b institutional site, which serves the same host at the
                root. Locally, where basePath is empty, it appeared to work. */}
            <Link
              href={municipalityPath(props.name, props.ibge_code) as never}
              className="group flex items-center justify-between bg-terra-700 px-3 py-2.5 text-white transition-colors hover:bg-terra-800 dark:bg-terra-600 dark:hover:bg-terra-500"
            >
              <span className="text-sm font-semibold">{t('full_profile')}</span>
              <FileText className="h-4 w-4" aria-hidden="true" />
            </Link>
            <a
              href={`https://cidades.ibge.gov.br/brasil/${ibgeUf}/${ibgeSlug}/panorama`}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between rounded-lg border border-line px-3 py-2.5 transition-colors hover:bg-paper-sunken"
            >
              <span className="text-sm text-ink">{t('ibge_more')}</span>
              <ExternalLink className="h-4 w-4 text-ink-muted" aria-hidden="true" />
            </a>
          </div>
        </div>
      </aside>
    </>
  );
}
