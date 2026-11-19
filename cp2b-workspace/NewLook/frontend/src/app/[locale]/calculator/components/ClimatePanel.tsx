'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useFormat } from '@/hooks/useFormat'
import type { ActivityType, OutputType } from '../calculatorEngine'
import {
  BASELINE_OPTIONS,
  UPGRADING_ROUTES,
  UPGRADING_TECHNOLOGIES,
  defaultRoute,
  estimateGhg,
  type GhgBaseline,
  type GhgEstimate,
  type GhgRoute,
  type GhgUpgrading,
} from '../ghgApi'

const ROUTES: GhgRoute[] = ['biometano_veicular', 'biometano_rede', 'eletricidade', 'termico_glp']
const LEAK_MAX_PCT = 10

interface Props {
  /** Methane the plant produces in the active scenario, Nm³/year. */
  ch4M3Year: number
  activityType: ActivityType
  selectedOutputs: OutputType[]
  /** The scenario's generator efficiency, so the grid route matches the energy shown. */
  elecEff: number
}

const selectClass =
  'w-full mt-1 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 ' +
  'text-sm text-gray-800 dark:text-slate-200 px-2 py-1.5'

/**
 * The climate result: avoided methane + displaced fossil − project emissions,
 * from the backend GHG module. A potential, never a credit (spec §4).
 */
export default function ClimatePanel({ ch4M3Year, activityType, selectedOutputs, elecEff }: Props) {
  const t = useTranslations('calculator.climate')
  const tUnits = useTranslations('common.units')
  const format = useFormat()

  const [baseline, setBaseline] = useState<GhgBaseline>('nao_informado')
  const [route, setRoute] = useState<GhgRoute>(() => defaultRoute(selectedOutputs))
  const [upgrading, setUpgrading] = useState<GhgUpgrading>('lavagem_agua')
  // null until the user moves the slider: the default leak is ghg.yaml's, not retyped here.
  const [leak, setLeak] = useState<number | null>(null)
  // undefined while loading, null when the API could not answer.
  const [estimate, setEstimate] = useState<GhgEstimate | null | undefined>(undefined)

  const hasUpgrading = UPGRADING_ROUTES.has(route)

  useEffect(() => {
    const ctrl = new AbortController()
    const timer = setTimeout(() => {
      estimateGhg(
        {
          ch4_produced_nm3_year: ch4M3Year,
          baseline,
          route,
          ...(hasUpgrading && { slip_technology: upgrading }),
          ...(leak !== null && { leak }),
          ...(route === 'eletricidade' && { electrical_efficiency: elecEff }),
        },
        ctrl.signal
      ).then(r => {
        if (!ctrl.signal.aborted) setEstimate(r)
      })
    }, 250)
    return () => {
      clearTimeout(timer)
      ctrl.abort()
    }
  }, [ch4M3Year, baseline, route, upgrading, hasUpgrading, leak, elecEff])

  const tons = (v: number) => `${format.number(v, { decimals: 0 })} ${tUnits('tco2eq_year')}`
  const pct = (fraction: number) => format.percent(fraction * 100, { decimals: 1 })
  const leakShown = leak ?? estimate?.assumptions.leak ?? null

  return (
    <div className="p-4 rounded-xl border border-dusk-200 dark:border-dusk-800 bg-dusk-50/60 dark:bg-dusk-900/10 space-y-3">
      <div>
        <p className="font-semibold text-sm text-gray-800 dark:text-slate-200">🌍 {t('title')}</p>
        <p className="text-xs text-gray-500 dark:text-slate-400">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-600 dark:text-slate-400">
        <label>
          {t('baselineLabel')}
          <select className={selectClass} value={baseline} onChange={e => setBaseline(e.target.value as GhgBaseline)}>
            {BASELINE_OPTIONS[activityType].map(b => (
              <option key={b} value={b}>{t(`baselines.${b}`)}</option>
            ))}
          </select>
        </label>
        <label>
          {t('routeLabel')}
          <select className={selectClass} value={route} onChange={e => setRoute(e.target.value as GhgRoute)}>
            {ROUTES.map(r => (
              <option key={r} value={r}>{t(`routes.${r}`)}</option>
            ))}
          </select>
        </label>
        {hasUpgrading && (
          <label>
            {t('upgradingLabel')}
            <select className={selectClass} value={upgrading} onChange={e => setUpgrading(e.target.value as GhgUpgrading)}>
              {UPGRADING_TECHNOLOGIES.map(u => (
                <option key={u} value={u}>{t(`upgrading.${u}`)}</option>
              ))}
            </select>
          </label>
        )}
        <label>
          {t('leakLabel', { value: leakShown === null ? '…' : pct(leakShown) })}
          <input
            type="range"
            min={0}
            max={LEAK_MAX_PCT}
            step={0.5}
            value={leakShown === null ? 0 : leakShown * 100}
            disabled={leakShown === null}
            onChange={e => setLeak(parseFloat(e.target.value) / 100)}
            className="w-full mt-2"
          />
        </label>
      </div>

      {estimate === undefined && <p className="text-xs text-gray-400 dark:text-slate-500">{t('loading')}</p>}
      {estimate === null && <p className="text-xs text-amber-700 dark:text-amber-400">{t('unavailable')}</p>}
      {estimate && (
        <>
          <dl className="text-sm space-y-1">
            {[
              { label: t('methane'), value: estimate.be_methane_t, sign: '+' },
              { label: t('fossil'), value: estimate.be_fossil_t, sign: '+' },
              { label: t('project'), value: estimate.pe_total_t, sign: '−' },
            ].map(({ label, value, sign }) => (
              <div key={label} className="flex justify-between gap-2">
                <dt className="text-gray-500 dark:text-slate-400">{label}</dt>
                <dd className="font-medium text-gray-800 dark:text-slate-200 whitespace-nowrap">{sign} {tons(value)}</dd>
              </div>
            ))}
            <div className="flex justify-between gap-2 pt-1 border-t border-dusk-200 dark:border-dusk-800">
              <dt className="font-semibold text-gray-700 dark:text-slate-300">{t('net')}</dt>
              <dd className="font-bold text-dusk-700 dark:text-dusk-400 whitespace-nowrap">{tons(estimate.er_net_t)}</dd>
            </div>
          </dl>
          <p className="text-xs text-gray-600 dark:text-slate-400">
            {estimate.leak_break_even !== null
              ? t('breakEven', { value: pct(estimate.leak_break_even) })
              : estimate.er_net_t < 0
              ? t('netNegative')
              : null}
          </p>
          <p className="text-xs text-gray-400 dark:text-slate-500">
            {t('footnote', { gwp: estimate.gwp_version, value: format.number(estimate.gwp_value) })}
            {estimate.unverified.length > 0 && ` ${t('unverified')}`}
          </p>
        </>
      )}
    </div>
  )
}
