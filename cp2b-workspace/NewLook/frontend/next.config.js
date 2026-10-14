const createNextIntlPlugin = require('next-intl/plugin');

// Point to the correct i18n.ts location (root of frontend)
const withNextIntl = createNextIntlPlugin('./i18n.ts');

const isProd = process.env.NODE_ENV === 'production';
// basePath is only needed in production (Apache reverse-proxy at /pilar2b).
// In local Docker dev (NODE_ENV=development) we serve from root so that
// localhost:3006/pt-BR works without any extra path prefix.
const basePath = isProd ? '/pilar2b' : '';

// Retired paths and where their content lives now. Real 301s: Next's
// `permanent: true` sends 308, so the status is set explicitly. The locale
// segment is matched so a visitor keeps their language; basePath is added by
// Next itself.
const LOCALE = ':locale(en|pt-BR)';
const movedPages = [
  // /sobre (the old marketing home) and /dashboard/about (a client-side bounce
  // to nipe.unicamp.br) were merged into the single /about page.
  { from: '/sobre', to: '/about' },
  { from: '/dashboard/about', to: '/about#parceiros' },
  // The tools lost the /dashboard prefix (Phase 1 of the redesign). Query
  // strings (e.g. ?view=references, shared proximity links) are kept by Next.
  // Temporary while /analysis is held back with the Método pages
  // (METHOD_PAGES_ENABLED): the old address opens the map instead of a 404.
  // When the flag turns on, point this back at /analysis with a 301.
  { from: '/dashboard/advanced-analysis', to: '/map', statusCode: 307 },
  { from: '/dashboard/compare', to: '/compare' },
  { from: '/dashboard/proximity', to: '/proximity' },
  { from: '/dashboard/technology-routes', to: '/calculator' },
  { from: '/dashboard/scientific-database', to: '/method/science-base' },
  // Portuguese addresses a visitor might type or say aloud ("pilar2b/mapa").
  // The routes themselves keep their English names.
  { from: '/mapa', to: '/map' },
  { from: '/municipios', to: '/municipalities' },
  { from: '/municipios/:slug', to: '/municipalities/:slug' },
  { from: '/dados', to: '/data' },
  { from: '/guia', to: '/guide' },
  { from: '/comparar', to: '/compare' },
  { from: '/calculadora', to: '/calculator' },
  { from: '/proximidade', to: '/proximity' },
  { from: '/citar', to: '/cite' },
  { from: '/acessibilidade', to: '/accessibility' },
  { from: '/privacidade', to: '/privacy' },
  { from: '/termos', to: '/terms' },
  // Temporary: the Método pages are held back (METHOD_PAGES_ENABLED), so
  // /metodo opens the science base until /method is public. A 301 would stay
  // in browser caches after that.
  { from: '/metodo', to: '/method/science-base', statusCode: 307 },
].map(({ from, to, statusCode = 301 }) => ({
  source: `/${LOCALE}${from}`,
  destination: `/:locale${to}`,
  statusCode,
}));

/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath,
  async redirects() {
    if (!isProd) {
      return [
        // Strip stale /pilar2b prefix that browsers may have cached from production URLs
        { source: '/pilar2b/:path*', destination: '/:path*', permanent: false },
        ...movedPages,
      ];
    }
    return [
      { source: '/', destination: '/pilar2b/pt-BR', permanent: false, basePath: false },
      ...movedPages,
    ];
  },
  // IMPORTANT: Removed static export for Vercel deployment
  // Vercel supports full Next.js features including:
  // - Middleware (for authentication)
  // - Server-side rendering
  // - API routes
  // - Dynamic routes
  // If you need static export for Cloudflare Pages, set STATIC_EXPORT=true

  // Performance: Enable experimental optimizations
  experimental: {
    // Optimize package imports for faster builds
    optimizePackageImports: ['lucide-react', 'recharts', 'react-chartjs-2'],
  },

  // Performance: Optimize images
  images: {
    unoptimized: process.env.NODE_ENV === 'production' || process.env.STATIC_EXPORT === 'true',
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Performance: Enable compiler optimizations
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Disabled React Strict Mode due to known incompatibility with Leaflet
  // React Strict Mode causes double-mounting in development which triggers
  // "Map container is already initialized" error from Leaflet
  // This only affects development; production builds work fine
  reactStrictMode: false,

  // Vercel handles trailing slashes automatically
  trailingSlash: false,

  // Performance: Enable HTTP compression
  compress: true,

  // Performance: Optimize production build
  productionBrowserSourceMaps: false,

  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://cp2b.unicamp.br/pilar2b',
    NEXT_PUBLIC_DISABLE_AUTH: process.env.NEXT_PUBLIC_DISABLE_AUTH || 'false',
    // For URLs built by hand (a fetch of a file in public/, a cookie's path);
    // see src/lib/basePath.ts. Nothing set it before, so in production those
    // URLs pointed outside /pilar2b.
    NEXT_PUBLIC_BASE_PATH: basePath,
  },

  // Security headers (LGPD Art. 46 — security of processing). CSP is sent in
  // Report-Only mode so it surfaces violations without risking the map tiles or
  // the inline theme script; promote to enforcing once violations are clean.
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https:",
      "font-src 'self' data:",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ');
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), camera=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'Content-Security-Policy-Report-Only', value: csp },
        ],
      },
    ];
  },

  // Keep relaxed checks for faster builds
  typescript: {
    ignoreBuildErrors: false,
  },

  // Output standalone for better Vercel performance
  output: 'standalone',
}

// Export configuration with i18n plugin
module.exports = withNextIntl(nextConfig);
