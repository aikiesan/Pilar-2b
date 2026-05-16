import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { locales, defaultLocale, localePrefix } from './config/i18n';

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix,
  localeDetection: false,
});

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // In dev (basePath=''), strip stale /pilar2b prefix that may arrive from
  // cached links or direct navigation using the production URL structure.
  // In production the basePath strips this before the proxy ever sees it.
  if (pathname.startsWith('/pilar2b')) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice('/pilar2b'.length) || '/';
    return NextResponse.redirect(url);
  }

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
