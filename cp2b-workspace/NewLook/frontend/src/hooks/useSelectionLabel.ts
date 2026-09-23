'use client'

import { useCallback } from 'react'
import { useTranslations } from 'next-intl'
import type { BiomassType, ResidueType } from '@/types/map'

/**
 * What a map value measures, in the page's language: one residue
 * ("Sugarcane"), a number of residues ("3 residues"), a sector ("Livestock")
 * or the total. A residue selection wins over the sector, as it does in the
 * value accessors (lib/mapValues).
 */
export function useSelectionLabel(): (
  biomassType: BiomassType,
  selectedResidues: readonly ResidueType[]
) => string {
  const t = useTranslations('Map')
  const tCommon = useTranslations('common')
  return useCallback(
    (biomassType, selectedResidues) => {
      if (selectedResidues.length === 1) return t(`residues.${selectedResidues[0]}`)
      if (selectedResidues.length > 1) {
        return t('selection.residues', { count: selectedResidues.length })
      }
      return biomassType === 'total' ? t('selection.total') : tCommon(`sectors.${biomassType}`)
    },
    [t, tCommon]
  )
}
