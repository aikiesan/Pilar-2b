import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { locales, defaultLocale, localePrefix } from './config/i18n';
import { findMunicipality } from './lib/municipalityDirectory';
import { municipalityRedirectTarget } from './lib/municipalityRedirect';

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix,
  localeDetection: false,
});

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // In dev (basePath=''), strip stale /pilar2b prefix that may arrive from
  // cached links or direct navigation using the production URL structure.
  // In production the basePath strips this before the proxy ever sees it.
  if (pathname.startsWith('/pilar2b')) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice('/pilar2b'.length) || '/';
    return NextResponse.redirect(url);
  }

  // Municipality pages moved to readable addresses (/municipalities/campinas-sp).
  // The lookup needs the API, so these 301s live here, not in next.config.
  if (pathname.includes('/municipalit')) {
    const target = await municipalityRedirectTarget(pathname, findMunicipality);
    if (target) {
      const url = request.nextUrl.clone();
      url.pathname = target;
      return NextResponse.redirect(url, 301);
    }
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
