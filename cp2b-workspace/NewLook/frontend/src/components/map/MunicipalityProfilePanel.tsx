/**
 * Municipality Profile Panel — the map's click-open sidebar.
 *
 * Built to be read WITHOUT scrolling on a desktop: a short header that says
 * the answer in one sentence, then four tabs, each fitting the drawer's
 * height on its own:
 *   header    name, region and IBGE code, two tags (main residue, rank in
 *             the state) and a one-line summary;
 *   Resumo    four figures (methane N4 and N3, biomass, area) and where the
 *             methane comes from, residue by residue;
 *   Resíduos  every residue under its sector, in methane (the CP2b level
 *             behind the scenario) or tonnes — a switch that starts on
 *             whichever the map is showing;
 *   Posição   the state's municipalities as one curve on a square-root scale,
 *             this one marked, and the top of its immediate region;
 *   Fontes    the sources behind the figures.
 * The ranks are computed in the browser from the features the map already
 * holds (municipalityStanding), so the panel adds no request for them.
 *
 * On a phone in portrait the panel is a bottom sheet that scrolls as a whole,
 * with the tabs pinned under its top edge.
 */

'use client';

import React, { useMemo, useState } from 'react';
import { X, MapPin, ExternalLink, ArrowRight, Flame, Gauge, Layers, Map as MapIcon } from 'lucide-react';
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
import { useFormat } from '@/hooks/useFormat';
import { useMetricText } from '@/hooks/useMetricText';
import type { ResidueType } from '@/types/map';
import { municipalityPath } from '@/lib/municipalitySlug';
import { ufAbbreviation } from '@/lib/municipalitySearch';
import { municipalityStanding, curvePath, sqrtY } from '@/lib/municipalityStanding';
import Cite from '@/components/mandate/Cite';
import { useDataSources, useDescribeSource } from '@/hooks/useDataSources';
import { layerSources, pageSources, type DataSource } from '@/lib/dataSources';
import { MG_BETA_LAYER_ID } from '@/lib/mapScope';
import CountUp from './CountUp';
import {
  BarList,
  Card,
  LegendItem,
  StackedBar,
  type BarRow,
} from '@/components/municipality/ProfileVisuals';

interface MunicipalityProfilePanelProps {
  municipality: MunicipalityFeature | null;
  onClose: () => void;
  visible: boolean;
  /** Metric the map is currently showing — the residue list starts in it. */
  metric?: DisplayMetric;
  scenario?: MapScenarioKey;
  /** Every municipality the map holds, for the ranks and the state curve. */
  features?: readonly MunicipalityFeature[];
}

const SECTORS: SectorKey[] = ['agricultural', 'livestock', 'urban'];

const RESIDUES_BY_SECTOR: Record<SectorKey, ResidueType[]> = {
  agricultural: ['sugarcane', 'soybean', 'corn', 'coffee', 'citrus'],
  livestock: ['cattle', 'swine', 'poultry', 'aquaculture'],
  urban: ['rsu', 'rpo', 'sewage'],
};
const SECTOR_OF = Object.fromEntries(
  SECTORS.flatMap((s) => RESIDUES_BY_SECTOR[s].map((r) => [r, s]))
) as Record<ResidueType, SectorKey>;

/** How many residues "where the methane comes from" names before "Others". */
const TOP_SOURCES = 4;

/** The state curve's drawing box, in SVG units. */
const CURVE_W = 300;
const CURVE_H = 72;

type ResidueView = 'methane' | 'biomass';
type Tab = 'summary' | 'residues' | 'position' | 'sources';
const TABS = [
  { id: 'summary', key: 'tab_summary' },
  { id: 'residues', key: 'tab_residues' },
  { id: 'position', key: 'tab_position' },
  { id: 'sources', key: 'tab_sources' },
] as const satisfies readonly { id: Tab; key: string }[];

/** One figure in the summary grid: icon and label, the number, a note or a bar. */
function Figure({
  icon,
  label,
  value,
  unit,
  note,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  unit?: string;
  note?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-xl border border-line bg-paper-raised px-2.5 py-2">
      <dt className="flex items-center gap-1.5 text-[11px] leading-tight text-ink-muted">
        <span className="shrink-0 text-terra-700 dark:text-terra-300" aria-hidden="true">{icon}</span>
        <span className="truncate">{label}</span>
      </dt>
      <dd className="flex flex-col gap-1">
        <span className="text-xl font-extrabold leading-none tabular-nums text-ink">
          {value}
          {unit && <span className="ml-1 text-[11px] font-medium text-ink-muted">{unit}</span>}
        </span>
        {children}
        {note && <span className="text-[11px] leading-tight text-ink-muted">{note}</span>}
      </dd>
    </div>
  );
}

export default function MunicipalityProfilePanel({
  municipality,
  onClose,
  visible,
  metric = 'biomass_tons',
  scenario = 'baseline',
  features,
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
  // The tab stays put from one municipality to the next, so a visitor
  // comparing rankings doesn't have to reopen "Posição" every time.
  const [tab, setTab] = useState<Tab>('summary');

  // ── CP2b method: the level behind the scenario ──────────────────────────
  // The served scenarios read one CP2b level (Real = N4, Ideal = N3); every
  // other scenario shows N4.
  const tier = isServedScenario(scenario) ? SERVED_SOURCE_TIER[scenario] : 'cp2b_n4';
  const tierLabel = tier === 'cp2b_n3' ? 'N3' : 'N4';

  // Demographics and the sector breakdown are not in the slim collection payload
  // — fetch them for the municipality being shown. Hooks run before the early
  // return, so the null-safe access is deliberate.
  const rawCode = visible ? municipality?.properties?.ibge_code : null;
  const code = rawCode == null ? null : String(rawCode);
  const { data: detail } = useMunicipalityMetrics(code);
  const standing = useMemo(
    () => (features && code ? municipalityStanding(features, code, `ch4_${tier}_m3_year`, 4) : null),
    [features, code, tier]
  );

  if (!visible || !municipality) return null;

  const props = { ...municipality.properties, ...(detail ?? {}) } as typeof municipality.properties;
  const field = (key: string): number | null => {
    const value = (props as unknown as Record<string, unknown>)[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  };
  const short = (v: number) => format.compact(v, { decimals: v >= 1000 ? 1 : 0 });
  const percent = (part: number, whole: number) => format.percent((part / whole) * 100, { decimals: 0 });
  const uf = ufAbbreviation(props.ibge_code) ?? '';
  const isMgMunicipality = String(props.ibge_code).startsWith('31');

  // ── Methane ──────────────────────────────────────────────────────────────
  const n4 = field('ch4_cp2b_n4_m3_year');
  const n3 = field('ch4_cp2b_n3_m3_year');
  const tierTotal = tier === 'cp2b_n3' ? n3 : n4;
  const residueMethane = (r: ResidueType) => field(`ch4_${tier}_${r}_m3_year`);
  const methaneByResidue = Object.values(RESIDUES_BY_SECTOR)
    .flat()
    .map((r) => ({ r, v: residueMethane(r) ?? 0 }))
    .filter((x) => x.v > 0)
    .sort((a, b) => b.v - a.v);
  const mainResidue = tierTotal && tierTotal > 0 ? methaneByResidue[0] ?? null : null;
  const topSources = methaneByResidue.slice(0, TOP_SOURCES);
  const otherSources = methaneByResidue.slice(TOP_SOURCES);
  const othersTotal = otherSources.reduce((sum, x) => sum + x.v, 0);

  // ── Biomass: total and sector split ──────────────────────────────────────
  const biomassSpec = getMetricSpec('biomass_tons');
  const biomassRaw = biomassSpec.rawValue(props, { biomassType: 'total', selectedResidues: [], scenario }).value;
  const biomass = biomassRaw === null ? null : biomassSpec.toDisplay(biomassRaw);
  const biomassSegments = SECTORS.map((s) => {
    const v = getSectorMetricValue(props, s, 'biomass_tons', scenario);
    return { key: s, value: v === null ? 0 : biomassSpec.toDisplay(v), color: SECTOR_COLORS[s] };
  });

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
  const methaneUnit = t('ch4_unit');
  const residueUnit = view === 'methane' ? methaneUnit : tCommon('units.t_year');

  // ── Sources ──────────────────────────────────────────────────────────────
  // Minas figures are the beta layer's: the CP2b method on IBGE and SNIS inputs.
  const potentialSources = [
    ...pageSources(catalog, 'municipio_potencial'),
    ...(isMgMunicipality ? layerSources(catalog, MG_BETA_LAYER_ID) : []),
  ];
  const contextSources = pageSources(catalog, 'municipio_demografia');
  const sourceLine = (sources: DataSource[]) =>
    sources.length > 0 && (
      <p className="flex flex-wrap items-center text-[11px] text-ink-muted">
        {tSources('label', { count: sources.length })}
        <Cite sources={sources} describe={describeSource} />
      </p>
    );
  // IBGE Cidades uses deburred, hyphenated slugs ("Ribeirão Preto" →
  // "ribeirao-preto"); a bare toLowerCase() keeps accents and spaces and 404s.
  const ibgeSlug = props.name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const ibgeHref = `https://cidades.ibge.gov.br/brasil/${isMgMunicipality ? 'mg' : 'sp'}/${ibgeSlug}/panorama`;

  // ── Tags under the name ──────────────────────────────────────────────────
  const chip = 'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold';

  // ── State curve ──────────────────────────────────────────────────────────
  const curveMax = standing?.leader.value ?? 0;
  const markerX = standing && standing.stateCount > 1 ? ((standing.stateRank - 1) / (standing.stateCount - 1)) * CURVE_W : 0;
  const markerY = standing ? sqrtY(standing.value, curveMax, CURVE_H) : 0;
  const medianY = standing ? sqrtY(standing.median, curveMax, CURVE_H) : 0;
  const markerOnRight = markerX > CURVE_W * 0.6;

  return (
    <>
      {/* Portrait  → bottom sheet: fixed to the bottom, at most 55% tall
          (PHONE_SHEET_SHARE in MunicipalityHighlight, which frames the
          municipality in the map left above it), rounded top; it scrolls as
          a whole, tabs pinned under its edge.
          Landscape → right-side drawer, full height (every desktop): header,
          tabs and footer stay, only the tab's content scrolls if a short
          window ever needs it. */}
      <aside
        aria-label={t('detail_aria', { name: props.name })}
        className="absolute z-[1101] map-window flex flex-col overflow-y-auto border-line bg-paper shadow-2xl
                   inset-x-0 bottom-[var(--map-bottom-bar,0px)] max-h-[55%] rounded-t-2xl
                   landscape:inset-x-auto landscape:right-0 landscape:top-0 landscape:bottom-0 landscape:max-h-none landscape:w-[min(88vw,360px)] landscape:rounded-none landscape:overflow-hidden landscape:border-l"
      >
        {/* Drag-handle affordance (bottom-sheet only) */}
        <div className="landscape:hidden flex justify-center pt-2" aria-hidden="true">
          <span className="h-1.5 w-10 rounded-full bg-line-strong/50" />
        </div>

        {/* Header */}
        <header className="shrink-0 space-y-2 border-b border-line px-4 pb-3 pt-2 landscape:pt-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-xs text-ink-muted">
              {props.immediate_region
                ? t('municipality_with_region', { region: props.immediate_region })
                : t('municipality')}
              {' · '}IBGE {props.ibge_code}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="-mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line text-ink transition-colors hover:bg-paper-sunken"
              title={tCommon('actions.close')}
              aria-label={t('close_aria')}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <h2 className="font-display text-2xl font-extrabold leading-tight text-ink">{props.name}</h2>
          <p className="flex flex-wrap gap-1.5">
            {mainResidue && (
              <span className={`${chip} bg-paper-sunken text-ink`}>
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: SECTOR_COLORS[SECTOR_OF[mainResidue.r]] }}
                  aria-hidden="true"
                />
                {t('chip_main', { residue: residueName(mainResidue.r) })}
              </span>
            )}
            {standing && (
              <span className={`${chip} bg-paper-sunken text-ink`}>
                {t('chip_state_rank', { rank: standing.stateRank, count: standing.stateCount, state: uf })}
              </span>
            )}
          </p>
          {tierTotal !== null && tierTotal > 0 && (
            <p className="text-sm leading-snug text-ink">
              {t.rich('lede', {
                value: `${short(tierTotal)} Nm³`,
                perDay: short(tierTotal / 365),
                b: (chunks) => <strong className="font-semibold text-terra-700 dark:text-terra-300">{chunks}</strong>,
              })}
              {mainResidue && (
                <>
                  {' '}
                  {t.rich('lede_main', {
                    percent: percent(mainResidue.v, tierTotal),
                    residue: tResidues(mainResidue.r),
                    b: (chunks) => <strong className="font-semibold text-terra-700 dark:text-terra-300">{chunks}</strong>,
                  })}
                </>
              )}
            </p>
          )}
        </header>

        {/* Tabs */}
        <nav
          aria-label={t('tabs_aria')}
          className="sticky top-0 z-10 grid shrink-0 grid-cols-4 border-b border-line bg-paper px-2 landscape:static"
        >
          {TABS.map(({ id, key }) => (
            <button
              key={id}
              type="button"
              aria-pressed={tab === id}
              onClick={() => setTab(id)}
              className={`min-h-[44px] text-[13px] transition-colors ${
                tab === id
                  ? 'font-bold text-terra-700 shadow-[inset_0_-3px_0_currentColor] dark:text-terra-300'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              {t(key)}
            </button>
          ))}
        </nav>

        <div className="flex-1 space-y-3 bg-paper-sunken p-3 landscape:min-h-0 landscape:overflow-y-auto">
          {tab === 'summary' && (
            <>
              <dl className="grid grid-cols-2 gap-2">
                {n4 !== null && (
                  <Figure
                    icon={<Flame className="h-3.5 w-3.5" />}
                    label={t('n4_label')}
                    value={<CountUp value={n4} format={short} />}
                    unit={t('nm3_year')}
                    note={n4 > 0 ? t('per_day', { value: short(n4 / 365) }) : undefined}
                  />
                )}
                {n3 !== null && (
                  <Figure
                    icon={<Gauge className="h-3.5 w-3.5" />}
                    label={t('n3_label')}
                    value={<CountUp value={n3} format={short} />}
                    unit={t('nm3_year')}
                    note={n4 !== null && n3 > 0 ? t('n4_kept', { percent: percent(n4, n3) }) : undefined}
                  >
                    {n4 !== null && n3 > 0 && (
                      <span className="block h-1.5 rounded-full bg-paper-sunken" aria-hidden="true">
                        <span
                          className="block h-full rounded-full bg-terra-700 dark:bg-terra-400"
                          style={{ width: `${Math.min(100, (n4 / n3) * 100)}%` }}
                        />
                      </span>
                    )}
                  </Figure>
                )}
                {biomass !== null && (
                  <Figure
                    icon={<Layers className="h-3.5 w-3.5" />}
                    label={metricText('biomass_tons').label}
                    value={<CountUp value={biomass} format={short} />}
                    unit={tCommon('units.t_year')}
                  >
                    <StackedBar segments={biomassSegments} height="h-1.5" />
                  </Figure>
                )}
                {props.area_km2 ? (
                  <Figure
                    icon={<MapIcon className="h-3.5 w-3.5" />}
                    label={t('area')}
                    value={format.number(props.area_km2)}
                    unit={tCommon('units.km2')}
                    note={props.population ? `${format.compact(props.population, { decimals: 1 })} ${t('inhabitants')}` : undefined}
                  />
                ) : null}
              </dl>

              {topSources.length > 0 ? (
                <Card compact id="panel-metano" title={t('methane_sources_heading')} caption={t('methane_sources_caption', { tier: tierLabel, unit: methaneUnit })}>
                  <BarList
                    labelWidth="7rem"
                    rows={[
                      ...topSources.map(
                        (x): BarRow => ({
                          key: x.r,
                          label: residueName(x.r),
                          value: x.v,
                          valueLabel: short(x.v),
                          color: SECTOR_COLORS[SECTOR_OF[x.r]],
                        })
                      ),
                      ...(othersTotal > 0
                        ? [{
                            key: 'others',
                            label: t('others', { count: otherSources.length }),
                            value: othersTotal,
                            valueLabel: short(othersTotal),
                            barClassName: 'bg-line-strong',
                          }]
                        : []),
                    ]}
                  />
                </Card>
              ) : (
                <p className="text-xs text-ink-muted">{t('no_sector_breakdown')}</p>
              )}
            </>
          )}

          {tab === 'residues' && (
            <Card
              compact
              id="panel-residuos"
              title={t('residues_heading')}
              aside={
                <span role="group" aria-label={t('view_aria')} className="inline-flex overflow-hidden rounded-lg border border-line text-xs">
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
              <div className="space-y-1.5">
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
                      <div className="mb-1 flex items-baseline justify-between gap-3 border-b border-line pb-0.5">
                        <h4 id={`panel-res-${s}`} className="text-sm font-medium">
                          <LegendItem color={SECTOR_COLORS[s]} label={t(`sector_${s}`)} />
                        </h4>
                        {sectorTotal > 0 && <span className="text-xs tabular-nums text-ink-muted">{short(sectorTotal)}</span>}
                      </div>
                      {urbanGap ? (
                        <div className="rounded-lg border border-dashed border-line-strong bg-paper-sunken p-2 text-xs text-ink">
                          <p className="font-semibold">
                            {isMgMunicipality ? t('no_urban_inventory_mg') : t('no_urban_inventory')}
                          </p>
                          <p className="mt-1 leading-snug text-ink-muted">{t('urban_note')}</p>
                        </div>
                      ) : (
                        <>
                          {bars.length > 0 && <BarList dense rows={bars} scale={residueMax} labelWidth="7rem" />}
                          {(zero.length > 0 || missing.length > 0) && (
                            <p className="mt-1 text-[11px] leading-snug text-ink-muted">
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
              {props.cluster_label != null && (
                <p className="mt-2 text-[11px] text-ink-muted">
                  {t('residue_profile')}: {props.cluster_label}
                </p>
              )}
            </Card>
          )}

          {tab === 'position' &&
            (standing ? (
              <>
                <Card
                  compact
                  id="panel-posicao"
                  title={t('position_heading', { state: uf })}
                  caption={t('position_caption', { count: standing.stateCount, tier: tierLabel })}
                >
                  <div className="relative">
                    <svg
                      viewBox={`0 0 ${CURVE_W} ${CURVE_H}`}
                      preserveAspectRatio="none"
                      className="block h-[72px] w-full overflow-visible"
                      role="img"
                      aria-label={t('position_chart_aria', {
                        count: standing.stateCount,
                        tier: tierLabel,
                        name: props.name,
                        rank: standing.stateRank,
                        value: `${short(standing.value)} ${methaneUnit}`,
                      })}
                    >
                      <path d={curvePath(standing.curve, curveMax, CURVE_W, CURVE_H)} className="fill-terra-100 dark:fill-terra-900" />
                      <line x1="0" x2={CURVE_W} y1={medianY} y2={medianY} className="stroke-line-strong" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
                      <line x1={markerX} x2={markerX} y1="0" y2={CURVE_H} className="stroke-terra-700 dark:stroke-terra-300" strokeWidth="1.5" strokeDasharray="3 2" vectorEffect="non-scaling-stroke" />
                    </svg>
                    {/* The marker is HTML, so it stays round however the SVG stretches. */}
                    <span
                      className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-paper bg-terra-700 dark:bg-terra-300"
                      style={{ left: `${(markerX / CURVE_W) * 100}%`, top: `${(markerY / CURVE_H) * 100}%` }}
                      aria-hidden="true"
                    />
                    <span
                      className={`absolute whitespace-nowrap text-xs font-bold text-terra-700 dark:text-terra-300 ${markerOnRight ? '-translate-x-full pr-2' : 'pl-2'}`}
                      style={{ left: `${(markerX / CURVE_W) * 100}%`, top: `${Math.max(0, (markerY / CURVE_H) * 100 - 22)}%` }}
                      aria-hidden="true"
                    >
                      {props.name} · {t('rank', { rank: standing.stateRank })}
                    </span>
                  </div>
                  <p className="mt-1 flex justify-between gap-2 text-[11px] text-ink-muted">
                    <span className="truncate">{t('position_leader', { name: standing.leader.name, value: short(standing.leader.value) })}</span>
                    <span>{t('rank', { rank: standing.stateCount })}</span>
                  </p>
                  <p className="mt-1 text-[11px] leading-snug text-ink-muted">
                    <span className="font-semibold text-ink">
                      {t('state_share', {
                        share: format.percent(standing.share * 100, { decimals: standing.share < 0.01 ? 2 : 1 }),
                        tier: tierLabel,
                        state: uf,
                        total: `${short(standing.stateTotal)} ${methaneUnit}`,
                      })}
                    </span>{' '}
                    {t('position_median', { value: `${short(standing.median)} ${methaneUnit}` })}
                  </p>
                </Card>

                {standing.region && standing.regionCount > 1 && (
                  <Card
                    compact
                    id="panel-regiao"
                    title={t('region_heading', { region: standing.region })}
                    caption={t('region_caption', { rank: standing.regionRank, count: standing.regionCount, unit: methaneUnit })}
                  >
                    <BarList
                      dense
                      labelWidth="minmax(0, 1fr)"
                      rows={standing.regionRows.map((r) => ({
                        key: r.code,
                        label: `${t('rank', { rank: r.rank })} ${r.name}`,
                        value: r.value,
                        valueLabel: short(r.value),
                        emphasis: r.self,
                        barClassName: r.self ? 'bg-terra-700 dark:bg-terra-300' : 'bg-terra-200 dark:bg-terra-800',
                      }))}
                    />
                  </Card>
                )}

              </>
            ) : (
              <p className="text-xs text-ink-muted">{t('no_standing')}</p>
            ))}

          {tab === 'sources' && (
            <Card compact id="panel-fontes" title={t('sources_heading')}>
              <div className="space-y-2">
                <div>
                  <p className="text-xs font-semibold text-ink">{t('sources_potential')}</p>
                  {sourceLine(potentialSources)}
                </div>
                {contextSources.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-ink">{t('sources_context')}</p>
                    {sourceLine(contextSources)}
                  </div>
                )}
                <p className="border-l-2 border-terra-600 pl-2 text-[11px] leading-snug text-ink-muted">{t('scenario_note')}</p>
                <a
                  href={ibgeHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-terra-700 hover:underline dark:text-terra-300"
                >
                  {t('ibge_more')}
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </div>
            </Card>
          )}
        </div>

        {/* Footer */}
        <footer className="flex shrink-0 gap-2 border-t border-line bg-paper px-4 py-2.5">
          {/* next-intl's Link, not a bare <a>. A raw href="/municipalities/…"
              skips BOTH the basePath (/pilar2b) and the locale segment, so in
              production this button left the platform entirely and landed on
              the CP2b institutional site, which serves the same host at the
              root. Locally, where basePath is empty, it appeared to work. */}
          <Link
            href={municipalityPath(props.name, props.ibge_code) as never}
            className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-terra-700 px-3 text-sm font-semibold text-white transition-colors hover:bg-terra-800 dark:bg-terra-600 dark:hover:bg-terra-500"
          >
            {t('full_profile')}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <a
            href={ibgeHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('ibge_more')}
            title={t('ibge_more')}
            className="flex min-h-[44px] w-11 items-center justify-center rounded-xl border border-line-strong text-ink transition-colors hover:bg-paper-sunken"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        </footer>
      </aside>
    </>
  );
}
