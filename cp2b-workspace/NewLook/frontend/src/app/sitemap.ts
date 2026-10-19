import type { MetadataRoute } from 'next'
import { CATALOG_SECTORS, allResidueParams } from '@/data/residueCatalog'
import { METHOD_PAGES_ENABLED } from '@/lib/featureFlags'
import { municipalityDirectory } from '@/lib/municipalityDirectory'

const BASE_URL = 'https://cp2b.unicamp.br/pilar2b'

const locales = ['en', 'pt-BR'] as const

const publicRoutes = [
  { path: '/',          changeFrequency: 'weekly'  as const, priority: 1.0, lastModified: '2025-01-01' },
  { path: '/map',       changeFrequency: 'daily'   as const, priority: 0.9, lastModified: '2025-01-01' },
  { path: '/compare',   changeFrequency: 'monthly' as const, priority: 0.6, lastModified: '2026-10-14' },
  { path: '/calculator', changeFrequency: 'monthly' as const, priority: 0.6, lastModified: '2026-10-14' },
  { path: '/municipalities', changeFrequency: 'monthly' as const, priority: 0.7, lastModified: '2026-10-14' },
  { path: '/data',      changeFrequency: 'monthly' as const, priority: 0.8, lastModified: '2026-10-14' },
  { path: '/data/legend', changeFrequency: 'monthly' as const, priority: 0.5, lastModified: '2026-10-14' },
  { path: '/financing', changeFrequency: 'monthly' as const, priority: 0.6, lastModified: '2026-10-19' },
  ...CATALOG_SECTORS.map((sector) => (
    { path: `/data/${sector}`, changeFrequency: 'monthly' as const, priority: 0.6, lastModified: '2026-10-14' }
  )),
  ...allResidueParams().map(({ sector, residue }) => (
    { path: `/data/${sector}/${residue}`, changeFrequency: 'monthly' as const, priority: 0.6, lastModified: '2026-10-14' }
  )),
  // Held back until the methodology paper is submitted (METHOD_PAGES_ENABLED).
  ...(METHOD_PAGES_ENABLED ? ['', '/fde', '/scenarios', '/validation'] : []).map((page) => (
    { path: `/method${page}`, changeFrequency: 'monthly' as const, priority: page ? 0.6 : 0.7, lastModified: '2026-10-14' }
  )),
  { path: '/guide',     changeFrequency: 'monthly' as const, priority: 0.7, lastModified: '2025-01-01' },
  { path: '/cite',      changeFrequency: 'monthly' as const, priority: 0.6, lastModified: '2025-01-01' },
  { path: '/privacy',   changeFrequency: 'yearly'  as const, priority: 0.5, lastModified: '2025-01-01' },
  { path: '/terms',     changeFrequency: 'yearly'  as const, priority: 0.5, lastModified: '2025-01-01' },
  { path: '/accessibility', changeFrequency: 'yearly' as const, priority: 0.5, lastModified: '2026-10-14' },
  { path: '/login',     changeFrequency: 'yearly'  as const, priority: 0.3, lastModified: '2025-01-01' },
  { path: '/register',  changeFrequency: 'yearly'  as const, priority: 0.3, lastModified: '2025-01-01' },
]

// The municipality pages come from the API, so the sitemap is rebuilt hourly
// rather than frozen at build time, when the API may not be reachable.
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = []
  const municipalities = (await municipalityDirectory()) ?? []
  const routes = [
    ...publicRoutes,
    ...municipalities.map(({ slug }) => (
      { path: `/municipalities/${slug}`, changeFrequency: 'monthly' as const, priority: 0.6, lastModified: '2026-10-14' }
    )),
  ]

  for (const route of routes) {
    const suffix = route.path === '/' ? '' : route.path
    for (const locale of locales) {
      entries.push({
        url: `${BASE_URL}/${locale}${suffix}`,
        lastModified: route.lastModified,
        changeFrequency: route.changeFrequency,
        priority: route.priority,
        alternates: {
          languages: {
            en:          `${BASE_URL}/en${suffix}`,
            'pt-BR':     `${BASE_URL}/pt-BR${suffix}`,
            // Portuguese is the platform's primary locale.
            'x-default': `${BASE_URL}/pt-BR${suffix}`,
          },
        },
      })
    }
  }

  return entries
}
