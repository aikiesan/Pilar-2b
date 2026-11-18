/**
 * The site's navigation, in one place: the header's mega-menus, the phone
 * drawer, the phone bottom bar and the footer's quick links all read it.
 *
 * Only pages that exist go here; a section of the redesign joins its menu
 * with its first page (Estatísticas, Downloads, API and Coleções under Dados;
 * the Aplicações menu; the brand manual under Sobre). siteNav.test.ts holds
 * every href to a page file, so a menu cannot link to a 404.
 *
 * The Sobre menu points at the CP2b site (config/contact: CP2B_PAGES): who
 * the centre is lives there, kept by the people who run it, and this platform
 * does not keep a second copy. An absolute href is rendered by NavLink as a
 * plain link to that site; only Novidades and Como citar are pages of ours.
 */
import type { LucideIcon } from 'lucide-react'
import {
  Banknote,
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  Columns3,
  Compass,
  Database,
  FlaskConical,
  Gauge,
  Handshake,
  Info,
  Landmark,
  Layers,
  Library,
  Lightbulb,
  ListTree,
  Mail,
  Map,
  Newspaper,
  Palette,
  Quote,
  Scale,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Workflow,
} from 'lucide-react'
import type { Messages } from '@/types/i18n'
import { CP2B_PAGES } from '@/config/contact'
import { METHOD_PAGES_ENABLED } from '@/lib/featureFlags'

export type NavKey = keyof Messages['common']['nav']
export type NavDescriptionKey = keyof Messages['common']['nav_descriptions']
export type NavGroupId = keyof Messages['common']['nav_intro']

export interface NavLeaf {
  href: string
  labelKey: NavKey
  descriptionKey?: NavDescriptionKey
  icon: LucideIcon
}

export interface NavGroup {
  id: NavGroupId
  labelKey: NavKey
  /** Where the panel's call to action leads. */
  introHref: string
  /** A nav label for the call to action, in place of nav_intro.<id>.cta. */
  introCtaKey?: NavKey
  /** Classes the guided tour (TourGuide) points at for steps inside the group. */
  tourClass?: string
  items: NavLeaf[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'platform',
    labelKey: 'group_platform',
    introHref: '/map',
    tourClass: `${METHOD_PAGES_ENABLED ? 'tour-analysis ' : ''}tour-calculator tour-proximity`,
    items: [
      { href: '/map', labelKey: 'map_interactive', descriptionKey: 'map', icon: Map },
      { href: '/municipalities', labelKey: 'municipalities', descriptionKey: 'municipalities', icon: Building2 },
      { href: '/compare', labelKey: 'compare_municipalities', descriptionKey: 'compare', icon: Columns3 },
      { href: '/proximity', labelKey: 'proximity_logistics', descriptionKey: 'proximity', icon: Target },
      { href: '/calculator', labelKey: 'technology_routes', descriptionKey: 'technology_routes', icon: Workflow },
      // Held back with the Método pages: it shows the availability factors.
      ...(METHOD_PAGES_ENABLED
        ? [{ href: '/analysis', labelKey: 'multicriteria', descriptionKey: 'advanced', icon: BarChart3 }] satisfies NavLeaf[]
        : []),
    ],
  },
  {
    id: 'data',
    labelKey: 'group_data',
    introHref: '/data',
    items: [
      { href: '/data', labelKey: 'data_catalog', descriptionKey: 'data_catalog', icon: Database },
      { href: '/data/legend', labelKey: 'data_legend', descriptionKey: 'data_legend', icon: Palette },
      { href: '/financing', labelKey: 'financing', descriptionKey: 'financing', icon: Banknote },
      { href: '/mandate', labelKey: 'mandate', descriptionKey: 'mandate', icon: Scale },
    ],
  },
  {
    id: 'method',
    labelKey: 'group_method',
    // While the Método pages are held back (METHOD_PAGES_ENABLED), the menu
    // keeps only the pages that were already public.
    ...(METHOD_PAGES_ENABLED
      ? { introHref: '/method' }
      : { introHref: '/method/science-base', introCtaKey: 'scientific_database' as const }),
    tourClass: 'tour-science',
    items: [
      ...(METHOD_PAGES_ENABLED
        ? [
            { href: '/method', labelKey: 'method_overview', descriptionKey: 'method_overview', icon: Compass },
            { href: '/method/fde', labelKey: 'method_fde', descriptionKey: 'method_fde', icon: Gauge },
            { href: '/method/scenarios', labelKey: 'method_scenarios', descriptionKey: 'method_scenarios', icon: Layers },
          ] satisfies NavLeaf[]
        : []),
      { href: '/method/science-base', labelKey: 'scientific_database', descriptionKey: 'scientific_database', icon: FlaskConical },
      ...(METHOD_PAGES_ENABLED
        ? [{ href: '/method/validation', labelKey: 'method_validation', descriptionKey: 'method_validation', icon: ShieldCheck }] satisfies NavLeaf[]
        : []),
      { href: '/guide', labelKey: 'guide_usage', descriptionKey: 'guide', icon: BookOpen },
    ],
  },
  {
    id: 'about',
    labelKey: 'about',
    introHref: CP2B_PAGES.about,
    items: [
      { href: CP2B_PAGES.about, labelKey: 'cp2b_about', descriptionKey: 'cp2b_about', icon: Info },
      { href: CP2B_PAGES.governance, labelKey: 'cp2b_governance', descriptionKey: 'cp2b_governance', icon: Landmark },
      { href: CP2B_PAGES.partners, labelKey: 'cp2b_partners', descriptionKey: 'cp2b_partners', icon: Handshake },
      { href: CP2B_PAGES.axes, labelKey: 'cp2b_axes', descriptionKey: 'cp2b_axes', icon: Target },
      { href: CP2B_PAGES.solutions, labelKey: 'cp2b_solutions', descriptionKey: 'cp2b_solutions', icon: Lightbulb },
      { href: CP2B_PAGES.team, labelKey: 'cp2b_team', descriptionKey: 'cp2b_team', icon: Users },
      { href: CP2B_PAGES.publications, labelKey: 'cp2b_publications', descriptionKey: 'cp2b_publications', icon: Library },
      { href: CP2B_PAGES.news, labelKey: 'cp2b_news', descriptionKey: 'cp2b_news', icon: Newspaper },
      { href: CP2B_PAGES.events, labelKey: 'cp2b_events', descriptionKey: 'cp2b_events', icon: CalendarDays },
      { href: CP2B_PAGES.contact, labelKey: 'cp2b_contact', descriptionKey: 'cp2b_contact', icon: Mail },
      { href: '/patch-notes', labelKey: 'patch_notes', descriptionKey: 'patch_notes', icon: Sparkles },
      { href: '/cite', labelKey: 'cite', descriptionKey: 'cite', icon: Quote },
    ],
  },
]

/** The utility bar's guide link, beside search and language. */
export const GUIDE_LINK = { href: '/guide', labelKey: 'guide' } as const satisfies Pick<NavLeaf, 'href' | 'labelKey'>

/** The phone bottom bar, before its "Mais" button. */
export const TAB_BAR: Pick<NavLeaf, 'href' | 'labelKey' | 'icon'>[] = [
  { href: '/map', labelKey: 'map', icon: Map },
  { href: '/municipalities', labelKey: 'municipalities', icon: Building2 },
  { href: '/data', labelKey: 'group_data', icon: ListTree },
]

/** The footer's quick links. */
export const FOOTER_LINKS: Pick<NavLeaf, 'href' | 'labelKey'>[] = [
  { href: '/', labelKey: 'home' },
  { href: '/map', labelKey: 'map' },
  { href: '/data', labelKey: 'data_catalog' },
  METHOD_PAGES_ENABLED
    ? { href: '/method', labelKey: 'group_method' }
    : { href: '/method/science-base', labelKey: 'scientific_database' },
  { href: CP2B_PAGES.about, labelKey: 'cp2b_about' },
  { href: '/cite', labelKey: 'cite' },
]

/** Every page the navigation links to, anchors included. */
export const allNavHrefs = (): string[] => [
  ...NAV_GROUPS.flatMap((group) => [group.introHref, ...group.items.map((item) => item.href)]),
  GUIDE_LINK.href,
  ...TAB_BAR.map((item) => item.href),
  ...FOOTER_LINKS.map((item) => item.href),
]

/**
 * Where a page sits in the menus: its group and its own entry, for the
 * breadcrumb ("Início / Plataforma / Proximidade"). A path under an entry
 * (/municipalities/campinas-sp) finds that entry; a path no menu lists finds
 * nothing.
 */
export function navTrail(pathname: string): { group: NavGroup; leaf: NavLeaf } | undefined {
  for (const group of NAV_GROUPS) {
    const href = currentNavHref(pathname, group.items.map((item) => item.href))
    const leaf = group.items.find((item) => item.href === href)
    if (leaf) return { group, leaf }
  }
  return undefined
}

/**
 * The href that names the current page: the longest one the path is, or sits
 * under. An anchor (/guide#faq) is a section, never the current page, and a
 * parent gives way to its child: on /data/legend, "Legenda e códigos" is
 * current, not the catalogue.
 */
export function currentNavHref(pathname: string, hrefs: string[] = allNavHrefs()): string | undefined {
  return hrefs
    .filter((href) => !href.includes('#') && href !== '/')
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0]
}
