import type { MetadataRoute } from 'next'

const BASE_URL = 'https://cp2b.unicamp.br/pilar2b'

const locales = ['en', 'pt-BR'] as const

const publicRoutes = [
  { path: '/',          changeFrequency: 'weekly'  as const, priority: 1.0, lastModified: '2025-01-01' },
  { path: '/map',       changeFrequency: 'daily'   as const, priority: 0.9, lastModified: '2025-01-01' },
  { path: '/about',     changeFrequency: 'monthly' as const, priority: 0.7, lastModified: '2025-01-01' },
  { path: '/privacy',   changeFrequency: 'yearly'  as const, priority: 0.5, lastModified: '2025-01-01' },
  { path: '/terms',     changeFrequency: 'yearly'  as const, priority: 0.5, lastModified: '2025-01-01' },
  { path: '/login',     changeFrequency: 'yearly'  as const, priority: 0.3, lastModified: '2025-01-01' },
  { path: '/register',  changeFrequency: 'yearly'  as const, priority: 0.3, lastModified: '2025-01-01' },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = []

  for (const route of publicRoutes) {
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
            'x-default': `${BASE_URL}/en${suffix}`,
          },
        },
      })
    }
  }

  return entries
}
