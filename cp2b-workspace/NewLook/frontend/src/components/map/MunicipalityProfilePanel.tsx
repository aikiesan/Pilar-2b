/**
 * Municipality Profile Panel
 * Detailed municipality information panel with rich data context
 */

'use client';

import React, { useState } from 'react';
import {
  X,
  MapPin,
  Users,
  Maximize,
  TrendingUp,
  BarChart3,
  Leaf,
  Factory,
  Droplets,
  Trees,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
} from 'lucide-react';
import { Link } from '@/navigation';
import type { DisplayMetric, MunicipalityFeature } from '@/types/geospatial';
import type { MapScenarioKey } from '@/data/scenarioFactors';
import { getTotalBiomassTons } from '@/lib/biomassAvailability';
import { getSectorMetricValue, getResidueTonsOrNull } from '@/lib/mapValues';
import { useMunicipalityMetrics } from '@/hooks/useGeospatialData';
import { getMetricSpec, formatCompact } from '@/lib/mapMetrics';
import type { ResidueType } from '@/components/map/FloatingControlPanel';

interface MunicipalityProfilePanelProps {
  municipality: MunicipalityFeature | null;
  onClose: () => void;
  visible: boolean;
  /** Metric the map is currently showing — the panel mirrors it. */
  metric?: DisplayMetric;
  scenario?: MapScenarioKey;
}

export default function MunicipalityProfilePanel({
  municipality,
  onClose,
  visible,
  metric = 'biomass_tons',
  scenario = 'baseline',
}: MunicipalityProfilePanelProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['overview', 'biomass'])
  );

  // Demographics and the sector breakdown are not in the slim collection payload
  // — fetch them for the municipality being shown. Hook runs before the early
  // return, so the null-safe access is deliberate.
  const rawCode = visible ? municipality?.properties?.ibge_code : null;
  const { data: detail } = useMunicipalityMetrics(rawCode == null ? null : String(rawCode));

  if (!visible || !municipality) return null;

  const props = { ...municipality.properties, ...(detail ?? {}) } as typeof municipality.properties;

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const formatNumber = (value: number | undefined | null) => {
    if (value === undefined || value === null) return 'N/A';
    return value.toLocaleString('pt-BR');
  };

  const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null || value <= 0) return 'N/A';
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    });
  };

  const formatBigNumber = (value: number | undefined | null) => {
    if (value === undefined || value === null) return 'N/A';
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(2)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(2)}K`;
    }
    return value.toFixed(0);
  };

  const formatTons = (value: number | undefined | null) => {
    if (value === undefined || value === null) return 'N/A';
    return `${formatBigNumber(value)} t/ano`;
  };

  // Per-residue rows must separate "we measured none" from "we have no data".
  // Sugarcane outside São Paulo has never been promoted, so its column is NULL,
  // and the old formatTons(getResidueBiomassTons(...)) rendered that as
  // "0 t/ano" — stating the municipality grows no cane. Same distinction the
  // choropleth already makes with its no_data grey.
  const formatResidue = (p: typeof props, residue: ResidueType) => {
    const tons = getResidueTonsOrNull(p, residue);
    return tons === null ? 'Sem dados' : `${formatBigNumber(tons)} t/ano`;
  };

  // Biomass tonnage is still needed for the per-residue rows further down, which
  // are always expressed in tonnes regardless of the metric on show.
  const totalBiomass = getTotalBiomassTons(props);

  // The headline figure and the sector split follow the ACTIVE MAP METRIC, so the
  // panel always answers the question the choropleth is currently asking. Every
  // value is read from the served payload through the metric registry — the panel
  // derives nothing itself (see mapValues.getSectorMetricValue).
  const spec = getMetricSpec(metric);
  const sectorRaw = {
    agricultural: getSectorMetricValue(props, 'agricultural', metric, scenario),
    livestock: getSectorMetricValue(props, 'livestock', metric, scenario),
    urban: getSectorMetricValue(props, 'urban', metric, scenario),
    // Florestal exists only under the served scenarios (migration 026); the
    // band scenarios have no forestry stream, so this stays null there and the
    // row is not rendered.
    forestry: getSectorMetricValue(props, 'forestry', metric, scenario),
  };

  // Display units (t/ano, Nm³/dia, MWh/ano) come from the registry, so the panel
  // and the legend can never disagree about what a number means.
  const toDisplay = (v: number | null) => (v === null ? null : spec.toDisplay(v));
  const agriculturalValue = toDisplay(sectorRaw.agricultural);
  const livestockValue = toDisplay(sectorRaw.livestock);
  const urbanValue = toDisplay(sectorRaw.urban);
  const forestryValue = toDisplay(sectorRaw.forestry);

  // The headline is the MUNICIPALITY TOTAL as the choropleth reads it, through
  // the same registry accessor that paints the polygon. It used to be the sum of
  // the sector rows, which made the panel depend on a breakdown it does not
  // always have: under the default scenario (Real) the per-sector columns are
  // not in the map payload, so every sector was null, the sum was 0, and the
  // panel printed "Sem dados" over a municipality the map was painting green.
  const totalValue = toDisplay(
    spec.rawValue(props, { biomassType: 'total', selectedResidues: [], scenario }).value
  );
  const metricTotal = totalValue ?? 0;

  // Percentages are shares of that same total. They need not reach 100%: the
  // served scenarios also carry sewage, which has no row here, so a visible
  // remainder is the honest reading rather than a rounding artefact.
  const share = (v: number | null) =>
    metricTotal > 0 && v !== null ? (v / metricTotal) * 100 : 0;
  const agriculturePercent = share(agriculturalValue);
  const livestockPercent = share(livestockValue);
  const urbanPercent = share(urbanValue);
  const forestryPercent = share(forestryValue);

  // A total with no breakdown at all is worth saying out loud, so the empty
  // "Composição por Fonte" is not read as three genuine zeroes.
  const hasSectorSplit =
    agriculturalValue !== null || livestockValue !== null || urbanValue !== null;

  return (
    <>
      {/* Backdrop — only in the side-drawer layout (landscape phones + desktop).
          In portrait the panel is a partial bottom sheet, so we deliberately
          render NO blocking backdrop: the map above the sheet stays visible and
          fully interactive (pan/zoom, tap another município). */}
      <div
        className="hidden landscape:block fixed inset-0 bg-black/30 backdrop-blur-sm z-[1100] transition-opacity"
        onClick={onClose}
      />

      {/* Profile Panel.
          Portrait  → bottom sheet: fixed to the bottom, ~62vh tall, rounded top.
          Landscape → right-side drawer, full height (matches desktop). */}
      <div
        className="fixed z-[1101] bg-white dark:bg-slate-900 shadow-2xl overflow-y-auto transform transition-transform
                   inset-x-0 bottom-0 max-h-[62vh] rounded-t-2xl
                   landscape:inset-x-auto landscape:right-0 landscape:top-0 landscape:bottom-0 landscape:max-h-none landscape:w-[min(85vw,400px)] landscape:rounded-none"
      >
        {/* Drag-handle affordance (bottom-sheet only) */}
        <div className="landscape:hidden flex justify-center pt-2 pb-1">
          <span className="h-1.5 w-10 rounded-full bg-gray-300 dark:bg-slate-600" aria-hidden="true" />
        </div>
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-[#1B5E20] to-[#2F7D32] text-white p-4 shadow-lg z-10 rounded-t-2xl landscape:rounded-none">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <MapPin className="w-4 h-4" />
                <span className="text-xs font-medium opacity-80">
                  {props.intermediate_region ? `Município · ${props.intermediate_region}` : 'Município'}
                </span>
              </div>
              <h2 className="text-xl font-bold mb-1">{props.name}</h2>
              <div className="flex items-center space-x-4 text-sm opacity-90">
                <span>IBGE: {props.ibge_code}</span>
                <span>•</span>
                <span>{props.intermediate_region}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="-mr-1 flex h-11 w-11 items-center justify-center rounded-lg hover:bg-white/20 transition-colors"
              title="Fechar"
              aria-label="Fechar painel do município"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Cluster Profile — shown when cluster data is available */}
          {props.cluster_label != null && (
            <div className="rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-slate-800">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Perfil de Resíduos 2023</h3>
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full text-white"
                  style={{
                    backgroundColor:
                      props.cluster_id === 0 ? '#4daf4a' :
                      props.cluster_id === 1 ? '#ff7f00' :
                      props.cluster_id === 2 ? '#e41a1c' :
                      props.cluster_id === 3 ? '#377eb8' : '#aaaaaa',
                  }}
                >
                  {props.cluster_label}
                </span>
              </div>
              <div className="px-4 py-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Potencial biogás</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {props.mun_total_GWh != null ? `${props.mun_total_GWh.toFixed(1)} GWh/ano` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Streams ativos</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {props.mun_n_streams ?? 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Stream dominante</span>
                  <span className="font-semibold text-gray-900 dark:text-white capitalize">
                    {props.mun_dominant_stream?.replace('_', ' ') ?? 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Overview Section */}
          <Section
            title="Visão Geral"
            icon={<BarChart3 className="w-5 h-5" />}
            expanded={expandedSections.has('overview')}
            onToggle={() => toggleSection('overview')}
          >
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                icon={<Users className="w-4 h-4 text-blue-600" />}
                label="População"
                value={formatNumber(props.population)}
                subtitle={`habitantes${props.population_year ? ` (${props.population_year})` : ''}`}
              />
              <StatCard
                icon={<Maximize className="w-4 h-4 text-green-600" />}
                label="Área"
                value={formatNumber(props.area_km2)}
                subtitle={`km²${props.area_year ? ` (${props.area_year})` : ''}`}
              />
              <StatCard
                icon={<Users className="w-4 h-4 text-purple-600" />}
                label="Densidade"
                value={
                  props.population_density
                    ? formatNumber(Math.round(props.population_density))
                    : props.population && props.area_km2
                    ? formatNumber(Math.round(props.population / props.area_km2))
                    : 'N/A'
                }
                subtitle="hab/km²"
              />
              <StatCard
                icon={<TrendingUp className="w-4 h-4 text-orange-600" />}
                label="PIB per capita"
                value={formatCurrency(props.gdp_per_capita)}
                subtitle={`per capita${props.gdp_year ? ` (${props.gdp_year})` : ''}`}
              />
            </div>
          </Section>

          {/* Potential section — follows whichever metric the map is showing */}
          <Section
            title={`Potencial de ${spec.toggleLabel}`}
            icon={<Factory className="w-5 h-5" />}
            expanded={expandedSections.has('biomass')}
            onToggle={() => toggleSection('biomass')}
          >
            <div className="space-y-4">
              {/* Headline figure in the active metric */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                <div className="text-xs text-green-700 dark:text-green-300 font-medium mb-1">
                  {spec.icon} {spec.toggleLabel} — Total
                </div>
                <div className="text-2xl font-bold text-green-900 dark:text-green-100 mb-0.5">
                  {metricTotal > 0 ? formatCompact(metricTotal) : 'Sem dados'}
                </div>
                <div className="text-xs text-green-600 dark:text-green-400">
                  {spec.unit}
                </div>
              </div>

              {/* Breakdown by source */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                  Composição por Fonte
                </h4>

                {hasSectorSplit ? (
                  <>
                    {/* Agricultural */}
                    <ProgressBar
                      label="Agrícola"
                      value={agriculturalValue ?? 0}
                      percentage={agriculturePercent}
                      color="green"
                      icon={<Leaf className="w-4 h-4" />}
                      unit={spec.unit}
                    />

                    {/* Livestock */}
                    <ProgressBar
                      label="Pecuária"
                      value={livestockValue ?? 0}
                      percentage={livestockPercent}
                      color="yellow"
                      icon={<Factory className="w-4 h-4" />}
                      unit={spec.unit}
                    />

                    {/* Urban */}
                    <ProgressBar
                      label="Urbano"
                      value={urbanValue ?? 0}
                      percentage={urbanPercent}
                      color="blue"
                      icon={<Droplets className="w-4 h-4" />}
                      unit={spec.unit}
                    />

                    {/* Forestry — served scenarios only */}
                    {forestryValue !== null && (
                      <ProgressBar
                        label="Florestal"
                        value={forestryValue}
                        percentage={forestryPercent}
                        color="emerald"
                        icon={<Trees className="w-4 h-4" />}
                        unit={spec.unit}
                      />
                    )}
                  </>
                ) : (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Sem quebra por setor para este município neste cenário.
                  </p>
                )}
              </div>
            </div>
          </Section>

          {/* Agricultural Details */}
          <Section
            title="Resíduos Agrícolas"
            icon={<Leaf className="w-5 h-5" />}
            expanded={expandedSections.has('agriculture')}
            onToggle={() => toggleSection('agriculture')}
          >
            <div className="space-y-2">
              <DetailRow label="Cana-de-açúcar" value={formatResidue(props, 'sugarcane')} />
              <DetailRow label="Soja" value={formatResidue(props, 'soybean')} />
              <DetailRow label="Milho" value={formatResidue(props, 'corn')} />
              <DetailRow label="Café" value={formatResidue(props, 'coffee')} />
              <DetailRow label="Citros" value={formatResidue(props, 'citrus')} />
            </div>
          </Section>

          {/* Livestock Details */}
          <Section
            title="Resíduos Pecuários"
            icon={<Factory className="w-5 h-5" />}
            expanded={expandedSections.has('livestock')}
            onToggle={() => toggleSection('livestock')}
          >
            <div className="space-y-2">
              <DetailRow label="Bovinos" value={formatResidue(props, 'cattle')} />
              <DetailRow label="Suínos" value={formatResidue(props, 'swine')} />
              <DetailRow label="Aves" value={formatResidue(props, 'poultry')} />
              <DetailRow label="Aquicultura" value={formatResidue(props, 'aquaculture')} />
            </div>
          </Section>

          {/* Urban Waste Details */}
          <Section
            title="Resíduos Urbanos"
            icon={<Droplets className="w-5 h-5" />}
            expanded={expandedSections.has('urban')}
            onToggle={() => toggleSection('urban')}
          >
            <div className="space-y-2">
              <DetailRow label="RSU (Resíduos Sólidos)" value={formatResidue(props, 'rsu')} />
              <DetailRow label="RPO (Resíduos Orgânicos)" value={formatResidue(props, 'rpo')} />
            </div>
          </Section>

          {/* External Links */}
          <div className="pt-4 border-t border-gray-200 dark:border-slate-700 space-y-2">
            {/* next-intl's Link, not a bare <a>. A raw href="/municipality/…"
                skips BOTH the basePath (/pilar2b) and the locale segment, so in
                production this button left the platform entirely and landed on
                the CP2b institutional site, which serves the same host at the
                root. Locally, where basePath is empty, it appeared to work. */}
            <Link
              href={`/municipality/${props.ibge_code}` as never}
              className="flex items-center justify-between p-4 rounded-lg bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors group border border-green-200 dark:border-green-800"
            >
              <span className="text-sm font-semibold text-green-800 dark:text-green-300">
                Ver Perfil Completo
              </span>
              <FileText className="w-4 h-4 text-green-600 group-hover:text-green-800 dark:text-green-400" />
            </Link>
            <a
              href={`https://cidades.ibge.gov.br/brasil/sp/${props.name.toLowerCase()}/panorama`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors group"
            >
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Ver mais dados no IBGE
              </span>
              <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
            </a>
          </div>
        </div>
      </div>
    </>
  );
}

// Helper Components

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function Section({ title, icon, expanded, onToggle, children }: SectionProps) {
  return (
    <div className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <div className="text-blue-600 dark:text-blue-400">{icon}</div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        )}
      </button>
      {expanded && <div className="p-4">{children}</div>}
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle: string;
}

function StatCard({ icon, label, value, subtitle }: StatCardProps) {
  return (
    <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3">
      <div className="flex items-center space-x-1.5 mb-1">
        {icon}
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</span>
      </div>
      <div className="text-lg font-bold text-gray-900 dark:text-white mb-0.5">{value}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</div>
    </div>
  );
}

interface ProgressBarProps {
  label: string;
  value: number;
  percentage: number;
  color: 'green' | 'yellow' | 'blue' | 'emerald';
  icon: React.ReactNode;
  unit?: string;
}

function ProgressBar({ label, value, percentage, color, icon, unit = 'm³/ano' }: ProgressBarProps) {
  const colorClasses = {
    green: {
      bg: 'bg-green-500',
      text: 'text-green-700 dark:text-green-300',
      lightBg: 'bg-green-100 dark:bg-green-900/20',
    },
    yellow: {
      bg: 'bg-yellow-500',
      text: 'text-yellow-700 dark:text-yellow-300',
      lightBg: 'bg-yellow-100 dark:bg-yellow-900/20',
    },
    blue: {
      bg: 'bg-blue-500',
      text: 'text-blue-700 dark:text-blue-300',
      lightBg: 'bg-blue-100 dark:bg-blue-900/20',
    },
    emerald: {
      bg: 'bg-emerald-700',
      text: 'text-emerald-800 dark:text-emerald-300',
      lightBg: 'bg-emerald-100 dark:bg-emerald-900/20',
    },
  };

  const colors = colorClasses[color];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className={colors.text}>{icon}</div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        </div>
        <div className="text-sm font-semibold text-gray-900 dark:text-white">
          {value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} {unit}
        </div>
      </div>
      <div className="relative h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${colors.bg} transition-all duration-300`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 text-right">
        {percentage.toFixed(1)}% do total
      </div>
    </div>
  );
}

interface DetailRowProps {
  label: string;
  value: string;
}

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-slate-700 last:border-0">
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      <span className="text-sm font-semibold text-gray-900 dark:text-white">{value}</span>
    </div>
  );
}
