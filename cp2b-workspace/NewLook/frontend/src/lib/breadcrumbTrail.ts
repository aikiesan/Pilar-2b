/**
 * The breadcrumb trail, read from the menus (siteNav.ts): Início / <menu
 * group> / <page> / <what the caller adds>. The group links to the page its
 * menu opens with, so the trail climbs the same tree the header shows.
 *
 * Pure, so server pages (with getTranslations) and the client hook
 * useBreadcrumbs (with useTranslations) build the same trail.
 */
import type { BreadcrumbItem } from '@/components/ui/Breadcrumb'
import { navTrail, type NavKey } from '@/components/layout/siteNav'

export function navCrumbs(
  pathname: string,
  tNav: (key: NavKey) => string,
  /** Crumbs below the menu entry, e.g. a municipality's name; the last one is the current page. */
  tail: BreadcrumbItem[] = [],
): BreadcrumbItem[] {
  const home: BreadcrumbItem = { label: tNav('home'), href: '/' }
  const trail = navTrail(pathname)
  if (!trail) return [home, ...tail]

  const { group, leaf } = trail
  const groupCrumb: BreadcrumbItem = { label: tNav(group.labelKey), href: group.introHref }

  if (pathname === leaf.href) {
    // On the entry itself: the group links away only if it opens elsewhere.
    return [
      home,
      group.introHref === leaf.href ? { label: groupCrumb.label } : groupCrumb,
      { label: tNav(leaf.labelKey) },
    ]
  }

  // Below the entry. When the group opens on this very entry (Dados -> /data),
  // one crumb says both.
  return group.introHref === leaf.href
    ? [home, groupCrumb, ...tail]
    : [home, groupCrumb, { label: tNav(leaf.labelKey), href: leaf.href }, ...tail]
}
