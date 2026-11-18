'use client'

/**
 * The phone bottom bar (below md): Mapa · Municípios · Dados · Mais, the map-
 * first shortcuts within thumb reach. "Mais" opens the header's full menu, so
 * it carries the same aria-expanded / aria-controls as the header button.
 *
 * Not shown on the full-viewport tools (useHasTabBar): the map brings its own
 * bottom sheet there.
 */
import { MoreHorizontal } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Link } from '@/navigation'
import { TAB_BAR } from './siteNav'

interface MobileTabBarProps {
  /** The href the header marks as the current page. */
  current: string | undefined
  menuOpen: boolean
  onToggleMenu: () => void
}

const cell = (active: boolean) =>
  `-mt-px flex h-14 w-full flex-col items-center justify-center gap-0.5 border-t-2 text-[11px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-terra-600 ${
    active
      ? 'border-terra-600 text-terra-700 dark:border-terra-400 dark:text-terra-300'
      : 'border-transparent text-ink-muted hover:text-ink'
  }`

export default function MobileTabBar({ current, menuOpen, onToggleMenu }: MobileTabBarProps) {
  const t = useTranslations('common')

  return (
    <nav
      aria-label={t('menu.tab_bar')}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-paper-raised/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden"
    >
      <ul className="grid grid-cols-4">
        {TAB_BAR.map(({ href, labelKey, icon: Icon }) => {
          // The bar names a section: "Dados" is current anywhere under /data.
          const active = !menuOpen && current !== undefined && (current === href || current.startsWith(`${href}/`))
          return (
            <li key={href}>
              <Link href={href} aria-current={active ? 'page' : undefined} className={cell(active)}>
                <Icon className="h-5 w-5" aria-hidden="true" />
                {t(`nav.${labelKey}`)}
              </Link>
            </li>
          )
        })}
        <li>
          <button
            type="button"
            onClick={onToggleMenu}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={t('menu.more_label')}
            className={cell(menuOpen)}
          >
            <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
            {t('nav.more')}
          </button>
        </li>
      </ul>
    </nav>
  )
}
