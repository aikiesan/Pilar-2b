/**
 * Enhanced Tooltip Component
 * Rich, contextual tooltips with smooth animations
 */

'use client';

import React from 'react';
import { TrendingUp, Users, Maximize, Factory, Leaf, Droplets } from 'lucide-react';
import type { MunicipalityFeature } from '@/types/geospatial';

interface EnhancedTooltipProps {
  municipality: MunicipalityFeature;
  position: { x: number; y: number };
  visible: boolean;
}

export default function EnhancedTooltip({
  municipality,
  position,
  visible,
}: EnhancedTooltipProps) {
  if (!visible) return null;

  const props = municipality.properties;

  const formatNumber = (value: number | undefined | null) => {
    if (value === undefined || value === null) return 'N/A';
    if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toLocaleString('pt-BR');
  };

  const totalBiogas = props.total_biogas_m3_year || 0;
  const agriculturalBiogas = props.agricultural_biogas_m3_year || 0;
  const livestockBiogas = props.livestock_biogas_m3_year || 0;
  const urbanBiogas = props.urban_biogas_m3_year || 0;

  const agriculturePercent = totalBiogas > 0 ? (agriculturalBiogas / totalBiogas) * 100 : 0;
  const livestockPercent = totalBiogas > 0 ? (livestockBiogas / totalBiogas) * 100 : 0;
  const urbanPercent = totalBiogas > 0 ? (urbanBiogas / totalBiogas) * 100 : 0;

  return (
    <div
      className="fixed z-[1200] pointer-events-none animate-fade-in"
      style={{
        left: position.x + 15,
        top: position.y - 10,
        transform: 'translateY(-100%)',
      }}
    >
      {/* Glass-morphism tooltip */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-xl shadow-2xl border border-gray-200/50 dark:border-slate-700/50 p-4 min-w-[320px] max-w-[400px]">
        {/* Header */}
        <div className="mb-3 pb-3 border-b border-gray-200 dark:border-slate-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
            {props.name}
          </h3>
          <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
            <span>IBGE: {props.ibge_code}</span>
            <span>•</span>
            <span>{props.intermediate_region}</span>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <QuickStat
            icon={<Users className="w-4 h-4 text-blue-600" />}
            label="População"
            value={formatNumber(props.population)}
          />
          <QuickStat
            icon={<Maximize className="w-4 h-4 text-green-600" />}
            label="Área"
            value={`${formatNumber(props.area_km2)} km²`}
          />
        </div>

        {/* Biogas Potential */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-3 mb-3">
          <div className="flex items-center space-x-2 mb-2">
            <Factory className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
              Potencial de Biogás
            </span>
          </div>
          <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
            {formatNumber(totalBiogas)}
          </div>
          <div className="text-xs text-blue-600 dark:text-blue-400">
            m³/ano
          </div>
        </div>

        {/* Composition Breakdown */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Composição:
          </div>
          {agriculturePercent > 0 && (
            <MiniProgressBar
              icon={<Leaf className="w-3 h-3" />}
              label="Agrícola"
              value={agriculturePercent}
              color="green"
            />
          )}
          {livestockPercent > 0 && (
            <MiniProgressBar
              icon={<Factory className="w-3 h-3" />}
              label="Pecuária"
              value={livestockPercent}
              color="yellow"
            />
          )}
          {urbanPercent > 0 && (
            <MiniProgressBar
              icon={<Droplets className="w-3 h-3" />}
              label="Urbano"
              value={urbanPercent}
              color="blue"
            />
          )}
        </div>

        {/* Tooltip Arrow */}
        <div className="absolute bottom-0 left-8 transform translate-y-full">
          <div className="w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-white dark:border-t-slate-900" />
        </div>
      </div>
    </div>
  );
}

// Helper Components

interface QuickStatProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function QuickStat({ icon, label, value }: QuickStatProps) {
  return (
    <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-2">
      <div className="flex items-center space-x-1 mb-1">
        {icon}
        <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
      </div>
      <div className="text-sm font-bold text-gray-900 dark:text-white truncate">
        {value}
      </div>
    </div>
  );
}

interface MiniProgressBarProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'green' | 'yellow' | 'blue';
}

function MiniProgressBar({ icon, label, value, color }: MiniProgressBarProps) {
  const colorClasses = {
    green: 'bg-green-500 text-green-700 dark:text-green-300',
    yellow: 'bg-yellow-500 text-yellow-700 dark:text-yellow-300',
    blue: 'bg-blue-500 text-blue-700 dark:text-blue-300',
  };

  const bgClass = colorClasses[color].split(' ')[0];
  const textClass = colorClasses[color].split(' ').slice(1).join(' ');

  return (
    <div className="flex items-center space-x-2">
      <div className={textClass}>{icon}</div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className={`text-xs font-medium ${textClass}`}>{label}</span>
          <span className="text-xs font-bold text-gray-900 dark:text-white">
            {value.toFixed(1)}%
          </span>
        </div>
        <div className="h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${bgClass} transition-all duration-300`}
            style={{ width: `${value}%` }}
          />
        </div>
      </div>
    </div>
  );
}
