'use client'

import { useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import type { CodigestionResidue } from '@/types/geospatial'
import type { Messages } from '@/types/i18n'
import { useFormat } from '@/hooks/useFormat'

type SubstrateKey = keyof Messages['Map']['codigestion']['substrates']

const toFinite = (value: unknown): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

/** "cluster_007" → "7"; any other id is shown as served. */
export const clusterNumber = (id: string): string => id.match(/^cluster_0*(\d+)$/)?.[1] ?? id

/**
 * Display text shared by the co-digestion cluster layer and detail panel.
 *
 * The API sends each residue's `key` (the map's residue ids) with a Portuguese
 * `label`; the name shown comes from Map.codigestion.substrates by key, and the
 * served label is only a fallback for a key the catalog does not know yet.
 */
export function useCodigestionText() {
  const t = useTranslations('Map.codigestion.substrates')
  const tCommon = useTranslations('common')
  const format = useFormat()

  const substrate = useCallback(
    (residue: Pick<CodigestionResidue, 'key' | 'label'> | null | undefined): string => {
      if (!residue) return ''
      const key = residue.key as SubstrateKey
      return t.has(key) ? t(key) : residue.label
    },
    [t]
  )

  /** Feedstock tonnage when served, otherwise the biogas volume. */
  const amount = useCallback(
    (biomassTons: unknown, biogasM3: unknown): string => {
      const tons = toFinite(biomassTons)
      return tons > 0
        ? `${format.compact(tons)} ${tCommon('units.t_year')}`
        : `${format.compact(toFinite(biogasM3))} ${tCommon('units.m3_year')}`
    },
    [format, tCommon]
  )

  return useMemo(() => ({ substrate, amount }), [substrate, amount])
}
