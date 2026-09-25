'use client';

import React, { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Search,
  Layers,
  Database,
  Wrench,
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  BarChart3,
  Download,
  Link,
  Map,
  Sparkles,
} from 'lucide-react';
import type { ResidueType, BiomassType, VisualizationMode } from '@/types/map';
import type { DisplayMetric, ResidueCNMatrix, ColorMode } from '@/types/geospatial';
import { useSummaryStatistics } from '@/hooks/useGeospatialData';
import { useMapPalette } from '@/hooks/useMapPalette';
import { useFormat } from '@/hooks/useFormat';
import { useMetricText } from '@/hooks/useMetricText';
import { DISPLAY_METRICS, METRIC_SPECS, MAP_PALETTES } from '@/lib/mapMetrics';
import {
  THEMATIC_PRESETS,
  type ThematicPreset,
  type ThematicPresetGroup,
} from '@/data/thematicPresets';
import { DATA_EXPORT_ENABLED } from '@/lib/featureFlags';
import { MG_BETA_LAYER_ID } from '@/lib/mapScope';
import type { Messages } from '@/types/i18n';

/** The `Map` translator, handed to the section components below. */
type MapTranslator = ReturnType<typeof useTranslations<'Map'>>;
type DataSourceDetailKey = keyof Messages['Map']['dataSourceDetails'];
import {
  isServedScenario,
  DEFAULT_MAP_SCENARIO,
  type MapScenarioKey,
} from '@/data/scenarioFactors';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Layer {
  id: string;
  name: string;
  visible: boolean;
  icon: string;
}

interface DesktopLeftPanelProps {
  searchQuery: string;
  onSearchChange: (v: string) => void;
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
}

type TabId = 'filters' | 'temas' | 'layers' | 'data' | 'tools';

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

const DATA_SOURCES: {
  categoryKey: 'dataSources.agricultural' | 'dataSources.livestock' | 'dataSources.urban' | 'dataSources.infrastructure';
  color: string;
  icon: string;
  sources: { name: string; detailKey: DataSourceDetailKey; year: string; url: string }[];
}[] = [
  {
    categoryKey: 'dataSources.agricultural',
    color: 'text-green-700',
    icon: '🌾',
    sources: [
      { name: 'IBGE - PAM', detailKey: 'pam', year: '2024', url: 'https://sidra.ibge.gov.br/pesquisa/pam/tabelas' },
      { name: 'MapBiomas 10.0', detailKey: 'mapbiomas', year: '2024', url: 'https://brasil.mapbiomas.org' },
      // i18n-exempt: agency acronyms (Ministry of Agriculture / CONAB)
      { name: 'MAPA / CONAB', detailKey: 'conab', year: '2024', url: 'https://www.conab.gov.br' },
    ],
  },
  {
    categoryKey: 'dataSources.livestock',
    color: 'text-yellow-700',
    icon: '🐄',
    sources: [
      { name: 'IBGE - PPM', detailKey: 'ppm', year: '2024', url: 'https://sidra.ibge.gov.br/pesquisa/ppm/tabelas' },
      { name: 'PNUD / ABPA', detailKey: 'abpa', year: '2024', url: '' },
    ],
  },
  {
    categoryKey: 'dataSources.urban',
    color: 'text-blue-700',
    icon: '🏙️',
    sources: [
      { name: 'SNIS', detailKey: 'snis', year: '2023', url: 'https://www.gov.br/cidades/pt-br/assuntos/saneamento/snis' },
      { name: 'IBGE - MUNIC', detailKey: 'munic', year: '2023', url: 'https://www.ibge.gov.br/pesquisas/munic' },
    ],
  },
  {
    categoryKey: 'dataSources.infrastructure',
    color: 'text-purple-700',
    icon: '⚡',
    sources: [
      { name: 'EPE', detailKey: 'epe', year: '2023-24', url: 'https://www.epe.gov.br' },
      { name: 'ANP', detailKey: 'anp', year: '2024', url: 'https://www.gov.br/anp' },
    ],
  },
];

// ── Section components ────────────────────────────────────────────────────────

// Biomassa-type and per-residue pickers were REMOVED from this panel: the
// thematic maps (the on-map ribbon + the Temas tab) now cover "which sector /
// which residue" as one-click ready maps, so the manual filters here were
// redundant. The underlying state still exists — presets set it — it just no
// longer has a hand-operated control in the first sidebar.
function FiltersSection({
  searchQuery, onSearchChange, visualizationMode, onVisualizationModeChange,
  displayMetric = 'biomass_tons', onDisplayMetricChange, t,
  colorMode, onColorModeChange, scopeUf = 'SP',
}: {
  searchQuery: string;
  onSearchChange: (v: string) => void;
  visualizationMode: VisualizationMode;
  onVisualizationModeChange: (m: VisualizationMode) => void;
  displayMetric?: DisplayMetric;
  onDisplayMetricChange?: (metric: DisplayMetric) => void;
  t: MapTranslator;
  colorMode: ColorMode;
  onColorModeChange: (mode: ColorMode) => void;
  scopeUf?: 'SP' | 'MG';
}) {
  const metricText = useMetricText();
  const searchId = useId();
  const vizModes: { value: VisualizationMode; label: string; disabled?: boolean }[] = [
    { value: 'choropleth', label: t('vizModes.choropleth') },
    { value: 'heatmap', label: t('vizModes.heatmap') },
    { value: 'bubble', label: t('vizModes.bubble') },
    { value: 'clusters', label: `⚗️ ${t('vizModes.clusters')}`, disabled: true },
  ];

  return (
    <div className="space-y-4">
      {/* Search */}
      <div>
        <label htmlFor={searchId} className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
          {t('search.label')}
        </label>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            id={searchId}
            type="text"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder={t('search.placeholder')}
            className="w-full pl-7 pr-7 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              aria-label={t('search.clear_aria')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Metric toggle — Biomassa / Biogás / Biometano / Bioenergia */}
      {onDisplayMetricChange && (
        <div className="grid grid-cols-2 gap-1">
          {DISPLAY_METRICS.map((m) => {
            const spec = METRIC_SPECS[m];
            const active = displayMetric === m;
            return (
              <button
                key={m}
                onClick={() => onDisplayMetricChange(m)}
                aria-pressed={active}
                title={metricText(m).legend}
                className={`py-2 text-[11px] font-bold uppercase tracking-wide rounded-lg transition-colors ${
                  active
                    ? `${spec.activeClass} text-white`
                    : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                {spec.icon} {metricText(m).label}
              </button>
            );
          })}
        </div>
      )}

      {/* Visualization mode */}
      <div>
        <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
          {t('vizModes.label')}
        </label>
        <div className="grid grid-cols-2 gap-1">
          {vizModes.map(opt => (
            <button
              key={opt.value}
              onClick={() => !opt.disabled && onVisualizationModeChange(opt.value)}
              disabled={opt.disabled}
              className={`py-1.5 px-2 rounded-lg border text-[11px] font-medium transition-all ${
                opt.disabled
                  ? 'bg-gray-50 border-gray-150 text-gray-300 cursor-not-allowed'
                  : visualizationMode === opt.value
                    ? opt.value === 'clusters'
                      ? 'border-violet-600 bg-violet-50 text-violet-800'
                      : 'border-[#1E5128] bg-green-50 text-green-800'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
              title={opt.disabled ? 'Em desenvolvimento' : undefined}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Color mode selector (for choropleth mode) */}
      {visualizationMode === 'choropleth' && (
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
            {t('colorModes.label')}
          </label>
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

    </div>
  );
}

// ── Thematic maps ("mapas temáticos já prontos") ────────────────────────────
// One-click presets that reconfigure the live map, grouped by theme, plus the
// colour-scale picker. Each preset carries its own default palette; the picker
// lets the reader override it (and stays available for any map, not only presets).
function ThemesSection({
  onApplyPreset, activePresetId, residueBreakdownAvailable = true,
  availableResidueCategories = ['agricultural', 'livestock', 'urban'],
}: {
  onApplyPreset?: (preset: ThematicPreset) => void;
  activePresetId?: string | null;
  residueBreakdownAvailable?: boolean;
  availableResidueCategories?: Array<'agricultural' | 'livestock' | 'urban'>;
}) {
  const tMap = useTranslations('Map');
  const [palette, setPalette] = useMapPalette();
  const groups: ThematicPresetGroup[] = ['setorial', 'residuo', 'energia', 'logistica', 'analise'];

  return (
    <div className="space-y-4">
      <p className="rounded-md bg-green-50 px-2.5 py-2 text-[10px] leading-snug text-green-800 ring-1 ring-green-100">
        🗺️ {tMap('thematic.panel_intro')}
      </p>

      {!residueBreakdownAvailable && (
        <p className="rounded-md bg-amber-50 px-2 py-1.5 text-[10px] leading-snug text-amber-800 ring-1 ring-amber-200">
          ⓘ {tMap('thematic.mg_note')}
        </p>
      )}

      {groups.map((g) => {
        const items = THEMATIC_PRESETS.filter((p) => p.group === g);
        if (items.length === 0) return null;
        return (
          <div key={g}>
            <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-gray-400">
              {tMap(`thematic.group_titles.${g}`)}
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {items.map((preset) => {
                const active = activePresetId === preset.id;
                const ramp = preset.config.palette ? MAP_PALETTES[preset.config.palette].ramp : null;
                const residueSector = (residue: ResidueType) =>
                  ['sugarcane', 'soybean', 'corn', 'coffee', 'citrus'].includes(residue)
                    ? 'agricultural'
                    : ['cattle', 'swine', 'poultry', 'aquaculture'].includes(residue)
                      ? 'livestock'
                      : 'urban';
                const required = preset.config.biomassType && preset.config.biomassType !== 'total'
                  ? [preset.config.biomassType]
                  : (preset.config.selectedResidues ?? []).map(residueSector);
                const enabled = required.every((category) => availableResidueCategories.includes(category));
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => enabled && onApplyPreset?.(preset)}
                    disabled={!enabled}
                    title={tMap(`thematic.presets.${preset.id}.description`)}
                    aria-pressed={active}
                    className={`flex flex-col gap-1 rounded-lg border p-2 text-left transition-all ${
                      !enabled
                        ? 'cursor-not-allowed border-gray-100 bg-gray-50 opacity-40'
                        : active
                        ? 'border-green-600 bg-green-50 shadow-sm ring-1 ring-green-600'
                        : 'border-gray-200 bg-white hover:border-green-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-gray-800">
                      <span aria-hidden="true">{preset.icon}</span>
                      <span className="truncate">{tMap(`thematic.presets.${preset.id}.label`)}</span>
                    </span>
                    {ramp && (
                      <span className="flex h-1.5 w-full overflow-hidden rounded-full" aria-hidden="true">
                        {ramp.map((c, i) => (
                          <span key={i} className="flex-1" style={{ backgroundColor: c }} />
                        ))}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Colour scale — the general palette, applies to any choropleth. */}
      <div className="border-t border-gray-100 pt-3">
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-500">
          {tMap('palettes.heading')}
        </span>
        <div className="grid grid-cols-2 gap-1" role="radiogroup" aria-label={tMap('palettes.group_aria')}>
          {Object.values(MAP_PALETTES).map((p) => {
            const active = palette === p.id;
            const name = tMap(`palettes.${p.id}.label`);
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setPalette(p.id)}
                title={`${name} — ${tMap(`palettes.${p.id}.note`)}`}
                className={`rounded-md border p-1 transition-all ${
                  active ? 'border-gray-800 ring-1 ring-gray-800' : 'border-gray-200 hover:border-gray-400'
                }`}
              >
                <span className="flex h-3 w-full overflow-hidden rounded-sm" aria-hidden="true">
                  {p.ramp.map((c, i) => (
                    <span key={i} className="flex-1" style={{ backgroundColor: c }} />
                  ))}
                </span>
                <span className="mt-0.5 flex items-center justify-center gap-0.5 text-[8px] font-semibold text-gray-600">
                  {name}
                  {p.cvdSafe && <span title={tMap('palettes.cvd_safe')} aria-hidden="true">·♿</span>}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-[9px] leading-snug text-gray-400">
          {tMap('palettes.scope_note')}
        </p>
      </div>
    </div>
  );
}

function LayersSection({
  municipalityCount, totalMunicipalities, opacity, onOpacityChange, layers, onLayerToggle, t,
}: {
  municipalityCount: number;
  totalMunicipalities: number;
  opacity: number;
  onOpacityChange: (v: number) => void;
  layers: Layer[];
  onLayerToggle: (id: string, visible: boolean) => void;
  t: MapTranslator;
}) {
  const opacityId = useId();
  // Layers arrive named in the page locale (MapComponent reads Map.layerNames).
  const getLayerName = (layer: Layer) => layer.name;

  const getGroupedLayers = () => {
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
    return grouped;
  };

  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-gray-600 font-medium">{t('municipalities.visible')}</span>
          <div className="flex items-baseline gap-0.5">
            <span className="text-base font-bold text-green-700">{municipalityCount}</span>
            <span className="text-[10px] text-gray-500">/ {totalMunicipalities}</span>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div
            className="bg-green-600 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${(municipalityCount / totalMunicipalities) * 100}%` }}
          />
        </div>
      </div>

      <div>
        <label htmlFor={opacityId} className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
          {t('opacity.label')}: {Math.round(opacity * 100)}%
        </label>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400">30%</span>
          <input id={opacityId} type="range" min="0.3" max="1" step="0.05" value={opacity}
            aria-valuetext={`${Math.round(opacity * 100)}%`}
            onChange={e => onOpacityChange(parseFloat(e.target.value))}
            className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
          />
          <span className="text-[10px] text-gray-400">100%</span>
        </div>
      </div>

      <div className="space-y-2">
        {getGroupedLayers().map(group => (
          <div key={group.labelKey}>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">{t(group.labelKey)}</p>
            <div className="space-y-0.5">
              {group.items.map(layer => {
                const isBeta = layer.id === MG_BETA_LAYER_ID;
                return (
                  <div key={layer.id} className="py-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-[11px] font-medium truncate mr-2 ${isBeta ? 'text-gray-500' : 'text-gray-700'}`}>
                        {layer.icon} {getLayerName(layer)}
                      </span>
                      <button
                        role="switch"
                        aria-checked={layer.visible}
                        aria-label={getLayerName(layer)}
                        onClick={() => onLayerToggle(layer.id, !layer.visible)}
                        className={`relative w-8 h-[18px] rounded-full transition-colors shrink-0 ${
                          layer.visible ? (isBeta ? 'bg-amber-500' : 'bg-[#1E5128]') : 'bg-gray-200'
                        }`}
                      >
                        <span className={`absolute top-[2px] left-[2px] w-[14px] h-[14px] bg-white rounded-full shadow transition-transform ${layer.visible ? 'translate-x-[14px]' : ''}`} />
                      </button>
                    </div>
                    {/* The caveat sits with the switch, not in a tooltip: this is
                        the one moment the user is deciding whether to trust the
                        layer, so it is the one place the disclosure must be free. */}
                    {isBeta && (
                      <p className="text-[9px] text-amber-700 leading-snug mt-0.5 pr-10">
                        {t('beta.notice')}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DataSourcesSection({ t }: { t: MapTranslator }) {
  return (
    <div className="space-y-3">
      {DATA_SOURCES.map(cat => (
        <div key={cat.categoryKey}>
          <p className={`text-[10px] font-bold uppercase tracking-wide mb-1.5 ${cat.color}`}>
            {cat.icon} {t(cat.categoryKey)}
          </p>
          <div className="space-y-1">
            {cat.sources.map(src => (
              <div key={src.name} className="flex items-start justify-between gap-1.5 text-[10px] bg-white border border-gray-200 rounded-lg px-2.5 py-2 hover:border-green-200 transition-colors">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800 truncate">{src.name}</p>
                  <p className="text-gray-500 text-[9px] truncate">{t(`dataSourceDetails.${src.detailKey}`)} · {src.year}</p>
                </div>
                {src.url && (
                  <a href={src.url} target="_blank" rel="noopener noreferrer"
                    className="text-gray-400 hover:text-blue-600 transition-colors shrink-0 mt-0.5">
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ToolsSection({
  onOpenComparison, onOpenExport, t,
}: {
  onOpenComparison: () => void;
  onOpenExport: () => void;
  t: MapTranslator;
}) {
  // Export is withheld during beta (lib/featureFlags). The tool is removed from
  // the list rather than disabled in place: a greyed-out button invites people to
  // ask when it returns, and the honest answer is "when the data is validated",
  // which the beta banner already says.
  type ToolKey = `tools.${keyof Messages['Map']['tools']}`;
  type Tool = { icon: React.ReactNode; titleKey: ToolKey; descKey: ToolKey; ctaKey: ToolKey; onClick: () => void };
  const exportTools: Tool[] = DATA_EXPORT_ENABLED
    ? [{ icon: <Download className="w-5 h-5" />, titleKey: 'tools.export', descKey: 'tools.exportDesc', ctaKey: 'tools.open', onClick: onOpenExport }]
    : [];
  const tools: Tool[] = [
    { icon: <BarChart3 className="w-5 h-5" />, titleKey: 'tools.compare', descKey: 'tools.compareDesc', ctaKey: 'tools.open', onClick: onOpenComparison },
    ...exportTools,
    {
      icon: <Link className="w-5 h-5" />, titleKey: 'tools.share', descKey: 'tools.shareDesc', ctaKey: 'tools.copyUrl',
      onClick: () => { if (typeof window !== 'undefined') navigator.clipboard.writeText(window.location.href); },
    },
    { icon: <Map className="w-5 h-5" />, titleKey: 'tools.viewProfile', descKey: 'tools.viewProfileDesc', ctaKey: 'tools.open', onClick: () => {} },
  ];

  return (
    <div className="space-y-2">
      {tools.map(tool => (
        <button key={tool.titleKey} onClick={tool.onClick}
          className="w-full bg-white border border-gray-100 rounded-xl p-3 hover:border-[#1E5128] hover:shadow-sm transition-all cursor-pointer flex items-center gap-3 text-left">
          <span className="text-gray-500 shrink-0">{tool.icon}</span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-gray-800">{t(tool.titleKey)}</p>
            <p className="text-[10px] text-gray-500 truncate">{t(tool.descKey)}</p>
          </div>
          <span className="text-[10px] font-semibold text-[#1E5128] shrink-0">{t(tool.ctaKey)}</span>
        </button>
      ))}
    </div>
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
    <div className="px-3 py-2 border-b border-gray-100 bg-gradient-to-r from-green-50 to-white flex-shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0" />
        <span className="text-xs text-gray-600 truncate">
          <span className="font-bold text-green-700">{municipalityCount}</span>
          <span className="text-gray-400">/{totalMunicipalities}</span>
          {' '}{tMap('stat_strip.municipalities')} <span className="font-semibold text-green-700">{scopeUf}</span>
        </span>
        {headline !== undefined && (
          <span
            className="ml-auto text-[10px] text-green-700 font-semibold shrink-0"
            // The catalog's tip, not the summary's `description`: that one is Portuguese only.
            title={tier && isServedScenario(scenario) ? tMap(`scenario_${scenario}_tip`) : undefined}
          >
            {format.compact(headline)} {headlineLabel}
          </span>
        )}
        {filterCount > 0 && !data && (
          <span className="ml-auto text-[10px] bg-green-100 text-green-700 font-semibold px-1.5 py-0.5 rounded-full shrink-0">
            {tMap('stat_strip.filters', { count: filterCount })}
          </span>
        )}
      </div>
      {betaMunicipalityCount > 0 && (
        <p className="mt-1 text-[9px] text-gray-400 leading-snug">
          🧪 {tMap('stat_strip.mg_beta', { count: format.number(betaMunicipalityCount) })}
        </p>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

import ColorModeSelector, { buildColorModeOptions } from './ColorModeSelector';

export default function DesktopLeftPanel({
  searchQuery, onSearchChange, selectedResidues,
  visualizationMode, onVisualizationModeChange,
  opacity, onOpacityChange, layers, onLayerToggle,
  municipalityCount, totalMunicipalities, betaMunicipalityCount = 0,
  onOpenComparison, onOpenExport,
  displayMetric, onDisplayMetricChange,
  colorMode, onColorModeChange, residueBreakdownAvailable = true,
  availableResidueCategories = ['agricultural', 'livestock', 'urban'], scopeUf = 'SP',
  scenario = DEFAULT_MAP_SCENARIO,
  onApplyPreset, activePresetId,
}: DesktopLeftPanelProps) {
  const t = useTranslations('Map');
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('filters');

  const filterCount = selectedResidues.length;
  const activeLayerCount = layers.filter(l => l.visible).length;

  const tabs: { id: TabId; icon: React.ReactNode; label: string; badge?: number }[] = [
    { id: 'filters', icon: <Search className="w-3.5 h-3.5" />, label: t('panels.filters'), badge: filterCount > 0 ? filterCount : undefined },
    { id: 'temas', icon: <Sparkles className="w-3.5 h-3.5" />, label: t('panels.themes') },
    { id: 'layers', icon: <Layers className="w-3.5 h-3.5" />, label: t('panels.layers'), badge: activeLayerCount > 1 ? activeLayerCount : undefined },
    { id: 'data', icon: <Database className="w-3.5 h-3.5" />, label: t('panels.dataSources') },
    { id: 'tools', icon: <Wrench className="w-3.5 h-3.5" />, label: t('panels.tools') },
  ];

  return (
    <aside className={`hidden md:flex flex-col flex-shrink-0 h-full bg-white border-r border-gray-200 shadow-sm overflow-hidden transition-all duration-200 ${collapsed ? 'w-14' : 'w-72'}`}>
      {/* Top bar */}
      <div className="flex items-center border-b border-gray-100 flex-shrink-0 h-12 px-2">
        {!collapsed && (
          <span className="text-sm font-semibold text-gray-700 truncate flex-1 px-1">
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
          className={`p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors flex-shrink-0 ${collapsed ? 'mx-auto' : 'ml-auto'}`}
          title={collapsed ? t('panel.expand') : t('panel.collapse')}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Collapsed: vertical icon rail */}
      {collapsed && (
        <div className="flex flex-col flex-1 py-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setCollapsed(false); setActiveTab(tab.id); }}
              className={`relative flex items-center justify-center w-14 h-11 transition-colors ${
                activeTab === tab.id ? 'text-green-700 bg-green-50' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-700'
              }`}
              title={tab.label}
            >
              {tab.icon}
              {tab.badge && (
                <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 flex items-center justify-center text-[7px] font-bold rounded-full bg-green-500 text-white">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
          <div className="mt-auto border-t border-gray-100 py-1">
            <button onClick={onOpenComparison} title={t('tools.compare')}
              className="flex items-center justify-center w-14 h-11 text-gray-400 hover:bg-purple-50 hover:text-purple-600 transition-colors">
              <BarChart3 className="w-4 h-4" />
            </button>
            <button onClick={onOpenExport} title={t('tools.export')}
              className="flex items-center justify-center w-14 h-11 text-gray-400 hover:bg-green-50 hover:text-green-600 transition-colors">
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Expanded: stat strip + tab nav + scrollable content */}
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

          {/* Tab nav */}
          <div className="flex border-b border-gray-100 flex-shrink-0">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[9px] font-semibold uppercase tracking-wide transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-green-600 text-green-700 bg-green-50/50'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}
                title={tab.label}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="absolute top-1 right-1 w-3.5 h-3.5 flex items-center justify-center text-[7px] font-bold rounded-full bg-green-500 text-white">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-3 py-3 min-h-0">
            {activeTab === 'filters' && (
              <FiltersSection
                searchQuery={searchQuery} onSearchChange={onSearchChange}
                visualizationMode={visualizationMode} onVisualizationModeChange={onVisualizationModeChange}
                displayMetric={displayMetric} onDisplayMetricChange={onDisplayMetricChange}
                t={t}
                colorMode={colorMode} onColorModeChange={onColorModeChange}
                scopeUf={scopeUf}
              />
            )}
            {activeTab === 'temas' && (
              <ThemesSection
                onApplyPreset={onApplyPreset}
                activePresetId={activePresetId}
                residueBreakdownAvailable={residueBreakdownAvailable}
                availableResidueCategories={availableResidueCategories}
              />
            )}
            {activeTab === 'layers' && (
              <LayersSection
                municipalityCount={municipalityCount} totalMunicipalities={totalMunicipalities}
                opacity={opacity} onOpacityChange={onOpacityChange}
                layers={layers} onLayerToggle={onLayerToggle} t={t}
              />
            )}
            {activeTab === 'data' && <DataSourcesSection t={t} />}
            {activeTab === 'tools' && (
              <ToolsSection onOpenComparison={onOpenComparison} onOpenExport={onOpenExport} t={t} />
            )}
          </div>
        </>
      )}
    </aside>
  );
}
