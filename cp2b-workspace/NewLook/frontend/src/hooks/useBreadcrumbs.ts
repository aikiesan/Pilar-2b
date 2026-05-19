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
  const pathname = usePathname() // locale-stripped, e.g. '/dashboard/compare'
  const t = useTranslations('pages')
  const tNav = useTranslations('common.nav')

  const home: BreadcrumbItem = { label: tNav('home'), href: '/' }
  const dashboard: BreadcrumbItem = { label: tNav('dashboard'), href: '/dashboard' }
  const map: BreadcrumbItem = { label: tNav('map'), href: '/map' }

  if (pathname === '/dashboard')
    return [home, { label: tNav('dashboard') }]

  if (pathname === '/dashboard/advanced-analysis')
    return [home, dashboard, { label: t('advanced_analysis.title') }]

  if (pathname === '/dashboard/compare')
    return [home, dashboard, { label: t('compare.title') }]

  if (pathname === '/dashboard/proximity')
    return [home, dashboard, { label: t('proximity.title') }]

  if (pathname === '/dashboard/scientific-database')
    return [home, dashboard, { label: t('scientific_database.title') }]

  if (pathname === '/dashboard/technology-routes')
    return [home, dashboard, { label: t('technology_routes.title') }]

  if (pathname === '/dashboard/about')
    return [home, dashboard, { label: t('dashboard_about.title') }]

  if (pathname === '/settings')
    return [home, { label: t('settings.title') }]

  if (pathname.startsWith('/municipality/')) {
    const name = overrides?.municipalityName ?? '...'
    return [home, map, { label: name }]
  }

  return [home]
}
