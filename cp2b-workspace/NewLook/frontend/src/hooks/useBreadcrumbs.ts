'use client'

import { useTranslations } from 'next-intl'
import { usePathname } from '@/navigation'
import type { BreadcrumbItem } from '@/components/ui/Breadcrumb'
import { navCrumbs } from '@/lib/breadcrumbTrail'

/**
 * The breadcrumb for the current route, read from the menus: Início / <menu
 * group> / <page>. There is no "Voltar ao Dashboard" crumb any more.
 */
export function useBreadcrumbs(tail: BreadcrumbItem[] = []): BreadcrumbItem[] {
  const pathname = usePathname() // locale-stripped, e.g. '/compare'
  const t = useTranslations('pages')
  const tNav = useTranslations('common.nav')

  // Settings lives in the account menu, not in a group.
  if (pathname === '/settings') return [{ label: tNav('home'), href: '/' }, { label: t('settings.title') }]

  return navCrumbs(pathname, (key) => tNav(key), tail)
}
