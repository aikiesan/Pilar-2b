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
  DEFAULT_PRICES,
  ALL_OUTPUT_TYPES,
  CROP_PARAMS,
  SUGARCANE_STREAMS,
  LIVESTOCK_PPB,
  SCENARIO_FACTORS,
  CAPEX_TIERS,
  applyScenario,
} from '../calculatorEngine'
import type { PaybackRange } from '../calculatorEngine'

interface Props {
  result: CalculationResult
  municipalityName: string
  onReset: () => void
}

type ChartMode = 'biogas' | 'energy'

// Mirrors the CAPEX spread constants from the engine
const CAPEX_LOW_FACTOR  = 0.65
const CAPEX_HIGH_FACTOR = 1.50

const SCENARIO_EMOJIS: Record<ScenarioTier, string> = { min: '💰', avg: '💰💰', max: '💰💰💰' }
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
  const k = Math.round(n / 1000)
  return `${k}k`
}
function fmtPayback(pb: number): string {
  return pb >= 999 ? 'Indet.' : `${pb}`
}
function fmtPaybackFull(pb: number): string {
  return pb >= 999 ? 'Indeterminado' : `${pb} anos`
}
function fmtPaybackRange(p: PaybackRange): string {
  return `${fmtPayback(p.min)} – ${fmtPayback(p.avg)} – ${fmtPayback(p.max)} anos`
}

interface MetricCardProps {
  emoji: string; label: string; value: string; sub?: string; highlight?: boolean; muted?: boolean
}
function MetricCard({ emoji, label, value, sub, highlight, muted }: MetricCardProps) {
  return (
    <div className={`p-4 rounded-xl border transition-colors ${
      muted    ? 'border-gray-100 bg-gray-50 opacity-60' :
      highlight ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">{emoji}</span>
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-xl font-bold ${highlight ? 'text-green-700' : muted ? 'text-gray-400' : 'text-gray-800'}`}>{value}</p>
      {sub && <p className={`text-xs mt-0.5 ${muted ? 'text-gray-400' : 'text-gray-500'}`}>{sub}</p>}
    </div>
  )
}

const OUTPUT_META: Record<OutputType, { emoji: string; label: string; unit: string }> = {
  energy:     { emoji: '⚡', label: 'Energia Elétrica', unit: 'MWh/ano' },
  biomethane: { emoji: '⛽', label: 'Biometano',        unit: 'm³/ano'  },
  digestate:  { emoji: '🌱', label: 'Digestato',        unit: 't/ano'   },
  thermal:    { emoji: '🔥', label: 'Energia Térmica',  unit: 'GJ/ano'  },
  biochar:    { emoji: '🪨', label: 'Biochar',           unit: 't/ano'   },
  carbon:     { emoji: '🌍', label: 'CO₂eq evitado',    unit: 'tCO₂eq'  },
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
    const streams = Object.entries(SUGARCANE_STREAMS)
    const bmps = streams.map(([k, s]) => `${k}: ${s.bmp} m³ CH₄/tVS`).join(', ')
    return {
      bmp: bmps,
      ch4: '55–65% CH₄ por fluxo',
      source: 'UNICA 2023; EMBRAPA Agroenergia; NBR 15.527',
    }
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
  const [chartMode, setChartMode] = useState<ChartMode>('energy')
  const [prices, setPrices] = useState<PriceConfig>(DEFAULT_PRICES)
  const [scenario, setScenario] = useState<ScenarioTier>('avg')

  const { outputs: baseOutputs, selectedOutputs, inputSummary } = result

  // Active scenario outputs + financials
  const outputs = applyScenario(baseOutputs, SCENARIO_FACTORS[scenario])
  const rawFinancials = calcFinancials(outputs, selectedOutputs, prices)
  const activeCapex = CAPEX_TIERS[SCENARIO_FACTORS[scenario].capexTierIndex]
  const activePayback = calcPaybackRange(rawFinancials.annualRevenueMaxBRL, activeCapex)
  const financials = { ...rawFinancials, capexTier: activeCapex, payback: activePayback }

  // Pre-compute all 3 scenario cards data
  const scenarioCards = SCENARIO_ORDER.map(tier => {
    const sf = SCENARIO_FACTORS[tier]
    const tierCapex = CAPEX_TIERS[sf.capexTierIndex]
    const scenOutputs = applyScenario(baseOutputs, sf)
    const scenFin = calcFinancials(scenOutputs, selectedOutputs, prices)
    const payback = calcPaybackRange(scenFin.annualRevenueMaxBRL, tierCapex)
    const cl = tierCapex.mid * CAPEX_LOW_FACTOR
    const ch = tierCapex.mid * CAPEX_HIGH_FACTOR
    return { tier, sf, tierCapex, payback, cl, ch, annualRevAvg: scenFin.annualRevenueAvgBRL }
  })

  const chartData = outputs.monthly.map(m => ({
    name: m.monthLabel,
    value: chartMode === 'energy' ? Math.round(m.energy) : Math.round(m.biogas),
  }))

  const secondaryOutputs = ALL_OUTPUT_TYPES.filter(o => !selectedOutputs.includes(o))
  const method = methodologyText(inputSummary.activityType)

  function updatePrice(key: keyof PriceConfig, val: number) {
    setPrices(p => ({ ...p, [key]: val }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center p-4 bg-gradient-to-br from-green-600 to-green-700 rounded-2xl text-white">
        <p className="text-sm opacity-80 mb-1">{t('results.potentialHeader', { municipality: municipalityName })}</p>
        <p className="text-3xl font-bold">{fmt(outputs.totalBiogasM3Year)} m³</p>
        <p className="text-sm opacity-80">{t('results.biogasPerYear')}</p>
        <p className="text-xs mt-1 opacity-60">{inputSummary.activityLabel}</p>
      </div>

      {/* Scenario cards — 3 horizontal scrollable cards */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Cenário de implantação</p>
        <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
          {scenarioCards.map(({ tier, sf, tierCapex, payback, cl, ch }) => {
            const active = scenario === tier
            return (
              <button
                key={tier}
                onClick={() => setScenario(tier)}
                className={`snap-start shrink-0 w-48 p-3 rounded-xl border-2 text-left transition-all ${
                  active
                    ? 'border-green-500 bg-green-50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-base">{SCENARIO_EMOJIS[tier]}</span>
                  <span className={`text-sm font-bold ${active ? 'text-green-800' : 'text-gray-700'}`}>
                    {sf.labelPt}
                  </span>
                </div>
                <p className="text-xs text-gray-500 leading-tight mb-2">{sf.technology}</p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Aproveit.</span>
                    <span className="font-medium text-gray-700">{Math.round(sf.utilization * 100)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Início op.</span>
                    <span className="font-medium text-gray-700">{sf.startupMonths} meses</span>
                  </div>
                  <div className="pt-1 border-t border-gray-100">
                    <p className="text-gray-400 mb-0.5">Investimento</p>
                    <p className="font-semibold text-gray-800">
                      R$ {fmtK(cl)} – {fmtK(tierCapex.mid)} – {fmtK(ch)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 mb-0.5">Payback (min–esp–max)</p>
                    <p className={`font-semibold ${active ? 'text-green-700' : 'text-gray-800'}`}>
                      {fmtPaybackRange(payback)}
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Price sliders accordion */}
      <details className="group border border-gray-200 rounded-xl overflow-hidden">
        <summary className="flex items-center justify-between px-4 py-3 cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700 select-none">
          <span>⚙️ {t('results.priceSliders')}</span>
          <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="px-4 py-4 space-y-4 bg-white">
          <p className="text-xs text-gray-400">{t('results.priceSlidersHint')}</p>

          {[
            { key: 'energyTariffBrlKwh' as const, label: t('results.tariffEnergy'),    min: 0.50, max: 1.50, step: 0.01, unit: 'R$/kWh'    },
            { key: 'biomethaneM3'        as const, label: t('results.priceBiomethane'), min: 1.00, max: 8.00, step: 0.10, unit: 'R$/m³'     },
            { key: 'co2CreditBrlTon'     as const, label: t('results.priceCarbon'),     min: 10,   max: 100,  step: 1,    unit: 'R$/tCO₂eq' },
            { key: 'dieselBrlLiter'      as const, label: t('results.priceDiesel'),     min: 4.00, max: 9.00, step: 0.10, unit: 'R$/L'      },
          ].map(({ key, label, min, max, step, unit }) => (
            <div key={key}>
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>{label}</span>
                <span className="font-semibold text-green-700">{fmtSlider(prices[key], unit)}</span>
              </div>
              <input
                type="range" min={min} max={max} step={step}
                value={prices[key]}
                onChange={e => updatePrice(key, parseFloat(e.target.value))}
                className="w-full accent-green-600"
              />
              <div className="flex justify-between text-xs text-gray-400">
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
          <p className="text-sm font-semibold text-gray-700">{t('results.seasonalityTitle')}</p>
          <div className="flex rounded-lg overflow-hidden border border-gray-200 text-xs">
            {(['energy', 'biogas'] as ChartMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setChartMode(mode)}
                className={`px-3 py-1 ${chartMode === mode ? 'bg-green-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
              >
                {mode === 'energy' ? 'kWh' : 'm³'}
              </button>
            ))}
          </div>
        </div>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => [
                `${fmt(Number(v))} ${chartMode === 'energy' ? 'kWh' : 'm³'}`,
                chartMode === 'energy' ? 'Energia' : 'Biogás'
              ]} />
              <Bar dataKey="value" fill="#16a34a" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Primary outputs (selected by user) */}
      {selectedOutputs.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('results.primaryOutputs')}</p>
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

      {/* Secondary outputs (not selected, shown muted) */}
      {secondaryOutputs.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{t('results.secondaryOutputs')}</p>
          <div className="grid grid-cols-2 gap-3">
            {secondaryOutputs.map(type => (
              <MetricCard
                key={type}
                emoji={OUTPUT_META[type].emoji}
                label={OUTPUT_META[type].label}
                value={outputValue(type, outputs)}
                sub={t('results.notSelected')}
                muted
              />
            ))}
          </div>
        </div>
      )}

      {/* Financial summary */}
      <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-3">
        <p className="font-semibold text-gray-700 text-sm">{t('results.financialTitle')}</p>
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500">📊 Investimento estimado</span>
          <span className="font-bold text-gray-800 text-xs">
            R$ {fmtK(activeCapex.mid * CAPEX_LOW_FACTOR)} – {fmtK(activeCapex.mid)} – {fmtK(activeCapex.mid * CAPEX_HIGH_FACTOR)}
          </span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500">⏱ {t('results.payback')}</span>
          <span className="font-bold text-gray-800 text-xs">
            {fmtPaybackRange(financials.payback)}
          </span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500">💰 {t('results.annualRevenue')}</span>
          <div className="text-right">
            <span className="font-bold text-green-700">{fmtCurrency(financials.annualRevenueMaxBRL)}/ano</span>
            <p className="text-xs text-gray-400">esperado: {fmtCurrency(financials.annualRevenueAvgBRL)}/ano</p>
          </div>
        </div>

        {/* Payback comparison across scenarios */}
        <div className="pt-2 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-500 mb-2">📊 Comparativo de cenários — payback (min–esp–max)</p>
          <div className="grid grid-cols-3 gap-1 text-xs text-center">
            {scenarioCards.map(({ tier, sf, payback }) => {
              const active = scenario === tier
              return (
                <button
                  key={tier}
                  onClick={() => setScenario(tier)}
                  className={`p-2 rounded-lg border transition-colors ${
                    active ? 'border-green-400 bg-green-50' : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                  }`}
                >
                  <p className={`font-bold text-xs ${active ? 'text-green-700' : 'text-gray-600'}`}>{sf.labelPt}</p>
                  <p className={`font-semibold text-xs mt-1 ${active ? 'text-green-800' : 'text-gray-700'}`}>
                    {fmtPayback(payback.min)} – {fmtPayback(payback.avg)} – {fmtPayback(payback.max)}
                  </p>
                  <p className="text-gray-400 text-xs">anos</p>
                </button>
              )
            })}
          </div>
        </div>

        <p className="text-xs text-gray-400">{t('results.financialDisclaimer')}</p>
      </div>

      {/* "Entenda os cenários" expandable section */}
      <details className="group border border-blue-100 rounded-xl overflow-hidden">
        <summary className="flex items-center justify-between px-4 py-3 cursor-pointer bg-blue-50 hover:bg-blue-100 transition-colors text-xs font-medium text-blue-700 select-none">
          <span>💡 Entenda os cenários</span>
          <span className="text-blue-400 group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="px-4 py-4 space-y-3 bg-white text-xs text-gray-600">
          <p>
            <strong className="text-gray-800">💰 Básico — Lagoa coberta / tubular PVC</strong><br/>
            Tecnologia mais simples e acessível, adequada para pequenas propriedades que estão dando os primeiros passos.
            Aproveita cerca de 55% do potencial da biomassa. Payback mais curto porque o investimento é menor,
            mas a geração também é menor. Bom para começar com baixo risco.
          </p>
          <p>
            <strong className="text-gray-800">💰💰 Ideal — Biodigestor CSTR</strong><br/>
            Configuração mais comum em propriedades rurais brasileiras de médio porte. Aproveita 75% do potencial,
            com operação estável e boa eficiência. O payback esperado é realisticamente mais longo que o anunciado
            por vendedores — estamos mostrando o cenário honesto, considerando curva de aprendizado e manutenção.
          </p>
          <p>
            <strong className="text-gray-800">💰💰💰 Avançado — CSTR + upgrading / CHP premium</strong><br/>
            Máxima eficiência, ideal para operações de grande escala com acesso a mercados de biometano ou créditos
            de carbono. O investimento é alto e o payback conservador pode ser &quot;Indeterminado&quot; para operações pequenas —
            o que não significa que é inviável, mas que a receita desse cenário ainda não cobre o investimento no
            horizonte de 40 anos com os preços atuais.
          </p>
          <p className="text-gray-400 pt-1">
            Os valores de payback mostram (mínimo – esperado – conservador). O &quot;esperado&quot; usa 75% de realização
            de receita e 5% de manutenção/ano. &quot;Indet.&quot; = calculado acima de 40 anos.
          </p>
        </div>
      </details>

      {/* Methodology accordion */}
      <details className="group border border-gray-100 rounded-xl overflow-hidden">
        <summary className="flex items-center justify-between px-4 py-3 cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors text-xs font-medium text-gray-500 select-none">
          <span>🔬 {t('results.methodology')}</span>
          <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="px-4 py-4 space-y-2 bg-white text-xs text-gray-600">
          <p><strong>Metodologia:</strong> Potencial Bioquímico de Metano (BMP) normalizado por Sólidos Voláteis (SV). Distribuição mensal proporcional ao calendário selecionado.</p>
          <p><strong>BMP utilizado:</strong> {method.bmp}</p>
          <p><strong>Composição do biogás:</strong> {method.ch4} | PCI CH₄: 35,8 MJ/m³</p>
          <p><strong>Eficiências:</strong> Elétrica 35% (motor-gerador); Térmica 50% (recuperação de calor)</p>
          <p><strong>Preços padrão SP 2025:</strong> Tarifa CPFL/Enel R$ 0,85/kWh; Biometano R$ 4,50/m³; Carbono R$ 35/tCO₂eq (VCM)</p>
          <p><strong>Fontes:</strong> {method.source}</p>
          <p className="text-gray-400 pt-1">Estimativas para viabilidade preliminar. Projeto executivo requer estudo técnico detalhado.</p>
        </div>
      </details>

      {/* Phase 2 CTA */}
      <div className="p-4 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 text-center">
        <p className="text-sm font-semibold text-amber-800 mb-1">📋 {t('results.pdfCtaTitle')}</p>
        <p className="text-xs text-amber-700">{t('results.pdfCtaDesc')}</p>
        <p className="text-xs font-semibold text-amber-600 mt-2">{t('results.pdfCtaSoon')}</p>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <a
          href="mailto:cp2b@unicamp.br?subject=Feedback%20Calculadora%20CP2B"
          className="w-full py-2 rounded-xl text-sm text-center text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          💬 {t('results.feedback')}
        </a>
        <button
          onClick={onReset}
          className="w-full py-2 rounded-xl text-sm text-center text-green-600 border border-green-300 hover:bg-green-50 transition-colors"
        >
          🔄 {t('results.newCalculation')}
        </button>
      </div>
    </div>
  )
}
