'use client'

import { useTranslations } from 'next-intl'
import { usePathname } from '@/navigation'
import type { BreadcrumbItem } from '@/components/ui/Breadcrumb'

type BreadcrumbOverrides = {
  /** Pass the resolved municipality name for /municipality/[ibge_code] */
  municipalityName?: string
}

/**
 * Returns a localised breadcrumb trail for the current route.
 * Uses a static route map — fully translatable, no segment-parsing magic.
 */
export function useBreadcrumbs(overrides?: BreadcrumbOverrides): BreadcrumbItem[] {
  const pathname = usePathname() // locale-stripped, e.g. '/compare'
  const t = useTranslations('pages')
  const tNav = useTranslations('common.nav')

  const home: BreadcrumbItem = { label: tNav('home'), href: '/' }

  // The tools sit at the top level since /dashboard was dropped from their URLs.
  const tools: Record<string, string> = {
    '/analysis': t('advanced_analysis.title'),
    '/compare': t('compare.title'),
    '/proximity': t('proximity.title'),
    '/calculator': t('technology_routes.title'),
  }
  if (pathname in tools) return [home, { label: tools[pathname] }]

  // The science base is one of the Método pages.
  if (pathname === '/method/science-base')
    return [home, { label: tNav('group_method'), href: '/method' }, { label: t('scientific_database.title') }]

  if (pathname === '/dashboard')
    return [home, { label: tNav('dashboard') }]

  if (pathname === '/settings')
    return [home, { label: t('settings.title') }]

  if (pathname.startsWith('/municipality/')) {
    const name = overrides?.municipalityName ?? '...'
    return [home, { label: tNav('municipalities'), href: '/municipalities' }, { label: name }]
  }

  return [home]
}
