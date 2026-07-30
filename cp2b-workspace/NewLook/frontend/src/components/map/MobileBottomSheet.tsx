'use client';

import React, { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Search, Layers, FlaskConical, ChevronDown, ChevronUp, X } from 'lucide-react';
import type { ResidueType, BiomassType } from './FloatingControlPanel';
import type { VisualizationMode } from './LeftFilterPanel';
import type { DisplayMetric, ResidueCNMatrix, ColorMode } from '@/types/geospatial';
import { DISPLAY_METRICS, METRIC_SPECS } from '@/lib/mapMetrics';
import { MAP_SCENARIOS, SCENARIO_LABEL, type MapScenarioKey } from '@/data/scenarioFactors';

interface Layer {
  id: string;
  name: string;
  visible: boolean;
  icon: string;
}

interface MobileBottomSheetProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedResidues: ResidueType[];
  onResiduesChange: (residues: ResidueType[]) => void;
  biomassType: BiomassType;
  onBiomassTypeChange: (type: BiomassType) => void;
  visualizationMode: VisualizationMode;
  onVisualizationModeChange: (mode: VisualizationMode) => void;
  opacity: number;
  onOpacityChange: (opacity: number) => void;
  layers: Layer[];
  onLayerToggle: (layerId: string, visible: boolean) => void;
  municipalityCount: number;
  totalMunicipalities: number;
  displayMetric?: DisplayMetric;
  onDisplayMetricChange?: (metric: DisplayMetric) => void;
  cnMatrix?: ResidueCNMatrix | null;
  colorMode: ColorMode;
  onColorModeChange: (mode: ColorMode) => void;
  /** False when the current scope has no per-residue breakdown (outside SP). */
  residueBreakdownAvailable?: boolean;
  scenario: MapScenarioKey;
  onScenarioChange: (s: MapScenarioKey) => void;
  daltonic: boolean;
  onToggleDaltonic: () => void;
}

type ActiveSheet = 'filters' | 'layers' | null;

// Labels come from scenarioFactors so the sheet, the legend and the tooltip agree.
const SCENARIO_LABELS = SCENARIO_LABEL;

const RESIDUE_META = [
  { value: 'sugarcane' as const, category: 'agricultural' as const, icon: '🌾' },
  { value: 'soybean' as const, category: 'agricultural' as const, icon: '🌿' },
  { value: 'corn' as const, category: 'agricultural' as const, icon: '🌽' },
  { value: 'coffee' as const, category: 'agricultural' as const, icon: '☕' },
  { value: 'citrus' as const, category: 'agricultural' as const, icon: '🍊' },
  { value: 'cattle' as const, category: 'livestock' as const, icon: '🐄' },
  { value: 'swine' as const, category: 'livestock' as const, icon: '🐷' },
  { value: 'poultry' as const, category: 'livestock' as const, icon: '🐔' },
  { value: 'aquaculture' as const, category: 'livestock' as const, icon: '🐟' },
  { value: 'rsu' as const, category: 'urban' as const, icon: '🗑️' },
  { value: 'rpo' as const, category: 'urban' as const, icon: '♻️' },
];

const BIOMASS_META: { value: BiomassType; icon: string }[] = [
  { value: 'total', icon: '⚡' },
  { value: 'agricultural', icon: '🌾' },
  { value: 'livestock', icon: '🐄' },
  { value: 'urban', icon: '🏙️' },
];

const LAYER_KEY_MAP: Record<string, string> = {
  'municipalities': 'layers.municipalitiesSP',
  'intermediate-regions': 'layers.intermediateRegions',
  'mapbiomas': 'layers.mapbiomas',
  'biogas-plants': 'layers.biogasPlants',
  'pipelines': 'layers.pipelines',
  'substations': 'layers.substations',
  'transmission-lines': 'layers.transmissionLines',
  'etes': 'layers.etes',
  'railways': 'layers.railways',
};

export default function MobileBottomSheet({
  searchQuery, onSearchChange, selectedResidues, onResiduesChange,
  biomassType, onBiomassTypeChange, visualizationMode, onVisualizationModeChange,
  opacity, onOpacityChange, layers, onLayerToggle,
  municipalityCount, totalMunicipalities,
  displayMetric = 'biomass_tons', onDisplayMetricChange, cnMatrix,
  colorMode, onColorModeChange,
  residueBreakdownAvailable = true,
  scenario, onScenarioChange, daltonic, onToggleDaltonic,
}: MobileBottomSheetProps) {
  const t = useTranslations('Map');
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null);
  const [showBiomassTypes, setShowBiomassTypes] = useState(false);
  const [showResidues, setShowResidues] = useState(false);

  const filterCount = selectedResidues.length;
  const activeLayerCount = layers.filter(l => l.visible).length;

  const handleResidueToggle = useCallback((residue: ResidueType) => {
    const next = selectedResidues.includes(residue)
      ? selectedResidues.filter(r => r !== residue)
      : [...selectedResidues, residue];
    onResiduesChange(next);
  }, [selectedResidues, onResiduesChange]);

  const toggleSheet = (tab: 'filters' | 'layers') => {
    setActiveSheet(prev => prev === tab ? null : tab);
  };

  // i18n label where one exists (the SP layers); otherwise the layer's own
  // Portuguese name, never a raw snake_case id (the national MapBiomas layers).
  const getLayerName = (layer: Layer) => {
    const key = LAYER_KEY_MAP[layer.id];
    return key ? t(key) : layer.name;
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-[450] flex flex-col">
      {/* Content sheet — slides up when a tab is active */}
      <div
        className={`bg-white border-t border-gray-200 shadow-2xl transition-all duration-300 ease-out overflow-y-auto ${
          activeSheet ? 'h-[60vh]' : 'h-0 overflow-hidden'
        }`}
      >
        {activeSheet && (
          <div className="px-4 py-3 space-y-4">
            {/* Sheet header */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-800">
                {activeSheet === 'filters' ? t('panels.filters') : t('panels.layers')}
              </span>
              <button onClick={() => setActiveSheet(null)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* FILTERS CONTENT */}
            {activeSheet === 'filters' && (
              <>
                {/* Search */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                    {t('search.label')}
                  </label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => onSearchChange(e.target.value)}
                      placeholder={t('search.placeholder')}
                      className="w-full pl-9 pr-9 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                    {searchQuery && (
                      <button onClick={() => onSearchChange('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Metric toggle — Biomassa / Biogás / Biometano / Bioenergia */}
                {onDisplayMetricChange && (
                  <div className="grid grid-cols-2 gap-1.5">
                    {DISPLAY_METRICS.map((m) => {
                      const spec = METRIC_SPECS[m];
                      const active = displayMetric === m;
                      return (
                        <button
                          key={m}
                          onClick={() => onDisplayMetricChange(m)}
                          aria-pressed={active}
                          className={`py-3 text-xs font-bold uppercase tracking-wide rounded-lg transition-colors ${
                            active
                              ? `${spec.activeClass} text-white`
                              : 'bg-white text-gray-500 border border-gray-200'
                          }`}
                        >
                          {spec.icon} {spec.toggleLabel}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Visualization mode */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                    {t('vizModes.label')}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { value: 'choropleth' as const, label: t('vizModes.choropleth'), color: 'bg-blue-600', disabled: false },
                      { value: 'heatmap' as const, label: t('vizModes.heatmap'), color: 'bg-orange-500', disabled: false },
                      { value: 'bubble' as const, label: t('vizModes.bubble'), color: 'bg-green-600', disabled: false },
                      { value: 'clusters' as const, label: '⚗️ Co-digestão', color: 'bg-violet-600', disabled: true },
                    ] as const).map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => !opt.disabled && onVisualizationModeChange(opt.value)}
                        disabled={opt.disabled}
                        className={`py-2.5 rounded-xl text-xs font-medium border transition-colors ${
                          opt.disabled
                            ? 'bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed'
                            : visualizationMode === opt.value
                              ? `${opt.color} text-white border-transparent`
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
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
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                      {t('colorModes.label')}
                    </label>
                    <div className="flex flex-col gap-1 bg-gray-50 p-2 rounded-xl border border-gray-200">
                      {([
                        { value: 'biogas', label: displayMetric === 'biomass_tons' ? 'Potencial Biomassa' : t('colorModes.biogas') },
                        { value: 'cn_profile', label: t('colorModes.cn_profile') },
                        { value: 'cluster', label: t('colorModes.cluster') },
                      ] as const).map(opt => {
                        const active = colorMode === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => onColorModeChange(opt.value)}
                            className={`w-full py-2 px-3 rounded-lg text-xs font-semibold text-left transition-colors flex items-center justify-between ${
                              active
                                ? 'bg-green-700 text-white shadow-sm'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            <span>{opt.label}</span>
                            {active && <span className="text-xs">✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Biomass type */}
                <div>
                  <button
                    onClick={() => setShowBiomassTypes(!showBiomassTypes)}
                    className="flex items-center justify-between w-full text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5"
                  >
                    <span>{t('biomassTypes.label')}</span>
                    {showBiomassTypes ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {showBiomassTypes && (
                    <div className="grid grid-cols-2 gap-2">
                      {BIOMASS_META.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => onBiomassTypeChange(opt.value)}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium border transition-colors ${
                            biomassType === opt.value ? 'bg-green-100 border-green-400 text-green-800' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <span className="text-base">{opt.icon}</span>
                          {t(`biomassTypes.${opt.value}`)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Residue filter */}
                <div>
                  <button
                    onClick={() => setShowResidues(!showResidues)}
                    className="flex items-center justify-between w-full text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5"
                  >
                    <span>
                      {t('residueFilter.label')}
                      {filterCount > 0 && <span className="ml-1.5 text-green-700">({filterCount})</span>}
                    </span>
                    {showResidues ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {showResidues && (
                    <div className="space-y-3">
                      {!residueBreakdownAvailable && (
                        <p className="rounded-md bg-amber-50 px-3 py-2 text-[11px] leading-snug text-amber-800 ring-1 ring-amber-200">
                          ⓘ Filtros por resíduo específico disponíveis apenas em São Paulo. Fora de SP, use as camadas agregadas.
                        </p>
                      )}
                      {filterCount > 0 && (
                        <button
                          onClick={() => onResiduesChange([])}
                          className="w-full text-xs text-red-600 font-medium bg-red-50 rounded-lg px-3 py-2 hover:bg-red-100 transition-colors text-left"
                        >
                          {t('residueFilter.clearFilters')} ({filterCount})
                        </button>
                      )}
                      <div className={!residueBreakdownAvailable ? 'pointer-events-none opacity-40' : ''}>
                      {(['agricultural', 'livestock', 'urban'] as const).map(cat => {
                        const catIcon = cat === 'agricultural' ? '🌾' : cat === 'livestock' ? '🐄' : '🏙️';
                        const activeColor = cat === 'agricultural'
                          ? 'bg-green-200 border-green-500'
                          : cat === 'livestock'
                          ? 'bg-yellow-200 border-yellow-500'
                          : 'bg-blue-200 border-blue-500';
                        return (
                          <div key={cat}>
                            <div className="text-[10px] text-gray-500 font-bold uppercase mb-1.5 flex items-center gap-1">
                              {catIcon} {t(`categories.${cat}`)}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {RESIDUE_META.filter(r => r.category === cat).map(residue => {
                                const isSelected = selectedResidues.includes(residue.value);
                                return (
                                  <button
                                    key={residue.value}
                                    onClick={() => handleResidueToggle(residue.value)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                                      isSelected ? activeColor : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                    }`}
                                  >
                                    <span>{residue.icon}</span>
                                    {t(`residues.${residue.value}`)}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Scenario selector — analytical control, lives in the sheet
                    on mobile (not floating over the map). */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                    {t('scenario_label')}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {MAP_SCENARIOS.map(({ key, color }) => (
                      <button
                        key={key}
                        onClick={() => onScenarioChange(key)}
                        aria-pressed={scenario === key}
                        className={`py-2.5 rounded-xl text-xs font-medium border transition-colors ${
                          scenario === key ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                        style={scenario === key ? { backgroundColor: color } : undefined}
                      >
                        {SCENARIO_LABELS[key]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Accessibility — daltonic (CVD-safe) palette toggle. */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                    Acessibilidade
                  </label>
                  <button
                    onClick={onToggleDaltonic}
                    aria-pressed={daltonic}
                    className={`w-full py-2.5 rounded-xl text-xs font-medium border transition-colors ${
                      daltonic ? 'bg-slate-700 text-white border-transparent' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    👁 Modo daltônico {daltonic ? '· ativo' : ''}
                  </button>
                </div>
              </>
            )}

            {/* LAYERS CONTENT */}
            {activeSheet === 'layers' && (
              <>
                {/* Municipality count bar */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-600 font-medium">{t('municipalities.visible')}</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold text-green-700">{municipalityCount}</span>
                      <span className="text-xs text-gray-500">/ {totalMunicipalities}</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(municipalityCount / totalMunicipalities) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Opacity */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                    {t('opacity.label')}: {Math.round(opacity * 100)}%
                  </label>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">30%</span>
                    <input
                      type="range" min="0.3" max="1" step="0.05" value={opacity}
                      onChange={e => onOpacityChange(parseFloat(e.target.value))}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                    />
                    <span className="text-xs text-gray-400">100%</span>
                  </div>
                </div>

                {/* Layer toggles */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                    {t('layers.mapLayers')}
                  </label>
                  <div className="space-y-1.5">
                    {layers.map(layer => (
                      <label
                        key={layer.id}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors border ${
                          layer.visible ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox" checked={layer.visible}
                          onChange={e => onLayerToggle(layer.id, e.target.checked)}
                          className="w-4 h-4 text-green-600 rounded"
                        />
                        <span className="text-sm text-gray-700 font-medium leading-tight">
                          {layer.icon} {getLayerName(layer)}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Persistent tab bar — always visible */}
      <div className="h-14 bg-white border-t border-gray-200 flex items-stretch flex-shrink-0 shadow-lg">
        {/* Filtros */}
        <button
          onClick={() => toggleSheet('filters')}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
            activeSheet === 'filters' ? 'text-green-700 bg-green-50' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <Search className="w-5 h-5" />
          <span className="text-[10px] font-semibold">
            Filtros
            {filterCount > 0 && <span className="ml-1 text-green-600">({filterCount})</span>}
          </span>
        </button>

        {/* Camadas */}
        <button
          onClick={() => toggleSheet('layers')}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors border-l border-gray-200 ${
            activeSheet === 'layers' ? 'text-green-700 bg-green-50' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <Layers className="w-5 h-5" />
          <span className="text-[10px] font-semibold">
            Camadas
            {activeLayerCount > 1 && <span className="ml-1 text-blue-600">({activeLayerCount})</span>}
          </span>
        </button>

        {/* Co-digestão — disabled (under development) */}
        <button
          disabled={true}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 border-l border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50/50"
          title="Em desenvolvimento"
        >
          <FlaskConical className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Co-digestão</span>
        </button>
      </div>
    </div>
  );
}
