'use client'

import { useMemo } from 'react'
import { useLocale } from 'next-intl'
import { defaultLocale, isLocale } from '@/config/i18n'
import { createFormatters, type Formatters } from '@/lib/format'

/**
 * Number, percent, currency and date formatters bound to the page's locale.
 *
 *   const format = useFormat()
 *   format.compact(1_234_567)   // "1.2M" on /en, "1,2 mi" on /pt-BR
 *
 * See src/lib/format.ts for what each formatter does.
 */
export function useFormat(): Formatters {
  const current = useLocale()
  const locale = isLocale(current) ? current : defaultLocale
  return useMemo(() => createFormatters(locale), [locale])
}
