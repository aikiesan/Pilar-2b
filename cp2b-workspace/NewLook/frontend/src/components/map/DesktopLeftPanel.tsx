'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  SlidersHorizontal,
  Layers,
  Database,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Check,
  Download,
  Grid3x3,
  Link as LinkIcon,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Link } from '@/navigation';
import type { ResidueType, BiomassType, VisualizationMode } from '@/types/map';
import type { DisplayMetric, ResidueCNMatrix, ColorMode } from '@/types/geospatial';
import { useSummaryStatistics } from '@/hooks/useGeospatialData';
import { useFormat } from '@/hooks/useFormat';
import { useMetricText } from '@/hooks/useMetricText';
import { useDataSources, useDescribeSource } from '@/hooks/useDataSources';
import { layerSources } from '@/lib/dataSources';
import Cite from '@/components/mandate/Cite';
import { DISPLAY_METRICS, METRIC_SPECS } from '@/lib/mapMetrics';
import { BIVARIATE_FILLS } from '@/lib/bivariate';
import { ANALYSES, ANALYSIS_IDS, type AnalysisId } from '@/lib/mapAnalyses';
import type { ThematicPreset } from '@/data/thematicPresets';
import { DATA_EXPORT_ENABLED } from '@/lib/featureFlags';
import { MG_BETA_LAYER_ID } from '@/lib/mapScope';
import { RESIDUE_META } from '@/lib/residueMeta';
import ColorModeSelector, { buildColorModeOptions } from './ColorModeSelector';
import type { Messages } from '@/types/i18n';
import {
  isServedScenario,
  DEFAULT_MAP_SCENARIO,
  type MapScenarioKey,
} from '@/data/scenarioFactors';

/** The `Map` translator, handed to the section components below. */
type MapTranslator = ReturnType<typeof useTranslations<'Map'>>;

// ── Types ──────────────────────────────────────────────────────────────────────

interface Layer {
  id: string;
  name: string;
  visible: boolean;
  icon: string;
}

interface DesktopLeftPanelProps {
  selectedResidues: ResidueType[];
  onResiduesChange: (r: ResidueType[]) => void;
  biomassType: BiomassType;
  onBiomassTypeChange: (t: BiomassType) => void;
  visualizationMode: VisualizationMode;
  onVisualizationModeChange: (m: VisualizationMode) => void;
  opacity: number;
  onOpacityChange: (v: number) => void;
  layers: Layer[];
  onLayerToggle: (id: string, visible: boolean) => void;
  municipalityCount: number;
  totalMunicipalities: number;
  /** Non-SP municipalities currently drawn as beta context (0 when hidden). */
  betaMunicipalityCount?: number;
  onOpenComparison: () => void;
  onOpenExport: () => void;
  displayMetric?: DisplayMetric;
  onDisplayMetricChange?: (metric: DisplayMetric) => void;
  cnMatrix?: ResidueCNMatrix | null;
  colorMode: ColorMode;
  onColorModeChange: (mode: ColorMode) => void;
  /** False when the current scope has no per-residue breakdown (outside SP). */
  residueBreakdownAvailable?: boolean;
  availableResidueCategories?: Array<'agricultural' | 'livestock' | 'urban'>;
  scopeUf?: 'SP' | 'MG';
  /** Active map scenario — the headline strip follows it. */
  scenario?: MapScenarioKey;
  /** Apply a thematic preset (one-click reconfigure of the map). */
  onApplyPreset?: (preset: ThematicPreset) => void;
  /** Id of the last-applied preset, for highlighting; null once edited by hand. */
  activePresetId?: string | null;
  /** The bivariate analysis painting the map, if any. */
  activeAnalysis?: AnalysisId | null;
  onAnalysisChange?: (id: AnalysisId | null) => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

type LayerGroupKey = `layerGroups.${keyof Messages['Map']['layerGroups']}`;

const LAYER_GROUPS: { labelKey: LayerGroupKey; ids: readonly string[] }[] = [
  { labelKey: 'layerGroups.base', ids: ['municipalities', MG_BETA_LAYER_ID, 'intermediate-regions'] },
  { labelKey: 'layerGroups.environmental', ids: ['mapbiomas'] },
  {
    labelKey: 'layerGroups.infrastructure',
    ids: [
      'biogas_plant', 'ethanol_plant', 'biomass_thermal_plant', 'biodiesel_plant',
      'slaughterhouse', 'substation', 'transmission_line',
      'gas_pipeline_transport', 'gas_pipeline_distribution', 'etes', 'railways',
    ],
  },
  // Os três blocos abaixo são grupos próprios, não um apêndice de
  // "Infraestrutura". Eles respondem perguntas diferentes — para onde escoa,
  // onde não se pode instalar, como se transporta — e a lista de vinte toggles
  // que sairia de juntá-los apagaria exatamente essa distinção.
  {
    labelKey: 'layerGroups.gasRoute',
    ids: [
      'gas_delivery_point', 'compression_station', 'gas_processing_unit',
      'gas_pipeline_outflow',
    ],
  },
  {
    labelKey: 'layerGroups.siteRestriction',
    ids: ['protected_area_state', 'indigenous_territory', 'settlement'],
  },
  {
    labelKey: 'layerGroups.logistics',
    ids: ['highway_state', 'highway_federal'],
  },
] as const;

// ── Section components ────────────────────────────────────────────────────────

// The analyses: four questions, each a 3×3 bivariate map (lib/mapAnalyses).
// They sit first because they are the answers; the metric and the layers below
// are for whoever wants to build a reading of their own.
function AnalysesSection({
  activeAnalysis, onAnalysisChange,
}: {
  activeAnalysis: AnalysisId | null;
  onAnalysisChange: (id: AnalysisId | null) => void;
}) {
  const t = useTranslations('Map.analyses');
  return (
    <section id="map-panel-analyses" aria-labelledby="map-panel-analyses-h" data-tour="map-tabs">
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <h2 id="map-panel-analyses-h" className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{t('heading')}</h2>
        <span className="text-[10px] text-ink-muted">{t('heading_note')}</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {ANALYSIS_IDS.map((id) => {
          const active = activeAnalysis === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={active}
              onClick={() => onAnalysisChange(active ? null : id)}
              title={t(`${id}.question`)}
              className={`flex flex-col gap-1.5 rounded-lg border p-2 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-terra-600 ${
                active ? 'border-terra-600 bg-terra-50 ring-1 ring-terra-600' : 'border-line bg-paper-raised hover:border-line-strong hover:bg-paper-sunken'
              }`}
            >
              <MiniMatrix answerCell={ANALYSES[id].answerCell} />
              <span className="text-xs font-semibold leading-tight text-ink">{t(`${id}.title`)}</span>
              <span className="text-[10px] leading-tight text-ink-muted">{t(`${id}.axes`)}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-[10px] leading-snug text-ink-muted">{t('themes_hint')}</p>
    </section>
  );
}

/** The nine fills as a thumbnail, the answer cell outlined. */
function MiniMatrix({ answerCell }: { answerCell: number }) {
  return (
    <span className="grid w-max grid-cols-3 gap-px" aria-hidden="true">
      {[2, 1, 0].map((cy) =>
        [0, 1, 2].map((cx) => {
          const cell = cy * 3 + cx;
          return (
            <span
              key={cell}
              className={`h-2 w-2 ${cell === answerCell ? 'outline outline-1 outline-ink' : ''}`}
              style={{ backgroundColor: BIVARIATE_FILLS[cell] }}
            />
          );
        })
      )}
    </span>
  );
}

// What the choropleth paints and how. The sector and residue filters live in
// the thematic maps (the Temas menu over the map), the colour scale too.
function MapShowsSection({
  visualizationMode, onVisualizationModeChange,
  displayMetric = 'biomass_tons', onDisplayMetricChange, analysisActive, t,
  colorMode, onColorModeChange, scopeUf,
  selectedResidues, onResiduesChange, enabledCategories,
}: {
  visualizationMode: VisualizationMode;
  onVisualizationModeChange: (m: VisualizationMode) => void;
  displayMetric?: DisplayMetric;
  onDisplayMetricChange?: (metric: DisplayMetric) => void;
  analysisActive: boolean;
  t: MapTranslator;
  colorMode: ColorMode;
  onColorModeChange: (mode: ColorMode) => void;
  scopeUf: 'SP' | 'MG';
  selectedResidues: ResidueType[];
  onResiduesChange: (r: ResidueType[]) => void;
  enabledCategories: readonly ('agricultural' | 'livestock' | 'urban')[];
}) {
  const [residuesOpen, setResiduesOpen] = useState(selectedResidues.length > 0);
  const toggleResidue = (r: ResidueType) =>
    onResiduesChange(selectedResidues.includes(r) ? selectedResidues.filter((x) => x !== r) : [...selectedResidues, r]);
  const metricText = useMetricText();
  const vizModes: { value: VisualizationMode; label: string }[] = [
    { value: 'choropleth', label: t('vizModes.choropleth') },
    { value: 'heatmap', label: t('vizModes.heatmap') },
    { value: 'bubble', label: t('vizModes.bubble') },
  ];
  const segment = (on: boolean) =>
    `min-h-[30px] px-1 text-[11px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-terra-600 ${
      on ? 'bg-ink text-paper' : 'text-ink-muted hover:bg-paper-sunken hover:text-ink'
    }`;

  return (
    <section id="map-panel-shows" aria-labelledby="map-panel-shows-h" className="space-y-1.5">
      <h2 id="map-panel-shows-h" className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{t('panel.shows')}</h2>
      {onDisplayMetricChange && (
        <div data-tour="map-metric" role="group" aria-label={t('panel.metric_aria')} className="grid grid-cols-4 overflow-hidden rounded-lg border border-line">
          {DISPLAY_METRICS.map((m) => {
            const spec = METRIC_SPECS[m];
            // While an analysis paints the map, no metric is "on".
            const active = !analysisActive && displayMetric === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => onDisplayMetricChange(m)}
                aria-pressed={active}
                title={metricText(m).legend}
                className={`${segment(active)} flex min-w-0 flex-col items-center justify-center gap-1 py-1 !text-[10px]`}
              >
                <span className="truncate">{metricText(m).label}</span>
                {/* The metric's own map ramp: the control and the map agree on hue. */}
                <span aria-hidden="true" className="block h-0.5 w-8" style={{ background: `linear-gradient(to right, ${spec.ramp.join(',')})` }} />
              </button>
            );
          })}
        </div>
      )}
      <div data-tour="map-viz" role="group" aria-label={t('vizModes.label')} className="grid grid-cols-3 overflow-hidden rounded-lg border border-line">
        {vizModes.map((opt) => {
          const active = visualizationMode === opt.value;
          return (
            <button key={opt.value} type="button" aria-pressed={active} onClick={() => onVisualizationModeChange(opt.value)} className={segment(active)}>
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* What the choropleth colours by: the metric, or the residue profile. */}
      {visualizationMode === 'choropleth' && !analysisActive && (
        <div className="pt-1">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">{t('colorModes.label')}</p>
          <ColorModeSelector
            colorMode={colorMode}
            onColorModeChange={onColorModeChange}
            lockedHint={t('colorModes.beta_locked')}
            variant="desktop"
            options={buildColorModeOptions(
              displayMetric === 'biomass_tons' ? t('colorModes.biomass') : t('colorModes.biogas'),
              t,
              scopeUf,
            )}
          />
        </div>
      )}

      {/* Residue filter: the map counts only the residues picked here. */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setResiduesOpen((v) => !v)}
          aria-expanded={residuesOpen}
          className="flex min-h-[30px] w-full items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-ink-muted hover:text-ink"
        >
          <span>
            {t('residueFilter.label')}
            {selectedResidues.length > 0 && <span className="ml-1.5 text-terra-700">({selectedResidues.length})</span>}
          </span>
          {residuesOpen ? <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />}
        </button>
        {residuesOpen && (
          <div className="mt-1 space-y-2">
            {enabledCategories.length < 3 && (
              <p className="text-[11px] leading-snug text-ink-muted">{t('mobile.mg_filters_note')}</p>
            )}
            {(['agricultural', 'livestock', 'urban'] as const).map((cat) => {
              const available = enabledCategories.includes(cat);
              return (
                <div key={cat} className={available ? '' : 'opacity-40'}>
                  <p className="mb-1 text-[10px] font-semibold text-ink-muted">{t(`categories.${cat}`)}</p>
                  <div className="flex flex-wrap gap-1">
                    {RESIDUE_META.filter((r) => r.category === cat).map((r) => {
                      const on = selectedResidues.includes(r.value);
                      return (
                        <button
                          key={r.value}
                          type="button"
                          disabled={!available}
                          aria-pressed={on}
                          onClick={() => toggleResidue(r.value)}
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-terra-600 disabled:cursor-not-allowed ${
                            on ? 'border-ink bg-paper-sunken font-semibold text-ink' : 'border-line text-ink-muted hover:bg-paper-sunken hover:text-ink'
                          }`}
                        >
                          <span aria-hidden="true">{r.icon}</span>
                          {t(`residues.${r.value}`)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {selectedResidues.length > 0 && (
              <button type="button" onClick={() => onResiduesChange([])} className="text-[11px] font-medium text-terra-700 underline-offset-2 hover:underline">
                {t('residueFilter.clearFilters')} ({selectedResidues.length})
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function LayersSection({
  opacity, onOpacityChange, layers, onLayerToggle, t,
}: {
  opacity: number;
  onOpacityChange: (v: number) => void;
  layers: Layer[];
  onLayerToggle: (id: string, visible: boolean) => void;
  t: MapTranslator;
}) {
  const opacityId = useId();
  const sources = useDataSources();
  const describeSource = useDescribeSource();

  const grouped: { labelKey: LayerGroupKey; items: Layer[] }[] = [];
  for (const group of LAYER_GROUPS) {
    const items = group.ids.map(id => layers.find(l => l.id === id)).filter((l): l is Layer => l !== undefined);
    if (items.length > 0) grouped.push({ labelKey: group.labelKey, items });
  }
  const groupedIds = new Set<string>(LAYER_GROUPS.flatMap(g => [...g.ids]));
  const ungrouped = layers.filter(l => !groupedIds.has(l.id));
  if (ungrouped.length > 0) {
    const infraGroup = grouped.find(g => g.labelKey === 'layerGroups.infrastructure');
    if (infraGroup) infraGroup.items.push(...ungrouped);
    else grouped.push({ labelKey: 'layerGroups.infrastructure', items: ungrouped });
  }

  // The base and infrastructure groups start open; the reader opens the rest.
  const [opened, setOpened] = useState<Set<LayerGroupKey>>(
    () => new Set<LayerGroupKey>(['layerGroups.base', 'layerGroups.infrastructure'])
  );
  const toggleGroup = (key: LayerGroupKey) =>
    setOpened(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const onCount = layers.filter(l => l.visible).length;

  return (
    <section id="map-panel-layers" aria-labelledby="map-panel-layers-h">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <h2 id="map-panel-layers-h" className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{t('panels.layers')}</h2>
        <span className="text-[10px] text-ink-muted">{t('panel.layers_on', { count: onCount })}</span>
      </div>
      <div className="divide-y divide-line">
        {grouped.map(group => {
          const on = group.items.filter(l => l.visible).length;
          const open = opened.has(group.labelKey);
          const panelId = `layers-${group.labelKey.split('.')[1]}`;
          return (
            <div key={group.labelKey} className="py-0.5">
              <button
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => toggleGroup(group.labelKey)}
                className="flex min-h-[30px] w-full items-center gap-1.5 text-left text-xs font-semibold text-ink hover:text-terra-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-terra-600"
              >
                <ChevronRight className={`h-3.5 w-3.5 shrink-0 text-ink-muted transition-transform ${open ? 'rotate-90' : ''}`} aria-hidden="true" />
                <span className="flex-1 truncate">{t(group.labelKey)}</span>
                <span className={`min-w-[1.25rem] rounded-full px-1.5 text-center text-[10px] tabular-nums ${on > 0 ? 'bg-terra-100 font-semibold text-terra-800' : 'bg-paper-sunken text-ink-muted'}`}>
                  {on}/{group.items.length}
                </span>
              </button>
              {open && (
                <ul id={panelId} className="pb-1 pl-5">
                  {group.items.map(layer => {
                    const isBeta = layer.id === MG_BETA_LAYER_ID;
                    return (
                      <li key={layer.id} className="py-0.5">
                        <div className="flex min-h-[26px] items-center justify-between gap-2">
                          <span className={`truncate text-[11px] ${isBeta ? 'text-ink-muted' : 'text-ink'}`}>
                            <span aria-hidden="true">{layer.icon}</span> {layer.name}
                          </span>
                          <button
                            role="switch"
                            aria-checked={layer.visible}
                            aria-label={layer.name}
                            onClick={() => onLayerToggle(layer.id, !layer.visible)}
                            className={`relative h-[18px] w-8 shrink-0 rounded-full transition-colors ${
                              layer.visible ? (isBeta ? 'bg-amber-500' : 'bg-terra-800') : 'bg-line'
                            }`}
                          >
                            <span className={`absolute left-[2px] top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow transition-transform ${layer.visible ? 'translate-x-[14px]' : ''}`} />
                          </button>
                        </div>
                        {/* The caveat sits with the switch, not in a tooltip: this is
                            the one moment the user is deciding whether to trust the
                            layer, so it is the one place the disclosure must be free. */}
                        {isBeta && (
                          <p className="mt-0.5 pr-10 text-[9px] leading-snug text-amber-700">{t('beta.notice')}</p>
                        )}
                        {/* The source of what is on the map, once it is on the map. */}
                        {layer.visible && (
                          <Cite sources={layerSources(sources, layer.id)} describe={describeSource} className="!ml-0 mt-0.5" />
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-2">
        <label htmlFor={opacityId} className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
          {t('opacity.label')}: {Math.round(opacity * 100)}%
        </label>
        <input
          id={opacityId} type="range" min="0.3" max="1" step="0.05" value={opacity}
          aria-valuetext={`${Math.round(opacity * 100)}%`}
          onChange={e => onOpacityChange(parseFloat(e.target.value))}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-line accent-terra-600"
        />
      </div>
    </section>
  );
}

// The few actions that are not map settings: compare, share, and where the
// data comes from. Each layer cites its own source when it is on.
function PanelFooter({ onOpenComparison, onOpenExport, t }: {
  onOpenComparison: () => void;
  onOpenExport: () => void;
  t: MapTranslator;
}) {
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(copiedTimer.current), []);
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.clearTimeout(copiedTimer.current);
      copiedTimer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: nothing to undo */
    }
  };
  const item = 'flex min-h-[36px] flex-auto items-center justify-center gap-1 whitespace-nowrap rounded-lg px-1 text-[11px] font-medium text-ink-muted transition-colors hover:bg-paper-sunken hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-terra-600';
  return (
    <footer className="flex shrink-0 gap-1 border-t border-line px-2 py-1.5">
      <button type="button" onClick={onOpenComparison} className={item}>
        <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />{t('tools.compare')}
      </button>
      {DATA_EXPORT_ENABLED && (
        <button type="button" onClick={onOpenExport} className={item}>
          <Download className="h-3.5 w-3.5" aria-hidden="true" />{t('tools.export')}
        </button>
      )}
      <button type="button" onClick={copyLink} className={item} aria-live="polite">
        {copied ? <Check className="h-3.5 w-3.5 text-terra-700" aria-hidden="true" /> : <LinkIcon className="h-3.5 w-3.5" aria-hidden="true" />}
        {copied ? t('panel.copied') : t('panel.copy_link')}
      </button>
      <Link href="/data" className={item}>
        <Database className="h-3.5 w-3.5" aria-hidden="true" />{t('panels.dataSources')}
      </Link>
    </footer>
  );
}

// The headline strip. Every number in it is São Paulo — the summary endpoint is
// SP-scoped and the count is SP-scoped — so the strip says "SP" in the text
// itself rather than relying on the reader to remember it.
function StatStrip({ municipalityCount, totalMunicipalities, filterCount, betaMunicipalityCount = 0, scenario, scopeUf = 'SP' }: {
  municipalityCount: number;
  totalMunicipalities: number;
  filterCount: number;
  betaMunicipalityCount?: number;
  scenario: MapScenarioKey;
  scopeUf?: 'SP' | 'MG';
}) {
  const tMap = useTranslations('Map');
  const tCommon = useTranslations('common');
  const format = useFormat();
  const { data } = useSummaryStatistics();
  // The strip used to show `total_biogas_m3_year` — 19.9 bi, the THEORETICAL
  // volume, with no availability correction and no relation to the scenario the
  // map is painting. It now follows the toggle: 5.97 bi in Real (CP2b N4),
  // 7.00 bi in Ideal (CP2b N3), the v5.1 reference scenario. The band scenarios
  // have no served total, so they fall back to the legacy number — labelled as
  // the theoretical figure it is, never as the platform's headline.
  const tier = scopeUf === 'SP' && isServedScenario(scenario) ? data?.scenarios?.[scenario] : undefined;
  const headline = scopeUf === 'SP' ? (tier ? tier.ch4_m3_year : data?.total_biogas_m3_year) : undefined;
  const headlineLabel = `${tCommon('units.nm3_ch4_year')} · ${
    tier ? tMap(`scenario_${scenario}`) : tMap('stat_strip.theoretical')
  }`;
  return (
    <div className="px-3 py-2 border-b border-line bg-gradient-to-r from-terra-50 to-paper-raised flex-shrink-0">
      {/* Wraps instead of truncating: in the narrower sidebar the count and the
          headline don't fit on one line, and truncating cut the count to
          "645/645 munici…". The headline drops to its own line when needed. */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <div className="w-2 h-2 bg-terra-500 rounded-full animate-pulse flex-shrink-0" />
        <span className="text-xs text-ink-muted whitespace-nowrap">
          <span className="font-bold text-terra-700">{municipalityCount}</span>
          <span className="text-ink-muted">/{totalMunicipalities}</span>
          {' '}{tMap('stat_strip.municipalities')} <span className="font-semibold text-terra-700">{scopeUf}</span>
        </span>
        {headline !== undefined && (
          <span
            className="ml-auto text-[10px] text-terra-700 font-semibold shrink-0"
            // The catalog's tip, not the summary's `description`: that one is Portuguese only.
            title={tier && isServedScenario(scenario) ? tMap(`scenario_${scenario}_tip`) : undefined}
          >
            {format.compact(headline)} {headlineLabel}
          </span>
        )}
        {filterCount > 0 && !data && (
          <span className="ml-auto text-[10px] bg-terra-100 text-terra-700 font-semibold px-1.5 py-0.5 rounded-full shrink-0">
            {tMap('stat_strip.filters', { count: filterCount })}
          </span>
        )}
      </div>
      {betaMunicipalityCount > 0 && (
        <p className="mt-1 text-[9px] text-ink-muted leading-snug">
          🧪 {tMap('stat_strip.mg_beta', { count: format.number(betaMunicipalityCount) })}
        </p>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

type SectionId = 'map-panel-analyses' | 'map-panel-shows' | 'map-panel-layers';

/**
 * The map's left sidebar, one column with no tabs (desktop):
 *   analyses   four ready questions, each a 3×3 bivariate map;
 *   the map    which metric the choropleth paints, and how;
 *   layers     every overlay, grouped, with its source when on;
 *   footer     compare, copy the link, the data catalogue.
 * The thematic maps (sector and residue presets) and the colour scale are in
 * the Temas menu over the map; this panel no longer repeats them.
 */
export default function DesktopLeftPanel({
  selectedResidues, onResiduesChange,
  colorMode, onColorModeChange,
  residueBreakdownAvailable = true, availableResidueCategories,
  visualizationMode, onVisualizationModeChange,
  opacity, onOpacityChange, layers, onLayerToggle,
  municipalityCount, totalMunicipalities, betaMunicipalityCount = 0,
  onOpenComparison, onOpenExport,
  displayMetric, onDisplayMetricChange,
  scopeUf = 'SP',
  scenario = DEFAULT_MAP_SCENARIO,
  activeAnalysis = null, onAnalysisChange,
}: DesktopLeftPanelProps) {
  const t = useTranslations('Map');
  const [collapsed, setCollapsed] = useState(false);

  const filterCount = selectedResidues.length;
  const activeLayerCount = layers.filter(l => l.visible).length;

  // From the collapsed rail: open the panel, then, once it has rendered, bring
  // the section into view.
  const openAt = (section: SectionId) => {
    setCollapsed(false);
    window.requestAnimationFrame(() => document.getElementById(section)?.scrollIntoView?.({ block: 'start' }));
  };

  const rail: { id: SectionId; icon: React.ReactNode; label: string; badge?: number }[] = [
    { id: 'map-panel-analyses', icon: <Grid3x3 className="h-4 w-4" aria-hidden="true" />, label: t('analyses.heading') },
    { id: 'map-panel-shows', icon: <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />, label: t('panel.shows') },
    { id: 'map-panel-layers', icon: <Layers className="h-4 w-4" aria-hidden="true" />, label: t('panels.layers'), badge: activeLayerCount > 1 ? activeLayerCount : undefined },
  ];

  return (
    <aside className={`surface-light hidden md:flex flex-col flex-shrink-0 h-full bg-paper-raised border-r border-line shadow-sm overflow-hidden transition-all duration-200 ${collapsed ? 'w-14' : 'w-72'}`}>
      {/* Top bar */}
      <div className="flex items-center border-b border-line flex-shrink-0 h-12 px-2">
        {!collapsed && (
          <span className="text-sm font-semibold text-ink truncate flex-1 px-1">
            {/* The platform's scope is São Paulo + the Minas Gerais pilot, not
                the country — the title said "Brasil" while the map showed one
                state, which read as a loading failure. */}
            {t('panel.title', {
              state: scopeUf === 'MG' ? 'Minas Gerais' : 'São Paulo', // i18n-exempt: proper nouns
            })}
          </span>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          className={`p-1.5 rounded-lg hover:bg-paper-sunken text-ink-muted transition-colors flex-shrink-0 ${collapsed ? 'mx-auto' : 'ml-auto'}`}
          title={collapsed ? t('panel.expand') : t('panel.collapse')}
          aria-label={collapsed ? t('panel.expand') : t('panel.collapse')}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" aria-hidden="true" /> : <ChevronLeft className="w-4 h-4" aria-hidden="true" />}
        </button>
      </div>

      {/* Collapsed: one icon per section */}
      {collapsed && (
        <nav aria-label={t('panel.sections_aria')} className="flex flex-col flex-1 py-1">
          {rail.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => openAt(item.id)}
              className="relative flex h-11 w-14 items-center justify-center text-ink-muted transition-colors hover:bg-paper-sunken hover:text-ink"
              title={item.label}
              aria-label={item.label}
            >
              {item.icon}
              {item.badge && (
                <span className="absolute right-1.5 top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-terra-600 text-[7px] font-bold text-white">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      )}

      {/* Expanded: one column */}
      {!collapsed && (
        <>
          <StatStrip
            municipalityCount={municipalityCount}
            totalMunicipalities={totalMunicipalities}
            filterCount={filterCount}
            betaMunicipalityCount={betaMunicipalityCount}
            scenario={scenario}
            scopeUf={scopeUf}
          />
          <div className="flex-1 min-h-0 space-y-4 overflow-y-auto px-3 py-3">
            {onAnalysisChange && (
              <AnalysesSection activeAnalysis={activeAnalysis} onAnalysisChange={onAnalysisChange} />
            )}
            <MapShowsSection
              visualizationMode={visualizationMode} onVisualizationModeChange={onVisualizationModeChange}
              displayMetric={displayMetric} onDisplayMetricChange={onDisplayMetricChange}
              analysisActive={activeAnalysis !== null}
              t={t}
              colorMode={colorMode} onColorModeChange={onColorModeChange} scopeUf={scopeUf}
              selectedResidues={selectedResidues} onResiduesChange={onResiduesChange}
              enabledCategories={availableResidueCategories ?? (residueBreakdownAvailable ? ['agricultural', 'livestock', 'urban'] : [])}
            />
            <LayersSection
              opacity={opacity} onOpacityChange={onOpacityChange}
              layers={layers} onLayerToggle={onLayerToggle} t={t}
            />
          </div>
          <PanelFooter onOpenComparison={onOpenComparison} onOpenExport={onOpenExport} t={t} />
        </>
      )}
    </aside>
  );
}
