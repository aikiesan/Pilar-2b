import createIntlMiddleware from 'next-intl/middleware';
import type { NextRequest } from 'next/server';
import { locales, defaultLocale, localePrefix } from './config/i18n';

// Create the next-intl middleware with proper configuration
const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix,
  // Disable automatic locale detection for better control
  // Users will be redirected to the default locale if no locale is in the URL
  localeDetection: false,
});

export function proxy(request: NextRequest) {
  return intlMiddleware(request);
}

export const config = {
  // Match all pathnames except for:
  // - API routes (/api/*)
  // - Static files (/_next/*, /images/*, etc.)
  // - Files with extensions (*.png, *.jpg, etc.)
  matcher: [
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
};
