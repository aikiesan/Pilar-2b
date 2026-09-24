'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useRouter, usePathname } from '@/navigation'
import type { Locale } from '@/config/i18n'

const LOCALE_STORAGE_KEY = 'cp2b-locale'

/** Switches the page to another language, staying on the same page. */
export function useLocaleSwitch(): (newLocale: Locale) => void {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  return (newLocale: Locale) => {
    if (newLocale === locale) return

    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCALE_STORAGE_KEY, newLocale)
    }

    router.push(pathname, { locale: newLocale })
  }
}

export default function LanguageSwitcher() {
  const locale = useLocale()
  const t = useTranslations('common')
  const handleLanguageChange = useLocaleSwitch()

  const activeClass = 'px-2 py-1 text-xs font-bold rounded transition-colors text-cp2b-green dark:text-emerald-400'
  const inactiveClass = 'px-2 py-1 text-xs font-medium rounded transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700'

  return (
    <div
      role="group"
      aria-label={t('lang.group_aria')}
      className="flex items-center gap-0.5"
    >
      <button
        onClick={() => handleLanguageChange('en')}
        aria-pressed={locale === 'en'}
        aria-label={t('lang.switch_to_en')}
        className={locale === 'en' ? activeClass : inactiveClass}
      >
        EN
      </button>
      <span aria-hidden="true" className="text-gray-300 dark:text-gray-600 text-xs select-none">|</span>
      <button
        onClick={() => handleLanguageChange('pt-BR')}
        aria-pressed={locale === 'pt-BR'}
        aria-label={t('lang.switch_to_pt')}
        className={locale === 'pt-BR' ? activeClass : inactiveClass}
      >
        PT
      </button>
    </div>
  )
}
