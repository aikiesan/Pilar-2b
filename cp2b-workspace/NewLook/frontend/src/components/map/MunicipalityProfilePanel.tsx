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
    new Set(['overview', 'biogas'])
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

  // Calculate totals
  const totalBiogas = props.total_biogas_m3_year || 0;
  const agriculturalBiogas = props.agricultural_biogas_m3_year || 0;
  const livestockBiogas = props.livestock_biogas_m3_year || 0;
  const urbanBiogas = props.urban_biogas_m3_year || 0;

  // Calculate percentages
  const agriculturePercent = totalBiogas > 0 ? (agriculturalBiogas / totalBiogas) * 100 : 0;
  const livestockPercent = totalBiogas > 0 ? (livestockBiogas / totalBiogas) * 100 : 0;
  const urbanPercent = totalBiogas > 0 ? (urbanBiogas / totalBiogas) * 100 : 0;

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

          {/* Biogas Potential Section */}
          <Section
            title="Potencial de Biogás"
            icon={<Factory className="w-5 h-5" />}
            expanded={expandedSections.has('biogas')}
            onToggle={() => toggleSection('biogas')}
          >
            <div className="space-y-4">
              {/* Total Biogas */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                <div className="text-xs text-green-700 dark:text-green-300 font-medium mb-1">
                  Potencial Total
                </div>
                <div className="text-2xl font-bold text-green-900 dark:text-green-100 mb-0.5">
                  {formatBigNumber(totalBiogas)}
                </div>
                <div className="text-xs text-green-600 dark:text-green-400">
                  m³/ano de biogás
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
                  value={agriculturalBiogas}
                  percentage={agriculturePercent}
                  color="green"
                  icon={<Leaf className="w-4 h-4" />}
                />

                {/* Livestock */}
                <ProgressBar
                  label="Pecuária"
                  value={livestockBiogas}
                  percentage={livestockPercent}
                  color="yellow"
                  icon={<Factory className="w-4 h-4" />}
                />

                {/* Urban */}
                <ProgressBar
                  label="Urbano"
                  value={urbanBiogas}
                  percentage={urbanPercent}
                  color="blue"
                  icon={<Droplets className="w-4 h-4" />}
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
              <DetailRow label="Cana-de-açúcar" value={formatBigNumber(props.sugarcane_biogas_m3_year)} />
              <DetailRow label="Soja" value={formatBigNumber(props.soybean_biogas_m3_year)} />
              <DetailRow label="Milho" value={formatBigNumber(props.corn_biogas_m3_year)} />
              <DetailRow label="Café" value={formatBigNumber(props.coffee_biogas_m3_year)} />
              <DetailRow label="Citros" value={formatBigNumber(props.citrus_biogas_m3_year)} />
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
              <DetailRow label="Bovinos" value={formatBigNumber(props.cattle_biogas_m3_year)} />
              <DetailRow label="Suínos" value={formatBigNumber(props.swine_biogas_m3_year)} />
              <DetailRow label="Aves" value={formatBigNumber(props.poultry_biogas_m3_year)} />
              <DetailRow label="Aquicultura" value={formatBigNumber(props.aquaculture_biogas_m3_year)} />
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
              <DetailRow label="RSU (Resíduos Sólidos)" value={formatBigNumber(props.rsu_biogas_m3_year)} />
              <DetailRow label="RPO (Resíduos Orgânicos)" value={formatBigNumber(props.rpo_biogas_m3_year)} />
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
  color: 'green' | 'yellow' | 'blue';
  icon: React.ReactNode;
}

function ProgressBar({ label, value, percentage, color, icon }: ProgressBarProps) {
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
          {value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} m³/ano
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
      <span className="text-sm font-semibold text-gray-900 dark:text-white">{value} m³/ano</span>
    </div>
  );
}
