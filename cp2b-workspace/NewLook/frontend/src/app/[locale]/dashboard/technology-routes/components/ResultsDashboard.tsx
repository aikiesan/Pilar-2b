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
  DEFAULT_PRICES,
  ALL_OUTPUT_TYPES,
  CROP_PARAMS,
  SUGARCANE_STREAMS,
  LIVESTOCK_PPB,
  SCENARIO_FACTORS,
  applyScenario,
} from '../calculatorEngine'
import type { PaybackRange } from '../calculatorEngine'
import { useTheme } from '@/contexts/ThemeContext'

interface Props {
  result: CalculationResult
  municipalityName: string
  onReset: () => void
}

type ChartMode = 'biogas' | 'energy'

const CAPEX_LOW_FACTOR = 0.65
// Note: CAPEX_SCENARIO_MULTIPLIER removed — each scenario now has its own tier
// table in calculatorEngine.ts (SCENARIO_CAPEX_TIERS), reflecting real technology
// cost differences: lagoa coberta → CSTR → CSTR+CHP is roughly 4× and 3× steps.

const SCENARIO_EMOJIS: Record<ScenarioTier, string> = { min: '🌱', avg: '⚙️', max: '🚀' }
const SCENARIO_ORDER: ScenarioTier[] = ['min', 'avg', 'max']

function fmt(n: number, decimals = 0): string {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: decimals })
}
function fmtCurrency(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}
function fmtSlider(val: number, unit: string): string {
  return `${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${unit}`
}
function fmtK(n: number): string {
  return `${Math.round(n / 1000)}k`
}

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

const OUTPUT_META: Record<OutputType, { emoji: string; label: string }> = {
  energy:     { emoji: '⚡', label: 'Energia Elétrica' },
  biomethane: { emoji: '⛽', label: 'Biometano'        },
  digestate:  { emoji: '🌱', label: 'Digestato'        },
  thermal:    { emoji: '🔥', label: 'Energia Térmica'  },
  biochar:    { emoji: '🪨', label: 'Biochar'           },
  carbon:     { emoji: '🌍', label: 'CO₂eq evitado'    },
}

function outputValue(type: OutputType, outputs: CalculationResult['outputs']): string {
  switch(type) {
    case 'energy':     return `${fmt(outputs.energyKwhYear / 1000, 1)} MWh/ano`
    case 'biomethane': return `${fmt(outputs.biomethaneM3Year)} m³/ano`
    case 'digestate':  return `${fmt(outputs.digestateTonsYear, 0)} t/ano`
    case 'thermal':    return `${fmt(outputs.thermalMjYear / 1000, 0)} GJ/ano`
    case 'biochar':    return `${fmt(outputs.biocharTonsYear, 1)} t/ano`
    case 'carbon':     return `${fmt(outputs.co2TonsYear, 1)} tCO₂eq`
  }
}

function methodologyText(activityType: ActivityType): { bmp: string; ch4: string; source: string } {
  if (activityType === 'sugarcane') {
    const bmps = Object.entries(SUGARCANE_STREAMS).map(([k, s]) => `${k}: ${s.bmp} m³ CH₄/tVS`).join(', ')
    return { bmp: bmps, ch4: '55–65% CH₄ por fluxo', source: 'UNICA 2023; EMBRAPA Agroenergia; NBR 15.527' }
  }
  if (['livestock', 'swine', 'cattle', 'poultry'].includes(activityType)) {
    return {
      bmp: 'Suínos: 200 m³/cab·ano; Bovinos corte: 350; Bovinos leite: 500; Galináceos: 0,8–1,4',
      ch4: '60–65% CH₄ (lagoa coberta/CSTR)',
      source: 'EMBRAPA 2023; Chernicharo 2016; IEA Bioenergy',
    }
  }
  if (activityType in CROP_PARAMS) {
    const p = CROP_PARAMS[activityType as keyof typeof CROP_PARAMS]
    return {
      bmp: `${p.bmp} m³ CH₄/tVS (VS=${(p.vs*100).toFixed(0)}%, disponibilidade=${(p.avail*100).toFixed(0)}%)`,
      ch4: `${(p.ch4*100).toFixed(0)}% CH₄`,
      source: p.source,
    }
  }
  return { bmp: '—', ch4: '—', source: '—' }
}

export default function ResultsDashboard({ result, municipalityName, onReset }: Props) {
  const t = useTranslations('calculator')
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
    name: m.monthLabel,
    value: chartMode === 'energy' ? Math.round(m.energy) : Math.round(m.biogas),
  }))

  const secondaryOutputs = ALL_OUTPUT_TYPES.filter(o => !selectedOutputs.includes(o))
  const method = methodologyText(inputSummary.activityType)

  // Dark-mode-aware chart colors
  const chartGrid   = isDark ? '#334155' : '#f0f0f0'
  const chartTick   = isDark ? '#94a3b8' : '#6b7280'
  const chartBarFill = isDark ? '#10b981' : '#16a34a'

  function updatePrice(key: keyof PriceConfig, val: number) {
    setPrices(p => ({ ...p, [key]: val }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center p-4 bg-gradient-to-br from-green-600 to-green-700 dark:from-emerald-700 dark:to-emerald-800 rounded-2xl text-white">
        <p className="text-sm opacity-80 mb-1">{t('results.potentialHeader', { municipality: municipalityName })}</p>
        <p className="text-3xl font-bold">{fmt(outputs.totalBiogasM3Year)} m³</p>
        <p className="text-sm opacity-80">{t('results.biogasPerYear')}</p>
        <p className="text-xs mt-1 opacity-60">{inputSummary.activityLabel}</p>
      </div>

      {/* Scenario cards — vertical stacked, expand on click */}
      <div>
        <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2">
          Cenário de implantação
        </p>
        <div className="space-y-2">
          {scenarioCards.map(({ tier, sf, payback, cl }) => {
            const active = scenario === tier
            return (
              <button
                key={tier}
                onClick={() => setScenario(tier)}
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
                      {sf.labelPt}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-slate-500 truncate hidden sm:block">
                      — {sf.technology}
                    </span>
                  </div>
                  <span className={`text-xs font-semibold shrink-0 ml-2 ${active ? 'text-green-600 dark:text-emerald-400' : 'text-gray-400 dark:text-slate-500'}`}>
                    {active ? 'Selecionado ✓' : 'Selecionar'}
                  </span>
                </div>

                {/* Detail rows — only visible when active */}
                {active && (
                  <div className="mt-3 pt-3 border-t border-green-200 dark:border-emerald-800 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <div>
                      <p className="text-gray-500 dark:text-slate-400">Tecnologia</p>
                      <p className="font-medium text-gray-800 dark:text-slate-200 leading-tight">{sf.technology}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-slate-400">Aproveitamento</p>
                      <p className="font-semibold text-gray-800 dark:text-slate-200">{Math.round(sf.utilization * 100)}% da biomassa</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-slate-400">Início de operação</p>
                      <p className="font-semibold text-gray-800 dark:text-slate-200">{sf.startupMonths} meses até plena carga</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-slate-400">Investimento estimado</p>
                      <p className="font-semibold text-gray-800 dark:text-slate-200">
                        A partir de R$ {fmtK(cl)}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-500 dark:text-slate-400">Payback estimado</p>
                      <p className="font-semibold text-gray-800 dark:text-slate-200">
                        {payback.min >= 999 ? 'Não é possível estimar neste caso' : `A partir de ${payback.min} anos`}
                      </p>
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
                <span className="font-semibold text-green-700 dark:text-emerald-400">{fmtSlider(prices[key], unit)}</span>
              </div>
              <input
                type="range" min={min} max={max} step={step}
                value={prices[key]}
                style={{ '--range-pct': `${(((prices[key] - min) / (max - min)) * 100).toFixed(1)}%` } as React.CSSProperties}
                onChange={e => {
                  const v = parseFloat(e.target.value)
                  updatePrice(key, v)
                  e.target.style.setProperty('--range-pct', `${(((v - min) / (max - min)) * 100).toFixed(1)}%`)
                }}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-400 dark:text-slate-500">
                <span>{fmtSlider(min, unit)}</span>
                <span>{fmtSlider(max, unit)}</span>
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
                  `${fmt(Number(v))} ${chartMode === 'energy' ? 'kWh' : 'm³'}`,
                  chartMode === 'energy' ? 'Energia' : 'Biogás',
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
              const meta = OUTPUT_META[type]
              const sub = type === 'energy'
                ? `Economia: ${fmtCurrency(financials.energySavingsBrlYear)}/ano`
                : type === 'biomethane'
                ? `≈ ${fmt(financials.dieselEquivLitersYear)} L diesel`
                : type === 'carbon'
                ? `${fmtCurrency(financials.carbonRevBrlYear)}/ano (VCM/RenovaBio)`
                : type === 'digestate'
                ? t('results.digestateSub')
                : undefined
              return (
                <MetricCard
                  key={type}
                  emoji={meta.emoji}
                  label={meta.label}
                  value={outputValue(type, outputs)}
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
          <span className="text-gray-500 dark:text-slate-400">📊 Investimento estimado</span>
          <span className="font-bold text-gray-800 dark:text-slate-200 text-xs">
            A partir de R$ {fmtK(activeCapex.mid * CAPEX_LOW_FACTOR)}
          </span>
        </div>

        {/* Payback — optimistic floor with expandable detail */}
        <div className="flex justify-between items-start text-sm">
          <span className="text-gray-500 dark:text-slate-400">⏱ Payback estimado</span>
          <div className="text-right">
            <p className="font-bold text-gray-800 dark:text-slate-200">
              {financials.payback.min >= 999 ? 'Não é possível estimar neste caso' : `A partir de ${financials.payback.min} anos`}
            </p>
            <details className="text-xs">
              <summary className="cursor-pointer text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 select-none">
                ver cenários ▾
              </summary>
              <div className="mt-1 text-left text-gray-500 dark:text-slate-400 max-w-52 space-y-0.5">
                <p>🟢 Otimista: {financials.payback.min >= 999 ? 'Não é possível estimar neste caso' : `${financials.payback.min} anos`} — operação plena, boas tarifas</p>
                <p>🟡 Esperado: {financials.payback.avg >= 999 ? 'Não é possível estimar neste caso' : `${financials.payback.avg} anos`} — curva de aprendizado incluída</p>
                <p>🔴 Conservador: {financials.payback.max >= 999 ? 'Não é possível estimar neste caso' : `${financials.payback.max} anos`}</p>
              </div>
            </details>
          </div>
        </div>

        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500 dark:text-slate-400">{t('results.annualRevenue')}</span>
          <div className="text-right">
            <span className="font-bold text-green-700 dark:text-emerald-400">{fmtCurrency(financials.annualRevenueMaxBRL)}/ano</span>
            <p className="text-xs text-gray-400 dark:text-slate-500">esperado: {fmtCurrency(financials.annualRevenueAvgBRL)}/ano</p>
          </div>
        </div>

        {/* Scenario comparison mini-table */}
        <div className="pt-2 border-t border-gray-100 dark:border-slate-700">
          <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-2">📊 Comparativo — payback otimista–conservador</p>
          <div className="grid grid-cols-3 gap-1 text-xs text-center">
            {scenarioCards.map(({ tier, sf, payback }) => {
              const active = scenario === tier
              return (
                <button
                  key={tier}
                  onClick={() => setScenario(tier)}
                  className={`p-2 rounded-lg border transition-colors ${
                    active
                      ? 'border-green-400 dark:border-emerald-600 bg-green-50 dark:bg-emerald-900/30'
                      : 'border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 hover:border-gray-200 dark:hover:border-slate-600'
                  }`}
                >
                  <p className={`font-bold text-xs ${active ? 'text-green-700 dark:text-emerald-400' : 'text-gray-600 dark:text-slate-400'}`}>
                    {sf.labelPt}
                  </p>
                  <p className={`font-semibold text-xs mt-1 ${active ? 'text-green-800 dark:text-emerald-300' : 'text-gray-700 dark:text-slate-300'}`}>
                    {payback.min >= 999 ? '—' : `≥ ${payback.min}`}
                  </p>
                  <p className="text-gray-400 dark:text-slate-500 text-xs">{payback.min >= 999 ? 'não estimável' : 'anos (otimista)'}</p>
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
              Também calculado — não selecionado ({secondaryOutputs.length})
            </span>
            <span className="text-gray-400 dark:text-slate-500 group-open:rotate-180 transition-transform text-xs">▼</span>
          </summary>
          <div className="px-4 py-3 space-y-1 bg-white dark:bg-slate-900">
            {secondaryOutputs.map(type => (
              <div key={type} className="flex items-center gap-3 py-1.5 border-b border-gray-100 dark:border-slate-800 last:border-0">
                <span className="text-lg">{OUTPUT_META[type].emoji}</span>
                <span className="text-sm text-gray-600 dark:text-slate-400 flex-1">{OUTPUT_META[type].label}</span>
                <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                  {outputValue(type, outputs)}
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
          <span>💡 Entenda os cenários</span>
          <span className="text-blue-400 dark:text-blue-500 group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="px-4 py-4 space-y-3 bg-white dark:bg-slate-900 text-xs text-gray-600 dark:text-slate-400">
          <p>
            <strong className="text-gray-800 dark:text-slate-200">🌱 Básico — Lagoa coberta / tubular PVC</strong><br/>
            Tecnologia mais simples e acessível, adequada para pequenas propriedades. Aproveita cerca de 55% do potencial.
            Payback mais curto porque o investimento é menor, mas a geração também é menor.
          </p>
          <p>
            <strong className="text-gray-800 dark:text-slate-200">⚙️ Ideal — Biodigestor CSTR</strong><br/>
            Configuração mais comum em propriedades de médio porte. Aproveita 75% do potencial.
            O payback esperado considera curva de aprendizado e manutenção — mais honesto que promessas de vendedores.
          </p>
          <p>
            <strong className="text-gray-800 dark:text-slate-200">🚀 Avançado — CSTR + upgrading / CHP premium</strong><br/>
            Máxima eficiência para grandes operações. O payback conservador pode ser longo para operações
            pequenas — não significa inviabilidade, mas que a receita não cobre o investimento no horizonte de 40 anos.
          </p>
          <p className="text-gray-400 dark:text-slate-500 pt-1">
            Payback otimista: CAPEX mínimo, 110% de realização de receita, 3% manutenção/ano.<br/>
            Payback conservador: CAPEX máximo, 45% de realização, 8% manutenção/ano, +25% startup. &quot;Não é possível estimar&quot; = acima de 40 anos.
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
          <p><strong className="text-gray-700 dark:text-slate-300">Metodologia:</strong> Potencial Bioquímico de Metano (BMP) normalizado por Sólidos Voláteis (SV). Distribuição mensal proporcional ao calendário selecionado.</p>
          <p><strong className="text-gray-700 dark:text-slate-300">BMP utilizado:</strong> {method.bmp}</p>
          <p><strong className="text-gray-700 dark:text-slate-300">Composição do biogás:</strong> {method.ch4} | PCI CH₄: 35,8 MJ/m³</p>
          <p><strong className="text-gray-700 dark:text-slate-300">Eficiências:</strong> Elétrica 35% (motor-gerador); Térmica 50% (recuperação de calor)</p>
          <p><strong className="text-gray-700 dark:text-slate-300">Preços padrão SP 2025:</strong> Tarifa CPFL/Enel R$ 0,85/kWh; Biometano R$ 4,50/m³; Carbono R$ 35/tCO₂eq (VCM)</p>
          <p><strong className="text-gray-700 dark:text-slate-300">Fontes:</strong> {method.source}</p>
          <p className="text-gray-400 dark:text-slate-500 pt-1">Estimativas para viabilidade preliminar. Projeto executivo requer estudo técnico detalhado.</p>
        </div>
      </details>

      {/* Phase 2 CTA */}
      <div className="p-4 rounded-xl border-2 border-dashed border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 text-center">
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">📋 {t('results.pdfCtaTitle')}</p>
        <p className="text-xs text-amber-700 dark:text-amber-400">{t('results.pdfCtaDesc')}</p>
        <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mt-2">{t('results.pdfCtaSoon')}</p>
      </div>

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
