'use client'

import { useCallback } from 'react'
import { useTranslations } from 'next-intl'
import type { DisplayMetric } from '@/types/geospatial'

export interface MetricText {
  /** Toggle label, e.g. "Biogas". */
  label: string
  /** Legend header including the display unit, e.g. "Biogas (Nm³/day)". */
  legend: string
  /** Unit suffix for values, e.g. "Nm³/day". */
  unit: string
}

/**
 * The copy for a choropleth metric in the page's language.
 *
 * `lib/mapMetrics` decides how a metric is read, converted and coloured; what
 * it is called lives in the catalog under Map.metrics.<key>, so the registry
 * stays free of display text.
 */
export function useMetricText(): (metric: DisplayMetric) => MetricText {
  const t = useTranslations('Map.metrics')
  return useCallback(
    (metric: DisplayMetric) => ({
      label: t(`${metric}.label`),
      legend: t(`${metric}.legend`),
      unit: t(`${metric}.unit`),
    }),
    [t]
  )
}
