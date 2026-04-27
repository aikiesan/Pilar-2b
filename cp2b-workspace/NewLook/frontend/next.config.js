const createNextIntlPlugin = require('next-intl/plugin');

// Point to the correct i18n.ts location (root of frontend)
const withNextIntl = createNextIntlPlugin('./i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/pilar2b',
  async redirects() {
    return [{ source: '/', destination: '/pt-BR', permanent: false }]
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

  // Performance: Modularize imports for better tree-shaking
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
    },
  },

  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://cp2b.unicamp.br/pilar2b',
    NEXT_PUBLIC_DISABLE_AUTH: process.env.NEXT_PUBLIC_DISABLE_AUTH || 'false',
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
