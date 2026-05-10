'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Flame, Zap, Calendar, TrendingUp, Info, X } from 'lucide-react';
import { getResidueByCode } from '@/data/residueFactors';
import type { WizardConfig } from '@/types/technology-routes';

interface ResultsSidebarProps {
  config: WizardConfig;
  onClose: () => void;
}

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function formatLarge(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}k`;
  return value.toFixed(0);
}

export default function ResultsSidebar({ config, onClose }: ResultsSidebarProps) {
  const t = useTranslations('technology_routes.results');

  const residue = getResidueByCode(config.residueCode);

  const calcs = useMemo(() => {
    if (!residue) return null;

    const rpr = residue.rpr ?? 1.0;
    // Theoretical Biogas: crop mass × residue fraction × BMP (m³/kgSV → ×1000 for t)
    const theoreticalBiogasM3 = config.amountTons * rpr * residue.bmp * 1000;

    // FDE-adjusted available biogas
    const fde = residue.fde / 100; // fde is stored as percentage
    const availableBiogasM3 = theoreticalBiogasM3 * fde;

    // Energy: assuming ~6 kWh/m³ biogas and 35% engine efficiency for electrical output
    const energyMWh = (availableBiogasM3 * 6.0) / 1000;

    // CH₄ equivalent (60% of biogas)
    const ch4M3 = availableBiogasM3 * 0.60;

    // Availability factor
    const availFraction = config.availabilityMonths.length / 12;
    const annualBiogasAdjusted = availableBiogasM3 * availFraction;
    const annualEnergyAdjusted = energyMWh * availFraction;

    return {
      theoreticalBiogasM3,
      availableBiogasM3,
      fde,
      energyMWh,
      ch4M3,
      availFraction,
      annualBiogasAdjusted,
      annualEnergyAdjusted,
      rpr,
    };
  }, [residue, config]);

  if (!residue || !calcs) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-6 text-gray-500 text-sm">
        <Info className="h-8 w-8 mb-2 text-gray-300" />
        <p>{t('no_residue')}</p>
      </div>
    );
  }

  const isSeasonal = config.availabilityMonths.length < 12;

  return (
    <div className="flex flex-col h-full bg-white overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-gradient-to-r from-cp2b-green to-cp2b-lime px-4 py-3 flex items-center justify-between z-10">
        <div>
          <h2 className="text-base font-bold text-white">{t('title')}</h2>
          <p className="text-xs text-white/80 truncate max-w-[180px]">{residue.name}</p>
        </div>
        <button onClick={onClose} className="text-white bg-white/20 hover:bg-white/30 rounded-lg p-1.5 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Residue summary */}
        <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1.5">
          <div className="flex justify-between">
            <span className="text-gray-500">{t('residue')}</span>
            <span className="font-medium text-gray-900 text-right max-w-[160px] truncate">{residue.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">{t('amount')}</span>
            <span className="font-medium">{config.amountTons.toLocaleString('pt-BR')} t/ano</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">{t('rpr')}</span>
            <span className="font-medium">{(calcs.rpr * 100).toFixed(0)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">BMP</span>
            <span className="font-medium">{residue.bmp} m³/kgSV</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">FDE</span>
            <span className="font-semibold text-cp2b-green">{residue.fde.toFixed(2)}%</span>
          </div>
        </div>

        {/* KPI cards */}
        <div className="space-y-3">
          {/* Theoretical biogas */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Flame className="h-4 w-4 text-amber-600" />
              <span className="text-xs font-semibold text-amber-800 uppercase tracking-wide">{t('theoretical_biogas')}</span>
            </div>
            <p className="text-2xl font-bold text-amber-700">{formatLarge(calcs.theoreticalBiogasM3)}</p>
            <p className="text-xs text-amber-600">m³/ano</p>
          </div>

          {/* Available biogas (FDE-adjusted) */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-xs font-semibold text-green-800 uppercase tracking-wide">{t('available_biogas')}</span>
            </div>
            <p className="text-2xl font-bold text-green-700">{formatLarge(calcs.availableBiogasM3)}</p>
            <p className="text-xs text-green-600">m³/ano · FDE {residue.fde.toFixed(1)}%</p>
          </div>

          {/* Energy potential */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-semibold text-blue-800 uppercase tracking-wide">{t('energy_potential')}</span>
            </div>
            <p className="text-2xl font-bold text-blue-700">{formatLarge(calcs.energyMWh)}</p>
            <p className="text-xs text-blue-600">MWh/ano · 6 kWh/m³</p>
          </div>

          {/* CH₄ equivalent */}
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Flame className="h-4 w-4 text-purple-600" />
              <span className="text-xs font-semibold text-purple-800 uppercase tracking-wide">{t('ch4_equivalent')}</span>
            </div>
            <p className="text-2xl font-bold text-purple-700">{formatLarge(calcs.ch4M3)}</p>
            <p className="text-xs text-purple-600">m³ CH₄/ano · 60%</p>
          </div>
        </div>

        {/* Availability */}
        <div className="border border-gray-200 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-semibold text-gray-700">{t('availability')}</span>
          </div>
          <div className="grid grid-cols-6 gap-1 mb-2">
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <div
                key={m}
                className={`text-center py-1 rounded text-xs font-medium ${
                  config.availabilityMonths.includes(m)
                    ? 'bg-cp2b-green text-white'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {MONTH_NAMES[m - 1]}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-600">
            {config.availabilityMonths.length}/12 {t('months')} ({(calcs.availFraction * 100).toFixed(0)}%)
          </p>
          {isSeasonal && (
            <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-2">
              <p className="text-xs text-amber-700">
                <span className="font-semibold">⚠ {t('seasonal_note')}:</span>{' '}
                {t('seasonal_desc', { months: config.availabilityMonths.length })}
              </p>
              <div className="mt-1.5 pt-1.5 border-t border-amber-200 space-y-0.5">
                <p className="text-xs text-amber-800 font-medium">{t('adjusted_label')}:</p>
                <p className="text-xs text-amber-700">{formatLarge(calcs.annualBiogasAdjusted)} m³ {t('biogas')} · {formatLarge(calcs.annualEnergyAdjusted)} MWh</p>
              </div>
            </div>
          )}
        </div>

        {/* Coming soon */}
        <div className="border border-dashed border-gray-300 rounded-xl p-3 text-center text-xs text-gray-400">
          <p className="font-medium text-gray-500 mb-1">{t('coming_soon')}</p>
          <p>{t('cost_water_estimates')}</p>
        </div>
      </div>
    </div>
  );
}
