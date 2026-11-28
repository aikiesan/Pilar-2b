import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Nothing is blocked. Account pages carry noindex (NOT_INDEXED),
        // which Google reads only if it may fetch them, and the map,
        // compare and calculator pages load their data from /api/ in the
        // browser, so Google needs it to see them filled in.
      },
    ],
    sitemap: 'https://cp2b.unicamp.br/pilar2b/sitemap.xml',
  }
}
