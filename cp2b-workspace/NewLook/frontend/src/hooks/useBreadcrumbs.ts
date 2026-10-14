'use client'

import { useTranslations } from 'next-intl'
import { usePathname } from '@/navigation'
import type { BreadcrumbItem } from '@/components/ui/Breadcrumb'
import { METHOD_PAGES_ENABLED } from '@/lib/featureFlags'

type BreadcrumbOverrides = {
  /** The municipality's name on a /municipalities/[slug] page */
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

  // The science base is one of the Método pages, under /method once that is public.
  if (pathname === '/method/science-base')
    return METHOD_PAGES_ENABLED
      ? [home, { label: tNav('group_method'), href: '/method' }, { label: t('scientific_database.title') }]
      : [home, { label: t('scientific_database.title') }]

  if (pathname === '/dashboard')
    return [home, { label: tNav('dashboard') }]

  if (pathname === '/settings')
    return [home, { label: t('settings.title') }]

  if (pathname.startsWith('/municipalities/')) {
    const name = overrides?.municipalityName ?? '...'
    return [home, { label: tNav('municipalities'), href: '/municipalities' }, { label: name }]
  }

  return [home]
}
