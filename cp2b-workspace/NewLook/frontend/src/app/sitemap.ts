import type { MetadataRoute } from 'next'

const BASE_URL = 'https://cp2b.unicamp.br/pilar2b'

const locales = ['en', 'pt-BR'] as const

const publicRoutes = [
  { path: '/', changeFrequency: 'weekly' as const, priority: 1.0 },
  { path: '/map', changeFrequency: 'daily' as const, priority: 0.9 },
  { path: '/about', changeFrequency: 'monthly' as const, priority: 0.7 },
  { path: '/login', changeFrequency: 'yearly' as const, priority: 0.3 },
  { path: '/register', changeFrequency: 'yearly' as const, priority: 0.3 },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = []

  for (const route of publicRoutes) {
    for (const locale of locales) {
      entries.push({
        url: `${BASE_URL}/${locale}${route.path === '/' ? '' : route.path}`,
        lastModified: new Date(),
        changeFrequency: route.changeFrequency,
        priority: route.priority,
      })
    }
  }

  return entries
}
