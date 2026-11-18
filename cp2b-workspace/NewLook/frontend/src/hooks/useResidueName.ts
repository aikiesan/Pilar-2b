'use client'

import { useCallback } from 'react'
import { useLocale } from 'next-intl'
import type { ResidueName } from '@/types/scientific'

/**
 * A database residue's name in the page's language: `nome_en` on the English
 * site once the database has one (migration 032), `nome` otherwise.
 */
export function residueName(residue: ResidueName, locale: string): string {
  return (locale === 'en' && residue.nome_en?.trim()) || residue.nome
}

export function useResidueName(): (residue: ResidueName) => string {
  const locale = useLocale()
  return useCallback((residue: ResidueName) => residueName(residue, locale), [locale])
}
