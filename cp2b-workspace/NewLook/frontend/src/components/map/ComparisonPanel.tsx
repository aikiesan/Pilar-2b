/**
 * Multi-Parameter Comparison Panel
 * Professional side-by-side municipality comparison tool
 */

'use client';

import React, { useState } from 'react';
import {
  X,
  Plus,
  Minus,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Users,
  Leaf,
  Factory,
  Droplets,
  ArrowRight,
} from 'lucide-react';
import type { MunicipalityFeature } from '@/types/geospatial';

interface ComparisonPanelProps {
  municipalities: MunicipalityFeature[];
  selectedMunicipalities: MunicipalityFeature[];
  onMunicipalityAdd: (municipality: MunicipalityFeature) => void;
  onMunicipalityRemove: (municipalityId: number) => void;
  onClose: () => void;
  visible: boolean;
}

type MetricCategory = 'overview' | 'biogas' | 'agriculture' | 'livestock' | 'urban';

export default function ComparisonPanel({
  municipalities,
  selectedMunicipalities,
  onMunicipalityAdd,
  onMunicipalityRemove,
  onClose,
  visible,
}: ComparisonPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<MetricCategory>('overview');

  if (!visible) return null;

  const filteredMunicipalities = municipalities.filter((mun) =>
    mun.properties.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categories: Array<{ id: MetricCategory; label: string; icon: React.ReactNode }> = [
    { id: 'overview', label: 'Visão Geral', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'biogas', label: 'Biogás Total', icon: <Factory className="w-4 h-4" /> },
    { id: 'agriculture', label: 'Agrícola', icon: <Leaf className="w-4 h-4" /> },
    { id: 'livestock', label: 'Pecuária', icon: <Factory className="w-4 h-4" /> },
    { id: 'urban', label: 'Urbano', icon: <Droplets className="w-4 h-4" /> },
  ];

  const formatNumber = (value: number | undefined | null) => {
    if (value === undefined || value === null || value === 0) return '-';
    if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toFixed(0);
  };

  const getMetrics = (category: MetricCategory) => {
    switch (category) {
      case 'overview':
        return [
          { label: 'População', key: 'population', unit: 'hab' },
          { label: 'Área', key: 'area_km2', unit: 'km²' },
          { label: 'Biogás Total', key: 'total_biogas_m3_year', unit: 'm³/ano' },
        ];
      case 'biogas':
        return [
          { label: 'Total', key: 'total_biogas_m3_year', unit: 'm³/ano' },
          { label: 'Agrícola', key: 'agricultural_biogas_m3_year', unit: 'm³/ano' },
          { label: 'Pecuária', key: 'livestock_biogas_m3_year', unit: 'm³/ano' },
          { label: 'Urbano', key: 'urban_biogas_m3_year', unit: 'm³/ano' },
        ];
      case 'agriculture':
        return [
          { label: 'Cana-de-açúcar', key: 'sugarcane_biogas_m3_year', unit: 'm³/ano' },
          { label: 'Soja', key: 'soybean_biogas_m3_year', unit: 'm³/ano' },
          { label: 'Milho', key: 'corn_biogas_m3_year', unit: 'm³/ano' },
          { label: 'Café', key: 'coffee_biogas_m3_year', unit: 'm³/ano' },
          { label: 'Citros', key: 'citrus_biogas_m3_year', unit: 'm³/ano' },
        ];
      case 'livestock':
        return [
          { label: 'Bovinos', key: 'cattle_biogas_m3_year', unit: 'm³/ano' },
          { label: 'Suínos', key: 'swine_biogas_m3_year', unit: 'm³/ano' },
          { label: 'Aves', key: 'poultry_biogas_m3_year', unit: 'm³/ano' },
          { label: 'Aquicultura', key: 'aquaculture_biogas_m3_year', unit: 'm³/ano' },
        ];
      case 'urban':
        return [
          { label: 'RSU', key: 'rsu_biogas_m3_year', unit: 'm³/ano' },
          { label: 'RPO', key: 'rpo_biogas_m3_year', unit: 'm³/ano' },
        ];
      default:
        return [];
    }
  };

  const metrics = getMetrics(activeCategory);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[1100] transition-opacity"
        onClick={onClose}
      />

      {/* Comparison Panel */}
      <div className="fixed inset-4 md:inset-8 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl z-[1101] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 dark:from-purple-700 dark:to-purple-800 text-white p-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1">Comparação de Municípios</h2>
              <p className="text-sm opacity-90">
                Compare até 4 municípios lado a lado
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/20 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Municipality Selection */}
          {selectedMunicipalities.length < 4 && (
            <div className="p-6 border-b border-gray-200 dark:border-slate-700">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Adicionar Município para Comparação
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Digite o nome do município..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-slate-800 dark:text-white"
              />
              {searchQuery && filteredMunicipalities.length > 0 && (
                <div className="mt-2 max-h-48 overflow-y-auto border border-gray-200 dark:border-slate-700 rounded-lg">
                  {filteredMunicipalities.slice(0, 10).map((mun) => {
                    const isSelected = selectedMunicipalities.some(
                      (selected) => selected.properties.ibge_code === mun.properties.ibge_code
                    );
                    return (
                      <button
                        key={mun.properties.ibge_code}
                        onClick={() => {
                          if (!isSelected && selectedMunicipalities.length < 4) {
                            onMunicipalityAdd(mun);
                            setSearchQuery('');
                          }
                        }}
                        disabled={isSelected || selectedMunicipalities.length >= 4}
                        className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="font-medium text-gray-900 dark:text-white">
                          {mun.properties.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          IBGE: {mun.properties.ibge_code} • {mun.properties.intermediate_region}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Category Tabs */}
          <div className="border-b border-gray-200 dark:border-slate-700">
            <div className="flex space-x-1 p-2 overflow-x-auto">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
                    activeCategory === category.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {category.icon}
                  <span>{category.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Comparison Table */}
          {selectedMunicipalities.length > 0 ? (
            <div className="p-6 overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="sticky left-0 bg-white dark:bg-slate-900 p-4 text-left font-semibold text-gray-900 dark:text-white border-b-2 border-gray-200 dark:border-slate-700">
                      Métrica
                    </th>
                    {selectedMunicipalities.map((mun) => (
                      <th
                        key={mun.properties.ibge_code}
                        className="p-4 text-center font-semibold text-gray-900 dark:text-white border-b-2 border-gray-200 dark:border-slate-700 min-w-[200px]"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm truncate">{mun.properties.name}</span>
                          <button
                            onClick={() => onMunicipalityRemove(Number(mun.properties.ibge_code))}
                            className="ml-2 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {mun.properties.intermediate_region}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((metric, index) => {
                    const values = selectedMunicipalities.map(
                      (mun) => (mun.properties as any)[metric.key] || 0
                    );
                    const maxValue = Math.max(...values);
                    const minValue = Math.min(...values.filter((v) => v > 0));

                    return (
                      <tr
                        key={metric.key}
                        className={index % 2 === 0 ? 'bg-gray-50 dark:bg-slate-800/50' : ''}
                      >
                        <td className="sticky left-0 bg-inherit p-4 font-medium text-gray-700 dark:text-gray-300">
                          {metric.label}
                        </td>
                        {selectedMunicipalities.map((mun) => {
                          const value = (mun.properties as any)[metric.key] || 0;
                          const isMax = value > 0 && value === maxValue && values.filter(v => v > 0).length > 1;
                          const isMin = value > 0 && value === minValue && minValue !== maxValue && values.filter(v => v > 0).length > 1;

                          return (
                            <td
                              key={mun.properties.ibge_code}
                              className="p-4 text-center"
                            >
                              <div className="flex items-center justify-center space-x-2">
                                {isMax && <TrendingUp className="w-4 h-4 text-green-600" />}
                                {isMin && <TrendingDown className="w-4 h-4 text-red-600" />}
                                <span
                                  className={`font-semibold ${
                                    isMax
                                      ? 'text-green-700 dark:text-green-400'
                                      : isMin
                                      ? 'text-red-700 dark:text-red-400'
                                      : 'text-gray-900 dark:text-white'
                                  }`}
                                >
                                  {formatNumber(value)}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {metric.unit}
                              </div>
                              {/* Progress bar */}
                              {maxValue > 0 && value > 0 && (
                                <div className="mt-2 h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full ${
                                      isMax ? 'bg-green-500' : isMin ? 'bg-red-500' : 'bg-blue-500'
                                    }`}
                                    style={{ width: `${(value / maxValue) * 100}%` }}
                                  />
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-12">
              <div className="text-center">
                <Plus className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Nenhum Município Selecionado
                </h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-md">
                  Use a busca acima para adicionar municípios à comparação
                </p>
              </div>
            </div>
          )}

          {/* Legend */}
          {selectedMunicipalities.length > 1 && (
            <div className="p-6 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
              <div className="flex items-center justify-center space-x-6 text-sm">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-gray-700 dark:text-gray-300">Maior valor</span>
                </div>
                <div className="flex items-center space-x-2">
                  <TrendingDown className="w-4 h-4 text-red-600" />
                  <span className="text-gray-700 dark:text-gray-300">Menor valor</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
