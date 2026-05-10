'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Flame, Zap, Calendar, TrendingUp, Info, X, DollarSign, Leaf } from 'lucide-react';
import { getResidueByCode } from '@/data/residueFactors';
import { SP_MARKET_BASELINES, CONVERSION, calcOutcome } from '@/data/market-prices';
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

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
}

// Merges user-provided tariffs with SP market baselines (baseline used when field is absent)
function effectivePrice(key: keyof typeof SP_MARKET_BASELINES, tariffs?: WizardConfig['tariffs']): number {
  const override = tariffs?.[key as keyof typeof tariffs];
  return (override != null && !isNaN(override)) ? override : SP_MARKET_BASELINES[key];
}

export default function ResultsSidebar({ config, onClose }: ResultsSidebarProps) {
  const t = useTranslations('technology_routes.results');

  const residue = getResidueByCode(config.residueCode);

  const calcs = useMemo(() => {
    if (!residue) return null;

    const rpr = residue.rpr ?? 1.0;
    // Theoretical biogas from BMP (m³/kgSV × t × 1000 kg/t)
    const theoreticalBiogasM3 = config.amountTons * rpr * residue.bmp * 1000;
    const fde = residue.fde / 100;
    const availableBiogasM3 = theoreticalBiogasM3 * fde;

    // Electrical output using CHP conversion factor (1.43 kWh/m³ biogas)
    const energyElecMWh = (availableBiogasM3 * CONVERSION.biogasToElec) / 1000;

    // CH₄ equivalent
    const ch4M3 = availableBiogasM3 * CONVERSION.biogasToMethane;

    // Seasonality
    const availFraction = config.availabilityMonths.length / 12;
    const adjBiogasM3   = availableBiogasM3 * availFraction;
    const adjEnergyMWh  = energyElecMWh * availFraction;
    const adjTons       = config.amountTons * availFraction;

    // Financial — use user tariffs where provided, SP baselines as fallback
    const prices = {
      electricity: effectivePrice('electricity', config.tariffs),
      biomethane:  effectivePrice('biomethane',  config.tariffs),
      fertilizer:  effectivePrice('fertilizer',  config.tariffs),
      heat:        effectivePrice('heat',        config.tariffs),
      carbon:      effectivePrice('carbon',      config.tariffs),
    };

    // Determine which outcomes to show financial cards for
    const outcomes = config.businessOutcomes ?? [];
    const showAll  = outcomes.length === 0; // legacy: show all if no businessOutcomes set

    const electricityRevenue = (showAll || outcomes.includes('elec'))
      ? calcOutcome('elec', adjBiogasM3, adjTons, prices).revenue : null;
    const biomethaneRevenue  = (showAll || outcomes.includes('fuel'))
      ? calcOutcome('fuel', adjBiogasM3, adjTons, prices).revenue : null;
    const fertilizerRevenue  = (showAll || outcomes.includes('fert'))
      ? calcOutcome('fert', adjBiogasM3, adjTons, prices).revenue : null;
    const heatRevenue        = outcomes.includes('heat')
      ? calcOutcome('heat', adjBiogasM3, adjTons, prices).revenue : null;
    const carbonRevenue      = outcomes.includes('co2')
      ? calcOutcome('co2',  adjBiogasM3, adjTons, prices).revenue : null;

    const revenues = [electricityRevenue, biomethaneRevenue, fertilizerRevenue, heatRevenue, carbonRevenue]
      .filter((v): v is number => v !== null);
    const totalRevenue = revenues.length > 0 ? revenues.reduce((a, b) => a + b, 0) : null;

    return {
      theoreticalBiogasM3,
      availableBiogasM3,
      fde,
      energyElecMWh,
      ch4M3,
      availFraction,
      adjBiogasM3,
      adjEnergyMWh,
      adjTons,
      rpr,
      electricityRevenue,
      biomethaneRevenue,
      fertilizerRevenue,
      heatRevenue,
      carbonRevenue,
      totalRevenue,
      prices,
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

        {/* Physical KPI cards */}
        <div className="space-y-3">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Flame className="h-4 w-4 text-amber-600" />
              <span className="text-xs font-semibold text-amber-800 uppercase tracking-wide">{t('theoretical_biogas')}</span>
            </div>
            <p className="text-2xl font-bold text-amber-700">{formatLarge(calcs.theoreticalBiogasM3)}</p>
            <p className="text-xs text-amber-600">m³/ano</p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-xs font-semibold text-green-800 uppercase tracking-wide">{t('available_biogas')}</span>
            </div>
            <p className="text-2xl font-bold text-green-700">{formatLarge(calcs.availableBiogasM3)}</p>
            <p className="text-xs text-green-600">m³/ano · FDE {residue.fde.toFixed(1)}%</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-semibold text-blue-800 uppercase tracking-wide">{t('energy_potential')}</span>
            </div>
            <p className="text-2xl font-bold text-blue-700">{formatLarge(calcs.energyElecMWh)}</p>
            <p className="text-xs text-blue-600">MWh/ano · 1.43 kWh/m³ (CHP)</p>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Flame className="h-4 w-4 text-purple-600" />
              <span className="text-xs font-semibold text-purple-800 uppercase tracking-wide">{t('ch4_equivalent')}</span>
            </div>
            <p className="text-2xl font-bold text-purple-700">{formatLarge(calcs.ch4M3)}</p>
            <p className="text-xs text-purple-600">m³ CH₄/ano · 60%</p>
          </div>
        </div>

        {/* Availability calendar */}
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
                <p className="text-xs text-amber-700">{formatLarge(calcs.adjBiogasM3)} m³ {t('biogas')} · {formatLarge(calcs.adjEnergyMWh)} MWh</p>
              </div>
            </div>
          )}
        </div>

        {/* Financial revenue section — always shown (SP baselines as fallback) */}
        {calcs.totalRevenue !== null && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-semibold text-gray-700">{t('revenue_title')}</span>
            </div>

            {calcs.electricityRevenue !== null && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-semibold text-blue-800 uppercase tracking-wide">⚡ {t('revenue_electricity')}</span>
                </div>
                <p className="text-xl font-bold text-blue-700">{formatBRL(calcs.electricityRevenue)}</p>
                <p className="text-xs text-blue-600">{t('per_year')} · {formatLarge(calcs.adjEnergyMWh * 1000)} kWh · {calcs.prices.electricity.toFixed(2)} R$/kWh</p>
              </div>
            )}

            {calcs.biomethaneRevenue !== null && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Flame className="h-4 w-4 text-purple-600" />
                  <span className="text-xs font-semibold text-purple-800 uppercase tracking-wide">🚗 {t('revenue_biomethane')}</span>
                </div>
                <p className="text-xl font-bold text-purple-700">{formatBRL(calcs.biomethaneRevenue)}</p>
                <p className="text-xs text-purple-600">{t('per_year')} · {formatLarge(calcs.adjBiogasM3 * CONVERSION.biogasToMethane)} m³ CH₄ · {calcs.prices.biomethane.toFixed(2)} R$/m³</p>
              </div>
            )}

            {calcs.heatRevenue !== null && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Flame className="h-4 w-4 text-orange-600" />
                  <span className="text-xs font-semibold text-orange-800 uppercase tracking-wide">♨️ {t('revenue_heat')}</span>
                </div>
                <p className="text-xl font-bold text-orange-700">{formatBRL(calcs.heatRevenue)}</p>
                <p className="text-xs text-orange-600">{t('per_year')} · {formatLarge(calcs.adjBiogasM3 * CONVERSION.biogasToHeat)} GJ · {calcs.prices.heat.toFixed(0)} R$/GJ</p>
              </div>
            )}

            {calcs.fertilizerRevenue !== null && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Leaf className="h-4 w-4 text-amber-600" />
                  <span className="text-xs font-semibold text-amber-800 uppercase tracking-wide">🌱 {t('revenue_fertilizer')}</span>
                </div>
                <p className="text-xl font-bold text-amber-700">{formatBRL(calcs.fertilizerRevenue)}</p>
                <p className="text-xs text-amber-600">{t('per_year')} · {calcs.adjTons.toFixed(0)} ton · {calcs.prices.fertilizer.toFixed(0)} R$/ton</p>
              </div>
            )}

            {calcs.carbonRevenue !== null && (
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-teal-600" />
                  <span className="text-xs font-semibold text-teal-800 uppercase tracking-wide">💨 {t('revenue_carbon')}</span>
                </div>
                <p className="text-xl font-bold text-teal-700">{formatBRL(calcs.carbonRevenue)}</p>
                <p className="text-xs text-teal-600">{t('per_year')} · {formatLarge(calcs.adjBiogasM3 * CONVERSION.biogasToCO2)} tCO₂ · {calcs.prices.carbon.toFixed(0)} R$/tCO₂</p>
              </div>
            )}

            {/* Total */}
            <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-5 w-5 text-emerald-700" />
                <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">{t('revenue_total')}</span>
              </div>
              <p className="text-3xl font-bold text-emerald-700">{formatBRL(calcs.totalRevenue)}</p>
              <p className="text-xs text-emerald-600 mt-1">{t('per_year')} · {t('revenue_disclaimer')}</p>
            </div>

            <p className="text-xs text-gray-400 text-center pb-1">
              {t('revenue_source')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
