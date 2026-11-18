'use client'

import { useCallback } from 'react'
import { useLocale } from 'next-intl'
import { defaultLocale, isLocale } from '@/config/i18n'
import { localize, type Localized } from '@/lib/localized'

/**
 * Resolves `{ 'pt-BR': …, en: … }` record fields for the page's locale.
 *
 *   const localize = useLocalize()
 *   localize(residue.name)
 *
 * See src/lib/localized.ts for when to use localized fields instead of the
 * message catalogs.
 */
export function useLocalize(): <T>(value: Localized<T>) => T {
  const current = useLocale()
  const locale = isLocale(current) ? current : defaultLocale
  return useCallback(<T,>(value: Localized<T>) => localize(value, locale), [locale])
}
