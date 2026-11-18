'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useFormat } from '@/hooks/useFormat'
import {
  isPaybackKnown,
  type ActivityQuantity,
  type ActivityType,
  type OutputResult,
  type OutputType,
} from './calculatorEngine'

/**
 * The calculator's recurring phrases in the page's language: output amounts,
 * the activity summary, payback periods. The engine returns numbers and
 * identifiers only; this is where they are worded, once, for every step.
 */
export function useCalculatorText() {
  const t = useTranslations('calculator')
  const tUnits = useTranslations('common.units')
  const format = useFormat()

  return useMemo(
    () => ({
      /** "12.3 MWh/year", "1,234 m³/year", … for one output. */
      outputValue(type: OutputType, outputs: OutputResult): string {
        switch (type) {
          case 'energy':
            return `${format.number(outputs.energyKwhYear / 1000, { decimals: 1 })} ${tUnits('mwh_year')}`
          case 'biomethane':
            return `${format.number(outputs.biomethaneM3Year)} ${tUnits('m3_year')}`
          case 'digestate':
            return `${format.number(outputs.digestateTonsYear)} ${tUnits('t_year')}`
          case 'thermal':
            return `${format.number(outputs.thermalMjYear / 1000)} ${tUnits('gj_year')}`
          case 'biochar':
            return `${format.number(outputs.biocharTonsYear, { decimals: 1 })} ${tUnits('t_year')}`
          case 'carbon':
            return `${format.number(outputs.co2TonsYear, { decimals: 1 })} ${tUnits('tco2eq_year')}`
        }
      },

      /** "Sugarcane (1,200 t)", "Swine (350 head)". */
      activity(type: ActivityType, quantity: ActivityQuantity): string {
        const unit = quantity.unit === 'heads' ? t('step2.heads') : quantity.unit
        return t('results.activity', {
          activity: t(`step2.${type}`),
          quantity: `${format.number(quantity.value)} ${unit}`,
        })
      },

      /** "4.5 years", or the not-estimable message. */
      payback(years: number): string {
        return isPaybackKnown(years) ? t('results.paybackYears', { years }) : t('results.paybackUnknown')
      },

      /** "From 4.5 years", or the not-estimable message. */
      paybackFrom(years: number): string {
        return isPaybackKnown(years) ? t('results.paybackFrom', { years }) : t('results.paybackUnknown')
      },
    }),
    [t, tUnits, format]
  )
}
