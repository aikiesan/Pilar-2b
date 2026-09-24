'use client'

import { useCallback, useEffect, useState } from 'react'
import { getKinetics, getReferences, getResidues, getSectorSummary } from '@/services/scientificApi'
import type { KineticData, LiteratureReference, ResidueRecord, SectorSummary } from '@/types/scientific'
import { logger } from '@/lib/logger'

export interface ScientificData {
  residues: ResidueRecord[]
  sectors: SectorSummary[]
  kinetics: KineticData[]
  references: LiteratureReference[]
}

export interface ScientificDatabase extends ScientificData {
  loading: boolean
  /** Some part could not be loaded; whatever did load is still there. */
  failed: boolean
  reload: () => void
}

const EMPTY: ScientificData = { residues: [], sectors: [], kinetics: [], references: [] }

/**
 * Loads the scientific database once `enabled` (the visitor is signed in), and
 * again on `reload()`. The four requests are independent: one failing leaves
 * the others' data on the page.
 */
export function useScientificDatabase(enabled: boolean): ScientificDatabase {
  const [data, setData] = useState<ScientificData>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    Promise.allSettled([getResidues(), getSectorSummary(), getKinetics(), getReferences()]).then(
      ([residues, sectors, kinetics, references]) => {
        if (cancelled) return
        const parts = { residues, sectors, kinetics, references }
        for (const [name, result] of Object.entries(parts)) {
          if (result.status === 'rejected') logger.warn(`Scientific database: ${name} failed to load`, result.reason)
        }
        setData((previous) => ({
          residues: residues.status === 'fulfilled' ? residues.value : previous.residues,
          sectors: sectors.status === 'fulfilled' ? sectors.value : previous.sectors,
          kinetics: kinetics.status === 'fulfilled' ? kinetics.value : previous.kinetics,
          references: references.status === 'fulfilled' ? references.value : previous.references,
        }))
        setFailed(Object.values(parts).some((result) => result.status === 'rejected'))
        setLoading(false)
      }
    )
    return () => {
      cancelled = true
    }
  }, [enabled, attempt])

  const reload = useCallback(() => {
    setLoading(true)
    setAttempt((n) => n + 1)
  }, [])

  return { ...data, loading, failed, reload }
}
