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

interface LanguageSwitcherProps {
  /** light: on a light bar (the public header); dark: on the green one. */
  variant?: 'light' | 'dark'
}

const STYLES = {
  light: {
    active: 'text-cp2b-green dark:text-emerald-400',
    inactive: 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700',
    separator: 'text-gray-300 dark:text-gray-600',
  },
  // The brand green of the light style is ~1.3:1 on the green header.
  dark: {
    active: 'text-white bg-white/20',
    inactive: 'text-green-100 hover:text-white hover:bg-white/10',
    separator: 'text-white/40',
  },
}

export default function LanguageSwitcher({ variant = 'light' }: LanguageSwitcherProps) {
  const locale = useLocale()
  const t = useTranslations('common')
  const handleLanguageChange = useLocaleSwitch()
  const styles = STYLES[variant]

  const activeClass = `px-2 py-1 text-xs font-bold rounded transition-colors ${styles.active}`
  const inactiveClass = `px-2 py-1 text-xs font-medium rounded transition-colors ${styles.inactive}`

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
      <span aria-hidden="true" className={`${styles.separator} text-xs select-none`}>|</span>
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
