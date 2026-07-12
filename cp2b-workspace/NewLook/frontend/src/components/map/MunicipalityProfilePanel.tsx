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
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
} from 'lucide-react';
import type { MunicipalityFeature } from '@/types/geospatial';
import {
  getResidueBiomassTons,
  getSectorBiomassTons,
  getTotalBiomassTons,
} from '@/lib/biomassAvailability';

interface MunicipalityProfilePanelProps {
  municipality: MunicipalityFeature | null;
  onClose: () => void;
  visible: boolean;
}

export default function MunicipalityProfilePanel({
  municipality,
  onClose,
  visible,
}: MunicipalityProfilePanelProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['overview', 'biomass'])
  );

  if (!visible || !municipality) return null;

  const props = municipality.properties;

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

  // IBGE Cidades uses deburred, hyphenated slugs (e.g. "Ribeirão Preto" →
  // "ribeirao-preto"). A bare toLowerCase() keeps accents/spaces and 404s.
  const ibgeSlug = (name: string) =>
    name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  // Calculate totals
  const agriculturalBiomass = getSectorBiomassTons(props, 'agricultural');
  const livestockBiomass = getSectorBiomassTons(props, 'livestock');
  const urbanBiomass = getSectorBiomassTons(props, 'urban');
  const totalBiomass = getTotalBiomassTons(props);

  // Calculate percentages
  const agriculturePercent = totalBiomass > 0 ? (agriculturalBiomass / totalBiomass) * 100 : 0;
  const livestockPercent = totalBiomass > 0 ? (livestockBiomass / totalBiomass) * 100 : 0;
  const urbanPercent = totalBiomass > 0 ? (urbanBiomass / totalBiomass) * 100 : 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[1100] transition-opacity"
        onClick={onClose}
      />

      {/* Profile Panel - Slide in from right */}
      <div className="fixed right-0 top-0 bottom-0 w-full md:w-[360px] lg:w-[400px] bg-white dark:bg-slate-900 shadow-2xl z-[1101] overflow-y-auto transform transition-transform">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-[#1B5E20] to-[#2F7D32] text-white p-4 shadow-lg z-10">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <MapPin className="w-4 h-4" />
                <span className="text-xs font-medium opacity-80">Município de São Paulo</span>
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
              className="p-2 rounded-lg hover:bg-white/20 transition-colors"
              title="Fechar"
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

          {/* Biomass Availability Section */}
          <Section
            title="Disponibilidade de Biomassa"
            icon={<Factory className="w-5 h-5" />}
            expanded={expandedSections.has('biomass')}
            onToggle={() => toggleSection('biomass')}
          >
            <div className="space-y-4">
              {/* Total Biomass */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                <div className="text-xs text-green-700 dark:text-green-300 font-medium mb-1">
                  Biomassa Disponível Total
                </div>
                <div className="text-2xl font-bold text-green-900 dark:text-green-100 mb-0.5">
                  {formatBigNumber(totalBiomass)}
                </div>
                <div className="text-xs text-green-600 dark:text-green-400">
                  toneladas/ano de biomassa
                </div>
              </div>

              {/* Breakdown by source */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                  Composição por Fonte
                </h4>

                {/* Agricultural */}
                <ProgressBar
                  label="Agrícola"
                  value={agriculturalBiomass}
                  percentage={agriculturePercent}
                  color="green"
                  icon={<Leaf className="w-4 h-4" />}
                  unit="t/ano"
                />

                {/* Livestock */}
                <ProgressBar
                  label="Pecuária"
                  value={livestockBiomass}
                  percentage={livestockPercent}
                  color="yellow"
                  icon={<Factory className="w-4 h-4" />}
                  unit="t/ano"
                />

                {/* Urban */}
                <ProgressBar
                  label="Urbano"
                  value={urbanBiomass}
                  percentage={urbanPercent}
                  color="blue"
                  icon={<Droplets className="w-4 h-4" />}
                  unit="t/ano"
                />
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
              <DetailRow label="Cana-de-açúcar" value={formatTons(getResidueBiomassTons(props, 'sugarcane'))} />
              <DetailRow label="Soja" value={formatTons(getResidueBiomassTons(props, 'soybean'))} />
              <DetailRow label="Milho" value={formatTons(getResidueBiomassTons(props, 'corn'))} />
              <DetailRow label="Café" value={formatTons(getResidueBiomassTons(props, 'coffee'))} />
              <DetailRow label="Citros" value={formatTons(getResidueBiomassTons(props, 'citrus'))} />
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
              <DetailRow label="Bovinos" value={formatTons(getResidueBiomassTons(props, 'cattle'))} />
              <DetailRow label="Suínos" value={formatTons(getResidueBiomassTons(props, 'swine'))} />
              <DetailRow label="Aves" value={formatTons(getResidueBiomassTons(props, 'poultry'))} />
              <DetailRow label="Aquicultura" value={formatTons(getResidueBiomassTons(props, 'aquaculture'))} />
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
              <DetailRow label="RSU (Resíduos Sólidos)" value={formatTons(getResidueBiomassTons(props, 'rsu'))} />
              <DetailRow label="RPO (Resíduos Orgânicos)" value={formatTons(getResidueBiomassTons(props, 'rpo'))} />
            </div>
          </Section>

          {/* External Links */}
          <div className="pt-4 border-t border-gray-200 dark:border-slate-700 space-y-2">
            <a
              href={`/municipality/${props.ibge_code}`}
              className="flex items-center justify-between p-4 rounded-lg bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors group border border-green-200 dark:border-green-800"
            >
              <span className="text-sm font-semibold text-green-800 dark:text-green-300">
                Ver Perfil Completo
              </span>
              <FileText className="w-4 h-4 text-green-600 group-hover:text-green-800 dark:text-green-400" />
            </a>
            <a
              href={`https://cidades.ibge.gov.br/brasil/sp/${ibgeSlug(props.name)}/panorama`}
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
  color: 'green' | 'yellow' | 'blue';
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
