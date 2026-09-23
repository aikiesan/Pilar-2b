'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import type { CalculationResult, OutputType, PriceConfig, ActivityType, ScenarioTier } from '../calculatorEngine'
import {
  calcFinancials,
  calcPaybackRange,
  getCapexTier,
  isLivestockActivity,
  isPaybackKnown,
  ASSUMPTIONS,
  CAPEX_LOW_FACTOR,
  DEFAULT_PRICES,
  ALL_OUTPUT_TYPES,
  CROP_PARAMS,
  SUGARCANE_STREAMS,
  LIVESTOCK_PPB,
  SCENARIO_FACTORS,
  applyScenario,
} from '../calculatorEngine'
import { useCalculatorText } from '../useCalculatorText'
import { LIVESTOCK_SPECIES } from './StepAtividade'
import { useTheme } from '@/contexts/ThemeContext'
import { useFormat } from '@/hooks/useFormat'
import type { Formatters } from '@/lib/format'
import type { Messages } from '@/types/i18n'

interface Props {
  result: CalculationResult
  municipalityName: string
  onReset: () => void
}

type ChartMode = 'biogas' | 'energy'

// Each scenario has its own CAPEX tier table (SCENARIO_CAPEX_TIERS in the
// engine), reflecting real technology cost differences: covered lagoon → CSTR →
// CSTR+CHP is roughly 4× and 3× steps.
const SCENARIO_EMOJIS: Record<ScenarioTier, string> = { min: '🌱', avg: '⚙️', max: '🚀' }
const SCENARIO_ORDER: ScenarioTier[] = ['min', 'avg', 'max']

type CalculatorT = ReturnType<typeof useTranslations<'calculator'>>

interface MetricCardProps {
  emoji: string; label: string; value: string; sub?: string; highlight?: boolean; muted?: boolean
}
function MetricCard({ emoji, label, value, sub, highlight, muted }: MetricCardProps) {
  return (
    <div className={`p-4 rounded-xl border transition-colors ${
      muted
        ? 'border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 opacity-60'
        : highlight
        ? 'border-green-300 dark:border-emerald-700 bg-green-50 dark:bg-emerald-900/20'
        : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800'
    }`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">{emoji}</span>
        <span className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-xl font-bold ${
        highlight ? 'text-green-700 dark:text-emerald-400'
        : muted    ? 'text-gray-400 dark:text-slate-500'
        :            'text-gray-800 dark:text-slate-200'
      }`}>{value}</p>
      {sub && <p className={`text-xs mt-0.5 ${muted ? 'text-gray-400 dark:text-slate-500' : 'text-gray-500 dark:text-slate-400'}`}>{sub}</p>}
    </div>
  )
}

/** Output names: calculator.results.<type>. */
const OUTPUT_EMOJI: Record<OutputType, string> = {
  energy: '⚡', biomethane: '⛽', digestate: '🌱', thermal: '🔥', biochar: '🪨', carbon: '🌍',
}

type StreamKey = keyof typeof SUGARCANE_STREAMS & keyof Messages['calculator']['streams']

/** A 0–1 fraction as a percentage. */
const pct = (format: Formatters, fraction: number) => format.percent(fraction * 100, { decimals: 0 })

/** The methodology note for an activity, from the engine's own coefficients. */
function methodologyText(
  activityType: ActivityType,
  t: CalculatorT,
  format: Formatters
): { bmp: string; ch4: string; source: string } {
  if (activityType === 'sugarcane') {
    const streams = Object.entries(SUGARCANE_STREAMS) as [StreamKey, (typeof SUGARCANE_STREAMS)[StreamKey]][]
    const ch4 = streams.map(([, s]) => s.ch4)
    return {
      bmp: streams
        .map(([key, s]) => t('results.method.streamBmp', { stream: t(`streams.${key}.name`), bmp: format.number(s.bmp) }))
        .join(', '),
      ch4: t('results.method.ch4PerStream', { low: pct(format, Math.min(...ch4)), high: pct(format, Math.max(...ch4)) }),
      source: 'UNICA 2023; EMBRAPA Agroenergia; NBR 15.527', // i18n-exempt: citations
    }
  }
  if (isLivestockActivity(activityType)) {
    const ch4 = LIVESTOCK_SPECIES.map(({ key }) => LIVESTOCK_PPB[key].ch4)
    return {
      bmp: LIVESTOCK_SPECIES
        .map(({ key, labelKey }) =>
          t('results.method.speciesPpb', { species: t(`step2.${labelKey}`), ppb: format.number(LIVESTOCK_PPB[key].ppb, { decimals: 1 }) })
        )
        .join('; '),
      ch4: t('results.method.ch4Livestock', { low: pct(format, Math.min(...ch4)), high: pct(format, Math.max(...ch4)) }),
      source: 'EMBRAPA 2023; Chernicharo 2016; IEA Bioenergy', // i18n-exempt: citations
    }
  }
  if (activityType in CROP_PARAMS) {
    const p = CROP_PARAMS[activityType as keyof typeof CROP_PARAMS]
    return {
      bmp: t('results.method.cropBmp', { bmp: format.number(p.bmp), vs: pct(format, p.vs), availability: pct(format, p.avail) }),
      ch4: t('results.method.ch4Crop', { value: pct(format, p.ch4) }),
      source: p.source,
    }
  }
  return { bmp: '—', ch4: '—', source: '—' }
}

export default function ResultsDashboard({ result, municipalityName, onReset }: Props) {
  const t = useTranslations('calculator')
  const format = useFormat()
  const text = useCalculatorText()
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const [chartMode, setChartMode] = useState<ChartMode>('energy')
  const [prices, setPrices] = useState<PriceConfig>(DEFAULT_PRICES)
  const [scenario, setScenario] = useState<ScenarioTier>('avg')

  const { outputs: baseOutputs, selectedOutputs, inputSummary } = result

  // CAPEX tier: both volume (small/medium/large) and technology scenario determine cost.
  // Each scenario has its own tier table in calculatorEngine.ts (SCENARIO_CAPEX_TIERS).
  const activeCapex = getCapexTier(baseOutputs.totalBiogasM3Year, scenario)

  // Active scenario outputs + financials
  const outputs = applyScenario(baseOutputs, SCENARIO_FACTORS[scenario])
  const rawFinancials = calcFinancials(outputs, selectedOutputs, prices)
  const activePayback = calcPaybackRange(rawFinancials.annualRevenueMaxBRL, activeCapex)
  const financials = { ...rawFinancials, capexTier: activeCapex, payback: activePayback }

  // Pre-compute all 3 scenario cards data
  const scenarioCards = SCENARIO_ORDER.map(tier => {
    const sf = SCENARIO_FACTORS[tier]
    const tierCapex = getCapexTier(baseOutputs.totalBiogasM3Year, tier)
    const scenOutputs = applyScenario(baseOutputs, sf)
    const scenFin = calcFinancials(scenOutputs, selectedOutputs, prices)
    const payback = calcPaybackRange(scenFin.annualRevenueMaxBRL, tierCapex)
    const cl = tierCapex.mid * CAPEX_LOW_FACTOR
    return { tier, sf, payback, cl }
  })

  const chartData = outputs.monthly.map(m => ({
    name: format.month(m.month),
    value: chartMode === 'energy' ? Math.round(m.energy) : Math.round(m.biogas),
  }))

  const secondaryOutputs = ALL_OUTPUT_TYPES.filter(o => !selectedOutputs.includes(o))
  const method = methodologyText(inputSummary.activityType, t, format)
  const brl = (amount: number) => format.currency(amount)
  const brlFrom = (amount: number) => t('results.investmentFrom', { amount: format.currency(amount, { compact: true }) })

  // Dark-mode-aware chart colors
  const chartGrid   = isDark ? '#334155' : '#f0f0f0'
  const chartTick   = isDark ? '#94a3b8' : '#6b7280'
  const chartBarFill = isDark ? '#10b981' : '#16a34a'

  function updatePrice(key: keyof PriceConfig, val: number) {
    setPrices(p => ({ ...p, [key]: val }))
  }

  const sliderValue = (value: number, unit: string) =>
    `${format.number(value, { decimals: 2, minDecimals: 2 })} ${unit}`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center p-4 bg-gradient-to-br from-green-600 to-green-700 dark:from-emerald-700 dark:to-emerald-800 rounded-2xl text-white">
        <p className="text-sm opacity-80 mb-1">{t('results.potentialHeader', { municipality: municipalityName })}</p>
        <p className="text-3xl font-bold">{t('results.biogasTotal', { value: format.number(outputs.totalBiogasM3Year) })}</p>
        <p className="text-sm opacity-80">{t('results.biogasPerYear')}</p>
        <p className="text-xs mt-1 opacity-60">{text.activity(inputSummary.activityType, inputSummary.quantity)}</p>
      </div>

      {/* Scenario cards — vertical stacked, expand on click */}
      <div>
        <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2">
          {t('results.scenarioHeading')}
        </p>
        <div className="space-y-2">
          {scenarioCards.map(({ tier, sf, payback, cl }) => {
            const active = scenario === tier
            return (
              <button
                key={tier}
                onClick={() => setScenario(tier)}
                aria-pressed={active}
                className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                  active
                    ? 'border-green-500 dark:border-emerald-500 bg-green-50 dark:bg-emerald-900/20'
                    : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-600'
                }`}
              >
                {/* Always-visible header row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="shrink-0">{SCENARIO_EMOJIS[tier]}</span>
                    <span className={`font-bold text-sm ${active ? 'text-green-800 dark:text-emerald-300' : 'text-gray-700 dark:text-slate-300'}`}>
                      {t(`scenarios.${tier}.label`)}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-slate-500 truncate hidden sm:block">
                      — {t(`scenarios.${tier}.technology`)}
                    </span>
                  </div>
                  <span className={`text-xs font-semibold shrink-0 ml-2 ${active ? 'text-green-600 dark:text-emerald-400' : 'text-gray-400 dark:text-slate-500'}`}>
                    {active ? t('results.selected') : t('results.select')}
                  </span>
                </div>

                {/* Detail rows — only visible when active */}
                {active && (
                  <div className="mt-3 pt-3 border-t border-green-200 dark:border-emerald-800 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <div>
                      <p className="text-gray-500 dark:text-slate-400">{t('results.technology')}</p>
                      <p className="font-medium text-gray-800 dark:text-slate-200 leading-tight">{t(`scenarios.${tier}.technology`)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-slate-400">{t('results.utilization')}</p>
                      <p className="font-semibold text-gray-800 dark:text-slate-200">
                        {t('results.utilizationValue', { percent: pct(format, sf.utilization) })}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-slate-400">{t('results.startup')}</p>
                      <p className="font-semibold text-gray-800 dark:text-slate-200">
                        {t('results.startupValue', { count: sf.startupMonths })}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-slate-400">{t('results.investment')}</p>
                      <p className="font-semibold text-gray-800 dark:text-slate-200">{brlFrom(cl)}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-500 dark:text-slate-400">{t('results.payback')}</p>
                      <p className="font-semibold text-gray-800 dark:text-slate-200">{text.paybackFrom(payback.min)}</p>
                    </div>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Price sliders accordion */}
      <details className="group border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
        <summary className="flex items-center justify-between px-4 py-3 cursor-pointer
                            bg-gray-50 dark:bg-slate-800/60 hover:bg-gray-100 dark:hover:bg-slate-700/60
                            transition-colors text-sm font-medium text-gray-700 dark:text-slate-300 select-none">
          <span>⚙️ {t('results.priceSliders')}</span>
          <span className="text-gray-400 dark:text-slate-500 group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="px-4 py-4 space-y-4 bg-white dark:bg-slate-900">
          <p className="text-xs text-gray-400 dark:text-slate-500">{t('results.priceSlidersHint')}</p>
          {[
            { key: 'energyTariffBrlKwh' as const, label: t('results.tariffEnergy'),    min: 0.50, max: 1.50, step: 0.01, unit: 'R$/kWh'    },
            { key: 'biomethaneM3'        as const, label: t('results.priceBiomethane'), min: 1.00, max: 8.00, step: 0.10, unit: 'R$/m³'     },
            { key: 'co2CreditBrlTon'     as const, label: t('results.priceCarbon'),     min: 10,   max: 100,  step: 1,    unit: 'R$/tCO₂eq' },
            { key: 'dieselBrlLiter'      as const, label: t('results.priceDiesel'),     min: 4.00, max: 9.00, step: 0.10, unit: 'R$/L'      },
          ].map(({ key, label, min, max, step, unit }) => (
            <div key={key}>
              <div className="flex justify-between text-xs text-gray-600 dark:text-slate-400 mb-1">
                <span>{label}</span>
                <span className="font-semibold text-green-700 dark:text-emerald-400">{sliderValue(prices[key], unit)}</span>
              </div>
              <input
                type="range" min={min} max={max} step={step}
                value={prices[key]}
                aria-label={label}
                style={{ '--range-pct': `${(((prices[key] - min) / (max - min)) * 100).toFixed(1)}%` } as React.CSSProperties}
                onChange={e => {
                  const v = parseFloat(e.target.value)
                  updatePrice(key, v)
                  e.target.style.setProperty('--range-pct', `${(((v - min) / (max - min)) * 100).toFixed(1)}%`)
                }}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-400 dark:text-slate-500">
                <span>{sliderValue(min, unit)}</span>
                <span>{sliderValue(max, unit)}</span>
              </div>
            </div>
          ))}
        </div>
      </details>

      {/* Seasonality chart */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-gray-700 dark:text-slate-300">{t('results.seasonalityTitle')}</p>
          <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700 text-xs">
            {(['energy', 'biogas'] as ChartMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setChartMode(mode)}
                aria-pressed={chartMode === mode}
                className={`px-3 py-1 ${
                  chartMode === mode
                    ? 'bg-green-600 dark:bg-emerald-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700'
                }`}
              >
                {mode === 'energy' ? 'kWh' : 'm³'}
              </button>
            ))}
          </div>
        </div>
        <div className="h-40 w-full min-w-0">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGrid} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: chartTick }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: chartTick }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? '#1e293b' : '#fff',
                  border: `1px solid ${isDark ? '#334155' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  color: isDark ? '#f1f5f9' : '#111827',
                  fontSize: 12,
                }}
                formatter={(v) => [
                  `${format.number(Number(v))} ${chartMode === 'energy' ? 'kWh' : 'm³'}`,
                  chartMode === 'energy' ? t('results.chartEnergy') : t('results.chartBiogas'),
                ]}
              />
              <Bar dataKey="value" fill={chartBarFill} radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Primary outputs */}
      {selectedOutputs.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2">
            {t('results.primaryOutputs')}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {selectedOutputs.map(type => {
              const sub = type === 'energy'
                ? t('results.energySavings', { amount: brl(financials.energySavingsBrlYear) })
                : type === 'biomethane'
                ? t('results.dieselEquivalent', { liters: format.number(financials.dieselEquivLitersYear) })
                : type === 'carbon'
                ? t('results.carbonRevenue', { amount: brl(financials.carbonRevBrlYear) })
                : type === 'digestate'
                ? t('results.digestateSub')
                : undefined
              return (
                <MetricCard
                  key={type}
                  emoji={OUTPUT_EMOJI[type]}
                  label={t(`results.${type}`)}
                  value={text.outputValue(type, outputs)}
                  sub={sub}
                  highlight={type === 'energy' || type === 'biomethane'}
                />
              )
            })}
          </div>
        </div>
      )}


      {/* Financial summary */}
      <div className="p-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-3">
        <p className="font-semibold text-gray-700 dark:text-slate-300 text-sm">{t('results.financialTitle')}</p>

        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500 dark:text-slate-400">{t('results.investment')}</span>
          <span className="font-bold text-gray-800 dark:text-slate-200 text-xs">
            {brlFrom(activeCapex.mid * CAPEX_LOW_FACTOR)}
          </span>
        </div>

        {/* Payback — optimistic floor with expandable detail */}
        <div className="flex justify-between items-start text-sm">
          <span className="text-gray-500 dark:text-slate-400">{t('results.paybackHeading')}</span>
          <div className="text-right">
            <p className="font-bold text-gray-800 dark:text-slate-200">{text.paybackFrom(financials.payback.min)}</p>
            <details className="text-xs">
              <summary className="cursor-pointer text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 select-none">
                {t('results.paybackScenarios')}
              </summary>
              <div className="mt-1 text-left text-gray-500 dark:text-slate-400 max-w-52 space-y-0.5">
                <p>{t('results.paybackOptimistic', { value: text.payback(financials.payback.min) })}</p>
                <p>{t('results.paybackExpected', { value: text.payback(financials.payback.avg) })}</p>
                <p>{t('results.paybackConservative', { value: text.payback(financials.payback.max) })}</p>
              </div>
            </details>
          </div>
        </div>

        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500 dark:text-slate-400">{t('results.annualRevenue')}</span>
          <div className="text-right">
            <span className="font-bold text-green-700 dark:text-emerald-400">
              {t('results.perYear', { amount: brl(financials.annualRevenueMaxBRL) })}
            </span>
            <p className="text-xs text-gray-400 dark:text-slate-500">
              {t('results.expectedPerYear', { amount: brl(financials.annualRevenueAvgBRL) })}
            </p>
          </div>
        </div>

        {/* Scenario comparison mini-table */}
        <div className="pt-2 border-t border-gray-100 dark:border-slate-700">
          <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-2">{t('results.comparisonTitle')}</p>
          <div className="grid grid-cols-3 gap-1 text-xs text-center">
            {scenarioCards.map(({ tier, payback }) => {
              const active = scenario === tier
              return (
                <button
                  key={tier}
                  onClick={() => setScenario(tier)}
                  aria-pressed={active}
                  className={`p-2 rounded-lg border transition-colors ${
                    active
                      ? 'border-green-400 dark:border-emerald-600 bg-green-50 dark:bg-emerald-900/30'
                      : 'border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 hover:border-gray-200 dark:hover:border-slate-600'
                  }`}
                >
                  <p className={`font-bold text-xs ${active ? 'text-green-700 dark:text-emerald-400' : 'text-gray-600 dark:text-slate-400'}`}>
                    {t(`scenarios.${tier}.label`)}
                  </p>
                  <p className={`font-semibold text-xs mt-1 ${active ? 'text-green-800 dark:text-emerald-300' : 'text-gray-700 dark:text-slate-300'}`}>
                    {isPaybackKnown(payback.min) ? `≥ ${format.number(payback.min, { decimals: 1 })}` : '—'}
                  </p>
                  <p className="text-gray-400 dark:text-slate-500 text-xs">
                    {isPaybackKnown(payback.min) ? t('results.comparisonYears') : t('results.comparisonUnknown')}
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        <p className="text-xs text-gray-400 dark:text-slate-500">{t('results.financialDisclaimer')}</p>
      </div>

      {/* "Também calculado" — non-selected outputs shown for context */}
      {secondaryOutputs.length > 0 && (
        <details className="group border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <summary className="flex items-center justify-between px-4 py-3 cursor-pointer select-none
                              bg-gray-50 dark:bg-slate-800/60 hover:bg-gray-100 dark:hover:bg-slate-700/60
                              transition-colors">
            <span className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">
              {t('results.secondaryOutputs', { count: secondaryOutputs.length })}
            </span>
            <span className="text-gray-400 dark:text-slate-500 group-open:rotate-180 transition-transform text-xs">▼</span>
          </summary>
          <div className="px-4 py-3 space-y-1 bg-white dark:bg-slate-900">
            {secondaryOutputs.map(type => (
              <div key={type} className="flex items-center gap-3 py-1.5 border-b border-gray-100 dark:border-slate-800 last:border-0">
                <span className="text-lg">{OUTPUT_EMOJI[type]}</span>
                <span className="text-sm text-gray-600 dark:text-slate-400 flex-1">{t(`results.${type}`)}</span>
                <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                  {text.outputValue(type, outputs)}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* "Entenda os cenários" accordion */}
      <details className="group border border-blue-100 dark:border-blue-900 rounded-xl overflow-hidden">
        <summary className="flex items-center justify-between px-4 py-3 cursor-pointer select-none
                            bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30
                            transition-colors text-xs font-medium text-blue-700 dark:text-blue-400">
          <span>{t('results.scenariosHelpTitle')}</span>
          <span className="text-blue-400 dark:text-blue-500 group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="px-4 py-4 space-y-3 bg-white dark:bg-slate-900 text-xs text-gray-600 dark:text-slate-400">
          {SCENARIO_ORDER.map(tier => (
            <p key={tier}>
              <strong className="text-gray-800 dark:text-slate-200">
                {SCENARIO_EMOJIS[tier]} {t(`scenarios.${tier}.label`)} — {t(`scenarios.${tier}.technology`)}
              </strong>
              <br />
              {t(`scenarios.${tier}.help`, {
                utilization: pct(format, SCENARIO_FACTORS[tier].utilization),
                horizon: ASSUMPTIONS.paybackHorizonYears,
              })}
            </p>
          ))}
          <p className="text-gray-400 dark:text-slate-500 pt-1">
            {t('results.scenariosAssumptions', {
              bestRevenue: pct(format, ASSUMPTIONS.best.revenue),
              bestMaintenance: pct(format, ASSUMPTIONS.best.maintenance),
              worstRevenue: pct(format, ASSUMPTIONS.worst.revenue),
              worstMaintenance: pct(format, ASSUMPTIONS.worst.maintenance),
              startup: pct(format, ASSUMPTIONS.worst.startupOverhead),
              horizon: ASSUMPTIONS.paybackHorizonYears,
            })}
          </p>
        </div>
      </details>

      {/* Methodology accordion */}
      <details className="group border border-gray-100 dark:border-slate-700 rounded-xl overflow-hidden">
        <summary className="flex items-center justify-between px-4 py-3 cursor-pointer select-none
                            bg-gray-50 dark:bg-slate-800/60 hover:bg-gray-100 dark:hover:bg-slate-700/60
                            transition-colors text-xs font-medium text-gray-500 dark:text-slate-400">
          <span>🔬 {t('results.methodology')}</span>
          <span className="text-gray-400 dark:text-slate-500 group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="px-4 py-4 space-y-2 bg-white dark:bg-slate-900 text-xs text-gray-600 dark:text-slate-400">
          <p><strong className="text-gray-700 dark:text-slate-300">{t('results.method.methodLabel')}</strong> {t('results.method.methodText')}</p>
          <p><strong className="text-gray-700 dark:text-slate-300">{t('results.method.bmpLabel')}</strong> {method.bmp}</p>
          <p>
            <strong className="text-gray-700 dark:text-slate-300">{t('results.method.compositionLabel')}</strong>{' '}
            {t('results.method.composition', { ch4: method.ch4, lhv: format.number(ASSUMPTIONS.ch4LhvMjPerM3, { decimals: 1 }) })}
          </p>
          <p>
            <strong className="text-gray-700 dark:text-slate-300">{t('results.method.efficiencyLabel')}</strong>{' '}
            {t('results.method.efficiency', {
              electrical: pct(format, ASSUMPTIONS.elecEfficiency),
              thermal: pct(format, ASSUMPTIONS.thermalEfficiency),
            })}
          </p>
          <p>
            <strong className="text-gray-700 dark:text-slate-300">{t('results.method.pricesLabel')}</strong>{' '}
            {t('results.method.prices', {
              tariff: format.currency(DEFAULT_PRICES.energyTariffBrlKwh, { decimals: 2, minDecimals: 2 }),
              biomethane: format.currency(DEFAULT_PRICES.biomethaneM3, { decimals: 2, minDecimals: 2 }),
              carbon: format.currency(DEFAULT_PRICES.co2CreditBrlTon),
            })}
          </p>
          <p><strong className="text-gray-700 dark:text-slate-300">{t('results.method.sourcesLabel')}</strong> {method.source}</p>
          <p className="text-gray-400 dark:text-slate-500 pt-1">{t('results.method.disclaimer')}</p>
        </div>
      </details>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <a
          href="mailto:cp2b@unicamp.br?subject=Feedback%20Calculadora%20CP2B"
          className="w-full py-2 rounded-xl text-sm text-center text-gray-500 dark:text-slate-400 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
        >
          💬 {t('results.feedback')}
        </a>
        <button
          onClick={onReset}
          className="w-full py-2 rounded-xl text-sm text-center text-green-600 dark:text-emerald-400 border border-green-300 dark:border-emerald-700 hover:bg-green-50 dark:hover:bg-emerald-900/20 transition-colors"
        >
          🔄 {t('results.newCalculation')}
        </button>
      </div>
    </div>
  )
}
